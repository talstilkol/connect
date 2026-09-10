import assert from "node:assert/strict";
import test from "node:test";

import {
  redisDurabilityAcceptanceMinimumLoadJobs,
  redisDurabilityAcceptancePolicyVersion,
  verifyRedisDurabilityAcceptanceEvidence,
} from "../shared/domain/redisDurabilityAcceptance.ts";

const verifiedAt = "2026-08-21T14:00:00.000Z";
const expiresAt = "2026-08-22T14:00:00.000Z";
const checkedAt = "2026-08-21T14:30:00.000Z";
const commitSha = "a".repeat(40);
const artifactDigest = `sha256:${"b".repeat(64)}`;

function verify(
  input,
  at = checkedAt,
  expectedCommitSha = commitSha,
  expectedArtifactDigest = artifactDigest,
) {
  return verifyRedisDurabilityAcceptanceEvidence(
    input,
    at,
    expectedCommitSha,
    expectedArtifactDigest,
  );
}

function evidence(overrides = {}) {
  return {
    schemaVersion: 1,
    policyVersion: redisDurabilityAcceptancePolicyVersion,
    environment: "staging",
    provider: "railway",
    commitSha,
    artifactDigest,
    verifiedAt,
    expiresAt,
    redisVersion: "8.6.1",
    appendOnly: true,
    appendFsync: "everysec",
    maxmemoryPolicy: "noeviction",
    aofWriteStatus: "ok",
    aofRewriteStatus: "ok",
    persistenceRestartTest: "passed",
    publisherOutageFailureTest: "passed",
    queuedWorkRecoveryTest: "passed",
    loadTest: {
      jobCount: redisDurabilityAcceptanceMinimumLoadJobs,
      completedCount: redisDurabilityAcceptanceMinimumLoadJobs,
      failedCount: 0,
      durationMilliseconds: 2_500,
    },
    ...overrides,
  };
}

test("accepts one complete short-lived Railway Redis durability proof", () => {
  assert.deepEqual(
    verify(evidence()),
    {
      outcome: "accepted",
      commitSha,
      artifactDigest,
      verifiedAt,
      expiresAt,
      loadJobCount: redisDurabilityAcceptanceMinimumLoadJobs,
    },
  );
});

test("requires AOF every second, noeviction and healthy persistence", () => {
  for (const mutation of [
    { appendOnly: false },
    { appendFsync: "always" },
    { appendFsync: "no" },
    { maxmemoryPolicy: "allkeys-lru" },
    { aofWriteStatus: "err" },
    { aofRewriteStatus: "err" },
  ]) {
    assert.deepEqual(
      verify(evidence(mutation)),
      { outcome: "rejected" },
    );
  }
});

test("requires restart, outage, queued recovery and lossless bounded load", () => {
  for (const mutation of [
    { persistenceRestartTest: "failed" },
    { publisherOutageFailureTest: "failed" },
    { queuedWorkRecoveryTest: "failed" },
    {
      loadTest: {
        jobCount: redisDurabilityAcceptanceMinimumLoadJobs,
        completedCount: redisDurabilityAcceptanceMinimumLoadJobs - 1,
        failedCount: 1,
        durationMilliseconds: 2_500,
      },
    },
    {
      loadTest: {
        jobCount: redisDurabilityAcceptanceMinimumLoadJobs - 1,
        completedCount: redisDurabilityAcceptanceMinimumLoadJobs - 1,
        failedCount: 0,
        durationMilliseconds: 2_500,
      },
    },
  ]) {
    assert.deepEqual(
      verify(evidence(mutation)),
      { outcome: "rejected" },
    );
  }
});

test("rejects mismatched, extended and identity-bearing evidence", () => {
  for (const input of [
    evidence({ expiresAt: "2026-08-22T14:00:00.001Z" }),
    evidence({ expiresAt: verifiedAt }),
    evidence({ environment: "production" }),
    evidence({ provider: "other" }),
    evidence({ commitSha: "a".repeat(39) }),
    evidence({ artifactDigest: `sha256:${"B".repeat(64)}` }),
    evidence({ redisVersion: "unknown" }),
    evidence({ redisUrl: "must-not-be-retained" }),
  ]) {
    assert.deepEqual(
      verify(input),
      { outcome: "rejected" },
    );
  }
});

