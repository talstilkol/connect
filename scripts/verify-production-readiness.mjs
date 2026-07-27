import { readFile } from "node:fs/promises";

import {
  inspectCurrentProductionReadiness,
} from "../server/operations/productionReadiness.ts";

const hostingUrl = new URL(
  "../.openai/hosting.json",
  import.meta.url,
);

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

const report = inspectCurrentProductionReadiness(
  process.env,
  await readHostingBindings(),
);

console.log(
  `Production readiness: ${
    report.readyForProduction ? "READY" : "BLOCKED"
  }`,
);
console.log(
  `Checks: ${report.counts.ready} ready, ` +
    `${report.counts.blocked} blocked, ` +
    `${report.counts.decisionRequired} decision-required`,
);

for (const check of report.checks) {
  console.log(
    `[${check.status.toUpperCase()}] ${check.id}: ${check.code}`,
  );
}

if (!report.readyForProduction) {
  process.exitCode = 1;
}
