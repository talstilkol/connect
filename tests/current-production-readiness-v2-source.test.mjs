import assert from "node:assert/strict";
import test from "node:test";

import {
  currentProductionReadinessV2SourceVersion,
  inspectCurrentProductionReadinessV2Configuration,
  readProductionReadinessV2FromCurrentSource,
} from "../server/operations/currentProductionReadinessV2Source.ts";
import {
  deriveProductionReadinessRegistryV2Digest,
  deriveProductionReadinessV2ReleaseManifestDigest,
} from "../server/operations/productionReadinessV2.ts";
import {
  readCurrentRailwayProductionReadinessV2,
} from "../server/platform/currentRailwayProductionReadinessV2.ts";

const release = Object.freeze({
  environment: "staging",
  releaseId: `connect_release_v1_${"1".repeat(64)}`,
  commitSha: "2".repeat(40),
  serviceArtifactDigests: Object.freeze({
    "railway-api": `sha256:${"3".repeat(64)}`,
    "railway-worker": `sha256:${"4".repeat(64)}`,
    "vercel-web": `sha256:${"5".repeat(64)}`,
  }),
});

function configuredEnvironment() {
  return {
    PRODUCTION_READINESS_V2_SOURCE: "postgresql",
    APP_RUNTIME_ENVIRONMENT: release.environment,
    APP_RELEASE_ID: release.releaseId,
    APP_DEPLOYED_COMMIT_SHA: release.commitSha,
    PRODUCTION_READINESS_V2_RAILWAY_API_ARTIFACT_DIGEST:
      release.serviceArtifactDigests["railway-api"],
    PRODUCTION_READINESS_V2_RAILWAY_WORKER_ARTIFACT_DIGEST:
      release.serviceArtifactDigests["railway-worker"],
    PRODUCTION_READINESS_V2_VERCEL_WEB_ARTIFACT_DIGEST:
      release.serviceArtifactDigests["vercel-web"],
  };
}

const unavailableActive = Object.freeze({
  status: "unavailable",
  activeVersion: null,
  candidateDigest: null,
  report: null,
});

test("derives the configured PostgreSQL identity from the canonical v2 registry", () => {
  const state = inspectCurrentProductionReadinessV2Configuration(
    configuredEnvironment(),
  );

  assert.equal(state.status, "configured");
  assert.equal(state.source, "postgresql");
  assert.deepEqual(state.identity, {
    ...release,
    registryVersion: 2,
    registryDigest: deriveProductionReadinessRegistryV2Digest(),
    releaseManifestDigest:
      deriveProductionReadinessV2ReleaseManifestDigest(release),
  });
});

test("fails closed before repository access when the source is disabled or invalid", async () => {
  for (const [environment, expected] of [
    [{}, {
      code: "PRODUCTION_READINESS_V2_SOURCE_REQUIRED",
      sourceStatus: "disabled",
    }],
    [{
      ...configuredEnvironment(),
      PRODUCTION_READINESS_V2_SOURCE: "POSTGRESQL",
    }, {
      code: "PRODUCTION_READINESS_V2_SOURCE_INVALID",
      sourceStatus: "invalid",
    }],
    [{
      ...configuredEnvironment(),
      PRODUCTION_READINESS_V2_VERCEL_WEB_ARTIFACT_DIGEST: "",
    }, {
      code: "PRODUCTION_READINESS_V2_SOURCE_INVALID",
      sourceStatus: "invalid",
    }],
  ]) {
    let calls = 0;
    const state = await readProductionReadinessV2FromCurrentSource(
      environment,
      {
        async readActive() {
          calls += 1;
          return unavailableActive;
        },
      },
    );
    assert.equal(state.status, "blocked");
    assert.equal(state.code, expected.code);
    assert.equal(state.sourceStatus, expected.sourceStatus);
    assert.equal(state.source, null);
    assert.equal(calls, 0);
  }
});

test("uses the real configured source and keeps absent active evidence blocked", async () => {
  const identities = [];
  const state = await readProductionReadinessV2FromCurrentSource(
    configuredEnvironment(),
    {
      async readActive(identity) {
        identities.push(identity);
        return unavailableActive;
      },
    },
  );

  assert.deepEqual(state, {
    schemaVersion: 2,
    sourceVersion: currentProductionReadinessV2SourceVersion,
    status: "blocked",
    code: "PRODUCTION_READINESS_V2_ACTIVE_EVIDENCE_REQUIRED",
    source: "postgresql",
    sourceStatus: "configured",
    activeVersion: null,
    candidateDigest: null,
    report: null,
  });
  assert.equal(identities.length, 1);
  assert.equal(
    identities[0].releaseManifestDigest,
    deriveProductionReadinessV2ReleaseManifestDigest(release),
  );
});

test("does not label PostgreSQL configured when its pool contract is missing", async () => {
  const state = await readCurrentRailwayProductionReadinessV2(
    configuredEnvironment(),
  );

  assert.equal(state.status, "blocked");
  assert.equal(state.code, "PRODUCTION_READINESS_V2_SOURCE_INVALID");
  assert.equal(state.source, null);
  assert.equal(state.sourceStatus, "invalid");
});

test("does not accept a mismatched active report or repository failure", async () => {
  for (const outcome of [
    new Error("bounded repository failure"),
    {
      status: "available",
      activeVersion: 1,
      candidateDigest:
        `production_readiness_candidate_v2_${"6".repeat(64)}`,
      report: {
        environment: "production",
        releaseId: release.releaseId,
        registryDigest: deriveProductionReadinessRegistryV2Digest(),
        releaseManifestDigest:
          deriveProductionReadinessV2ReleaseManifestDigest(release),
      },
    },
  ]) {
    const state = await readProductionReadinessV2FromCurrentSource(
      configuredEnvironment(),
      {
        async readActive() {
          if (outcome instanceof Error) throw outcome;
          return outcome;
        },
      },
    );
    assert.equal(state.status, "blocked");
    assert.equal(
      state.code,
      "PRODUCTION_READINESS_V2_ACTIVE_EVIDENCE_REQUIRED",
    );
    assert.equal(state.sourceStatus, "configured");
  }
});

test("rejects malformed source dependencies", async () => {
  await assert.rejects(
    readProductionReadinessV2FromCurrentSource({}, {}),
    /dependencies are invalid/,
  );
});
