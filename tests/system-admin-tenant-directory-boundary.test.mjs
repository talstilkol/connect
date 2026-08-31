import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const actionsUrl = new URL(
  "../server/admin/systemAdminTenantDirectoryActions.ts",
  import.meta.url,
);
const readUrl = new URL(
  "../server/admin/currentSystemAdminTenantDirectory.ts",
  import.meta.url,
);
const currentHandlerUrl = new URL(
  "../server/admin/currentRailwaySystemAdminTenantDirectoryHandler.ts",
  import.meta.url,
);
const railwayHandlerUrl = new URL(
  "../server/admin/railwaySystemAdminTenantDirectoryHandler.ts",
  import.meta.url,
);
const operationUrl = new URL(
  "../server/platform/railwaySystemAdminTenantDirectoryOperation.ts",
  import.meta.url,
);

test("routes tenant directory reads through one Railway server boundary", async () => {
  const [actions, read, currentHandler, railwayHandler, operation] =
    await Promise.all([
      readFile(actionsUrl, "utf8"),
      readFile(readUrl, "utf8"),
      readFile(currentHandlerUrl, "utf8"),
      readFile(railwayHandlerUrl, "utf8"),
      readFile(operationUrl, "utf8"),
    ]);
  const activeBoundaries = `${actions}\n${read}`;

  assert.match(
    activeBoundaries,
    /createCurrentRailwaySystemAdminTenantDirectoryHandler/,
  );
  assert.doesNotMatch(
    activeBoundaries,
    /requireRuntimeDatabase|createSystemAdminTenantDirectoryRepository|requireCurrentSystemAdminSession|requireCurrentSystemAdminMutationSession/,
  );
  assert.match(currentHandler, /resolveCurrentRailwayApiServerIdentity/);
  assert.match(currentHandler, /createRailwayApiClient/);
  assert.match(currentHandler, /inspectRailwayApiClientConfiguration/);
  assert.match(
    railwayHandler,
    /system-admin\.tenant-directory\.list/,
  );
  assert.doesNotMatch(
    railwayHandler,
    /requireRuntimeDatabase|actorExternalUserId|externalUserId/,
  );
  assert.match(operation, /targetTenantId: tenant\.tenantId/);
  assert.doesNotMatch(operation, /mutationRateLimit|requireRuntimeDatabase/);
});
