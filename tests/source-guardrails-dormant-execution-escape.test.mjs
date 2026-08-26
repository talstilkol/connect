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
      "postgres/migrations",
      "tests",
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

test("blocks every dormant D1e writer-barrier identifier in runtime code", async () => {
  const root = await createFixture(
    "connect-d1e-writer-barrier-runtime-",
  );
  const fixtures = new Map([
    [
      "db/reserve-and-bind.ts",
      "reserve_and_bind_bot_reply_staging_service_reply_v1",
    ],
    [
      "server/operations/write-admission.ts",
      "write_bot_reply_staging_pre_send_admission_v1",
    ],
    [
      "server/platform/write-provider-fact.ts",
      "write_bot_reply_staging_provider_fact_v1",
    ],
    [
      "worker/write-provider-uncertainty.ts",
      "write_bot_reply_staging_provider_uncertainty_v1",
    ],
    [
      "proxy.ts",
      "assert_bot_reply_staging_tenant_barrier_owned_v1",
    ],
    [
      "middleware.ts",
      "assert_bot_reply_staging_exact_session_barrier_v1",
    ],
    [
      "scripts/start-railway-api.mjs",
      "bot_reply_staging_service_reply_scope_bindings",
    ],
  ]);
  await Promise.all(
    [...fixtures].map(([file, identifier]) =>
      writeFile(
        join(root, file),
        `export const dormantSql = "${identifier}";\n`,
      )
    ),
  );

  const report = await inspectSourceGuardrails(root);
  const findings = [...report.findings]
    .filter(
      ({ code }) =>
        code ===
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
    )
    .sort((left, right) => left.file.localeCompare(right.file));

  assert.deepEqual(
    findings,
    [...fixtures.keys()]
      .sort((left, right) => left.localeCompare(right))
      .map((file) => ({
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file,
      })),
  );
});

