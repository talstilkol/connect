import assert from "node:assert/strict";
import test from "node:test";

import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  createRailwayBotReplyStagingCrossServiceEvidence,
} from "../server/platform/railwayBotReplyStagingCrossServiceEvidence.ts";
import {
  createPostgresBotReplyStagingReleaseEvidenceRepository,
  postgresBotReplyStagingReleaseEvidenceRepositoryVersion,
  postgresBotReplyStagingReleaseEvidenceSql,
} from "../server/platform/postgresBotReplyStagingReleaseEvidenceRepository.ts";

const release = Object.freeze({
  releaseId: `connect_release_v1_${"a".repeat(64)}`,
  commitSha: "b".repeat(40),
  artifactDigest: `sha256:${"c".repeat(64)}`,
});
const initializedAt = "2026-08-24T14:59:00.000Z";
const verifiedAt = "2026-08-24T15:00:00.000Z";
const clock = Object.freeze({
  now: () => new Date(verifiedAt),
});

function readyReport() {
  return {
    schemaVersion: 1,
    activationVersion: railwayBotReplyStagingCrossServiceActivationVersion,
    status: "ready",
    code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED",
    passedCheckCount: 4,
    requiredCheckCount: 4,
    checks: railwayBotReplyStagingCrossServiceCheckIds.map((id) => ({
      id,
      status: "passed",
    })),
  };
}

function evidence() {
  return createRailwayBotReplyStagingCrossServiceEvidence({
    report: readyReport(),
    releaseId: release.releaseId,
    commitSha: release.commitSha,
    artifactDigest: release.artifactDigest,
    lifetimeSeconds: 600,
  }, clock);
}

function state(overrides = {}) {
  return {
    releaseId: release.releaseId,
    commitSha: release.commitSha,
    artifactDigest: release.artifactDigest,
    version: 0,
    evidenceDigest: null,
    evidenceJson: null,
    ...overrides,
  };
}

function result(rows) {
  return { rows, rowCount: rows.length };
}

function write(overrides = {}) {
  const value = evidence();
  return {
    expectedRelease: release,
    expectedVersion: 0,
    expectedEvidenceDigest: null,
    nextEvidenceDigest: value.evidenceDigest,
    nextEvidenceJson: JSON.stringify(value),
    ...overrides,
  };
}

function sequentialFixture(results) {
  const calls = [];
  const remaining = [...results];
  const transactions = {
    async transaction(options, execute) {
      calls.push({ kind: "transaction", options });
      return execute({
        async query(sql, parameters) {
          calls.push({ kind: "query", sql, parameters });
          if (remaining.length === 0) throw new Error("unexpected query");
          return remaining.shift();
        },
      });
    },
  };
  return {
    repository: createPostgresBotReplyStagingReleaseEvidenceRepository(
      transactions,
      release,
      clock,
    ),
    calls,
    remaining,
  };
}

test("initializes one immutable release identity and reads version zero", async () => {
  const fixture = sequentialFixture([
    result([state()]),
    result([state()]),
  ]);
  const initialized = await fixture.repository.initialize(initializedAt);

  assert.deepEqual(initialized, {
    release,
    version: 0,
    evidenceDigest: null,
    evidenceJson: null,
  });
  assert.equal(fixture.calls[1].sql, postgresBotReplyStagingReleaseEvidenceSql.initialize);
  assert.deepEqual(fixture.calls[1].parameters, [
    release.releaseId,
    release.commitSha,
    release.artifactDigest,
    initializedAt,
  ]);
  assert.equal(fixture.calls[3].sql, postgresBotReplyStagingReleaseEvidenceSql.read);
  assert.equal(fixture.remaining.length, 0);
});

test("fails closed when the bound release was not initialized", async () => {
  const fixture = sequentialFixture([result([])]);
  await assert.rejects(
    fixture.repository.readCurrentEvidenceState(),
    /not initialized/,
  );
});

test("exposes a synthetic version zero only for the atomic initializer", async () => {
  const fixture = sequentialFixture([result([])]);
  const initial =
    await fixture.repository.readCurrentEvidenceStateOrInitial();

  assert.deepEqual(initial, {
    release,
    version: 0,
    evidenceDigest: null,
    evidenceJson: null,
  });
  assert.equal(
    fixture.calls[1].sql,
    postgresBotReplyStagingReleaseEvidenceSql.read,
  );
});

