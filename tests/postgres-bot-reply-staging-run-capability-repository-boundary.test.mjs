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

const repositoryPath =
  "server/platform/postgresBotReplyStagingRunCapabilityRepository.ts";
const portsPath =
  "server/operations/botReplyStagingRunCapabilityPorts.ts";

const exactPortsSource = await readFile(
  new URL(
    "../server/operations/botReplyStagingRunCapabilityPorts.ts",
    import.meta.url,
  ),
  "utf8",
);

const exactRepositorySource = [
  'import { createHash } from "node:crypto";',
  'import { types as nodeUtilTypes } from "node:util";',
  'import { deriveBotReplyStagingReceiptDigest } from "../operations/botReplyStagingReceiptAttestation.ts";',
  'import type { BotReplyStagingRunApiCapabilityPort } from "../operations/botReplyStagingRunCapabilityPorts.ts";',
  'import { requirePostgresRows } from "./postgresResultValidation.ts";',
  'import type { PostgresQueryExecutor } from "./postgresTransaction.ts";',
  'export const dormantOnly = createHash("sha256").update("dormant", "utf8").digest("hex").length === 64 ||',
  "  nodeUtilTypes.isProxy({}) ||",
  "  typeof deriveBotReplyStagingReceiptDigest === \"function\" ||",
  "  typeof requirePostgresRows === \"function\";",
  "export type DormantExecutor = PostgresQueryExecutor;",
  "export type DormantApi = BotReplyStagingRunApiCapabilityPort;",
  "",
].join("\n");

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
  await Promise.all([
    writeFile(
      join(
        root,
        "server/operations/botReplyStagingReceiptAttestation.ts",
      ),
      "export function deriveBotReplyStagingReceiptDigest() { return 'sha256:'; }\n",
    ),
    writeFile(join(root, portsPath), exactPortsSource),
    writeFile(
      join(root, "server/platform/postgresResultValidation.ts"),
      "export function requirePostgresRows() { return []; }\n",
    ),
    writeFile(
      join(root, "server/platform/postgresTransaction.ts"),
      "export interface PostgresQueryExecutor { query(): Promise<unknown>; }\n",
    ),
    writeFile(join(root, repositoryPath), exactRepositorySource),
  ]);
  return root;
}

