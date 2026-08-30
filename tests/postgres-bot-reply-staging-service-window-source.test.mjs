import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresBotReplyStagingServiceWindowSource,
  postgresBotReplyStagingServiceWindowSql,
} from "../server/platform/postgresBotReplyStagingServiceWindowSource.ts";

const messageKey = `message_v1_${"a".repeat(64)}`;

function sourceWith(rows) {
  const calls = [];
  return {
    calls,
    source: createPostgresBotReplyStagingServiceWindowSource({
      async query(sql, parameters) {
        calls.push({ sql, parameters });
        return { rows, rowCount: rows.length };
      },
    }),
  };
}

test("reads one tenant-scoped inbound service window from PostgreSQL", async () => {
  const { source, calls } = sourceWith([{
    serviceWindowOpenedAt: new Date("2026-08-21T12:00:00.000Z"),
    serviceWindowExpiresAt: new Date("2026-08-22T12:00:00.000Z"),
  }]);
  const result = await source.read({
    targetTenantId: 7,
    inboundMessageKey: messageKey,
  });
  assert.deepEqual(result, {
    source: "durable-postgres",
    serviceWindowOpenedAt: "2026-08-21T12:00:00.000Z",
    serviceWindowExpiresAt: "2026-08-22T12:00:00.000Z",
  });
  assert.equal(calls[0].sql, postgresBotReplyStagingServiceWindowSql.read);
  assert.deepEqual(calls[0].parameters, [7, messageKey]);
  assert.match(calls[0].sql, /messages\.direction = 'inbound'/);
  assert.ok(Object.isFrozen(result));
});

test("rejects missing, extended, and non-24-hour rows", async () => {
  const cases = [
    [],
    [{
      serviceWindowOpenedAt: "2026-08-21T12:00:00.000Z",
      serviceWindowExpiresAt: "2026-08-22T12:00:00.000Z",
      recipientPhoneNumber: "+972501111111",
    }],
    [{
      serviceWindowOpenedAt: "2026-08-21T12:00:00.000Z",
      serviceWindowExpiresAt: "2026-08-22T11:59:59.999Z",
    }],
  ];
  for (const rows of cases) {
    const { source } = sourceWith(rows);
    await assert.rejects(
      () => source.read({
        targetTenantId: 7,
        inboundMessageKey: messageKey,
      }),
    );
  }
});

test("rejects invalid scope before PostgreSQL access", async () => {
  const { source, calls } = sourceWith([]);
  for (const input of [
    { targetTenantId: 0, inboundMessageKey: messageKey },
    { targetTenantId: 7, inboundMessageKey: "message" },
  ]) {
    await assert.rejects(() => source.read(input));
  }
  assert.deepEqual(calls, []);
});

test("rejects an invalid query dependency", () => {
  assert.throws(
    () => createPostgresBotReplyStagingServiceWindowSource({}),
    /source is invalid/,
  );
});
