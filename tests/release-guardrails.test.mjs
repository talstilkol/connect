import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
  mkdtemp,
  mkdir,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  inspectInterfaceGuardrails,
} from "../scripts/verify-interface-guardrails.mjs";
import {
  inspectDependencyLock,
} from "../scripts/verify-dependency-lock.mjs";
import {
  inspectSourceGuardrails as inspectSourceGuardrailsRaw,
} from "../scripts/verify-source-guardrails.mjs";

async function inspectSourceGuardrails(root) {
  if (root !== undefined) {
    const stateFile = join(
      root,
      "server/operations/productionImplementationState.ts",
    );

    try {
      await readFile(stateFile, "utf8");
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }

      await mkdir(join(root, "server/operations"), {
        recursive: true,
      });
      await writeFile(
        stateFile,
        await readFile(
          new URL(
            "../server/operations/productionImplementationState.ts",
            import.meta.url,
          ),
          "utf8",
        ),
      );
    }
  }

  return inspectSourceGuardrailsRaw(root);
}

async function createSourceGuardFixture(prefix) {
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
  return root;
}

test("passes the current source, interface, and dependency lock guardrails", async () => {
  const [source, ui, dependencies] =
    await Promise.all([
    inspectSourceGuardrails(),
    inspectInterfaceGuardrails(),
      inspectDependencyLock(),
    ]);

  assert.equal(source.status, "passed");
  assert.equal(source.findings.length, 0);
  assert.equal(ui.status, "passed");
  assert.equal(ui.checksRun, 15);
  assert.equal(ui.findings.length, 0);
  assert.equal(
    dependencies.status,
    "passed",
  );
  assert.equal(
    dependencies.findings.length,
    0,
  );
});

test("requires external evidence only in the production release gate", async () => {
  const source = await readFile(
    new URL(
      "../scripts/verify-release-gate.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  const conditionalStart = source.indexOf(
    "localOnly\n      ? []",
  );
  const dependencyAttestationStep = source.indexOf(
    '"dependency-audit-attestation"',
  );
  const browserAttestationStep = source.indexOf(
    '"team-invitation-browser-attestation"',
  );
  const readinessStep = source.indexOf(
    'id: "production-readiness"',
  );
  const betterStackEvidenceStep = source.indexOf(
    '"better-stack-staging-evidence"',
  );
  const botReplyEvidenceStep = source.indexOf(
    '"bot-reply-staging-evidence"',
  );

  assert.notEqual(conditionalStart, -1);
  assert.ok(
    dependencyAttestationStep > conditionalStart,
  );
  assert.ok(
    browserAttestationStep >
      dependencyAttestationStep,
  );
  assert.ok(
    betterStackEvidenceStep > browserAttestationStep,
  );
  assert.ok(botReplyEvidenceStep > betterStackEvidenceStep);
  assert.ok(readinessStep > botReplyEvidenceStep);
  assert.match(
    source,
    /scripts\/verify-dependency-audit-evidence-attestation\.mjs/,
  );
  assert.match(
    source,
    /scripts\/verify-team-invitation-browser-evidence-attestation\.mjs/,
  );
  assert.match(
    source,
    /scripts\/verify-better-stack-staging-evidence\.mjs/,
  );
  assert.match(
    source,
    /scripts\/verify-bot-reply-staging-evidence\.mjs/,
  );
});

test("detects forbidden randomness in an isolated source tree", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-guardrails-"),
  );

  for (const directory of [
    "app",
    "features",
    "server",
    "shared",
  ]) {
    await mkdir(join(root, directory));
  }

  await writeFile(
    join(root, "server", "unsafe.ts"),
    "export const value = Math.random();\n",
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "RANDOMNESS_FORBIDDEN",
      file: "server/unsafe.ts",
    },
  ]);
});

