import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  inspectCurrentProductionReadiness,
} from "../server/operations/productionReadiness.ts";

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

  throw new Error(
    "PRODUCTION_READINESS_ARGUMENTS_INVALID",
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
    const report =
      inspectCurrentProductionReadiness(
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
