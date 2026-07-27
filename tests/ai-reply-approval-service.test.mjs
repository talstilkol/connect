import assert from "node:assert/strict";
import test from "node:test";

import {
  AiReplyApprovalServiceError,
  createAiReplyApprovalService,
} from "../server/ai/aiReplyApprovalService.ts";

const outboxKey =
  `ai_reply_outbox_v1_${"a".repeat(64)}`;

function session(
  role = "agent",
  tenantId = 7,
) {
  return {
    externalUserId: "clerk-user-seven",
    tenantId,
    displayName: "tenant-seven",
    status: "active",
    role,
  };
}

test("derives tenant and approval actor only from the server session", async () => {
  const calls = [];
  const item = {
    outboxKey,
    status: "ready-for-delivery",
  };
  const service =
    createAiReplyApprovalService(
      {
        async stage() {
          throw new Error("not used");
        },
        async findByKey() {
          return null;
        },
        async listAwaitingApproval() {
          return [];
        },
        async decide(input) {
          calls.push(input);
          return {
            outcome: "updated",
            item,
          };
        },
      },
      {
        now: () =>
          new Date(
            "2026-07-26T11:00:00.000Z",
          ),
      },
    );

  const result = await service.decide(
    session(),
    {
      outboxKey,
      expectedVersion: 1,
      decision: "approve",
    },
  );

  assert.equal(result.outcome, "updated");
  assert.deepEqual(calls, [
    {
      tenantId: 7,
      outboxKey,
      expectedVersion: 1,
      decidedByExternalUserId:
        "clerk-user-seven",
      decision: "approve",
      decidedAt:
        "2026-07-26T11:00:00.000Z",
    },
  ]);
});

test("enforces conversation permissions for approval reads and decisions", async () => {
  let called = false;
  const service =
    createAiReplyApprovalService({
      async stage() {
        throw new Error("not used");
      },
      async findByKey() {
        return null;
      },
      async listAwaitingApproval() {
        called = true;
        return [];
      },
      async decide() {
        called = true;
        return { outcome: "not-found" };
      },
    });

  await assert.rejects(
    service.decide(session("viewer"), {
      outboxKey,
      expectedVersion: 1,
      decision: "approve",
    }),
    /does not grant conversations.reply/,
  );
  assert.equal(called, false);
  assert.deepEqual(
    await service.listAwaiting(
      session("viewer"),
    ),
    [],
  );
  assert.equal(called, true);
});

test("rejects extended input and maps repository state without exposing internals", async () => {
  let called = false;
  const service =
    createAiReplyApprovalService({
      async stage() {
        throw new Error("not used");
      },
      async findByKey() {
        return null;
      },
      async listAwaitingApproval() {
        return [];
      },
      async decide() {
        called = true;
        return { outcome: "conflict" };
      },
    });

  await assert.rejects(
    service.decide(session(), {
      outboxKey,
      expectedVersion: 1,
      decision: "approve",
      tenantId: 99,
    }),
    (error) =>
      error instanceof
        AiReplyApprovalServiceError &&
      error.code === "INVALID_INPUT",
  );
  assert.equal(called, false);

  await assert.rejects(
    service.decide(session(), {
      outboxKey,
      expectedVersion: 1,
      decision: "approve",
    }),
    (error) =>
      error instanceof
        AiReplyApprovalServiceError &&
      error.code === "STATE_CONFLICT",
  );
});

