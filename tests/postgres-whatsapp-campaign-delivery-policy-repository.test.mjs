import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveWhatsappCampaignDeliveryPolicyEventKey,
} from "../server/campaigns/whatsappCampaignDeliveryPolicyKey.ts";
import {
  createPostgresWhatsappCampaignDeliveryPolicyRepository,
  postgresWhatsappCampaignDeliveryPolicySql,
} from "../server/platform/postgresWhatsappCampaignDeliveryPolicyRepository.ts";

const evidenceCheckedAt = "2026-08-17T08:30:00.000Z";
const recordedAt = "2026-08-17T08:31:00.000Z";
const evidenceExpiresAt = "2026-08-18T08:30:00.000Z";

function policyCommand(overrides = {}) {
  return {
    tenantId: 7,
    connectionVersion: 2,
    expectedPolicyVersion: 0,
    deliveryState: "enabled",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 250,
    phoneThroughputMessagesPerSecond: 80,
    maximumOutboundMessagesPerSecond: 64,
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: "e".repeat(64),
    evidenceCheckedAt,
    evidenceExpiresAt,
    actorExternalUserId: "tal-rate-limit-research",
    recordedAt,
    ...overrides,
  };
}

async function eventKeyFor(command) {
  return deriveWhatsappCampaignDeliveryPolicyEventKey(command);
}

const enabledEventKey = await eventKeyFor(policyCommand());

function policyRow(overrides = {}) {
  return {
    eventKey: enabledEventKey,
    tenantId: "7",
    connectionVersion: 2,
    policyVersion: 1,
    deliveryState: "enabled",
    portfolioLimitKind: "bounded",
    portfolioLimitValue: 250,
    phoneThroughputMessagesPerSecond: 80,
    maximumOutboundMessagesPerSecond: 64,
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v21.0",
    evidenceDigest: "e".repeat(64),
    evidenceCheckedAt: new Date(evidenceCheckedAt),
    evidenceExpiresAt: new Date(evidenceExpiresAt),
    actorExternalUserId: "tal-rate-limit-research",
    recordedAt: new Date(recordedAt),
    ...overrides,
  };
}

