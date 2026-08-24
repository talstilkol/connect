import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
  mkdtemp,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  inspectInterfaceGuardrails,
} from "../scripts/verify-interface-guardrails.mjs";
import {
  inspectDependencyLock,
} from "../scripts/verify-dependency-lock.mjs";
import {
  inspectSourceGuardrails,
} from "../scripts/verify-source-guardrails.mjs";

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

test("requires dependency and invitation evidence attestations only in the production release gate", async () => {
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

  assert.notEqual(conditionalStart, -1);
  assert.ok(
    dependencyAttestationStep > conditionalStart,
  );
  assert.ok(
    browserAttestationStep >
      dependencyAttestationStep,
  );
  assert.ok(readinessStep > browserAttestationStep);
  assert.match(
    source,
    /scripts\/verify-dependency-audit-evidence-attestation\.mjs/,
  );
  assert.match(
    source,
    /scripts\/verify-team-invitation-browser-evidence-attestation\.mjs/,
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

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "CLIENT_NON_LITERAL_RUNTIME_IMPORT_FORBIDDEN",
      file: "features/dynamic-client.ts",
    },
    {
      code:
        "CLIENT_NON_LITERAL_RUNTIME_IMPORT_FORBIDDEN",
      file: "features/require-client.ts",
    },
  ]);
});
