import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createPostgresMetaSignupAttemptRepository, postgresMetaSignupAttemptSql } from "../server/platform/postgresMetaSignupAttemptRepository.ts";
import { postgresMetaSignupLaunchSql as launchSql } from '../server/platform/postgresMetaSignupLaunchRepository.ts';
import { createMetaSignupService } from "../server/meta/metaSignupService.ts";
import { MetaConnectionOrchestrationError } from "../server/meta/metaConnectionOrchestrator.ts";

const session = { tenantId: 7, externalUserId: "verified-user", role: "owner", status: "active", displayName: "workspace" };
const configuration = { status: "configured", appId: "100001", configurationId: "500005", apiVersion: "v23.0" };
const input = { launchId: 1, authorizationCode: "protected-authorization-code", businessPortfolioId: "100001", wabaId: "200002", phoneNumberId: "300003" };

// Execute the repository's actual INSERT/UPDATE/SELECT statements on SQLite.
// Launch admission is a boundary stub here and has separate live PostgreSQL tests.
// This adapter serializes transactions; PostgreSQL row-lock contention is not simulated.
function fixture(options = {}) {
  const database = new DatabaseSync(":memory:");
  database.exec(`CREATE TABLE railway_api_mutation_receipts (
    tenant_id INTEGER, operation TEXT, idempotency_key TEXT, request_digest TEXT,
    actor_external_user_id TEXT, status TEXT, response_json TEXT, completed_at TEXT,
    PRIMARY KEY (tenant_id, operation, idempotency_key));
    CREATE TABLE audit_logs (id INTEGER PRIMARY KEY, tenant_id INTEGER, actor_external_user_id TEXT,
    action TEXT, target_type TEXT, target_id TEXT, idempotency_key TEXT, metadata_json TEXT,
    UNIQUE (tenant_id, action, idempotency_key));`);
  const queries = [];
  let active = false;
  let tail = Promise.resolve();
  let transactionNumber = 0;
  const transactions = { transaction(_options, execute) {
    const run = tail.then(async () => {
      transactionNumber += 1;
      const number = transactionNumber;
      database.exec("BEGIN IMMEDIATE");
      active = true;
      try {
        const result = await execute({ async query(sql, parameters) {
          queries.push({ sql, parameters: structuredClone(parameters) });
          if (options.failQuery?.(sql, parameters)) throw new Error("private-database-failure");
          if (sql === launchSql.barrier) return { rowCount: 1, rows: [{ locked: 1 }] };
          if (sql === launchSql.tenant) return { rowCount: 1, rows: [{ id: parameters[0] }] };
          if (sql === launchSql.claim) return { rowCount: 1, rows: [{ id: parameters[1], baseline: null }] };
          if (sql === launchSql.finish) return { rowCount: 1, rows: [{ id: parameters[1] }] };
          const bound = [];
          const adapted = sql.replace(/\$(\d+)/g, (_, index) => {
            bound.push(parameters[Number(index) - 1]); return "?";
          }).replace(/FOR UPDATE/g, "");
          const rows = database.prepare(adapted).all(...bound).map((row) => {
            if (row.responseJson !== undefined && row.responseJson !== null) row.responseJson = JSON.parse(row.responseJson);
            return row;
          });
          return { rowCount: rows.length, rows };
        } });
        database.exec("COMMIT");
        active = false;
        if (options.loseCommitResponse === number) throw new Error("private-commit-response-lost");
        return result;
      } catch (error) {
        if (active) database.exec("ROLLBACK");
        active = false;
        throw error;
      }
    });
    tail = run.catch(() => {});
    return run;
  } };
  const attempts = createPostgresMetaSignupAttemptRepository(transactions);
  let current = { tenantId: 7, status: "connected", version: 2 };
  let providerCalls = 0;
  const service = createMetaSignupService({
    configuration: options.configuration ?? configuration,
    attempts,
    launches: { async begin() { return { status: "ready", launchId: 1, expiresAt: "2026-09-09T10:00:00.000Z" }; } },
    connections: { async read() { return current; } },
    orchestrator: {
      async completeEmbeddedSignup(resolvedSession, request) {
        assert.equal(active, false, "provider access must be outside a database transaction");
        assert.equal(resolvedSession.tenantId, session.tenantId);
        const assets = { ...input }; delete assets.launchId;
        assert.deepEqual(request, assets);
        providerCalls += 1;
        if (options.provider) await options.provider();
        return current;
      },
    },
  });
  return { database, queries, service, attempts,
    providerCalls: () => providerCalls, replaceConnection: (value) => { current = value; } };
}

