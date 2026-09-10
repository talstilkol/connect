import assert from "node:assert/strict";
import {
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

const adapterRelativePath =
  "server/meta/metaGraphBotReplyPinnedProviderAdapter.ts";

async function productionSource(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

async function createGuardFixture(name) {
  const root = join(
    tmpdir(),
    `connect-d1fc-${process.pid}-${name}`,
  );
  await Promise.all(
    [
      "app",
      "db",
      "features",
      "scripts",
      "server/meta",
      "server/operations",
      "server/platform",
      "shared",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory), { recursive: true })
    ),
  );
  await Promise.all([
    writeFile(
      join(root, "server/operations/productionImplementationState.ts"),
      await productionSource(
        "server/operations/productionImplementationState.ts",
      ),
    ),
    writeFile(
      join(root, adapterRelativePath),
      await productionSource(adapterRelativePath),
    ),
  ]);
  return root;
}

function findingCodes(report, file) {
  return report.findings
    .filter((finding) => finding.file === file)
    .map((finding) => finding.code)
    .sort();
}

test("allows only the exact dormant Meta pinned-provider adapter", async () => {
  const root = await createGuardFixture("clean");

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks direct Worker activation of the dormant Meta adapter", async () => {
  const root = await createGuardFixture("worker");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { createMetaGraphBotReplyPinnedProviderAdapter } from "../server/meta/metaGraphBotReplyPinnedProviderAdapter.ts";',
      "export const activation = createMetaGraphBotReplyPinnedProviderAdapter;",
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

test("blocks literal dynamic and transitive Worker activation", async () => {
  const dynamicRoot = await createGuardFixture("worker-dynamic");
  await writeFile(
    join(dynamicRoot, "worker/index.ts"),
    [
      "export const activation = import(",
      '  "../server/meta/metaGraphBotReplyPinnedProviderAdapter.ts",',
      ");",
      "",
    ].join("\n"),
  );
  const dynamicReport = await inspectSourceGuardrails(dynamicRoot);
  assert.deepEqual(dynamicReport.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);

  const transitiveRoot = await createGuardFixture("worker-transitive");
  await writeFile(
    join(transitiveRoot, "server/bridge.ts"),
    [
      'export { createMetaGraphBotReplyPinnedProviderAdapter as activate } from "./meta/metaGraphBotReplyPinnedProviderAdapter.ts";',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(transitiveRoot, "worker/index.ts"),
    [
      'import { activate } from "../server/bridge.ts";',
      "export const retained = activate;",
      "",
    ].join("\n"),
  );
  const transitiveReport = await inspectSourceGuardrails(transitiveRoot);
  assert.deepEqual(transitiveReport.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("allows a type-only Worker reference without loading the adapter", async () => {
  const root = await createGuardFixture("worker-type-only");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import type { MetaGraphBotReplyPinnedProviderAdapterInput } from "../server/meta/metaGraphBotReplyPinnedProviderAdapter.ts";',
      "export type DormantAdapterInput =",
      "  MetaGraphBotReplyPinnedProviderAdapterInput;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks every unapproved server importer of the dormant adapter", async () => {
  const root = await createGuardFixture("server-importer");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { createMetaGraphBotReplyPinnedProviderAdapter } from "./meta/metaGraphBotReplyPinnedProviderAdapter.ts";',
      "export { createMetaGraphBotReplyPinnedProviderAdapter };",
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

test("blocks local, external, and non-literal adapter dependencies", async () => {
  const cases = [
    {
      name: "local",
      prefix:
        'import { forbidden } from "./forbiddenAdapterDependency.ts";\nvoid forbidden;\n',
      setup: async (root) =>
        writeFile(
          join(root, "server/meta/forbiddenAdapterDependency.ts"),
          "export const forbidden = true;\n",
        ),
    },
    {
      name: "external",
      prefix: 'import { readFileSync } from "node:fs";\nvoid readFileSync;\n',
      setup: async () => undefined,
    },
    {
      name: "non-literal",
      prefix: [
        'const forbiddenModule = "node:fs";',
        "void import(forbiddenModule);",
        "",
      ].join("\n"),
      setup: async () => undefined,
    },
  ];

  for (const testCase of cases) {
    const root = await createGuardFixture(`dependency-${testCase.name}`);
    await testCase.setup(root);
    const path = join(root, adapterRelativePath);
    const source = await readFile(path, "utf8");
    await writeFile(path, `${testCase.prefix}${source}`);

    const report = await inspectSourceGuardrails(root);

    assert.equal(
      findingCodes(report, adapterRelativePath).includes(
        "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      ),
      true,
      testCase.name,
    );
  }
});

test("blocks package metadata from executing the dormant Meta adapter", async () => {
  const target = `./${adapterRelativePath}`;
  const cases = [
    ["scripts", { scripts: { start: `node ${target}` } }],
    ["browser", { browser: target }],
    ["browser-map", { browser: { "./safe.ts": target } }],
    ["bin", { bin: target }],
    ["main", { main: target }],
    ["module", { module: target }],
    ["exports", { exports: target }],
    ["imports", { imports: { "#d1fc": target } }],
  ];

  for (const [name, fields] of cases) {
    const root = await createGuardFixture(`package-${name}`);
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({ private: true, ...fields }, null, 2)}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "package.json"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
  }
});

test("follows a production package-script bridge to the adapter", async () => {
  const root = await createGuardFixture("package-bridge");
  await writeFile(
    join(root, "scripts/activate-adapter.mjs"),
    [
      'import { createMetaGraphBotReplyPinnedProviderAdapter } from "../server/meta/metaGraphBotReplyPinnedProviderAdapter.ts";',
      "export const activation = createMetaGraphBotReplyPinnedProviderAdapter;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: { start: "node scripts/activate-adapter.mjs" },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, "scripts/activate-adapter.mjs"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
});

test("locks every reviewed Meta adapter byte behind SHA-256", async () => {
  const root = await createGuardFixture("digest");
  const path = join(root, adapterRelativePath);
  const source = await readFile(path, "utf8");
  await writeFile(path, `${source}// unreviewed byte change\n`);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, adapterRelativePath),
    ["BOT_REPLY_STAGING_PINNED_PROVIDER_ADAPTER_CONTRACT_INVALID"],
  );
});
