import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  inspectSourceGuardrails,
} from "../scripts/verify-source-guardrails.mjs";

const transportRelativePath =
  "server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";
const transportImport =
  "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";

async function productionTransportSource() {
  return readFile(
    new URL(
      `../${transportRelativePath}`,
      import.meta.url,
    ),
    "utf8",
  );
}

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
    ].map((directory) =>
      mkdir(join(root, directory), { recursive: true })
    ),
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
    "export type DormantPinnedResult = Readonly<{ outcome: string }>\n",
  );
  await writeFile(
    join(root, transportRelativePath),
    await productionTransportSource(),
  );
  return root;
}

async function createChildCommandFixture(
  prefix,
  startCommand,
  childScripts = {},
  rootScripts = {},
) {
  const root = await createFixture(prefix);
  await Promise.all([
    mkdir(join(root, "packages/child"), { recursive: true }),
    mkdir(join(root, "tests"), { recursive: true }),
  ]);
  await writeFile(
    join(root, "tests/activate.ts"),
    [
      'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
      "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "tests/safe.ts"),
    "export const safe = true;\n",
  );
  await writeFile(
    join(root, "packages/child/package.json"),
    `${JSON.stringify({
      name: "@connect/child",
      private: true,
      scripts: childScripts,
    }, null, 2)}\n`,
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      workspaces: ["packages/child"],
      scripts: { ...rootScripts, start: startCommand },
    }, null, 2)}\n`,
  );
  return root;
}

async function mutateTransport(root, mutate) {
  const path = join(root, transportRelativePath);
  const source = await readFile(path, "utf8");
  await writeFile(path, mutate(source));
}

function replaceLast(source, search, replacement) {
  const index = source.lastIndexOf(search);
  assert.notEqual(index, -1, search);
  return `${source.slice(0, index)}${replacement}${source.slice(
    index + search.length,
  )}`;
}

function findingCodes(report, file) {
  return report.findings
    .filter((finding) => finding.file === file)
    .map((finding) => finding.code)
    .sort();
}

test("allows only the exact dormant pinned-session transport boundary", async () => {
  const root = await createFixture("connect-pinned-transport-clean-");

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks worker activation of the dormant pinned-session transport", async () => {
  const root = await createFixture("connect-pinned-transport-runtime-");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      `import { createNodePostgresBotReplyPinnedSessionTransport } from "${transportImport}";`,
      "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
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

test("blocks every unapproved server importer of the pinned-session transport", async () => {
  const root = await createFixture("connect-pinned-transport-importer-");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { createNodePostgresBotReplyPinnedSessionTransport } from "./platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
      "export { createNodePostgresBotReplyPinnedSessionTransport };",
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

test("blocks runtime re-exports of the pinned-session transport", async () => {
  const root = await createFixture("connect-pinned-transport-reexport-");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      "export {",
      "  createNodePostgresBotReplyPinnedSessionTransport,",
      '} from "./platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
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

test("blocks literal dynamic activation from a worker", async () => {
  const root = await createFixture("connect-pinned-transport-dynamic-");
  await writeFile(
    join(root, "worker/index.ts"),
    `void import("${transportImport}");\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("blocks transitive runtime activation through a server bridge", async () => {
  const root = await createFixture("connect-pinned-transport-transitive-");
  await writeFile(
    join(root, "server/bridge.ts"),
    [
      "export {",
      "  createNodePostgresBotReplyPinnedSessionTransport,",
      '} from "./platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/bridge.ts";',
      "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
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

test("allows type-only references to the dormant transport contract", async () => {
  const root = await createFixture("connect-pinned-transport-type-only-");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      `import type { NodePostgresBotReplyPinnedSession } from "${transportImport}";`,
      "export type WorkerSessionReference = NodePostgresBotReplyPinnedSession;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks an unapproved runtime dependency from the transport", async () => {
  const root = await createFixture("connect-pinned-transport-dependency-");
  await writeFile(
    join(root, "server/platform/forbiddenDependency.ts"),
    "export const forbiddenDependency = true;\n",
  );
  await mutateTransport(
    root,
    (source) => [
      'import { forbiddenDependency } from "./forbiddenDependency.ts";',
      source,
      "void forbiddenDependency;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, transportRelativePath),
    [
      "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
    ],
  );
});

test("keeps permit-bound SQL identifiers exclusive to approved paths", async () => {
  const root = await createFixture("connect-pinned-transport-sql-");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      "export const forbiddenSql =",
      '  "SELECT * FROM public.prove_bot_reply_staging_pre_send_session_barrier_v1($1)";',
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "server/orphan.ts",
    },
  ]);
});

test("always blocks direct ledger DML inside the transport", async () => {
  const root = await createFixture("connect-pinned-transport-ledger-");
  await mutateTransport(
    root,
    (source) => `${source}\nconst directLedgerDml = "DELETE FROM public.bot_reply_staging_provider_boundary_claims";\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, transportRelativePath),
    [
      "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
    ],
  );
});

test("blocks alternate SQL shapes even when they name an allowed function", async () => {
  const root = await createFixture("connect-pinned-transport-shape-");
  await mutateTransport(
    root,
    (source) => `${source}\nconst directFunctionDml = "DELETE FROM public.acquire_bot_reply_staging_pre_send_session_barrier_v1";\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, transportRelativePath),
    ["BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID"],
  );
});

test("blocks shadowed SQL helpers and split ledger DML", async () => {
  const root = await createFixture("connect-pinned-transport-split-dml-");
  await mutateTransport(
    root,
    (source) => source.replace(
      "  const session: NodePostgresBotReplyPinnedSession = Object.freeze({",
      [
        '  const ledgerPrefix = "bot_reply_staging_provider_";',
        '  const ledgerSuffix = "boundary_claims";',
        "  const queryStatements = Object.freeze({",
        '    bypass: `DELETE FROM public.${ledgerPrefix}${ledgerSuffix}` ,',
        "  });",
        "  void query(queryStatements.bypass);",
        "",
        "  const session: NodePostgresBotReplyPinnedSession = Object.freeze({",
      ].join("\n"),
    ),
  );

  const report = await inspectSourceGuardrails(root);

  assert.ok(
    findingCodes(report, transportRelativePath).includes(
      "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
    ),
  );
});

test("pins every capability query to its exact SELECT shape", async () => {
  const root = await createFixture("connect-pinned-transport-query-shape-");
  await mutateTransport(
    root,
    (source) => source.replace(
      '"LIMIT 2",\n  ].join(" "),\n  consume:',
      '"LIMIT 1",\n  ].join(" "),\n  consume:',
    ),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, transportRelativePath),
    ["BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID"],
  );
});

test("requires the exact node:util named import", async () => {
  const root = await createFixture("connect-pinned-transport-node-util-");
  await mutateTransport(
    root,
    (source) => source.replace(
      'import { types as nodeUtilTypes } from "node:util";',
      'import * as nodeUtilTypes from "node:util";',
    ),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, transportRelativePath),
    ["BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID"],
  );
});