test("detects every protected server secret identifier in client modules", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-client-secret-"),
  );

  for (const directory of [
    "app",
    "features",
    "server",
    "shared",
  ]) {
    await mkdir(join(root, directory));
  }

  await Promise.all(
    [
      ["bot.tsx", "BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1"],
      ["database.tsx", "DATABASE_URL"],
      ["postgres-api.tsx", "POSTGRES_API_URL"],
      ["postgres-worker.tsx", "POSTGRES_WORKER_URL"],
      ["postgres-verifier.tsx", "POSTGRES_VERIFIER_URL"],
      ["postgres-migration.tsx", "POSTGRES_MIGRATION_URL"],
      ["postgres-owner.tsx", "POSTGRES_OWNER_URL"],
      ["monitoring.tsx", "BETTER_STACK_INCIDENT_API_TOKEN"],
    ].map(([file, identifier]) =>
      writeFile(
        join(root, "features", file),
        [
          '"use client";',
          `export const key = process.env.${identifier};`,
          "",
        ].join("\n"),
      ),
    ),
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/bot.tsx",
    },
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/database.tsx",
    },
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/monitoring.tsx",
    },
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/postgres-api.tsx",
    },
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/postgres-migration.tsx",
    },
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/postgres-owner.tsx",
    },
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/postgres-verifier.tsx",
    },
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/postgres-worker.tsx",
    },
  ]);
});

test("scans database, worker, and root runtime sources", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-db-guardrails-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "db", "unsafe.ts"),
    "export const value = Math.random();\n",
  );
  await writeFile(
    join(root, "worker", "unsafe.ts"),
    "export const value = eval('1');\n",
  );
  await writeFile(
    join(root, "proxy.ts"),
    "export const dangerouslySetInnerHTML = true;\n",
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "RANDOMNESS_FORBIDDEN",
      file: "db/unsafe.ts",
    },
    {
      code: "UNSAFE_HTML_INJECTION_FORBIDDEN",
      file: "proxy.ts",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "worker/unsafe.ts",
    },
  ]);
});

test("detects a transitive client to server-only dependency boundary", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-client-graph-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "features", "client.ts"),
    [
      '"use client";',
      'import { value } from "../shared/bridge";',
      "export { value };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "shared", "bridge.ts"),
    [
      'import { value } from "../db/private";',
      "export { value };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "db", "private.ts"),
    "export const value = 1;\n",
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "CLIENT_SERVER_BOUNDARY_FORBIDDEN",
      file: "features/client.ts",
    },
  ]);
});

test("uses TypeScript aliases and import-equals edges in the client graph", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-typescript-graph-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "features", "client.ts"),
    [
      '"use client";',
      'import { value } from "@/shared/bridge";',
      "export { value };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "shared", "bridge.ts"),
    [
      'import privateModule = require("../server/private");',
      "export const value = privateModule.value;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server", "private.ts"),
    "export const value = 1;\n",
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.equal(
    report.graphEngine,
    "typescript-compiler-api",
  );
  assert.ok(report.dependencyEdgesInspected >= 2);
  assert.deepEqual(report.findings, [
    {
      code:
        "CLIENT_SERVER_BOUNDARY_FORBIDDEN",
      file: "features/client.ts",
    },
  ]);
});

test("excludes type-only imports from the runtime dependency graph", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-type-only-graph-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "features", "client.ts"),
    [
      '"use client";',
      'import { type PrivateView } from "../server/private";',
      "export const value = 1;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server", "private.ts"),
    "export type PrivateView = { value: number };\n",
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.equal(report.status, "passed");
  assert.equal(report.dependencyEdgesInspected, 0);
  assert.deepEqual(report.findings, []);
});

test("keeps a use-server module as an explicit client boundary", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-server-action-graph-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "features", "client.ts"),
    [
      '"use client";',
      'import { action } from "../server/action";',
      "export const invoke = action;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server", "action.ts"),
    [
      '"use server";',
      'import { value } from "../db/private";',
      "export async function action() { return value; }",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "db", "private.ts"),
    "export const value = 1;\n",
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.equal(report.status, "passed");
  assert.deepEqual(report.findings, []);
});

test("fails closed when a client local import cannot be resolved", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-unresolved-client-graph-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "features", "client.ts"),
    [
      '"use client";',
      'import { value } from "./missing";',
      "export { value };",
      "",
    ].join("\n"),
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "CLIENT_LOCAL_IMPORT_UNRESOLVED",
      file: "features/client.ts",
    },
  ]);
});

test("fails closed when TypeScript source cannot be parsed", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-unparseable-source-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "features", "invalid.ts"),
    '"use client"; import {\n',
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "SOURCE_PARSE_FAILED",
      file: "features/invalid.ts",
    },
  ]);
});

