import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaMessageTemplateListAdapter,
  MetaMessageTemplateListError,
} from "../server/templates/metaMessageTemplateListAdapter.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";
import {
  observeMessageTemplateSubmissionMaintenance,
} from "../server/operations/messageTemplateSubmissionMaintenanceTelemetry.ts";
import {
  createProviderRequestTelemetryScope,
} from "../server/operations/providerRequestTelemetry.ts";

const accessToken = toSensitiveMetaAccessToken(
  "template-list-access-token",
);

function template(overrides = {}) {
  return {
    id: "400004",
    name: "service_update",
    language: "he",
    status: "APPROVED",
    category: "UTILITY",
    ...overrides,
  };
}

function fixture(responses, telemetry) {
  const requests = [];
  const adapter = createMetaMessageTemplateListAdapter({
    async requestJson(request) {
      requests.push(request);

      if (responses.length === 0) {
        throw new Error("unexpected transport call");
      }

      return responses.shift();
    },
  }, telemetry);

  return { adapter, requests };
}

test("lists a validated Meta template page with bounded fields", async () => {
  const testFixture = fixture([
    {
      data: [
        template(),
        template({
          id: 400005,
          name: "account_notice",
          language: "en_US",
          status: "PENDING",
          category: "MARKETING",
        }),
      ],
    },
  ]);

  const result = await testFixture.adapter.list({
    wabaId: "200002",
    accessToken,
  });

  assert.deepEqual(result, [
    {
      metaTemplateId: "400004",
      name: "service_update",
      language: "he",
      providerStatus: "APPROVED",
      category: "UTILITY",
    },
    {
      metaTemplateId: "400005",
      name: "account_notice",
      language: "en_US",
      providerStatus: "PENDING",
      category: "MARKETING",
    },
  ]);
  assert.deepEqual(testFixture.requests, [
    {
      method: "GET",
      pathSegments: ["200002", "message_templates"],
      accessToken,
      query: {
        fields: "id,name,language,status,category",
        limit: "100",
      },
    },
  ]);
  assert.equal(
    "access_token" in testFixture.requests[0].query,
    false,
  );
});

test("follows only the validated after cursor across pages", async () => {
  const testFixture = fixture([
    {
      data: [template()],
      paging: {
        cursors: { after: "cursor-page-2" },
        next: "https://provider.invalid/untrusted-next-url",
      },
    },
    {
      data: [
        template({
          id: "400005",
          name: "account_notice",
        }),
      ],
    },
  ]);

  const result = await testFixture.adapter.list({
    wabaId: "200002",
    accessToken,
  });

  assert.equal(result.length, 2);
  assert.deepEqual(testFixture.requests[1].query, {
    fields: "id,name,language,status,category",
    limit: "100",
    after: "cursor-page-2",
  });
});

test("links every actual Meta list page to the maintenance parent", async () => {
  const events = [];
  const timestamps = [
    "2026-08-21T11:00:00.000Z",
    "2026-08-21T11:00:00.010Z",
    "2026-08-21T11:00:00.020Z",
    "2026-08-21T11:00:00.030Z",
    "2026-08-21T11:00:00.040Z",
    "2026-08-21T11:00:00.050Z",
  ].map((value) => new Date(value));
  const telemetryClock = {
    now() {
      const value = timestamps.shift();
      if (value === undefined) throw new Error("test clock exhausted");
      return value;
    },
  };
  const scope = createProviderRequestTelemetryScope();
  const testFixture = fixture([
    {
      data: [template()],
      paging: {
        cursors: { after: "cursor-page-2" },
        next: "https://provider.invalid/page-2",
      },
    },
    {
      data: [template({ id: "400005", name: "account_notice" })],
    },
  ], { scope, clock: telemetryClock });
  const counts = Object.freeze({
    pendingCandidates: 0,
    published: 0,
    ambiguousCandidates: 1,
    resolvedSubmitted: 1,
    resolvedRejected: 0,
    deferred: 0,
    duplicates: 0,
    missing: 0,
    failed: 0,
  });
  const observed = observeMessageTemplateSubmissionMaintenance(
    {
      async run() {
        assert.equal((await testFixture.adapter.list({
          wabaId: "200002",
          accessToken,
        })).length, 2);
        return counts;
      },
    },
    {
      async record(event) {
        events.push(event);
        return { outcome: "recorded" };
      },
    },
    telemetryClock,
    scope,
  );

  assert.equal(await observed.run(), counts);
  assert.equal(events.length, 1);
  assert.equal(events[0].providerRequests.length, 2);
  assert.deepEqual(
    events[0].providerRequests.map((request) => request.operation),
    ["message-template.list", "message-template.list"],
  );
  assert.deepEqual(
    events[0].providerRequests.map((request) => request.durationMilliseconds),
    [10, 10],
  );
  assert.equal(events[0].startedAt, "2026-08-21T11:00:00.000Z");
  assert.equal(events[0].completedAt, "2026-08-21T11:00:00.050Z");
  assert.doesNotMatch(
    JSON.stringify(events),
    /tenant|waba|token|cursor|payload|url/i,
  );
});

test("rejects invalid WABA input before transport", async () => {
  const testFixture = fixture([]);

  await assert.rejects(
    testFixture.adapter.list({
      wabaId: "../message_templates",
      accessToken,
    }),
    (error) =>
      error instanceof MetaMessageTemplateListError &&
      error.code === "INVALID_WABA_ID",
  );
  assert.equal(testFixture.requests.length, 0);
});

test("fails closed on malformed entries and unsupported statuses", async () => {
  for (const response of [
    { data: [template({ id: "0" })] },
    { data: [template({ name: "Invalid Name" })] },
    { data: [template({ status: "UNKNOWN_STATUS" })] },
    {
      data: [template()],
      paging: {
        next: "https://provider.invalid/page-2",
        cursors: {},
      },
    },
  ]) {
    const testFixture = fixture([response]);

    await assert.rejects(
      testFixture.adapter.list({
        wabaId: "200002",
        accessToken,
      }),
      (error) =>
        error instanceof MetaMessageTemplateListError &&
        error.code === "INVALID_RESPONSE",
    );
  }
});

test("stops inconsistent cursor loops and duplicate template IDs", async () => {
  const repeatedCursor = fixture([
    {
      data: [template()],
      paging: {
        cursors: { after: "same-cursor" },
        next: "https://provider.invalid/page-2",
      },
    },
    {
      data: [
        template({
          id: "400005",
          name: "account_notice",
        }),
      ],
      paging: {
        cursors: { after: "same-cursor" },
        next: "https://provider.invalid/page-3",
      },
    },
  ]);
  const duplicateId = fixture([
    {
      data: [template()],
      paging: {
        cursors: { after: "cursor-page-2" },
        next: "https://provider.invalid/page-2",
      },
    },
    {
      data: [template()],
    },
  ]);

  for (const testFixture of [
    repeatedCursor,
    duplicateId,
  ]) {
    await assert.rejects(
      testFixture.adapter.list({
        wabaId: "200002",
        accessToken,
      }),
      (error) =>
        error instanceof MetaMessageTemplateListError &&
        error.code === "PAGINATION_ERROR",
    );
  }
});