test("blocks D1e literal, template, alias, indirection, and allowed-verifier importer escapes", async () => {
  const root = await createFixture(
    "connect-d1e-writer-barrier-escapes-",
  );
  await Promise.all([
    writeFile(
      join(root, "server/platform/literal.ts"),
      [
        "export const capability =",
        '  "write_bot_reply_staging_provider_fact_v1";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "server/operations/template.ts"),
      [
        'const prefix = "write_bot_reply_staging_";',
        'const suffix = "provider_uncertainty_v1";',
        "export const capability = `${prefix}${suffix}`;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "db/alias.ts"),
      [
        'const prefix = "reserve_and_bind_bot_reply_staging_";',
        'const suffix = "service_reply_v1";',
        "const assembled = prefix + suffix;",
        "const alias = assembled;",
        "export const capability = alias;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "worker/indirection.ts"),
      [
        "const fragments = Object.freeze({",
        '  prefix: "assert_bot_reply_staging_",',
        '  suffix: "exact_session_barrier_v1",',
        "});",
        "export const capability =",
        "  fragments.prefix + fragments.suffix;",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(
        root,
        "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres.mjs",
      ),
      [
        "export const admissionWriter =",
        '  "write_bot_reply_staging_pre_send_admission_v1";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "server/operations/importer.ts"),
      [
        "import { admissionWriter } from",
        '  "../../scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres.mjs";',
        "export const activatedCapability = admissionWriter;",
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);
  const findings = [...report.findings]
    .filter(
      ({ code }) =>
        code ===
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
    )
    .sort((left, right) => left.file.localeCompare(right.file));

  assert.deepEqual(findings, [
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "db/alias.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "server/operations/importer.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "server/operations/template.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "server/platform/literal.ts",
    },
    {
      code:
        "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
      file: "worker/indirection.ts",
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
        '  "reserve_and_bind_bot_reply_staging_service_reply_v1",',
        '  "write_bot_reply_staging_pre_send_admission_v1",',
        '  "write_bot_reply_staging_provider_fact_v1",',
        '  "write_bot_reply_staging_provider_uncertainty_v1",',
        '  "assert_bot_reply_staging_tenant_barrier_owned_v1",',
        '  "assert_bot_reply_staging_exact_session_barrier_v1",',
        '  "bot_reply_staging_service_reply_scope_bindings",',
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
        '  "reserve_and_bind_bot_reply_staging_service_reply_v1",',
        '  "write_bot_reply_staging_pre_send_admission_v1",',
        '  "write_bot_reply_staging_provider_fact_v1",',
        '  "write_bot_reply_staging_provider_uncertainty_v1",',
        '  "assert_bot_reply_staging_tenant_barrier_owned_v1",',
        '  "assert_bot_reply_staging_exact_session_barrier_v1",',
        '  "bot_reply_staging_service_reply_scope_bindings",',
        "]);",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(
        root,
        "postgres/migrations/0057_bot_reply_staging_writer_barrier_and_late_truth.sql",
      ),
      [
        "CREATE FUNCTION public.write_bot_reply_staging_provider_fact_v1()",
        "RETURNS VOID LANGUAGE SQL AS 'SELECT NULL';",
        "-- bot_reply_staging_service_reply_scope_bindings",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "postgres/postgresMigrationParityRegistry.mjs"),
      [
        "export const evidence =",
        '  "reserve_and_bind_bot_reply_staging_service_reply_v1";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(
        root,
        "tests/bot-reply-staging-writer-barrier-and-late-truth-migration.test.mjs",
      ),
      [
        "export const expectedWriter =",
        '  "write_bot_reply_staging_provider_fact_v1";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(
        root,
        "tests/bot-reply-staging-credential-bound-pre-send-session-barrier-postgres-verifier.test.mjs",
      ),
      [
        "export const expectedWriter =",
        '  "write_bot_reply_staging_provider_uncertainty_v1";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "tests/postgres-migration-contract.test.mjs"),
      [
        "export const expectedLedger =",
        '  "bot_reply_staging_service_reply_scope_bindings";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "tests/postgres-migration-parity.test.mjs"),
      [
        "import { evidence } from",
        '  "../postgres/postgresMigrationParityRegistry.mjs";',
        "export { evidence };",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(
        root,
        "tests/postgres-data-migration-slice-registry.test.mjs",
      ),
      [
        "import { evidence } from",
        '  "../postgres/postgresMigrationParityRegistry.mjs";',
        "export { evidence };",
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
  await Promise.all([
    writeFile(
      join(
        root,
        "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres-copy.mjs",
      ),
      [
        "export const capabilitySql =",
        '  "acquire_bot_reply_staging_pre_send_session_barrier_v1";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(
        root,
        "postgres/migrations/0057_bot_reply_staging_writer_barrier_and_late_truth-copy.sql",
      ),
      "SELECT public.write_bot_reply_staging_provider_fact_v1();\n",
    ),
    writeFile(
      join(
        root,
        "postgres/postgresMigrationParityRegistry-copy.mjs",
      ),
      [
        "export const evidence =",
        '  "reserve_and_bind_bot_reply_staging_service_reply_v1";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(
        root,
        "tests/bot-reply-staging-credential-bound-pre-send-session-barrier-postgres-verifier-copy.test.mjs",
      ),
      [
        "export const capabilitySql =",
        '  "write_bot_reply_staging_provider_uncertainty_v1";',
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(
    [...report.findings].sort((left, right) =>
      left.file.localeCompare(right.file)
    ),
    [
      {
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file:
          "postgres/migrations/0057_bot_reply_staging_writer_barrier_and_late_truth-copy.sql",
      },
      {
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file:
          "postgres/postgresMigrationParityRegistry-copy.mjs",
      },
      {
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file:
          "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres-copy.mjs",
      },
      {
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file:
          "tests/bot-reply-staging-credential-bound-pre-send-session-barrier-postgres-verifier-copy.test.mjs",
      },
    ],
  );
});

test("allows only the two reviewed D1e writers in the pinned runtime transport", async () => {
  const root = await createFixture(
    "connect-d1e-pinned-transport-forbidden-",
  );
  await writeFile(
    join(
      root,
      "server/platform/nodePostgresBotReplyPinnedSessionTransport.ts",
    ),
    [
      "export const forbiddenWriter =",
      '  "write_bot_reply_staging_pre_send_admission_v1";',
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.equal(
    report.findings.some(
      ({ code, file }) =>
        code ===
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN" &&
        file ===
          "server/platform/nodePostgresBotReplyPinnedSessionTransport.ts",
    ),
    true,
  );
});

test("quarantines direct legacy Bot Reply execution from every Worker runtime", async () => {
  const root = await createFixture(
    "connect-legacy-bot-reply-direct-runtime-",
  );
  await Promise.all([
    writeFile(
      join(
        root,
        "server/platform/railwayBotReplyStagingProviderDriverFactory.ts",
      ),
      [
        "export interface LegacyFactoryContract { readonly enabled: true }",
        "export function createRailwayBotReplyStagingProviderDriverFactory() {",
        "  return Object.freeze({ enabled: true });",
        "}",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "worker/index.ts"),
      [
        "import {",
        "  createRailwayBotReplyStagingProviderDriverFactory,",
        '} from "../server/platform/railwayBotReplyStagingProviderDriverFactory.ts";',
        "export const forbiddenRuntime =",
        "  createRailwayBotReplyStagingProviderDriverFactory();",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "server/type-consumer.ts"),
      [
        "import type {",
        "  LegacyFactoryContract,",
        '} from "./platform/railwayBotReplyStagingProviderDriverFactory.ts";',
        "export type SafeTypeOnlyReference = LegacyFactoryContract;",
        "",
      ].join("\n"),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_LEGACY_EXECUTION_RUNTIME_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("quarantines a literal dynamic legacy import from an API runtime", async () => {
  const root = await createFixture(
    "connect-legacy-bot-reply-dynamic-api-runtime-",
  );
  await Promise.all([
    writeFile(
      join(root, "server/platform/railwayBotReplyRuntime.ts"),
      "export const legacyBotReplyRuntime = Object.freeze({});\n",
    ),
    writeFile(
      join(root, "server/api-legacy-loader.ts"),
      [
        "export async function loadLegacyMetaAdapter() {",
        '  return import("./platform/railwayBotReplyRuntime.ts");',
        "}",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "scripts/start-railway-api.mjs"),
      'import "../server/api-legacy-loader.ts";\n',
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_LEGACY_EXECUTION_RUNTIME_FORBIDDEN",
      file: "scripts/start-railway-api.mjs",
    },
  ]);
});

test("quarantines a legacy Bot Reply execution path through two runtime bridges", async () => {
  const root = await createFixture(
    "connect-legacy-bot-reply-transitive-runtime-",
  );
  await Promise.all([
    writeFile(
      join(
        root,
        "server/operations/botReplyStagingScenarioExecutor.ts",
      ),
      "export const legacyScenarioExecutor = Object.freeze({});\n",
    ),
    writeFile(
      join(root, "server/bridge-two.ts"),
      [
        "export { legacyScenarioExecutor } from",
        '  "./operations/botReplyStagingScenarioExecutor.ts";',
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "server/bridge-one.ts"),
      'export { legacyScenarioExecutor } from "./bridge-two.ts";\n',
    ),
    writeFile(
      join(root, "scripts/start-railway-bullmq-worker.mjs"),
      'import "../server/bridge-one.ts";\n',
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_LEGACY_EXECUTION_RUNTIME_FORBIDDEN",
      file: "scripts/start-railway-bullmq-worker.mjs",
    },
  ]);
});

test("quarantines legacy Bot Reply execution reached only by a production package script", async () => {
  const root = await createFixture(
    "connect-legacy-bot-reply-package-runtime-",
  );
  await Promise.all([
    writeFile(
      join(
        root,
        "server/platform/railwayBullMqBotReplyStagingQueue.ts",
      ),
      "export const legacyBotReplyQueue = Object.freeze({});\n",
    ),
    writeFile(
      join(root, "scripts/legacy-bot-reply-start.mjs"),
      'import "../server/platform/railwayBullMqBotReplyStagingQueue.ts";\n',
    ),
    writeFile(
      join(root, "package.json"),
      JSON.stringify({
        scripts: {
          "start:legacy-bot-reply":
            "node scripts/legacy-bot-reply-start.mjs",
        },
      }),
    ),
  ]);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_LEGACY_EXECUTION_PACKAGE_FORBIDDEN",
      file:
        "server/platform/railwayBullMqBotReplyStagingQueue.ts",
    },
  ]);
});
