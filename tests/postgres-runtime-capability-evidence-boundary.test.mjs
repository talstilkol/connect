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
    join(root, "server/platform/postgresRuntimeCapabilityEvidence.ts"),
    "export const candidateOnly = true;\n",
  );
  return root;
}

test("blocks runtime activation of the dormant PostgreSQL capability probe", async () => {
  const root = await createFixture("connect-postgres-capability-runtime-");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { candidateOnly } from "../server/platform/postgresRuntimeCapabilityEvidence.ts";',
      "export const activation = candidateOnly;",
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

test("blocks every unapproved orphan importer of the dormant probe", async () => {
  const root = await createFixture("connect-postgres-capability-orphan-");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { candidateOnly } from "./platform/postgresRuntimeCapabilityEvidence.ts";',
      "export { candidateOnly };",
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
