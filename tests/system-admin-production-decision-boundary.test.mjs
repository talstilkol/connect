import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const actionsUrl = new URL(
  "../server/operations/systemAdminProductionDecisionActions.ts",
  import.meta.url,
);
const readUrl = new URL(
  "../server/operations/currentSystemAdminProductionDecisions.ts",
  import.meta.url,
);
const currentHandlerUrl = new URL(
  "../server/operations/currentRailwaySystemAdminProductionDecisionHandler.ts",
  import.meta.url,
);
const railwayHandlerUrl = new URL(
  "../server/operations/railwaySystemAdminProductionDecisionHandler.ts",
  import.meta.url,
);
const panelUrl = new URL(
  "../features/admin/SystemAdminDecisionPanel.tsx",
  import.meta.url,
);

test("routes production decision reads and writes through one Railway server boundary", async () => {
  const [actions, read, currentHandler, railwayHandler, panel] =
    await Promise.all([
      readFile(actionsUrl, "utf8"),
      readFile(readUrl, "utf8"),
      readFile(currentHandlerUrl, "utf8"),
      readFile(railwayHandlerUrl, "utf8"),
      readFile(panelUrl, "utf8"),
    ]);
  const activeBoundaries = `${actions}\n${read}`;

  assert.match(
    activeBoundaries,
    /createCurrentRailwaySystemAdminProductionDecisionHandler/,
  );
  assert.doesNotMatch(
    activeBoundaries,
    /requireRuntimeDatabase|createProductionDecisionRepository|requireCurrentSystemAdminSession|requireCurrentSystemAdminMutationSession/,
  );
  assert.match(currentHandler, /resolveCurrentRailwayApiServerIdentity/);
  assert.match(currentHandler, /createRailwayApiClient/);
  assert.match(currentHandler, /inspectRailwayApiClientConfiguration/);
  assert.match(
    railwayHandler,
    /system-admin\.production-decisions\.list/,
  );
  assert.match(
    railwayHandler,
    /system-admin\.production-decisions\.save/,
  );
  assert.doesNotMatch(
    railwayHandler,
    /actorExternalUserId|occurredAt|lastEventKey|requireRuntimeDatabase/,
  );
  assert.match(panel, /saveSystemAdminProductionDecisionAction/);
});
