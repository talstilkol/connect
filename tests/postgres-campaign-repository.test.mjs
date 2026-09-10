import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgresCampaignRepository,
  postgresCampaignSql,
} from "../server/platform/postgresCampaignRepository.ts";

const campaignKey = `campaign_v1_${"a".repeat(64)}`;
const templateKey = `template_v1_${"b".repeat(64)}`;
const audienceSnapshotKey = "c".repeat(64);
const personalizationKey = "d".repeat(64);
const deliveryKey = `campaign_delivery_v1_${"e".repeat(64)}`;

function templateSnapshot() {
  return {
    templateKey,
    metaTemplateId: "400004",
    version: 3,
    name: "service_update",
    category: "UTILITY",
    language: "he",
    header: "",
    body: "שלום {{1}}",
    footer: "",
    variableExamples: { 1: "שם איש קשר" },
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
  };
}

function campaignRow(overrides = {}) {
  return {
    campaignKey,
    tenantId: "7",
    name: "עדכון שירות",
    status: "draft",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    templateKey,
    templateSnapshotJson: templateSnapshot(),
    audienceSnapshotKey,
    recipientCount: 1,
    version: 1,
    activatedAt: null,
    startedAt: null,
    completedAt: null,
    lastErrorCode: null,
    createdAt: new Date("2026-08-17T08:00:00.000Z"),
    updatedAt: new Date("2026-08-17T08:00:00.000Z"),
    ...overrides,
  };
}

function recipientRow(overrides = {}) {
  return {
    contactId: "17",
    contactVersion: 2,
    phoneNumber: "+972501234567",
    personalizationJson: { "body:1": "שם איש קשר" },
    personalizationKey,
    deliveryKey,
    ...overrides,
  };
}

function saveInput(overrides = {}) {
  return {
    campaignKey,
    tenantId: 7,
    name: "עדכון שירות",
    deliveryMode: "immediate",
    scheduledAt: null,
    timezone: "Asia/Jerusalem",
    template: templateSnapshot(),
    audienceSnapshotKey,
    recipientCount: 1,
    recipients: [{
      contactId: 17,
      contactVersion: 2,
      phoneNumber: "+972501234567",
      personalization: { "body:1": "שם איש קשר" },
      personalizationKey,
      deliveryKey,
    }],
    ...overrides,
  };
}

function queryFixture(responses) {
  const calls = [];
  const remaining = [...responses];

  return {
    calls,
    async query(sql, parameters) {
      calls.push({ sql, parameters });
      const response = remaining.shift();
      if (!response) {
        throw new Error("Unexpected PostgreSQL query");
      }
      return response;
    },
    assertConsumed() {
      assert.equal(remaining.length, 0);
    },
  };
}

function repositoryFixture(transactionResponses, queryResponses = []) {
  const transactionQueries = queryFixture(transactionResponses);
  const queries = queryFixture(queryResponses);
  const transactionCalls = [];

  return {
    transactionQueries,
    queries,
    transactionCalls,
    repository: createPostgresCampaignRepository({
      queries,
      transactions: {
        async transaction(options, execute) {
          transactionCalls.push(options);
          return execute(transactionQueries);
        },
      },
    }),
  };
}

test("writes and verifies the complete campaign snapshot in one transaction", async () => {
  const fixture = repositoryFixture([
    { rows: [{ campaignKey }], rowCount: 1 },
    { rows: [campaignRow()], rowCount: 1 },
    { rows: [{ deliveryKey }], rowCount: 1 },
    { rows: [recipientRow()], rowCount: 1 },
  ]);

  const saved = await fixture.repository.saveSnapshot(saveInput());

  assert.equal(saved.campaignKey, campaignKey);
  assert.equal(saved.status, "draft");
  assert.deepEqual(fixture.transactionCalls, [
    { isolationLevel: "read-committed" },
  ]);
  assert.equal(fixture.transactionQueries.calls.length, 4);
  assert.deepEqual(
    fixture.transactionQueries.calls[0].parameters.slice(10, 12),
    ["400004", 3],
  );
  assert.deepEqual(
    JSON.parse(fixture.transactionQueries.calls[2].parameters[2]),
    [{
      contact_id: 17,
      contact_version: 2,
      phone_number: "+972501234567",
      personalization_json: { "body:1": "שם איש קשר" },
      personalization_key: personalizationKey,
      delivery_key: deliveryKey,
    }],
  );
  fixture.transactionQueries.assertConsumed();
});