test("rejects stale, not-yet-valid and invalid evaluation timestamps", () => {
  for (const at of [
    "2026-08-21T13:59:59.999Z",
    expiresAt,
    "2026-08-22T14:00:00.001Z",
    "invalid",
  ]) {
    assert.deepEqual(verify(evidence(), at), { outcome: "rejected" });
  }
});

test("binds acceptance to the expected current release identities", () => {
  assert.deepEqual(
    verify(evidence(), checkedAt, "c".repeat(40)),
    { outcome: "rejected" },
  );
  assert.deepEqual(
    verify(
      evidence(),
      checkedAt,
      commitSha,
      `sha256:${"d".repeat(64)}`,
    ),
    { outcome: "rejected" },
  );
  assert.deepEqual(
    verify(evidence(), checkedAt, "invalid", artifactDigest),
    { outcome: "rejected" },
  );
});

test("requires the caller to provide an explicit evaluation timestamp", () => {
  assert.deepEqual(
    verifyRedisDurabilityAcceptanceEvidence(
      evidence(),
      undefined,
      commitSha,
      artifactDigest,
    ),
    { outcome: "rejected" },
  );
});

test("rejects accessors and exotic records without invoking getters", () => {
  let getterCalls = 0;
  const topLevelAccessor = evidence();
  Object.defineProperty(topLevelAccessor, "provider", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "railway";
    },
  });
  const nestedAccessor = evidence();
  Object.defineProperty(nestedAccessor.loadTest, "jobCount", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return redisDurabilityAcceptanceMinimumLoadJobs;
    },
  });
  const symbolBearing = evidence();
  symbolBearing[Symbol("credential")] = "must-not-be-read";
  const nonEnumerable = evidence();
  Object.defineProperty(nonEnumerable, "provider", {
    enumerable: false,
    value: "railway",
  });
  const inherited = evidence();
  delete inherited.provider;
  Object.setPrototypeOf(inherited, { provider: "railway" });

  for (const input of [
    topLevelAccessor,
    nestedAccessor,
    symbolBearing,
    nonEnumerable,
    inherited,
  ]) {
    assert.deepEqual(verify(input), { outcome: "rejected" });
  }
  assert.equal(getterCalls, 0);
});

test("fails closed for hostile and revoked proxies", () => {
  const ownKeysTrap = new Proxy(evidence(), {
    ownKeys() {
      throw new Error("must-not-escape");
    },
  });
  const descriptorTrap = new Proxy(evidence(), {
    getOwnPropertyDescriptor() {
      throw new Error("must-not-escape");
    },
  });
  const revokedObject = Proxy.revocable(evidence(), {});
  revokedObject.revoke();
  const revokedArray = Proxy.revocable([], {});
  revokedArray.revoke();

  for (const input of [
    ownKeysTrap,
    descriptorTrap,
    revokedObject.proxy,
    revokedArray.proxy,
  ]) {
    assert.doesNotThrow(() => verify(input));
    assert.deepEqual(verify(input), { outcome: "rejected" });
  }
});

test("rejects accessors even when Object.prototype is polluted", () => {
  let getterCalls = 0;
  const input = evidence();
  Object.defineProperty(input, "artifactDigest", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "must-not-be-read";
    },
  });
  const previousDescriptor = Object.getOwnPropertyDescriptor(
    Object.prototype,
    "value",
  );

  try {
    Object.defineProperty(Object.prototype, "value", {
      configurable: true,
      value: artifactDigest,
    });
    assert.deepEqual(verify(input), { outcome: "rejected" });
    assert.equal(getterCalls, 0);
  } finally {
    if (previousDescriptor === undefined) {
      delete Object.prototype.value;
    } else {
      Object.defineProperty(
        Object.prototype,
        "value",
        previousDescriptor,
      );
    }
  }
});

test("does not expose provider or Redis resource identity in acceptance", () => {
  const result = verify(evidence());
  assert.doesNotMatch(
    JSON.stringify(result),
    /provider|redisVersion|resource|account|connection|url/i,
  );
});
