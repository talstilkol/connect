import assert from "node:assert/strict";
import test from "node:test";
import { metaCoexistenceTestUrl, metaCoexistenceTestSuites, prepareMetaCoexistenceDatabases,
  requireMetaCoexistenceTestUrl, runMetaCoexistenceSuites } from "../scripts/run-meta-coexistence-postgres-integration.mjs";

test("Coexistence integration requires the exact dedicated loopback URL without a DATABASE_URL fallback", () => {
  assert.equal(requireMetaCoexistenceTestUrl({ CONNECT_META_COEXISTENCE_TEST_URL: metaCoexistenceTestUrl }), metaCoexistenceTestUrl);
  for (const environment of [{}, { DATABASE_URL: metaCoexistenceTestUrl },
    ...[metaCoexistenceTestUrl.replace("127.0.0.1", "localhost"), `${metaCoexistenceTestUrl}?sslmode=require`,
      metaCoexistenceTestUrl.replace("55439", "5432"), metaCoexistenceTestUrl.replace("/postgres", "/connect_startup_rehearsal")]
      .map((url) => ({ CONNECT_META_COEXISTENCE_TEST_URL: url }))]) assert.throws(() => requireMetaCoexistenceTestUrl(environment));
});

test("no database is created when cluster identity, existing databases or tables fail preflight", async () => {
  for (const [identity, databases, tables] of [
    [[], [], []], [[{ database: "postgres", role: "postgres" }], [], []],
    [[{ database: "postgres", role: "connect_echo_test" }], [{ datname: metaCoexistenceTestSuites[0].database }], []],
    [[{ database: "postgres", role: "connect_echo_test" }], [], [{ tablename: "tenants" }]],
  ]) {
    const rows = [identity, databases, tables]; const calls = [];
    await assert.rejects(prepareMetaCoexistenceDatabases({ async query(sql) { calls.push(sql); return { rows: rows.shift() }; } }));
    assert.ok(calls.every((sql) => !/CREATE|DROP|DELETE|TRUNCATE/.test(sql)));
  }
});

test("empty-cluster preparation creates only the five fixed test databases and never drops data", async () => {
  const rows = [[{ database: "postgres", role: "connect_echo_test" }], [], []]; const calls = [];
  await prepareMetaCoexistenceDatabases({ async query(sql) { calls.push(sql); return { rows: rows.shift() ?? [] }; } });
  assert.deepEqual(calls.slice(3), metaCoexistenceTestSuites.map((suite) => `CREATE DATABASE ${suite.database}`));
  assert.ok(calls.every((sql) => !/DROP|DELETE|TRUNCATE/.test(sql)));
});

test("all suites run sequentially and any failed or crashed suite fails the complete rehearsal", async () => {
  for (const failure of [false, true]) {
    let active = false; const calls = [];
    const run = runMetaCoexistenceSuites({ CONNECT_META_COEXISTENCE_TEST_URL: metaCoexistenceTestUrl }, async (suite) => {
      assert.equal(active, false); active = true; await Promise.resolve(); active = false; calls.push(suite.file);
      if (failure && calls.length === 2) throw new Error("Suite failed");
      return !(failure && calls.length === 4);
    });
    if (failure) await assert.rejects(run, /META_COEXISTENCE_SUITES_FAILED \(2\/5\)/); else await run;
    assert.deepEqual(calls, metaCoexistenceTestSuites.map((suite) => suite.file));
  }
});
