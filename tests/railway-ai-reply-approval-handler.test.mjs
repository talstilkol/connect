import assert from "node:assert/strict";
import test from "node:test";

import { createRailwayAiReplyApprovalHandler } from
  "../server/ai/railwayAiReplyApprovalHandler.ts";
import { deriveRailwayApiDeterministicIdempotencyKey } from
  "../server/platform/railwayApiMutationExecutor.ts";

const outboxKey = `ai_reply_outbox_v1_${"a".repeat(64)}`;
const conversationKey = `conversation_v1_${"b".repeat(64)}`;

function approval() {
  return {
    outboxKey,
    conversationKey,
    replyText: "Grounded reply",
    groundedSourceCount: 2,
    groundingScoreBasisPoints: 9_100,
    version: 1,
    createdAt: "2026-08-21T10:00:00.000Z",
  };
}

function fixture(options = {}) {
  const calls = { identities: 0, requests: [] };
  const handler = createRailwayAiReplyApprovalHandler({
    applicationConfigured: () => options.applicationConfigured ?? true,
    inspectConfiguration: () => options.configuration ?? {
      status: "configured",
      missingKeys: [],
      invalidKeys: [],
      configuration: {
        apiOrigin: "https://railway.example.com",
        deploymentEnvironment: "production",
      },
    },
    async resolveIdentity() {
      calls.identities += 1;
      return options.identity ?? {
        status: "authenticated",
        oidcToken: "oidc.token.value",
        userSessionToken: "session.token.value",
      };
    },
    createClient() {
      return {
        async call(request) {
          calls.requests.push(request);
          if (options.response) return options.response(request);
          return request.operation === "ai.reply-approvals.list"
            ? {
                contractVersion: "connect.railway-api.v1",
                outcome: "ok",
                data: { approvals: [approval()], canDecide: true },
              }
            : {
                contractVersion: "connect.railway-api.v1",
                outcome: "ok",
                data: {
                  replayed: false,
                  outcome: "updated",
                  approval: {
                    outboxKey,
                    status: "ready-for-delivery",
                    version: 2,
                  },
                },
              };
        },
      };
    },
  });
  return { calls, handler };
}

test("reads a bounded AI reply approval directory through Railway", async () => {
  const result = await fixture().handler.load();
  assert.deepEqual(result, {
    status: "loaded",
    directory: { approvals: [approval()], canDecide: true },
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|requestKey|auditKey|recipientPhoneNumber/,
  );
});

test("decides through one deterministic Railway mutation", async () => {
  const testFixture = fixture();
  const payload = { outboxKey, expectedVersion: 1, decision: "approve" };
  const result = await testFixture.handler.decide(payload);
  assert.deepEqual(result, {
    status: "decided",
    outcome: "updated",
    approval: { outboxKey, status: "ready-for-delivery", version: 2 },
  });
  assert.equal(testFixture.calls.requests.length, 1);
  assert.equal(
    testFixture.calls.requests[0].idempotencyKey,
    await deriveRailwayApiDeterministicIdempotencyKey(
      "ai.reply-approvals.decide",
      payload,
    ),
  );
});

test("maps bounded decision failures", async () => {
  for (const status of ["not-found", "state-conflict", "invalid-state"]) {
    const testFixture = fixture({
      response() {
        return {
          contractVersion: "connect.railway-api.v1",
          outcome: "ok",
          data: { replayed: false, outcome: status },
        };
      },
    });
    assert.deepEqual(
      await testFixture.handler.decide({
        outboxKey,
        expectedVersion: 1,
        decision: "reject",
      }),
      { status },
    );
  }
});

test("rejects forged or malformed decision input before Railway", async () => {
  const testFixture = fixture();
  for (const input of [
    { outboxKey, expectedVersion: 1, decision: "approve", tenantId: 7 },
    { outboxKey: "bad", expectedVersion: 1, decision: "approve" },
    { outboxKey, expectedVersion: 0, decision: "reject" },
  ]) {
    assert.deepEqual(await testFixture.handler.decide(input), {
      status: "invalid-input",
    });
  }
  assert.equal(testFixture.calls.requests.length, 0);
});

test("fails closed for disabled configuration and malformed responses", async () => {
  const disabled = fixture({ applicationConfigured: false });
  assert.deepEqual(await disabled.handler.load(), {
    status: "configuration-required",
  });
  assert.equal(disabled.calls.identities, 0);

  const malformed = fixture({
    response() {
      return {
        contractVersion: "connect.railway-api.v1",
        outcome: "ok",
        data: {
          approvals: [{ ...approval(), tenantId: 7 }],
          canDecide: true,
        },
      };
    },
  });
  assert.deepEqual(await malformed.handler.load(), { status: "server-error" });
});
