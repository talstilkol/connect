import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const actionsUrl = new URL(
  "../server/reports/operationalReportActions.ts",
  import.meta.url,
);
const readUrl = new URL(
  "../server/reports/currentOperationalReport.ts",
  import.meta.url,
);
const currentHandlerUrl = new URL(
  "../server/reports/currentRailwayOperationalReportHandler.ts",
  import.meta.url,
);
const railwayHandlerUrl = new URL(
  "../server/reports/railwayOperationalReportHandler.ts",
  import.meta.url,
);
const operationRegistryUrl = new URL(
  "../server/platform/railwayApiOperationRegistry.ts",
  import.meta.url,
);

test("routes initial and interactive operational reports through Railway", async () => {
  const [actions, read, currentHandler, railwayHandler, registry] =
    await Promise.all([
      readFile(actionsUrl, "utf8"),
      readFile(readUrl, "utf8"),
      readFile(currentHandlerUrl, "utf8"),
      readFile(railwayHandlerUrl, "utf8"),
      readFile(operationRegistryUrl, "utf8"),
    ]);
  const activeBoundaries = `${actions}\n${read}`;

  assert.match(
    activeBoundaries,
    /createCurrentRailwayOperationalReportHandler/,
  );
  assert.doesNotMatch(
    activeBoundaries,
    /requireRuntimeDatabase|createOperationalReportRepository|requireCurrentTenantSession/,
  );
  assert.match(currentHandler, /resolveCurrentRailwayApiServerIdentity/);
  assert.match(currentHandler, /createRailwayApiClient/);
  assert.match(currentHandler, /inspectRailwayApiClientConfiguration/);
  assert.match(railwayHandler, /reports\.read/);
  assert.doesNotMatch(
    railwayHandler,
    /tenantId|externalUserId|requireRuntimeDatabase/,
  );
  assert.match(registry, /toOperationalReportView/);
});
