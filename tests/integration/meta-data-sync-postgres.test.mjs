import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";
import { createNodePostgresTransactionManager, createNodePostgresQueryExecutor } from "../../server/platform/nodePostgresAdapter.ts";
import { createPostgresMetaDataSyncRepository, postgresMetaDataSyncSql } from "../../server/platform/postgresMetaDataSyncRepository.ts";
import { createPostgresMetaRepository } from "../../server/platform/postgresMetaRepository.ts";
import { createMetaDataSyncService } from "../../server/meta/metaDataSync.ts";
import { createMetaGraphDataSyncProvider } from "../../server/meta/metaGraphDataSyncProvider.ts";
import { createMetaGraphTransport } from "../../server/meta/metaGraphTransport.ts";
import { toSensitiveMetaAccessToken } from "../../server/meta/metaPorts.ts";

const connectionString = process.env.CONNECT_META_DATA_SYNC_TEST_URL;
if (connectionString !== "postgresql://connect_echo_test@127.0.0.1:55439/connect_meta_sync_integration") {
  throw new Error("A dedicated local sync test database is required; DATABASE_URL is never used");
}
const pool = new pg.Pool({ connectionString, max: 6, connectionTimeoutMillis: 2000, statement_timeout: 5000, lock_timeout: 3000 });
const transactions = createNodePostgresTransactionManager(pool);
const repository = createPostgresMetaDataSyncRepository(transactions);
const meta = createPostgresMetaRepository({ transactions, queries: createNodePostgresQueryExecutor(pool) });
const token = toSensitiveMetaAccessToken("local-sync-test-token");
let tenantCounter = 20;
before(async () => {
  assert.equal((await pool.query("SELECT * FROM pg_tables WHERE schemaname = 'public'")).rowCount, 0, "Refusing to modify a non-empty database");
  const directory = new URL("../../postgres/migrations/", import.meta.url);
  for (const filename of (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort()) {
    await pool.query(await readFile(new URL(filename, directory), "utf8"));
  }
});
after(async () => { await pool.end(); });

async function newCase({ prepare = true, startSql } = {}) {
  const tenantId = ++tenantCounter;
  const session = { tenantId, externalUserId: `sync-test-${tenantId}`, role: "owner", status: "active", displayName: "Sync integration" };
  await pool.query("INSERT INTO tenants (id, display_name, status) VALUES ($1, 'Sync integration', 'active')", [tenantId]);
  if (startSql) {
    await pool.query(`INSERT INTO meta_data_sync_onboardings (tenant_id, actor_external_user_id, started_at) VALUES ($1, $2, ${startSql})`, [tenantId, session.externalUserId]);
  } else await repository.begin(session);
  const assets = { tenantId, businessPortfolioId: `1000${tenantId}`, wabaId: `2000${tenantId}`, phoneNumberId: `3000${tenantId}` };
  const pending = await meta.saveAssetSnapshot(assets);
  const connection = await meta.markConnectionConnected(tenantId, pending.version);
  if (prepare) await repository.prepare(session, connection.version);
  return { session, assets, connection };
}
function service(f, { repo = repository, post, verify } = {}) {
  const calls = [];
  const provider = createMetaGraphDataSyncProvider(createMetaGraphTransport({ apiVersion: "v21.0" }, {
    requestTimeoutMs: 2000,
    async fetchImplementation(url, init) {
      calls.push(init.method);
      assert.equal(init.headers.authorization, `Bearer ${token}`);
      assert.equal(new URL(url).hostname, "graph.facebook.com");
      if (init.method === "GET") {
        if (verify) await verify();
        return new Response(JSON.stringify({ id: f.assets.phoneNumberId, is_on_biz_app: true, platform_type: "CLOUD_API" }));
      }
      assert.equal(new URL(url).pathname, `/v21.0/${f.assets.phoneNumberId}/smb_app_data`);
      const body = JSON.parse(init.body);
      if (post) return post(body);
      return new Response(JSON.stringify({ messaging_product: "whatsapp", request_id: `provider-${f.session.tenantId}-${body.sync_type}` }));
    },
  }));
  return { calls, runner: createMetaDataSyncService({ repository: repo, provider,
    credentials: { async withAccessToken(tenantId, execute) { assert.equal(tenantId, f.session.tenantId); return execute(token); } } }) };
}
const executeContacts = (s, f) => s.runner.execute(f.session, "smb_app_state_sync");
function wrapper(intercept) {
  return createPostgresMetaDataSyncRepository({ transaction: (options, work) => transactions.transaction(options, (tx) =>
    work({ query: (sql, parameters) => intercept(tx, sql, parameters) })) });
}

test("the server start is immutable and an already-connected snapshot cannot be reused as fresh onboarding", async () => {
  const f = await newCase({ prepare: false });
  const first = await repository.begin(f.session);
  assert.deepEqual(await repository.begin(f.session), first);
  await repository.prepare(f.session, f.connection.version);
  await repository.prepare(f.session, f.connection.version);
  assert.equal((await pool.query("SELECT * FROM meta_data_sync_requests WHERE tenant_id = $1", [f.session.tenantId])).rowCount, 2);
  const tenantId = ++tenantCounter;
  await pool.query("INSERT INTO tenants (id, display_name, status) VALUES ($1, 'Existing connection', 'active')", [tenantId]);
  const pending = await meta.saveAssetSnapshot({ tenantId, businessPortfolioId: `1000${tenantId}`, wabaId: `2000${tenantId}`, phoneNumberId: `3000${tenantId}` });
  const connected = await meta.markConnectionConnected(tenantId, pending.version);
  const session = { ...f.session, tenantId };
  await repository.begin(session);
  await assert.rejects(repository.prepare(session, connected.version), (error) => error.code === "SYNC_CONNECTION_CHANGED");
});

test("concurrent runners send one contacts POST, persist request_id and then permit one history POST", async () => {
  const f = await newCase();
  let release, started;
  const gate = new Promise((resolve) => { release = resolve; });
  const entered = new Promise((resolve) => { started = resolve; });
  const s = service(f, { post: async (body) => {
    if (body.sync_type === "smb_app_state_sync") { started(); await gate; }
    return new Response(JSON.stringify({ messaging_product: "whatsapp", request_id: `request-${body.sync_type}` }));
  } });
  assert.deepEqual(await s.runner.execute(f.session, "history"), { status: "waiting-for-contacts" });
  assert.deepEqual(s.calls, []);
  const first = executeContacts(s, f);
  await entered;
  const rest = await Promise.all(Array.from({ length: 5 }, () => executeContacts(s, f)));
  assert.ok(rest.every((result) => result.status === "dispatching"));
  assert.equal(s.calls.filter((method) => method === "POST").length, 1);
  // A separate transaction can progress while the HTTP request is outstanding.
  assert.equal((await pool.query("SELECT status FROM meta_data_sync_requests WHERE tenant_id = $1 AND sync_type = 'smb_app_state_sync'", [f.session.tenantId])).rows[0].status, "dispatching");
  release();
  assert.deepEqual(await first, { status: "accepted", requestId: "request-smb_app_state_sync" });
  assert.equal((await s.runner.execute(f.session, "history")).status, "accepted");
  await executeContacts(s, f);
  await s.runner.execute(f.session, "history");
  assert.equal(s.calls.filter((method) => method === "POST").length, 2);
  assert.equal((await pool.query("SELECT * FROM audit_logs WHERE tenant_id = $1 AND action = 'meta.data-sync.dispatch-started'", [f.session.tenantId])).rowCount, 2);
});

test("unknown and rejected provider results are durable across restarts and never retried", async () => {
  for (const [status, httpStatus] of [["unknown", 503], ["rejected", 400]]) {
    const f = await newCase();
    const s = service(f, { post: () => new Response(JSON.stringify({ error: { code: 1, message: "must not persist" } }), { status: httpStatus }) });
    assert.deepEqual(await executeContacts(s, f), { status, requestId: null });
    const restarted = service(f, { repo: createPostgresMetaDataSyncRepository(transactions) });
    assert.deepEqual(await executeContacts(restarted, f), { status, requestId: null });
    assert.deepEqual(await restarted.runner.execute(f.session, "history"), { status: "waiting-for-contacts" });
    assert.deepEqual(restarted.calls, []);
    const records = (await pool.query("SELECT * FROM meta_data_sync_requests WHERE tenant_id = $1", [f.session.tenantId])).rows;
    assert.doesNotMatch(JSON.stringify(records), /must not persist|local-sync-test-token/);
  }
});

test("a failed dispatch audit rolls back the claim before provider access", async () => {
  const f = await newCase();
  const failing = wrapper((tx, sql, values) => {
    if (sql === postgresMetaDataSyncSql.audit && values[2] === "meta.data-sync.dispatch-started") throw new Error("audit unavailable");
    return tx.query(sql, values);
  });
  const s = service(f, { repo: failing });
  await assert.rejects(executeContacts(s, f));
  assert.equal(s.calls.includes("POST"), false);
  assert.equal((await repository.read(f.session.tenantId, "smb_app_state_sync")).status, "prepared");
  assert.equal((await executeContacts(service(f), f)).status, "accepted");
});

test("an ambiguous committed claim cannot cause a provider request on retry", async () => {
  const f = await newCase();
  const ambiguous = { ...repository, async claim(request) { await repository.claim(request); throw new Error("connection lost after commit"); } };
  const s = service(f, { repo: ambiguous });
  await assert.rejects(executeContacts(s, f));
  assert.equal(s.calls.includes("POST"), false);
  assert.equal((await executeContacts(service(f), f)).status, "dispatching");
});

test("an ambiguous result commit retries only the database write and creates one finish audit", async () => {
  const f = await newCase();
  let writes = 0;
  const ambiguous = { ...repository, async finish(request, result) {
    const stored = await repository.finish(request, result);
    if (++writes === 1) throw new Error("connection lost after result commit");
    return stored;
  } };
  const s = service(f, { repo: ambiguous });
  assert.equal((await executeContacts(s, f)).status, "accepted");
  assert.equal(writes, 2);
  assert.equal(s.calls.filter((method) => method === "POST").length, 1);
  assert.equal((await pool.query("SELECT * FROM audit_logs WHERE tenant_id = $1 AND action = 'meta.data-sync.finished'", [f.session.tenantId])).rowCount, 1);
});

test("failure of both result writes preserves dispatching and never resends the POST", async () => {
  const f = await newCase();
  const failing = wrapper((tx, sql, values) => {
    if (sql === postgresMetaDataSyncSql.audit && values[2] === "meta.data-sync.finished") throw new Error("result audit unavailable");
    return tx.query(sql, values);
  });
  const s = service(f, { repo: failing });
  await assert.rejects(executeContacts(s, f));
  assert.equal((await repository.read(f.session.tenantId, "smb_app_state_sync")).status, "dispatching");
  const restarted = service(f);
  assert.equal((await executeContacts(restarted, f)).status, "dispatching");
  assert.deepEqual(restarted.calls, []);
});

test("connection changes after asynchronous phone verification cancel before POST", async () => {
  const f = await newCase();
  const s = service(f, { verify: () => meta.revokeConnection(f.session.tenantId, f.assets.wabaId, f.connection.version) });
  assert.deepEqual(await executeContacts(s, f), { status: "cancelled", requestId: null });
  assert.equal(s.calls.includes("POST"), false);
});

test("an accepted provider response remains stored after revocation and tenant suspension", async () => {
  const f = await newCase();
  const s = service(f, { post: async () => {
    await meta.revokeConnection(f.session.tenantId, f.assets.wabaId, f.connection.version);
    await pool.query("UPDATE tenants SET status = 'suspended' WHERE id = $1", [f.session.tenantId]);
    return new Response(JSON.stringify({ messaging_product: "whatsapp", request_id: "known-provider-request" }));
  } });
  assert.deepEqual(await executeContacts(s, f), { status: "accepted", requestId: "known-provider-request" });
  const row = (await pool.query("SELECT * FROM meta_data_sync_requests WHERE tenant_id = $1 AND sync_type = 'smb_app_state_sync'", [f.session.tenantId])).rows[0];
  assert.equal(row.request_id, "known-provider-request");
  assert.equal(row.status, "accepted");
  await assert.rejects(s.runner.execute(f.session, "history"));
});

test("an expired start is not refreshed and the final clock check follows lock waits", async () => {
  const expired = await newCase({ prepare: false, startSql: "date_trunc('milliseconds', clock_timestamp() - INTERVAL '25 hours')" });
  const first = await repository.begin(expired.session);
  await assert.rejects(repository.prepare(expired.session, expired.connection.version), (error) => error.code === "SYNC_DEADLINE_EXPIRED");
  assert.deepEqual(await repository.begin(expired.session), first);
  const f = await newCase({ prepare: false, startSql: "date_trunc('milliseconds', clock_timestamp() - INTERVAL '24 hours' + INTERVAL '1 second')" });
  await repository.prepare(f.session, f.connection.version);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT * FROM meta_data_sync_onboardings WHERE tenant_id = $1 FOR UPDATE", [f.session.tenantId]);
    const s = service(f);
    const waiting = executeContacts(s, f);
    await client.query("SELECT pg_sleep(1.2)");
    await client.query("COMMIT");
    assert.deepEqual(await waiting, { status: "expired", requestId: null });
    assert.equal(s.calls.includes("POST"), false);
  } finally { client.release(); }
});

