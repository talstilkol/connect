import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { applyPostgresMigrations, requireLocalStartupRehearsalUrl } from "../../scripts/verify-railway-api-startup.mjs";
import { createNodePostgresQueryExecutor, createNodePostgresTransactionManager } from "../../server/platform/nodePostgresAdapter.ts";
import { createPostgresMessageTemplateRepository } from "../../server/platform/postgresMessageTemplateRepository.ts";
import { createPostgresCampaignRepository } from "../../server/platform/postgresCampaignRepository.ts";
import { createPostgresCampaignDispatchRepository } from "../../server/platform/postgresCampaignDispatchRepository.ts";
import { createPostgresRailwayCampaignMutationExecutor, postgresRailwayCampaignMutationSql } from "../../server/platform/postgresRailwayCampaignMutationExecutor.ts";
import { deriveRailwayApiDeterministicIdempotencyKey, deriveRailwayApiMutationRequestDigest } from "../../server/platform/railwayApiMutationExecutor.ts";

function gate() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }

test("campaign controls preserve recipients, authorization and receipts on real PostgreSQL", async (t) => {
  const pool = new pg.Pool({ connectionString: requireLocalStartupRehearsalUrl(process.env.CONNECT_POSTGRES_STARTUP_REHEARSAL_URL),
    max: 6, connectionTimeoutMillis: 2_000, statement_timeout: 15_000, query_timeout: 20_000, lock_timeout: 5_000 });
  t.after(() => pool.end());
  const migrations = await applyPostgresMigrations(pool);
  const queries = createNodePostgresQueryExecutor(pool);
  const transactions = createNodePostgresTransactionManager(pool);
  const foundation = { messageTemplates: createPostgresMessageTemplateRepository({ queries, transactions }),
    campaigns: createPostgresCampaignRepository({ queries, transactions }) };
  const dispatch = createPostgresCampaignDispatchRepository(queries);
  // Reuse verifyCampaignDispatch/contactCommand fixtures from verify-node-postgres-integration.mjs.
  const displayName = "Driver integration tenant";
  const externalUserId = "driver-integration-owner";
  const tenantId = Number((await pool.query("INSERT INTO tenants (display_name, status) VALUES ($1, 'active') RETURNING id", [displayName])).rows[0].id);
  await pool.query("INSERT INTO tenant_memberships (tenant_id, external_user_id, role, status, version) VALUES ($1, $2, 'owner', 'active', 1)", [tenantId, externalUserId]);
  const session = { tenantId, externalUserId, displayName, status: "active", role: "owner" };
  for (const phone of ["+972501234567", "+972501234568"]) await pool.query(`INSERT INTO contacts
    (tenant_id, phone_e164, first_name, company, mailing_status, consent_status, consent_source, consent_recorded_at)
    VALUES ($1, $2, 'Integration', 'Connect', 'subscribed', 'granted', 'driver-integration', CURRENT_TIMESTAMP)`, [tenantId, phone]);
  const eligibleContacts = await pool.query('SELECT id, phone_e164 AS "phoneNumber", version FROM contacts WHERE tenant_id = $1 ORDER BY id', [tenantId]);
  const templateKey = `template_v1_${"4".repeat(64)}`;
  const campaignKey = `campaign_v1_${"5".repeat(64)}`;
  const firstDeliveryKey = `campaign_delivery_v1_${"6".repeat(64)}`;
  const secondDeliveryKey = `campaign_delivery_v1_${"7".repeat(64)}`;
  const templateSubmissionKey = `template_submission_v1_${"8".repeat(64)}`;
  const personalizationKey = "9".repeat(64);
  const metaTemplateId = "123456789012345";
  const templateDefinition = Object.freeze({
    header: "",
    body: "Dispatch integration",
    footer: "",
    variableExamples: {},
    buttonMode: "none",
    quickReplies: [],
    urlButton: {
      enabled: false,
      mode: "static",
      text: "",
      value: "",
      example: "",
    },
    phoneButton: {
      enabled: false,
      text: "",
      value: "",
    },
  });
  const templateDraft = Object.freeze({
    templateKey,
    tenantId,
    name: "dispatch_integration",
    language: "he",
    category: "UTILITY",
    ...templateDefinition,
  });
  const templateWrites = await Promise.all([
    foundation.messageTemplates.saveDraft(templateDraft),
    foundation.messageTemplates.saveDraft(templateDraft),
  ]);
  assert.equal(
    templateWrites.every(
      (template) => template.status === "draft" && template.version === 1,
    ),
    true,
  );

  const submissionClaims = await Promise.allSettled([
    foundation.messageTemplates.claimSubmission(
      tenantId,
      templateKey,
      1,
      templateSubmissionKey,
    ),
    foundation.messageTemplates.claimSubmission(
      tenantId,
      templateKey,
      1,
      templateSubmissionKey,
    ),
  ]);
  assert.deepEqual(
    submissionClaims.map(({ status }) => status).sort(),
    ["fulfilled", "rejected"],
  );

  const completedTemplate =
    await foundation.messageTemplates.completeSubmission(
      tenantId,
      templateKey,
      templateSubmissionKey,
      metaTemplateId,
    );
  assert.equal(completedTemplate.status, "pending_review");
  const statusEventAt = new Date(
    Date.parse(completedTemplate.updatedAt) + 1_000,
  ).toISOString();
  const statusEvent = Object.freeze({
    tenantId,
    metaTemplateId,
    name: "dispatch_integration",
    language: "he",
    category: "UTILITY",
    status: "approved",
    statusEventKey: "b".repeat(64),
    statusEventAt,
  });
  const statusEvents = await Promise.all([
    foundation.messageTemplates.applyStatusEvent(statusEvent),
    foundation.messageTemplates.applyStatusEvent(statusEvent),
  ]);
  assert.deepEqual(
    statusEvents.map(({ outcome }) => outcome).sort(),
    ["applied", "duplicate"],
  );
  const approvedTemplate =
    await foundation.messageTemplates.findByKey(tenantId, templateKey);
  assert.ok(approvedTemplate);
  assert.equal(approvedTemplate.status, "approved");
  assert.equal(approvedTemplate.version, 4);
  assert.equal(
    (await foundation.messageTemplates.listByTenant(tenantId, 100)).some(
      ({ templateKey: savedKey }) => savedKey === templateKey,
    ),
    true,
  );
  const snapshot = Object.freeze({
    campaignKey,
    tenantId,
    name: "Dispatch integration",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "UTC",
    template: {
      templateKey,
      metaTemplateId,
      name: "dispatch_integration",
      category: "UTILITY",
      language: "he",
      version: approvedTemplate.version,
      ...templateDefinition,
    },
    audienceSnapshotKey: "a".repeat(64),
    recipientCount: 2,
    recipients: eligibleContacts.rows.map((contact, index) => ({
      contactId: Number(contact.id),
      contactVersion: contact.version,
      phoneNumber: contact.phoneNumber,
      personalization: {},
      personalizationKey,
      deliveryKey: index === 0 ? firstDeliveryKey : secondDeliveryKey,
    })),
  });
  const snapshotWrites = await Promise.all([
    foundation.campaigns.saveSnapshot(snapshot),
    foundation.campaigns.saveSnapshot(snapshot),
  ]);
  assert.equal(
    snapshotWrites.every(({ campaignKey: savedKey }) => savedKey === campaignKey),
    true,
  );
  const read = () => foundation.campaigns.findByKey(tenantId, campaignKey);
  const recipients = async () => (await pool.query("SELECT * FROM campaign_recipients WHERE tenant_id = $1 ORDER BY delivery_key", [tenantId])).rows;
  const state = async () => ({ campaign: await read(), recipients: await recipients(),
    receipts: (await pool.query("SELECT * FROM railway_api_mutation_receipts ORDER BY idempotency_key")).rows,
    audits: (await pool.query("SELECT * FROM audit_logs ORDER BY id")).rows });
  const executor = (configured = true, tx = transactions) => createPostgresRailwayCampaignMutationExecutor(tx, () => configured);
  const command = async (action, override = {}) => {
    const payload = { campaignKey, expectedVersion: (await read()).version, action, ...override };
    return { session, operation: "campaigns.control", payload,
      idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey("campaigns.control", payload),
      requestDigest: await deriveRailwayApiMutationRequestDigest("campaigns.control", payload) };
  };
  const run = async (action) => { const result = await executor().execute(await command(action)); assert.equal(result.outcome, "committed"); return result; };
  const activatedAt = new Date().toISOString();
  await dispatch.activateCampaign(tenantId, campaignKey, 1, activatedAt);

  await t.test("scheduled pause/resume preserves scheduling and starts only through the scheduler", async () => {
    const paused = await run("pause");
    assert.equal(paused.state.campaign.status, "paused");
    assert.equal(await dispatch.completeSettledCampaigns(new Date().toISOString(), 10), 0);
    assert.deepEqual(await dispatch.promoteDueCampaigns(new Date().toISOString(), 10), []);
    const resumed = await run("resume");
    assert.equal(resumed.state.campaign.status, "scheduled");
    assert.equal(resumed.state.campaign.startedAt, null);
    await dispatch.promoteDueCampaigns(new Date().toISOString(), 10);
    assert.equal((await read()).status, "running");
    assert.equal((await dispatch.claimPendingRecipients(new Date().toISOString(), 10)).length, 2);
  });

  await t.test("concurrent pause commits once; resume keeps the same queued delivery keys", async () => {
    const before = await recipients();
    const input = await command("pause");
    const results = await Promise.all([executor(false).execute(input), executor(false).execute(input)]);
    assert.deepEqual(results.map(({ outcome }) => outcome).sort(), ["committed", "replayed"]);
    assert.deepEqual(results[0].state, results[1].state);
    assert.deepEqual(await recipients(), before);
    assert.ok(await dispatch.findQueuedDeliveryContext(firstDeliveryKey));
    assert.deepEqual(await dispatch.prepareDelivery(firstDeliveryKey, new Date().toISOString()), { outcome: "duplicate" });
    const resumeInput = await command("resume");
    assert.equal((await executor(false).execute(resumeInput)).outcome, "delivery-configuration-required");
    assert.equal((await executor().execute(resumeInput)).outcome, "committed");
    assert.deepEqual(await recipients(), before);
    assert.equal((await executor(false).execute(resumeInput)).outcome, "replayed");
    assert.equal((await executor().execute(await command("pause", { expectedVersion: 1 }))).outcome, "state-conflict");
  });

  await t.test("late SQL failure rolls back pause or cancel, recipients, receipt and audit", async () => {
    for (const action of ["pause", "cancel"]) {
      const before = await state();
      let injected = false;
      const tx = { transaction: (options, execute) => transactions.transaction(options, (transaction) => execute({
        query: (sql, parameters) => {
          if (sql === postgresRailwayCampaignMutationSql.insertAudit) { injected = true; return transaction.query("SELECT 1 / 0", []); }
          return transaction.query(sql, parameters);
        },
      })) };
      assert.equal((await executor(true, tx).execute(await command(action))).outcome, "unavailable");
      assert.equal(injected, true);
      assert.deepEqual(await state(), before);
    }
  });

  async function waitForBlockedQuery(fragment) {
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
      const result = await pool.query("SELECT count(*) AS count FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND position($1 in query) > 0", [fragment]);
      if (Number(result.rows[0].count) > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("Expected a real PostgreSQL row-lock wait");
  }

  await t.test("pause wins against an already-started send-claim statement", async () => {
    const held = gate(); const release = gate();
    const tx = { transaction: (options, execute) => transactions.transaction(options, (transaction) => execute({ query: async (sql, parameters) => {
      if (sql === postgresRailwayCampaignMutationSql.insertAudit) { held.resolve(); await release.promise; }
      return transaction.query(sql, parameters);
    } })) };
    const pausing = executor(true, tx).execute(await command("pause"));
    await held.promise;
    const preparing = dispatch.prepareDelivery(firstDeliveryKey, new Date().toISOString());
    try { await waitForBlockedQuery("running_campaign"); } finally { release.resolve(); }
    assert.equal((await pausing).outcome, "committed");
    assert.deepEqual(await preparing, { outcome: "duplicate" });
    assert.ok(await dispatch.findQueuedDeliveryContext(firstDeliveryKey));
    await run("resume");
  });

  await t.test("cancel preserves an earlier send claim and cancels a later provider deferral", async () => {
    const held = gate(); const release = gate();
    const preparation = transactions.transaction({ isolationLevel: "read-committed" }, async (transaction) => {
      const result = await createPostgresCampaignDispatchRepository(transaction).prepareDelivery(firstDeliveryKey, new Date().toISOString());
      assert.equal(result.outcome, "claimed"); held.resolve(); await release.promise; return result;
    });
    await held.promise;
    const cancelling = executor(false).execute(await command("cancel"));
    try { await waitForBlockedQuery("SELECT status, version FROM campaigns"); } finally { release.resolve(); }
    await preparation;
    assert.equal((await cancelling).outcome, "committed");
    const rows = await recipients();
    assert.equal(rows.find(({ delivery_key }) => delivery_key === firstDeliveryKey).status, "sending");
    assert.equal(rows.find(({ delivery_key }) => delivery_key === secondDeliveryKey).status, "cancelled");
    await dispatch.markDeferred(firstDeliveryKey, "WHATSAPP_PAIR_LIMITED", new Date().toISOString());
    assert.equal((await recipients()).every(({ status }) => status === "cancelled"), true);
    assert.equal(await dispatch.findQueuedDeliveryContext(firstDeliveryKey), null);
    assert.equal((await executor().execute(await command("resume"))).outcome, "state-conflict");
    assert.equal(await dispatch.completeSettledCampaigns(new Date().toISOString(), 10), 0);
  });

  await t.test("revoked membership blocks both a new control and an old successful receipt", async () => {
    await pool.query("INSERT INTO tenant_memberships (tenant_id, external_user_id, role, status, version) VALUES ($1, 'template-submission-integration-owner', 'owner', 'active', 1)", [tenantId]);
    const receipt = (await pool.query("SELECT * FROM railway_api_mutation_receipts WHERE operation = 'campaigns.control' ORDER BY completed_at LIMIT 1")).rows[0];
    const before = await state();
    await pool.query("UPDATE tenant_memberships SET status = 'suspended', version = version + 1 WHERE tenant_id = $1 AND external_user_id = $2", [tenantId, externalUserId]);
    assert.equal((await executor().execute(await command("cancel"))).outcome, "unavailable");
    const oldInput = await command("pause", { expectedVersion: receipt.response_json.campaign.version - 1 });
    assert.equal(oldInput.idempotencyKey, receipt.idempotency_key);
    assert.equal((await executor().execute(oldInput)).outcome, "unavailable");
    assert.deepEqual(await state(), before);
  });
  assert.equal(pool.totalCount, pool.idleCount);
  t.diagnostic(`Applied ${migrations} real migrations; existing dispatch fixtures only; no provider calls.`);
});
