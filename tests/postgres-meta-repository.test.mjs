import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresMetaRepository,
  postgresMetaSql,
} from "../server/platform/postgresMetaRepository.ts";

const eventKey =
  "756297bc87fa6c515823723ec427101952f8bd1900cef253169687dab5be7f89";
const occurredAt = new Date("2026-08-17T08:30:00.000Z");

function connectionRow(overrides = {}) {
  return {
    tenantId: "7",
    businessPortfolioId: "business-portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-number-id",
    status: "pending",
    webhookSubscribedAt: null,
    connectedAt: null,
    version: 1,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

function receiptRow(overrides = {}) {
  return {
    id: "31",
    tenantId: "7",
    wabaId: "waba-id",
    eventKey,
    objectType: "whatsapp_business_account",
    status: "processing",
    attemptCount: 1,
    lastErrorCode: null,
    receivedAt: occurredAt,
    processedAt: null,
    updatedAt: occurredAt,
    ...overrides,
  };
}

function dependenciesFixture({ queryResults = [], transactionResults = [] }) {
  const queryCalls = [];
  const transactionCalls = [];
  let queryIndex = 0;
  let transactionIndex = 0;

  return {
    queryCalls,
    transactionCalls,
    dependencies: {
      queries: {
        async query(sql, parameters) {
          queryCalls.push({ sql, parameters });
          const rows = queryResults[queryIndex] ?? [];
          queryIndex += 1;
          return { rows, rowCount: rows.length };
        },
      },
      transactions: {
        async transaction(options, execute) {
          assert.deepEqual(options, { isolationLevel: "read-committed" });
          return execute({
            async query(sql, parameters) {
              transactionCalls.push({ sql, parameters });
              const rows = transactionResults[transactionIndex] ?? [];
              transactionIndex += 1;
              return { rows, rowCount: rows.length };
            },
          });
        },
      },
    },
  };
}

function claimInput(overrides = {}) {
  return {
    tenantId: 7,
    wabaId: "waba-id",
    eventKey,
    objectType: "whatsapp_business_account",
    ...overrides,
  };
}

test("reads Meta connections only through exact tenant or WABA scope", async () => {
  const fixture = dependenciesFixture({
    queryResults: [[connectionRow()], [connectionRow()]],
  });
  const repository = createPostgresMetaRepository(fixture.dependencies);

  assert.equal((await repository.findConnectionByTenantId(7))?.tenantId, 7);
  assert.equal((await repository.findConnectionByWabaId(" waba-id "))?.wabaId, "waba-id");
  assert.deepEqual(fixture.queryCalls.map(({ parameters }) => parameters), [
    [7],
    ["waba-id"],
  ]);
});

test("stores and confirms one verified asset snapshot transactionally", async () => {
  const fixture = dependenciesFixture({
    transactionResults: [[connectionRow()]],
  });
  const repository = createPostgresMetaRepository(fixture.dependencies);

  const saved = await repository.saveAssetSnapshot({
    tenantId: 7,
    businessPortfolioId: " business-portfolio-id ",
    wabaId: " waba-id ",
    phoneNumberId: " phone-number-id ",
  });

  assert.equal(saved.status, "pending");
  assert.deepEqual(fixture.transactionCalls[0], {
    sql: postgresMetaSql.upsertAssetSnapshot,
    parameters: [
      7,
      "business-portfolio-id",
      "waba-id",
      "phone-number-id",
    ],
  });
  assert.equal(fixture.transactionCalls.length, 1);
  assert.match(fixture.transactionCalls[0].sql, /RETURNING[\s\S]*version/);
});

test("confirms connection and operational failure states behind transactions", async () => {
  const connectedAt = new Date("2026-08-17T08:31:00.000Z");
  const connectedFixture = dependenciesFixture({
    transactionResults: [
      [{ tenantId: "7" }],
      [connectionRow({
        status: "connected",
        webhookSubscribedAt: connectedAt,
        connectedAt,
        version: 2,
      })],
    ],
  });
  const connected = await createPostgresMetaRepository(
    connectedFixture.dependencies,
  ).markConnectionConnected(7, 1);

  assert.equal(connected.status, "connected");
  assert.equal(
    connectedFixture.transactionCalls[0].sql,
    postgresMetaSql.markConnectionConnected,
  );

  const restrictedFixture = dependenciesFixture({
    transactionResults: [
      [{ tenantId: "7" }],
      [connectionRow({ status: "restricted", version: 2 })],
    ],
  });
  const restricted = await createPostgresMetaRepository(
    restrictedFixture.dependencies,
  ).markConnectionStatus(7, "restricted");

  assert.equal(restricted.status, "restricted");
});

test("claims a new or retryable webhook receipt without payload storage", async () => {
  const fixture = dependenciesFixture({
    queryResults: [[receiptRow({ attemptCount: 2 })]],
  });
  const claimed = await createPostgresMetaRepository(
    fixture.dependencies,
  ).claimWebhookReceipt(claimInput());

  assert.equal(claimed.claimed, true);
  assert.equal(claimed.receipt.attemptCount, 2);
  assert.match(
    postgresMetaSql.claimWebhookReceipt,
    /ON CONFLICT \(tenant_id, event_key\) DO UPDATE[\s\S]*INTERVAL '5 minutes'/,
  );
  assert.doesNotMatch(
    postgresMetaSql.claimWebhookReceipt,
    /raw_payload|payload_json|message_body/i,
  );
});

test("returns an exact processed duplicate and rejects conflicting evidence", async () => {
  const processed = receiptRow({
    status: "processed",
    processedAt: new Date("2026-08-17T08:31:00.000Z"),
  });
  const duplicateFixture = dependenciesFixture({
    queryResults: [[], [processed]],
  });
  const duplicate = await createPostgresMetaRepository(
    duplicateFixture.dependencies,
  ).claimWebhookReceipt(claimInput());

  assert.equal(duplicate.claimed, false);
  assert.equal(duplicate.receipt.status, "processed");

  const conflictFixture = dependenciesFixture({
    queryResults: [[], [processed]],
  });
  await assert.rejects(
    createPostgresMetaRepository(
      conflictFixture.dependencies,
    ).claimWebhookReceipt(
      claimInput({ objectType: "different_object" }),
    ),
    /conflicts with stored evidence/,
  );
});

test("completes and fails receipts only for exact tenant transitions", async () => {
  const fixture = dependenciesFixture({
    queryResults: [
      [{ id: "31", tenantId: "7" }],
      [{ id: "32", tenantId: "7" }],
    ],
  });
  const repository = createPostgresMetaRepository(fixture.dependencies);

  await repository.completeWebhookReceipt(7, 31);
  await repository.failWebhookReceipt(7, 32, "PROCESSOR_FAILED");

  assert.deepEqual(fixture.queryCalls, [
    {
      sql: postgresMetaSql.completeWebhookReceipt,
      parameters: [31, 7],
    },
    {
      sql: postgresMetaSql.failWebhookReceipt,
      parameters: [32, 7, "PROCESSOR_FAILED"],
    },
  ]);
});

test("rejects malformed input and cross-scope PostgreSQL rows", async () => {
  const emptyRepository = createPostgresMetaRepository(
    dependenciesFixture({}).dependencies,
  );

  await assert.rejects(
    emptyRepository.findConnectionByWabaId(" "),
    /wabaId/,
  );
  await assert.rejects(
    emptyRepository.claimWebhookReceipt(
      claimInput({ eventKey: "not-a-digest" }),
    ),
    /eventKey/,
  );
  await assert.rejects(
    createPostgresMetaRepository(
      dependenciesFixture({
        queryResults: [[connectionRow({ tenantId: "8" })]],
      }).dependencies,
    ).findConnectionByTenantId(7),
    /cross-tenant Meta connection/,
  );
  await assert.rejects(
    createPostgresMetaRepository(
      dependenciesFixture({
        queryResults: [[connectionRow({ wabaId: "other-waba" })]],
      }).dependencies,
    ).findConnectionByWabaId("waba-id"),
    /mismatched Meta connection/,
  );
});

test("fails closed for inconsistent rows and rejected transitions", async () => {
  await assert.rejects(
    createPostgresMetaRepository(
      dependenciesFixture({
        queryResults: [[connectionRow({ status: "connected" })]],
      }).dependencies,
    ).findConnectionByTenantId(7),
    /inconsistent Meta connection/,
  );
  await assert.rejects(
    createPostgresMetaRepository(
      dependenciesFixture({ queryResults: [[]] }).dependencies,
    ).completeWebhookReceipt(7, 31),
    /transition was rejected/,
  );
});

test("confirmation fences the pending version and rejects a lost update without reading a newer connection", async () => {
  assert.match(postgresMetaSql.markConnectionConnected, /WHERE tenant_id = \$1\s+AND status = 'pending'\s+AND version = \$2/);
  const fixture = dependenciesFixture({ transactionResults: [[]] });
  await assert.rejects(createPostgresMetaRepository(fixture.dependencies).markConnectionConnected(7, 5), /changed before confirmation/);
  assert.equal(fixture.transactionCalls.length, 1);
  assert.deepEqual(fixture.transactionCalls[0].parameters, [7, 5]);
  await assert.rejects(createPostgresMetaRepository(fixture.dependencies).markConnectionConnected(7, undefined));
  assert.equal(fixture.transactionCalls.length, 1);
});

test("each signup allocates a generation and returns only its own persisted snapshot", async () => {
  assert.match(postgresMetaSql.upsertAssetSnapshot, /version = meta_connections.version \+ 1/);
  assert.doesNotMatch(postgresMetaSql.upsertAssetSnapshot, /ON CONFLICT[\s\S]*\bWHERE\b/);
  const fixture = dependenciesFixture({ transactionResults: [[connectionRow({ version: 4 })], [connectionRow({ version: 5 })]] });
  const repository = createPostgresMetaRepository(fixture.dependencies);
  const assets = { tenantId: 7, businessPortfolioId: "business-portfolio-id", wabaId: "waba-id", phoneNumberId: "phone-number-id" };
  const records = await Promise.all([repository.saveAssetSnapshot(assets), repository.saveAssetSnapshot(assets)]);
  assert.deepEqual(records.map((record) => record.version), [4, 5]);
  assert.equal(fixture.transactionCalls.length, 2);
  for (const rows of [[], [connectionRow({ tenantId: "8" })], [connectionRow({ phoneNumberId: "changed-phone" })]]) {
    const rejected = dependenciesFixture({ transactionResults: [rows] });
    await assert.rejects(createPostgresMetaRepository(rejected.dependencies).saveAssetSnapshot(assets), /not confirmed/);
    assert.equal(rejected.transactionCalls.length, 1);
  }
});

test("webhook revocation is tenant, WABA and version scoped without reactivating stale state", async () => {
  const fixture = dependenciesFixture({ queryResults: [[{ tenantId: "7" }], []] });
  const repository = createPostgresMetaRepository(fixture.dependencies);
  assert.equal(await repository.revokeConnection(7, "waba-id", 2), true);
  assert.equal(await repository.revokeConnection(7, "waba-id", 2), false);
  assert.deepEqual(fixture.queryCalls[0].parameters, [7, "waba-id", 2]);
  assert.match(postgresMetaSql.revokeConnection, /tenant_id = \$1 AND waba_id = \$2 AND version = \$3 AND status <> 'revoked'/);
  await assert.rejects(repository.revokeConnection(7, "waba-id", undefined));
  assert.equal(fixture.queryCalls.length, 2);
});