test("treats instrumentation-client as a client entry by convention", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-instrumentation-client-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "instrumentation-client.ts"),
    [
      'import { value } from "./server/private";',
      "export const observed = value;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server", "private.ts"),
    "export const value = 1;\n",
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.equal(report.clientEntriesInspected, 1);
  assert.deepEqual(report.findings, [
    {
      code:
        "CLIENT_SERVER_BOUNDARY_FORBIDDEN",
      file: "instrumentation-client.ts",
    },
  ]);
});

test("fails closed for non-literal dynamic import and require in client graphs", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "connect-non-literal-import-"),
  );

  await Promise.all(
    [
      "app",
      "features",
      "server",
      "shared",
      "db",
      "worker",
    ].map((directory) =>
      mkdir(join(root, directory)),
    ),
  );
  await writeFile(
    join(root, "features", "dynamic-client.ts"),
    [
      '"use client";',
      'const target = "../server/private";',
      "export const load = () => import(target);",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "features", "require-client.ts"),
    [
      '"use client";',
      'const target = "../server/private";',
      "export const loaded = require(target);",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "features", "escaped-require-client.ts"),
    [
      '"use client";',
      "const load = (require);",
      'export const loaded = load("node:fs");',
      "",
    ].join("\n"),
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "CLIENT_NON_LITERAL_RUNTIME_IMPORT_FORBIDDEN",
      file: "features/dynamic-client.ts",
    },
    {
      code: "CLIENT_SERVER_BOUNDARY_FORBIDDEN",
      file: "features/escaped-require-client.ts",
    },
    {
      code:
        "CLIENT_SERVER_BOUNDARY_FORBIDDEN",
      file: "features/require-client.ts",
    },
  ]);
});

test("blocks Node built-ins anywhere in a client graph", async () => {
  const root = await createSourceGuardFixture(
    "connect-client-node-builtin-",
  );
  await writeFile(
    join(root, "features/node-client.ts"),
    [
      '"use client";',
      'import { readFile } from "node:fs";',
      'import futureBuiltin from "node:connect-future-builtin";',
      "export const read = readFile;",
      "export const future = futureBuiltin;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "features/node-global-client.ts"),
    [
      '"use client";',
      'export const bytes = Buffer.from("x");',
      "export const file = __filename;",
      "export const directory = __dirname;",
      'export const builtin = process.getBuiltinModule("fs");',
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "CLIENT_SERVER_BOUNDARY_FORBIDDEN",
      file: "features/node-client.ts",
    },
    {
      code: "CLIENT_SERVER_BOUNDARY_FORBIDDEN",
      file: "features/node-global-client.ts",
    },
  ]);
});

test("blocks direct and transitive runtime dependencies on dormant attested modules", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-runtime-graph-",
  );
  await writeFile(
    join(root, "scripts", "start-railway-api.mjs"),
    [
      'import { boot } from "../server/runtime-bridge.ts";',
      "export { boot };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server", "runtime-bridge.ts"),
    [
      'import { dormant } from "./platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";',
      "export const boot = dormant;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );
  await writeFile(
    join(root, "worker", "index.ts"),
    [
      'import { dormant } from "../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      "export const worker = dormant;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "scripts/start-railway-api.mjs",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("blocks orphan importers of dormant attested modules", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-orphan-importer-",
  );
  await writeFile(
    join(root, "server/orphan-bridge.ts"),
    [
      'import { dormant } from "./operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      "export { dormant };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "server/orphan-bridge.ts",
    },
  ]);
});

test("scans scripts and root importers with one exact offline-verifier exception", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-script-importers-",
  );
  const cutoverPath = join(
    root,
    "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
  );
  const repositoryPath = join(
    root,
    "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
  );
  await writeFile(
    cutoverPath,
    "export const dormant = true;\n",
  );
  await writeFile(
    repositoryPath,
    "export const dormant = true;\n",
  );
  await writeFile(
    join(root, "scripts/orphan.mjs"),
    [
      'import { dormant } from "../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      "export { dormant };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "scripts/nonliteral.mjs"),
    [
      'const target = "../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      "export const dormant = (0, require)(target);",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "root-entry.mjs"),
    [
      'import { dormant } from "./server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";',
      "export { dormant };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "scripts/verify-bot-reply-staging-attested-evidence-postgres.mjs",
    ),
    [
      'import { dormant as readiness } from "../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      'import { dormant as read } from "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";',
      "export { readiness, read };",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "root-entry.mjs",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/nonliteral.mjs",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "scripts/orphan.mjs",
    },
  ]);
});