function connectionLockRow(overrides = {}) {
  return {
    tenantId: "7",
    status: "connected",
    version: 2,
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

test("reads only current policy evidence for the exact Meta asset scope", async () => {
  const fixture = dependenciesFixture({ queryResults: [[policyRow()]] });
  const repository = createPostgresWhatsappCampaignDeliveryPolicyRepository(
    fixture.dependencies,
  );
  const evidence = await repository.findCurrentEnabledPolicy({
    tenantId: 7,
    businessPortfolioId: "portfolio-id",
    wabaId: "waba-id",
    phoneNumberId: "phone-id",
    checkedAt: "2026-08-17T08:32:00.000Z",
  });

  assert.equal(evidence?.eventKey, enabledEventKey);
  assert.deepEqual(fixture.queryCalls[0], {
    sql: postgresWhatsappCampaignDeliveryPolicySql.findCurrentEnabledPolicy,
    parameters: [
      7,
      "portfolio-id",
      "waba-id",
      "phone-id",
      "2026-08-17T08:32:00.000Z",
    ],
  });
  assert.match(
    postgresWhatsappCampaignDeliveryPolicySql.findCurrentEnabledPolicy,
    /connection\.status = 'connected'[\s\S]*policy\.connection_version = connection\.version[\s\S]*max\(latest\.policy_version\)/,
  );
});

test("loads the latest tenant policy and rejects cross-tenant results", async () => {
  const fixture = dependenciesFixture({ queryResults: [[policyRow()]] });
  const repository = createPostgresWhatsappCampaignDeliveryPolicyRepository(
    fixture.dependencies,
  );

  assert.equal((await repository.findLatestPolicyEvent(7))?.policyVersion, 1);
  assert.deepEqual(fixture.queryCalls[0].parameters, [7]);

  await assert.rejects(
    createPostgresWhatsappCampaignDeliveryPolicyRepository(
      dependenciesFixture({
        queryResults: [[policyRow({ tenantId: "8" })]],
      }).dependencies,
    ).findLatestPolicyEvent(7),
    /cross-tenant WhatsApp policy/,
  );
});

test("creates policy evidence behind the Meta connection lock", async () => {
  const fixture = dependenciesFixture({
    transactionResults: [[connectionLockRow()], [], [policyRow()]],
  });
  const repository = createPostgresWhatsappCampaignDeliveryPolicyRepository(
    fixture.dependencies,
  );
  const result = await repository.recordPolicyEvent(policyCommand());

  assert.equal(result.outcome, "created");
  assert.deepEqual(fixture.transactionCalls.map(({ sql }) => sql), [
    postgresWhatsappCampaignDeliveryPolicySql.lockMetaConnection,
    postgresWhatsappCampaignDeliveryPolicySql.findLatestPolicyEvent,
    postgresWhatsappCampaignDeliveryPolicySql.insertPolicyEvent,
  ]);
  assert.deepEqual(fixture.transactionCalls[2].parameters, [
    enabledEventKey,
    7,
    2,
    1,
    "enabled",
    "bounded",
    250,
    80,
    64,
    300,
    "v21.0",
    "e".repeat(64),
    evidenceCheckedAt,
    evidenceExpiresAt,
    "tal-rate-limit-research",
    recordedAt,
  ]);
  assert.doesNotMatch(
    postgresWhatsappCampaignDeliveryPolicySql.insertPolicyEvent,
    /INSERT INTO audit_logs/,
  );
});

test("returns unchanged for an exact event replay without another insert", async () => {
  const fixture = dependenciesFixture({
    transactionResults: [[connectionLockRow()], [policyRow()]],
  });
  const result = await createPostgresWhatsappCampaignDeliveryPolicyRepository(
    fixture.dependencies,
  ).recordPolicyEvent(policyCommand());

  assert.equal(result.outcome, "unchanged");
  assert.equal(fixture.transactionCalls.length, 2);
});

test("returns unchanged for the same committed snapshot when a retry has a later clock", async () => {
  const fixture = dependenciesFixture({
    transactionResults: [[connectionLockRow()], [policyRow()]],
  });
  const result = await createPostgresWhatsappCampaignDeliveryPolicyRepository(
    fixture.dependencies,
  ).recordPolicyEvent(
    policyCommand({ recordedAt: "2026-08-17T08:31:00.001Z" }),
  );

  assert.equal(result.outcome, "unchanged");
  assert.equal(result.record.policyVersion, 1);
  assert.equal(fixture.transactionCalls.length, 2);
});

test("returns conflict for stale or invalid kill-switch transitions", async () => {
  const staleFixture = dependenciesFixture({
    transactionResults: [[connectionLockRow()], [policyRow()]],
  });
  const stale = await createPostgresWhatsappCampaignDeliveryPolicyRepository(
    staleFixture.dependencies,
  ).recordPolicyEvent(
    policyCommand({ evidenceDigest: "f".repeat(64) }),
  );
  assert.equal(stale.outcome, "conflict");

  const killSwitchFixture = dependenciesFixture({
    transactionResults: [[connectionLockRow()], [policyRow()]],
  });
  const invalidKillSwitch =
    await createPostgresWhatsappCampaignDeliveryPolicyRepository(
      killSwitchFixture.dependencies,
    ).recordPolicyEvent(
      policyCommand({
        expectedPolicyVersion: 1,
        deliveryState: "disabled",
        reservationDurationSeconds: 600,
        recordedAt: "2026-08-17T08:33:00.000Z",
      }),
    );
  assert.equal(invalidKillSwitch.outcome, "conflict");
  assert.equal(killSwitchFixture.transactionCalls.length, 2);
});

test("records an exact kill-switch snapshot as the next immutable version", async () => {
  const disabledCommand = policyCommand({
    expectedPolicyVersion: 1,
    deliveryState: "disabled",
    recordedAt: "2026-08-17T08:33:00.000Z",
  });
  const disabledEventKey = await eventKeyFor(disabledCommand);
  const disabledRow = policyRow({
    eventKey: disabledEventKey,
    policyVersion: 2,
    deliveryState: "disabled",
    recordedAt: new Date(disabledCommand.recordedAt),
  });
  const fixture = dependenciesFixture({
    transactionResults: [
      [connectionLockRow()],
      [policyRow()],
      [disabledRow],
    ],
  });
  const result = await createPostgresWhatsappCampaignDeliveryPolicyRepository(
    fixture.dependencies,
  ).recordPolicyEvent(disabledCommand);

  assert.equal(result.outcome, "updated");
  assert.equal(result.record.deliveryState, "disabled");
  assert.equal(fixture.transactionCalls[2].parameters[3], 2);
});

test("fails closed when Meta state does not authorize the policy", async () => {
  const missing = dependenciesFixture({ transactionResults: [[]] });
  await assert.rejects(
    createPostgresWhatsappCampaignDeliveryPolicyRepository(
      missing.dependencies,
    ).recordPolicyEvent(policyCommand()),
    /Meta connection was not found/,
  );

  const staleConnection = dependenciesFixture({
    transactionResults: [[connectionLockRow({ version: 3 })]],
  });
  await assert.rejects(
    createPostgresWhatsappCampaignDeliveryPolicyRepository(
      staleConnection.dependencies,
    ).recordPolicyEvent(policyCommand()),
    /does not permit this policy/,
  );

  const restricted = dependenciesFixture({
    transactionResults: [[connectionLockRow({ status: "restricted" })]],
  });
  await assert.rejects(
    createPostgresWhatsappCampaignDeliveryPolicyRepository(
      restricted.dependencies,
    ).recordPolicyEvent(policyCommand()),
    /does not permit this policy/,
  );

  const malformed = dependenciesFixture({
    transactionResults: [[connectionLockRow({ status: "invented" })]],
  });
  await assert.rejects(
    createPostgresWhatsappCampaignDeliveryPolicyRepository(
      malformed.dependencies,
    ).recordPolicyEvent(
      policyCommand({
        expectedPolicyVersion: 1,
        deliveryState: "disabled",
      }),
    ),
    /does not permit this policy/,
  );
});

test("rejects malformed PostgreSQL policy evidence and unsafe input", async () => {
  await assert.rejects(
    createPostgresWhatsappCampaignDeliveryPolicyRepository(
      dependenciesFixture({
        queryResults: [[policyRow({ recordedAt: new Date(evidenceExpiresAt) })]],
      }).dependencies,
    ).findLatestPolicyEvent(7),
    /invalid WhatsApp policy timeline/,
  );

  const repository = createPostgresWhatsappCampaignDeliveryPolicyRepository(
    dependenciesFixture({}).dependencies,
  );
  await assert.rejects(
    repository.findCurrentEnabledPolicy({
      tenantId: 7,
      businessPortfolioId: " ",
      wabaId: "waba-id",
      phoneNumberId: "phone-id",
      checkedAt: recordedAt,
    }),
    /business portfolio identifier is invalid/,
  );
  await assert.rejects(
    repository.recordPolicyEvent(
      policyCommand({ reservationDurationSeconds: 5 }),
    ),
    /reservation duration is invalid/,
  );
});