test("stores byte-exact evidence with one conditional update", async () => {
  const fixture = sequentialFixture([result([{ version: 1 }])]);
  const input = write();
  const stored = await fixture.repository.compareAndSetEvidence(input);

  assert.deepEqual(stored, { status: "stored", version: 1 });
  assert.equal(fixture.calls[1].sql, postgresBotReplyStagingReleaseEvidenceSql.compareAndSet);
  assert.deepEqual(fixture.calls[1].parameters, [
    release.releaseId,
    release.commitSha,
    release.artifactDigest,
    0,
    null,
    input.nextEvidenceDigest,
    input.nextEvidenceJson,
    verifiedAt,
    "2026-08-24T15:10:00.000Z",
  ]);
  assert.match(fixture.calls[1].sql, /evidence_version = \$4/);
  assert.match(fixture.calls[1].sql, /evidence_digest IS NOT DISTINCT FROM \$5/);
  assert.match(fixture.calls[1].sql, /RETURNING evidence_version AS "version"/);
});

test("returns a bounded conflict when the database CAS matches no row", async () => {
  const fixture = sequentialFixture([result([])]);
  assert.deepEqual(await fixture.repository.compareAndSetEvidence(write()), {
    status: "conflict",
    version: null,
  });
});

test("allows exactly one winner for two concurrent writes", async () => {
  let persisted = state();
  const calls = [];
  const transactions = {
    async transaction(options, execute) {
      calls.push(options);
      return execute({
        async query(sql, parameters) {
          assert.equal(sql, postgresBotReplyStagingReleaseEvidenceSql.compareAndSet);
          if (
            persisted.releaseId !== parameters[0] ||
            persisted.commitSha !== parameters[1] ||
            persisted.artifactDigest !== parameters[2] ||
            persisted.version !== parameters[3] ||
            persisted.evidenceDigest !== parameters[4]
          ) {
            return result([]);
          }
          persisted = state({
            version: persisted.version + 1,
            evidenceDigest: parameters[5],
            evidenceJson: parameters[6],
          });
          return result([{ version: persisted.version }]);
        },
      });
    },
  };
  const repository = createPostgresBotReplyStagingReleaseEvidenceRepository(
    transactions,
    release,
    clock,
  );
  const outcomes = await Promise.all([
    repository.compareAndSetEvidence(write()),
    repository.compareAndSetEvidence(write()),
  ]);

  assert.deepEqual(
    outcomes.map(({ status }) => status).sort(),
    ["conflict", "stored"],
  );
  assert.equal(persisted.version, 1);
  assert.equal(calls.length, 2);
});

test("rejects tampering, release drift and invalid persistence results", async () => {
  const noQueries = {
    async transaction(_options, execute) {
      return execute({
        async query() {
          throw new Error("query must not run");
        },
      });
    },
  };
  const repository = createPostgresBotReplyStagingReleaseEvidenceRepository(
    noQueries,
    release,
    clock,
  );
  const valid = write();
  await assert.rejects(
    repository.compareAndSetEvidence({
      ...valid,
      nextEvidenceDigest:
        `bot_reply_staging_cross_service_evidence_v1_${"d".repeat(64)}`,
    }),
    /write is invalid/,
  );
  await assert.rejects(
    repository.compareAndSetEvidence({
      ...valid,
      expectedRelease: { ...release, commitSha: "d".repeat(40) },
    }),
    /write is invalid/,
  );

  const invalidResult = sequentialFixture([result([{ version: 2 }])]);
  await assert.rejects(
    invalidResult.repository.compareAndSetEvidence(valid),
    /invalid evidence version/,
  );
});

test("exports a frozen deterministic SQL and repository contract", () => {
  const fixture = sequentialFixture([]);
  assert.equal(
    postgresBotReplyStagingReleaseEvidenceRepositoryVersion,
    "connect-postgres-bot-reply-staging-release-evidence-repository-v1",
  );
  assert.equal(Object.isFrozen(postgresBotReplyStagingReleaseEvidenceSql), true);
  assert.equal(Object.isFrozen(fixture.repository), true);
  assert.equal(fixture.repository.clock, clock);
  assert.doesNotMatch(
    JSON.stringify(postgresBotReplyStagingReleaseEvidenceSql),
    /random|uuid/i,
  );
});