test("blocks a transitive orphan with a non-literal dormant import", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-transitive-nonliteral-",
  );
  await writeFile(
    join(root, "scripts/activate.mjs"),
    [
      'import { activate } from "../server/orphan.ts";',
      "export { activate };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'const target = "./operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      "export const activate = () => import(target);",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "server/orphan.ts",
    },
  ]);
});

test("blocks package conditions and symlink aliases that resolve to dormant modules", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-package-conditions-",
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );
  await writeFile(
    join(root, "shared/safe-contract.d.ts"),
    "export declare const dormant: false;\n",
  );
  await symlink(
    "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    join(root, "dormant-alias.ts"),
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      imports: {
        "#attested/*": {
          types:
            "./shared/safe-contract.d.ts?variant=*",
          default:
            "./dormant-alias.ts?variant=*",
        },
      },
    }),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "package.json",
    },
  ]);
});

test("blocks package-condition wildcards that can resolve to a dormant module", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-package-wildcard-",
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );
  await writeFile(
    join(root, "shared/safe-Read.d.ts"),
    "export declare const dormant: false;\n",
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      imports: {
        "#stage/*": {
          types: "./shared/safe-*.d.ts",
          default:
            "./server/platform/postgresBotReplyStagingAttestedReleaseEvidence*Repository.ts",
        },
      },
    }),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "package.json",
    },
  ]);
});

test("blocks query and fragment imports of dormant modules", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-runtime-query-",
  );
  await writeFile(
    join(root, "scripts/start-railway-api.mjs"),
    [
      'import { dormant } from "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts?runtime#activation";',
      "export const boot = dormant;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "scripts/start-railway-api.mjs",
    },
  ]);
});

test("blocks case-insensitive file URLs and inline data module relays", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-runtime-urls-",
  );
  const repositoryPath = join(
    root,
    "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
  );
  const repositoryUrl = pathToFileURL(
    repositoryPath,
  ).href;
  const uppercaseRepositoryUrl = repositoryUrl.replace(
    /^file:/u,
    "FILE:",
  );
  const relaySource =
    `export { dormant } from ${JSON.stringify(repositoryUrl)};`;
  const relayUrl =
    `data:text/javascript,${encodeURIComponent(relaySource)}`;
  await writeFile(
    join(root, "scripts/start-railway-api.mjs"),
    [
      `import { dormant as direct } from ${JSON.stringify(`${uppercaseRepositoryUrl}?runtime#activation`)};`,
      `import { dormant as relayed } from ${JSON.stringify(relayUrl)};`,
      "export const boot = direct && relayed;",
      "",
    ].join("\n"),
  );
  await writeFile(
    repositoryPath,
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "INLINE_RUNTIME_MODULE_IMPORT_FORBIDDEN",
      file: "scripts/start-railway-api.mjs",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "scripts/start-railway-api.mjs",
    },
  ]);
});

test("normalizes resource suffixes on TypeScript path aliases", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-path-alias-query-",
  );
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@attested": [
            "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
          ],
        },
      },
    }),
  );
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { dormant } from "@attested?runtime#activation";',
      "export { dormant };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "server/orphan.ts",
    },
  ]);
});

test("preserves a leading hash inside TypeScript path aliases", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-double-hash-alias-",
  );
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "##attested": [
            "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
          ],
        },
      },
    }),
  );
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { dormant } from "##attested";',
      "export { dormant };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "server/orphan.ts",
    },
  ]);
});

test("canonicalizes directory symlinks before evaluating dormant imports", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-directory-symlink-",
  );
  await writeFile(
    join(root, "scripts/activate.mjs"),
    [
      'import { activate } from "../server/orphan.ts";',
      "export { activate };",
      "",
    ].join("\n"),
  );
  await symlink(
    "platform",
    join(root, "server/alias"),
    "dir",
  );
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { dormant } from "./alias/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";',
      "export const activate = dormant;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "server/orphan.ts",
    },
  ]);
});

test("canonicalizes package wildcards rooted at directory symlinks", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-package-directory-symlink-",
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );
  await symlink(
    "server/platform",
    join(root, "protected-alias"),
    "dir",
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      imports: {
        "#attested/*": "./protected-alias/*",
      },
    }),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "package.json",
    },
  ]);
});

