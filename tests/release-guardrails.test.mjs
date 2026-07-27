import assert from "node:assert/strict";
import test from "node:test";

import {
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

test("detects a server secret identifier in a client module", async () => {
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

  await writeFile(
    join(root, "features", "unsafe.tsx"),
    [
      '"use client";',
      "export const key = process.env.META_APP_SECRET;",
      "",
    ].join("\n"),
  );

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
      file: "features/unsafe.tsx",
    },
  ]);
});

test("scans database and worker source roots", async () => {
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

  const report =
    await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "RANDOMNESS_FORBIDDEN",
      file: "db/unsafe.ts",
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