test("claims once, records both audit events, and replays only a still-current successful connection", async () => {
  const f = fixture();
  try {
    const expected = { status: "connected", connection: { status: "connected" } };
    assert.deepEqual(await f.service.complete(session, input), expected);
    assert.deepEqual(await f.service.complete(session, input), expected);
    assert.equal(f.providerCalls(), 1);
    assert.equal(f.database.prepare("SELECT count(*) AS n FROM audit_logs").get().n, 2);
    assert.doesNotMatch(JSON.stringify(f.queries), /protected-authorization-code/);
    f.replaceConnection({ tenantId: 7, status: "connected", version: 4 });
    assert.deepEqual(await f.service.complete(session, input), { status: "server-error" });
    f.replaceConnection({ tenantId: 7, status: "revoked", version: 3 });
    assert.deepEqual(await f.service.complete(session, input), { status: "server-error" });
    assert.equal(f.providerCalls(), 1);
  } finally { f.database.close(); }
});

test("simultaneous duplicates cannot exchange the same code twice", async () => {
  let release;
  let entered;
  const enteredProvider = new Promise((resolve) => { entered = resolve; });
  const held = new Promise((resolve) => { release = resolve; });
  const f = fixture({ provider: async () => { entered(); await held; } });
  try {
    const first = f.service.complete(session, input);
    await enteredProvider;
    assert.deepEqual(await f.service.complete(session, input), { status: "server-error" });
    assert.equal(f.providerCalls(), 1);
    release();
    assert.equal((await first).status, "connected");
    assert.equal(f.providerCalls(), 1);
  } finally { release(); f.database.close(); }
});

test("the same authorization code cannot be reused with different assets or an actor in the same tenant", async () => {
  const f = fixture();
  try {
    await f.service.complete(session, input);
    assert.deepEqual(await f.service.complete(session, { ...input, wabaId: "200009" }), { status: "server-error" });
    assert.deepEqual(await f.service.complete({ ...session, externalUserId: "other-owner" }, input), { status: "server-error" });
    assert.equal(f.providerCalls(), 1);
    assert.equal(f.database.prepare("SELECT count(*) AS n FROM railway_api_mutation_receipts").get().n, 1);
  } finally { f.database.close(); }
});

test("an audit failure rolls back the claim and prevents provider access", async () => {
  const f = fixture({ failQuery: (sql) => sql === postgresMetaSignupAttemptSql.audit });
  try {
    await assert.rejects(f.service.complete(session, input));
    assert.equal(f.providerCalls(), 0);
    assert.equal(f.database.prepare("SELECT count(*) AS n FROM railway_api_mutation_receipts").get().n, 0);
  } finally { f.database.close(); }
});

test("lost claim acknowledgement and failed completion leave the attempt blocked across a retry", async () => {
  for (const options of [
    { loseCommitResponse: 1 },
    { failQuery: (sql) => sql === postgresMetaSignupAttemptSql.complete },
    { failQuery: (sql, values) => sql === postgresMetaSignupAttemptSql.audit && values[2].endsWith("finished") },
  ]) {
    const f = fixture(options);
    try {
      await assert.rejects(f.service.complete(session, input));
      const calls = f.providerCalls();
      assert.deepEqual(await f.service.complete(session, input), { status: "server-error" });
      assert.equal(f.providerCalls(), calls);
      assert.equal(f.database.prepare("SELECT status FROM railway_api_mutation_receipts").get().status, "processing");
    } finally { f.database.close(); }
  }
});

test("provider failures are retained as bounded terminal responses without an automatic replay", async () => {
  const f = fixture({ provider: async () => {
    throw new MetaConnectionOrchestrationError("CODE_EXCHANGE_FAILED", "private-token-detail");
  } });
  try {
    assert.deepEqual(await f.service.complete(session, input), { status: "authorization-failed" });
    assert.deepEqual(await f.service.complete(session, input), { status: "authorization-failed" });
    assert.equal(f.providerCalls(), 1);
    assert.doesNotMatch(JSON.stringify(f.queries), /private-token-detail|protected-authorization-code/);
  } finally { f.database.close(); }
});

test("configuration, permission, malformed input and Business app gates run before persistence", async () => {
  const f = fixture();
  const disabled = fixture({ configuration: { status: "configuration-required" } });
  try {
    await assert.rejects(f.service.complete({ ...session, role: "viewer" }, input), { code: "PERMISSION_DENIED" });
    assert.deepEqual(await f.service.complete(session, { ...input, tenantId: 8 }), { status: "validation-error" });
    assert.deepEqual(await f.service.complete(session, { ...input, flow: "business-app" }), { status: "synchronization-required" });
    assert.deepEqual(await disabled.service.complete(session, input), { status: "configuration-required" });
    assert.deepEqual(f.queries, []);
    assert.deepEqual(disabled.queries, []);
  } finally { f.database.close(); disabled.database.close(); }
});