test("blocks package file symlinks and wildcard-selected directory symlinks", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-package-wildcard-symlinks-",
  );
  const repositoryFileName =
    "postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";
  await mkdir(join(root, "aliases"), {
    recursive: true,
  });
  await writeFile(
    join(root, "server/platform", repositoryFileName),
    "export const dormant = true;\n",
  );
  await symlink(
    join("..", "server", "platform", repositoryFileName),
    join(root, "aliases/prefix-Read.ts"),
  );
  await symlink(
    join("..", "server", "platform"),
    join(root, "aliases/Read"),
    "dir",
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      imports: {
        "#file/*":
          "./aliases/prefix-*.ts?mode=runtime#activation",
        "#directory/*":
          `./aliases/*/${repositoryFileName}?mode=runtime`,
      },
    }),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "package.json",
    },
  ]);
});

test("fails closed for package wildcard symlink chains outside the repository", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-package-external-chain-",
  );
  const externalDirectory = await mkdtemp(
    join(tmpdir(), "connect-external-package-alias-"),
  );
  const repositoryPath = join(
    root,
    "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
  );
  await mkdir(join(root, "aliases"), {
    recursive: true,
  });
  await writeFile(
    repositoryPath,
    "export const dormant = true;\n",
  );
  await symlink(
    externalDirectory,
    join(root, "aliases/outside"),
    "dir",
  );
  await symlink(
    repositoryPath,
    join(externalDirectory, "prefix-Read.ts"),
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      imports: {
        "#attested/*":
          "./aliases/outside/prefix-*.ts?mode=runtime#activation",
      },
    }),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
      file: "package.json",
    },
  ]);
});

test("allows type-only references to dormant modules in runtime graphs", async () => {
  const root = await createSourceGuardFixture(
    "connect-dormant-runtime-type-only-",
  );
  await writeFile(
    join(root, "scripts", "start-railway-bullmq-api.mjs"),
    [
      'import type { DormantRead } from "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";',
      "export const boot = 1;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    [
      'import type { LegacyRead } from "../operations/currentProductionReadinessEvidenceSource.ts";',
      "export type DormantRead = LegacyRead;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/operations/currentProductionReadinessEvidenceSource.ts",
    ),
    "export type LegacyRead = { readonly status: \"unavailable\" };\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.equal(report.status, "passed");
  assert.equal(report.runtimeEntriesInspected, 1);
  assert.deepEqual(report.findings, []);
});

test("fails closed for unresolved and non-literal imports in a runtime graph", async () => {
  const root = await createSourceGuardFixture(
    "connect-runtime-graph-fail-closed-",
  );
  await writeFile(
    join(root, "scripts", "start-railway-bullmq-worker.mjs"),
    [
      'import { boot } from "../server/runtime-bridge.ts";',
      "export { boot };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server", "runtime-bridge.ts"),
    [
      'import { missing } from "./missing.ts";',
      'const target = "./later.ts";',
      "export const load = () => import(target);",
      "export const boot = missing;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/start-railway-bullmq-worker.mjs",
    },
    {
      code: "RUNTIME_LOCAL_IMPORT_UNRESOLVED",
      file: "scripts/start-railway-bullmq-worker.mjs",
    },
  ]);
});

test("blocks dormant attested modules from direct or transitive v1 evidence reads", async () => {
  const root = await createSourceGuardFixture(
    "connect-attested-v1-dependency-",
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    [
      'import { legacy } from "./currentProductionReadinessEvidenceSource.ts";',
      "export const dormant = legacy;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/operations/currentProductionReadinessEvidenceSource.ts",
    ),
    "export const legacy = true;\n",
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    [
      'import { legacy } from "./attested-read-bridge.ts";',
      "export const dormant = legacy;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server/platform/attested-read-bridge.ts"),
    [
      'import { legacy } from "./railwayBotReplyStagingCrossServiceEvidence.ts";',
      "export { legacy };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/railwayBotReplyStagingCrossServiceEvidence.ts",
    ),
    "export const legacy = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_V1_DEPENDENCY_FORBIDDEN",
      file:
        "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file:
        "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    },
  ]);
});

