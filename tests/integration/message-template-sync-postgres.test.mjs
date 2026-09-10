import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { applyPostgresMigrations, requireLocalStartupRehearsalUrl } from "../../scripts/verify-railway-api-startup.mjs";
import { createNodePostgresQueryExecutor, createNodePostgresTransactionManager } from "../../server/platform/nodePostgresAdapter.ts";
import { createPostgresMetaRepository } from "../../server/platform/postgresMetaRepository.ts";
import { createPostgresMetaCredentialRepository } from "../../server/platform/postgresMetaCredentialRepository.ts";
import { createPostgresMessageTemplateRepository } from "../../server/platform/postgresMessageTemplateRepository.ts";
import { createPostgresRailwayMessageTemplateSyncMutationExecutor, postgresRailwayMessageTemplateSyncSql } from "../../server/platform/postgresRailwayMessageTemplateSyncMutationExecutor.ts";
import { createMetaConnectionService } from "../../server/meta/metaConnectionService.ts";
import { deriveMessageTemplateSubmissionKey } from "../../server/templates/messageTemplateSubmissionKey.ts";
import { deriveRailwayApiDeterministicIdempotencyKey, deriveRailwayApiMutationRequestDigest } from "../../server/platform/railwayApiMutationExecutor.ts";

test("template sync preserves atomicity and authorization on real PostgreSQL", async (t) => {
  const pool = new pg.Pool({
    connectionString: requireLocalStartupRehearsalUrl(process.env.CONNECT_POSTGRES_STARTUP_REHEARSAL_URL),
    max: 4, connectionTimeoutMillis: 2_000, statement_timeout: 15_000,
    query_timeout: 20_000, lock_timeout: 3_000,
  });
  t.after(() => pool.end());
  const migrations = await applyPostgresMigrations(pool); // Refuses any nonempty database.
  const queries = createNodePostgresQueryExecutor(pool);
  const transactions = createNodePostgresTransactionManager(pool);
  const connections = createMetaConnectionService(createPostgresMetaRepository({ queries, transactions }));
  const templates = createPostgresMessageTemplateRepository({ queries, transactions });

  // Reuse the existing submission integration fixture and credential repository test envelope.
  // PostgreSQL is real; provider responses are controlled, with no live Meta access.
  const externalUserId = "template-submission-integration-owner";
  const displayName = "Template submission integration tenant";
  const tenantId = Number((await pool.query(
    "INSERT INTO tenants (display_name, status) VALUES ($1, 'active') RETURNING id", [displayName],
  )).rows[0].id);
  await pool.query(`INSERT INTO tenant_memberships (tenant_id, external_user_id, role, status, version)
    VALUES ($1, $2, 'owner', 'active', 1)`, [tenantId, externalUserId]);
  const session = { tenantId, externalUserId, displayName, status: "active", role: "owner" };
  const assets = { businessPortfolioId: "123456789012340", wabaId: "123456789012341", phoneNumberId: "123456789012342" };
  const pending = await connections.captureVerifiedAssets(session, assets);
  await createPostgresMetaCredentialRepository(queries).store({
    tenantId, expectedConnectionVersion: pending.version, keyVersion: "v1",
    initializationVector: "AQIDBAUGBwgJCgsM", ciphertext: "AQIDBAUGBwgJCgsMDQ4PEA==",
  });
  await connections.confirmWebhookSubscription(session, pending.version);
  const templateKey = `template_v1_${"a".repeat(64)}`;
  const draft = await templates.saveDraft({
    tenantId, templateKey, name: "submission_integration_template", language: "he", category: "UTILITY",
    header: "", body: "Integration submission template", footer: "", variableExamples: {},
    buttonMode: "none", quickReplies: [],
    urlButton: { enabled: false, mode: "static", text: "", value: "", example: "" },
    phoneButton: { enabled: false, text: "", value: "" },
  });
  const submissionKey = await deriveMessageTemplateSubmissionKey(draft);
  await templates.claimSubmission(tenantId, templateKey, draft.version, submissionKey);
  const submitted = await templates.completeSubmission(tenantId, templateKey, submissionKey, "123456789012343");
  let observedAt;
  async function advanceClock() {
    await pool.query("SELECT pg_sleep(0.005)");
    observedAt = (await pool.query("SELECT clock_timestamp() AS now")).rows[0].now.toISOString();
  }
  await advanceClock();
  const initialObservedAt = observedAt;
  const timestamp = () => observedAt;
  let providerReads = 0;
  const snapshot = { metaTemplateId: submitted.metaTemplateId, name: submitted.name,
    language: submitted.language, category: submitted.category, providerStatus: "APPROVED" };
  const executor = (overrides = {}) => createPostgresRailwayMessageTemplateSyncMutationExecutor({
    queries, transactions, clock: timestamp,
    credentialVault: { withAccessToken: (_tenant, action) => action("integration-token-never-submitted") },
    lister: { async list() { providerReads += 1; return [snapshot]; } },
    ...overrides,
  });
  const command = async () => {
    const payload = { requestedAt: timestamp() };
    return { session, operation: "templates.sync", payload,
      idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey("templates.sync", payload),
      requestDigest: await deriveRailwayApiMutationRequestDigest("templates.sync", payload) };
  };
  const state = async () => ({
    template: await templates.findByKey(tenantId, templateKey),
    receipts: (await pool.query("SELECT * FROM railway_api_mutation_receipts WHERE tenant_id = $1 ORDER BY idempotency_key", [tenantId])).rows,
    audits: (await pool.query("SELECT * FROM audit_logs WHERE tenant_id = $1 ORDER BY id", [tenantId])).rows,
  });

  await t.test("concurrent retries commit once and a durable replay needs no provider GET", async () => {
    const input = await command();
    const worker = executor();
    const results = await Promise.all([worker.execute(input), worker.execute(input)]);
    assert.deepEqual(results.map(({ outcome }) => outcome).sort(), ["committed", "replayed"]);
    assert.deepEqual(results[0].state, results[1].state);
    assert.equal(results[0].state.summary.updated, 1);
    const after = await state();
    assert.equal(after.template.status, "approved");
    assert.equal(after.template.version, submitted.version + 1);
    assert.equal(after.receipts.length, 1);
    assert.equal(after.audits.filter(({ action }) => action === "templates.sync").length, 1);
    const reads = providerReads;
    assert.equal((await worker.execute(input)).outcome, "replayed");
    assert.equal(providerReads, reads);
    assert.doesNotMatch(JSON.stringify(results), /ciphertext|initializationVector|integration-token/);
  });

  await t.test("a real late SQL error rolls back the template, audit and mutation receipt", async () => {
    await advanceClock();
    const before = await state();
    let injected = false;
    const worker = executor({
      lister: { async list() { return [{ ...snapshot, providerStatus: "REJECTED" }]; } },
      transactions: { transaction: (options, action) => transactions.transaction(options, (transaction) =>
        action({ query: async (sql, parameters) => {
          if (sql === postgresRailwayMessageTemplateSyncSql.insertAudit) {
            injected = true;
            return transaction.query("SELECT 1 / 0", []);
          }
          return transaction.query(sql, parameters);
        } })) },
    });
    assert.equal((await worker.execute(await command())).outcome, "unavailable");
    assert.equal(injected, true);
    assert.deepEqual(await state(), before);
  });

  await t.test("a slow GET cannot replace a newer status event", async () => {
    await advanceClock();
    const worker = executor({ lister: { async list() {
      await pool.query("SELECT pg_sleep(0.005)");
      const statusEventAt = (await pool.query("SELECT clock_timestamp() AS now")).rows[0].now.toISOString();
      const input = { tenantId, metaTemplateId: snapshot.metaTemplateId, name: snapshot.name,
        language: snapshot.language, category: snapshot.category, status: "rejected", statusEventAt };
      await templates.applyStatusEvent({ ...input,
        statusEventKey: createHash("sha256").update(JSON.stringify(input)).digest("hex") });
      return [snapshot];
    } } });
    const result = await worker.execute(await command());
    assert.equal(result.outcome, "committed");
    assert.equal(result.state.summary.stale, 1);
    assert.equal((await templates.findByKey(tenantId, templateKey)).status, "rejected");
  });

  await t.test("revoking membership during GET prevents writes and receipt replay", async () => {
    await advanceClock();
    // Preserve the last-owner invariant using the other existing integration owner fixture.
    await pool.query(`INSERT INTO tenant_memberships (tenant_id, external_user_id, role, status, version)
      VALUES ($1, 'driver-integration-owner', 'owner', 'active', 1)`, [tenantId]);
    const before = await state();
    const input = await command();
    const worker = executor({ lister: { async list() {
      await pool.query(`UPDATE tenant_memberships SET status = 'suspended', version = version + 1
        WHERE tenant_id = $1 AND external_user_id = $2`, [tenantId, externalUserId]);
      return [snapshot];
    } } });
    assert.equal((await worker.execute(input)).outcome, "authorization-changed");
    assert.deepEqual(await state(), before);
    const oldPayload = { requestedAt: initialObservedAt };
    assert.equal((await executor().execute({ ...input, payload: oldPayload,
      idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey("templates.sync", oldPayload),
      requestDigest: await deriveRailwayApiMutationRequestDigest("templates.sync", oldPayload),
    })).outcome, "authorization-changed");
    await pool.query(`UPDATE tenant_memberships SET status = 'active', version = version + 1
      WHERE tenant_id = $1 AND external_user_id = $2`, [tenantId, externalUserId]);
  });

  await t.test("changing the Meta connection during GET prevents stale writes", async () => {
    await advanceClock();
    const before = await state();
    const worker = executor({ lister: { async list() {
      await connections.captureVerifiedAssets(session, assets);
      return [snapshot];
    } } });
    assert.equal((await worker.execute(await command())).outcome, "meta-not-connected");
    const after = await state();
    assert.deepEqual(after.template, before.template);
    assert.deepEqual(after.receipts, before.receipts);
    assert.deepEqual(after.audits.filter(({ action }) => action === "templates.sync"),
      before.audits.filter(({ action }) => action === "templates.sync"));
  });
  assert.equal(pool.totalCount, pool.idleCount);
  t.diagnostic(`Applied ${migrations} real migrations; provider responses reused from existing fixtures.`);
});
