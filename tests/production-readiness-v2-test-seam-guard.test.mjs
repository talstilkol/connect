import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  inspectSourceGuardrails,
} from "../scripts/verify-source-guardrails.mjs";

test("forbids Production Readiness v2 test seams in runtime composition", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-readiness-v2-test-seam-"),
  );

  await Promise.all(
    ["app", "features", "server", "shared", "db", "worker"].map(
      (directory) => mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "server", "runtime.ts"),
    [
      "export function createRuntime() {",
      "  return activateProductionReadinessV2ForTesting;",
      "}",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "TEST_ONLY_READINESS_V2_SEAM_FORBIDDEN",
      file: "server/runtime.ts",
    },
  ]);
});
