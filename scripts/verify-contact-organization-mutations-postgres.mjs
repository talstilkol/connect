import assert from "node:assert/strict";
import { createNodePostgresTransactionManager } from "../server/platform/nodePostgresAdapter.ts";
import { createPostgresRailwayContactOrganizationMutationExecutor } from "../server/platform/postgresRailwayContactOrganizationMutationExecutor.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
  deriveRailwayApiMutationRequestDigest,
} from "../server/platform/railwayApiMutationExecutor.ts";

// Called only by the local integration harness, using its isolated database.
export async function verifyContactOrganizationMutationsPostgres(pool) {
  const tenant = await pool.query(
    "INSERT INTO tenants (display_name, status) VALUES ('Organization regression', 'active') RETURNING id",
  );
  const tenantId = Number(tenant.rows[0].id);
  const contact = await pool.query(
    "INSERT INTO contacts (tenant_id, phone_e164) VALUES ($1, '+12025550126') RETURNING id",
    [tenantId],
  );
  const contactId = Number(contact.rows[0].id);
  const session = { tenantId, externalUserId: "organization-integration-owner", displayName: "Organization regression", status: "active", role: "owner" };
  const executor = createPostgresRailwayContactOrganizationMutationExecutor(createNodePostgresTransactionManager(pool));
  const command = async (operation, payload, identity = session) => ({
    session: identity, operation, payload,
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(operation, payload),
    requestDigest: await deriveRailwayApiMutationRequestDigest(operation, payload),
  });
  const counts = async () => (await pool.query(`SELECT
    (SELECT count(*)::integer FROM audit_logs WHERE tenant_id=$1) AS audits,
    (SELECT count(*)::integer FROM railway_api_mutation_receipts WHERE tenant_id=$1) AS receipts`, [tenantId])).rows[0];

  const tagRequest = await command("contacts.organization.tag.save", { name: "Priority" });
  const tag = await executor.execute(tagRequest);
  const list = await executor.execute(await command("contacts.organization.list.save", { name: "Pilot" }));
  assert.equal(tag.outcome, "committed");
  assert.equal(list.outcome, "committed");
  const beforeReplay = await counts();
  // Historical receipts without a revision remain replayable after deployment.
  await pool.query("UPDATE railway_api_mutation_receipts SET response_json=response_json - 'revision' WHERE tenant_id=$1 AND operation=$2", [tenantId, tagRequest.operation]);
  const replay = await executor.execute(tagRequest);
  assert.equal(replay.outcome, "replayed");
  assert.equal(replay.organization.lists.length, 1);
  assert.equal(replay.organization.revision, list.organization.revision);
  assert.deepEqual(await counts(), beforeReplay);

  let revision = replay.organization.revision;
  for (const [operation, groupId, relationshipKey] of [
    ["contacts.organization.tag-assignment", tag.organization.tags[0].id, "tagAssignments"],
    ["contacts.organization.list-membership", list.organization.lists[0].id, "listMemberships"],
  ]) {
    const beforeCycle = await counts();
    let firstRequest;
    for (const assigned of [true, false, true]) {
      const request = await command(operation, { contactId, groupId, assigned, expectedRevision: revision });
      firstRequest ??= request;
      const saved = await executor.execute(request);
      assert.equal(saved.outcome, "committed");
      assert.equal(saved.organization[relationshipKey].length, assigned ? 1 : 0);
      assert.ok(saved.organization.revision > revision);
      revision = saved.organization.revision;
    }
    const retry = await executor.execute(firstRequest);
    assert.equal(retry.outcome, "replayed");
    assert.equal(retry.organization.revision, revision);
    assert.equal(retry.organization[relationshipKey].length, 1);
    assert.deepEqual(await counts(), { audits: beforeCycle.audits + 3, receipts: beforeCycle.receipts + 3 });

    const stale = await command(operation, { contactId, groupId, assigned: false, expectedRevision: firstRequest.payload.expectedRevision });
    assert.equal((await executor.execute(stale)).outcome, "conflict");
    assert.deepEqual(await counts(), { audits: beforeCycle.audits + 3, receipts: beforeCycle.receipts + 3 });

    // Opposing new intents from the same revision cannot both commit.
    const concurrent = await Promise.all([true, false].map(async assigned => ({
      assigned,
      result: await executor.execute(await command(operation, { contactId, groupId, assigned, expectedRevision: revision })),
    })));
    assert.deepEqual(concurrent.map(item => item.result.outcome).sort(), ["committed", "conflict"]);
    const winner = concurrent.find(item => item.result.outcome === "committed");
    assert.equal(winner.result.organization[relationshipKey].length, winner.assigned ? 1 : 0);
    revision = winner.result.organization.revision;
    const identical = await command(operation, { contactId, groupId, assigned: !winner.assigned, expectedRevision: revision });
    const duplicate = await Promise.all([executor.execute(identical), executor.execute(identical)]);
    assert.deepEqual(duplicate.map(item => item.outcome).sort(), ["committed", "replayed"]);
    assert.deepEqual(duplicate[0].organization, duplicate[1].organization);
    revision = duplicate[0].organization.revision;
    assert.deepEqual(await counts(), { audits: beforeCycle.audits + 5, receipts: beforeCycle.receipts + 5 });
  }

  const otherTenant = await pool.query("INSERT INTO tenants (display_name, status) VALUES ('Other organization regression', 'active') RETURNING id");
  const beforeCrossTenant = await counts();
  const crossTenant = await executor.execute(await command("contacts.organization.tag-assignment", {
    contactId, groupId: tag.organization.tags[0].id, assigned: true, expectedRevision: 0,
  }, { ...session, tenantId: Number(otherTenant.rows[0].id) }));
  assert.equal(crossTenant.outcome, "not-found");
  assert.deepEqual(await counts(), beforeCrossTenant);
  return Object.freeze({ status: "passed", cycles: 2, concurrentPairs: 4, historicalReplay: true, staleReceiptRollback: true, crossTenantBlocked: true });
}