test("keeps the real staging-run capability repository present and dormant", async () => {
  const [source, ports] = await Promise.all([
    readFile(
      new URL(
        "../server/platform/postgresBotReplyStagingRunCapabilityRepository.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../server/operations/botReplyStagingRunCapabilityPorts.ts",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(source, /public\.claim_bot_reply_staging_run_v1/);
  assert.match(source, /public\.read_bot_reply_staging_run_v1/);
  assert.match(source, /public\.complete_bot_reply_staging_run_v1/);
  assert.doesNotMatch(
    source,
    /\bINSERT\s+INTO\b|\bUPDATE\s+(?:public\.)?[a-z_]+\b|\bDELETE\s+FROM\b|\bFOR\s+UPDATE\b|\bbot_reply_staging_runs\b/i,
  );
  assert.doesNotMatch(
    source,
    /botReplyStagingDurableRunner|QueueConsumer|QueuedExecutor|railwayPostgres(?:ApiRuntime|WorkerService|Foundation)/,
  );
  assert.match(
    source,
    /createPostgresBotReplyStagingRunApiCapabilityRepository/,
  );
  assert.match(
    source,
    /createPostgresBotReplyStagingRunWorkerCapabilityRepository/,
  );
  assert.doesNotMatch(
    source,
    /createPostgresBotReplyStagingRunCapabilityRepository/,
  );
  assert.match(
    ports,
    /BotReplyStagingRunApiCapabilityPort[\s\S]*BotReplyStagingRunWorkerCapabilityPort/,
  );
  assert.doesNotMatch(
    ports,
    /\b(?:const|function|class|enum|namespace)\b|from\s+["']/,
  );
});

test("allows only the exact dormant staging-run capability closure", async () => {
  const root = await createFixture("connect-staging-run-capability-clean-");

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("allows API and Worker to depend on their ports as types only", async () => {
  const root = await createFixture("connect-staging-run-capability-types-");
  await writeFile(
    join(root, "app/typeConsumer.ts"),
    [
      'import type { BotReplyStagingRunApiCapabilityPort } from "../server/operations/botReplyStagingRunCapabilityPorts.ts";',
      "export type ApiCapability = BotReplyStagingRunApiCapabilityPort;",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import type { BotReplyStagingRunWorkerCapabilityPort } from "../server/operations/botReplyStagingRunCapabilityPorts.ts";',
      "export type WorkerCapability = BotReplyStagingRunWorkerCapabilityPort;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks a runtime import of the type-only capability ports", async () => {
  const root = await createFixture(
    "connect-staging-run-capability-port-runtime-",
  );
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import "../server/operations/botReplyStagingRunCapabilityPorts.ts";',
      "export const activation = true;",
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

test("blocks an API runtime import of the type-only capability ports", async () => {
  const root = await createFixture(
    "connect-staging-run-capability-port-api-runtime-",
  );
  await writeFile(
    join(root, "app/runtime.ts"),
    [
      'import "../server/operations/botReplyStagingRunCapabilityPorts.ts";',
      "export const activation = true;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "app/runtime.ts",
    },
  ]);
});

test("blocks runtime declarations inside the type-only capability ports", async () => {
  const root = await createFixture(
    "connect-staging-run-capability-port-declaration-",
  );
  await writeFile(
    join(root, portsPath),
    `${exactPortsSource}\nexport const runtimeLeak = true;\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_CAPABILITY_PORT_RUNTIME_FORBIDDEN",
      file: portsPath,
    },
  ]);
});

test("blocks complete authority from drifting into the API port", async () => {
  const root = await createFixture(
    "connect-staging-run-capability-port-api-drift-",
  );
  const drifted = exactPortsSource.replace(
    [
      "export type BotReplyStagingRunApiCapabilityPort =",
      "  BotReplyStagingRunClaimCapabilityPort &",
      "  BotReplyStagingRunReadCapabilityPort;",
    ].join("\n"),
    [
      "export type BotReplyStagingRunApiCapabilityPort =",
      "  BotReplyStagingRunClaimCapabilityPort &",
      "  BotReplyStagingRunReadCapabilityPort &",
      "  BotReplyStagingRunCompleteCapabilityPort;",
    ].join("\n"),
  );
  assert.notEqual(drifted, exactPortsSource);
  await writeFile(join(root, portsPath), drifted);

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
      file: portsPath,
    },
  ]);
});

test("blocks external module augmentation of the capability ports", async () => {
  const root = await createFixture(
    "connect-staging-run-capability-port-augmentation-",
  );
  await writeFile(
    join(root, "server/operations/augmentCapabilityPorts.ts"),
    [
      "import type {",
      "  BotReplyStagingRunCompleteInput,",
      "  BotReplyStagingRunCompleteResult,",
      '} from "./botReplyStagingRunCapabilityPorts.ts";',
      'declare module "./botReplyStagingRunCapabilityPorts.ts" {',
      "  interface BotReplyStagingRunApiCapabilityPort {",
      "    complete(",
      "      input: Readonly<BotReplyStagingRunCompleteInput>,",
      "    ): Promise<BotReplyStagingRunCompleteResult>;",
      "  }",
      "}",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code:
        "BOT_REPLY_STAGING_CAPABILITY_PORT_AUGMENTATION_FORBIDDEN",
      file: "server/operations/augmentCapabilityPorts.ts",
    },
  ]);
});

test("blocks a public capability alias that combines API and Worker", async () => {
  const root = await createFixture(
    "connect-staging-run-capability-port-combined-",
  );
  await writeFile(
    join(root, portsPath),
    [
      exactPortsSource,
      "export type CombinedCapabilityPort =",
      "  BotReplyStagingRunApiCapabilityPort &",
      "  BotReplyStagingRunWorkerCapabilityPort;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
      file: portsPath,
    },
  ]);
});

test("blocks runtime activation of the dormant staging-run capability repository", async () => {
  const root = await createFixture("connect-staging-run-capability-runtime-");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { dormantOnly } from "../server/platform/postgresBotReplyStagingRunCapabilityRepository.ts";',
      "export const activation = dormantOnly;",
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

test("blocks transitive runtime activation of the dormant staging-run capability repository", async () => {
  const root = await createFixture(
    "connect-staging-run-capability-transitive-runtime-",
  );
  await writeFile(
    join(root, "server/bridge.ts"),
    [
      'export { dormantOnly } from "./platform/postgresBotReplyStagingRunCapabilityRepository.ts";',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { dormantOnly } from "../server/bridge.ts";',
      "export const activation = dormantOnly;",
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

test("blocks every unapproved importer of the dormant staging-run capability repository", async () => {
  const root = await createFixture("connect-staging-run-capability-orphan-");
  await writeFile(
    join(root, "server/orphan.ts"),
    [
      'import { dormantOnly } from "./platform/postgresBotReplyStagingRunCapabilityRepository.ts";',
      "export { dormantOnly };",
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

test("blocks dependencies outside the dormant staging-run capability allowlist", async () => {
  const root = await createFixture("connect-staging-run-capability-dependency-");
  await writeFile(
    join(root, "server/platform/unexpectedDependency.ts"),
    "export const unexpected = true;\n",
  );
  await writeFile(
    join(root, repositoryPath),
    `${exactRepositorySource}\nimport { unexpected } from "./unexpectedDependency.ts";\nexport { unexpected };\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file: repositoryPath,
    },
  ]);
});

test("blocks dependencies that escape through an allowed closure module", async () => {
  const root = await createFixture("connect-staging-run-capability-egress-");
  await writeFile(
    join(root, "server/platform/unexpectedDependency.ts"),
    "export const unexpected = true;\n",
  );
  await writeFile(
    join(root, "server/platform/postgresResultValidation.ts"),
    [
      'import { unexpected } from "./unexpectedDependency.ts";',
      "export function requirePostgresRows() { return unexpected ? [] : []; }",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file: repositoryPath,
    },
  ]);
});

test("blocks non-literal dynamic imports inside the dormant repository", async () => {
  const root = await createFixture("connect-staging-run-capability-dynamic-");
  await writeFile(
    join(root, repositoryPath),
    `${exactRepositorySource}\nexport async function load(specifier) { return import(specifier); }\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file: repositoryPath,
    },
  ]);
});

test("blocks unresolved local imports inside the dormant repository", async () => {
  const root = await createFixture("connect-staging-run-capability-unresolved-");
  await writeFile(
    join(root, repositoryPath),
    `${exactRepositorySource}\nexport { missing } from "./missingDependency.ts";\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file: repositoryPath,
    },
  ]);
});
