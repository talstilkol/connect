import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  inspectSourceGuardrails,
} from "../scripts/verify-source-guardrails.mjs";

async function createFixture(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await Promise.all(
    [
      "app",
      "features",
      "server/operations",
      "server/platform",
      "shared",
      "db",
      "worker",
      "scripts",
    ].map((directory) => mkdir(join(root, directory), { recursive: true })),
  );
  await writeFile(
    join(root, "server/operations/productionImplementationState.ts"),
    await readFile(
      new URL(
        "../server/operations/productionImplementationState.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await writeFile(
    join(root, "server/platform/railwayBotReplyPinnedBoundaryDriver.ts"),
    [
      'import { types as nodeUtilTypes } from "node:util";',
      "export const dormantOnly = nodeUtilTypes.isDate(new Date(0));",
      "",
    ].join("\n"),
  );
  return root;
}

test("allows the dormant pinned-boundary driver with its exact dependency only", async () => {
  const root = await createFixture("connect-pinned-boundary-clean-");

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks worker activation of the dormant pinned-boundary driver", async () => {
  const root = await createFixture("connect-pinned-boundary-runtime-");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { dormantOnly } from "../server/platform/railwayBotReplyPinnedBoundaryDriver.ts";',
      "export const activation = dormantOnly;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("blocks every unapproved server importer of the dormant pinned-boundary driver", async () => {
  const root = await createFixture("connect-pinned-boundary-importer-");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { dormantOnly } from "./platform/railwayBotReplyPinnedBoundaryDriver.ts";',
      "export { dormantOnly };",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "server/orphan.ts",
    },
  ]);
});

test("blocks an unapproved dependency from the dormant pinned-boundary driver", async () => {
  const root = await createFixture("connect-pinned-boundary-dependency-");
  await writeFile(
    join(root, "server/platform/forbiddenDependency.ts"),
    "export const forbiddenDependency = true;\n",
  );
  await writeFile(
    join(root, "server/platform/railwayBotReplyPinnedBoundaryDriver.ts"),
    [
      'import { forbiddenDependency } from "./forbiddenDependency.ts";',
      "export const dormantOnly = forbiddenDependency;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file: "server/platform/railwayBotReplyPinnedBoundaryDriver.ts",
    },
  ]);
});
