import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresReadinessProbe,
} from "../server/platform/postgresReadinessProbe.ts";

test("reports ready only for the exact bounded PostgreSQL probe row", async () => {
  const calls = [];
  const probe = createPostgresReadinessProbe({
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      return {
        rows: [{ ready: 1 }],
        rowCount: 1,
      };
    },
  });

  assert.deepEqual(await probe.check(), { status: "ready" });
  assert.deepEqual(calls, [
    {
      sql: "SELECT 1::integer AS ready",
      parameters: [],
    },
  ]);
});

test("fails closed for malformed rows and query failures", async () => {
  const results = [
    { rows: [], rowCount: 0 },
    { rows: [{ ready: "1" }], rowCount: 1 },
    { rows: [{ ready: 1, secret: "unexpected" }], rowCount: 1 },
  ];

  for (const result of results) {
    const probe = createPostgresReadinessProbe({
      async query() {
        return result;
      },
    });
    assert.deepEqual(await probe.check(), {
      status: "unavailable",
    });
  }

  const failed = createPostgresReadinessProbe({
    async query() {
      throw new Error("database detail must not escape");
    },
  });
  assert.deepEqual(await failed.check(), {
    status: "unavailable",
  });
});

test("rejects an invalid query dependency", () => {
  assert.throws(
    () => createPostgresReadinessProbe({}),
    /readiness dependency is invalid/,
  );
});
