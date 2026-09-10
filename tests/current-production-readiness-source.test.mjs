import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCurrentBotReplyStagingCrossServiceEvidenceJson,
} from "../server/operations/currentProductionReadinessEvidenceSource.ts";
import {
  railwayBotReplyStagingCrossServiceActivationVersion,
  railwayBotReplyStagingCrossServiceCheckIds,
} from "../server/platform/railwayBotReplyStagingCrossServiceActivation.ts";
import {
  createRailwayBotReplyStagingCrossServiceEvidence,
} from "../server/platform/railwayBotReplyStagingCrossServiceEvidence.ts";

function createEvidenceJson(identityCharacter) {
  return JSON.stringify(
    createRailwayBotReplyStagingCrossServiceEvidence({
      report: {
        schemaVersion: 1,
        activationVersion:
          railwayBotReplyStagingCrossServiceActivationVersion,
        status: "ready",
        code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED",
        passedCheckCount: 4,
        requiredCheckCount: 4,
        checks: railwayBotReplyStagingCrossServiceCheckIds.map((id) => ({
          id,
          status: "passed",
        })),
      },
      releaseId: `connect_release_v1_${identityCharacter.repeat(64)}`,
      commitSha: identityCharacter.repeat(40),
      artifactDigest: `sha256:${identityCharacter.repeat(64)}`,
      lifetimeSeconds: 600,
    }, {
      now: () => new Date("2026-08-24T12:00:00.000Z"),
    }),
  );
}

const legacyEvidenceJson = createEvidenceJson("a");
const repositoryEvidenceJson = createEvidenceJson("b");

function readyState() {
  return {
    status: "ready",
    evidenceJson: repositoryEvidenceJson,
    evidenceDigest: JSON.parse(repositoryEvidenceJson).evidenceDigest,
    evidenceVersion: 1,
  };
}

function dependencies(result, calls) {
  return {
    async readReleaseEvidence() {
      calls.push("repository.read");
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

test("rejects legacy environment evidence while repository storage is disabled", async () => {
  const calls = [];
  const resolved =
    await resolveCurrentBotReplyStagingCrossServiceEvidenceJson(
      {
        BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON:
          legacyEvidenceJson,
      },
      dependencies(readyState(), calls),
    );

  assert.equal(resolved, undefined);
  assert.deepEqual(calls, []);
});

test("uses Railway PostgreSQL evidence instead of the legacy value", async () => {
  const calls = [];
  const resolved =
    await resolveCurrentBotReplyStagingCrossServiceEvidenceJson(
      {
        BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
        BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON:
          legacyEvidenceJson,
      },
      dependencies(readyState(), calls),
    );

  assert.equal(resolved, repositoryEvidenceJson);
  assert.deepEqual(calls, ["repository.read"]);
});

test("does not fall back when PostgreSQL is unavailable or storage is invalid", async () => {
  for (const result of [
    {
      status: "unavailable",
      evidenceJson: null,
      evidenceDigest: null,
      evidenceVersion: null,
    },
    new Error("bounded provider failure"),
  ]) {
    const calls = [];
    assert.equal(
      await resolveCurrentBotReplyStagingCrossServiceEvidenceJson(
        {
          BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "postgresql",
          BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON:
            legacyEvidenceJson,
        },
        dependencies(result, calls),
      ),
      undefined,
    );
    assert.deepEqual(calls, ["repository.read"]);
  }

  const invalidCalls = [];
  assert.equal(
    await resolveCurrentBotReplyStagingCrossServiceEvidenceJson(
      {
        BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE: "POSTGRESQL",
        BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON:
          legacyEvidenceJson,
      },
      dependencies(readyState(), invalidCalls),
    ),
    undefined,
  );
  assert.deepEqual(invalidCalls, []);
});

test("rejects malformed readiness source dependencies", async () => {
  await assert.rejects(
    resolveCurrentBotReplyStagingCrossServiceEvidenceJson({}, {}),
    /dependencies are invalid/,
  );
});
