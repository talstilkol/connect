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
    join(root, "server/platform/postgresRuntimeCapabilityConfiguration.ts"),
    "export const capabilities = ['api', 'worker', 'verifier', 'migration'];\n",
  );
  await writeFile(
    join(root, "server/platform/postgresRuntimeCapabilityEvidence.ts"),
    "export const candidateOnly = true;\n",
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresRuntimeCapabilityTrustedDriverContract.ts",
    ),
    [
      'import { capabilities } from "./postgresRuntimeCapabilityConfiguration.ts";',
      'import { candidateOnly } from "./postgresRuntimeCapabilityEvidence.ts";',
      "export const contractOnly = capabilities.length === 4 && candidateOnly;",
      "",
    ].join("\n"),
  );
  return root;
}

test("allows only the exact dormant trusted-driver closure", async () => {
  const root = await createFixture("connect-postgres-driver-contract-clean-");

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks runtime activation of the dormant trusted-driver contract", async () => {
  const root = await createFixture("connect-postgres-driver-contract-runtime-");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { contractOnly } from "../server/platform/postgresRuntimeCapabilityTrustedDriverContract.ts";',
      "export const activation = contractOnly;",
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

test("blocks every unapproved importer of the dormant trusted-driver contract", async () => {
  const root = await createFixture("connect-postgres-driver-contract-orphan-");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { contractOnly } from "./platform/postgresRuntimeCapabilityTrustedDriverContract.ts";',
      "export { contractOnly };",
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
