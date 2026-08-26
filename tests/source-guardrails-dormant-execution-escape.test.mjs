import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  inspectSourceGuardrails,
} from "../scripts/verify-source-guardrails.mjs";

const implementationStateSource = await readFile(
  new URL(
    "../server/operations/productionImplementationState.ts",
    import.meta.url,
  ),
  "utf8",
);

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
      mkdir(join(root, directory), {
        recursive: true,
      })
    ),
  );
  await writeFile(
    join(
      root,
      "server/operations/productionImplementationState.ts",
    ),
    implementationStateSource,
  );
  return root;
}

test("blocks indirect eval and Function capabilities in scripts while respecting lexical shadows", async () => {
  const root = await createFixture(
    "connect-execution-capability-aliases-",
  );
  await Promise.all([
    writeFile(
      join(root, "scripts/eval-alias.mjs"),
      [
        "const execute = (0, eval);",
        "export const retained = execute;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/function-alias.mjs"),
      [
        'const Constructor = globalThis["Function"];',
        "export const retained = Constructor.bind(globalThis);",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/global-object-alias.mjs"),
      [
        "const host = globalThis;",
        "const forwardedHost = host;",
        'export const retained = forwardedHost["eval"];',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/ambient-eval.ts"),
      [
        "declare const eval: (source: string) => unknown;",
        "export const retained = eval;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/shadowed-lookalikes.ts"),
      [
        "export type Callback = Function;",
        "export function inspect(eval: () => number, Function: () => number) {",
        "  const lookalike = { eval, Function };",
        "  return [lookalike.eval(), lookalike.Function()];",
        "}",
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/ambient-eval.ts",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/eval-alias.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/function-alias.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/global-object-alias.mjs",
    },
  ]);
});

test("blocks vm through ESM, CommonJS, and process loader capabilities", async () => {
  const root = await createFixture(
    "connect-execution-capability-vm-",
  );
  await Promise.all([
    writeFile(
      join(root, "scripts/vm-esm.mjs"),
      [
        'import { runInThisContext as execute } from "node:vm";',
        "export const retained = execute;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/vm-process.mjs"),
      [
        'const runtime = process.getBuiltinModule("vm");',
        "export const retained = runtime;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/vm-require.cjs"),
      [
        'const runtime = require("node:vm");',
        "module.exports = runtime;",
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "VM_RUNTIME_EXECUTION_FORBIDDEN",
      file: "scripts/vm-esm.mjs",
    },
    {
      code: "VM_RUNTIME_EXECUTION_FORBIDDEN",
      file: "scripts/vm-process.mjs",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/vm-process.mjs",
    },
    {
      code: "VM_RUNTIME_EXECUTION_FORBIDDEN",
      file: "scripts/vm-require.cjs",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/vm-require.cjs",
    },
  ]);
});

test("blocks Node module loaders without confusing safe named imports or local lookalikes", async () => {
  const root = await createFixture(
    "connect-execution-capability-loaders-",
  );
  await Promise.all([
    writeFile(
      join(root, "scripts/create-require.mjs"),
      [
        'import { createRequire as makeRequire } from "node:module";',
        "const load = makeRequire(import.meta.url);",
        "export const retained = load;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/global-module.cjs"),
      [
        'const load = module["require"];',
        "module.exports = load;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/register-hooks.mjs"),
      [
        'import { registerHooks as install } from "node:module";',
        "export const retained = install;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/safe-builtin-list.mjs"),
      [
        'import { builtinModules } from "node:module";',
        "export const retained = builtinModules.length;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/shadowed-loaders.mjs"),
      [
        "export function inspect(require, module) {",
        "  return [require.value, module.require];",
        "}",
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/create-require.mjs",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/global-module.cjs",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/register-hooks.mjs",
    },
  ]);
});

test("blocks global-object, constructor, computed-key, and process-alias execution escapes", async () => {
  const root = await createFixture(
    "connect-execution-capability-derived-aliases-",
  );
  await Promise.all([
    writeFile(
      join(root, "scripts/assignment-alias.mjs"),
      [
        "let host;",
        "host = globalThis;",
        "export const execute = host.eval;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/bound-constructor-function.mjs"),
      [
        "export const execute = (() => {}).bind(null).constructor;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/comma-global.mjs"),
      [
        "export const execute = (0, globalThis).eval;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/computed-global.mjs"),
      [
        'export const execute = globalThis["ev" + "al"];',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/computed-process.mjs"),
      [
        'export const load = process["get" + "BuiltinModule"]("vm");',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/constructor-function.mjs"),
      [
        "export const execute = (() => {}).constructor;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/global-chain.mjs"),
      [
        "export const execute = globalThis.globalThis.eval;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/global-process.mjs"),
      [
        'export const load = globalThis.process.getBuiltinModule("vm");',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/object-constructor-chain.mjs"),
      [
        "export const execute = ({}).constructor.constructor;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/process-alias.mjs"),
      [
        "const runtimeProcess = process;",
        'export const load = runtimeProcess.getBuiltinModule("vm");',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/reflect-global.mjs"),
      [
        'export const execute = Reflect.get(globalThis, "eval");',
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/assignment-alias.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/bound-constructor-function.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/comma-global.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/computed-global.mjs",
    },
    {
      code: "VM_RUNTIME_EXECUTION_FORBIDDEN",
      file: "scripts/computed-process.mjs",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/computed-process.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/constructor-function.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/global-chain.mjs",
    },
    {
      code: "VM_RUNTIME_EXECUTION_FORBIDDEN",
      file: "scripts/global-process.mjs",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/global-process.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/object-constructor-chain.mjs",
    },
    {
      code: "VM_RUNTIME_EXECUTION_FORBIDDEN",
      file: "scripts/process-alias.mjs",
    },
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/process-alias.mjs",
    },
    {
      code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
      file: "scripts/reflect-global.mjs",
    },
  ]);
});

test("keeps binder-derived runtime shadows distinct from erased declarations", async () => {
  const root = await createFixture(
    "connect-execution-capability-binder-shadows-",
  );
  await writeFile(
    join(root, "scripts/runtime-shadows.ts"),
    [
      "const callable = function Function() {",
      "  return Function;",
      "};",
      "const Constructor = class Function {",
      "  static retain() { return Function; }",
      "};",
      "export function inspect(process: { getBuiltinModule: () => string }, Reflect: { get: () => string }) {",
      "  return [process.getBuiltinModule(), Reflect.get()];",
      "}",
      "export { callable, Constructor };",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("treats the implicit CommonJS module object as a loader capability", async () => {
  const root = await createFixture(
    "connect-execution-capability-commonjs-module-",
  );
  await writeFile(
    join(root, "scripts/commonjs-export.cjs"),
    "module.exports = Object.freeze({ ok: true });\n",
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
      file: "scripts/commonjs-export.cjs",
    },
  ]);
});

test("blocks dormant credential-bound SQL references across every runtime root", async () => {
  const root = await createFixture(
    "connect-credential-bound-sql-runtime-",
  );
  await Promise.all([
    writeFile(
      join(root, "db/acquire-capability.ts"),
      [
        "export const acquireSql =",
        '  "SELECT * FROM public.acquire_bot_reply_staging_pre_send_" +',
        '  "session_barrier_v1($1)";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "db/prove-capability.ts"),
      [
        "export const proveSql =",
        '  "SELECT * FROM public.prove_bot_reply_staging_pre_send_session_barrier_v1($1)";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "server/operations/template-capability.ts"),
      [
        "export const acquireSql =",
        '  `SELECT * FROM public.${"acquire_bot_reply_staging_pre_send_session_barrier_v1"}($1)`;',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "worker/release-capability.ts"),
      [
        "export const releaseSql =",
        '  "SELECT * FROM public.release_bot_reply_staging_pre_send_session_barrier_v1($1)";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "worker/consume-capability.ts"),
      [
        "export const consumeSql =",
        '  "SELECT * FROM public.consume_bot_reply_staging_credential_bound_pre_send_permit_v1($1)";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "proxy.ts"),
      [
        "export const finalizeSql =",
        '  "SELECT * FROM public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1($1)";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "middleware.ts"),
      [
        "export const reconcileSql =",
        '  "SELECT * FROM public.reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1($1)";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/start-railway-api.mjs"),
      [
        "export const bindingLedger =",
        '  "bot_reply_staging_credential_provider_request_bindings";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/start-railway-bullmq-api.mjs"),
      [
        "export const uncertaintyLedger =",
        '  "bot_reply_staging_provider_uncertainty_events";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/start-railway-bullmq-worker.mjs"),
      [
        "export const boundaryLedger =",
        '  "bot_reply_staging_provider_boundary_claims";',
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "db/acquire-capability.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "db/prove-capability.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "middleware.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "proxy.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "scripts/start-railway-api.mjs",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "scripts/start-railway-bullmq-api.mjs",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "scripts/start-railway-bullmq-worker.mjs",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "server/operations/template-capability.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "worker/consume-capability.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "worker/release-capability.ts",
    },
  ]);
});

test("allows dormant credential-bound SQL only in exact verifiers", async () => {
  const root = await createFixture(
    "connect-credential-bound-sql-verifiers-",
  );
  await Promise.all([
    writeFile(
      join(
        root,
        "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres.mjs",
      ),
      [
        "export const capabilitySql = Object.freeze([",
        '  "acquire_bot_reply_staging_pre_send_session_barrier_v1",',
        '  "prove_bot_reply_staging_pre_send_session_barrier_v1",',
        '  "release_bot_reply_staging_pre_send_session_barrier_v1",',
        '  "consume_bot_reply_staging_credential_bound_pre_send_permit_v1",',
        '  "finalize_bot_reply_staging_credential_bound_pre_send_permit_v1",',
        '  "reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1",',
        "]);",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/verify-postgres-migration-contract.mjs"),
      [
        "export const ledgerNames = Object.freeze([",
        '  "bot_reply_staging_credential_provider_request_bindings",',
        '  "bot_reply_staging_provider_uncertainty_events",',
        '  "bot_reply_staging_provider_boundary_claims",',
        "]);",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "worker/comment-only.ts"),
      [
        "// prove_bot_reply_staging_pre_send_session_barrier_v1 is documented here only.",
        "export const safe = true;",
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("rejects credential-bound SQL in verifier allowlist path lookalikes", async () => {
  const root = await createFixture(
    "connect-credential-bound-sql-verifier-lookalike-",
  );
  await writeFile(
    join(
      root,
      "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres-copy.mjs",
    ),
    [
      "export const capabilitySql =",
      '  "acquire_bot_reply_staging_pre_send_session_barrier_v1";',
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file:
        "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres-copy.mjs",
    },
  ]);
});