test("blocks runtime module loaders beside the exact node:util import", async () => {
  const additions = [
    'function hiddenLoader() { return require("node:util"); }',
    'function hiddenModuleLoader() { return module.require("node:util"); }',
    'async function hiddenDynamicLoader() { return import("node:util"); }',
    'import extra = require("node:util");',
    'import hiddenImport = require("node:util");',
  ];
  for (const [index, addition] of additions.entries()) {
    const root = await createFixture(
      `connect-pinned-transport-loader-${index}-`,
    );
    await mutateTransport(
      root,
      (source) => `${source}\n${addition}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, transportRelativePath).includes(
        "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
      ),
      addition,
    );
  }
});

test("blocks forbidden globals, CLI entrypoints, and raw runtime exports", async () => {
  const mutations = [
    {
      name: "process-env",
      suffix:
        "\nfunction readCredential() { return process.env.DATABASE_URL; }\n",
    },
    {
      name: "fetch",
      suffix:
        '\nasync function makeRequest() { return fetch("https://example.invalid"); }\n',
    },
    {
      name: "logging",
      suffix:
        '\nfunction logResult() { console.error("forbidden"); }\n',
    },
    {
      name: "cli-main",
      suffix: "\nfunction main() { return undefined; }\n",
    },
    {
      name: "top-level-execution",
      suffix: "\nvoid nodeUtilTypes.isDate(new Date(0));\n",
    },
    {
      name: "import-meta",
      suffix: "\nconst moduleUrl = import.meta.url;\n",
    },
    {
      name: "constructor-loader",
      suffix:
        '\nfunction constructorLoader() { return Object.freeze.constructor("return process.getBuiltinModule(\\"node:fs\\")")(); }\n',
    },
    {
      name: "builtin-shadow",
      suffix:
        '\nconst Object = { freeze() { throw new Error("activated"); } };\n',
    },
    {
      name: "builtin-member-mutation",
      suffix:
        "\nfunction mutateBuiltin() { Object.freeze = (value) => value; }\n",
    },
    {
      name: "raw-client-export",
      suffix: "\nexport const rawClient = null;\n",
    },
  ];

  for (const mutation of mutations) {
    const root = await createFixture(
      `connect-pinned-transport-${mutation.name}-`,
    );
    await mutateTransport(
      root,
      (source) => `${source}${mutation.suffix}`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, transportRelativePath),
      ["BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID"],
      mutation.name,
    );
  }
});

test("blocks returning or resolving raw pool and client capabilities", async () => {
  const mutations = [
    {
      name: "resolve-pool",
      mutate: (source) => source.replace(
        "resolve(session);",
        "resolve(dependencies.pool);",
      ),
    },
    {
      name: "resolve-checked-pool",
      mutate: (source) => source.replace(
        "resolve(session);",
        "resolve(checkedDependencies.pool);",
      ),
    },
    {
      name: "return-pool",
      mutate: (source) => source.replace(
        "    async openPinned(rawSignal: AbortSignal) {",
        [
          "    async openPinned(rawSignal: AbortSignal) {",
          "      return dependencies.pool as never;",
        ].join("\n"),
      ),
    },
    {
      name: "return-client",
      mutate: (source) => source.replace(
        "    async destroy(signal: AbortSignal) {",
        [
          "    async destroy(signal: AbortSignal) {",
          "      return checkedClient.client as never;",
        ].join("\n"),
      ),
    },
    {
      name: "side-effect-client-leak",
      mutate: (source) => source.replace(
        "              client = requireClient(rawClient);",
        [
          "              client = requireClient(rawClient);",
          '              Reflect.set(signal, "rawClient", client);',
        ].join("\n"),
      ),
    },
  ];

  for (const mutation of mutations) {
    const root = await createFixture(
      `connect-pinned-transport-raw-${mutation.name}-`,
    );
    await mutateTransport(root, mutation.mutate);

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, transportRelativePath).includes(
        "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
      ),
      mutation.name,
    );
  }
});

test("binds safety-critical helpers by symbol and rejects local shadows", async () => {
  const mutations = [
    {
      name: "require-exact-data-record",
      mutate: (source) => source.replace(
        "  const checkedDependencies = requireExactDataRecord(",
        [
          "  const requireExactDataRecord = (value: unknown) => value as never;",
          "  const checkedDependencies = requireExactDataRecord(",
        ].join("\n"),
      ),
    },
    {
      name: "require-pool",
      mutate: (source) => source.replace(
        "  const checkedDependencies = requireExactDataRecord(",
        [
          "  const requirePool = (value: unknown) => value as never;",
          "  const checkedDependencies = requireExactDataRecord(",
        ].join("\n"),
      ),
    },
    {
      name: "destroy-unknown-client",
      mutate: (source) => source.replace(
        "      return new Promise<NodePostgresBotReplyPinnedSession>((resolve, reject) => {",
        [
          "      return new Promise<NodePostgresBotReplyPinnedSession>((resolve, reject) => {",
          "        const destroyUnknownClient = (_value: unknown) => {};",
        ].join("\n"),
      ),
    },
    {
      name: "fail",
      mutate: (source) => source.replace(
        '  let phase: SessionPhase = "opened";',
        [
          "  const fail = (_code: unknown) => checkedClient.client as never;",
          '  let phase: SessionPhase = "opened";',
        ].join("\n"),
      ),
    },
  ];

  for (const mutation of mutations) {
    const root = await createFixture(
      `connect-pinned-transport-helper-shadow-${mutation.name}-`,
    );
    await mutateTransport(root, mutation.mutate);

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, transportRelativePath).includes(
        "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
      ),
      mutation.name,
    );
  }
});

test("pins intrinsic AbortSignal and EventTarget operations by AST", async () => {
  const mutations = [
    {
      name: "forged-aborted-getter-source",
      mutate: (source) => source.replace(
        "  AbortSignal.prototype,",
        "  ({ get aborted() { return false; } }),",
      ),
    },
    {
      name: "direct-aborted-getter",
      mutate: (source) => source.replace(
        [
          "  const aborted = Reflect.apply(",
          "    abortSignalAbortedGetter,",
          "    signal,",
          "    [],",
          "  );",
        ].join("\n"),
        "  const aborted = signal.aborted;",
      ),
    },
    {
      name: "instance-add-listener",
      mutate: (source) => source.replace(
        [
          "  Reflect.apply(eventTargetAddEventListener, signal, [",
          '    "abort",',
          "    listener,",
          "    { once: true },",
          "  ]);",
        ].join("\n"),
        '  signal.addEventListener("abort", listener, { once: true });',
      ),
    },
    {
      name: "instance-remove-listener",
      mutate: (source) => source.replace(
        [
          "  Reflect.apply(eventTargetRemoveEventListener, signal, [",
          '    "abort",',
          "    listener,",
          "  ]);",
        ].join("\n"),
        '  signal.removeEventListener("abort", listener);',
      ),
    },
    {
      name: "require-signal-instance-check",
      mutate: (source) => source.replace(
        "    signalIsAborted(value as AbortSignal);",
        "    void (value as AbortSignal).aborted;",
      ),
    },
    {
      name: "mutate-reflect-apply-with-object-assign",
      mutate: (source) => source.replace(
        "  const pool = requirePool(checkedDependencies.pool);",
        [
          "  const pool = requirePool(checkedDependencies.pool);",
          "  Object.assign(Reflect, { apply() { return false; } });",
        ].join("\n"),
      ),
    },
  ];

  for (const mutation of mutations) {
    const root = await createFixture(
      `connect-pinned-transport-abort-ast-${mutation.name}-`,
    );
    await mutateTransport(root, mutation.mutate);

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, transportRelativePath).includes(
        "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
      ),
      mutation.name,
    );
  }
});

test("requires close to destroy the DISCARD ALL checkout", async () => {
  for (const [name, replacement] of [
    ["false", "checkedClient.release(false);"],
    ["missing-argument", "checkedClient.release();"],
    ["dead-if", "if (false) checkedClient.release(true);"],
    ["short-circuit", "false && checkedClient.release(true);"],
    [
      "nested-closure",
      "(() => checkedClient.release(true));",
    ],
  ]) {
    const root = await createFixture(
      `connect-pinned-transport-close-release-${name}-`,
    );
    await mutateTransport(
      root,
      (source) => replaceLast(
        source,
        "checkedClient.release(true);",
        replacement,
      ),
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, transportRelativePath).includes(
        "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
      ),
      name,
    );
  }
});

test("locks every reviewed transport byte behind a SHA-256 contract", async () => {
  const root = await createFixture(
    "connect-pinned-transport-reviewed-digest-",
  );
  await mutateTransport(
    root,
    (source) => source.replace(
      "// DISCARD ALL invalidates PostgreSQL prepared statements without",
      "// Reviewed wording changed without updating the attested digest.",
    ),
  );

  const report = await inspectSourceGuardrails(root);

  assert.ok(
    findingCodes(report, transportRelativePath).includes(
      "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
    ),
  );
});

test("blocks package metadata from executing the dormant transport", async () => {
  const cases = [
    ["scripts", { scripts: { start: `node ./${transportRelativePath}` } }],
    [
      "script-glob",
      {
        scripts: {
          start:
            "node server/platform/nodePostgresBotReplyPinnedSession*.ts",
        },
      },
    ],
    [
      "script-star",
      {
        scripts: {
          start: "node server/platform/*.ts",
        },
      },
    ],
    [
      "script-globstar",
      {
        scripts: {
          start: "node server/**/*.ts",
        },
      },
    ],
    ["bin", { bin: `./${transportRelativePath}` }],
    ["main", { main: `./${transportRelativePath}` }],
    ["module", { module: `./${transportRelativePath}` }],
    ["exports", { exports: `./${transportRelativePath}` }],
    [
      "imports",
      { imports: { "#pinned-transport": `./${transportRelativePath}` } },
    ],
  ];

  for (const [name, packageFields] of cases) {
    const root = await createFixture(
      `connect-pinned-transport-package-${name}-`,
    );
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({ private: true, ...packageFields }, null, 2)}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "package.json"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
  }
});

test("scans package-script entrypoints outside configured source roots", async () => {
  const root = await createFixture("connect-pinned-transport-tools-root-");
  await mkdir(join(root, "tools"), { recursive: true });
  await writeFile(
    join(root, "tools/activate.ts"),
    [
      'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
      "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: { start: "node tools/activate.ts" },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, "tools/activate.ts"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
});

test("blocks subprocess capabilities across runtime entrypoint closures", async () => {
  const cases = [
    {
      files: {
        "tools/wrapper.mjs": [
          'import { spawnSync as invoke } from "node:child_process";',
          'invoke("npm", ["run", "test"], { stdio: "inherit" });',
          "",
        ].join("\n"),
      },
      name: "direct-import-alias",
      reportedFile: "tools/wrapper.mjs",
    },
    {
      files: {
        "tools/wrapper.mjs": [
          'import { invoke } from "./bridge.mjs";',
          'invoke("npm", ["run", "test"]);',
          "",
        ].join("\n"),
        "tools/bridge.mjs": [
          'export { spawnSync as invoke } from "node:child_process";',
          "",
        ].join("\n"),
      },
      name: "transitive-reexport",
      reportedFile: "tools/bridge.mjs",
    },
    {
      files: {
        "tools/wrapper.mjs": [
          'import execute from "execa";',
          "void execute;",
          "",
        ].join("\n"),
      },
      name: "external-exec-package",
      reportedFile: "tools/wrapper.mjs",
    },
    {
      files: {
        "tools/wrapper.mjs": [
          'process.getBuiltinModule("node:child_process");',
          "",
        ].join("\n"),
      },
      name: "process-runtime-loader",
      reportedFile: "tools/wrapper.mjs",
    },
    {
      files: {
        "tools/wrapper.mjs": [
          'import { createRequire } from "node:module";',
          "const load = createRequire(import.meta.url);",
          'load("node:child_process");',
          "",
        ].join("\n"),
      },
      name: "create-require-loader",
      reportedFile: "tools/wrapper.mjs",
    },
    {
      files: {
        "tools/wrapper.mjs": [
          'import { Worker } from "node:worker_threads";',
          "void Worker;",
          "",
        ].join("\n"),
      },
      name: "worker-thread",
      reportedFile: "tools/wrapper.mjs",
    },
  ];

  for (const testCase of cases) {
    const root = await createFixture(
      `connect-pinned-transport-subprocess-${testCase.name}-`,
    );
    await mkdir(join(root, "tools"), { recursive: true });
    for (const [file, source] of Object.entries(testCase.files)) {
      await writeFile(join(root, file), source);
    }
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({
        private: true,
        scripts: { start: "node tools/wrapper.mjs" },
      }, null, 2)}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, testCase.reportedFile).includes(
        "PRODUCTION_PACKAGE_SCRIPT_SUBPROCESS_CAPABILITY_FORBIDDEN",
      ),
      testCase.name,
    );
  }
});

test("allows a transitive runtime closure without subprocess capabilities", async () => {
  const root = await createFixture(
    "connect-pinned-transport-subprocess-safe-closure-",
  );
  await mkdir(join(root, "tools"), { recursive: true });
  await writeFile(
    join(root, "tools/wrapper.mjs"),
    'import "./safe.mjs";\n',
  );
  await writeFile(
    join(root, "tools/safe.mjs"),
    "export const safe = true;\n",
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: { start: "node tools/wrapper.mjs" },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.equal(
    report.findings.some((finding) =>
      finding.code ===
        "PRODUCTION_PACKAGE_SCRIPT_SUBPROCESS_CAPABILITY_FORBIDDEN"
    ),
    false,
  );
});

test("does not treat start scripts under tests as test-only execution", async () => {
  const cases = [
    ["start", true],
    ["test", false],
  ];

  for (const [scriptName, shouldReport] of cases) {
    const root = await createFixture(
      `connect-pinned-transport-test-script-${scriptName}-`,
    );
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(
      join(root, "tests/activate.ts"),
      [
        'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
        "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
        "",
      ].join("\n"),
    );
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({
        private: true,
        scripts: {
          [scriptName]: "node tests/activate.ts",
        },
      }, null, 2)}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      shouldReport
        ? ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"]
        : [],
      scriptName,
    );
  }
});

test("follows production package scripts delegated through npm run", async () => {
  const root = await createFixture(
    "connect-pinned-transport-script-delegation-",
  );
  await mkdir(join(root, "tests"), { recursive: true });
  await writeFile(
    join(root, "tests/activate.ts"),
    [
      'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
      "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: {
        start: "npm run test",
        test: "node tests/activate.ts",
      },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, "tests/activate.ts"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
});

test("discovers nested package entrypoints invoked through npm prefix", async () => {
  const root = await createFixture(
    "connect-pinned-transport-nested-package-",
  );
  await mkdir(join(root, "tools"), { recursive: true });
  await writeFile(
    join(root, "tools/activate.ts"),
    [
      'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
      "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "tools/package.json"),
    `${JSON.stringify({
      private: true,
      scripts: { start: "node activate.ts" },
    }, null, 2)}\n`,
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      workspaces: ["tools"],
      scripts: { start: "npm --prefix tools start" },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, "tools/activate.ts"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
});

test("follows production scripts into child test scripts across package managers", async () => {
  const cases = [
    ["npm-prefix", "npm --prefix packages/child run test:activate"],
    ["npm-workspace", "npm --workspace @connect/child run test:activate"],
    ["npm-workspace-equals", "npm --workspace=@connect/child run test:activate"],
    ["npm-short-workspace-equals", "npm -w=@connect/child run test:activate"],
    ["npm-all-workspaces", "npm run test:activate --workspaces"],
    ["npm-all-workspaces-short", "npm run test:activate --ws"],
    ["npm-all-workspaces-equals", "npm run test:activate --workspaces=true"],
    ["npm-all-workspaces-before-run", "npm --workspaces run test:activate"],
    [
      "npm-multiple-workspaces",
      "npm --workspace @connect/child --workspace @connect/sibling run test:activate",
    ],
    ["pnpm-prefix", "pnpm --prefix packages/child run test:activate"],
    ["pnpm-workspace", "pnpm --workspace @connect/child run test:activate"],
    ["pnpm-filter", "pnpm --filter @connect/child run test:activate"],
    ["pnpm-filter-equals", "pnpm --filter=@connect/child run test:activate"],
    ["pnpm-filter-short", "pnpm -F @connect/child run test:activate"],
    ["pnpm-filter-short-equals", "pnpm -F=@connect/child run test:activate"],
    ["pnpm-recursive-short", "pnpm -r run test:activate"],
    ["pnpm-recursive-long", "pnpm --recursive run test:activate"],
    ["pnpm-recursive-equals", "pnpm --recursive=true run test:activate"],
    ["pnpm-recursive-command", "pnpm recursive run test:activate"],
    [
      "pnpm-multiple-filters",
      "pnpm --filter @connect/child --filter @connect/sibling run test:activate",
    ],
    ["yarn-prefix", "yarn --prefix packages/child run test:activate"],
    ["yarn-workspace", "yarn --workspace @connect/child run test:activate"],
    ["yarn-workspaces-run", "yarn workspaces run test:activate"],
    ["yarn-all-workspaces", "yarn workspaces foreach run test:activate"],
    ["yarn-all-workspaces-all", "yarn workspaces foreach -A run test:activate"],
    ["yarn-all-workspaces-recursive", "yarn workspaces foreach -R run test:activate"],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createFixture(
      `connect-pinned-transport-cross-manifest-${name}-`,
    );
    await Promise.all([
      mkdir(join(root, "packages/child"), { recursive: true }),
      mkdir(join(root, "packages/sibling"), { recursive: true }),
      mkdir(join(root, "tests"), { recursive: true }),
    ]);
    await writeFile(
      join(root, "tests/activate.ts"),
      [
        'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
        "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
        "",
      ].join("\n"),
    );
    await writeFile(
      join(root, "tests/safe.ts"),
      "export const safe = true;\n",
    );
    await writeFile(
      join(root, "packages/child/package.json"),
      `${JSON.stringify({
        name: "@connect/child",
        private: true,
        scripts: {
          "test:activate": "node ../../tests/activate.ts",
        },
      }, null, 2)}\n`,
    );
    await writeFile(
      join(root, "packages/sibling/package.json"),
      `${JSON.stringify({
        name: "@connect/sibling",
        private: true,
        scripts: {
          "test:activate": "node ../../tests/safe.ts",
        },
      }, null, 2)}\n`,
    );
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({
        private: true,
        workspaces: ["packages/child", "packages/sibling"],
        scripts: { start: startCommand },
      }, null, 2)}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("does not interpret recursive exec arguments as package scripts", async () => {
  const cases = [
    ["short", "pnpm -r exec run test:activate"],
    ["long", "pnpm --recursive exec run test:activate"],
    ["equals", "pnpm --recursive=true exec run test:activate"],
    ["command", "pnpm recursive exec run test:activate"],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createFixture(
      `connect-pinned-transport-recursive-exec-${name}-`,
    );
    await Promise.all([
      mkdir(join(root, "packages/child"), { recursive: true }),
      mkdir(join(root, "tests"), { recursive: true }),
    ]);
    await writeFile(
      join(root, "tests/activate.ts"),
      [
        'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
        "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
        "",
      ].join("\n"),
    );
    await writeFile(
      join(root, "packages/child/package.json"),
      `${JSON.stringify({
        name: "@connect/child",
        private: true,
        scripts: {
          "test:activate": "node ../../tests/activate.ts",
        },
      }, null, 2)}\n`,
    );
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({
        private: true,
        workspaces: ["packages/child"],
        scripts: { start: startCommand },
      }, null, 2)}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      [],
      name,
    );
    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("preserves workspace scope for package-manager exec source paths", async () => {
  const cases = [
    [
      "pnpm-filter",
      "pnpm --filter @connect/child exec node ../../tests/activate.ts",
    ],
    [
      "npm-workspace",
      "npm exec --workspace @connect/child -- node ../../tests/activate.ts",
    ],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-exec-source-${name}-`,
      startCommand,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
  }
});

test("propagates recursive exec scope into a nested package manager", async () => {
  const cases = [
    ["recursive", "pnpm -r exec npm run test"],
    [
      "filtered-corepack",
      "pnpm --filter @connect/child exec corepack npm run test",
    ],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-nested-manager-${name}-`,
      startCommand,
      { test: "node ../../tests/activate.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
  }
});

test("tracks quoted, corepack, env, and cd chains but fails managers closed", async () => {
  const cases = [
    ["quoted", '"npm" -w=@connect/child run test'],
    ["corepack", "corepack npm -w=@connect/child run test"],
    ["env", "env CONNECT_GUARD=1 npm -w=@connect/child run test"],
    ["cd", "cd packages/child && npm run test"],
    [
      "cd-env-corepack",
      "cd packages/child && env CONNECT_GUARD=1 corepack npm run test",
    ],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-shell-chain-${name}-`,
      startCommand,
      { test: "node ../../tests/activate.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("fails closed on every package-manager run shorthand", async () => {
  const cases = [
    ["npm-test-short", "npm -w=@connect/child t"],
    ["npm-test-long-short", "npm -w=@connect/child tst"],
    ["npm-run-rum", "npm -w=@connect/child rum test"],
    ["npm-run-urn", "npm -w=@connect/child urn test"],
    ["pnpm-test-short", "pnpm --filter @connect/child t"],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-run-alias-${name}-`,
      startCommand,
      { test: "node ../../tests/activate.ts" },
      { test: "node tests/safe.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("keeps selectors after delimiter or pnpm script name out of scope", async () => {
  const rootReachableCases = [
    [
      "npm-delimiter",
      "npm run test -- --workspace @connect/child",
    ],
    [
      "pnpm-trailing-filter",
      "pnpm run test --filter @connect/child",
    ],
    [
      "pnpm-trailing-filter-equals",
      "pnpm run test --filter=@connect/child",
    ],
    [
      "yarn-trailing-workspace",
      "yarn run test --workspace @connect/child",
    ],
  ];

  for (const [name, startCommand] of rootReachableCases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-trailing-selector-${name}-`,
      startCommand,
      { test: "node ../../tests/safe.ts" },
      { test: "node tests/activate.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }

  const childScoped = await createChildCommandFixture(
    "connect-pinned-transport-pnpm-filter-before-script-",
    "pnpm run --filter @connect/child test",
    { test: "node ../../tests/safe.ts" },
    { test: "node tests/activate.ts" },
  );
  const childScopedReport = await inspectSourceGuardrails(childScoped);

  assert.deepEqual(
    findingCodes(childScopedReport, "tests/activate.ts"),
    [],
  );
  assert.ok(
    findingCodes(childScopedReport, "package.json").includes(
      "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
    ),
  );
});

test("fails closed on package-manager built-ins despite same-name scripts", async () => {
  for (const [name, startCommand] of [
    ["pnpm-dlx", 'pnpm dlx "$CONNECT_RUNNER"'],
    ["yarn-dlx", 'yarn dlx "$CONNECT_RUNNER"'],
  ]) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-manager-builtin-${name}-`,
      startCommand,
      {},
      { dlx: "node tests/safe.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("fails closed on project package-manager configuration", async () => {
  const root = await createChildCommandFixture(
    "connect-pinned-transport-project-npmrc-",
    "npm run test",
    { test: "node ../../tests/activate.ts" },
    { test: "node tests/safe.ts" },
  );
  await writeFile(
    join(root, ".npmrc"),
    "workspace=@connect/child\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.ok(
    findingCodes(report, "package.json").includes(
      "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
    ),
  );

  const externalHome = await mkdtemp(join(
    tmpdir(),
    "connect-pinned-transport-npm-home-",
  ));
  await writeFile(
    join(externalHome, ".npmrc"),
    "workspace=@connect/child\n",
  );
  const inherited = await createChildCommandFixture(
    "connect-pinned-transport-inherited-npmrc-",
    `HOME=${externalHome} npm run test`,
    { test: "node ../../tests/activate.ts" },
    { test: "node tests/safe.ts" },
  );

  const inheritedReport = await inspectSourceGuardrails(inherited);

  assert.ok(
    findingCodes(inheritedReport, "package.json").includes(
      "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
    ),
  );
});

test("requires the first direct-runtime entrypoint to be static", async () => {
  const cases = [
    [
      "node-eval-decoy",
      'node -e \'import("./server/platform/"+"nodePostgresBotReplyPinned"+"SessionTransport"+".ts")\' tests/safe.ts',
    ],
    ["node-print", "node --print 1 tests/safe.ts"],
    [
      "node-preload",
      "node --require tests/safe.ts tests/safe.ts",
    ],
    [
      "node-import",
      "node --import=tests/safe.ts tests/safe.ts",
    ],
    [
      "node-loader",
      "node --loader tests/safe.ts tests/safe.ts",
    ],
    ["node-run", "node --run test tests/safe.ts"],
    [
      "dynamic-argument",
      'node tests/safe.ts "$CONNECT_ARGUMENT"',
    ],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-direct-entry-${name}-`,
      startCommand,
      {},
      { test: "node tests/activate.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("fails direct runtimes closed when env can override resolution", async () => {
  const root = await createChildCommandFixture(
    "connect-pinned-transport-tsx-config-env-",
    "TSX_TSCONFIG_PATH=tests/override-tsconfig.json tsx tests/entry.ts",
  );
  await writeFile(
    join(root, "tests/entry.ts"),
    'import "@selected";\n',
  );
  await writeFile(
    join(root, "tests/override-tsconfig.json"),
    `${JSON.stringify({
      compilerOptions: {
        baseUrl: "..",
        paths: {
          "@selected": [
            "server/platform/nodePostgresBotReplyPinnedSessionTransport.ts",
          ],
        },
      },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.ok(
    findingCodes(report, "package.json").includes(
      "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
    ),
  );
});

test("allows exact root tooling but fails workspace tooling closed", async () => {
  const rootTool = await createChildCommandFixture(
    "connect-pinned-transport-root-project-tool-",
    "vinext build",
  );
  const rootToolReport = await inspectSourceGuardrails(rootTool);

  assert.equal(
    findingCodes(rootToolReport, "package.json").includes(
      "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
    ),
    false,
  );

  const workspaceTool = await createChildCommandFixture(
    "connect-pinned-transport-workspace-project-tool-",
    "node tests/safe.ts",
    { build: "vinext build" },
  );
  const workspaceToolReport = await inspectSourceGuardrails(workspaceTool);

  assert.ok(
    findingCodes(
      workspaceToolReport,
      "packages/child/package.json",
    ).includes("BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"),
  );
});

test("makes pre and post lifecycle scripts reachable with their target", async () => {
  for (const lifecycleName of ["pretest", "posttest"]) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-lifecycle-${lifecycleName}-`,
      "npm -w=@connect/child run test",
      {
        [lifecycleName]: "node ../../tests/activate.ts",
        test: "node ../../tests/safe.ts",
      },
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      lifecycleName,
    );
  }
});

test("fails closed on dynamic cwd and unmodelled package-manager wrappers", async () => {
  const cases = [
    ["dynamic-cwd", 'cd "$CONNECT_CHILD" && npm run test'],
    ["glob-cwd", "cd packages/* && npm run test"],
    ["ambiguous-cwd", "cd packages/child || npm run test"],
    ["directory-stack", "pushd packages/child && npm run test"],
    ["subshell", "(cd packages/child && npm run test)"],
    ["dynamic-manager", "$CONNECT_PACKAGE_MANAGER run test"],
    ["command-wrapper", "command npm -w=@connect/child run test"],
    ["shell-wrapper", 'sh -c "npm -w=@connect/child run test"'],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-unmodelled-shell-${name}-`,
      startCommand,
      { test: "node ../../tests/activate.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("tracks exact env cwd and fails manager delegation closed", async () => {
  const cases = [
    ["chdir-equals", "env --chdir=packages/child npm run test"],
    ["short-chdir-attached", "env -Cpackages/child npm run test"],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-env-cwd-${name}-`,
      startCommand,
      { test: "node ../../tests/activate.ts" },
      { test: "node tests/safe.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tests/activate.ts"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
    assert.equal(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      true,
      name,
    );
  }
});

test("fails direct-runtime cwd wrappers closed", async () => {
  const cases = [
    [
      "env-chdir",
      "env --chdir=packages/child node ../../tests/activate.ts",
    ],
    [
      "static-cd",
      "cd packages/child && node ../../tests/activate.ts",
    ],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-direct-cwd-${name}-`,
      startCommand,
      {},
      { node: "node tests/safe.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("canonicalizes package-script cwd symlinks and rejects root escape", async () => {
  const inRoot = await createChildCommandFixture(
    "connect-pinned-transport-cwd-symlink-in-root-",
    "cd cwd-alias && npm run test",
    { test: "node ../../tests/activate.ts" },
    { test: "node tests/safe.ts" },
  );
  await symlink("packages/child", join(inRoot, "cwd-alias"));

  const inRootReport = await inspectSourceGuardrails(inRoot);

  assert.deepEqual(
    findingCodes(inRootReport, "tests/activate.ts"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
  assert.equal(
    findingCodes(inRootReport, "package.json").includes(
      "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
    ),
    true,
  );

  const escaped = await createChildCommandFixture(
    "connect-pinned-transport-cwd-symlink-escape-",
    "cd cwd-alias && npm --workspaces run test",
    { test: "node ../../tests/activate.ts" },
    { test: "node tests/safe.ts" },
  );
  const external = await mkdtemp(join(
    tmpdir(),
    "connect-pinned-transport-cwd-external-",
  ));
  await writeFile(
    join(external, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: {
        test: `node ${join(escaped, "tests/activate.ts")}`,
      },
    }, null, 2)}\n`,
  );
  await symlink(external, join(escaped, "cwd-alias"));

  const escapedReport = await inspectSourceGuardrails(escaped);

  assert.ok(
    findingCodes(escapedReport, "package.json").includes(
      "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
    ),
  );
});

test("fails closed on shell controls even when the root test script is safe", async () => {
  const cases = [
    ["subshell", "( cd packages/child && npm run test )"],
    ["brace-group", "{ cd packages/child; npm run test; }"],
    ["conditional", "if cd packages/child; then npm run test; fi"],
    ["builtin-cd", "builtin cd packages/child && npm run test"],
    ["dynamic-shell", 'sh -c "$CONNECT_COMMAND"'],
    [
      "nested-shell-wrapper",
      'pnpm --filter @connect/child exec sh -c "$CONNECT_COMMAND" ../../tests/safe.ts',
    ],
    [
      "background-control",
      "npm run test & cd packages/child && npm run test",
    ],
    [
      "command-substitution",
      'npm run test "$(printf ignored)"',
    ],
    [
      "dynamic-env-cwd",
      'env --chdir="$CONNECT_CHILD" npm run test',
    ],
    [
      "dynamic-path-assignment",
      "PATH=packages/child:$PATH npm run test",
    ],
    [
      "node-options-assignment",
      "env NODE_OPTIONS=--require=tests/safe.ts npm run test",
    ],
    [
      "unknown-manager-option",
      "npm --connect-unknown-option -w=@connect/child run test",
    ],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-shell-control-${name}-`,
      startCommand,
      { test: "node ../../tests/activate.ts" },
      { test: "node tests/safe.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("fails closed on alternative managers with a safe root test script", async () => {
  const cases = [
    ["deno", "deno task --cwd=packages/child test"],
    ["yarnpkg", "yarnpkg --cwd packages/child run test"],
    ["nx", "nx run child:test"],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-alternative-manager-${name}-`,
      startCommand,
      { test: "node ../../tests/activate.ts" },
      { test: "node tests/safe.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("fails closed on unresolved pnpm and yarn shorthand with a safe root alias", async () => {
  const cases = [
    [
      "pnpm-filter-node",
      "pnpm --filter @connect/child node ../../tests/activate.ts",
    ],
    [
      "yarn-workspace-node",
      "yarn workspace @connect/child node ../../tests/activate.ts",
    ],
  ];

  for (const [name, startCommand] of cases) {
    const root = await createChildCommandFixture(
      `connect-pinned-transport-shorthand-${name}-`,
      startCommand,
      {},
      { node: "node tests/safe.ts" },
    );

    const report = await inspectSourceGuardrails(root);

    assert.ok(
      findingCodes(report, "package.json").includes(
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      ),
      name,
    );
  }
});

test("fails closed on bun commands with a safe same-name root script", async () => {
  const root = await createChildCommandFixture(
    "connect-pinned-transport-bun-cwd-",
    "bun --cwd packages/child run test",
    { test: "node ../../tests/activate.ts" },
    { test: "node tests/safe.ts" },
  );

  const report = await inspectSourceGuardrails(root);

  assert.ok(
    findingCodes(report, "package.json").includes(
      "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
    ),
  );
});

test("scans mixed and traversal package-script entrypoints", async () => {
  const cases = [
    [
      "mixed-test-and-runtime",
      "node --test tests/x.test.mjs && node tools/activate.ts",
    ],
    [
      "test-prefix-traversal",
      "node tests/../tools/activate.ts",
    ],
  ];

  for (const [name, command] of cases) {
    const root = await createFixture(
      `connect-pinned-transport-script-${name}-`,
    );
    await Promise.all([
      mkdir(join(root, "tests"), { recursive: true }),
      mkdir(join(root, "tools"), { recursive: true }),
    ]);
    await writeFile(
      join(root, "tests/x.test.mjs"),
      'import test from "node:test"; test("x", () => {});\n',
    );
    await writeFile(
      join(root, "tools/activate.ts"),
      [
        'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
        "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
        "",
      ].join("\n"),
    );
    await writeFile(
      join(root, "package.json"),
      `${JSON.stringify({
        private: true,
        scripts: { start: command },
      }, null, 2)}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(
      findingCodes(report, "tools/activate.ts"),
      ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
      name,
    );
  }
});

test("resolves package-script globs through symlinks", async () => {
  const root = await createFixture(
    "connect-pinned-transport-script-symlink-",
  );
  await mkdir(join(root, "tools"), { recursive: true });
  await symlink(
    `../${transportRelativePath}`,
    join(root, "tools/pinned-alias.ts"),
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: { start: "node tools/*.ts" },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, "package.json"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
});

test("resolves package-script globs through directory symlinks", async () => {
  const root = await createFixture(
    "connect-pinned-transport-script-directory-symlink-",
  );
  await symlink(
    "server/platform",
    join(root, "runtime-platform"),
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: { start: "node runtime-platform/*.ts" },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, "package.json"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
});

test("traverses only canonical in-root directory symlinks for runtime graphs", async () => {
  const root = await createFixture(
    "connect-pinned-transport-canonical-directory-symlink-",
  );
  const external = await mkdtemp(join(
    tmpdir(),
    "connect-pinned-transport-external-symlink-",
  ));
  await mkdir(join(root, "tools/runtime"), { recursive: true });
  await writeFile(
    join(root, "tools/runtime/bridge.ts"),
    [
      'import { createNodePostgresBotReplyPinnedSessionTransport } from "../../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
      "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "worker/index.ts"),
    'export { activation } from "./runtime-alias/bridge.ts";\n',
  );
  await writeFile(
    join(external, "invalid.ts"),
    "export const = ;\n",
  );
  await Promise.all([
    symlink("../tools/runtime", join(root, "worker/runtime-alias")),
    symlink(".", join(root, "tools/runtime/cycle")),
    symlink(external, join(root, "tools/runtime/external")),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.ok(
    findingCodes(report, "worker/index.ts").includes(
      "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
    ),
  );
  assert.equal(
    report.findings.some((finding) =>
      finding.file.includes("external/invalid.ts") ||
      finding.file.includes("runtime-alias/external/invalid.ts")
    ),
    false,
  );
});

test("follows transitive dependencies from package-script entrypoints", async () => {
  const root = await createFixture(
    "connect-pinned-transport-tools-transitive-",
  );
  await mkdir(join(root, "tools"), { recursive: true });
  await writeFile(
    join(root, "tools/activate.ts"),
    [
      'import { activation } from "./bridge.ts";',
      "export { activation };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "tools/bridge.ts"),
    [
      'import { createNodePostgresBotReplyPinnedSessionTransport } from "../server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";',
      "export const activation = createNodePostgresBotReplyPinnedSessionTransport;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      private: true,
      scripts: { start: "node tools/activate.ts" },
    }, null, 2)}\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    findingCodes(report, "tools/bridge.ts"),
    ["BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN"],
  );
});