test("new local connection versions cannot reset requests or change a stored provider result", async () => {
  const f = await newCase();
  const original = await repository.read(f.session.tenantId, "smb_app_state_sync");
  const s = service(f);
  const accepted = await executeContacts(s, f);
  const pending = await meta.saveAssetSnapshot(f.assets);
  const connected = await meta.markConnectionConnected(f.session.tenantId, pending.version);
  await repository.begin(f.session);
  await assert.rejects(repository.prepare(f.session, connected.version), (error) => error.code === "SYNC_SCOPE_CHANGED");
  assert.deepEqual(await executeContacts(s, f), accepted);
  await assert.rejects(repository.finish({ ...original, status: "dispatching" }, { status: "accepted", requestId: "different-request" }),
    (error) => error.code === "SYNC_RESULT_CONFLICT");
  await assert.rejects(repository.claim({ ...original, tenantId: ++tenantCounter }));
  await assert.rejects(repository.begin({ ...f.session, role: "agent" }));
  await assert.rejects(pool.query("UPDATE meta_data_sync_onboardings SET started_at = clock_timestamp() WHERE tenant_id = $1", [f.session.tenantId]));
  await assert.rejects(pool.query("DELETE FROM meta_data_sync_requests WHERE tenant_id = $1", [f.session.tenantId]));
  await assert.rejects(pool.query("UPDATE meta_data_sync_requests SET status = 'prepared', request_id = NULL, dispatched_at = NULL, finished_at = NULL WHERE tenant_id = $1", [f.session.tenantId]));
});
