import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
} from "../server/platform/postgresBotReplyStagingReleaseEvidenceOperatorRepository.ts";
import {
  railwayBotReplyStagingReleaseEvidenceOperatorConfirmation,
} from "../server/platform/railwayBotReplyStagingReleaseEvidenceOperator.ts";
import {
  RailwayApiDispatchError,
} from "../server/platform/railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwaySystemAdminBotReplyStagingReleaseEvidencePublishOperation,
  railwaySystemAdminBotReplyStagingReleaseEvidencePublishPolicy,
} from "../server/platform/railwaySystemAdminBotReplyStagingReleaseEvidencePublishOperation.ts";

const adminIdentity = "system-admin-primary";
const release = Object.freeze({
  releaseId: `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
  artifactDigest: `sha256:${"c".repeat(64)}`,
});
const evidenceDigest =
  `bot_reply_staging_cross_service_evidence_v1_${"d".repeat(64)}`;
const auditEventKey =
  `bot_reply_staging_release_evidence_operator_event_v1_${"e".repeat(64)}`;

function payload(overrides = {}) {
  return {
    schemaVersion: 1,
    confirmation:
      railwayBotReplyStagingReleaseEvidenceOperatorConfirmation,
    expectedRelease: release,
    expectedVersion: 0,
    expectedEvidenceDigest: null,
    lifetimeSeconds: 600,
    requestedAt: "2026-08-25T10:00:00.000Z",
    ...overrides,
  };
}

async function request(value = payload(), overrides = {}) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation:
      RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
    requestKind: "mutation",
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(
      RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
      value,
    ),
    payload: value,
    ...overrides,
  };
}

function dispatchContext(externalUserId = adminIdentity) {
  return Object.freeze({
    serviceIdentity: Object.freeze({
      provider: "vercel",
      teamSlug: "connect-team",
      projectName: "connect-web",
      environment: "staging",
      subject: "owner:connect-team:project:connect-web:environment:staging",
    }),
    userIdentity: Object.freeze({ externalUserId }),
  });
}

function fixture({
  operatorResult = null,
  rateLimitDecision = { outcome: "allowed" },
  rateLimitError = null,
} = {}) {
  const calls = { quota: [], operator: [] };
  const operation =
    createRailwaySystemAdminBotReplyStagingReleaseEvidencePublishOperation({
      allowedExternalUserIds: [adminIdentity],
      mutationRateLimit: {
        async consume(subject) {
          calls.quota.push(subject);
          if (rateLimitError) throw rateLimitError;
          return rateLimitDecision;
        },
      },
      operator: {
        async operate(input, context) {
          calls.operator.push({ input, context });
          return operatorResult ?? {
            schemaVersion: 1,
            operatorVersion:
              "connect-railway-bot-reply-staging-release-evidence-operator-v1",
            status: "published",
            code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_PUBLISHED",
            outcome: "published",
            version: 1,
            evidenceDigest,
            expiresAt: "2026-08-25T10:10:00.000Z",
            auditEventKey,
          };
        },
      },
    });
  return { operation, calls };
}

function hasCode(code) {
  return (error) =>
    error instanceof RailwayApiDispatchError && error.code === code;
}

test("declares a system-admin, rate-limited and atomically audited policy", () => {
  assert.deepEqual(
    railwaySystemAdminBotReplyStagingReleaseEvidencePublishPolicy,
    {
      id: RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION,
      requestKind: "mutation",
      authorization: "system-admin-allowlist",
      mutationSafety: {
        rateLimit: "system-admin-mutation",
        idempotency: "deterministic-request-key-and-operator-event-replay",
        audit: "atomic-release-cas-and-append-only-operator-event",
        transaction: "postgres-audited-compare-and-set",
        activation: "explicit-adr-and-live-configuration-approval",
        providerBoundary: "none",
      },
    },
  );
  assert.ok(Object.isFrozen(
    railwaySystemAdminBotReplyStagingReleaseEvidencePublishPolicy,
  ));
  assert.ok(Object.isFrozen(
    railwaySystemAdminBotReplyStagingReleaseEvidencePublishPolicy
      .mutationSafety,
  ));
});

test("authorizes, rate-limits and forwards the verified actor and key", async () => {
  const testFixture = fixture();
  const input = payload();
  const envelope = await request(input);
  const result = await testFixture.operation.execute(
    dispatchContext(),
    input,
    envelope,
  );

  assert.deepEqual(testFixture.calls.quota, [
    `${adminIdentity}:${RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_PUBLISH_OPERATION}`,
  ]);
  assert.deepEqual(testFixture.calls.operator, [{
    input,
    context: {
      actorExternalUserId: adminIdentity,
      idempotencyKey: envelope.idempotencyKey,
    },
  }]);
  assert.deepEqual(result, {
    outcome: "published",
    version: 1,
    evidenceDigest,
    expiresAt: "2026-08-25T10:10:00.000Z",
    auditEventKey,
  });
  assert.doesNotMatch(JSON.stringify(result), /actor|token|secret/i);
  assert.ok(Object.isFrozen(result));
});

test("rejects an unauthorized identity before quota and operator", async () => {
  const testFixture = fixture();
  const input = payload();
  await assert.rejects(
    testFixture.operation.execute(
      dispatchContext("not-allowed"),
      input,
      await request(input),
    ),
    hasCode("AUTHORIZATION_DENIED"),
  );
  assert.deepEqual(testFixture.calls, { quota: [], operator: [] });
});

test("rejects request extensions and mismatched idempotency", async () => {
  const extendedFixture = fixture();
  const extended = { ...payload(), extension: true };
  await assert.rejects(
    extendedFixture.operation.execute(
      dispatchContext(),
      extended,
      await request(extended),
    ),
    hasCode("INVALID_REQUEST"),
  );
  assert.deepEqual(extendedFixture.calls, { quota: [], operator: [] });

  const keyFixture = fixture();
  const input = payload();
  await assert.rejects(
    keyFixture.operation.execute(
      dispatchContext(),
      input,
      { ...await request(input), idempotencyKey: `connect_idempotency_v1_${"f".repeat(64)}` },
    ),
    hasCode("CONFLICT"),
  );
  assert.deepEqual(keyFixture.calls, { quota: [], operator: [] });
});

test("fails closed for quota and operator blockers", async () => {
  for (const [configuration, code] of [
    [{ rateLimitDecision: { outcome: "limited" } }, "RATE_LIMITED"],
    [{ rateLimitDecision: { outcome: "unknown" } }, "DEPENDENCY_UNAVAILABLE"],
    [{ rateLimitError: new Error("offline") }, "DEPENDENCY_UNAVAILABLE"],
  ]) {
    const testFixture = fixture(configuration);
    const input = payload();
    await assert.rejects(
      testFixture.operation.execute(
        dispatchContext(),
        input,
        await request(input),
      ),
      hasCode(code),
    );
    assert.equal(testFixture.calls.operator.length, 0);
  }

  const blocks = [
    [
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_ACTIVATION_REQUIRED",
      "INVALID_TRANSITION",
    ],
    [
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_REQUEST_NOT_CURRENT",
      "INVALID_REQUEST",
    ],
    [
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_WRITE_CONFLICT",
      "CONFLICT",
    ],
    [
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_OPERATOR_AUDIT_READ_BACK_MISMATCH",
      "DEPENDENCY_UNAVAILABLE",
    ],
  ];
  for (const [operatorCode, dispatchCode] of blocks) {
    const testFixture = fixture({
      operatorResult: {
        schemaVersion: 1,
        operatorVersion:
          "connect-railway-bot-reply-staging-release-evidence-operator-v1",
        status: "blocked",
        code: operatorCode,
        outcome: null,
        version: null,
        evidenceDigest: null,
        expiresAt: null,
        auditEventKey: null,
      },
    });
    const input = payload();
    await assert.rejects(
      testFixture.operation.execute(
        dispatchContext(),
        input,
        await request(input),
      ),
      hasCode(dispatchCode),
    );
  }
});

test("rejects incomplete operation dependencies", () => {
  assert.throws(
    () => createRailwaySystemAdminBotReplyStagingReleaseEvidencePublishOperation({
      allowedExternalUserIds: [adminIdentity],
      mutationRateLimit: { consume: async () => ({ outcome: "allowed" }) },
    }),
    /dependencies are invalid/,
  );
});
