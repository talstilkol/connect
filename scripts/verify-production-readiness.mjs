import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  inspectCurrentProductionReadiness,
} from "../server/operations/productionReadiness.ts";
import {
  resolveCurrentBotReplyStagingCrossServiceEvidenceJson,
} from "../server/operations/currentProductionReadinessEvidenceSource.ts";
import {
  readCurrentRailwayProductionReadinessV2,
} from "../server/platform/currentRailwayProductionReadinessV2.ts";
import {
  currentProductionReadinessV2SourceVersion,
} from "../server/operations/currentProductionReadinessV2Source.ts";

const hostingUrl = new URL(
  "../.openai/hosting.json",
  import.meta.url,
);
const safeIdPattern =
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const safeCodePattern = /^[A-Z][A-Z0-9_]+$/;
const allowedStatuses = new Set([
  "ready",
  "blocked",
  "decision-required",
]);
const allowedV2Statuses = new Set([
  "ready",
  "blocked",
  "decision-required",
  "unavailable",
  "stale",
]);
const unavailableReleaseEvidenceState = Object.freeze({
  status: "unavailable",
  evidenceJson: null,
  evidenceDigest: null,
  evidenceVersion: null,
});
const cliReleaseEvidenceDependencies = Object.freeze({
  async readReleaseEvidence() {
    // A standalone CLI has no authenticated Clerk request context. It must not
    // substitute a legacy environment value for repository-backed evidence.
    return unavailableReleaseEvidenceState;
  },
});

async function readHostingBindings() {
  try {
    const rawValue = await readFile(hostingUrl, "utf8");
    const parsedValue = JSON.parse(rawValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue)
    ) {
      return {};
    }

    return {
      d1: parsedValue.d1,
      r2: parsedValue.r2,
    };
  } catch {
    return {};
  }
}

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function fail() {
  throw new Error(
    "PRODUCTION_READINESS_REPORT_INVALID",
  );
}

export async function resolveProductionReadinessCliEvidenceJson(
  environment,
) {
  return resolveCurrentBotReplyStagingCrossServiceEvidenceJson(
    environment,
    cliReleaseEvidenceDependencies,
  );
}

export async function readProductionReadinessFromCliSources(
  environment,
  hosting,
) {
  const evidenceJson =
    await resolveProductionReadinessCliEvidenceJson(
      environment,
    );

  return inspectCurrentProductionReadiness(
    {
      ...environment,
      BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON:
        evidenceJson,
    },
    hosting,
  );
}

export function readProductionReadinessCliMode(
  argumentsList,
) {
  if (
    !Array.isArray(argumentsList) ||
    argumentsList.some(
      (value) => typeof value !== "string",
    )
  ) {
    throw new Error(
      "PRODUCTION_READINESS_ARGUMENTS_INVALID",
    );
  }

  if (argumentsList.length === 0) {
    return "human";
  }

  if (
    argumentsList.length === 1 &&
    argumentsList[0] === "--json"
  ) {
    return "json";
  }

  if (
    argumentsList.length === 1 &&
    argumentsList[0] === "--v2"
  ) {
    return "v2-human";
  }

  if (
    argumentsList.length === 2 &&
    argumentsList.includes("--v2") &&
    argumentsList.includes("--json")
  ) {
    return "v2-json";
  }

  throw new Error(
    "PRODUCTION_READINESS_ARGUMENTS_INVALID",
  );
}

