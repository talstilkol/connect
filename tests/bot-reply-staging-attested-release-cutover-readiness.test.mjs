import assert from "node:assert/strict";
import test from "node:test";

import * as readinessModule from
  "../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";
import {
  botReplyStagingAttestedReleaseCutoverReadinessVersion,
  evaluateBotReplyStagingAttestedReleaseCutoverReadiness,
} from
  "../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";
import {
  railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
} from
  "../server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";

const verified = Object.freeze({
  status: "verified",
  storageMode: "postgresql",
  releaseId: `connect_release_v1_${"1".repeat(64)}`,
  commitSha: "2".repeat(40),
  artifactDigest: `sha256:${"3".repeat(64)}`,
  evidenceVersion: 2,
  evidenceDigest:
    `bot_reply_staging_cross_service_evidence_v2_${"4".repeat(64)}`,
  evidenceSchemaVersion: 2,
  evidencePolicyVersion:
    railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
  verifiedAt: "2026-08-25T12:00:00.000Z",
  expiresAt: "2026-08-25T12:05:00.000Z",
  replayProtected: true,
});

const unavailable = Object.freeze({
  status: "unavailable",
  storageMode: "postgresql",
  releaseId: null,
  commitSha: null,
  artifactDigest: null,
  evidenceVersion: null,
  evidenceDigest: null,
  evidenceSchemaVersion: null,
  evidencePolicyVersion: null,
  verifiedAt: null,
  expiresAt: null,
  replayProtected: false,
});

const evidenceRequired = Object.freeze({
  schemaVersion: 1,
  readinessVersion:
    botReplyStagingAttestedReleaseCutoverReadinessVersion,
  status: "blocked",
  code: "EVIDENCE_REQUIRED",
  evidenceStatus: "unavailable",
  storageMode: "postgresql",
  releaseId: null,
  commitSha: null,
  artifactDigest: null,
  evidenceVersion: null,
  evidenceDigest: null,
  evidenceSchemaVersion: null,
  evidencePolicyVersion: null,
  verifiedAt: null,
  expiresAt: null,
  replayProtected: false,
  requiredDecisionId: "D31",
  requiredCapabilityRoleCount: 4,
  activationAllowed: false,
});

test("keeps exact replay-protected PostgreSQL v2 evidence dormant behind D31", () => {
  const result =
    evaluateBotReplyStagingAttestedReleaseCutoverReadiness(verified);

  assert.deepEqual(result, {
    schemaVersion: 1,
    readinessVersion:
      botReplyStagingAttestedReleaseCutoverReadinessVersion,
    status: "blocked",
    code: "CAPABILITY_ROLES_REQUIRED",
    evidenceStatus: "verified",
    storageMode: "postgresql",
    releaseId: verified.releaseId,
    commitSha: verified.commitSha,
    artifactDigest: verified.artifactDigest,
    evidenceVersion: verified.evidenceVersion,
    evidenceDigest: verified.evidenceDigest,
    evidenceSchemaVersion: verified.evidenceSchemaVersion,
    evidencePolicyVersion: verified.evidencePolicyVersion,
    verifiedAt: verified.verifiedAt,
    expiresAt: verified.expiresAt,
    replayProtected: true,
    requiredDecisionId: "D31",
    requiredCapabilityRoleCount: 4,
    activationAllowed: false,
  });
  assert.equal(Object.isFrozen(result), true);
});

test("maps the exact unavailable repository result to evidence required", () => {
  const result =
    evaluateBotReplyStagingAttestedReleaseCutoverReadiness(unavailable);

  assert.deepEqual(result, evidenceRequired);
  assert.equal(Object.isFrozen(result), true);
});

test("fails closed for malformed, expanded, v1, or non-replay-protected input", () => {
  const cases = [
    null,
    [],
    "verified",
    true,
    { ...verified, approved: true },
    { ...verified, status: "ready" },
    { ...verified, storageMode: "environment" },
    { ...verified, replayProtected: false },
    {
      ...verified,
      evidenceDigest:
        `bot_reply_staging_cross_service_evidence_v1_${"4".repeat(64)}`,
    },
    { ...verified, evidenceSchemaVersion: 1 },
    { ...verified, evidencePolicyVersion: "legacy-policy-v1" },
    { ...verified, evidenceVersion: 0 },
    { ...verified, verifiedAt: "2026-08-25T12:00:00Z" },
    { ...verified, verifiedAt: "1".repeat(65) },
    { ...verified, expiresAt: "2026-08-25T12:00:59.999Z" },
    { ...unavailable, evidenceDigest: verified.evidenceDigest },
  ];

  for (const value of cases) {
    assert.deepEqual(
      evaluateBotReplyStagingAttestedReleaseCutoverReadiness(value),
      evidenceRequired,
    );
  }
});

test("rejects proxies and accessors without executing hostile input code", () => {
  let getterCalls = 0;
  const accessor = { ...verified };
  Object.defineProperty(accessor, "status", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "verified";
    },
  });
  const proxy = new Proxy({ ...verified }, {
    ownKeys() {
      throw new Error("proxy trap must not execute");
    },
  });

  assert.deepEqual(
    evaluateBotReplyStagingAttestedReleaseCutoverReadiness(accessor),
    evidenceRequired,
  );
  assert.equal(getterCalls, 0);
  assert.deepEqual(
    evaluateBotReplyStagingAttestedReleaseCutoverReadiness(proxy),
    evidenceRequired,
  );

  const revoked = Proxy.revocable({ ...verified }, {});
  revoked.revoke();
  assert.deepEqual(
    evaluateBotReplyStagingAttestedReleaseCutoverReadiness(revoked.proxy),
    evidenceRequired,
  );
});

test("has no approval seam that a boolean or string can use to open cutover", () => {
  for (const approvalLikeValue of [true, "approved", "four-roles-ready"]) {
    const result = Reflect.apply(
      evaluateBotReplyStagingAttestedReleaseCutoverReadiness,
      null,
      [verified, approvalLikeValue],
    );
    assert.equal(result.code, "CAPABILITY_ROLES_REQUIRED");
    assert.equal(result.activationAllowed, false);
  }
  assert.equal(
    Object.keys(readinessModule).some((key) => /approve|activate/i.test(key)),
    false,
  );
});

test("returns only bounded metadata and never returns evidence payloads or secrets", () => {
  const result =
    evaluateBotReplyStagingAttestedReleaseCutoverReadiness(verified);
  const serialized = JSON.stringify(result);

  assert.deepEqual(Object.keys(result).sort(), [
    "activationAllowed",
    "artifactDigest",
    "code",
    "commitSha",
    "evidenceDigest",
    "evidencePolicyVersion",
    "evidenceSchemaVersion",
    "evidenceStatus",
    "evidenceVersion",
    "expiresAt",
    "readinessVersion",
    "releaseId",
    "replayProtected",
    "requiredCapabilityRoleCount",
    "requiredDecisionId",
    "schemaVersion",
    "status",
    "storageMode",
    "verifiedAt",
  ]);
  assert.doesNotMatch(
    serialized,
    /evidenceJson|receipt|attestation|signature|privateKey|nonce|secret/i,
  );
});
