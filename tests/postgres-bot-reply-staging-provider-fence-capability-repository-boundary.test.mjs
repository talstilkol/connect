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

const repositoryPath =
  "server/platform/postgresBotReplyStagingProviderFenceCapabilityRepository.ts";
const portsPath =
  "server/operations/botReplyStagingProviderFenceCapabilityPorts.ts";
const workerCapabilityPath =
  "server/platform/nodePostgresBotReplyStagingProviderFenceWorkerCapability.ts";

const [
  exactPortsSource,
  exactRepositorySource,
  exactWorkerCapabilitySource,
] = await Promise.all([
  readFile(new URL(`../${portsPath}`, import.meta.url), "utf8"),
  readFile(new URL(`../${repositoryPath}`, import.meta.url), "utf8"),
  readFile(new URL(`../${workerCapabilityPath}`, import.meta.url), "utf8"),
]);

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
    writeFile(join(root, portsPath), exactPortsSource),
    writeFile(
      join(root, "server/platform/postgresResultValidation.ts"),
      [
        "export function parsePostgresTimestamp() { return ''; }",
        "export function requirePostgresRows() { return []; }",
        "",
      ].join("\n"),
    ),
    writeFile(
      join(root, "server/platform/postgresTransaction.ts"),
      [
        "export type PostgresParameter = string | number | boolean | null;",
        "export interface PostgresQueryResult<T> { readonly rows: readonly T[]; readonly rowCount: number; }",
        "export interface PostgresQueryExecutor { query<T>(): Promise<PostgresQueryResult<T>>; }",
        "",
      ].join("\n"),
    ),
    writeFile(join(root, repositoryPath), exactRepositorySource),
    writeFile(
      join(root, workerCapabilityPath),
      exactWorkerCapabilitySource,
    ),
  ]);
  return root;
}