export function createProductionReadinessV2SourcePayload(
  state,
) {
  if (
    !isRecord(state) ||
    state.schemaVersion !== 2 ||
    state.sourceVersion !== currentProductionReadinessV2SourceVersion ||
    typeof state.status !== "string" ||
    typeof state.code !== "string" ||
    !safeCodePattern.test(state.code) ||
    !["blocked", "active"].includes(state.status) ||
    !["disabled", "invalid", "configured"].includes(
      state.sourceStatus,
    ) ||
    !(state.source === null || state.source === "postgresql")
  ) {
    fail();
  }

  if (state.status === "blocked") {
    if (
      state.activeVersion !== null ||
      state.candidateDigest !== null ||
      state.report !== null ||
      (state.sourceStatus === "configured") !==
        (state.source === "postgresql")
    ) {
      fail();
    }
    return Object.freeze({
      schemaVersion: 2,
      status: "blocked",
      code: state.code,
      source: state.source,
      sourceStatus: state.sourceStatus,
      activeVersion: null,
      candidateDigest: null,
      counts: null,
      checks: Object.freeze([]),
    });
  }

  if (
    state.source !== "postgresql" ||
    state.sourceStatus !== "configured" ||
    !Number.isSafeInteger(state.activeVersion) ||
    state.activeVersion < 1 ||
    typeof state.candidateDigest !== "string" ||
    !/^production_readiness_candidate_v2_[a-f0-9]{64}$/.test(
      state.candidateDigest,
    ) ||
    !isRecord(state.report) ||
    !Array.isArray(state.report.checks) ||
    !isRecord(state.report.counts) ||
    typeof state.report.readyForProduction !== "boolean"
  ) {
    fail();
  }

  const checks = state.report.checks.map((check) => {
    if (
      !isRecord(check) ||
      typeof check.id !== "string" ||
      !safeIdPattern.test(check.id) ||
      typeof check.status !== "string" ||
      !allowedV2Statuses.has(check.status) ||
      typeof check.code !== "string" ||
      !safeCodePattern.test(check.code)
    ) {
      fail();
    }
    return Object.freeze({
      id: check.id,
      status: check.status,
      code: check.code,
    });
  });
  const counts = Object.freeze({
    ready: checks.filter(({ status }) => status === "ready").length,
    blocked: checks.filter(({ status }) => status === "blocked").length,
    decisionRequired: checks.filter(
      ({ status }) => status === "decision-required",
    ).length,
    unavailable: checks.filter(
      ({ status }) => status === "unavailable",
    ).length,
    stale: checks.filter(({ status }) => status === "stale").length,
  });
  if (
    new Set(checks.map(({ id }) => id)).size !== checks.length ||
    Object.entries(counts).some(
      ([key, count]) => state.report.counts[key] !== count,
    ) ||
    state.report.readyForProduction !==
      (counts.ready === checks.length)
  ) {
    fail();
  }

  return Object.freeze({
    schemaVersion: 2,
    status: state.report.readyForProduction ? "ready" : "blocked",
    code: state.code,
    source: "postgresql",
    sourceStatus: "configured",
    activeVersion: state.activeVersion,
    candidateDigest: state.candidateDigest,
    counts,
    checks: Object.freeze(checks),
  });
}

export function renderProductionReadinessV2SourceHuman(
  state,
) {
  const payload = createProductionReadinessV2SourcePayload(state);
  const source = payload.source === null
    ? "NONE"
    : payload.source.toUpperCase();
  const lines = [
    `Production readiness v2: ${payload.status.toUpperCase()}`,
    `Source: ${source} (${payload.sourceStatus})`,
    `Code: ${payload.code}`,
  ];
  if (payload.counts !== null) {
    lines.push(
      `Checks: ${payload.counts.ready} ready, ` +
        `${payload.counts.blocked} blocked, ` +
        `${payload.counts.decisionRequired} decision-required, ` +
        `${payload.counts.unavailable} unavailable, ` +
        `${payload.counts.stale} stale`,
      ...payload.checks.map(
        (check) =>
          `[${check.status.toUpperCase()}] ${check.id}: ${check.code}`,
      ),
    );
  }
  return lines.join("\n");
}

export function renderProductionReadinessV2SourceJson(
  state,
) {
  return JSON.stringify(
    createProductionReadinessV2SourcePayload(state),
  );
}

