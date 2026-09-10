import assert from "node:assert/strict";
import test from "node:test";

import {
  createProductionReadinessV2SourcePayload,
  readProductionReadinessCliMode,
  renderProductionReadinessV2SourceHuman,
  renderProductionReadinessV2SourceJson,
} from "../scripts/verify-production-readiness.mjs";
import {
  currentProductionReadinessV2SourceVersion,
  readProductionReadinessV2FromCurrentSource,
} from "../server/operations/currentProductionReadinessV2Source.ts";
import {
  PRODUCTION_READINESS_REGISTRY_V2,
} from "../shared/domain/productionReadinessRegistryV2.ts";

// Contract inputs for the serializer only; these are never release evidence.
function activeSerializerInput(environment) {
  const checks = PRODUCTION_READINESS_REGISTRY_V2.map((definition) => ({
    id: definition.id,
    status: "ready",
    code: definition.codes.ready,
  }));
  return {
    schemaVersion: 2,
    sourceVersion: currentProductionReadinessV2SourceVersion,
    status: "active",
    code: "PRODUCTION_READINESS_V2_ACTIVE_EVIDENCE_VERIFIED",
    source: "postgresql",
    sourceStatus: "configured",
    activeVersion: 1,
    candidateDigest: `production_readiness_candidate_v2_${"7".repeat(64)}`,
    report: {
      environment,
      readyForEnvironment: true,
      readyForProduction: environment === "production",
      checks,
      counts: {
        ready: checks.length,
        blocked: 0,
        decisionRequired: 0,
        unavailable: 0,
        stale: 0,
      },
    },
  };
}

test("accepts complete staging readiness without granting production readiness", () => {
  for (const environment of ["development", "preview", "staging"]) {
    const state = activeSerializerInput(environment);
    const payload = createProductionReadinessV2SourcePayload(state);
    assert.equal(payload.status, "blocked");
    assert.equal(payload.counts.ready, PRODUCTION_READINESS_REGISTRY_V2.length);
    assert.match(renderProductionReadinessV2SourceHuman(state), /BLOCKED/);
    assert.deepEqual(JSON.parse(renderProductionReadinessV2SourceJson(state)), payload);
  }
  assert.equal(
    createProductionReadinessV2SourcePayload(activeSerializerInput("production")).status,
    "ready",
  );
});

test("rejects empty, incomplete, duplicate and unknown infrastructure checks", () => {
  for (const mutate of [
    (checks) => checks.splice(0),
    (checks) => checks.pop(),
    (checks) => { checks[1] = checks[0]; },
    (checks) => { checks[0] = { ...checks[0], id: "storage.d1-binding" }; },
  ]) {
    const state = activeSerializerInput("production");
    mutate(state.report.checks);
    state.report.counts.ready = state.report.checks.length;
    assert.throws(
      () => createProductionReadinessV2SourcePayload(state),
      /PRODUCTION_READINESS_REPORT_INVALID/,
    );
  }
});

test("rejects mismatched environment, readiness flags and counts", () => {
  for (const mutate of [
    (report) => { report.environment = "PRODUCTION"; },
    (report) => { report.environment = "staging"; },
    (report) => { report.readyForEnvironment = false; },
    (report) => { report.readyForProduction = false; },
    (report) => { report.counts.ready -= 1; },
  ]) {
    const state = activeSerializerInput("production");
    mutate(state.report);
    assert.throws(
      () => createProductionReadinessV2SourcePayload(state),
      /PRODUCTION_READINESS_REPORT_INVALID/,
    );
  }
});

const configuredEnvironment = Object.freeze({
  PRODUCTION_READINESS_V2_SOURCE: "postgresql",
  APP_RUNTIME_ENVIRONMENT: "staging",
  APP_RELEASE_ID: `connect_release_v1_${"7".repeat(64)}`,
  APP_DEPLOYED_COMMIT_SHA: "8".repeat(40),
  PRODUCTION_READINESS_V2_RAILWAY_API_ARTIFACT_DIGEST:
    `sha256:${"9".repeat(64)}`,
  PRODUCTION_READINESS_V2_RAILWAY_WORKER_ARTIFACT_DIGEST:
    `sha256:${"a".repeat(64)}`,
  PRODUCTION_READINESS_V2_VERCEL_WEB_ARTIFACT_DIGEST:
    `sha256:${"b".repeat(64)}`,
});

test("adds explicit v2 CLI modes without changing the v1 defaults", () => {
  assert.equal(readProductionReadinessCliMode([]), "human");
  assert.equal(readProductionReadinessCliMode(["--json"]), "json");
  assert.equal(readProductionReadinessCliMode(["--v2"]), "v2-human");
  assert.equal(
    readProductionReadinessCliMode(["--v2", "--json"]),
    "v2-json",
  );
  assert.equal(
    readProductionReadinessCliMode(["--json", "--v2"]),
    "v2-json",
  );
});

test("reports a configured PostgreSQL source even when active evidence is blocked", async () => {
  const state = await readProductionReadinessV2FromCurrentSource(
    configuredEnvironment,
    {
      async readActive() {
        return {
          status: "unavailable",
          activeVersion: null,
          candidateDigest: null,
          report: null,
        };
      },
    },
  );
  const payload = createProductionReadinessV2SourcePayload(state);
  const human = renderProductionReadinessV2SourceHuman(state);
  const json = renderProductionReadinessV2SourceJson(state);

  assert.deepEqual(payload, {
    schemaVersion: 2,
    status: "blocked",
    code: "PRODUCTION_READINESS_V2_ACTIVE_EVIDENCE_REQUIRED",
    source: "postgresql",
    sourceStatus: "configured",
    activeVersion: null,
    candidateDigest: null,
    counts: null,
    checks: [],
  });
  assert.match(human, /^Production readiness v2: BLOCKED/m);
  assert.match(human, /^Source: POSTGRESQL \(configured\)$/m);
  assert.doesNotMatch(human, /DATABASE_URL|sha256:|connect_release_v1_/);
  assert.deepEqual(JSON.parse(json), payload);
});

test("projects v2 CLI states without leaking extra source fields", () => {
  const payload = createProductionReadinessV2SourcePayload({
      schemaVersion: 2,
      sourceVersion: currentProductionReadinessV2SourceVersion,
      status: "blocked",
      code: "INVALID",
      source: "postgresql",
      sourceStatus: "configured",
      activeVersion: null,
      candidateDigest: null,
      report: null,
      DATABASE_URL: "must-not-appear",
    });

  assert.equal(payload.source, "postgresql");
  assert.doesNotMatch(JSON.stringify(payload), /DATABASE_URL|must-not-appear/);
});
