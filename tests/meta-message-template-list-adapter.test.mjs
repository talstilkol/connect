import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaMessageTemplateListAdapter,
  MetaMessageTemplateListError,
} from "../server/templates/metaMessageTemplateListAdapter.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

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

function fixture(responses) {
  const requests = [];
  const adapter = createMetaMessageTemplateListAdapter({
    async requestJson(request) {
      requests.push(request);

      if (responses.length === 0) {
        throw new Error("unexpected transport call");
      }

      return responses.shift();
    },
  });

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
