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