export function createProductionReadinessPayload(
  report,
) {
  if (
    !isRecord(report) ||
    typeof report.readyForProduction !==
      "boolean" ||
    !Array.isArray(report.checks) ||
    report.checks.length === 0 ||
    !isRecord(report.counts)
  ) {
    fail();
  }

  const checks = report.checks.map((check) => {
    if (
      !isRecord(check) ||
      typeof check.id !== "string" ||
      !safeIdPattern.test(check.id) ||
      typeof check.code !== "string" ||
      !safeCodePattern.test(check.code) ||
      typeof check.status !== "string" ||
      !allowedStatuses.has(check.status)
    ) {
      fail();
    }

    return Object.freeze({
      id: check.id,
      status: check.status,
      code: check.code,
    });
  });
  const uniqueIds = new Set(
    checks.map(({ id }) => id),
  );
  const counts = {
    ready: checks.filter(
      ({ status }) => status === "ready",
    ).length,
    blocked: checks.filter(
      ({ status }) => status === "blocked",
    ).length,
    decisionRequired: checks.filter(
      ({ status }) =>
        status === "decision-required",
    ).length,
  };

  if (
    uniqueIds.size !== checks.length ||
    !Number.isSafeInteger(
      report.counts.ready,
    ) ||
    !Number.isSafeInteger(
      report.counts.blocked,
    ) ||
    !Number.isSafeInteger(
      report.counts.decisionRequired,
    ) ||
    report.counts.ready !== counts.ready ||
    report.counts.blocked !== counts.blocked ||
    report.counts.decisionRequired !==
      counts.decisionRequired ||
    report.readyForProduction !==
      (counts.ready === checks.length)
  ) {
    fail();
  }

  return Object.freeze({
    schemaVersion: 1,
    status: report.readyForProduction
      ? "ready"
      : "blocked",
    counts: Object.freeze(counts),
    checks: Object.freeze(checks),
  });
}

export function renderProductionReadinessHuman(
  report,
) {
  const payload =
    createProductionReadinessPayload(report);
  const lines = [
    `Production readiness: ${payload.status.toUpperCase()}`,
    `Checks: ${payload.counts.ready} ready, ` +
      `${payload.counts.blocked} blocked, ` +
      `${payload.counts.decisionRequired} decision-required`,
    ...payload.checks.map(
      (check) =>
        `[${check.status.toUpperCase()}] ${check.id}: ${check.code}`,
    ),
  ];

  return lines.join("\n");
}

export function renderProductionReadinessJson(
  report,
) {
  return JSON.stringify(
    createProductionReadinessPayload(report),
  );
}

async function runCli() {
  let mode;

  try {
    mode = readProductionReadinessCliMode(
      process.argv.slice(2),
    );
  } catch {
    console.error(
      "Production readiness: INVALID_ARGUMENTS",
    );
    process.exitCode = 1;
    return;
  }

  try {
    if (mode === "v2-human" || mode === "v2-json") {
      const state =
        await readCurrentRailwayProductionReadinessV2(
          process.env,
        );
      console.log(
        mode === "v2-json"
          ? renderProductionReadinessV2SourceJson(state)
          : renderProductionReadinessV2SourceHuman(state),
      );
      if (
        state.status !== "active" ||
        !state.report.readyForProduction
      ) {
        process.exitCode = 1;
      }
      return;
    }

    const report =
      await readProductionReadinessFromCliSources(
        process.env,
        await readHostingBindings(),
      );

    console.log(
      mode === "json"
        ? renderProductionReadinessJson(
            report,
          )
        : renderProductionReadinessHuman(
            report,
          ),
    );

    if (!report.readyForProduction) {
      process.exitCode = 1;
    }
  } catch {
    console.error(
      "Production readiness: FAIL (PRODUCTION_READINESS_REPORT_INVALID)",
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(`file://${process.argv[1]}`),
    )
) {
  await runCli();
}