test("keeps the real provider-fence repository Worker-only and dormant", async () => {
  const [source, ports] = await Promise.all([
    readFile(new URL(`../${repositoryPath}`, import.meta.url), "utf8"),
    readFile(new URL(`../${portsPath}`, import.meta.url), "utf8"),
  ]);

  assert.match(
    source,
    /public\.reserve_bot_reply_staging_provider_operation_v1/,
  );
  assert.match(
    source,
    /public\.finalize_bot_reply_staging_provider_operation_v1/,
  );
  assert.doesNotMatch(
    source,
    /\bINSERT\s+INTO\b|\bUPDATE\s+(?:public\.)?[a-z_]+\b|\bDELETE\s+FROM\b|\bFOR\s+UPDATE\b/i,
  );
  assert.doesNotMatch(
    source,
    /botReplyStagingProviderDriver|QueueConsumer|QueuedExecutor|railwayPostgres(?:ApiRuntime|WorkerService|Foundation)|fetch\s*\(/,
  );
  assert.match(
    source,
    /createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository/,
  );
  assert.match(source, /committedQueries[\s\S]*queryCommitted/);
  assert.doesNotMatch(source, /\bPostgresQueryExecutor\b/);
  assert.doesNotMatch(
    source,
    /createPostgresBotReplyStagingProviderFence(?:Api|Combined|Capability)Repository/,
  );
  assert.match(
    ports,
    /BotReplyStagingProviderFenceWorkerCapabilityPort\s*=\s*\n\s*BotReplyStagingProviderFenceReserveCapabilityPort\s*&\s*\n\s*BotReplyStagingProviderFenceFinalizeCapabilityPort/,
  );
  assert.doesNotMatch(
    ports,
    /\b(?:const|function|class|enum|namespace)\b|from\s+["']/,
  );
});

test("allows only the exact dormant provider-fence capability closure", async () => {
  const root = await createFixture("connect-provider-fence-clean-");

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("allows Worker to depend on the provider-fence port as a type only", async () => {
  const root = await createFixture("connect-provider-fence-type-only-");
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import type { BotReplyStagingProviderFenceWorkerCapabilityPort } from "../server/operations/botReplyStagingProviderFenceCapabilityPorts.ts";',
      "export type ProviderFence = BotReplyStagingProviderFenceWorkerCapabilityPort;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, []);
});

test("blocks runtime imports of the type-only provider-fence ports", async () => {
  for (const [directory, prefix] of [
    ["app", "../server"],
    ["worker", "../server"],
  ]) {
    const root = await createFixture(
      `connect-provider-fence-port-runtime-${directory}-`,
    );
    await writeFile(
      join(root, directory, "index.ts"),
      [
        `import "${prefix}/operations/botReplyStagingProviderFenceCapabilityPorts.ts";`,
        "export const activation = true;",
        "",
      ].join("\n"),
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(report.findings, [
      {
        code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
        file: `${directory}/index.ts`,
      },
    ]);
  }
});

test("blocks direct and transitive runtime activation of the repository", async () => {
  const directRoot = await createFixture(
    "connect-provider-fence-direct-runtime-",
  );
  await writeFile(
    join(directRoot, "worker/index.ts"),
    [
      'import { createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository } from "../server/platform/postgresBotReplyStagingProviderFenceCapabilityRepository.ts";',
      "export const activation = createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository;",
      "",
    ].join("\n"),
  );
  assert.deepEqual((await inspectSourceGuardrails(directRoot)).findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);

  const transitiveRoot = await createFixture(
    "connect-provider-fence-transitive-runtime-",
  );
  await writeFile(
    join(transitiveRoot, "server/bridge.ts"),
    [
      'export { createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository } from "./platform/postgresBotReplyStagingProviderFenceCapabilityRepository.ts";',
      "",
    ].join("\n"),
  );
  await writeFile(
    join(transitiveRoot, "worker/index.ts"),
    [
      'import { createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository } from "../server/bridge.ts";',
      "export const activation = createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository;",
      "",
    ].join("\n"),
  );
  assert.deepEqual((await inspectSourceGuardrails(transitiveRoot)).findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("blocks direct runtime activation of the committed Worker capability", async () => {
  const root = await createFixture(
    "connect-provider-fence-committed-runtime-",
  );
  await writeFile(
    join(root, "worker/index.ts"),
    [
      'import { createNodePostgresBotReplyStagingProviderFenceWorkerCapability } from "../server/platform/nodePostgresBotReplyStagingProviderFenceWorkerCapability.ts";',
      "export const activation = createNodePostgresBotReplyStagingProviderFenceWorkerCapability;",
      "",
    ].join("\n"),
  );

  assert.deepEqual((await inspectSourceGuardrails(root)).findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
      file: "worker/index.ts",
    },
  ]);
});

test("pins the committed Worker capability to one composite factory export", async () => {
  const root = await createFixture(
    "connect-provider-fence-committed-export-drift-",
  );
  await writeFile(
    join(root, workerCapabilityPath),
    `${exactWorkerCapabilitySource}\nexport const committedQueries = true;\n`,
  );

  assert.deepEqual((await inspectSourceGuardrails(root)).findings, [
    {
      code: "BOT_REPLY_STAGING_CAPABILITY_DRIVER_EXPORT_INVALID",
      file: workerCapabilityPath,
    },
  ]);
});

test("blocks unreviewed runtime dependencies inside the committed Worker capability", async () => {
  const root = await createFixture(
    "connect-provider-fence-committed-dependency-",
  );
  await writeFile(
    join(root, workerCapabilityPath),
    `import { readFile } from "node:fs/promises";\n${exactWorkerCapabilitySource}\nvoid readFile;\n`,
  );

  assert.deepEqual((await inspectSourceGuardrails(root)).findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file: workerCapabilityPath,
    },
  ]);
});

test("blocks dynamic runtime activation of the repository", async () => {
  const root = await createFixture(
    "connect-provider-fence-dynamic-runtime-",
  );
  await writeFile(
    join(root, "worker/index.ts"),
    [
      "export async function activate() {",
      '  return import("../server/platform/postgresBotReplyStagingProviderFenceCapabilityRepository.ts");',
      "}",
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

test("blocks runtime declarations inside the provider-fence ports", async () => {
  const root = await createFixture(
    "connect-provider-fence-port-declaration-",
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

test("blocks public API or combined provider-fence capability drift", async () => {
  for (const [prefix, drift] of [
    [
      "api",
      [
        "export type BotReplyStagingProviderFenceApiCapabilityPort =",
        "  BotReplyStagingProviderFenceReserveCapabilityPort;",
      ].join("\n"),
    ],
    [
      "combined",
      [
        "export type CombinedProviderFenceCapabilityPort =",
        "  BotReplyStagingProviderFenceReserveCapabilityPort &",
        "  BotReplyStagingProviderFenceFinalizeCapabilityPort;",
      ].join("\n"),
    ],
  ]) {
    const root = await createFixture(
      `connect-provider-fence-port-${prefix}-drift-`,
    );
    await writeFile(
      join(root, portsPath),
      `${exactPortsSource}\n${drift}\n`,
    );

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(report.findings, [
      {
        code: "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
        file: portsPath,
      },
    ]);
  }
});

test("blocks finalize authority from disappearing from the Worker port", async () => {
  const root = await createFixture(
    "connect-provider-fence-worker-port-drift-",
  );
  const drifted = exactPortsSource.replace(
    [
      "export type BotReplyStagingProviderFenceWorkerCapabilityPort =",
      "  BotReplyStagingProviderFenceReserveCapabilityPort &",
      "  BotReplyStagingProviderFenceFinalizeCapabilityPort;",
    ].join("\n"),
    [
      "export type BotReplyStagingProviderFenceWorkerCapabilityPort =",
      "  BotReplyStagingProviderFenceReserveCapabilityPort;",
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

test("blocks generic authority drift in provider-fence contracts", async () => {
  const mutations = [
    [
      "export interface BotReplyStagingProviderFenceReserveInput {",
      "export interface BotReplyStagingProviderFenceReserveInput<T = never> {",
    ],
    [
      "export type BotReplyStagingProviderFenceFinalizeInput =",
      "export type BotReplyStagingProviderFenceFinalizeInput<T = never> =",
    ],
    [
      "export type BotReplyStagingProviderFenceReserveCapabilityPort =",
      "export type BotReplyStagingProviderFenceReserveCapabilityPort<T = never> =",
    ],
    [
      "export type BotReplyStagingProviderFenceWorkerCapabilityPort =",
      "export type BotReplyStagingProviderFenceWorkerCapabilityPort<T = never> =",
    ],
  ];

  for (const [index, [needle, replacement]] of mutations.entries()) {
    const root = await createFixture(
      `connect-provider-fence-generic-drift-${index}-`,
    );
    const drifted = exactPortsSource.replace(needle, replacement);
    assert.notEqual(drifted, exactPortsSource);
    await writeFile(join(root, portsPath), drifted);

    assert.deepEqual((await inspectSourceGuardrails(root)).findings, [
      {
        code: "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
        file: portsPath,
      },
    ]);
  }
});

test("blocks provider-fence input field and operation-kind drift", async () => {
  const mutations = [
    [
      "  readonly reservationKey: string;",
      "  readonly reservationIdentity: string;",
    ],
    [
      '    | "duplicate-safety";',
      ['    | "duplicate-safety"', '    | "kill-switch";'].join("\n"),
    ],
  ];

  for (const [index, [needle, replacement]] of mutations.entries()) {
    const root = await createFixture(
      `connect-provider-fence-input-drift-${index}-`,
    );
    const drifted = exactPortsSource.replace(needle, replacement);
    assert.notEqual(drifted, exactPortsSource);
    await writeFile(join(root, portsPath), drifted);

    assert.deepEqual((await inspectSourceGuardrails(root)).findings, [
      {
        code: "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
        file: portsPath,
      },
    ]);
  }
});

test("blocks reserve-result token, nullability, and literal drift", async () => {
  const drifts = [
    exactPortsSource.replace(
      "      providerRequestKey: string;",
      "      providerRequestKey: string | null;",
    ),
    exactPortsSource.replace(
      [
        '      outcome: "replay-blocked";',
        "      operationKey: string;",
        '      state: "reserved" | "completed" | "indeterminate";',
      ].join("\n"),
      [
        '      outcome: "replay-blocked";',
        "      operationKey: string;",
        "      providerRequestKey: string;",
        "      requestedAt: string;",
        '      state: "reserved" | "completed" | "indeterminate";',
      ].join("\n"),
    ),
    exactPortsSource.replace(
      '      outcome: "authorized";',
      '      outcome: "reserved";',
    ),
  ];

  for (const [index, drifted] of drifts.entries()) {
    assert.notEqual(drifted, exactPortsSource);
    const root = await createFixture(
      `connect-provider-fence-reserve-result-drift-${index}-`,
    );
    await writeFile(join(root, portsPath), drifted);

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(report.findings, [
      {
        code: "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
        file: portsPath,
      },
    ]);
  }
});

test("blocks finalize-result token, nullability, literal, and matrix drift", async () => {
  const drifts = [
    exactPortsSource.replace(
      [
        '      outcome: "pending";',
        "      operationKey: string;",
        '      state: "reserved";',
      ].join("\n"),
      [
        '      outcome: "pending";',
        "      operationKey: string;",
        '      state: "reserved";',
        "      observationKey: string;",
        "      finalizedAt: string;",
      ].join("\n"),
    ),
    exactPortsSource.replace(
      "      observationKey: string;",
      "      observationKey: string | null;",
    ),
    exactPortsSource.replace(
      '      outcome: "pending";',
      '      outcome: "not-observed";',
    ),
    exactPortsSource.replace(
      '        | "service-window-rejected";',
      [
        '        | "service-window-rejected"',
        '        | "ambiguous";',
      ].join("\n"),
    ),
  ];

  for (const [index, drifted] of drifts.entries()) {
    assert.notEqual(drifted, exactPortsSource);
    const root = await createFixture(
      `connect-provider-fence-finalize-result-drift-${index}-`,
    );
    await writeFile(join(root, portsPath), drifted);

    const report = await inspectSourceGuardrails(root);

    assert.deepEqual(report.findings, [
      {
        code: "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
        file: portsPath,
      },
    ]);
  }
});

test("blocks external module augmentation of the provider-fence ports", async () => {
  const root = await createFixture(
    "connect-provider-fence-port-augmentation-",
  );
  await writeFile(
    join(root, "server/operations/augmentProviderFencePorts.ts"),
    [
      'import type { BotReplyStagingProviderFenceReserveInput } from "./botReplyStagingProviderFenceCapabilityPorts.ts";',
      'declare module "./botReplyStagingProviderFenceCapabilityPorts.ts" {',
      "  interface BotReplyStagingProviderFenceReserveInput {",
      "    readonly providerRequestKey: string;",
      "  }",
      "}",
      "export type AugmentedReserveInput = BotReplyStagingProviderFenceReserveInput;",
      "",
    ].join("\n"),
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_CAPABILITY_PORT_AUGMENTATION_FORBIDDEN",
      file: "server/operations/augmentProviderFencePorts.ts",
    },
  ]);
});

test("blocks unreviewed runtime dependencies inside the repository", async () => {
  const root = await createFixture(
    "connect-provider-fence-repository-dependency-",
  );
  await writeFile(
    join(root, repositoryPath),
    `import { readFile } from "node:fs/promises";\n${exactRepositorySource}\nvoid readFile;\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file: workerCapabilityPath,
    },
    {
      code: "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
      file: repositoryPath,
    },
  ]);
});

test("pins the repository export surface to the Worker factory", async () => {
  const root = await createFixture(
    "connect-provider-fence-repository-export-drift-",
  );
  await writeFile(
    join(root, repositoryPath),
    `${exactRepositorySource}\nexport const capabilitySql = true;\n`,
  );

  const report = await inspectSourceGuardrails(root);

  assert.deepEqual(report.findings, [
    {
      code: "BOT_REPLY_STAGING_CAPABILITY_REPOSITORY_EXPORT_INVALID",
      file: repositoryPath,
    },
  ]);
});