test("requires botReplyDeliveryAdapter to remain an AST literal false", async () => {
  const root = await createSourceGuardFixture(
    "connect-bot-reply-implementation-flag-",
  );
  const stateFile = join(
    root,
    "server/operations/productionImplementationState.ts",
  );
  const canonicalStateSource = await readFile(
    new URL(
      "../server/operations/productionImplementationState.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const invalidStates = [
    [
      "export const unrelatedState = false;",
      "",
    ].join("\n"),
    [
      "const disabled = false;",
      "export const currentProductionImplementationState = Object.freeze({",
      "  botReplyDeliveryAdapter: disabled,",
      "});",
      "",
    ].join("\n"),
    [
      "export const currentProductionImplementationState = Object.freeze({",
      "  botReplyDeliveryAdapter: true,",
      "});",
      "",
    ].join("\n"),
    [
      "export const currentProductionImplementationState = Object.freeze({",
      "  botReplyDeliveryAdapter: false,",
      "  ...{ botReplyDeliveryAdapter: true },",
      "});",
      "",
    ].join("\n"),
    [
      "const Object = { freeze: (value) => value };",
      "export const currentProductionImplementationState = Object.freeze({",
      "  botReplyDeliveryAdapter: false,",
      "});",
      "",
    ].join("\n"),
    [
      'import Object from "./object-shim.ts";',
      "export const currentProductionImplementationState = Object.freeze({",
      "  botReplyDeliveryAdapter: false,",
      "});",
      "",
    ].join("\n"),
    [
      "Object.freeze = (value) => value;",
      "export const currentProductionImplementationState = Object.freeze({",
      "  botReplyDeliveryAdapter: false,",
      "});",
      "",
    ].join("\n"),
    [
      'globalThis["Object"].freeze = (value) => value;',
      "export const currentProductionImplementationState = Object.freeze({",
      "  botReplyDeliveryAdapter: false,",
      "});",
      "",
    ].join("\n"),
    [
      "export const currentProductionImplementationState = Object.freeze({",
      "  botReplyDeliveryAdapter: false,",
      "  botReplyDeliveryAdapter: false,",
      "});",
      "",
    ].join("\n"),
  ];
  invalidStates.push(
    canonicalStateSource.replace(
      ":\n  ProductionImplementationState =",
      " =",
    ),
    canonicalStateSource.replace(
      "  dataRetentionPolicy: false,\n",
      "",
    ),
    canonicalStateSource.replace(
      "  dataRetentionPolicy: boolean;",
      "  dataRetentionPolicy: string;",
    ),
    canonicalStateSource.replace(
      "  dataRetentionPolicy: false,",
      [
        "  dataRetentionPolicy: false,",
        "  unsupportedCapability: false,",
      ].join("\n"),
    ),
  );

  for (const source of invalidStates) {
    await writeFile(stateFile, source);
    const report = await inspectSourceGuardrails(root);
    assert.deepEqual(report.findings, [
      {
        code:
          "BOT_REPLY_DELIVERY_ADAPTER_LITERAL_FALSE_REQUIRED",
        file:
          "server/operations/productionImplementationState.ts",
      },
    ]);
  }

  await writeFile(
    stateFile,
    canonicalStateSource,
  );
  const report = await inspectSourceGuardrails(root);
  assert.equal(report.status, "passed");
  assert.deepEqual(report.findings, []);
});

test("treats app server components and use-server modules as runtime roots", async () => {
  const root = await createSourceGuardFixture(
    "connect-framework-server-runtime-roots-",
  );
  await mkdir(join(root, "app/admin"), {
    recursive: true,
  });
  await writeFile(
    join(root, "app/admin/page.tsx"),
    [
      'import { dormant } from "../../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      "export default function Page() { return dormant; }",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "app/page.tsx"),
    [
      'import { dormant } from "../server/runtime-bridge.ts";',
      "export default function Page() { return dormant; }",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server/runtime-bridge.ts"),
    [
      'import { dormant } from "./platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";',
      "export { dormant };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server/action.ts"),
    [
      '"use server";',
      'import { dormant } from "./action-bridge.ts";',
      "export async function action() { return dormant; }",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "server/action-bridge.ts"),
    [
      'import { dormant } from "./operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      "export { dormant };",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    "export const dormant = true;\n",
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.equal(report.runtimeEntriesInspected, 3);
  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "app/admin/page.tsx",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "app/page.tsx",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "server/action.ts",
    },
  ]);
});

test("tracks createRequire aliases and module.require while rejecting non-literals", async () => {
  const root = await createSourceGuardFixture(
    "connect-runtime-require-aliases-",
  );
  await Promise.all(
    [
      "bracket",
      "create",
      "dynamic",
      "escape",
      "module",
      "raw",
    ].map(
      (directory) =>
        mkdir(join(root, "app", directory), {
          recursive: true,
        }),
    ),
  );
  await writeFile(
    join(root, "app/bracket/page.tsx"),
    [
      'export const dormant = module["require"](',
      '  "../../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",',
      ");",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "app/create/page.tsx"),
    [
      'import { createRequire as makeRequire } from "node:module";',
      "const returnedRequire = makeRequire(import.meta.url);",
      "const load = returnedRequire;",
      'export const dormant = load("../../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts");',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "app/dynamic/page.tsx"),
    [
      'import Module from "node:module";',
      "const returnedRequire = Module.createRequire(import.meta.url);",
      "const load = returnedRequire;",
      'const target = "../../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";',
      "export const dormant = load(target);",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "app/escape/page.tsx"),
    [
      'import { createRequire } from "node:module";',
      "const holder = { load: createRequire(import.meta.url) };",
      "function selectLoader(value) { return value.load; }",
      "const load = selectLoader(holder);",
      'export const dormant = load("../../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts");',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "app/module/page.tsx"),
    [
      'export const dormant = module.require("../../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts");',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "app/raw/page.tsx"),
    [
      'const target = "../../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";',
      "const load = (0, require);",
      "const holder = { load };",
      "require.call(null, target);",
      "Reflect.apply(require, null, [target]);",
      "const { require: moduleLoad } = module;",
      "moduleLoad.call(module, target);",
      'const key = "require";',
      "module[key](target);",
      'process.getBuiltinModule("module").createRequire(__filename)(target);',
      "module.constructor.createRequire(__filename)(target);",
      "export const dormant = holder.load(target);",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "worker/loader.cjs"),
    [
      'const { createRequire: makeRequire } = require("node:module");',
      "const returnedRequire = makeRequire(__filename);",
      "const load = returnedRequire;",
      'module.exports = load("../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts");',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    "export const dormant = true;\n",
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    "export const dormant = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.equal(report.runtimeEntriesInspected, 7);
  assert.deepEqual(report.findings, [
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "app/bracket/page.tsx",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "app/bracket/page.tsx",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "app/create/page.tsx",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "app/create/page.tsx",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "app/dynamic/page.tsx",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "app/escape/page.tsx",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "app/module/page.tsx",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "app/module/page.tsx",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "app/raw/page.tsx",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "worker/loader.cjs",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/loader.cjs",
    },
  ]);
});

test("blocks path aliases and mutation dependencies outside the dormant allowlist", async () => {
  const root = await createSourceGuardFixture(
    "connect-attested-closure-alias-",
  );
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@attested-v2": [
            "server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts",
          ],
        },
      },
    }),
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    [
      'import { evidence } from "@attested-v2";',
      "export const dormant = evidence;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts",
    ),
    "export const evidence = true;\n",
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    [
      'import { mutate } from "./postgresBotReplyStagingAttestedReleaseEvidenceRepository.ts";',
      "export const dormant = mutate;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceRepository.ts",
    ),
    "export const mutate = true;\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file:
        "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file:
        "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    },
  ]);
});