test("returns an exact idempotent replay without inserting new rows", async () => {
  const fixture = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [campaignRow()], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [recipientRow()], rowCount: 1 },
  ]);

  assert.equal(
    (await fixture.repository.saveSnapshot(saveInput())).campaignKey,
    campaignKey,
  );
  fixture.transactionQueries.assertConsumed();
});

test("rejects a same-count recipient conflict and rolls back the snapshot", async () => {
  const fixture = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [campaignRow()], rowCount: 1 },
    { rows: [], rowCount: 0 },
    {
      rows: [recipientRow({
        deliveryKey: `campaign_delivery_v1_${"f".repeat(64)}`,
      })],
      rowCount: 1,
    },
  ]);

  await assert.rejects(
    fixture.repository.saveSnapshot(saveInput()),
    /snapshot write failed/,
  );
  fixture.transactionQueries.assertConsumed();
});

test("fails atomically when the template or eligible recipient is missing", async () => {
  const missingTemplate = repositoryFixture([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  await assert.rejects(
    missingTemplate.repository.saveSnapshot(saveInput()),
    /snapshot write failed/,
  );

  const missingRecipient = repositoryFixture([
    { rows: [{ campaignKey }], rowCount: 1 },
    { rows: [campaignRow()], rowCount: 1 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);
  await assert.rejects(
    missingRecipient.repository.saveSnapshot(saveInput()),
    /snapshot write failed/,
  );
});

test("reads only the requested tenant and validates PostgreSQL rows", async () => {
  const fixture = repositoryFixture([], [
    { rows: [campaignRow()], rowCount: 1 },
    { rows: [campaignRow()], rowCount: 1 },
  ]);

  assert.equal(
    (await fixture.repository.findByKey(7, campaignKey))?.tenantId,
    7,
  );
  assert.equal((await fixture.repository.listByTenant(7, 100)).length, 1);
  assert.deepEqual(fixture.queries.calls[0].parameters, [7, campaignKey]);
  assert.deepEqual(fixture.queries.calls[1].parameters, [7, 100]);

  const malformed = repositoryFixture([], [{
    rows: [campaignRow({ templateSnapshotJson: { invalid: true } })],
    rowCount: 1,
  }]);
  await assert.rejects(
    malformed.repository.findByKey(7, campaignKey),
    /invalid campaign/,
  );
});

test("uses PostgreSQL locks, JSONB expansion, tenant scope, and live consent", () => {
  assert.match(
    postgresCampaignSql.findByKeyForUpdate,
    /tenant_id = \$1[\s\S]*campaign_key = \$2[\s\S]*FOR UPDATE/,
  );
  assert.match(
    postgresCampaignSql.insertRecipients,
    /jsonb_to_recordset\(\$3::jsonb\)[\s\S]*contacts\.version = input\.contact_version[\s\S]*contacts\.mailing_status = 'subscribed'[\s\S]*contacts\.consent_status = 'granted'/,
  );
  assert.match(postgresCampaignSql.insertCampaign, /ON CONFLICT DO NOTHING/);
  assert.match(
    postgresCampaignSql.listByTenant,
    /WHERE campaigns\.tenant_id = \$1[\s\S]*ORDER BY campaigns\.updated_at DESC/,
  );
});

test("validates input before any transaction or query", async () => {
  const fixture = repositoryFixture([]);

  await assert.rejects(
    fixture.repository.saveSnapshot(saveInput({ recipientCount: 2 })),
    /recipient count/,
  );
  await assert.rejects(
    fixture.repository.listByTenant(7, 101),
    /limit must not exceed 100/,
  );
  await assert.rejects(
    fixture.repository.findByKey(7, "plain-key"),
    /campaignKey is invalid/,
  );
  assert.equal(fixture.transactionCalls.length, 0);
  assert.equal(fixture.queries.calls.length, 0);
});

test("rejects incomplete dependencies", () => {
  assert.throws(
    () => createPostgresCampaignRepository({}),
    /dependencies are invalid/,
  );
});