test("blocks new dependencies anywhere in the dormant attested closure", async () => {
  const root = await createSourceGuardFixture(
    "connect-attested-closure-egress-",
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    [
      'import { evidence } from "../platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";',
      "export const dormant = evidence;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts",
    ),
    [
      'import { readFile } from "node:fs";',
      "export const evidence = readFile;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file:
        "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    },
  ]);
});

test("fails closed for non-literal and unresolved dormant dependencies", async () => {
  const root = await createSourceGuardFixture(
    "connect-attested-closure-fail-closed-",
  );
  await writeFile(
    join(
      root,
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    ),
    [
      'const target = "../platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";',
      "export const dormant = () => import(target);",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(
      root,
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    ),
    [
      'import { evidence } from "./railwayBotReplyStagingAttestedReleaseEvidence.ts";',
      "export const dormant = evidence;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file:
        "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file:
        "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
    },
  ]);
});

test("fails closed when the bot reply implementation-state file is missing", async () => {
  const root = await createSourceGuardFixture(
    "connect-bot-reply-state-missing-",
  );

  const report = await inspectSourceGuardrailsRaw(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_DELIVERY_ADAPTER_LITERAL_FALSE_REQUIRED",
      file:
        "server/operations/productionImplementationState.ts",
    },
  ]);
});
