import {
  readdir,
  readFile,
  realpath,
  stat,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { builtinModules } from "node:module";
import {
  extname,
  dirname,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import ts from "typescript";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const sourceRoots = [
  "app",
  "features",
  "server",
  "shared",
  "db",
  "worker",
  "build",
];
const rootRuntimeFiles = [
  "proxy.ts",
  "middleware.ts",
  "instrumentation.ts",
  "instrumentation-client.ts",
  "vite.config.ts",
  "next.config.ts",
  "drizzle.config.ts",
  "postcss.config.mjs",
  "cloudflare-env.d.ts",
  "scripts/start-railway-api.mjs",
  "scripts/start-railway-bullmq-api.mjs",
  "scripts/start-railway-bullmq-worker.mjs",
];
const sourceExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".mts",
]);
const ignoredSourceGraphDirectoryNames = new Set([
  ".git",
  ".next",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
]);
const bannedPatterns = [
  {
    code: "RANDOMNESS_FORBIDDEN",
    pattern:
      /\b(?:Math\.random|crypto\.randomUUID)\s*\(/,
  },
  {
    code: "UNSAFE_HTML_INJECTION_FORBIDDEN",
    pattern: /\bdangerouslySetInnerHTML\b/,
  },
  {
    code: "DIRECT_COOKIE_ACCESS_FORBIDDEN",
    pattern: /\bdocument\.cookie\b/,
  },
  {
    code: "BROWSER_STORAGE_AUTHORITY_FORBIDDEN",
    pattern:
      /\b(?:localStorage|sessionStorage)\b/,
  },
  {
    code: "CLIENT_CONSOLE_OUTPUT_FORBIDDEN",
    pattern:
      /\bconsole\.(?:log|debug|info)\s*\(/,
  },
];
const serverOnlyIdentifiers = [
  "DATABASE_URL",
  "POSTGRES_API_URL",
  "POSTGRES_WORKER_URL",
  "POSTGRES_VERIFIER_URL",
  "POSTGRES_MIGRATION_URL",
  "POSTGRES_OWNER_URL",
  "CLERK_SECRET_KEY",
  "CONNECT_TRACE_CONTEXT_HMAC_KEY",
  "CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS",
  "REDIS_URL",
  "RAILWAY_WORKER_SCHEDULER_OWNER_KEY",
  "CLOUDFLARE_API_TOKEN",
  "TEAM_INVITATION_BROWSER_CLOUDFLARE_D1_READ_TOKEN",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "META_CREDENTIAL_ENCRYPTION_KEY_V1",
  "WHATSAPP_RATE_LIMIT_HMAC_KEY_V1",
  "BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1",
  "BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1",
  "BOT_REPLY_STAGING_PRIVATE_CASES_JSON",
  "BETTER_STACK_SOURCE_TOKEN",
  "BETTER_STACK_INCIDENT_API_TOKEN",
];
const serverOnlyImportSpecifiers = new Set([
  ...builtinModules,
  ...builtinModules.map((specifier) =>
    specifier.startsWith("node:")
      ? specifier
      : `node:${specifier}`
  ),
]);
const serverOnlyImportPattern =
  /^(?:cloudflare:workers|server-only|next\/headers|next\/server|@clerk\/nextjs\/server)$/;
const conventionClientEntryPaths = new Set([
  "instrumentation-client.ts",
]);
const rootServerOnlyPaths = new Set(
  rootRuntimeFiles.filter(
    (file) =>
      !conventionClientEntryPaths.has(file),
  ),
);
const attestedCutoverReadinessPath =
  "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts";
const attestedReadRepositoryPath =
  "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts";
const postgresRuntimeCapabilityConfigurationPath =
  "server/platform/postgresRuntimeCapabilityConfiguration.ts";
const postgresRuntimeCapabilityEvidencePath =
  "server/platform/postgresRuntimeCapabilityEvidence.ts";
const postgresRuntimeCapabilityTrustedDriverContractPath =
  "server/platform/postgresRuntimeCapabilityTrustedDriverContract.ts";
const attestedEvidenceV2FileName = [
  "railwayBotReplyStaging",
  "AttestedReleaseEvidence.ts",
].join("");
const attestedEvidenceV2Path =
  `server/platform/${attestedEvidenceV2FileName}`;
const receiptAttestationPath =
  "server/operations/botReplyStagingReceiptAttestation.ts";
const stagingRunCapabilityPortsPath =
  "server/operations/botReplyStagingRunCapabilityPorts.ts";
const stagingRunCapabilityRepositoryPath =
  "server/platform/postgresBotReplyStagingRunCapabilityRepository.ts";
const stagingProviderFenceCapabilityPortsPath =
  "server/operations/botReplyStagingProviderFenceCapabilityPorts.ts";
const stagingProviderFenceCapabilityRepositoryPath =
  "server/platform/postgresBotReplyStagingProviderFenceCapabilityRepository.ts";
const nodePostgresStagingProviderFenceWorkerCapabilityPath =
  "server/platform/nodePostgresBotReplyStagingProviderFenceWorkerCapability.ts";
const railwayBotReplyPinnedBoundaryDriverPath =
  "server/platform/railwayBotReplyPinnedBoundaryDriver.ts";
const nodePostgresBotReplyPinnedSessionTransportPath =
  "server/platform/nodePostgresBotReplyPinnedSessionTransport.ts";
// This dormant transport is a reviewed security boundary. Any byte change,
// including a seemingly harmless comment change, must fail the source guard
// until this digest is deliberately updated as part of a new review.
const nodePostgresBotReplyPinnedSessionTransportExpectedSha256 =
  "60e7d01705c4709cf096f2753fe06940625f176eed10bb5f119d0ac53fbbbd4d";
const stagingCapabilityPortPaths = new Set([
  stagingRunCapabilityPortsPath,
  stagingProviderFenceCapabilityPortsPath,
]);
const postgresResultValidationPath =
  "server/platform/postgresResultValidation.ts";
const dormantBotReplyStagingAttestedModulePaths =
  new Set([
    attestedCutoverReadinessPath,
    attestedReadRepositoryPath,
    postgresRuntimeCapabilityEvidencePath,
    postgresRuntimeCapabilityTrustedDriverContractPath,
    stagingRunCapabilityPortsPath,
    stagingRunCapabilityRepositoryPath,
    stagingProviderFenceCapabilityPortsPath,
    stagingProviderFenceCapabilityRepositoryPath,
    nodePostgresStagingProviderFenceWorkerCapabilityPath,
    railwayBotReplyPinnedBoundaryDriverPath,
    nodePostgresBotReplyPinnedSessionTransportPath,
  ]);
const dormantBotReplyStagingAttestedAllowedImporters =
  new Map([
    [
      "scripts/verify-bot-reply-staging-attested-evidence-postgres.mjs",
      new Map([
        [
          "../server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
          attestedCutoverReadinessPath,
        ],
        [
          "../server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
          attestedReadRepositoryPath,
        ],
      ]),
    ],
    [
      "scripts/verify-bot-reply-staging-provider-operation-fence-postgres.mjs",
      new Map([
        [
          "../server/platform/nodePostgresBotReplyStagingProviderFenceWorkerCapability.ts",
          nodePostgresStagingProviderFenceWorkerCapabilityPath,
        ],
      ]),
    ],
    [
      nodePostgresStagingProviderFenceWorkerCapabilityPath,
      new Map([
        [
          "./postgresBotReplyStagingProviderFenceCapabilityRepository.ts",
          stagingProviderFenceCapabilityRepositoryPath,
        ],
      ]),
    ],
    [
      postgresRuntimeCapabilityTrustedDriverContractPath,
      new Map([
        [
          "./postgresRuntimeCapabilityConfiguration.ts",
          postgresRuntimeCapabilityConfigurationPath,
        ],
        [
          "./postgresRuntimeCapabilityEvidence.ts",
          postgresRuntimeCapabilityEvidencePath,
        ],
      ]),
    ],
  ]);
const dormantCredentialBoundPreSendSqlIdentifiers =
  new Set([
    "acquire_bot_reply_staging_pre_send_session_barrier_v1",
    "prove_bot_reply_staging_pre_send_session_barrier_v1",
    "release_bot_reply_staging_pre_send_session_barrier_v1",
    "consume_bot_reply_staging_credential_bound_pre_send_permit_v1",
    "finalize_bot_reply_staging_credential_bound_pre_send_permit_v1",
    "reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1",
    "bot_reply_staging_credential_provider_request_bindings",
    "bot_reply_staging_provider_uncertainty_events",
    "bot_reply_staging_provider_boundary_claims",
  ]);
const dormantWriterBarrierAndLateTruthSqlIdentifiers =
  new Set([
    "reserve_and_bind_bot_reply_staging_service_reply_v1",
    "write_bot_reply_staging_pre_send_admission_v1",
    "write_bot_reply_staging_provider_fact_v1",
    "write_bot_reply_staging_provider_uncertainty_v1",
    "assert_bot_reply_staging_tenant_barrier_owned_v1",
    "assert_bot_reply_staging_exact_session_barrier_v1",
    "bot_reply_staging_service_reply_scope_bindings",
  ]);
const dormantPinnedSessionWriterSqlIdentifiers =
  new Set([
    "write_bot_reply_staging_provider_fact_v1",
    "write_bot_reply_staging_provider_uncertainty_v1",
  ]);
const dormantBotReplyStagingSqlIdentifiers = new Set([
  ...dormantCredentialBoundPreSendSqlIdentifiers,
  ...dormantWriterBarrierAndLateTruthSqlIdentifiers,
]);
const dormantCredentialBoundPreSendFunctionIdentifiers =
  new Set(
    [...dormantCredentialBoundPreSendSqlIdentifiers]
      .filter((identifier) => identifier.endsWith("_v1")),
  );
const postgresMigrationParityRegistryAllowedSqlIdentifiers =
  new Set([
    "acquire_bot_reply_staging_pre_send_session_barrier_v1",
    "reserve_and_bind_bot_reply_staging_service_reply_v1",
  ]);
const dormantCredentialBoundPreSendAllowedSqlIdentifiersByPath =
  new Map([
    [
      "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres.mjs",
      dormantCredentialBoundPreSendSqlIdentifiers,
    ],
    [
      "scripts/verify-postgres-migration-contract.mjs",
      dormantCredentialBoundPreSendSqlIdentifiers,
    ],
    [
      "postgres/postgresMigrationParityRegistry.mjs",
      postgresMigrationParityRegistryAllowedSqlIdentifiers,
    ],
    [
      nodePostgresBotReplyPinnedSessionTransportPath,
      dormantCredentialBoundPreSendFunctionIdentifiers,
    ],
  ]);
const dormantWriterBarrierAndLateTruthAllowedSqlIdentifiersByPath =
  new Map([
    [
      "postgres/migrations/0057_bot_reply_staging_writer_barrier_and_late_truth.sql",
      dormantWriterBarrierAndLateTruthSqlIdentifiers,
    ],
    [
      nodePostgresBotReplyPinnedSessionTransportPath,
      dormantPinnedSessionWriterSqlIdentifiers,
    ],
    [
      "tests/node-postgres-bot-reply-pinned-session-transport.test.mjs",
      dormantPinnedSessionWriterSqlIdentifiers,
    ],
    [
      "tests/node-postgres-bot-reply-pinned-session-transport-boundary.test.mjs",
      dormantPinnedSessionWriterSqlIdentifiers,
    ],
    [
      "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres.mjs",
      dormantWriterBarrierAndLateTruthSqlIdentifiers,
    ],
    [
      "scripts/verify-postgres-migration-contract.mjs",
      dormantWriterBarrierAndLateTruthSqlIdentifiers,
    ],
    [
      "scripts/verify-postgres-migration-parity.mjs",
      postgresMigrationParityRegistryAllowedSqlIdentifiers,
    ],
    [
      "postgres/postgresMigrationParityRegistry.mjs",
      postgresMigrationParityRegistryAllowedSqlIdentifiers,
    ],
    [
      "tests/bot-reply-staging-writer-barrier-and-late-truth-migration.test.mjs",
      dormantWriterBarrierAndLateTruthSqlIdentifiers,
    ],
    [
      "tests/bot-reply-staging-credential-bound-pre-send-session-barrier-postgres-verifier.test.mjs",
      dormantWriterBarrierAndLateTruthSqlIdentifiers,
    ],
    [
      "tests/postgres-migration-contract.test.mjs",
      dormantWriterBarrierAndLateTruthSqlIdentifiers,
    ],
    [
      "tests/postgres-migration-parity.test.mjs",
      postgresMigrationParityRegistryAllowedSqlIdentifiers,
    ],
    [
      "tests/postgres-data-migration-slice-registry.test.mjs",
      postgresMigrationParityRegistryAllowedSqlIdentifiers,
    ],
    [
      "tests/source-guardrails-dormant-execution-escape.test.mjs",
      dormantWriterBarrierAndLateTruthSqlIdentifiers,
    ],
  ]);
const nodePostgresBotReplyPinnedSessionTransportExpectedRuntimeExports =
  new Set([
    "NodePostgresBotReplyPinnedSessionTransportError",
    "createNodePostgresBotReplyPinnedSessionTransport",
    "nodePostgresBotReplyPinnedSessionTransportStatus",
  ]);
const nodePostgresBotReplyPinnedSessionTransportExpectedSessionMethods =
  Object.freeze([
    "acquire",
    "close",
    "consume",
    "destroy",
    "finalize",
    "persistProviderFact",
    "persistProviderUncertainty",
    "prepare",
    "prove",
    "release",
  ]);
const nodePostgresBotReplyPinnedSessionTransportExpectedSqlFunctionIdentifiers =
  new Set([
    ...dormantCredentialBoundPreSendFunctionIdentifiers,
    ...dormantPinnedSessionWriterSqlIdentifiers,
  ]);
const nodePostgresBotReplyPinnedSessionTransportExpectedControlStatements =
  Object.freeze({
    beginReadCommitted:
      "BEGIN ISOLATION LEVEL READ COMMITTED",
    commit: "COMMIT",
    discardAll: "DISCARD ALL",
    rollback: "ROLLBACK",
  });
const nodePostgresBotReplyPinnedSessionTransportExpectedQueryStatements =
  Object.freeze({
    acquire: [
      "SELECT capability.outcome,",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM public.acquire_bot_reply_staging_pre_send_session_barrier_v1(",
      "$1::TEXT",
      ") AS capability",
      "LIMIT 2",
    ].join(" "),
    consume: [
      "SELECT capability.outcome, capability.\"reasonCode\",",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM public.consume_bot_reply_staging_credential_bound_pre_send_permit_v1(",
      "$1::TEXT",
      ") AS capability",
      "LIMIT 2",
    ].join(" "),
    finalize: [
      "SELECT capability.outcome, capability.state,",
      "capability.\"providerOutcomeKind\", capability.\"observationKey\",",
      "capability.\"finalizedAt\",",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1(",
      "$1::TEXT",
      ") AS capability",
      "LIMIT 2",
    ].join(" "),
    persistProviderFact: [
      "SELECT capability.outcome, capability.\"providerOutcomeKind\",",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM public.write_bot_reply_staging_provider_fact_v1(",
      "$1::TEXT, $2::TEXT, $3::TEXT, $4::INTEGER, $5::INTEGER",
      ") AS capability",
      "LIMIT 2",
    ].join(" "),
    persistProviderUncertainty: [
      "SELECT capability.outcome, capability.state,",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM public.write_bot_reply_staging_provider_uncertainty_v1(",
      "$1::TEXT, $2::TEXT",
      ") AS capability",
      "LIMIT 2",
    ].join(" "),
    lockProof: [
      "SELECT pg_catalog.count(*)::integer AS \"advisoryLockCount\",",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM pg_catalog.pg_locks AS lock",
      "WHERE lock.pid = pg_catalog.pg_backend_pid()",
      "AND lock.locktype = 'advisory'",
      "AND lock.granted",
    ].join(" "),
    pid:
      "SELECT pg_catalog.pg_backend_pid()::integer AS \"backendPid\"",
    prove: [
      "SELECT capability.outcome, capability.\"backendPid\",",
      "capability.\"sendBefore\",",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM public.prove_bot_reply_staging_pre_send_session_barrier_v1(",
      "$1::TEXT",
      ") AS capability",
      "LIMIT 2",
    ].join(" "),
    reconcile: [
      "SELECT capability.outcome, capability.state,",
      "capability.\"providerOutcomeKind\", capability.\"observationKey\",",
      "capability.\"finalizedAt\",",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM public.reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1(",
      "$1::TEXT",
      ") AS capability",
      "LIMIT 2",
    ].join(" "),
    release: [
      "SELECT capability.outcome, capability.\"releasedCount\",",
      "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
      "FROM public.release_bot_reply_staging_pre_send_session_barrier_v1(",
      "$1::TEXT",
      ") AS capability",
      "LIMIT 2",
    ].join(" "),
  });
const legacyBotReplyStagingEvidenceModulePaths =
  new Set([
    "server/operations/currentProductionReadinessEvidenceSource.ts",
    "server/operations/currentRailwayBotReplyStagingReleaseEvidenceReadHandler.ts",
    "server/operations/railwayBotReplyStagingReleaseEvidenceReadHandler.ts",
    "server/platform/postgresBotReplyStagingReleaseEvidenceRepository.ts",
    "server/platform/railwayBotReplyStagingCrossServiceEvidence.ts",
    "server/platform/railwayBotReplyStagingReleaseEvidenceReadOperation.ts",
  ]);
const productionImplementationStatePath =
  "server/operations/productionImplementationState.ts";
const productionImplementationStatePropertyNames =
  new Set([
    "metaWebhookQueue",
    "campaignDeliveryQueue",
    "targetQueueAdapter",
    "campaignScheduler",
    "campaignDeliveryAdapter",
    "botReplyDeliveryAdapter",
    "aiProvider",
    "billingProvider",
    "rateLimitPolicy",
    "fileScanner",
    "monitoringAndAlerting",
    "backupAndRestore",
    "sloMeasurement",
    "dataRetentionPolicy",
  ]);
const dormantAttestedAllowedRuntimeDependencies =
  new Map([
    [
      attestedCutoverReadinessPath,
      new Map([
        ["node:util", null],
        [
          `../platform/${attestedEvidenceV2FileName}`,
          attestedEvidenceV2Path,
        ],
      ]),
    ],
    [
      attestedReadRepositoryPath,
      new Map([
        ["node:crypto", null],
        ["node:util", null],
        [
          "../operations/botReplyStagingReceiptAttestation.ts",
          receiptAttestationPath,
        ],
        [
          `./${attestedEvidenceV2FileName}`,
          attestedEvidenceV2Path,
        ],
      ]),
    ],
    [
      attestedEvidenceV2Path,
      new Map([
        ["node:crypto", null],
        ["node:util", null],
        [
          "../operations/botReplyStagingReceiptAttestation.ts",
          receiptAttestationPath,
        ],
      ]),
    ],
    [
      receiptAttestationPath,
      new Map([
        ["node:crypto", null],
        ["node:util", null],
      ]),
    ],
    [
      stagingRunCapabilityRepositoryPath,
      new Map([
        ["node:crypto", null],
        ["node:util", null],
        [
          "../operations/botReplyStagingReceiptAttestation.ts",
          receiptAttestationPath,
        ],
        [
          "./postgresResultValidation.ts",
          postgresResultValidationPath,
        ],
      ]),
    ],
    [postgresResultValidationPath, new Map()],
    [stagingRunCapabilityPortsPath, new Map()],
    [stagingProviderFenceCapabilityPortsPath, new Map()],
    [
      stagingProviderFenceCapabilityRepositoryPath,
      new Map([
        ["node:crypto", null],
        ["node:util", null],
        [
          "./postgresResultValidation.ts",
          postgresResultValidationPath,
        ],
      ]),
    ],
    [
      nodePostgresStagingProviderFenceWorkerCapabilityPath,
      new Map([
        ["node:util", null],
        [
          "./postgresBotReplyStagingProviderFenceCapabilityRepository.ts",
          stagingProviderFenceCapabilityRepositoryPath,
        ],
      ]),
    ],
    [
      railwayBotReplyPinnedBoundaryDriverPath,
      new Map([
        ["node:util", null],
      ]),
    ],
    [
      nodePostgresBotReplyPinnedSessionTransportPath,
      new Map([
        ["node:util", null],
      ]),
    ],
    [
      postgresRuntimeCapabilityEvidencePath,
      new Map([
        ["node:util", null],
        [
          "./postgresRuntimeCapabilityConfiguration.ts",
          postgresRuntimeCapabilityConfigurationPath,
        ],
      ]),
    ],
    [
      postgresRuntimeCapabilityTrustedDriverContractPath,
      new Map([
        [
          "./postgresRuntimeCapabilityConfiguration.ts",
          postgresRuntimeCapabilityConfigurationPath,
        ],
        [
          "./postgresRuntimeCapabilityEvidence.ts",
          postgresRuntimeCapabilityEvidencePath,
        ],
      ]),
    ],
    [
      postgresRuntimeCapabilityConfigurationPath,
      new Map([
        ["node:net", null],
      ]),
    ],
  ]);

async function listSourceFiles(
  directory,
  canonicalRoot = directory,
) {
  return listProjectFiles(
    directory,
    (name) => sourceExtensions.has(extname(name)),
    Object.freeze({
      canonicalRoot:
        await canonicalExistingPath(canonicalRoot),
      visitedCanonicalDirectories: new Set(),
    }),
  );
}

async function listProjectFiles(
  directory,
  includesFile,
  traversal = undefined,
) {
  const canonicalDirectory =
    await canonicalExistingPath(directory);
  const state = traversal ?? Object.freeze({
    canonicalRoot: canonicalDirectory,
    visitedCanonicalDirectories: new Set(),
  });
  const canonicalRelativePath = relativePath(
    state.canonicalRoot,
    canonicalDirectory,
  );
  if (
    canonicalRelativePath === ".." ||
    canonicalRelativePath.startsWith("../") ||
    canonicalRelativePath.split("/").some((name) =>
      ignoredSourceGraphDirectoryNames.has(name)
    ) ||
    state.visitedCanonicalDirectories.has(canonicalDirectory)
  ) {
    return [];
  }
  const visitedCanonicalDirectories = new Set(
    state.visitedCanonicalDirectories,
  );
  visitedCanonicalDirectories.add(canonicalDirectory);
  const nestedTraversal = Object.freeze({
    canonicalRoot: state.canonicalRoot,
    visitedCanonicalDirectories,
  });
  let entries;
  try {
    entries = await readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (
        entry.isDirectory() &&
        !ignoredSourceGraphDirectoryNames.has(entry.name)
      ) {
        return listProjectFiles(
          path,
          includesFile,
          nestedTraversal,
        );
      }
      if (
        entry.isSymbolicLink() &&
        !ignoredSourceGraphDirectoryNames.has(entry.name)
      ) {
        let target;
        try {
          target = await stat(path);
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            return [];
          }
          throw error;
        }
        if (target.isDirectory()) {
          return listProjectFiles(
            path,
            includesFile,
            nestedTraversal,
          );
        }
        return target.isFile() && includesFile(entry.name)
          ? [path]
          : [];
      }
      return entry.isFile() && includesFile(entry.name)
        ? [path]
        : [];
    }),
  );
  return nested.flat();
}

async function listProjectSourceFiles(directory) {
  return listProjectFiles(
    directory,
    (name) => sourceExtensions.has(extname(name)),
  );
}

async function listProjectPackageManifests(directory) {
  return listProjectFiles(
    directory,
    (name) => name === "package.json",
  );
}

async function listImmediateSourceFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  return entries
    .filter(
      (entry) =>
        (entry.isFile() || entry.isSymbolicLink()) &&
        sourceExtensions.has(extname(entry.name)),
    )
    .map((entry) => join(directory, entry.name));
}

async function listSymbolicLinks(directory) {
  let entries;

  try {
    entries = await readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }

  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) return [path];
      if (
        entry.isDirectory() &&
        !ignoredSourceGraphDirectoryNames.has(
          entry.name,
        )
      ) {
        return listSymbolicLinks(path);
      }
      return [];
    }),
  );
  return nested.flat();
}

async function canonicalExistingPath(file) {
  try {
    return normalize(await realpath(file));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return normalize(resolve(file));
    }
    throw error;
  }
}

function resolvePackageTargetPath(
  manifestFile,
  target,
) {
  try {
    const manifestDirectoryUrl = pathToFileURL(
      `${dirname(manifestFile)}/`,
    );
    return fileURLToPath(
      new URL(target, manifestDirectoryUrl),
    );
  } catch {
    return null;
  }
}

function escapeRegularExpression(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function packageTargetPatternMatchesFile(
  manifestFile,
  target,
  file,
) {
  let decodedTarget;
  try {
    decodedTarget = decodeURIComponent(
      target.split(/[?#]/, 1)[0],
    );
  } catch {
    return false;
  }
  const patternParts = decodedTarget.split("*");
  if (patternParts.length < 2) return false;

  let pattern = escapeRegularExpression(
    patternParts[0],
  );
  for (
    let index = 1;
    index < patternParts.length;
    index += 1
  ) {
    pattern += index === 1 ? "(.*)" : "\\1";
    pattern += escapeRegularExpression(
      patternParts[index],
    );
  }

  const relativeFile = `./${relative(
    dirname(manifestFile),
    file,
  ).replaceAll("\\", "/")}`;
  return new RegExp(`^${pattern}$`, "u").test(
    relativeFile,
  );
}

async function packageTargetPatternMatchesCanonicalFile(
  manifestFile,
  target,
  file,
  canonicalFile,
  canonicalSymbolicLinkByPath,
) {
  if (
    packageTargetPatternMatchesFile(
      manifestFile,
      target,
      file,
    )
  ) {
    return true;
  }

  let decodedTarget;
  try {
    decodedTarget = decodeURIComponent(
      stripResourceSuffix(target),
    );
  } catch {
    return false;
  }
  const wildcardIndex = decodedTarget.indexOf("*");
  if (wildcardIndex === -1) return false;

  const targetPathPattern = stripResourceSuffix(
    decodedTarget,
  );
  if (
    wildcardIndex < targetPathPattern.lastIndexOf("/")
  ) {
    return true;
  }

  const manifestDirectory = normalize(
    resolve(dirname(manifestFile)),
  );
  for (
    const [symbolicLinkPath, canonicalTarget] of
      canonicalSymbolicLinkByPath
  ) {
    if (
      symbolicLinkPath !== manifestDirectory &&
      !symbolicLinkPath.startsWith(
        `${manifestDirectory}/`,
      )
    ) {
      continue;
    }
    const canonicalRelativeFile = relative(
      canonicalTarget,
      canonicalFile,
    );
    if (
      canonicalRelativeFile === ".." ||
      canonicalRelativeFile.startsWith("../")
    ) {
      continue;
    }
    const aliasCandidate = canonicalRelativeFile === ""
      ? symbolicLinkPath
      : resolve(
        symbolicLinkPath,
        canonicalRelativeFile,
      );
    if (
      packageTargetPatternMatchesFile(
        manifestFile,
        target,
        aliasCandidate,
      )
    ) {
      return true;
    }
  }

  const staticPrefix = decodedTarget.slice(
    0,
    wildcardIndex,
  );
  const staticPrefixPath = resolve(
    dirname(manifestFile),
    staticPrefix,
  );
  const aliasDirectory = staticPrefix.endsWith("/")
    ? staticPrefixPath
    : dirname(staticPrefixPath);
  for (const symbolicLinkPath of
    canonicalSymbolicLinkByPath.keys()) {
    if (
      aliasDirectory === symbolicLinkPath ||
      aliasDirectory.startsWith(
        `${symbolicLinkPath}/`,
      )
    ) {
      return true;
    }
  }
  const canonicalAliasDirectory =
    await canonicalExistingPath(aliasDirectory);
  const canonicalRelativeFile = relative(
    canonicalAliasDirectory,
    canonicalFile,
  );
  if (
    canonicalRelativeFile === "" ||
    canonicalRelativeFile === ".." ||
    canonicalRelativeFile.startsWith(`..${"/"}`) ||
    resolve(
      canonicalAliasDirectory,
      canonicalRelativeFile,
    ) !== canonicalFile
  ) {
    return false;
  }

  return packageTargetPatternMatchesFile(
    manifestFile,
    target,
    resolve(aliasDirectory, canonicalRelativeFile),
  );
}

function collectPackageRuntimeTargets(value, targets) {
  if (typeof value === "string") {
    targets.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPackageRuntimeTargets(item, targets);
    }
    return;
  }
  if (
    typeof value === "object" &&
    value !== null
  ) {
    for (const item of Object.values(value)) {
      collectPackageRuntimeTargets(item, targets);
    }
  }
}

function packageValueReferencesPinnedSessionTransport(value) {
  if (typeof value === "string") {
    return value.includes(
      "nodePostgresBotReplyPinnedSessionTransport",
    );
  }
  if (Array.isArray(value)) {
    return value.some(
      packageValueReferencesPinnedSessionTransport,
    );
  }
  if (
    typeof value === "object" &&
    value !== null
  ) {
    return Object.values(value).some(
      packageValueReferencesPinnedSessionTransport,
    );
  }
  return false;
}

function collectPackageScriptCommands(
  value,
  commands,
  scriptName = "",
) {
  if (typeof value === "string") {
    commands.push(Object.freeze({
      command: value,
      scriptName,
    }));
    return;
  }
  if (
    typeof value === "object" &&
    value !== null
  ) {
    for (const [name, item] of Object.entries(value)) {
      collectPackageScriptCommands(item, commands, name);
    }
  }
}

function packageScriptNameIsTestOnly(scriptName) {
  return scriptName === "test" ||
    scriptName.startsWith("test:") ||
    scriptName === "pretest" ||
    scriptName === "posttest";
}

function packageScriptNameIsRuntimeEntrypoint(scriptName) {
  const lifecycleTarget = scriptName.startsWith("pre")
    ? scriptName.slice(3)
    : scriptName.startsWith("post")
      ? scriptName.slice(4)
      : scriptName;
  return lifecycleTarget === "start" ||
    lifecycleTarget.startsWith("start:") ||
    lifecycleTarget === "dev" ||
    lifecycleTarget.startsWith("dev:");
}

function packageManagerConfigurationManagers(name) {
  if (name === ".npmrc") {
    return Object.freeze(["npm", "pnpm", "yarn"]);
  }
  if (
    name === ".pnpmrc" ||
    name === "pnpm-workspace.yaml" ||
    name === "pnpm-workspace.yml" ||
    name.startsWith(".pnpmfile.")
  ) {
    return Object.freeze(["pnpm"]);
  }
  if (name === ".yarnrc" || name.startsWith(".yarnrc.")) {
    return Object.freeze(["yarn"]);
  }
  return Object.freeze([]);
}

function splitShellCommandSegments(command) {
  const segments = [];
  let quote = null;
  let escaped = false;
  let unmodelled = false;
  let start = 0;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote !== null) {
      if (
        quote === '"' &&
        (
          character === "`" ||
          (character === "$" && command[index + 1] === "(")
        )
      ) {
        unmodelled = true;
      }
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (
      character === "(" ||
      character === ")" ||
      character === "{" ||
      character === "}" ||
      character === "<" ||
      character === ">" ||
      character === "`" ||
      (character === "&" && command[index + 1] !== "&") ||
      (character === "$" && command[index + 1] === "(")
    ) {
      unmodelled = true;
    }
    let operator = null;
    if (
      (character === "&" || character === "|") &&
      command[index + 1] === character
    ) {
      operator = `${character}${character}`;
    } else if (
      character === ";" ||
      character === "|" ||
      character === "\n" ||
      character === "\r"
    ) {
      operator = character;
    }
    if (operator === null) continue;
    const source = command.slice(start, index).trim();
    if (source.length > 0) {
      segments.push(Object.freeze({ operator, source }));
    }
    index += operator.length - 1;
    start = index + 1;
  }
  const source = command.slice(start).trim();
  if (source.length > 0) {
    segments.push(Object.freeze({ operator: null, source }));
  }
  return Object.freeze({
    segments,
    unmodelled: unmodelled || quote !== null || escaped,
  });
}

function shellCommandTokens(command) {
  const tokens = [];
  let token = "";
  let tokenStarted = false;
  let quote = null;
  let escaped = false;
  const finishToken = () => {
    if (!tokenStarted) return;
    tokens.push(token);
    token = "";
    tokenStarted = false;
  };
  for (const character of command) {
    if (escaped) {
      token += character;
      tokenStarted = true;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      tokenStarted = true;
      continue;
    }
    if (quote !== null) {
      if (character === quote) {
        quote = null;
      } else {
        token += character;
      }
      tokenStarted = true;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      tokenStarted = true;
      continue;
    }
    if (/\s/u.test(character)) {
      finishToken();
      continue;
    }
    token += character;
    tokenStarted = true;
  }
  if (escaped) token += "\\";
  finishToken();
  return tokens;
}

function shellCwdTargetIsStatic(target) {
  return typeof target === "string" &&
    target.length > 0 &&
    !target.startsWith("-") &&
    !target.startsWith("/") &&
    !/[$`*?{}[\]~]/u.test(target);
}

function shellAssignmentIsModelled(token) {
  const separatorIndex = token.indexOf("=");
  const name = token.slice(0, separatorIndex);
  const value = token.slice(separatorIndex + 1);
  return !/[$`]/u.test(value) &&
    !(
      name === "BASH_ENV" ||
      name === "BASHOPTS" ||
      name === "CDPATH" ||
      name === "DYLD_INSERT_LIBRARIES" ||
      name === "DYLD_LIBRARY_PATH" ||
      name === "ENV" ||
      name === "GLOBIGNORE" ||
      name === "IFS" ||
      name === "INIT_CWD" ||
      name === "LD_LIBRARY_PATH" ||
      name === "LD_PRELOAD" ||
      name === "NODE_OPTIONS" ||
      name === "NODE_PATH" ||
      name === "OLDPWD" ||
      name === "PATH" ||
      name === "PWD" ||
      name === "SHELL" ||
      name === "SHELLOPTS" ||
      name === "ZDOTDIR" ||
      /^(?:COREPACK|DENO|NPM_CONFIG|PNPM|YARN)_/iu.test(name) ||
      /^npm_config_/u.test(name)
    );
}

function shellExecutableContext(tokens) {
  let index = 0;
  let cwd = ".";
  let unmodelled = false;
  while (
    index < tokens.length &&
    /^[A-Za-z_][A-Za-z0-9_]*=/u.test(tokens[index])
  ) {
    if (!shellAssignmentIsModelled(tokens[index])) {
      unmodelled = true;
    }
    index += 1;
  }
  if (tokens[index] === "env") {
    index += 1;
    while (index < tokens.length) {
      if (/^[A-Za-z_][A-Za-z0-9_]*=/u.test(tokens[index])) {
        if (!shellAssignmentIsModelled(tokens[index])) {
          unmodelled = true;
        }
        index += 1;
        continue;
      }
      const chdirMatch = tokens[index].match(
        /^(?:--chdir=|-C)(.+)$/u,
      );
      if (chdirMatch) {
        if (shellCwdTargetIsStatic(chdirMatch[1])) {
          cwd = normalize(join(cwd, chdirMatch[1]));
        } else {
          unmodelled = true;
        }
        index += 1;
        continue;
      }
      if (tokens[index] === "--chdir" || tokens[index] === "-C") {
        const target = tokens[index + 1];
        if (shellCwdTargetIsStatic(target)) {
          cwd = normalize(join(cwd, target));
        } else {
          unmodelled = true;
        }
        index += 2;
        continue;
      }
      if (tokens[index] === "-u" || tokens[index] === "--unset") {
        index += 2;
        continue;
      }
      if (/^--unset=.+/u.test(tokens[index])) {
        index += 1;
        continue;
      }
      if (tokens[index] === "--") {
        index += 1;
        break;
      }
      if (
        tokens[index] === "-i" ||
        tokens[index] === "--ignore-environment" ||
        tokens[index] === "-0" ||
        tokens[index] === "--null"
      ) {
        index += 1;
        continue;
      }
      if (tokens[index].startsWith("-")) {
        unmodelled = true;
        index += 1;
        continue;
      }
      break;
    }
  }
  if (tokens[index] === "corepack") {
    index += 1;
    if (tokens[index]?.startsWith("-")) unmodelled = true;
  }
  return Object.freeze({ cwd, index, unmodelled });
}

function staticDirectSourceCommand(tokens, executableIndex) {
  const executable = tokens[executableIndex];
  const directTokens = tokens.slice(executableIndex);
  if (directTokens.some((token) => /[$`]/u.test(token))) {
    return null;
  }
  const staticSourcePattern = (token) => {
    if (
      !/^(?:\.{0,2}\/)?[A-Za-z0-9_@./*?-]+\.(?:[cm]?[jt]sx?)$/u.test(
        token,
      )
    ) {
      return null;
    }
    const patterns = packageScriptSourcePatterns(token);
    return patterns.length === 1 ? patterns[0] : null;
  };
  if (
    /(?:^|\/)\.?[^/]+\.(?:[cm]?[jt]sx?)$/u.test(executable)
  ) {
    const executablePattern = staticSourcePattern(executable);
    return executablePattern === null
      ? null
      : Object.freeze({
          sourcePatterns: Object.freeze([executablePattern]),
        });
  }
  if (
    executable !== "node" &&
    executable !== "nodejs" &&
    executable !== "tsx"
  ) {
    return null;
  }
  let entryIndex = executableIndex + 1;
  if (
    (executable === "node" || executable === "nodejs") &&
    tokens[entryIndex] === "--test"
  ) {
    const sourcePatterns = [];
    for (const token of tokens.slice(entryIndex + 1)) {
      const pattern = staticSourcePattern(token);
      if (pattern === null) return null;
      sourcePatterns.push(pattern);
    }
    return sourcePatterns.length === 0
      ? null
      : Object.freeze({
          sourcePatterns: Object.freeze(sourcePatterns),
        });
  }
  if (tokens[entryIndex] === "--") entryIndex += 1;
  const entryPattern = staticSourcePattern(tokens[entryIndex]);
  if (entryPattern === null) {
    return null;
  }
  return Object.freeze({
    sourcePatterns: Object.freeze([entryPattern]),
  });
}

function projectToolCommandIsExact(tokens, executableIndex) {
  const command = tokens.slice(executableIndex);
  const exact = (expected) =>
    command.length === expected.length &&
    command.every((token, index) => token === expected[index]);
  if (command[0] === "vinext") {
    return command.length === 2 &&
      (
        command[1] === "build" ||
        command[1] === "dev" ||
        command[1] === "start"
      );
  }
  return exact(["next", "build", "--webpack"]) ||
    exact(["drizzle-kit", "generate"]) ||
    exact([
      "eslint",
      ".",
      "--ignore-pattern",
      "dist",
      "--ignore-pattern",
      ".next",
    ]) ||
    exact(["tsc", "--noEmit"]);
}

function packageManagerCommandTokens(command) {
  const split = splitShellCommandSegments(command);
  const commands = [];
  const directCommands = [];
  const projectToolCommands = [];
  let shellCwd = ".";
  let unmodelled = split.unmodelled;
  for (const segment of split.segments) {
    const tokens = shellCommandTokens(segment.source);
    const executableContext = shellExecutableContext(tokens);
    if (executableContext.unmodelled) unmodelled = true;
    const executableIndex = executableContext.index;
    const executable = tokens[executableIndex];
    const executableCwd = normalize(join(
      shellCwd,
      executableContext.cwd,
    ));
    if (executable === undefined) {
      unmodelled = true;
      continue;
    }
    if (
      typeof executable === "string" &&
      /[$`]/u.test(executable)
    ) {
      unmodelled = true;
      continue;
    }
    if (executable === "cd") {
      const target = tokens[executableIndex + 1];
      if (
        tokens.length !== executableIndex + 2 ||
        typeof target !== "string" ||
        target.length === 0 ||
        !shellCwdTargetIsStatic(target) ||
        (segment.operator !== "&&" && segment.operator !== ";")
      ) {
        unmodelled = true;
        continue;
      }
      shellCwd = normalize(join(shellCwd, target));
      continue;
    }
    if (
      executable === "pushd" ||
      executable === "popd" ||
      executable === "dirs"
    ) {
      unmodelled = true;
      continue;
    }
    if (executable === "npm" || executable === "pnpm" || executable === "yarn") {
      commands.push(Object.freeze({
        manager: executable,
        shellCwd: executableCwd,
        tokens: tokens.slice(executableIndex),
      }));
      continue;
    }
    const directSourceCommand =
      executableIndex === 0 && executableCwd === "."
        ? staticDirectSourceCommand(tokens, executableIndex)
        : null;
    if (directSourceCommand !== null) {
      directCommands.push(Object.freeze({
        shellCwd: executableCwd,
        sourcePatterns: directSourceCommand.sourcePatterns,
      }));
      continue;
    }
    if (
      executableCwd === "." &&
      (
        executableIndex === 0 ||
        (
          executableIndex === 1 &&
          tokens[0] ===
            "WRANGLER_LOG_PATH=.wrangler/wrangler.log"
        )
      ) &&
      projectToolCommandIsExact(tokens, executableIndex)
    ) {
      projectToolCommands.push(Object.freeze({
        shellCwd: executableCwd,
      }));
      continue;
    }
    if (
      executable === "bun" ||
      executable === "bunx" ||
      executable === "deno" ||
      executable === "npx" ||
      executable === "yarnpkg" ||
      executable === "lerna" ||
      executable === "nx" ||
      executable === "rush" ||
      executable === "turbo" ||
      executable === "builtin" ||
      executable === "eval" ||
      executable === "source" ||
      executable === "." ||
      (
        (
          executable === "sh" ||
          executable === "bash" ||
          executable === "dash" ||
          executable === "ksh" ||
          executable === "zsh"
        ) &&
        tokens.slice(executableIndex + 1).some((token) =>
          token === "-c" || token === "--command"
        )
      ) ||
      new Set([
        "case",
        "do",
        "done",
        "elif",
        "else",
        "esac",
        "fi",
        "for",
        "function",
        "if",
        "select",
        "then",
        "until",
        "while",
      ]).has(executable)
    ) {
      unmodelled = true;
      continue;
    }
    unmodelled = true;
  }
  return Object.freeze({
    commands,
    directCommands,
    projectToolCommands,
    unmodelled,
  });
}

function delegatedPackageScriptInvocations(command) {
  const parsedCommand = packageManagerCommandTokens(command);
  const actions = parsedCommand.directCommands.map((directCommand) =>
    Object.freeze({
      allWorkspaces: false,
      kind: "exec",
      shellCwd: directCommand.shellCwd,
      sourceBase: "shell",
      sourceCwd: ".",
      sourcePatterns: directCommand.sourcePatterns,
      targets: Object.freeze([]),
    })
  );
  let unmodelled = parsedCommand.unmodelled;
  const managers = new Set();
  const parseManager = (
    manager,
    tokens,
    shellCwd,
    inheritedScope = null,
    depth = 0,
  ) => {
    if (depth > 3) {
      unmodelled = true;
      return;
    }
    managers.add(manager);
    const consumed = new Set([0]);
    const structuralScopeIndexes = new Set();
    const scopeCandidates = [];
    const delimiterIndex = tokens.indexOf("--");
    const optionScanLimit = delimiterIndex === -1
      ? tokens.length
      : delimiterIndex;
    const targetKindForOption = (option) => {
      if (
        (
          manager === "npm" &&
          (
            option === "--workspace" ||
            option === "-w"
          )
        ) ||
        (
          manager === "pnpm" &&
          (
            option === "--workspace" ||
            option === "--filter" ||
            option === "-F"
          )
        ) ||
        (manager === "yarn" && option === "--workspace")
      ) {
        return "workspace";
      }
      if (
        (
          manager === "npm" &&
          (option === "--prefix" || option === "-C")
        ) ||
        (
          manager === "pnpm" &&
          (
            option === "--prefix" ||
            option === "--cwd" ||
            option === "--dir" ||
            option === "-C"
          )
        ) ||
        (
          manager === "yarn" &&
          (option === "--prefix" || option === "--cwd")
        )
      ) {
        return "prefix";
      }
      return null;
    };
    for (let index = 1; index < optionScanLimit; index += 1) {
      const token = tokens[index];
      const recursiveMatch = token.match(
        /^(--recursive|-r)=(true|false)$/u,
      );
      if (manager === "pnpm" && recursiveMatch) {
        consumed.add(index);
        if (recursiveMatch[2] === "true") {
          scopeCandidates.push(Object.freeze({
            allWorkspaces: true,
            consumedIndexes: Object.freeze([index]),
            index,
            target: null,
          }));
        } else {
          unmodelled = true;
        }
        continue;
      }
      if (
        manager === "pnpm" &&
        (token === "--recursive" || token === "-r")
      ) {
        consumed.add(index);
        scopeCandidates.push(Object.freeze({
          allWorkspaces: true,
          consumedIndexes: Object.freeze([index]),
          index,
          target: null,
        }));
        continue;
      }
      const allWorkspacesMatch = token.match(
        /^(--workspaces|--ws)=(true|false)$/u,
      );
      if (manager === "npm" && allWorkspacesMatch) {
        consumed.add(index);
        if (allWorkspacesMatch[2] === "true") {
          scopeCandidates.push(Object.freeze({
            allWorkspaces: true,
            consumedIndexes: Object.freeze([index]),
            index,
            target: null,
          }));
        } else {
          unmodelled = true;
        }
        continue;
      }
      if (
        manager === "npm" &&
        (token === "--workspaces" || token === "--ws")
      ) {
        consumed.add(index);
        scopeCandidates.push(Object.freeze({
          allWorkspaces: true,
          consumedIndexes: Object.freeze([index]),
          index,
          target: null,
        }));
        continue;
      }
      const optionMatch = token.match(
        /^(--prefix|--workspace|--filter|--cwd|--dir|-w|-F)=(.+)$/u,
      );
      if (optionMatch) {
        const kind = targetKindForOption(optionMatch[1]);
        if (kind !== null) {
          consumed.add(index);
          scopeCandidates.push(Object.freeze({
            allWorkspaces: false,
            consumedIndexes: Object.freeze([index]),
            index,
            target: Object.freeze({
              kind,
              selector: optionMatch[2],
            }),
          }));
          continue;
        }
      }
      const targetKind = targetKindForOption(token);
      if (targetKind !== null) {
        consumed.add(index);
        if (index + 1 < optionScanLimit) {
          consumed.add(index + 1);
          scopeCandidates.push(Object.freeze({
            allWorkspaces: false,
            consumedIndexes: Object.freeze([index, index + 1]),
            index,
            target: Object.freeze({
              kind: targetKind,
              selector: tokens[index + 1],
            }),
          }));
          index += 1;
        } else {
          unmodelled = true;
        }
        continue;
      }
    }
    const structuralIndexes = [];
    for (let index = 1; index < tokens.length; index += 1) {
      if (
        !consumed.has(index) &&
        tokens[index] !== "--" &&
        !tokens[index].startsWith("-")
      ) {
        structuralIndexes.push(index);
      }
    }
    const structuralCommandIndex = structuralIndexes[0];
    if (
      manager === "yarn" &&
      tokens[structuralCommandIndex] === "workspaces"
    ) {
      consumed.add(structuralCommandIndex);
      structuralScopeIndexes.add(structuralCommandIndex);
      if (tokens[structuralIndexes[1]] === "foreach") {
        consumed.add(structuralIndexes[1]);
        structuralScopeIndexes.add(structuralIndexes[1]);
      }
      scopeCandidates.push(Object.freeze({
        allWorkspaces: true,
        consumedIndexes: Object.freeze([...structuralScopeIndexes]),
        index: structuralCommandIndex,
        structural: true,
        target: null,
      }));
    } else if (
      manager === "pnpm" &&
      tokens[structuralCommandIndex] === "recursive"
    ) {
      consumed.add(structuralCommandIndex);
      structuralScopeIndexes.add(structuralCommandIndex);
      scopeCandidates.push(Object.freeze({
        allWorkspaces: true,
        consumedIndexes: Object.freeze([structuralCommandIndex]),
        index: structuralCommandIndex,
        structural: true,
        target: null,
      }));
    } else if (
      (manager === "yarn" || manager === "pnpm") &&
      tokens[structuralCommandIndex] === "workspace"
    ) {
      const selectorIndex = structuralIndexes[1];
      if (selectorIndex === undefined) {
        unmodelled = true;
      } else {
        consumed.add(structuralCommandIndex);
        consumed.add(selectorIndex);
        structuralScopeIndexes.add(structuralCommandIndex);
        structuralScopeIndexes.add(selectorIndex);
        scopeCandidates.push(Object.freeze({
          allWorkspaces: false,
          consumedIndexes: Object.freeze([
            structuralCommandIndex,
            selectorIndex,
          ]),
          index: structuralCommandIndex,
          structural: true,
          target: Object.freeze({
            kind: "workspace",
            selector: tokens[selectorIndex],
          }),
        }));
      }
    }
    const modelledNonScopeOptions = new Set([
      "--aggregate-output",
      "--all",
      "--foreground-scripts",
      "--if-present",
      "--ignore-scripts",
      "--interlaced",
      "--no-bail",
      "--no-private",
      "--parallel",
      "--recursive",
      "--report-summary",
      "--silent",
      "--stream",
      "--topological",
      "--topological-dev",
      "--verbose",
      "-A",
      "-R",
      "-i",
      "-p",
      "-s",
      "-t",
      "-v",
    ]);
    const commandIndexes = [];
    for (let index = 1; index < tokens.length; index += 1) {
      if (
        !consumed.has(index) &&
        tokens[index] !== "--" &&
        !tokens[index].startsWith("-")
      ) {
        commandIndexes.push(index);
      }
    }
    const commandIndex = commandIndexes[0];
    if (commandIndex === undefined) return;
    const commandName = tokens[commandIndex];
    const executionBoundaryIndex =
      commandName === "run" ||
        commandName === "run-script" ||
        commandName === "exec" ||
        (manager === "npm" && commandName === "x")
        ? (commandIndexes[1] ?? tokens.length)
        : commandIndex;
    const targets = [];
    let allWorkspaces = false;
    const appliedScopeIndexes = new Set();
    for (const candidate of scopeCandidates) {
      const applies = candidate.structural === true ||
        manager === "npm" ||
        (
          manager === "pnpm" &&
          candidate.index < executionBoundaryIndex
        ) ||
        (
          manager === "yarn" &&
          candidate.index < commandIndex
        );
      if (!applies) {
        if (
          manager === "yarn" &&
          candidate.index < executionBoundaryIndex
        ) {
          unmodelled = true;
        }
        continue;
      }
      for (const index of candidate.consumedIndexes) {
        appliedScopeIndexes.add(index);
      }
      if (candidate.allWorkspaces) allWorkspaces = true;
      if (candidate.target !== null) targets.push(candidate.target);
    }
    if (inheritedScope !== null) {
      if (inheritedScope.allWorkspaces) allWorkspaces = true;
      targets.push(...inheritedScope.targets);
    }
    const optionValidationLimit = manager === "npm"
      ? optionScanLimit
      : Math.min(
          optionScanLimit,
          manager === "pnpm"
            ? executionBoundaryIndex
            : commandIndex,
        );
    for (let index = 1; index < optionValidationLimit; index += 1) {
      if (
        !consumed.has(index) &&
        tokens[index].startsWith("-") &&
        !modelledNonScopeOptions.has(tokens[index])
      ) {
        unmodelled = true;
      }
    }
    if (commandName === "exec" || (manager === "npm" && commandName === "x")) {
      const executableTokens = [];
      const executableStartIndex = commandIndexes[1];
      if (executableStartIndex === undefined) {
        unmodelled = true;
        return;
      }
      for (
        let index = executableStartIndex;
        index < tokens.length;
        index += 1
      ) {
        if (appliedScopeIndexes.has(index)) continue;
        executableTokens.push(tokens[index]);
      }
      const nestedContext = shellExecutableContext(executableTokens);
      if (nestedContext.unmodelled) unmodelled = true;
      const nestedExecutableIndex = nestedContext.index;
      const nestedManager = executableTokens[nestedExecutableIndex];
      if (
        nestedManager === "npm" ||
        nestedManager === "pnpm" ||
        nestedManager === "yarn"
      ) {
        parseManager(
          nestedManager,
          executableTokens.slice(nestedExecutableIndex),
          normalize(join(shellCwd, nestedContext.cwd)),
          Object.freeze({
            allWorkspaces,
            targets: Object.freeze([...targets]),
          }),
          depth + 1,
        );
        return;
      }
      const directSourceCommand = staticDirectSourceCommand(
        executableTokens,
        nestedExecutableIndex,
      );
      if (directSourceCommand === null) {
        unmodelled = true;
        return;
      }
      actions.push(Object.freeze({
        allWorkspaces,
        kind: "exec",
        shellCwd,
        sourceBase: "target",
        sourceCwd: nestedContext.cwd,
        sourcePatterns: directSourceCommand.sourcePatterns,
        targets: Object.freeze([...targets]),
      }));
      return;
    }
    let scriptName = null;
    if (
      commandName === "run" ||
      commandName === "run-script"
    ) {
      scriptName = tokens[commandIndexes[1]] ?? null;
    } else {
      unmodelled = true;
      return;
    }
    if (scriptName === null) return;
    if (!/^[A-Za-z0-9:_-]+$/u.test(scriptName)) {
      unmodelled = true;
      return;
    }
    actions.push(Object.freeze({
        allWorkspaces,
        kind: "script",
        shellCwd,
        scriptName,
        targets: Object.freeze([...targets]),
      }));
  };
  for (const { manager, shellCwd, tokens } of
    parsedCommand.commands) {
    parseManager(manager, tokens, shellCwd);
  }
  return Object.freeze({
    actions: Object.freeze(actions),
    directRuntimeCommands: parsedCommand.directCommands,
    managers: Object.freeze([...managers]),
    projectToolCommands: parsedCommand.projectToolCommands,
    unmodelled,
  });
}

async function productionReachablePackageScripts(
  root,
  manifestRecords,
  projectSourceFiles,
) {
  const canonicalRoot = await canonicalExistingPath(root);
  const packageManagerConfigurationFiles = await listProjectFiles(
    root,
    (name) => packageManagerConfigurationManagers(name).length > 0,
  );
  const scriptNodeKey = (manifestFile, scriptName) =>
    `${manifestFile}\u0000${scriptName}`;
  const recordByFile = new Map(
    manifestRecords.map((record) => [record.manifestFile, record]),
  );
  const recordsByCanonicalManifest = new Map();
  const canonicalDirectoryByRecord = new Map();
  for (const record of manifestRecords) {
    const canonicalManifest =
      await canonicalExistingPath(record.manifestFile);
    canonicalDirectoryByRecord.set(
      record,
      dirname(canonicalManifest),
    );
    const records = recordsByCanonicalManifest.get(canonicalManifest) ?? [];
    records.push(record);
    recordsByCanonicalManifest.set(canonicalManifest, records);
  }
  const recordsForScope = async (
    record,
    scope,
    requiredScriptName = null,
  ) => {
    const candidateRecords = requiredScriptName === null
      ? manifestRecords
      : manifestRecords.filter((candidate) =>
          candidate.commandByName.has(requiredScriptName)
        );
    const shellDirectory = normalize(resolve(
      dirname(record.manifestFile),
      scope.shellCwd,
    ));
    const canonicalShellDirectory =
      await canonicalExistingPath(shellDirectory);
    const relativeCanonicalShellDirectory = relative(
      canonicalRoot,
      canonicalShellDirectory,
    );
    const shellDirectoryIsWithinRoot =
      relativeCanonicalShellDirectory !== ".." &&
      !relativeCanonicalShellDirectory.startsWith(`..${"/"}`);
    if (scope.allWorkspaces) {
      return Object.freeze({
        records: candidateRecords,
        resolved: shellDirectoryIsWithinRoot,
      });
    }
    if (scope.targets.length === 0) {
      const containingRecords = candidateRecords
        .filter((candidate) => {
          const directory = canonicalDirectoryByRecord.get(candidate);
          return canonicalShellDirectory === directory ||
            canonicalShellDirectory.startsWith(`${directory}/`);
        })
        .sort(
          (left, right) =>
            dirname(right.manifestFile).length -
            dirname(left.manifestFile).length,
        );
      return Object.freeze({
        records: containingRecords.length > 0
          ? [containingRecords[0]]
          : candidateRecords,
        resolved:
          shellDirectoryIsWithinRoot && containingRecords.length > 0,
      });
    }
    const matches = [];
    let resolvedEverySelector = shellDirectoryIsWithinRoot;
    for (const target of scope.targets) {
      const selectorMatches = [];
      if (target.kind === "prefix") {
        const targetManifest = normalize(resolve(
          shellDirectory,
          target.selector,
          "package.json",
        ));
        const relativeTarget = relative(root, targetManifest);
        if (
          relativeTarget !== ".." &&
          !relativeTarget.startsWith(`..${"/"}`)
        ) {
          const canonicalTarget =
            await canonicalExistingPath(targetManifest);
          const relativeCanonicalTarget = relative(
            canonicalRoot,
            canonicalTarget,
          );
          if (
            relativeCanonicalTarget !== ".." &&
            !relativeCanonicalTarget.startsWith(`..${"/"}`)
          ) {
            selectorMatches.push(
              ...(recordsByCanonicalManifest.get(canonicalTarget) ?? []),
            );
          }
        }
      } else {
        const targetManifest = normalize(resolve(
          shellDirectory,
          target.selector,
          "package.json",
        ));
        const canonicalTarget =
          await canonicalExistingPath(targetManifest);
        selectorMatches.push(
          ...(recordsByCanonicalManifest.get(canonicalTarget) ?? []),
        );
        const wildcardExpression = new RegExp(
          `^${escapeRegularExpression(target.selector).replaceAll(
            "\\*",
            ".*",
          )}$`,
          "u",
        );
        for (const candidate of manifestRecords) {
          const candidateDirectory = relativePath(
            root,
            dirname(candidate.manifestFile),
          );
          if (
            candidate.packageName === target.selector ||
            candidateDirectory === target.selector ||
            `./${candidateDirectory}` === target.selector ||
            candidateDirectory.startsWith(`${target.selector}/`) ||
            candidateDirectory.startsWith(`./${target.selector}/`) ||
            (
              candidate.packageName !== null &&
              wildcardExpression.test(candidate.packageName)
            ) ||
            wildcardExpression.test(candidateDirectory)
          ) {
            selectorMatches.push(candidate);
          }
        }
      }
      matches.push(
        ...(selectorMatches.length > 0
          ? selectorMatches
          : candidateRecords),
      );
      if (selectorMatches.length === 0) {
        resolvedEverySelector = false;
      }
    }
    const uniqueMatches = [...new Set(matches)];
    return Object.freeze({
      records: uniqueMatches.length > 0 ? uniqueMatches : candidateRecords,
      resolved: resolvedEverySelector && uniqueMatches.length > 0,
    });
  };
  const reachable = new Set();
  const pending = [];
  const execEntriesByManifest = new Map(
    manifestRecords.map((record) => [record.manifestFile, new Set()]),
  );
  const unmodelledManifestFiles = new Set(
    packageManagerConfigurationFiles.length > 0
      ? manifestRecords.map((record) => record.manifestFile)
      : [],
  );
  const enqueueScript = (record, scriptName) => {
    for (const reachableName of [
      `pre${scriptName}`,
      scriptName,
      `post${scriptName}`,
    ]) {
      if (!record.commandByName.has(reachableName)) continue;
      const key = scriptNodeKey(record.manifestFile, reachableName);
      if (!reachable.has(key)) {
        reachable.add(key);
        pending.push(key);
      }
    }
  };
  for (const record of manifestRecords) {
    for (const scriptName of record.commandByName.keys()) {
      if (!packageScriptNameIsTestOnly(scriptName)) {
        enqueueScript(record, scriptName);
      }
    }
  }
  while (pending.length > 0) {
    const key = pending.shift();
    const separatorIndex = key.indexOf("\u0000");
    const manifestFile = key.slice(0, separatorIndex);
    const scriptName = key.slice(separatorIndex + 1);
    const record = recordByFile.get(manifestFile);
    const command = record?.commandByName.get(scriptName);
    if (record === undefined || command === undefined) continue;
    const analysis = delegatedPackageScriptInvocations(command);
    if (
      analysis.unmodelled ||
      analysis.managers.length > 0 ||
      (
        analysis.directRuntimeCommands.length > 0 &&
        canonicalDirectoryByRecord.get(record) !== canonicalRoot
      ) ||
      (
        analysis.projectToolCommands.length > 0 &&
        canonicalDirectoryByRecord.get(record) !== canonicalRoot
      )
    ) {
      unmodelledManifestFiles.add(record.manifestFile);
    }
    for (const action of analysis.actions) {
      if (action.kind === "script") {
        const targetScope = await recordsForScope(
          record,
          action,
          action.scriptName,
        );
        let matchedScript = false;
        for (const targetRecord of targetScope.records) {
          if (!targetRecord.commandByName.has(action.scriptName)) {
            continue;
          }
          matchedScript = true;
          enqueueScript(targetRecord, action.scriptName);
        }
        if (!targetScope.resolved || !matchedScript) {
          unmodelledManifestFiles.add(record.manifestFile);
        }
        continue;
      }
      const targetScope = await recordsForScope(record, action);
      if (!targetScope.resolved) {
        unmodelledManifestFiles.add(record.manifestFile);
      }
      let matchedSource = false;
      for (const targetRecord of targetScope.records) {
        const targetManifest = targetRecord.manifestFile;
        const sourceDirectory = action.sourceBase === "shell"
          ? normalize(resolve(
              dirname(record.manifestFile),
              action.shellCwd,
            ))
          : normalize(resolve(
              dirname(targetManifest),
              action.sourceCwd,
            ));
        for (const pattern of action.sourcePatterns) {
          if (pattern.includes("*") || pattern.includes("?")) {
            for (const file of projectSourceFiles) {
              if (
                shellSourceGlobMatchesFile(
                  join(sourceDirectory, "package.json"),
                  pattern,
                  file,
                )
              ) {
                execEntriesByManifest.get(record.manifestFile).add(file);
                matchedSource = true;
              }
            }
            continue;
          }
          const file = normalize(resolve(
            sourceDirectory,
            pattern,
          ));
          const relativeFile = relative(root, file);
          if (
            relativeFile !== ".." &&
            !relativeFile.startsWith(`..${"/"}`) &&
            projectSourceFiles.includes(file)
          ) {
            execEntriesByManifest.get(record.manifestFile).add(file);
            matchedSource = true;
          }
        }
      }
      if (!matchedSource) {
        unmodelledManifestFiles.add(record.manifestFile);
      }
    }
  }
  return Object.freeze({
    execEntriesByManifest,
    reachable,
    unmodelledManifestFiles,
  });
}

function packageScriptSourcePatterns(command) {
  const patterns = [];
  const pattern =
    /(?:^|[\s"'`=])((?:\.{0,2}\/)?[A-Za-z0-9_@./*?-]+\.(?:[cm]?[jt]sx?))/gu;
  for (const match of command.matchAll(pattern)) {
    const value = match[1];
    const normalized = value.startsWith(".")
      ? value
      : `./${value}`;
    patterns.push(normalized);
  }
  return patterns;
}

function shellSourceGlobMatchesFile(
  manifestFile,
  pattern,
  file,
) {
  let expression = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      if (pattern[index + 2] === "/") {
        expression += "(?:.*/)?";
        index += 2;
      } else {
        expression += ".*";
        index += 1;
      }
      continue;
    }
    if (character === "*") {
      expression += "[^/]*";
      continue;
    }
    if (character === "?") {
      expression += "[^/]";
      continue;
    }
    expression += escapeRegularExpression(character);
  }
  const relativeFile = `./${relative(
    dirname(manifestFile),
    file,
  ).replaceAll("\\", "/")}`;
  return new RegExp(`^${expression}$`, "u").test(relativeFile);
}

async function packageScriptSourceEntries(
  root,
  manifestFiles,
  projectSourceFiles,
) {
  const canonicalTestsDirectory =
    await canonicalExistingPath(join(root, "tests"));
  const isTestSource = async (file) => {
    const canonicalFile =
      await canonicalExistingPath(file);
    const relativeFile = relativePath(
      canonicalTestsDirectory,
      canonicalFile,
    );
    return relativeFile === "" || (
      relativeFile !== ".." &&
      !relativeFile.startsWith("../")
    );
  };
  const manifestRecords = [];
  for (const manifestFile of manifestFiles) {
    let manifest;
    try {
      manifest = JSON.parse(
        await readFile(manifestFile, "utf8"),
      );
    } catch {
      continue;
    }
    if (
      typeof manifest !== "object" ||
      manifest === null ||
      Array.isArray(manifest)
    ) {
      continue;
    }
    const commands = [];
    collectPackageScriptCommands(
      manifest.scripts,
      commands,
    );
    manifestRecords.push(Object.freeze({
      commandByName: new Map(
        commands.map(({ command, scriptName }) => [
          scriptName,
          command,
        ]),
      ),
      commands,
      manifestFile,
      packageName: typeof manifest.name === "string"
        ? manifest.name
        : null,
    }));
  }
  const productionAnalysis =
    await productionReachablePackageScripts(
      root,
      manifestRecords,
      projectSourceFiles,
    );
  const entriesByManifest = new Map();
  const runtimeEntriesByManifest = new Map();
  for (const record of manifestRecords) {
    const { commands, manifestFile } = record;
    const entries = new Set();
    const runtimeEntries = new Set();
    for (const { command, scriptName } of commands) {
      const isRuntimeEntrypoint =
        packageScriptNameIsRuntimeEntrypoint(scriptName);
      const skipCanonicalTestSources =
        packageScriptNameIsTestOnly(scriptName) &&
        !productionAnalysis.reachable.has(
          `${manifestFile}\u0000${scriptName}`,
        );
      for (const pattern of
        packageScriptSourcePatterns(command)) {
        if (pattern.includes("*") || pattern.includes("?")) {
          for (const file of projectSourceFiles) {
            if (
              shellSourceGlobMatchesFile(
                manifestFile,
                pattern,
                file,
              )
            ) {
              if (
                !skipCanonicalTestSources ||
                !(await isTestSource(file))
              ) {
                entries.add(file);
                if (isRuntimeEntrypoint) runtimeEntries.add(file);
              }
            }
          }
          continue;
        }
        const file = normalize(resolve(
          dirname(manifestFile),
          pattern,
        ));
        const relativeFile = relative(root, file);
        if (
          relativeFile !== ".." &&
          !relativeFile.startsWith(`..${"/"}`) &&
          projectSourceFiles.includes(file)
        ) {
          if (
            !skipCanonicalTestSources ||
            !(await isTestSource(file))
          ) {
            entries.add(file);
            if (isRuntimeEntrypoint) runtimeEntries.add(file);
          }
        }
      }
    }
    for (const file of
      productionAnalysis.execEntriesByManifest.get(manifestFile) ?? []) {
      entries.add(file);
    }
    entriesByManifest.set(manifestFile, entries);
    runtimeEntriesByManifest.set(manifestFile, runtimeEntries);
  }
  return Object.freeze({
    entriesByManifest,
    runtimeEntriesByManifest,
    unmodelledManifestFiles:
      productionAnalysis.unmodelledManifestFiles,
  });
}

async function packageScriptSourceClosure(
  root,
  entriesByManifest,
  projectSourceFiles,
  compilerOptions,
) {
  const canonicalFileByFile = new Map(
    await Promise.all(
      projectSourceFiles.map(async (file) => [
        file,
        await canonicalExistingPath(file),
      ]),
    ),
  );
  const availableFileByCanonicalPath = new Map(
    projectSourceFiles.map((file) => [
      canonicalFileByFile.get(file),
      file,
    ]),
  );
  const canonicalFileName = (file) =>
    ts.sys.useCaseSensitiveFileNames
      ? file
      : file.toLowerCase();
  const moduleResolutionCache =
    ts.createModuleResolutionCache(
      root,
      canonicalFileName,
      compilerOptions,
    );
  const pending = [
    ...new Set(
      [...entriesByManifest.values()]
        .flatMap((entries) => [...entries]),
    ),
  ];
  const closure = new Set();

  while (pending.length > 0) {
    const file = pending.shift();
    if (file === undefined || closure.has(file)) {
      continue;
    }
    closure.add(file);

    let source;
    try {
      source = await readFile(file, "utf8");
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }

    const sourceFile = parseSourceFile(file, source);
    const dependencyAnalysis =
      analyzeRuntimeDependencies(sourceFile);
    for (const specifier of dependencyAnalysis.specifiers) {
      const dependency = resolveLocalImport(
        root,
        file,
        specifier,
        compilerOptions,
        availableFileByCanonicalPath,
        moduleResolutionCache,
      );
      if (dependency !== null && !closure.has(dependency)) {
        pending.push(dependency);
      }
    }
  }

  return closure;
}

const productionRuntimeSubprocessSpecifiers = new Set([
  "child_process",
  "node:child_process",
  "node:worker_threads",
  "worker_threads",
]);
const productionRuntimeSubprocessPackages = new Set([
  "cross-spawn",
  "execa",
  "shelljs",
  "zx",
]);

function runtimeSpecifierIsSubprocessCapability(specifier) {
  if (productionRuntimeSubprocessSpecifiers.has(specifier)) {
    return true;
  }
  const packageName = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
  return productionRuntimeSubprocessPackages.has(packageName);
}

function sourceHasProductionRuntimeSubprocessCapability(sourceFile) {
  const dependencyAnalysis = analyzeRuntimeDependencies(sourceFile);
  if (
    dependencyAnalysis.hasRuntimeModuleLoader ||
    dependencyAnalysis.specifiers.some(
      runtimeSpecifierIsSubprocessCapability,
    )
  ) {
    return true;
  }
  let forbidden = false;
  const visit = (node) => {
    if (forbidden) return;
    if (
      (
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)
      ) &&
      ts.isIdentifier(unwrapRuntimeExpression(node.expression)) &&
      unwrapRuntimeExpression(node.expression).text === "process" &&
      !identifierIsShadowedAtRuntime(
        unwrapRuntimeExpression(node.expression),
      ) &&
      (
        runtimeMemberName(node) === "binding" ||
        runtimeMemberName(node) === "dlopen" ||
        runtimeMemberName(node) === "getBuiltinModule"
      )
    ) {
      forbidden = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return forbidden;
}

function scriptKind(file) {
  const extension = extname(file);

  if (extension === ".tsx") {
    return ts.ScriptKind.TSX;
  }
  if (extension === ".jsx") {
    return ts.ScriptKind.JSX;
  }
  if (
    extension === ".js" ||
    extension === ".mjs" ||
    extension === ".cjs"
  ) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function parseSourceFile(file, source) {
  return ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
    scriptKind(file),
  );
}

function hasDirective(sourceFile, directive) {
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    ) {
      return false;
    }

    if (statement.expression.text === directive) {
      return true;
    }
  }

  return false;
}

function isRuntimeEntry(root, file, sourceFile) {
  const path = relativePath(root, file);

  return rootServerOnlyPaths.has(path) ||
    path.startsWith("worker/") ||
    (
      path.startsWith("app/") &&
      !hasDirective(sourceFile, "use client")
    ) ||
    hasDirective(sourceFile, "use server");
}

function importDeclarationIsTypeOnly(node) {
  const clause = node.importClause;

  if (!clause) {
    return false;
  }
  if (clause.isTypeOnly) {
    return true;
  }
  if (clause.name) {
    return false;
  }

  return (
    clause.namedBindings !== undefined &&
    ts.isNamedImports(clause.namedBindings) &&
    clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every(
      (element) => element.isTypeOnly,
    )
  );
}

function exportDeclarationIsTypeOnly(node) {
  if (node.isTypeOnly) {
    return true;
  }

  return (
    node.exportClause !== undefined &&
    ts.isNamedExports(node.exportClause) &&
    node.exportClause.elements.length > 0 &&
    node.exportClause.elements.every(
      (element) => element.isTypeOnly,
    )
  );
}

function sourceFileIsTypeOnlyContract(sourceFile) {
  return sourceFile.statements.length > 0 &&
    sourceFile.statements.every((statement) =>
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      (
        ts.isImportDeclaration(statement) &&
        importDeclarationIsTypeOnly(statement)
      ) ||
      (
        ts.isExportDeclaration(statement) &&
        exportDeclarationIsTypeOnly(statement)
      ) ||
      (
        ts.isImportEqualsDeclaration(statement) &&
        statement.isTypeOnly
      )
    );
}

const stagingRunCapabilityPortDeclarationNames = new Set([
  "BotReplyStagingRunApiCapabilityPort",
  "BotReplyStagingRunClaimCapabilityPort",
  "BotReplyStagingRunClaimInput",
  "BotReplyStagingRunClaimResult",
  "BotReplyStagingRunCompleteCapabilityPort",
  "BotReplyStagingRunCompleteInput",
  "BotReplyStagingRunCompleteResult",
  "BotReplyStagingRunReadCapabilityPort",
  "BotReplyStagingRunReadInput",
  "BotReplyStagingRunReadResult",
  "BotReplyStagingRunWorkerCapabilityPort",
]);
const stagingProviderFenceCapabilityPortDeclarationNames = new Set([
  "BotReplyStagingProviderFenceFinalizeCapabilityPort",
  "BotReplyStagingProviderFenceFinalizeInput",
  "BotReplyStagingProviderFenceFinalizeResult",
  "BotReplyStagingProviderFenceReserveCapabilityPort",
  "BotReplyStagingProviderFenceReserveInput",
  "BotReplyStagingProviderFenceReserveResult",
  "BotReplyStagingProviderFenceWorkerCapabilityPort",
]);

function declarationIsExportedOnly(node) {
  return node.modifiers?.length === 1 &&
    node.modifiers[0].kind === ts.SyntaxKind.ExportKeyword;
}

function typeReferenceIs(node, expectedName) {
  return node !== undefined &&
    ts.isTypeReferenceNode(node) &&
    ts.isIdentifier(node.typeName) &&
    node.typeName.text === expectedName &&
    node.typeArguments === undefined;
}

function wrappedTypeReferenceIs(
  node,
  wrapperName,
  expectedName,
) {
  return node !== undefined &&
    ts.isTypeReferenceNode(node) &&
    ts.isIdentifier(node.typeName) &&
    node.typeName.text === wrapperName &&
    node.typeArguments?.length === 1 &&
    typeReferenceIs(node.typeArguments[0], expectedName);
}

function interfaceExtendsExactly(node, expectedNames) {
  if (expectedNames.length === 0) {
    return node.heritageClauses === undefined;
  }
  const clauses = node.heritageClauses;
  if (
    clauses?.length !== 1 ||
    clauses[0].token !== ts.SyntaxKind.ExtendsKeyword ||
    clauses[0].types.length !== expectedNames.length
  ) {
    return false;
  }
  return clauses[0].types.every((current, index) =>
    ts.isIdentifier(current.expression) &&
    current.expression.text === expectedNames[index] &&
    current.typeArguments === undefined
  );
}

function readonlyTypeLiteral(node) {
  if (
    !ts.isTypeReferenceNode(node) ||
    !ts.isIdentifier(node.typeName) ||
    node.typeName.text !== "Readonly" ||
    node.typeArguments?.length !== 1 ||
    !ts.isTypeLiteralNode(node.typeArguments[0])
  ) {
    return null;
  }
  return node.typeArguments[0];
}

function capabilityAliasIsExact(
  node,
  methodName,
  inputName,
  resultName,
) {
  if (
    !ts.isTypeAliasDeclaration(node) ||
    node.typeParameters !== undefined
  ) {
    return false;
  }
  const typeLiteral = readonlyTypeLiteral(node.type);
  if (
    typeLiteral === null ||
    typeLiteral.members.length !== 1
  ) {
    return false;
  }
  const member = typeLiteral.members[0];
  if (
    !ts.isMethodSignature(member) ||
    staticPropertyName(member.name) !== methodName ||
    member.modifiers !== undefined ||
    member.questionToken !== undefined ||
    member.typeParameters !== undefined ||
    member.parameters.length !== 1 ||
    !wrappedTypeReferenceIs(member.type, "Promise", resultName)
  ) {
    return false;
  }
  const parameter = member.parameters[0];
  return ts.isIdentifier(parameter.name) &&
    parameter.name.text === "input" &&
    parameter.modifiers === undefined &&
    parameter.dotDotDotToken === undefined &&
    parameter.questionToken === undefined &&
    parameter.initializer === undefined &&
    wrappedTypeReferenceIs(parameter.type, "Readonly", inputName);
}

function intersectionTypeReferencesAreExact(node, expectedNames) {
  return ts.isIntersectionTypeNode(node) &&
    node.types.length === expectedNames.length &&
    node.types.every((current, index) =>
      typeReferenceIs(current, expectedNames[index])
    );
}

function readonlyPropertySignatureIsExact(
  member,
  expectedName,
  expectedType,
) {
  if (
    !ts.isPropertySignature(member) ||
    staticPropertyName(member.name) !== expectedName ||
    member.questionToken !== undefined ||
    member.type === undefined ||
    member.modifiers?.length !== 1 ||
    member.modifiers[0].kind !== ts.SyntaxKind.ReadonlyKeyword
  ) {
    return false;
  }
  if (expectedType === "string") {
    return member.type.kind === ts.SyntaxKind.StringKeyword;
  }
  if (expectedType === "number") {
    return member.type.kind === ts.SyntaxKind.NumberKeyword;
  }
  return ts.isUnionTypeNode(member.type) &&
    member.type.types.length === expectedType.length &&
    member.type.types.every((current, index) =>
      ts.isLiteralTypeNode(current) &&
      ts.isStringLiteral(current.literal) &&
      current.literal.text === expectedType[index]
    );
}

function readonlyInterfacePropertiesAreExact(node, expectedProperties) {
  return node.members.length === expectedProperties.length &&
    node.members.every((member, index) =>
      readonlyPropertySignatureIsExact(
        member,
        expectedProperties[index][0],
        expectedProperties[index][1],
      )
    );
}

const stagingProviderFenceReserveInputProperties = Object.freeze([
  Object.freeze(["runKey", "string"]),
  Object.freeze(["tenantId", "number"]),
  Object.freeze(["requestDigest", "string"]),
  Object.freeze(["auditKey", "string"]),
  Object.freeze(["releaseId", "string"]),
  Object.freeze(["commitSha", "string"]),
  Object.freeze(["artifactDigest", "string"]),
  Object.freeze(["runClaimVersion", "number"]),
  Object.freeze(["runLeaseExpiresAt", "string"]),
  Object.freeze(["operationKey", "string"]),
  Object.freeze([
    "operationKind",
    Object.freeze([
      "text-send",
      "button-send",
      "customer-window-expired",
      "provider-retry",
      "pair-limit",
      "duplicate-safety",
    ]),
  ]),
  Object.freeze(["deliveryKey", "string"]),
  Object.freeze(["deliveryClaimVersion", "number"]),
  Object.freeze(["reservationKey", "string"]),
]);

const stagingProviderFenceReserveResultBranches = Object.freeze([
  Object.freeze([
    Object.freeze(["outcome", Object.freeze(["authorized"])]),
    Object.freeze(["operationKey", "string"]),
    Object.freeze(["providerRequestKey", "string"]),
    Object.freeze(["state", Object.freeze(["reserved"])]),
    Object.freeze(["requestedAt", "string"]),
  ]),
  Object.freeze([
    Object.freeze(["outcome", Object.freeze(["replay-blocked"])]),
    Object.freeze(["operationKey", "string"]),
    Object.freeze([
      "state",
      Object.freeze(["reserved", "completed", "indeterminate"]),
    ]),
  ]),
]);

const stagingProviderFenceFinalizeResultBranches = Object.freeze([
  Object.freeze([
    Object.freeze(["outcome", Object.freeze(["pending"])]),
    Object.freeze(["operationKey", "string"]),
    Object.freeze(["state", Object.freeze(["reserved"])]),
  ]),
  Object.freeze([
    Object.freeze([
      "outcome",
      Object.freeze(["finalized", "replayed"]),
    ]),
    Object.freeze(["operationKey", "string"]),
    Object.freeze(["state", Object.freeze(["completed"])]),
    Object.freeze([
      "providerOutcomeKind",
      Object.freeze([
        "accepted",
        "sender-deferred",
        "pair-deferred",
        "service-window-rejected",
      ]),
    ]),
    Object.freeze(["observationKey", "string"]),
    Object.freeze(["finalizedAt", "string"]),
  ]),
  Object.freeze([
    Object.freeze([
      "outcome",
      Object.freeze(["finalized", "replayed"]),
    ]),
    Object.freeze(["operationKey", "string"]),
    Object.freeze(["state", Object.freeze(["indeterminate"])]),
    Object.freeze([
      "providerOutcomeKind",
      Object.freeze(["ambiguous", "lease-expired-without-outcome"]),
    ]),
    Object.freeze(["observationKey", "string"]),
    Object.freeze(["finalizedAt", "string"]),
  ]),
]);

function resultPropertyTypeIsExact(node, expectedType) {
  if (expectedType === "string") {
    return node.kind === ts.SyntaxKind.StringKeyword;
  }
  if (expectedType.length === 1) {
    return ts.isLiteralTypeNode(node) &&
      ts.isStringLiteral(node.literal) &&
      node.literal.text === expectedType[0];
  }
  return ts.isUnionTypeNode(node) &&
    node.types.length === expectedType.length &&
    node.types.every((current, index) =>
      ts.isLiteralTypeNode(current) &&
      ts.isStringLiteral(current.literal) &&
      current.literal.text === expectedType[index]
    );
}

function resultBranchIsExact(node, expectedProperties) {
  return ts.isTypeLiteralNode(node) &&
    node.members.length === expectedProperties.length &&
    node.members.every((member, index) => {
      const [expectedName, expectedType] = expectedProperties[index];
      return ts.isPropertySignature(member) &&
        staticPropertyName(member.name) === expectedName &&
        member.modifiers === undefined &&
        member.questionToken === undefined &&
        member.initializer === undefined &&
        member.type !== undefined &&
        resultPropertyTypeIsExact(member.type, expectedType);
    });
}

function readonlyResultUnionAliasIsExact(node, expectedBranches) {
  if (
    !ts.isTypeAliasDeclaration(node) ||
    node.typeParameters !== undefined ||
    !ts.isTypeReferenceNode(node.type) ||
    !ts.isIdentifier(node.type.typeName) ||
    node.type.typeName.text !== "Readonly" ||
    node.type.typeArguments?.length !== 1
  ) {
    return false;
  }
  const union = node.type.typeArguments[0];
  return ts.isUnionTypeNode(union) &&
    union.types.length === expectedBranches.length &&
    union.types.every((branch, index) =>
      resultBranchIsExact(branch, expectedBranches[index])
    );
}

function stagingRunCapabilityPortsAreExact(sourceFile) {
  if (
    sourceFile.statements.length !==
      stagingRunCapabilityPortDeclarationNames.size
  ) {
    return false;
  }
  const declarations = new Map();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement)
    ) {
      return false;
    }
    const name = statement.name.text;
    if (
      !declarationIsExportedOnly(statement) ||
      !stagingRunCapabilityPortDeclarationNames.has(name) ||
      declarations.has(name)
    ) {
      return false;
    }
    declarations.set(name, statement);
  }

  const claimInput = declarations.get("BotReplyStagingRunClaimInput");
  const readInput = declarations.get("BotReplyStagingRunReadInput");
  const completeInput = declarations.get("BotReplyStagingRunCompleteInput");
  const claimResult = declarations.get("BotReplyStagingRunClaimResult");
  const readResult = declarations.get("BotReplyStagingRunReadResult");
  const completeResult = declarations.get("BotReplyStagingRunCompleteResult");
  const claimPort = declarations.get(
    "BotReplyStagingRunClaimCapabilityPort",
  );
  const readPort = declarations.get(
    "BotReplyStagingRunReadCapabilityPort",
  );
  const completePort = declarations.get(
    "BotReplyStagingRunCompleteCapabilityPort",
  );
  const apiPort = declarations.get("BotReplyStagingRunApiCapabilityPort");
  const workerPort = declarations.get(
    "BotReplyStagingRunWorkerCapabilityPort",
  );

  return ts.isInterfaceDeclaration(claimInput) &&
    interfaceExtendsExactly(claimInput, []) &&
    ts.isInterfaceDeclaration(readInput) &&
    interfaceExtendsExactly(readInput, []) &&
    ts.isInterfaceDeclaration(completeInput) &&
    interfaceExtendsExactly(completeInput, [
      "BotReplyStagingRunReadInput",
    ]) &&
    ts.isTypeAliasDeclaration(claimResult) &&
    ts.isTypeAliasDeclaration(readResult) &&
    ts.isTypeAliasDeclaration(completeResult) &&
    capabilityAliasIsExact(
      claimPort,
      "claim",
      "BotReplyStagingRunClaimInput",
      "BotReplyStagingRunClaimResult",
    ) &&
    capabilityAliasIsExact(
      readPort,
      "read",
      "BotReplyStagingRunReadInput",
      "BotReplyStagingRunReadResult",
    ) &&
    capabilityAliasIsExact(
      completePort,
      "complete",
      "BotReplyStagingRunCompleteInput",
      "BotReplyStagingRunCompleteResult",
    ) &&
    ts.isTypeAliasDeclaration(apiPort) &&
    intersectionTypeReferencesAreExact(apiPort.type, [
      "BotReplyStagingRunClaimCapabilityPort",
      "BotReplyStagingRunReadCapabilityPort",
    ]) &&
    ts.isTypeAliasDeclaration(workerPort) &&
    typeReferenceIs(
      workerPort.type,
      "BotReplyStagingRunCompleteCapabilityPort",
    );
}

function stagingProviderFenceCapabilityPortsAreExact(sourceFile) {
  if (
    sourceFile.statements.length !==
      stagingProviderFenceCapabilityPortDeclarationNames.size
  ) {
    return false;
  }
  const declarations = new Map();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement)
    ) {
      return false;
    }
    const name = statement.name.text;
    if (
      !declarationIsExportedOnly(statement) ||
      !stagingProviderFenceCapabilityPortDeclarationNames.has(name) ||
      declarations.has(name)
    ) {
      return false;
    }
    declarations.set(name, statement);
  }

  const reserveInput = declarations.get(
    "BotReplyStagingProviderFenceReserveInput",
  );
  const finalizeInput = declarations.get(
    "BotReplyStagingProviderFenceFinalizeInput",
  );
  const reserveResult = declarations.get(
    "BotReplyStagingProviderFenceReserveResult",
  );
  const finalizeResult = declarations.get(
    "BotReplyStagingProviderFenceFinalizeResult",
  );
  const reservePort = declarations.get(
    "BotReplyStagingProviderFenceReserveCapabilityPort",
  );
  const finalizePort = declarations.get(
    "BotReplyStagingProviderFenceFinalizeCapabilityPort",
  );
  const workerPort = declarations.get(
    "BotReplyStagingProviderFenceWorkerCapabilityPort",
  );

  return ts.isInterfaceDeclaration(reserveInput) &&
    reserveInput.typeParameters === undefined &&
    interfaceExtendsExactly(reserveInput, []) &&
    readonlyInterfacePropertiesAreExact(
      reserveInput,
      stagingProviderFenceReserveInputProperties,
    ) &&
    ts.isTypeAliasDeclaration(finalizeInput) &&
    finalizeInput.typeParameters === undefined &&
    typeReferenceIs(finalizeInput.type,
      "BotReplyStagingProviderFenceReserveInput",
    ) &&
    readonlyResultUnionAliasIsExact(
      reserveResult,
      stagingProviderFenceReserveResultBranches,
    ) &&
    readonlyResultUnionAliasIsExact(
      finalizeResult,
      stagingProviderFenceFinalizeResultBranches,
    ) &&
    capabilityAliasIsExact(
      reservePort,
      "reserve",
      "BotReplyStagingProviderFenceReserveInput",
      "BotReplyStagingProviderFenceReserveResult",
    ) &&
    capabilityAliasIsExact(
      finalizePort,
      "finalize",
      "BotReplyStagingProviderFenceFinalizeInput",
      "BotReplyStagingProviderFenceFinalizeResult",
    ) &&
    ts.isTypeAliasDeclaration(workerPort) &&
    workerPort.typeParameters === undefined &&
    intersectionTypeReferencesAreExact(workerPort.type, [
      "BotReplyStagingProviderFenceReserveCapabilityPort",
      "BotReplyStagingProviderFenceFinalizeCapabilityPort",
    ]);
}

function stagingProviderFenceCapabilityRepositoryExportsAreExact(
  sourceFile,
) {
  const exportedStatements = sourceFile.statements.filter((statement) =>
    ts.isExportAssignment(statement) ||
    ts.isExportDeclaration(statement) ||
    statement.modifiers?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.ExportKeyword ||
      modifier.kind === ts.SyntaxKind.DefaultKeyword
    )
  );
  if (exportedStatements.length !== 1) {
    return false;
  }
  const factory = exportedStatements[0];
  return ts.isFunctionDeclaration(factory) &&
    declarationIsExportedOnly(factory) &&
    factory.name?.text ===
      "createPostgresBotReplyStagingProviderFenceWorkerCapabilityRepository" &&
    factory.typeParameters === undefined &&
    factory.parameters.length === 1 &&
    factory.body !== undefined &&
    typeReferenceIs(
      factory.type,
      "BotReplyStagingProviderFenceWorkerCapabilityPort",
    );
}

function nodePostgresStagingProviderFenceWorkerCapabilityExportsAreExact(
  sourceFile,
) {
  const exportedStatements = sourceFile.statements.filter((statement) =>
    ts.isExportAssignment(statement) ||
    ts.isExportDeclaration(statement) ||
    statement.modifiers?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.ExportKeyword ||
      modifier.kind === ts.SyntaxKind.DefaultKeyword
    )
  );
  if (exportedStatements.length !== 1) {
    return false;
  }
  const factory = exportedStatements[0];
  return ts.isFunctionDeclaration(factory) &&
    declarationIsExportedOnly(factory) &&
    factory.name?.text ===
      "createNodePostgresBotReplyStagingProviderFenceWorkerCapability" &&
    factory.typeParameters === undefined &&
    factory.parameters.length === 1 &&
    factory.body !== undefined &&
    typeReferenceIs(
      factory.type,
      "BotReplyStagingProviderFenceWorkerCapabilityPort",
    );
}

function declaredModuleSpecifiers(sourceFile) {
  const specifiers = new Set();
  const visit = (node) => {
    if (
      ts.isModuleDeclaration(node) &&
      ts.isStringLiteralLike(node.name)
    ) {
      specifiers.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...specifiers];
}

const dynamicCodeExecutionGlobalNames = new Set([
  "eval",
  "Function",
]);
const runtimeGlobalObjectNames = new Set([
  "globalThis",
  "global",
  "self",
  "window",
]);
const runtimeProcessGlobalNames = new Set([
  "process",
]);
const runtimeReflectGlobalNames = new Set([
  "Reflect",
]);
const runtimeModuleLoaderExportNames = new Set([
  "Module",
  "createRequire",
  "default",
  "register",
  "registerHooks",
  "runMain",
]);
const runtimeModuleLoaderGlobalNames = new Set([
  "module",
  "require",
]);

function importAliasIsTypeOnly(declaration) {
  let current = declaration;
  while (current && !ts.isImportDeclaration(current)) {
    if (
      (ts.isImportSpecifier(current) &&
        current.isTypeOnly) ||
      (ts.isImportEqualsDeclaration(current) &&
        current.isTypeOnly) ||
      (ts.isImportClause(current) &&
        current.isTypeOnly)
    ) {
      return true;
    }
    current = current.parent;
  }
  return current?.importClause?.isTypeOnly === true;
}

function symbolProvidesRuntimeBinding(symbol) {
  if (
    (symbol.flags & ts.SymbolFlags.ModuleExports) !== 0
  ) {
    return false;
  }
  const declarations = symbol.declarations ?? [];
  const declarationProvidesRuntimeBinding =
    (declaration) =>
      (
        ts.getCombinedModifierFlags(declaration) &
        ts.ModifierFlags.Ambient
      ) === 0 &&
      !importAliasIsTypeOnly(declaration);
  return (
    (
      (symbol.flags & ts.SymbolFlags.Value) !== 0 ||
      (symbol.flags & ts.SymbolFlags.Alias) !== 0
    ) &&
    declarations.some(
      declarationProvidesRuntimeBinding,
    )
  );
}

function runtimeBindingSymbolAtIdentifier(node) {
  const escapedName = ts.escapeLeadingUnderscores(
    node.text,
  );
  let current = node.parent;
  while (current) {
    if (
      (
        ts.isFunctionExpression(current) ||
        ts.isClassExpression(current)
      ) &&
      current.name?.text === node.text &&
      current.symbol &&
      symbolProvidesRuntimeBinding(current.symbol)
    ) {
      return current.symbol;
    }
    const symbol = current.locals?.get(escapedName);
    if (
      symbol &&
      symbolProvidesRuntimeBinding(symbol)
    ) {
      return symbol;
    }
    current = current.parent;
  }
  return null;
}

function identifierIsShadowedAtRuntime(node) {
  return runtimeBindingSymbolAtIdentifier(node) !== null;
}

function identifierIsRuntimeValueReference(
  node,
  parent,
) {
  if (!parent) return true;
  if (
    (
      "name" in parent &&
      parent.name === node &&
      !ts.isShorthandPropertyAssignment(parent)
    ) ||
    (
      "propertyName" in parent &&
      parent.propertyName === node
    ) ||
    (
      "label" in parent &&
      parent.label === node
    )
  ) {
    return false;
  }
  return true;
}

function unwrapRuntimeExpression(node) {
  let current = node;
  while (current) {
    if (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isTypeAssertionExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    if (
      ts.isBinaryExpression(current) &&
      current.operatorToken.kind ===
        ts.SyntaxKind.CommaToken
    ) {
      current = current.right;
      continue;
    }
    if (
      ts.isCommaListExpression(current) &&
      current.elements.length > 0
    ) {
      current = current.elements.at(-1);
      continue;
    }
    break;
  }
  return current;
}

function runtimeStaticString(node) {
  const expression = unwrapRuntimeExpression(node);
  if (!expression) return null;
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind ===
      ts.SyntaxKind.PlusToken
  ) {
    const left = runtimeStaticString(expression.left);
    const right = runtimeStaticString(expression.right);
    return left === null || right === null
      ? null
      : `${left}${right}`;
  }
  if (ts.isTemplateExpression(expression)) {
    let value = expression.head.text;
    for (const span of expression.templateSpans) {
      const expressionValue = runtimeStaticString(
        span.expression,
      );
      if (expressionValue === null) return null;
      value += expressionValue;
      value += span.literal.text;
    }
    return value;
  }
  if (
    ts.isCallExpression(expression) &&
    expression.arguments.length === 1 &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "join" &&
    ts.isArrayLiteralExpression(
      expression.expression.expression,
    )
  ) {
    const separator = runtimeStaticString(
      expression.arguments[0],
    );
    if (separator === null) return null;
    const parts = [];
    for (
      const element of
        expression.expression.expression.elements
    ) {
      if (ts.isSpreadElement(element)) return null;
      const part = runtimeStaticString(element);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join(separator);
  }
  return null;
}

function variableDeclarationIsConst(node) {
  return (
    ts.isVariableDeclaration(node) &&
    ts.isVariableDeclarationList(node.parent) &&
    (node.parent.flags & ts.NodeFlags.Const) !== 0
  );
}

function sourceFileRuntimeStaticString(sourceFile, node) {
  if (!sourceFile.locals) {
    ts.bindSourceFile(sourceFile, {
      target: ts.ScriptTarget.Latest,
    });
  }

  const evaluate = (candidate, resolvingSymbols) => {
    const expression = unwrapRuntimeExpression(candidate);
    if (!expression) return null;
    if (ts.isStringLiteralLike(expression)) {
      return expression.text;
    }
    if (ts.isIdentifier(expression)) {
      const symbol = runtimeBindingSymbolAtIdentifier(expression);
      if (!symbol || resolvingSymbols.has(symbol)) return null;
      const declaration = symbol.declarations?.find(
        (current) =>
          variableDeclarationIsConst(current) &&
          current.initializer,
      );
      if (!declaration?.initializer) return null;
      const nextResolvingSymbols = new Set(resolvingSymbols);
      nextResolvingSymbols.add(symbol);
      return evaluate(
        declaration.initializer,
        nextResolvingSymbols,
      );
    }
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind ===
        ts.SyntaxKind.PlusToken
    ) {
      const left = evaluate(
        expression.left,
        resolvingSymbols,
      );
      const right = evaluate(
        expression.right,
        resolvingSymbols,
      );
      return typeof left === "string" &&
          typeof right === "string"
        ? `${left}${right}`
        : null;
    }
    if (ts.isTemplateExpression(expression)) {
      let value = expression.head.text;
      for (const span of expression.templateSpans) {
        const expressionValue = evaluate(
          span.expression,
          resolvingSymbols,
        );
        if (typeof expressionValue !== "string") return null;
        value += expressionValue;
        value += span.literal.text;
      }
      return value;
    }
    if (ts.isArrayLiteralExpression(expression)) {
      const values = [];
      for (const element of expression.elements) {
        if (ts.isSpreadElement(element)) return null;
        const value = evaluate(element, resolvingSymbols);
        if (typeof value !== "string") return null;
        values.push(value);
      }
      return values;
    }
    if (ts.isObjectLiteralExpression(expression)) {
      const values = new Map();
      for (const property of expression.properties) {
        if (!ts.isPropertyAssignment(property)) return null;
        const propertyName = staticPropertyName(property.name);
        if (propertyName === null) return null;
        const value = evaluate(
          property.initializer,
          resolvingSymbols,
        );
        if (value === null) return null;
        values.set(propertyName, value);
      }
      return values;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      const target = evaluate(
        expression.expression,
        resolvingSymbols,
      );
      return target instanceof Map
        ? target.get(expression.name.text) ?? null
        : null;
    }
    if (ts.isElementAccessExpression(expression)) {
      const target = evaluate(
        expression.expression,
        resolvingSymbols,
      );
      const member = expression.argumentExpression
        ? evaluate(
            expression.argumentExpression,
            resolvingSymbols,
          )
        : null;
      if (typeof member !== "string") return null;
      if (target instanceof Map) {
        return target.get(member) ?? null;
      }
      if (Array.isArray(target) && /^\d+$/.test(member)) {
        return target[Number(member)] ?? null;
      }
      return null;
    }
    if (
      ts.isCallExpression(expression) &&
      expression.arguments.length === 1 &&
      ts.isPropertyAccessExpression(expression.expression) &&
      ts.isIdentifier(expression.expression.expression) &&
      expression.expression.expression.text === "Object" &&
      expression.expression.name.text === "freeze" &&
      !identifierIsShadowedAtRuntime(
        expression.expression.expression,
      )
    ) {
      return evaluate(
        expression.arguments[0],
        resolvingSymbols,
      );
    }
    if (
      ts.isCallExpression(expression) &&
      expression.arguments.length === 1 &&
      ts.isPropertyAccessExpression(expression.expression) &&
      expression.expression.name.text === "join"
    ) {
      const target = evaluate(
        expression.expression.expression,
        resolvingSymbols,
      );
      const separator = evaluate(
        expression.arguments[0],
        resolvingSymbols,
      );
      return Array.isArray(target) &&
          target.every((value) => typeof value === "string") &&
          typeof separator === "string"
        ? target.join(separator)
        : null;
    }
    return null;
  };

  const value = evaluate(node, new Set());
  return typeof value === "string" ? value : null;
}

function sourceFileReferencesDormantCredentialBoundPreSendSql(
  sourceFile,
  allowedIdentifiers = new Set(),
  allowPolicyDeclaration = false,
  dormantIdentifiers = dormantBotReplyStagingSqlIdentifiers,
) {
  let referencesDormantSql = false;
  const containsDormantIdentifier = (value) => {
    if (value === null) return false;
    for (
      const identifier of
      dormantIdentifiers
    ) {
      if (
        value.includes(identifier) &&
        !allowedIdentifiers.has(identifier)
      ) {
        return true;
      }
    }
    return false;
  };
  const visit = (node) => {
    if (referencesDormantSql) return;
    if (
      allowPolicyDeclaration &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      (
        node.name.text ===
          "dormantCredentialBoundPreSendSqlIdentifiers" ||
        node.name.text ===
          "dormantWriterBarrierAndLateTruthSqlIdentifiers" ||
        node.name.text ===
          "dormantPinnedSessionWriterSqlIdentifiers" ||
        node.name.text ===
          "dormantBotReplyStagingSqlIdentifiers" ||
        node.name.text ===
          "postgresMigrationParityRegistryAllowedSqlIdentifiers" ||
        node.name.text ===
          "nodePostgresBotReplyPinnedSessionTransportExpectedQueryStatements" ||
        node.name.text ===
          "nodePostgresBotReplyPinnedSessionTransportExpectedSqlFunctionIdentifiers"
      )
    ) {
      return;
    }

    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateExpression(node) ||
      (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind ===
          ts.SyntaxKind.PlusToken
      ) ||
      (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "join"
      )
    ) {
      referencesDormantSql = containsDormantIdentifier(
        sourceFileRuntimeStaticString(sourceFile, node),
      );
    }

    if (
      !referencesDormantSql &&
      ts.isTemplateExpression(node)
    ) {
      referencesDormantSql =
        containsDormantIdentifier(node.head.text) ||
        node.templateSpans.some((span) =>
          containsDormantIdentifier(span.literal.text)
        );
    }

    if (!referencesDormantSql) {
      ts.forEachChild(node, visit);
    }
  };

  visit(sourceFile);
  return referencesDormantSql;
}

function sourceReferencesDormantSqlIdentifier(
  source,
  dormantIdentifiers,
  allowedIdentifiers = new Set(),
) {
  return [...dormantIdentifiers].some(
    (identifier) =>
      !allowedIdentifiers.has(identifier) &&
      source.includes(identifier),
  );
}

function allowedDormantSqlIdentifiersForPath(path) {
  return new Set([
    ...(
      dormantCredentialBoundPreSendAllowedSqlIdentifiersByPath.get(
        path,
      ) ?? []
    ),
    ...(
      dormantWriterBarrierAndLateTruthAllowedSqlIdentifiersByPath.get(
        path,
      ) ?? []
    ),
  ]);
}

function objectFreezeArgument(node) {
  const expression = unwrapRuntimeExpression(node);
  if (
    !expression ||
    !ts.isCallExpression(expression) ||
    expression.arguments.length !== 1 ||
    !ts.isPropertyAccessExpression(expression.expression) ||
    expression.expression.name.text !== "freeze" ||
    !ts.isIdentifier(expression.expression.expression) ||
    expression.expression.expression.text !== "Object"
  ) {
    return null;
  }
  return unwrapRuntimeExpression(expression.arguments[0]);
}

function transportSessionKeysAreExact(sourceFile) {
  const declarations = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "sessionKeys"
      ) {
        declarations.push({ declaration, statement });
      }
    }
  }
  if (declarations.length !== 1) return false;
  const { declaration, statement } = declarations[0];
  const value = objectFreezeArgument(declaration.initializer);
  return statement.modifiers === undefined &&
    (statement.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
    statement.declarationList.declarations.length === 1 &&
    declaration.type === undefined &&
    value !== null &&
    ts.isArrayLiteralExpression(value) &&
    value.elements.length ===
      nodePostgresBotReplyPinnedSessionTransportExpectedSessionMethods.length &&
    value.elements.every(
      (element, index) =>
        ts.isStringLiteralLike(element) &&
        element.text ===
          nodePostgresBotReplyPinnedSessionTransportExpectedSessionMethods[
            index
          ],
    );
}

function transportRuntimeImportIsExact(sourceFile) {
  const runtimeImports = sourceFile.statements.filter(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      !importDeclarationIsTypeOnly(statement),
  );
  if (runtimeImports.length !== 1) return false;
  const declaration = runtimeImports[0];
  const clause = declaration.importClause;
  const bindings = clause?.namedBindings;
  if (
    !ts.isStringLiteralLike(declaration.moduleSpecifier) ||
    declaration.moduleSpecifier.text !== "node:util" ||
    clause === undefined ||
    clause.isTypeOnly ||
    clause.name !== undefined ||
    bindings === undefined ||
    !ts.isNamedImports(bindings) ||
    bindings.elements.length !== 1
  ) {
    return false;
  }
  const element = bindings.elements[0];
  return !element.isTypeOnly &&
    element.propertyName?.text === "types" &&
    element.name.text === "nodeUtilTypes";
}

function transportStatusDeclarationIsExact(statement) {
  if (
    !ts.isVariableStatement(statement) ||
    !declarationIsExportedOnly(statement) ||
    (statement.declarationList.flags & ts.NodeFlags.Const) === 0 ||
    statement.declarationList.declarations.length !== 1
  ) {
    return false;
  }
  const declaration = statement.declarationList.declarations[0];
  if (
    !ts.isIdentifier(declaration.name) ||
    declaration.name.text !==
      "nodePostgresBotReplyPinnedSessionTransportStatus" ||
    declaration.type !== undefined
  ) {
    return false;
  }
  const value = objectFreezeArgument(declaration.initializer);
  if (!value || !ts.isObjectLiteralExpression(value)) return false;
  const properties = new Map();
  for (const property of value.properties) {
    if (!ts.isPropertyAssignment(property)) return false;
    const name = staticPropertyName(property.name);
    if (name === null || properties.has(name)) return false;
    properties.set(name, unwrapRuntimeExpression(property.initializer));
  }
  return properties.size === 3 &&
    properties.get("activationAllowed")?.kind ===
      ts.SyntaxKind.FalseKeyword &&
    ts.isNumericLiteral(properties.get("runtimeImporters")) &&
    properties.get("runtimeImporters").text === "0" &&
    ts.isStringLiteralLike(properties.get("trustedWriters")) &&
    properties.get("trustedWriters").text === "missing";
}

function transportQueryStatementsAreExact(sourceFile) {
  const declarations = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of
      statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "queryStatements"
      ) {
        declarations.push({ declaration, statement });
      }
    }
  }
  if (declarations.length !== 1) return null;
  const { declaration, statement } = declarations[0];
  if (
    statement.modifiers !== undefined ||
    (statement.declarationList.flags & ts.NodeFlags.Const) === 0 ||
    statement.declarationList.declarations.length !== 1 ||
    declaration.type !== undefined
  ) {
    return null;
  }
  const value = objectFreezeArgument(declaration.initializer);
  if (!value || !ts.isObjectLiteralExpression(value)) return null;
  const statements = new Map();
  for (const property of value.properties) {
    if (!ts.isPropertyAssignment(property)) return null;
    const name = staticPropertyName(property.name);
    const sql = runtimeStaticString(property.initializer);
    if (name === null || sql === null || statements.has(name)) {
      return null;
    }
    statements.set(name, sql);
  }
  const expected = Object.entries(
    nodePostgresBotReplyPinnedSessionTransportExpectedQueryStatements,
  );
  if (
    statements.size !== expected.length ||
    expected.some(([name, sql]) => statements.get(name) !== sql)
  ) {
    return null;
  }
  return Object.freeze({
    declaration,
    initializer: declaration.initializer,
    symbol: runtimeBindingSymbolAtIdentifier(declaration.name),
  });
}

function collectRuntimeBindingIdentifiers(sourceFile, names) {
  const bindings = new Map(
    [...names].map((name) => [name, []]),
  );
  const collectName = (name) => {
    if (ts.isIdentifier(name)) {
      bindings.get(name.text)?.push(name);
      return;
    }
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) {
        collectName(element.name);
      }
    }
  };
  const visit = (node) => {
    if (ts.isTypeNode(node)) return;
    if (
      ts.isImportDeclaration(node) ||
      ts.isImportEqualsDeclaration(node)
    ) {
      return;
    }
    if (
      ts.isVariableDeclaration(node) ||
      ts.isParameter(node)
    ) {
      collectName(node.name);
    } else if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isClassDeclaration(node) ||
      ts.isClassExpression(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isModuleDeclaration(node)
    ) {
      if (node.name !== undefined) collectName(node.name);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function transportControlStatementsAreExact(
  sourceFile,
  bindingIdentifier,
) {
  const declaration = bindingIdentifier.parent;
  if (
    !ts.isVariableDeclaration(declaration) ||
    declaration.name !== bindingIdentifier ||
    declaration.parent.parent.parent !== sourceFile ||
    declaration.type !== undefined ||
    declaration.parent.declarations.length !== 1 ||
    (declaration.parent.flags & ts.NodeFlags.Const) === 0
  ) {
    return null;
  }
  const value = objectFreezeArgument(declaration.initializer);
  if (!value || !ts.isObjectLiteralExpression(value)) return null;
  const statements = new Map();
  for (const property of value.properties) {
    if (!ts.isPropertyAssignment(property)) return null;
    const name = staticPropertyName(property.name);
    const sql = runtimeStaticString(property.initializer);
    if (name === null || sql === null || statements.has(name)) {
      return null;
    }
    statements.set(name, sql);
  }
  const expected = Object.entries(
    nodePostgresBotReplyPinnedSessionTransportExpectedControlStatements,
  );
  if (
    statements.size !== expected.length ||
    expected.some(([name, sql]) => statements.get(name) !== sql)
  ) {
    return null;
  }
  return Object.freeze({
    declaration,
    symbol: runtimeBindingSymbolAtIdentifier(bindingIdentifier),
  });
}

function transportSqlCallSitesAreExact(
  sourceFile,
  queryStatementsContract,
) {
  const bindingNames = new Set([
    "checkedClient",
    "controlStatements",
    "query",
    "queryStatements",
    "resultConfig",
    "resultFields",
    "runCommittedCapability",
  ]);
  const bindings = collectRuntimeBindingIdentifiers(
    sourceFile,
    bindingNames,
  );
  if (
    [...bindingNames].some(
      (name) => bindings.get(name).length !== 1,
    )
  ) {
    return false;
  }
  const bindingSymbol = (name) =>
    runtimeBindingSymbolAtIdentifier(bindings.get(name)[0]);
  const queryStatementsSymbol = bindingSymbol("queryStatements");
  if (
    queryStatementsSymbol === null ||
    queryStatementsContract.symbol !== queryStatementsSymbol
  ) {
    return false;
  }
  const controlContract = transportControlStatementsAreExact(
    sourceFile,
    bindings.get("controlStatements")[0],
  );
  if (controlContract === null) return false;

  const queryDeclaration = bindings.get("query")[0].parent;
  const runDeclaration = bindings.get("runCommittedCapability")[0].parent;
  const resultConfigDeclaration = bindings.get("resultConfig")[0].parent;
  const checkedClientDeclaration = bindings.get("checkedClient")[0].parent;
  if (
    !ts.isVariableDeclaration(queryDeclaration) ||
    !ts.isArrowFunction(
      unwrapRuntimeExpression(queryDeclaration.initializer),
    ) ||
    unwrapRuntimeExpression(queryDeclaration.initializer).parameters.length !==
      1 ||
    !ts.isIdentifier(
      unwrapRuntimeExpression(queryDeclaration.initializer).parameters[0]
        .name,
    ) ||
    unwrapRuntimeExpression(queryDeclaration.initializer).parameters[0]
      .name.text !== "input" ||
    !ts.isVariableDeclaration(runDeclaration) ||
    !ts.isArrowFunction(
      unwrapRuntimeExpression(runDeclaration.initializer),
    ) ||
    unwrapRuntimeExpression(runDeclaration.initializer).parameters.length !==
      3 ||
    unwrapRuntimeExpression(runDeclaration.initializer).parameters.some(
      (parameter, index) =>
        !ts.isIdentifier(parameter.name) ||
        parameter.name.text !==
          ["text", "values", "expectedFields"][index],
    ) ||
    !ts.isFunctionDeclaration(resultConfigDeclaration) ||
    resultConfigDeclaration.name !== bindings.get("resultConfig")[0] ||
    !ts.isParameter(checkedClientDeclaration) ||
    checkedClientDeclaration.name !== bindings.get("checkedClient")[0]
  ) {
    return false;
  }

  const symbols = new Map(
    [...bindingNames].map((name) => [name, bindingSymbol(name)]),
  );
  if ([...symbols.values()].some((symbol) => symbol === null)) {
    return false;
  }
  const references = new Map(
    [...bindingNames].map((name) => [name, []]),
  );
  const visitReferences = (node) => {
    if (ts.isTypeNode(node)) return;
    if (
      ts.isImportDeclaration(node) ||
      ts.isImportEqualsDeclaration(node)
    ) {
      return;
    }
    if (
      ts.isIdentifier(node) &&
      identifierIsRuntimeValueReference(node, node.parent)
    ) {
      const symbol = runtimeBindingSymbolAtIdentifier(node);
      for (const [name, expectedSymbol] of symbols) {
        if (symbol === expectedSymbol) {
          references.get(name).push(node);
          break;
        }
      }
    }
    ts.forEachChild(node, visitReferences);
  };
  visitReferences(sourceFile);

  const declarationIdentifiers = new Set(
    [...bindings.values()].flat(),
  );
  const directCalls = (name) => {
    const calls = [];
    for (const reference of references.get(name)) {
      if (declarationIdentifiers.has(reference)) continue;
      const parent = reference.parent;
      if (
        !ts.isCallExpression(parent) ||
        parent.expression !== reference ||
        parent.questionDotToken !== undefined
      ) {
        return null;
      }
      calls.push(parent);
    }
    return calls;
  };
  const propertyReferences = (name) => {
    const properties = [];
    for (const reference of references.get(name)) {
      if (declarationIdentifiers.has(reference)) continue;
      const parent = reference.parent;
      if (
        !ts.isPropertyAccessExpression(parent) ||
        parent.expression !== reference ||
        parent.questionDotToken !== undefined
      ) {
        return null;
      }
      properties.push(parent);
    }
    return properties;
  };

  const queryCalls = directCalls("query");
  const resultConfigCalls = directCalls("resultConfig");
  const runCalls = directCalls("runCommittedCapability");
  const controlProperties = propertyReferences("controlStatements");
  const queryProperties = propertyReferences("queryStatements");
  if (
    queryCalls === null ||
    resultConfigCalls === null ||
    runCalls === null ||
    controlProperties === null ||
    queryProperties === null ||
    queryCalls.length !== 10 ||
    resultConfigCalls.length !== 4 ||
    runCalls.length !== 7 ||
    controlProperties.length !== 6 ||
    queryProperties.length !== 11
  ) {
    return false;
  }

  const propertyKey = (node, name) => {
    if (
      !ts.isPropertyAccessExpression(node) ||
      !ts.isIdentifier(node.expression) ||
      runtimeBindingSymbolAtIdentifier(node.expression) !==
        symbols.get(name) ||
      node.questionDotToken !== undefined
    ) {
      return null;
    }
    return node.name.text;
  };
  const exactIdentifierArray = (node, names) =>
    ts.isArrayLiteralExpression(unwrapRuntimeExpression(node)) &&
    unwrapRuntimeExpression(node).elements.length === names.length &&
    unwrapRuntimeExpression(node).elements.every(
      (element, index) =>
        ts.isIdentifier(element) && element.text === names[index],
    );
  const resultConfigKey = (node) => {
    if (
      !ts.isCallExpression(node) ||
      node.arguments.length !== 2 ||
      !ts.isIdentifier(node.expression) ||
      runtimeBindingSymbolAtIdentifier(node.expression) !==
        symbols.get("resultConfig")
    ) {
      return null;
    }
    const first = unwrapRuntimeExpression(node.arguments[0]);
    if (
      ts.isIdentifier(first) &&
      first.text === "text" &&
      ts.isIdentifier(unwrapRuntimeExpression(node.arguments[1])) &&
      unwrapRuntimeExpression(node.arguments[1]).text === "values"
    ) {
      return "text-values";
    }
    const queryKey = propertyKey(first, "queryStatements");
    if (
      (queryKey === "pid" || queryKey === "lockProof") &&
      exactIdentifierArray(node.arguments[1], [])
    ) {
      return queryKey;
    }
    return null;
  };
  const queryCallCounts = new Map();
  const approvedControlProperties = new Set();
  const approvedResultConfigCalls = new Set();
  const countQueryCall = (key) => {
    queryCallCounts.set(key, (queryCallCounts.get(key) ?? 0) + 1);
  };
  for (const call of queryCalls) {
    if (call.arguments.length !== 1) return false;
    const argument = unwrapRuntimeExpression(call.arguments[0]);
    const controlKey = propertyKey(argument, "controlStatements");
    if (controlKey !== null) {
      approvedControlProperties.add(argument);
      countQueryCall(`control:${controlKey}`);
      continue;
    }
    const configKey = resultConfigKey(argument);
    if (configKey === null) return false;
    approvedResultConfigCalls.add(argument);
    countQueryCall(`result:${configKey}`);
  }
  const expectedQueryCallCounts = new Map([
    ["control:beginReadCommitted", 1],
    ["control:commit", 1],
    ["control:discardAll", 2],
    ["control:rollback", 2],
    ["result:lockProof", 1],
    ["result:pid", 2],
    ["result:text-values", 1],
  ]);
  if (
    queryCallCounts.size !== expectedQueryCallCounts.size ||
    [...expectedQueryCallCounts].some(
      ([key, count]) => queryCallCounts.get(key) !== count,
    ) ||
    controlProperties.some(
      (property) => !approvedControlProperties.has(property),
    ) ||
    resultConfigCalls.some(
      (call) => !approvedResultConfigCalls.has(call),
    )
  ) {
    return false;
  }

  const resultFieldsSymbol = symbols.get("resultFields");
  const exactPropertyAccess = (node, baseName, memberName) => {
    const value = unwrapRuntimeExpression(node);
    return ts.isPropertyAccessExpression(value) &&
      value.questionDotToken === undefined &&
      ts.isIdentifier(value.expression) &&
      value.expression.text === baseName &&
      value.name.text === memberName;
  };
  const exactRunValues = (node, key) => {
    const value = unwrapRuntimeExpression(node);
    if (!ts.isArrayLiteralExpression(value)) return false;
    if (
      key === "persistProviderFact"
    ) {
      return value.elements.length === 2 &&
        ts.isIdentifier(value.elements[0]) &&
        value.elements[0].text === "permitKey" &&
        ts.isSpreadElement(value.elements[1]) &&
        exactPropertyAccess(value.elements[1].expression, "fact", "values");
    }
    if (key === "persistProviderUncertainty") {
      return value.elements.length === 2 &&
        ts.isIdentifier(value.elements[0]) &&
        value.elements[0].text === "permitKey" &&
        ts.isIdentifier(value.elements[1]) &&
        value.elements[1].text === "reason";
    }
    return value.elements.length === 1 &&
      ts.isIdentifier(value.elements[0]) &&
      value.elements[0].text === "permitKey";
  };
  const runKey = (call) => {
    if (call.arguments.length !== 3) return null;
    const fields = unwrapRuntimeExpression(call.arguments[2]);
    if (
      !ts.isPropertyAccessExpression(fields) ||
      !ts.isIdentifier(fields.expression) ||
      runtimeBindingSymbolAtIdentifier(fields.expression) !==
        resultFieldsSymbol
    ) {
      return null;
    }
    const first = unwrapRuntimeExpression(call.arguments[0]);
    if (ts.isConditionalExpression(first)) {
      const whenTrue = propertyKey(
        unwrapRuntimeExpression(first.whenTrue),
        "queryStatements",
      );
      const whenFalse = propertyKey(
        unwrapRuntimeExpression(first.whenFalse),
        "queryStatements",
      );
      const exactFinalization = ts.isIdentifier(
        unwrapRuntimeExpression(first.condition),
      ) &&
        unwrapRuntimeExpression(first.condition).text === "reconciliation" &&
        whenTrue === "reconcile" &&
        whenFalse === "finalize" &&
        fields.name.text === "finalization" &&
        exactRunValues(call.arguments[1], "finalization");
      return exactFinalization ? "finalization" : null;
    }
    const statement = propertyKey(first, "queryStatements");
    const expectedField = statement === "persistProviderFact"
      ? "providerFact"
      : statement === "persistProviderUncertainty"
        ? "providerUncertainty"
        : statement;
    return statement !== null &&
        fields.name.text === expectedField &&
        exactRunValues(call.arguments[1], statement)
      ? statement
      : null;
  };
  const runKeys = runCalls.map(runKey).sort();
  if (
    runKeys.some((key) => key === null) ||
    runKeys.join(",") !==
      "acquire,consume,finalization,persistProviderFact,persistProviderUncertainty,prove,release"
  ) {
    return false;
  }
  const approvedQueryProperties = new Set();
  for (const call of runCalls) {
    const first = unwrapRuntimeExpression(call.arguments[0]);
    if (ts.isConditionalExpression(first)) {
      approvedQueryProperties.add(
        unwrapRuntimeExpression(first.whenTrue),
      );
      approvedQueryProperties.add(
        unwrapRuntimeExpression(first.whenFalse),
      );
    } else {
      approvedQueryProperties.add(first);
    }
  }
  for (const call of resultConfigCalls) {
    const first = unwrapRuntimeExpression(call.arguments[0]);
    if (ts.isPropertyAccessExpression(first)) {
      approvedQueryProperties.add(first);
    }
  }
  if (
    queryProperties.some(
      (property) => !approvedQueryProperties.has(property),
    )
  ) {
    return false;
  }

  const checkedClientSymbol = symbols.get("checkedClient");
  const checkedClientMembers = [];
  const visitCheckedClientMembers = (node) => {
    if (ts.isTypeNode(node)) return;
    if (
      (
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)
      ) &&
      ts.isIdentifier(node.expression) &&
      runtimeBindingSymbolAtIdentifier(node.expression) ===
        checkedClientSymbol &&
      (runtimeMemberName(node) === "query" ||
        runtimeMemberName(node) === "client")
    ) {
      checkedClientMembers.push(node);
    }
    ts.forEachChild(node, visitCheckedClientMembers);
  };
  visitCheckedClientMembers(sourceFile);
  if (
    checkedClientMembers.length !== 2 ||
    checkedClientMembers.filter(
      (member) => runtimeMemberName(member) === "query",
    ).length !== 1 ||
    checkedClientMembers.filter(
      (member) => runtimeMemberName(member) === "client",
    ).length !== 1
  ) {
    return false;
  }
  const queryMember = checkedClientMembers.find(
    (member) => runtimeMemberName(member) === "query",
  );
  const clientMember = checkedClientMembers.find(
    (member) => runtimeMemberName(member) === "client",
  );
  const reflectCall = queryMember.parent;
  return ts.isPropertyAccessExpression(queryMember) &&
    ts.isPropertyAccessExpression(clientMember) &&
    ts.isCallExpression(reflectCall) &&
    ts.isPropertyAccessExpression(reflectCall.expression) &&
    ts.isIdentifier(reflectCall.expression.expression) &&
    reflectCall.expression.expression.text === "Reflect" &&
    !identifierIsShadowedAtRuntime(
      reflectCall.expression.expression,
    ) &&
    reflectCall.expression.name.text === "apply" &&
    reflectCall.arguments.length === 3 &&
    reflectCall.arguments[0] === queryMember &&
    reflectCall.arguments[1] === clientMember &&
    exactIdentifierArray(reflectCall.arguments[2], ["input"]);
}

function transportRuntimeExportsAreExact(sourceFile) {
  const runtimeExports = new Map();
  for (const statement of sourceFile.statements) {
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
    ) {
      continue;
    }
    if (
      ts.isExportAssignment(statement) ||
      (
        ts.isExportDeclaration(statement) &&
        !exportDeclarationIsTypeOnly(statement)
      )
    ) {
      return null;
    }
    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    const defaultExported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
    );
    if (!exported && !defaultExported) continue;
    if (defaultExported) return null;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of
        statement.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          runtimeExports.has(declaration.name.text)
        ) {
          return null;
        }
        runtimeExports.set(declaration.name.text, statement);
      }
      continue;
    }
    if (
      (
        ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)
      ) &&
      statement.name !== undefined &&
      !runtimeExports.has(statement.name.text)
    ) {
      runtimeExports.set(statement.name.text, statement);
      continue;
    }
    return null;
  }
  if (
    runtimeExports.size !==
      nodePostgresBotReplyPinnedSessionTransportExpectedRuntimeExports.size ||
    [...runtimeExports.keys()].some(
      (name) =>
        !nodePostgresBotReplyPinnedSessionTransportExpectedRuntimeExports.has(
          name,
        ),
    )
  ) {
    return null;
  }
  const status = runtimeExports.get(
    "nodePostgresBotReplyPinnedSessionTransportStatus",
  );
  const errorClass = runtimeExports.get(
    "NodePostgresBotReplyPinnedSessionTransportError",
  );
  const factory = runtimeExports.get(
    "createNodePostgresBotReplyPinnedSessionTransport",
  );
  if (
    !transportStatusDeclarationIsExact(status) ||
    !ts.isClassDeclaration(errorClass) ||
    !declarationIsExportedOnly(errorClass) ||
    !ts.isFunctionDeclaration(factory) ||
    !declarationIsExportedOnly(factory) ||
    factory.body === undefined ||
    factory.parameters.length !== 1
  ) {
    return null;
  }
  return factory;
}

function transportFactorySurfaceIsExact(factory) {
  const directReturns = factory.body.statements.filter(
    ts.isReturnStatement,
  );
  if (directReturns.length !== 1) return false;
  const value = objectFreezeArgument(directReturns[0].expression);
  if (
    !value ||
    !ts.isObjectLiteralExpression(value) ||
    value.properties.length !== 1
  ) {
    return false;
  }
  const openPinned = value.properties[0];
  return ts.isMethodDeclaration(openPinned) &&
    staticPropertyName(openPinned.name) === "openPinned" &&
    openPinned.parameters.length === 1 &&
    openPinned.body !== undefined &&
    openPinned.modifiers?.length === 1 &&
    openPinned.modifiers[0].kind === ts.SyntaxKind.AsyncKeyword;
}

function transportAbortBoundaryContractIsExact(sourceFile) {
  const expectedSource = ts.createSourceFile(
    "node-postgres-pinned-abort-boundary-contract.ts",
    [
      "const abortSignalAbortedGetter = Object.getOwnPropertyDescriptor(",
      "  AbortSignal.prototype,",
      '  "aborted",',
      ")?.get;",
      "const eventTargetAddEventListener = EventTarget.prototype.addEventListener;",
      "const eventTargetRemoveEventListener = EventTarget.prototype.removeEventListener;",
      "function signalIsAborted(signal: AbortSignal): boolean {",
      "  if (abortSignalAbortedGetter === undefined) {",
      '    return fail("invalid-signal");',
      "  }",
      "  const aborted = Reflect.apply(",
      "    abortSignalAbortedGetter,",
      "    signal,",
      "    [],",
      "  );",
      '  if (typeof aborted !== "boolean") return fail("invalid-signal");',
      "  return aborted;",
      "}",
      "function addAbortListener(",
      "  signal: AbortSignal,",
      "  listener: () => void,",
      "): void {",
      "  Reflect.apply(eventTargetAddEventListener, signal, [",
      '    "abort",',
      "    listener,",
      "    { once: true },",
      "  ]);",
      "}",
      "function removeAbortListener(",
      "  signal: AbortSignal,",
      "  listener: () => void,",
      "): void {",
      "  Reflect.apply(eventTargetRemoveEventListener, signal, [",
      '    "abort",',
      "    listener,",
      "  ]);",
      "}",
      "function requireSignal(value: unknown): AbortSignal {",
      "  if (",
      '    typeof value !== "object" ||',
      "    value === null ||",
      "    nodeUtilTypes.isProxy(value)",
      "  ) {",
      '    return fail("invalid-signal");',
      "  }",
      "  try {",
      "    signalIsAborted(value as AbortSignal);",
      "    return value as AbortSignal;",
      "  } catch (error) {",
      "    if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {",
      "      throw error;",
      "    }",
      '    return fail("invalid-signal");',
      "  }",
      "}",
    ].join("\n"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const contractNames = new Set([
    "abortSignalAbortedGetter",
    "addAbortListener",
    "eventTargetAddEventListener",
    "eventTargetRemoveEventListener",
    "removeAbortListener",
    "requireSignal",
    "signalIsAborted",
  ]);
  const statementName = (statement) => {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name !== undefined
    ) {
      return statement.name.text;
    }
    if (
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.length === 1 &&
      ts.isIdentifier(
        statement.declarationList.declarations[0].name,
      )
    ) {
      return statement.declarationList.declarations[0].name.text;
    }
    return null;
  };
  const statementsByName = (file) => {
    const result = new Map();
    for (const statement of file.statements) {
      const name = statementName(statement);
      if (name === null || !contractNames.has(name)) continue;
      if (result.has(name)) return null;
      result.set(name, statement);
    }
    return result;
  };
  const actual = statementsByName(sourceFile);
  const expected = statementsByName(expectedSource);
  if (
    actual === null ||
    expected === null ||
    actual.size !== contractNames.size ||
    expected.size !== contractNames.size
  ) {
    return false;
  }
  const printer = ts.createPrinter({ removeComments: true });
  const fingerprint = (node, file) => printer.printNode(
    ts.EmitHint.Unspecified,
    node,
    file,
  );
  for (const name of contractNames) {
    if (
      fingerprint(actual.get(name), sourceFile) !==
        fingerprint(expected.get(name), expectedSource)
    ) {
      return false;
    }
  }
  const permittedSignalMembers = new Set();
  for (const name of [
    "eventTargetAddEventListener",
    "eventTargetRemoveEventListener",
  ]) {
    const statement = actual.get(name);
    const visit = (node) => {
      if (
        (
          ts.isPropertyAccessExpression(node) ||
          ts.isElementAccessExpression(node)
        ) &&
        (
          runtimeMemberName(node) === "addEventListener" ||
          runtimeMemberName(node) === "removeEventListener"
        )
      ) {
        permittedSignalMembers.add(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(statement);
  }
  let unsafeSignalMember = false;
  const visit = (node) => {
    if (unsafeSignalMember || ts.isTypeNode(node)) return;
    if (
      (
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)
      ) &&
      (
        runtimeMemberName(node) === "aborted" ||
        runtimeMemberName(node) === "addEventListener" ||
        runtimeMemberName(node) === "removeEventListener"
      ) &&
      !permittedSignalMembers.has(node)
    ) {
      unsafeSignalMember = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return !unsafeSignalMember;
}

function transportFactoryAndSessionSuccessSurfaceIsExact(
  sourceFile,
  factory,
) {
  const criticalHelperNames = new Set([
    "addAbortListener",
    "createSession",
    "destroyUnknownClient",
    "fail",
    "removeAbortListener",
    "requireClient",
    "requireExactDataRecord",
    "requirePool",
    "requireSignal",
    "signalIsAborted",
  ]);
  const namedBindings = collectRuntimeBindingIdentifiers(
    sourceFile,
    criticalHelperNames,
  );
  if (
    [...criticalHelperNames].some(
      (name) => namedBindings.get(name).length !== 1,
    )
  ) {
    return false;
  }
  const helperSymbols = new Map(
    [...criticalHelperNames].map((name) => [
      name,
      runtimeBindingSymbolAtIdentifier(
        namedBindings.get(name)[0],
      ),
    ]),
  );
  if ([...helperSymbols.values()].some((symbol) => symbol === null)) {
    return false;
  }
  const helperNameBySymbol = new Map(
    [...helperSymbols].map(([name, symbol]) => [symbol, name]),
  );
  const createSessionIdentifier =
    namedBindings.get("createSession")[0];
  const createSession = createSessionIdentifier.parent;
  if (
    !ts.isFunctionDeclaration(createSession) ||
    createSession.body === undefined ||
    createSession.parameters.length !== 1 ||
    !ts.isIdentifier(createSession.parameters[0].name) ||
    createSession.parameters[0].name.text !== "checkedClient"
  ) {
    return false;
  }
  let createSessionFailCallIsShadowed = false;
  const inspectCreateSessionFailCalls = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "fail" &&
      runtimeBindingSymbolAtIdentifier(node.expression) !==
        helperSymbols.get("fail")
    ) {
      createSessionFailCallIsShadowed = true;
      return;
    }
    ts.forEachChild(node, inspectCreateSessionFailCalls);
  };
  inspectCreateSessionFailCalls(createSession);
  if (createSessionFailCallIsShadowed) return false;

  const directSessionDeclarations = [];
  for (const statement of createSession.body.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of
      statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "session"
      ) {
        directSessionDeclarations.push(declaration);
      }
    }
  }
  if (directSessionDeclarations.length !== 1) return false;
  const sessionDeclaration = directSessionDeclarations[0];
  const sessionValue = objectFreezeArgument(
    sessionDeclaration.initializer,
  );
  const expectedSessionMethods = new Set(
    nodePostgresBotReplyPinnedSessionTransportExpectedSessionMethods,
  );
  if (
    !sessionValue ||
    !ts.isObjectLiteralExpression(sessionValue) ||
    sessionValue.properties.length !== expectedSessionMethods.size
  ) {
    return false;
  }
  const sessionMethods = new Map();
  for (const property of sessionValue.properties) {
    if (
      !ts.isMethodDeclaration(property) ||
      property.body === undefined ||
      property.modifiers?.length !== 1 ||
      property.modifiers[0].kind !== ts.SyntaxKind.AsyncKeyword
    ) {
      return false;
    }
    const name = staticPropertyName(property.name);
    if (
      name === null ||
      !expectedSessionMethods.has(name) ||
      sessionMethods.has(name)
    ) {
      return false;
    }
    sessionMethods.set(name, property);
  }

  const nearestReturns = (body) => {
    const returns = [];
    const visit = (node) => {
      if (node !== body && ts.isFunctionLike(node)) return;
      if (ts.isReturnStatement(node)) returns.push(node);
      ts.forEachChild(node, visit);
    };
    visit(body);
    return returns;
  };
  const createSessionReturns = nearestReturns(createSession.body);
  const sessionSymbol = runtimeBindingSymbolAtIdentifier(
    sessionDeclaration.name,
  );
  if (
    sessionSymbol === null ||
    createSessionReturns.length !== 2 ||
    !createSessionReturns.some((statement) =>
      ts.isIdentifier(unwrapRuntimeExpression(statement.expression)) &&
      runtimeBindingSymbolAtIdentifier(
        unwrapRuntimeExpression(statement.expression),
      ) === sessionSymbol
    ) ||
    !createSessionReturns.some((statement) => {
      const expression = unwrapRuntimeExpression(statement.expression);
      return ts.isCallExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        runtimeBindingSymbolAtIdentifier(expression.expression) ===
          helperSymbols.get("fail") &&
        expression.arguments.length === 1 &&
        runtimeStaticString(expression.arguments[0]) === "invalid-client";
    })
  ) {
    return false;
  }

  const factoryReturn = factory.body.statements.find(
    ts.isReturnStatement,
  );
  const factoryValue = objectFreezeArgument(factoryReturn?.expression);
  const openPinned = factoryValue?.properties[0];
  if (!ts.isMethodDeclaration(openPinned) || openPinned.body === undefined) {
    return false;
  }
  const openPinnedReturns = nearestReturns(openPinned.body);
  const promiseReturn = openPinnedReturns.find((statement) => {
    const expression = unwrapRuntimeExpression(statement.expression);
    return ts.isNewExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === "Promise" &&
      !identifierIsShadowedAtRuntime(expression.expression);
  });
  if (openPinnedReturns.length !== 2 || promiseReturn === undefined) {
    return false;
  }
  const promise = unwrapRuntimeExpression(promiseReturn.expression);
  if (
    !ts.isNewExpression(promise) ||
    promise.arguments?.length !== 1
  ) {
    return false;
  }
  const executor = unwrapRuntimeExpression(promise.arguments[0]);
  if (
    !ts.isArrowFunction(executor) ||
    executor.body === undefined ||
    executor.parameters.length !== 2 ||
    !ts.isIdentifier(executor.parameters[0].name) ||
    executor.parameters[0].name.text !== "resolve" ||
    !ts.isIdentifier(executor.parameters[1].name) ||
    executor.parameters[1].name.text !== "reject"
  ) {
    return false;
  }
  const executorBindings = collectRuntimeBindingIdentifiers(
    executor,
    new Set(["client", "rawClient", "resolve", "session"]),
  );
  if (
    executorBindings.get("client").length !== 1 ||
    executorBindings.get("rawClient").length !== 1 ||
    executorBindings.get("resolve").length !== 1 ||
    executorBindings.get("session").length !== 1
  ) {
    return false;
  }
  const executorSymbol = (name) =>
    runtimeBindingSymbolAtIdentifier(executorBindings.get(name)[0]);
  const executorSessionSymbol = executorSymbol("session");
  const clientSymbol = executorSymbol("client");
  const rawClientSymbol = executorSymbol("rawClient");
  const resolveSymbol = executorSymbol("resolve");
  if (
    executorSessionSymbol === null ||
    clientSymbol === null ||
    rawClientSymbol === null ||
    resolveSymbol === null
  ) {
    return false;
  }
  const resolveCalls = [];
  const sessionAssignments = [];
  const clientAssignments = [];
  const visitExecutor = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      runtimeBindingSymbolAtIdentifier(node.expression) === resolveSymbol
    ) {
      resolveCalls.push(node);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(unwrapRuntimeExpression(node.left))
    ) {
      const symbol = runtimeBindingSymbolAtIdentifier(
        unwrapRuntimeExpression(node.left),
      );
      if (symbol === executorSessionSymbol) {
        sessionAssignments.push(node);
      } else if (symbol === clientSymbol) {
        clientAssignments.push(node);
      }
    }
    ts.forEachChild(node, visitExecutor);
  };
  visitExecutor(executor);
  if (
    resolveCalls.length !== 1 ||
    resolveCalls[0].arguments.length !== 1 ||
    !ts.isIdentifier(
      unwrapRuntimeExpression(resolveCalls[0].arguments[0]),
    ) ||
    runtimeBindingSymbolAtIdentifier(
      unwrapRuntimeExpression(resolveCalls[0].arguments[0]),
    ) !== executorSessionSymbol ||
    sessionAssignments.length !== 1 ||
    clientAssignments.length !== 1
  ) {
    return false;
  }
  const sessionAssignment = unwrapRuntimeExpression(
    sessionAssignments[0].right,
  );
  const clientAssignment = unwrapRuntimeExpression(
    clientAssignments[0].right,
  );
  if (
    !ts.isCallExpression(sessionAssignment) ||
    !ts.isIdentifier(sessionAssignment.expression) ||
    runtimeBindingSymbolAtIdentifier(sessionAssignment.expression) !==
      runtimeBindingSymbolAtIdentifier(createSessionIdentifier) ||
    sessionAssignment.arguments.length !== 1 ||
    !ts.isIdentifier(
      unwrapRuntimeExpression(sessionAssignment.arguments[0]),
    ) ||
    runtimeBindingSymbolAtIdentifier(
      unwrapRuntimeExpression(sessionAssignment.arguments[0]),
    ) !== clientSymbol ||
    !ts.isCallExpression(clientAssignment) ||
    !ts.isIdentifier(clientAssignment.expression) ||
    runtimeBindingSymbolAtIdentifier(clientAssignment.expression) !==
      runtimeBindingSymbolAtIdentifier(
        namedBindings.get("requireClient")[0],
      ) ||
    clientAssignment.arguments.length !== 1 ||
    !ts.isIdentifier(
      unwrapRuntimeExpression(clientAssignment.arguments[0]),
    ) ||
    runtimeBindingSymbolAtIdentifier(
      unwrapRuntimeExpression(clientAssignment.arguments[0]),
    ) !== rawClientSymbol
  ) {
    return false;
  }

  const sensitiveSymbols = new Set([
    runtimeBindingSymbolAtIdentifier(createSession.parameters[0].name),
    clientSymbol,
    rawClientSymbol,
  ]);
  const factoryBindings = collectRuntimeBindingIdentifiers(
    factory,
    new Set([
      "checkedDependencies",
      "dependencies",
      "pool",
    ]),
  );
  for (const name of [
    "checkedDependencies",
    "dependencies",
    "pool",
  ]) {
    if (factoryBindings.get(name).length !== 1) return false;
    sensitiveSymbols.add(
      runtimeBindingSymbolAtIdentifier(factoryBindings.get(name)[0]),
    );
  }
  const queryBindings = collectRuntimeBindingIdentifiers(
    createSession,
    new Set(["query"]),
  );
  if (queryBindings.get("query").length !== 1) return false;
  sensitiveSymbols.add(
    runtimeBindingSymbolAtIdentifier(queryBindings.get("query")[0]),
  );
  sensitiveSymbols.delete(null);
  const runtimeReferencesForSymbol = (symbol) => {
    const references = [];
    const visit = (node) => {
      if (ts.isTypeNode(node)) return;
      if (
        ts.isImportDeclaration(node) ||
        ts.isImportEqualsDeclaration(node)
      ) {
        return;
      }
      if (
        ts.isIdentifier(node) &&
        identifierIsRuntimeValueReference(node, node.parent) &&
        runtimeBindingSymbolAtIdentifier(node) === symbol
      ) {
        references.push(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return references;
  };
  const directCallArgument = (
    reference,
    functionName,
    argumentIndex,
  ) => {
    const call = reference.parent;
    return ts.isCallExpression(call) &&
      ts.isIdentifier(call.expression) &&
      runtimeBindingSymbolAtIdentifier(call.expression) ===
        helperSymbols.get(functionName) &&
      call.arguments[argumentIndex] === reference;
  };
  const dependenciesSymbol = runtimeBindingSymbolAtIdentifier(
    factoryBindings.get("dependencies")[0],
  );
  const checkedDependenciesSymbol = runtimeBindingSymbolAtIdentifier(
    factoryBindings.get("checkedDependencies")[0],
  );
  const poolSymbol = runtimeBindingSymbolAtIdentifier(
    factoryBindings.get("pool")[0],
  );
  const checkedClientSymbol = runtimeBindingSymbolAtIdentifier(
    createSession.parameters[0].name,
  );
  const closeReleaseCalls = [];
  const inspectCloseRelease = (node) => {
    if (
      ts.isCallExpression(node) &&
      (
        ts.isPropertyAccessExpression(node.expression) ||
        ts.isElementAccessExpression(node.expression)
      ) &&
      runtimeMemberName(node.expression) === "release" &&
      ts.isIdentifier(
        unwrapRuntimeExpression(node.expression.expression),
      ) &&
      runtimeBindingSymbolAtIdentifier(
        unwrapRuntimeExpression(node.expression.expression),
      ) === checkedClientSymbol
    ) {
      closeReleaseCalls.push(node);
    }
    ts.forEachChild(node, inspectCloseRelease);
  };
  inspectCloseRelease(sessionMethods.get("close").body);
  const closeReleaseCall = closeReleaseCalls[0];
  const closeReleaseStatement = closeReleaseCall?.parent;
  const closeReleaseBlock = closeReleaseStatement?.parent;
  const closeReleaseTry = closeReleaseBlock?.parent;
  if (
    closeReleaseCalls.length !== 1 ||
    closeReleaseCall.arguments.length !== 1 ||
    unwrapRuntimeExpression(closeReleaseCall.arguments[0]).kind !==
      ts.SyntaxKind.TrueKeyword ||
    !ts.isExpressionStatement(closeReleaseStatement) ||
    closeReleaseStatement.expression !== closeReleaseCall ||
    !ts.isBlock(closeReleaseBlock) ||
    closeReleaseBlock.statements.length !== 1 ||
    closeReleaseBlock.statements[0] !== closeReleaseStatement ||
    !ts.isTryStatement(closeReleaseTry) ||
    closeReleaseTry.tryBlock !== closeReleaseBlock
  ) {
    return false;
  }
  const dependencyReferences = runtimeReferencesForSymbol(
    dependenciesSymbol,
  );
  const checkedDependencyReferences = runtimeReferencesForSymbol(
    checkedDependenciesSymbol,
  );
  const poolReferences = runtimeReferencesForSymbol(poolSymbol);
  const rawClientReferences = runtimeReferencesForSymbol(
    rawClientSymbol,
  );
  const clientReferences = runtimeReferencesForSymbol(clientSymbol);
  const checkedClientReferences = runtimeReferencesForSymbol(
    checkedClientSymbol,
  );
  if (
    dependencyReferences.length !== 1 ||
    !directCallArgument(
      dependencyReferences[0],
      "requireExactDataRecord",
      0,
    ) ||
    checkedDependencyReferences.length !== 1 ||
    poolReferences.length !== 1
  ) {
    return false;
  }
  const checkedPoolMember = checkedDependencyReferences[0].parent;
  if (
    !ts.isPropertyAccessExpression(checkedPoolMember) ||
    checkedPoolMember.name.text !== "pool" ||
    !directCallArgument(
      checkedPoolMember,
      "requirePool",
      0,
    )
  ) {
    return false;
  }
  const poolConnect = poolReferences[0].parent;
  if (
    !ts.isPropertyAccessExpression(poolConnect) ||
    poolConnect.name.text !== "connect" ||
    !ts.isCallExpression(poolConnect.parent) ||
    poolConnect.parent.expression !== poolConnect ||
    poolConnect.parent.arguments.length !== 0
  ) {
    return false;
  }
  const rawClientUseCounts = new Map();
  for (const reference of rawClientReferences) {
    const call = reference.parent;
    const helperName =
      ts.isCallExpression(call) &&
        ts.isIdentifier(call.expression)
        ? helperNameBySymbol.get(
            runtimeBindingSymbolAtIdentifier(call.expression),
          )
        : undefined;
    if (
      !ts.isCallExpression(call) ||
      call.arguments.length !== 1 ||
      call.arguments[0] !== reference ||
      (
        helperName !== "destroyUnknownClient" &&
        helperName !== "requireClient"
      )
    ) {
      return false;
    }
    rawClientUseCounts.set(
      helperName,
      (rawClientUseCounts.get(helperName) ?? 0) + 1,
    );
  }
  if (
    rawClientUseCounts.size !== 2 ||
    rawClientUseCounts.get("destroyUnknownClient") !== 4 ||
    rawClientUseCounts.get("requireClient") !== 1 ||
    clientReferences.length !== 2 ||
    !clientReferences.some((reference) =>
      ts.isBinaryExpression(reference.parent) &&
      reference.parent.left === reference &&
      reference.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) ||
    !clientReferences.some((reference) =>
      directCallArgument(reference, "createSession", 0)
    )
  ) {
    return false;
  }
  const checkedClientMemberCounts = new Map();
  for (const reference of checkedClientReferences) {
    const member = reference.parent;
    if (
      !ts.isPropertyAccessExpression(member) ||
      member.expression !== reference ||
      member.questionDotToken !== undefined
    ) {
      return false;
    }
    checkedClientMemberCounts.set(
      member.name.text,
      (checkedClientMemberCounts.get(member.name.text) ?? 0) + 1,
    );
  }
  const expectedCheckedClientMemberCounts = new Map([
    ["client", 1],
    ["getTransactionStatus", 1],
    ["once", 1],
    ["query", 1],
    ["release", 2],
    ["removeListener", 1],
  ]);
  if (
    checkedClientMemberCounts.size !==
      expectedCheckedClientMemberCounts.size ||
    [...expectedCheckedClientMemberCounts].some(
      ([name, count]) =>
        checkedClientMemberCounts.get(name) !== count,
    )
  ) {
    return false;
  }
  const expressionLeaksSensitiveCapability = (expression) => {
    let leaked = false;
    const visit = (node) => {
      if (leaked) return;
      if (node !== expression && ts.isFunctionLike(node)) return;
      if (
        ts.isIdentifier(node) &&
        identifierIsRuntimeValueReference(node, node.parent) &&
        sensitiveSymbols.has(runtimeBindingSymbolAtIdentifier(node))
      ) {
        leaked = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(expression);
    return leaked;
  };
  for (const method of sessionMethods.values()) {
    const returns = [];
    const visit = (node) => {
      if (ts.isReturnStatement(node)) returns.push(node);
      ts.forEachChild(node, visit);
    };
    visit(method.body);
    if (
      returns.some(
        (statement) =>
          statement.expression !== undefined &&
          expressionLeaksSensitiveCapability(statement.expression),
      )
    ) {
      return false;
    }
  }
  return true;
}

function transportTopLevelInitializersAreSafe(sourceFile) {
  const safeCall = (node) => {
    const expression = unwrapRuntimeExpression(node.expression);
    if (ts.isIdentifier(expression)) {
      return expression.text === "expectedField";
    }
    if (!ts.isPropertyAccessExpression(expression)) return false;
    if (
      expression.name.text === "getOwnPropertyDescriptor" &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === "Object" &&
      !identifierIsShadowedAtRuntime(expression.expression) &&
      node.arguments.length === 2 &&
      ts.isPropertyAccessExpression(
        unwrapRuntimeExpression(node.arguments[0]),
      ) &&
      unwrapRuntimeExpression(node.arguments[0]).name.text === "prototype" &&
      ts.isIdentifier(
        unwrapRuntimeExpression(node.arguments[0]).expression,
      ) &&
      unwrapRuntimeExpression(node.arguments[0]).expression.text ===
        "AbortSignal" &&
      !identifierIsShadowedAtRuntime(
        unwrapRuntimeExpression(node.arguments[0]).expression,
      ) &&
      runtimeStaticString(node.arguments[1]) === "aborted"
    ) {
      return true;
    }
    if (
      expression.name.text === "freeze" &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === "Object"
    ) {
      return true;
    }
    return expression.name.text === "join" &&
      ts.isArrayLiteralExpression(
        unwrapRuntimeExpression(expression.expression),
      );
  };
  const initializerIsSafe = (initializer) => {
    let safe = true;
    const visit = (node) => {
      if (!safe) return;
      if (
        ts.isAwaitExpression(node) ||
        ts.isYieldExpression(node) ||
        ts.isNewExpression(node) ||
        ts.isTaggedTemplateExpression(node) ||
        ts.isDeleteExpression(node) ||
        ts.isPostfixUnaryExpression(node) ||
        (
          ts.isPrefixUnaryExpression(node) &&
          (
            node.operator === ts.SyntaxKind.PlusPlusToken ||
            node.operator === ts.SyntaxKind.MinusMinusToken
          )
        ) ||
        (
          ts.isBinaryExpression(node) &&
          ts.isAssignmentOperator(node.operatorToken.kind)
        ) ||
        (ts.isCallExpression(node) && !safeCall(node))
      ) {
        safe = false;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(initializer);
    return safe;
  };
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      (
        ts.isExportDeclaration(statement) &&
        exportDeclarationIsTypeOnly(statement)
      )
    ) {
      continue;
    }
    if (!ts.isVariableStatement(statement)) return false;
    for (const declaration of
      statement.declarationList.declarations) {
      if (
        declaration.initializer !== undefined &&
        !initializerIsSafe(declaration.initializer)
      ) {
        return false;
      }
    }
  }
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement)) continue;
    for (const member of statement.members) {
      const isStatic = member.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword,
      );
      if (
        ts.isClassStaticBlockDeclaration(member) ||
        (
          isStatic &&
          ts.isPropertyDeclaration(member) &&
          member.initializer !== undefined
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function transportHasForbiddenRuntimeSurface(
  sourceFile,
  queryStatementsInitializer,
) {
  ts.bindSourceFile(sourceFile, {
    target: ts.ScriptTarget.Latest,
  });
  const forbiddenGlobals = new Set([
    "Function",
    "console",
    "createRequire",
    "eval",
    "fetch",
    "global",
    "globalThis",
    "module",
    "process",
    "require",
    "self",
  ]);
  const forbiddenGlobalMembers = new Set([
    "console",
    "createRequire",
    "fetch",
    "module",
    "process",
    "require",
  ]);
  const cliNames = new Set(["main", "runCli"]);
  const securityBuiltinBindingNames = new Set([
    "AbortSignal",
    "Array",
    "Date",
    "Error",
    "EventTarget",
    "Number",
    "Object",
    "Promise",
    "Reflect",
    "String",
  ]);
  const reflectMutationNames = new Set([
    "deleteProperty",
    "defineProperty",
    "preventExtensions",
    "set",
    "setPrototypeOf",
  ]);
  const objectMutationNames = new Set([
    "__defineGetter__",
    "__defineSetter__",
    "assign",
    "defineProperties",
    "defineProperty",
    "preventExtensions",
    "seal",
    "setPrototypeOf",
  ]);
  const bindingNameShadowsSecurityBuiltin = (name) => {
    if (ts.isIdentifier(name)) {
      return securityBuiltinBindingNames.has(name.text);
    }
    return name.elements.some((element) =>
      !ts.isOmittedExpression(element) &&
      bindingNameShadowsSecurityBuiltin(element.name)
    );
  };
  const securityBuiltinMember = (node) => {
    if (
      !ts.isPropertyAccessExpression(node) &&
      !ts.isElementAccessExpression(node)
    ) {
      return null;
    }
    const rootIdentifier = (expression) => {
      const value = unwrapRuntimeExpression(expression);
      if (ts.isIdentifier(value)) {
        return securityBuiltinBindingNames.has(value.text) &&
            !identifierIsShadowedAtRuntime(value)
          ? value
          : null;
      }
      if (
        ts.isPropertyAccessExpression(value) ||
        ts.isElementAccessExpression(value)
      ) {
        return rootIdentifier(value.expression);
      }
      return null;
    };
    const base = rootIdentifier(node.expression);
    if (
      base === null
    ) {
      return null;
    }
    return Object.freeze({
      base: base.text,
      name: runtimeMemberName(node),
    });
  };
  const securityBuiltinMutationMember = (node) => {
    const member = securityBuiltinMember(node);
    if (member === null) return null;
    return (
      member.base === "Reflect" &&
      reflectMutationNames.has(member.name)
    ) || (
      member.base === "Object" &&
      objectMutationNames.has(member.name)
    )
      ? member
      : null;
  };
  const bindingPatternAliasesMutationMember = (node) => {
    if (
      !(
        ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isBindingElement(node)
      ) ||
      !ts.isObjectBindingPattern(node.name) ||
      node.initializer === undefined
    ) {
      return false;
    }
    const initializer = unwrapRuntimeExpression(node.initializer);
    if (
      !ts.isIdentifier(initializer) ||
      identifierIsShadowedAtRuntime(initializer)
    ) {
      return false;
    }
    const mutationNames = initializer.text === "Object"
      ? objectMutationNames
      : initializer.text === "Reflect"
        ? reflectMutationNames
        : null;
    return mutationNames !== null && node.name.elements.some((element) =>
      !ts.isOmittedExpression(element) &&
      mutationNames.has(
        runtimeStaticName(element.propertyName ?? element.name),
      )
    );
  };
  let forbidden = false;
  const containsFunctionIdentifier = (node) => {
    const value = sourceFileRuntimeStaticString(sourceFile, node);
    return value !== null &&
      [
        ...nodePostgresBotReplyPinnedSessionTransportExpectedSqlFunctionIdentifiers,
      ]
        .some((identifier) => value.includes(identifier));
  };
  const visit = (node, parent) => {
    if (forbidden || node === queryStatementsInitializer) return;
    if (ts.isTypeNode(node)) return;
    if (ts.isImportEqualsDeclaration(node)) {
      forbidden = !node.isTypeOnly;
      return;
    }
    if (ts.isImportDeclaration(node)) {
      return;
    }
    if (
      (
        ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isBindingElement(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isClassDeclaration(node) ||
        ts.isClassExpression(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isModuleDeclaration(node)
      ) &&
      node.name !== undefined &&
      bindingNameShadowsSecurityBuiltin(node.name)
    ) {
      forbidden = true;
      return;
    }
    if (bindingPatternAliasesMutationMember(node)) {
      forbidden = true;
      return;
    }
    if (
      ts.isBinaryExpression(node) &&
      ts.isAssignmentOperator(node.operatorToken.kind) &&
      ts.isIdentifier(unwrapRuntimeExpression(node.left)) &&
      securityBuiltinBindingNames.has(
        unwrapRuntimeExpression(node.left).text,
      )
    ) {
      forbidden = true;
      return;
    }
    if (
      ts.isBinaryExpression(node) &&
      ts.isAssignmentOperator(node.operatorToken.kind) &&
      securityBuiltinMember(
        unwrapRuntimeExpression(node.left),
      ) !== null
    ) {
      forbidden = true;
      return;
    }
    if (
      (
        ts.isPrefixUnaryExpression(node) ||
        ts.isPostfixUnaryExpression(node)
      ) &&
      securityBuiltinMember(
        unwrapRuntimeExpression(node.operand),
      ) !== null
    ) {
      forbidden = true;
      return;
    }
    if (
      ts.isDeleteExpression(node) &&
      securityBuiltinMember(
        unwrapRuntimeExpression(node.expression),
      ) !== null
    ) {
      forbidden = true;
      return;
    }
    if (
      (
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)
      ) &&
      securityBuiltinMutationMember(
        unwrapRuntimeExpression(node),
      ) !== null
    ) {
      // Reject both direct calls and references which could be aliased and
      // invoked later (for example `const assign = Object.assign`).
      forbidden = true;
      return;
    }
    if (
      ts.isMetaProperty(node) &&
      node.keywordToken === ts.SyntaxKind.ImportKeyword
    ) {
      forbidden = true;
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      forbidden = true;
      return;
    }
    if (
      (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableDeclaration(node)
      ) &&
      ts.isIdentifier(node.name) &&
      cliNames.has(node.name.text)
    ) {
      forbidden = true;
      return;
    }
    if (
      ts.isIdentifier(node) &&
      forbiddenGlobals.has(node.text) &&
      identifierIsRuntimeValueReference(node, parent) &&
      !identifierIsShadowedAtRuntime(node)
    ) {
      forbidden = true;
      return;
    }
    if (
      ts.isBindingElement(node) &&
      (
        forbiddenGlobalMembers.has(
          runtimeStaticName(node.propertyName),
        ) ||
        forbiddenGlobalMembers.has(
          runtimeStaticName(node.name),
        )
      )
    ) {
      forbidden = true;
      return;
    }
    if (
      (
        ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)
      ) &&
      (
        runtimeMemberName(node) === "constructor" ||
        runtimeMemberName(node) === "__proto__" ||
        runtimeMemberName(node) === "createRequire" ||
        (
          forbiddenGlobalMembers.has(runtimeMemberName(node)) &&
          isRuntimeGlobalObject(runtimeMemberBase(node))
        )
      )
    ) {
      forbidden = true;
      return;
    }
    if (
      (
        ts.isStringLiteralLike(node) ||
        ts.isTemplateExpression(node) ||
        ts.isBinaryExpression(node) ||
        ts.isCallExpression(node)
      ) &&
      containsFunctionIdentifier(node)
    ) {
      forbidden = true;
      return;
    }
    ts.forEachChild(node, (child) => visit(child, node));
  };
  visit(sourceFile, undefined);
  return forbidden;
}

function nodePostgresBotReplyPinnedSessionTransportContractIsExact(
  sourceFile,
) {
  ts.bindSourceFile(sourceFile, {
    target: ts.ScriptTarget.Latest,
  });
  const queryStatementsContract =
    transportQueryStatementsAreExact(sourceFile);
  const factory = transportRuntimeExportsAreExact(sourceFile);
  const sourceSha256 = createHash("sha256")
    .update(sourceFile.text, "utf8")
    .digest("hex");
  return sourceSha256 ===
      nodePostgresBotReplyPinnedSessionTransportExpectedSha256 &&
    sourceFile.parseDiagnostics.length === 0 &&
    transportRuntimeImportIsExact(sourceFile) &&
    transportSessionKeysAreExact(sourceFile) &&
    queryStatementsContract !== null &&
    transportSqlCallSitesAreExact(
      sourceFile,
      queryStatementsContract,
    ) &&
    factory !== null &&
    transportFactorySurfaceIsExact(factory) &&
    transportAbortBoundaryContractIsExact(sourceFile) &&
    transportFactoryAndSessionSuccessSurfaceIsExact(
      sourceFile,
      factory,
    ) &&
    transportTopLevelInitializersAreSafe(sourceFile) &&
    !transportHasForbiddenRuntimeSurface(
      sourceFile,
      queryStatementsContract.initializer,
    );
}

function runtimeMemberName(node) {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }
  if (
    ts.isElementAccessExpression(node) &&
    node.argumentExpression
  ) {
    return runtimeStaticString(
      node.argumentExpression,
    );
  }
  return null;
}

function runtimeMemberBase(node) {
  if (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node)
  ) {
    return unwrapRuntimeExpression(node.expression);
  }
  return null;
}

function isUnshadowedRuntimeIdentifier(
  node,
  names,
) {
  const expression = unwrapRuntimeExpression(node);
  return expression !== undefined &&
    ts.isIdentifier(expression) &&
    names.has(expression.text) &&
    !identifierIsShadowedAtRuntime(expression);
}

function isRuntimeGlobalObject(node) {
  return isUnshadowedRuntimeIdentifier(
    node,
    runtimeGlobalObjectNames,
  );
}

function runtimeModuleSpecifierText(node) {
  return runtimeStaticString(node);
}

function runtimeStaticName(node) {
  if (node && ts.isIdentifier(node)) {
    return node.text;
  }
  return runtimeStaticString(node);
}

function moduleSpecifierIsVm(specifier) {
  return specifier === "node:vm" ||
    specifier === "vm";
}

function moduleSpecifierIsNodeModule(specifier) {
  return specifier === "node:module" ||
    specifier === "module";
}

function importClauseAcquiresModuleLoader(clause) {
  if (!clause || clause.isTypeOnly) return false;
  if (clause.name) return true;
  const namedBindings = clause.namedBindings;
  if (!namedBindings) return false;
  if (ts.isNamespaceImport(namedBindings)) {
    return true;
  }
  return namedBindings.elements.some((element) =>
    !element.isTypeOnly &&
    runtimeModuleLoaderExportNames.has(
      (element.propertyName ?? element.name).text,
    )
  );
}

function exportClauseAcquiresModuleLoader(clause) {
  if (!clause || ts.isNamespaceExport(clause)) {
    return true;
  }
  return clause.elements.some((element) =>
    !element.isTypeOnly &&
    runtimeModuleLoaderExportNames.has(
      (element.propertyName ?? element.name).text,
    )
  );
}

function objectBindingAcquiresGlobalCapability(
  name,
  capabilityNames,
) {
  return ts.isObjectBindingPattern(name) &&
    name.elements.some((element) => {
      const propertyName = runtimeStaticName(
        element.propertyName ?? element.name,
      );
      return propertyName !== null &&
        capabilityNames.has(propertyName);
    });
}

function analyzeForbiddenRuntimeExecutionCapabilities(
  sourceFile,
) {
  ts.bindSourceFile(sourceFile, {
    target: ts.ScriptTarget.Latest,
  });
  let hasDynamicCodeExecution = false;
  let hasRuntimeModuleLoader = false;
  let hasServerOnlyRuntimeCapability = false;
  let hasVmRuntimeExecution = false;
  const runtimeGlobalObjectAliasSymbols = new Set();
  const runtimeProcessAliasSymbols = new Set();
  const runtimeCallableAliasSymbols = new Set();
  const unshadowedModuleReferences = new WeakSet();
  const unshadowedRequireReferences = new WeakSet();

  const runtimeCapabilityMemberAccess = (node) => {
    const expression = unwrapRuntimeExpression(node);
    if (!expression) return null;
    if (
      ts.isPropertyAccessExpression(expression) ||
      ts.isElementAccessExpression(expression)
    ) {
      return {
        base: runtimeMemberBase(expression),
        name: runtimeMemberName(expression),
      };
    }
    if (
      ts.isCallExpression(expression) &&
      expression.arguments.length >= 2 &&
      (
        ts.isPropertyAccessExpression(
          expression.expression,
        ) ||
        ts.isElementAccessExpression(
          expression.expression,
        )
      ) &&
      runtimeMemberName(expression.expression) ===
        "get" &&
      isUnshadowedRuntimeIdentifier(
        runtimeMemberBase(expression.expression),
        runtimeReflectGlobalNames,
      )
    ) {
      return {
        base: expression.arguments[0],
        name: runtimeStaticString(
          expression.arguments[1],
        ),
      };
    }
    return null;
  };

  const expressionIsRuntimeGlobalObjectOrAlias =
    (node) => {
      const expression = unwrapRuntimeExpression(node);
      if (!expression) return false;
      if (isRuntimeGlobalObject(expression)) {
        return true;
      }
      if (ts.isIdentifier(expression)) {
        return runtimeGlobalObjectAliasSymbols.has(
          runtimeBindingSymbolAtIdentifier(expression),
        );
      }
      const access =
        runtimeCapabilityMemberAccess(expression);
      return access !== null &&
        access.name !== null &&
        runtimeGlobalObjectNames.has(access.name) &&
        expressionIsRuntimeGlobalObjectOrAlias(
          access.base,
        );
    };

  const expressionIsRuntimeProcessOrAlias =
    (node) => {
      const expression = unwrapRuntimeExpression(node);
      if (!expression) return false;
      if (
        isUnshadowedRuntimeIdentifier(
          expression,
          runtimeProcessGlobalNames,
        )
      ) {
        return true;
      }
      if (ts.isIdentifier(expression)) {
        return runtimeProcessAliasSymbols.has(
          runtimeBindingSymbolAtIdentifier(expression),
        );
      }
      const access =
        runtimeCapabilityMemberAccess(expression);
      return access !== null &&
        access.name === "process" &&
        expressionIsRuntimeGlobalObjectOrAlias(
          access.base,
        );
    };

  const expressionHasDefaultCallableConstructor = (
    node,
    visitedSymbols = new Set(),
  ) => {
    const expression = unwrapRuntimeExpression(node);
    if (!expression) return false;
    if (ts.isArrayLiteralExpression(expression)) {
      return true;
    }
    if (ts.isObjectLiteralExpression(expression)) {
      return expression.properties.every(
        (property) => {
          if (
            ts.isSpreadAssignment(property) ||
            !("name" in property)
          ) {
            return false;
          }
          const name = runtimeStaticName(
            property.name,
          );
          return name !== null &&
            name !== "constructor" &&
            name !== "__proto__";
        },
      );
    }
    if (!ts.isIdentifier(expression)) return false;
    const symbol = runtimeBindingSymbolAtIdentifier(
      expression,
    );
    if (!symbol || visitedSymbols.has(symbol)) {
      return false;
    }
    visitedSymbols.add(symbol);
    return (symbol.declarations ?? []).some(
      (declaration) =>
        (
          ts.isVariableDeclaration(declaration) ||
          ts.isParameter(declaration) ||
          ts.isBindingElement(declaration)
        ) &&
        declaration.initializer !== undefined &&
        expressionHasDefaultCallableConstructor(
          declaration.initializer,
          visitedSymbols,
        ),
    );
  };

  const expressionIsKnownCallable = (
    node,
    visitedSymbols = new Set(),
  ) => {
    const expression = unwrapRuntimeExpression(node);
    if (!expression) return false;
    if (
      ts.isArrowFunction(expression) ||
      ts.isFunctionExpression(expression) ||
      ts.isClassExpression(expression)
    ) {
      return true;
    }
    if (ts.isCallExpression(expression)) {
      const boundAccess =
        runtimeCapabilityMemberAccess(
          expression.expression,
        );
      if (
        boundAccess?.name === "bind" &&
        boundAccess.base &&
        expressionIsKnownCallable(
          boundAccess.base,
          visitedSymbols,
        )
      ) {
        return true;
      }
    }
    const constructorAccess =
      runtimeCapabilityMemberAccess(expression);
    if (
      constructorAccess?.name === "constructor" &&
      constructorAccess.base &&
      (
        expressionIsKnownCallable(
          constructorAccess.base,
          visitedSymbols,
        ) ||
        expressionHasDefaultCallableConstructor(
          constructorAccess.base,
        )
      )
    ) {
      return true;
    }
    if (!ts.isIdentifier(expression)) return false;
    const symbol = runtimeBindingSymbolAtIdentifier(
      expression,
    );
    if (!symbol || visitedSymbols.has(symbol)) {
      return false;
    }
    if (runtimeCallableAliasSymbols.has(symbol)) {
      return true;
    }
    visitedSymbols.add(symbol);
    return (symbol.declarations ?? []).some(
      (declaration) => {
        if (
          ts.isFunctionDeclaration(declaration) ||
          ts.isClassDeclaration(declaration) ||
          ts.isFunctionExpression(declaration) ||
          ts.isClassExpression(declaration)
        ) {
          return true;
        }
        if (
          (
            ts.isVariableDeclaration(declaration) ||
            ts.isParameter(declaration) ||
            ts.isBindingElement(declaration)
          ) &&
          declaration.initializer
        ) {
          return expressionIsKnownCallable(
            declaration.initializer,
            visitedSymbols,
          );
        }
        return false;
      },
    );
  };

  const pendingCapabilityAliases = [];
  const addPendingCapabilityAlias = (
    identifier,
    initializer,
  ) => {
    if (!identifier || !initializer) return;
    pendingCapabilityAliases.push({
      initializer,
      symbol: runtimeBindingSymbolAtIdentifier(
        identifier,
      ),
    });
  };
  const collectCapabilityAliases = (node) => {
    if (
      (
        ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isBindingElement(node)
      ) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      addPendingCapabilityAlias(
        node.name,
        node.initializer,
      );
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind ===
        ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left)
    ) {
      addPendingCapabilityAlias(
        node.left,
        node.right,
      );
    }
    ts.forEachChild(
      node,
      collectCapabilityAliases,
    );
  };
  collectCapabilityAliases(sourceFile);
  let aliasesChanged = true;
  while (aliasesChanged) {
    aliasesChanged = false;
    for (const alias of pendingCapabilityAliases) {
      if (
        alias.symbol &&
        !runtimeGlobalObjectAliasSymbols.has(
          alias.symbol,
        ) &&
        expressionIsRuntimeGlobalObjectOrAlias(
          alias.initializer,
        )
      ) {
        runtimeGlobalObjectAliasSymbols.add(
          alias.symbol,
        );
        aliasesChanged = true;
      }
      if (
        alias.symbol &&
        !runtimeProcessAliasSymbols.has(
          alias.symbol,
        ) &&
        expressionIsRuntimeProcessOrAlias(
          alias.initializer,
        )
      ) {
        runtimeProcessAliasSymbols.add(
          alias.symbol,
        );
        aliasesChanged = true;
      }
      if (
        alias.symbol &&
        !runtimeCallableAliasSymbols.has(
          alias.symbol,
        ) &&
        expressionIsKnownCallable(
          alias.initializer,
        )
      ) {
        runtimeCallableAliasSymbols.add(
          alias.symbol,
        );
        aliasesChanged = true;
      }
    }
  }

  const visit = (node, parent) => {
    if (
      ts.isTypeNode(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node)
    ) {
      return;
    }
    if (
      ts.isImportDeclaration(node) &&
      !importDeclarationIsTypeOnly(node)
    ) {
      const specifier = runtimeModuleSpecifierText(
        node.moduleSpecifier,
      );
      if (moduleSpecifierIsVm(specifier)) {
        hasVmRuntimeExecution = true;
      }
      if (
        moduleSpecifierIsNodeModule(specifier) &&
        importClauseAcquiresModuleLoader(
          node.importClause,
        )
      ) {
        hasRuntimeModuleLoader = true;
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      !exportDeclarationIsTypeOnly(node)
    ) {
      const specifier = runtimeModuleSpecifierText(
        node.moduleSpecifier,
      );
      if (moduleSpecifierIsVm(specifier)) {
        hasVmRuntimeExecution = true;
      }
      if (
        moduleSpecifierIsNodeModule(specifier) &&
        exportClauseAcquiresModuleLoader(
          node.exportClause,
        )
      ) {
        hasRuntimeModuleLoader = true;
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(
        node.moduleReference,
      )
    ) {
      const specifier = runtimeModuleSpecifierText(
        node.moduleReference.expression,
      );
      if (moduleSpecifierIsVm(specifier)) {
        hasVmRuntimeExecution = true;
      }
      if (moduleSpecifierIsNodeModule(specifier)) {
        hasRuntimeModuleLoader = true;
      }
    }

    if (
      ts.isIdentifier(node) &&
      identifierIsRuntimeValueReference(
        node,
        parent,
      ) &&
      !identifierIsShadowedAtRuntime(node)
    ) {
      if (
        dynamicCodeExecutionGlobalNames.has(
          node.text,
        )
      ) {
        hasDynamicCodeExecution = true;
      }
      if (node.text === "require") {
        unshadowedRequireReferences.add(node);
        hasRuntimeModuleLoader = true;
        hasServerOnlyRuntimeCapability = true;
      } else if (node.text === "module") {
        unshadowedModuleReferences.add(node);
        hasRuntimeModuleLoader = true;
        hasServerOnlyRuntimeCapability = true;
      } else if (
        node.text === "Buffer" ||
        node.text === "__dirname" ||
        node.text === "__filename"
      ) {
        hasServerOnlyRuntimeCapability = true;
      }
    }

    const capabilityAccess =
      runtimeCapabilityMemberAccess(node);
    if (capabilityAccess) {
      const memberName = capabilityAccess.name;
      const base = capabilityAccess.base;
      if (
        base &&
        expressionIsRuntimeGlobalObjectOrAlias(base)
      ) {
        if (
          memberName !== null &&
          dynamicCodeExecutionGlobalNames.has(
            memberName,
          )
        ) {
          hasDynamicCodeExecution = true;
        }
        if (
          memberName !== null &&
          runtimeModuleLoaderGlobalNames.has(
            memberName,
          )
        ) {
          hasRuntimeModuleLoader = true;
          hasServerOnlyRuntimeCapability = true;
        }
      }
      if (
        memberName === "constructor" &&
        base &&
        expressionIsKnownCallable(base)
      ) {
        hasDynamicCodeExecution = true;
      }
      if (
        memberName === "getBuiltinModule" &&
        base &&
        expressionIsRuntimeProcessOrAlias(base)
      ) {
        hasRuntimeModuleLoader = true;
        hasServerOnlyRuntimeCapability = true;
        if (
          ts.isCallExpression(parent) &&
          parent.expression === node &&
          moduleSpecifierIsVm(
            runtimeModuleSpecifierText(
              parent.arguments[0],
            ),
          )
        ) {
          hasVmRuntimeExecution = true;
        }
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      expressionIsRuntimeGlobalObjectOrAlias(
        node.initializer,
      )
    ) {
      if (
        objectBindingAcquiresGlobalCapability(
          node.name,
          dynamicCodeExecutionGlobalNames,
        )
      ) {
        hasDynamicCodeExecution = true;
      }
      if (
        objectBindingAcquiresGlobalCapability(
          node.name,
          runtimeModuleLoaderGlobalNames,
        )
      ) {
        hasRuntimeModuleLoader = true;
        hasServerOnlyRuntimeCapability = true;
      }
    }

    if (ts.isCallExpression(node)) {
      const specifier =
        node.expression.kind ===
            ts.SyntaxKind.ImportKeyword ||
          (
            ts.isIdentifier(node.expression) &&
            unshadowedRequireReferences.has(
              node.expression,
            )
          )
          ? runtimeModuleSpecifierText(
              node.arguments[0],
            )
          : null;
      if (moduleSpecifierIsVm(specifier)) {
        hasVmRuntimeExecution = true;
      }
      if (
        moduleSpecifierIsNodeModule(specifier) &&
        node.expression.kind ===
          ts.SyntaxKind.ImportKeyword
      ) {
        hasRuntimeModuleLoader = true;
      }
    }

    ts.forEachChild(node, (child) =>
      visit(child, node)
    );
  };

  visit(sourceFile, null);
  return {
    hasDynamicCodeExecution,
    hasRuntimeModuleLoader,
    hasServerOnlyRuntimeCapability,
    hasVmRuntimeExecution,
    unshadowedModuleReferences,
    unshadowedRequireReferences,
  };
}

function analyzeRuntimeDependencies(sourceFile) {
  const executionCapabilities =
    analyzeForbiddenRuntimeExecutionCapabilities(
      sourceFile,
    );
  const specifiers = new Set();
  let hasNonLiteralRuntimeImport = false;
  let hasServerOnlyRuntimeCapability = false;
  const nodes = [];
  const createRequireFactoryAliases = new Set();
  const moduleObjectAliases = new Set();
  const returnedRequireAliases = new Set();
  const addStringLiteral = (node) => {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.add(node.text);
      return true;
    }

    return false;
  };
  const collect = (node) => {
    nodes.push(node);
    ts.forEachChild(node, collect);
  };
  const moduleLoaderSpecifier = (node) =>
    node && ts.isStringLiteralLike(node) &&
      (node.text === "node:module" || node.text === "module");
  const directRequireCall = (node) =>
    node !== undefined &&
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    executionCapabilities
      .unshadowedRequireReferences
      .has(node.expression);
  const directModuleLoaderCall = (node) =>
    directRequireCall(node) &&
    node.arguments.length === 1 &&
    moduleLoaderSpecifier(node.arguments[0]);
  const bindingIdentifier = (node) =>
    ts.isIdentifier(node) ? node.text : null;
  const moduleCreateRequireExpression = (node) =>
    (
      node !== undefined &&
      ts.isIdentifier(node) &&
      createRequireFactoryAliases.has(node.text)
    ) || (
      node !== undefined &&
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "createRequire" &&
      (
        (
          ts.isIdentifier(node.expression) &&
          (
            moduleObjectAliases.has(
              node.expression.text,
            ) ||
            executionCapabilities
              .unshadowedModuleReferences
              .has(node.expression)
          )
        ) || directModuleLoaderCall(node.expression)
      )
    ) || (
      node !== undefined &&
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === "createRequire" &&
      (
        (
          ts.isIdentifier(node.expression) &&
          (
            moduleObjectAliases.has(
              node.expression.text,
            ) ||
            executionCapabilities
              .unshadowedModuleReferences
              .has(node.expression)
          )
        ) || directModuleLoaderCall(node.expression)
      )
    );
  const returnedRequireExpression = (node) =>
    node !== undefined &&
    ts.isCallExpression(node) &&
    moduleCreateRequireExpression(node.expression);
  const createRequireBaseIsSafe = (node) =>
    node.arguments.length === 1 && (
      (
        ts.isIdentifier(node.arguments[0]) &&
        node.arguments[0].text === "__filename"
      ) || (
        ts.isPropertyAccessExpression(
          node.arguments[0],
        ) &&
        node.arguments[0].name.text === "url" &&
        ts.isMetaProperty(
          node.arguments[0].expression,
        ) &&
        node.arguments[0].expression.keywordToken ===
          ts.SyntaxKind.ImportKeyword &&
        node.arguments[0].expression.name.text === "meta"
      )
    );
  const moduleRequireExpression = (node) =>
    (
      node !== undefined &&
      ts.isPropertyAccessExpression(node) &&
      node.name.text === "require" &&
      ts.isIdentifier(node.expression) &&
      (
        moduleObjectAliases.has(
          node.expression.text,
        ) ||
        executionCapabilities
          .unshadowedModuleReferences
          .has(node.expression)
      )
    ) || (
      node !== undefined &&
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === "require" &&
      ts.isIdentifier(node.expression) &&
      (
        moduleObjectAliases.has(
          node.expression.text,
        ) ||
        executionCapabilities
          .unshadowedModuleReferences
          .has(node.expression)
      )
    );
  const addBindingAlias = (name, initializer) => {
    if (!name || !initializer) return false;
    let changed = false;
    if (
      ts.isIdentifier(initializer) &&
      (
        moduleObjectAliases.has(initializer.text) ||
        executionCapabilities
          .unshadowedModuleReferences
          .has(initializer)
      ) &&
      !moduleObjectAliases.has(name)
    ) {
      moduleObjectAliases.add(name);
      changed = true;
    }
    if (
      (
        moduleCreateRequireExpression(initializer) ||
        (
          ts.isIdentifier(initializer) &&
          createRequireFactoryAliases.has(initializer.text)
        )
      ) && !createRequireFactoryAliases.has(name)
    ) {
      createRequireFactoryAliases.add(name);
      changed = true;
    }
    if (
      (
        returnedRequireExpression(initializer) ||
        moduleRequireExpression(initializer) ||
        (
          ts.isIdentifier(initializer) &&
          (
            returnedRequireAliases.has(
              initializer.text,
            ) ||
            executionCapabilities
              .unshadowedRequireReferences
              .has(initializer)
          )
        )
      ) && !returnedRequireAliases.has(name)
    ) {
      returnedRequireAliases.add(name);
      changed = true;
    }
    return changed;
  };

  collect(sourceFile);

  for (const node of nodes) {
    if (
      ts.isImportDeclaration(node) &&
      moduleLoaderSpecifier(node.moduleSpecifier) &&
      node.importClause
    ) {
      if (node.importClause.name) {
        moduleObjectAliases.add(node.importClause.name.text);
      }
      const bindings = node.importClause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        moduleObjectAliases.add(bindings.name.text);
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (
            (element.propertyName ?? element.name).text ===
              "createRequire"
          ) {
            createRequireFactoryAliases.add(element.name.text);
          }
        }
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      directModuleLoaderCall(node.initializer)
    ) {
      if (ts.isIdentifier(node.name)) {
        moduleObjectAliases.add(node.name.text);
      } else if (ts.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          if (
            bindingIdentifier(element.name) !== null &&
            staticPropertyName(
              element.propertyName ?? element.name,
            ) === "createRequire"
          ) {
            createRequireFactoryAliases.add(
              bindingIdentifier(element.name),
            );
          }
        }
      }
    }
  }

  let aliasesChanged = true;
  while (aliasesChanged) {
    aliasesChanged = false;
    for (const node of nodes) {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name)
      ) {
        aliasesChanged = addBindingAlias(
          node.name.text,
          node.initializer,
        ) || aliasesChanged;
      } else if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind ===
          ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left)
      ) {
        aliasesChanged = addBindingAlias(
          node.left.text,
          node.right,
        ) || aliasesChanged;
      }
    }
  }

  const runtimeRequireCall = (node) =>
    ts.isCallExpression(node) && (
      (
        ts.isIdentifier(node.expression) &&
        (
          returnedRequireAliases.has(
            node.expression.text,
          ) ||
          executionCapabilities
            .unshadowedRequireReferences
            .has(node.expression)
        )
      ) ||
      moduleRequireExpression(node.expression) ||
      returnedRequireExpression(node.expression)
    );
  const visit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      !importDeclarationIsTypeOnly(node)
    ) {
      addStringLiteral(node.moduleSpecifier);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      !exportDeclarationIsTypeOnly(node)
    ) {
      addStringLiteral(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(
        node.moduleReference,
      )
    ) {
      addStringLiteral(
        node.moduleReference.expression,
      );
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport =
        node.expression.kind ===
        ts.SyntaxKind.ImportKeyword;
      const isRequireCall = runtimeRequireCall(node);

      if (
        (isDynamicImport || isRequireCall) &&
        (!addStringLiteral(node.arguments[0]) ||
          (isRequireCall &&
            node.arguments.length !== 1))
      ) {
        hasNonLiteralRuntimeImport = true;
      }
      if (
        returnedRequireExpression(node) &&
        !createRequireBaseIsSafe(node)
      ) {
        hasNonLiteralRuntimeImport = true;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (
    executionCapabilities.hasRuntimeModuleLoader ||
    nodes.some((node) =>
      moduleRequireExpression(node),
    )
  ) {
    hasNonLiteralRuntimeImport = true;
  }
  hasServerOnlyRuntimeCapability =
    hasServerOnlyRuntimeCapability ||
    executionCapabilities
      .hasServerOnlyRuntimeCapability;
  return {
    specifiers: [...specifiers],
    hasDynamicCodeExecution:
      executionCapabilities
        .hasDynamicCodeExecution,
    hasNonLiteralRuntimeImport,
    hasServerOnlyRuntimeCapability,
    hasVmRuntimeExecution:
      executionCapabilities
        .hasVmRuntimeExecution ||
      [...specifiers].some(
        moduleSpecifierIsVm,
      ),
  };
}

function staticPropertyName(node) {
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteralLike(node)
  ) {
    return node.text;
  }

  return null;
}

function frozenObjectLiteral(node) {
  if (
    !node || !ts.isCallExpression(node) ||
    node.arguments.length !== 1 ||
    !ts.isPropertyAccessExpression(node.expression) ||
    !ts.isIdentifier(node.expression.expression) ||
    node.expression.expression.text !== "Object" ||
    node.expression.name.text !== "freeze" ||
    !ts.isObjectLiteralExpression(node.arguments[0])
  ) {
    return null;
  }

  return {
    objectIdentifier:
      node.expression.expression,
    objectLiteral: node.arguments[0],
  };
}

function botReplyDeliveryAdapterIsLiteralFalse(
  sourceFile,
) {
  const declarations = [];
  const stateInterfaces = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text ===
        "ProductionImplementationState"
    ) {
      stateInterfaces.push(statement);
      continue;
    }
    if (
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      (
        ts.isImportDeclaration(statement) &&
        importDeclarationIsTypeOnly(statement)
      ) ||
      (
        ts.isExportDeclaration(statement) &&
        exportDeclarationIsTypeOnly(statement)
      )
    ) {
      continue;
    }

    if (
      !ts.isVariableStatement(statement) ||
      statement.modifiers?.length !== 1 ||
      !statement.modifiers?.some(
        (modifier) =>
          modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) ||
      statement.declarationList.flags !==
        ts.NodeFlags.Const ||
      statement.declarationList.declarations.length !== 1
    ) {
      return false;
    }

    const declaration =
      statement.declarationList.declarations[0];
    if (
      !ts.isIdentifier(declaration.name) ||
      declaration.name.text !==
        "currentProductionImplementationState"
    ) {
      return false;
    }
    declarations.push(declaration);
  }

  if (declarations.length !== 1) {
    return false;
  }
  if (stateInterfaces.length !== 1) {
    return false;
  }
  const stateInterface = stateInterfaces[0];
  if (
    stateInterface.modifiers?.length !== 1 ||
    stateInterface.modifiers[0].kind !==
      ts.SyntaxKind.ExportKeyword ||
    stateInterface.typeParameters !== undefined ||
    stateInterface.heritageClauses !== undefined ||
    stateInterface.members.length !==
      productionImplementationStatePropertyNames.size
  ) {
    return false;
  }
  const interfacePropertyNames = new Set();
  for (const member of stateInterface.members) {
    if (
      !ts.isPropertySignature(member) ||
      member.questionToken !== undefined ||
      member.initializer !== undefined ||
      member.modifiers !== undefined ||
      member.type?.kind !==
        ts.SyntaxKind.BooleanKeyword
    ) {
      return false;
    }
    const name = staticPropertyName(member.name);
    if (
      name === null ||
      !productionImplementationStatePropertyNames.has(
        name,
      ) ||
      interfacePropertyNames.has(name)
    ) {
      return false;
    }
    interfacePropertyNames.add(name);
  }

  const declaration = declarations[0];
  if (
    !declaration.type ||
    !ts.isTypeReferenceNode(declaration.type) ||
    !ts.isIdentifier(declaration.type.typeName) ||
    declaration.type.typeName.text !==
      "ProductionImplementationState" ||
    declaration.type.typeArguments !== undefined
  ) {
    return false;
  }
  const frozenValue = frozenObjectLiteral(
    declaration.initializer,
  );
  if (frozenValue === null) return false;

  const properties = new Map();
  for (
    const property of
      frozenValue.objectLiteral.properties
  ) {
    if (!ts.isPropertyAssignment(property)) {
      return false;
    }
    const name = staticPropertyName(property.name);
    if (
      name === null ||
      properties.has(name) ||
      (
        property.initializer.kind !==
          ts.SyntaxKind.TrueKeyword &&
        property.initializer.kind !==
          ts.SyntaxKind.FalseKeyword
      )
    ) {
      return false;
    }
    properties.set(name, property.initializer);
  }

  const adapter = properties.get(
    "botReplyDeliveryAdapter",
  );
  return (
    properties.size ===
      productionImplementationStatePropertyNames.size &&
    [...productionImplementationStatePropertyNames]
      .every((name) => properties.has(name)) &&
    adapter?.kind === ts.SyntaxKind.FalseKeyword
  );
}

async function readCompilerOptions(root) {
  const fallback = {
    allowJs: true,
    allowImportingTsExtensions: true,
    baseUrl: root,
    module: ts.ModuleKind.ESNext,
    moduleResolution:
      ts.ModuleResolutionKind.Bundler,
    paths: {
      "@/*": ["*"],
    },
    resolveJsonModule: true,
  };
  let configSource;

  try {
    configSource = await readFile(
      join(root, "tsconfig.json"),
      "utf8",
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {
        options: fallback,
        diagnostics: [],
      };
    }
    throw error;
  }

  const parsed = ts.parseConfigFileTextToJson(
    join(root, "tsconfig.json"),
    configSource,
  );

  if (parsed.error) {
    return {
      options: fallback,
      diagnostics: [parsed.error],
    };
  }

  const converted =
    ts.convertCompilerOptionsFromJson(
      parsed.config.compilerOptions ?? {},
      root,
      join(root, "tsconfig.json"),
    );

  return {
    options: {
      ...fallback,
      ...converted.options,
      baseUrl:
        converted.options.baseUrl ?? root,
    },
    diagnostics: converted.errors,
  };
}

function resolveLocalImport(
  root,
  importer,
  specifier,
  compilerOptions,
  availableFileByCanonicalPath,
  moduleResolutionCache,
) {
  const hasFileUrlScheme = /^file:/iu.test(
    specifier,
  );
  let literalLocalTarget = null;
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    hasFileUrlScheme
  ) {
    try {
      const targetUrl = new URL(
        specifier,
        pathToFileURL(importer),
      );
      if (targetUrl.protocol === "file:") {
        literalLocalTarget = normalize(
          resolve(fileURLToPath(targetUrl)),
        );
      }
    } catch {
      return null;
    }
  }

  const canonicalAvailableFile = (file) => {
    const canonicalFile = normalize(
      typeof ts.sys.realpath === "function"
        ? ts.sys.realpath(file)
        : file,
    );
    return availableFileByCanonicalPath.get(
      canonicalFile,
    ) ?? null;
  };

  if (literalLocalTarget !== null) {
    const exactTarget = canonicalAvailableFile(
      literalLocalTarget,
    );
    if (exactTarget !== null) return exactTarget;
  }

  const resolutionSpecifier =
    stripResourceSuffix(specifier);
  const resolvedModule = ts.resolveModuleName(
    resolutionSpecifier,
    importer,
    compilerOptions,
    ts.sys,
    moduleResolutionCache,
  ).resolvedModule;

  if (!resolvedModule) {
    return null;
  }

  const resolvedFile = normalize(
    resolve(resolvedModule.resolvedFileName),
  );
  const availableFile = canonicalAvailableFile(
    resolvedFile,
  );

  return availableFile !== null &&
      availableFile.startsWith(
        `${normalize(resolve(root))}/`,
      )
    ? availableFile
    : null;
}

function matchesPathAlias(specifier, pattern) {
  const wildcardIndex = pattern.indexOf("*");

  if (wildcardIndex === -1) {
    return specifier === pattern;
  }

  return (
    specifier.startsWith(
      pattern.slice(0, wildcardIndex),
    ) &&
    specifier.endsWith(
      pattern.slice(wildcardIndex + 1),
    )
  );
}

function isProjectLocalSpecifier(
  specifier,
  compilerOptions,
) {
  const resourcePath = stripResourceSuffix(
    specifier,
  );
  return (
    resourcePath.startsWith(".") ||
    resourcePath.startsWith("/") ||
    /^file:/iu.test(resourcePath) ||
    Object.keys(
      compilerOptions.paths ?? {},
    ).some((pattern) =>
      matchesPathAlias(resourcePath, pattern),
    )
  );
}

function isSourceLikeSpecifier(specifier) {
  const extension = extname(
    stripResourceSuffix(specifier),
  );

  return (
    extension.length === 0 ||
    sourceExtensions.has(extension)
  );
}

function stripResourceSuffix(specifier) {
  const queryIndex = specifier.indexOf("?");
  const fragmentIndex = specifier.startsWith("#")
    ? -1
    : specifier.indexOf("#");
  const suffixIndexes = [
    queryIndex,
    fragmentIndex,
  ].filter((index) => index >= 0);

  return suffixIndexes.length === 0
    ? specifier
    : specifier.slice(0, Math.min(...suffixIndexes));
}

function isInlineRuntimeModuleSpecifier(specifier) {
  return /^data:/iu.test(specifier);
}

function relativePath(root, file) {
  return relative(root, file).replaceAll(
    "\\",
    "/",
  );
}

function isServerOnlyModule(
  root,
  file,
  runtimeSpecifiers,
  hasServerOnlyRuntimeCapability,
) {
  const path = relativePath(root, file);

  return (
    path.startsWith("server/") ||
    path.startsWith("db/") ||
    path.startsWith("worker/") ||
    rootServerOnlyPaths.has(path) ||
    hasServerOnlyRuntimeCapability ||
    /(^|\/)route\.(?:[cm]?[jt]sx?)$/.test(path) ||
    runtimeSpecifiers.some((specifier) =>
      specifier.startsWith("node:") ||
      serverOnlyImportSpecifiers.has(specifier) ||
      serverOnlyImportPattern.test(specifier),
    )
  );
}

export async function inspectSourceGuardrails(
  root = projectRoot,
) {
  const [
    nestedFiles,
    projectPackageManifests,
    symbolicLinkPaths,
    dormantWriterPolicySourceFiles,
    dormantWriterPolicySqlFiles,
  ] =
    await Promise.all([
      Promise.all(
      sourceRoots.map((sourceRoot) =>
        listSourceFiles(join(root, sourceRoot), root),
      ),
      ).then((groups) => groups.flat()),
      listProjectPackageManifests(root),
      listSymbolicLinks(root),
      Promise.all([
        listSourceFiles(join(root, "postgres"), root),
        listSourceFiles(join(root, "tests"), root),
      ]).then((groups) => groups.flat()),
      listProjectFiles(
        join(root, "postgres/migrations"),
        (name) => extname(name) === ".sql",
      ),
    ]);
  const packageManifestFiles = [...new Set([
    join(root, "package.json"),
    ...projectPackageManifests,
  ])].sort();
  const projectSourceFiles =
    await listProjectSourceFiles(root);
  const compilerConfiguration =
    await readCompilerOptions(root);
  const packageScriptAnalysis =
    await packageScriptSourceEntries(
      root,
      packageManifestFiles,
      projectSourceFiles,
    );
  const packageScriptEntriesByManifest =
    packageScriptAnalysis.entriesByManifest;
  const packageScriptClosure =
    await packageScriptSourceClosure(
      root,
      packageScriptEntriesByManifest,
      projectSourceFiles,
      compilerConfiguration.options,
    );
  const runtimePackageScriptClosure =
    await packageScriptSourceClosure(
      root,
      packageScriptAnalysis.runtimeEntriesByManifest,
      projectSourceFiles,
      compilerConfiguration.options,
    );
  const runtimeSubprocessCapabilityFiles = new Set();
  for (const file of runtimePackageScriptClosure) {
    let source;
    try {
      source = await readFile(file, "utf8");
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }
    if (
      sourceHasProductionRuntimeSubprocessCapability(
        parseSourceFile(file, source),
      )
    ) {
      runtimeSubprocessCapabilityFiles.add(file);
    }
  }
  const rootFiles = rootRuntimeFiles
    .map((file) => join(root, file))
    .filter((file) =>
      sourceExtensions.has(extname(file)),
    );
  const configuredCandidateFiles = new Set([
    ...nestedFiles,
    ...rootFiles,
  ]);
  const packageScriptAdditionalFiles = [
    ...packageScriptClosure,
  ].filter((file) => {
    const path = relativePath(root, file);
    return !configuredCandidateFiles.has(file) &&
      !path.startsWith("scripts/");
  });
  const candidateFiles = [...new Set([
    ...nestedFiles,
    ...rootFiles,
    ...packageScriptAdditionalFiles,
  ])];
  const candidateFileSet = new Set(candidateFiles);
  const dormantImporterCandidateFiles = [
    ...await listSourceFiles(join(root, "scripts"), root),
    ...await listImmediateSourceFiles(root),
  ]
    .filter((file) => !candidateFileSet.has(file))
    .sort();
  const sources = new Map();
  const dormantImporterSources = new Map();
  const dormantWriterPolicySources = new Map();
  const dormantWriterPolicySqlSources = new Map();

  for (const file of candidateFiles) {
    try {
      sources.set(file, await readFile(file, "utf8"));
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  for (const file of dormantImporterCandidateFiles) {
    try {
      dormantImporterSources.set(
        file,
        await readFile(file, "utf8"),
      );
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  for (const file of dormantWriterPolicySourceFiles) {
    if (
      sources.has(file) ||
      dormantImporterSources.has(file)
    ) {
      continue;
    }
    try {
      dormantWriterPolicySources.set(
        file,
        await readFile(file, "utf8"),
      );
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  for (const file of dormantWriterPolicySqlFiles) {
    try {
      dormantWriterPolicySqlSources.set(
        file,
        await readFile(file, "utf8"),
      );
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  const files = [...sources.keys()].sort();
  const graphIdentityFiles = [...new Set([
    ...files,
    ...dormantImporterSources.keys(),
    ...dormantWriterPolicySources.keys(),
  ])];
  const canonicalFileByFile = new Map(
    await Promise.all(
      graphIdentityFiles.map(async (file) => [
        file,
        await canonicalExistingPath(file),
      ]),
    ),
  );
  const canonicalSymbolicLinkByPath = new Map(
    await Promise.all(
      symbolicLinkPaths.map(async (file) => [
        normalize(resolve(file)),
        await canonicalExistingPath(file),
      ]),
    ),
  );
  const availableFileByCanonicalPath = new Map(
    files.map((file) => [
      canonicalFileByFile.get(file),
      file,
    ]),
  );
  const dormantWriterPolicyAvailableFileByCanonicalPath =
    new Map(
      graphIdentityFiles.map((file) => [
        canonicalFileByFile.get(file),
        file,
      ]),
    );
  const dormantCanonicalFiles = new Set(
    files
      .filter((file) =>
        dormantBotReplyStagingAttestedModulePaths.has(
          relativePath(root, file),
        ),
      )
      .map((file) => canonicalFileByFile.get(file)),
  );
  const fileIsDormantAttestedModule = (file) =>
    dormantCanonicalFiles.has(
      canonicalFileByFile.get(file) ??
        normalize(resolve(file)),
    );
  const findings = [];
  const findingKeys = new Set();
  const addFinding = (finding) => {
    const key = `${finding.code}:${finding.file}`;

    if (!findingKeys.has(key)) {
      findingKeys.add(key);
      findings.push(finding);
    }
  };
  for (const file of runtimeSubprocessCapabilityFiles) {
    addFinding({
      code:
        "PRODUCTION_PACKAGE_SCRIPT_SUBPROCESS_CAPABILITY_FORBIDDEN",
      file: relativePath(root, file),
    });
  }
  for (const manifestFile of packageManifestFiles) {
    let manifestSource;
    try {
      manifestSource = await readFile(
        manifestFile,
        "utf8",
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        continue;
      }
      throw error;
    }

    let manifest;
    try {
      manifest = JSON.parse(manifestSource);
    } catch {
      addFinding({
        code: "SOURCE_GRAPH_CONFIGURATION_FAILED",
        file: relativePath(root, manifestFile),
      });
      continue;
    }
    if (
      typeof manifest !== "object" ||
      manifest === null ||
      Array.isArray(manifest)
    ) {
      addFinding({
        code: "SOURCE_GRAPH_CONFIGURATION_FAILED",
        file: relativePath(root, manifestFile),
      });
      continue;
    }

    if (
      packageScriptAnalysis.unmodelledManifestFiles.has(manifestFile)
    ) {
      addFinding({
        code: "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
        file: relativePath(root, manifestFile),
      });
    }

    if (
      [...(
        packageScriptEntriesByManifest.get(manifestFile) ??
          new Set()
      )].some((file) =>
        dormantCanonicalFiles.has(
          canonicalFileByFile.get(file) ??
            normalize(resolve(file)),
        )
      )
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
        file: relativePath(root, manifestFile),
      });
    }

    const targets = new Set();
    collectPackageRuntimeTargets(
      manifest.imports,
      targets,
    );
    collectPackageRuntimeTargets(
      manifest.exports,
      targets,
    );
    collectPackageRuntimeTargets(
      manifest.bin,
      targets,
    );
    collectPackageRuntimeTargets(
      manifest.main,
      targets,
    );
    collectPackageRuntimeTargets(
      manifest.module,
      targets,
    );
    if (
      [
        manifest.bin,
        manifest.exports,
        manifest.imports,
        manifest.main,
        manifest.module,
        manifest.scripts,
      ].some(packageValueReferencesPinnedSessionTransport)
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
        file: relativePath(root, manifestFile),
      });
    }
    for (const target of targets) {
      if (isInlineRuntimeModuleSpecifier(target)) {
        addFinding({
          code:
            "INLINE_RUNTIME_MODULE_IMPORT_FORBIDDEN",
          file: relativePath(root, manifestFile),
        });
        continue;
      }
      if (!target.startsWith(".")) continue;
      const targetPathPattern =
        target.split(/[?#]/, 1)[0];
      if (targetPathPattern.includes("*")) {
        let matchesDormantFile = false;
        for (
          const [file, canonicalFile] of
            canonicalFileByFile
        ) {
          if (
            !dormantCanonicalFiles.has(
              canonicalFile,
            )
          ) {
            continue;
          }
          if (
            await packageTargetPatternMatchesCanonicalFile(
              manifestFile,
              target,
              file,
              canonicalFile,
              canonicalSymbolicLinkByPath,
            )
          ) {
            matchesDormantFile = true;
            break;
          }
        }
        if (matchesDormantFile) {
          addFinding({
            code:
              "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
            file: relativePath(root, manifestFile),
          });
        }
        continue;
      }
      const targetPath = resolvePackageTargetPath(
        manifestFile,
        target,
      );
      if (targetPath === null) {
        addFinding({
          code: "SOURCE_GRAPH_CONFIGURATION_FAILED",
          file: relativePath(root, manifestFile),
        });
        continue;
      }
      const canonicalTarget =
        await canonicalExistingPath(
          targetPath,
        );
      if (dormantCanonicalFiles.has(canonicalTarget)) {
        addFinding({
          code:
            "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
          file: relativePath(root, manifestFile),
        });
      }
    }
  }

  if (
    compilerConfiguration.diagnostics.length > 0
  ) {
    addFinding({
      code: "SOURCE_GRAPH_CONFIGURATION_FAILED",
      file: "tsconfig.json",
    });
  }

  const parsedSources = new Map(
    files.map((file) => [
      file,
      parseSourceFile(file, sources.get(file)),
    ]),
  );
  const runtimeSpecifiersByFile = new Map();
  const nonLiteralRuntimeImportsByFile =
    new Map();
  const serverOnlyRuntimeCapabilitiesByFile =
    new Map();
  const dynamicCodeExecutionByFile = new Map();
  const vmRuntimeExecutionByFile = new Map();

  for (const file of files) {
    const sourceFile = parsedSources.get(file);
    const path = relativePath(root, file);

    if (sourceFile.parseDiagnostics.length > 0) {
      addFinding({
        code: "SOURCE_PARSE_FAILED",
        file: path,
      });
    }

    if (
      stagingCapabilityPortPaths.has(path) &&
      !sourceFileIsTypeOnlyContract(sourceFile)
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CAPABILITY_PORT_RUNTIME_FORBIDDEN",
        file: path,
      });
    } else if (
      path === stagingRunCapabilityPortsPath &&
      !stagingRunCapabilityPortsAreExact(sourceFile)
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
        file: path,
      });
    } else if (
      path === stagingProviderFenceCapabilityPortsPath &&
      !stagingProviderFenceCapabilityPortsAreExact(sourceFile)
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CAPABILITY_PORT_CONTRACT_INVALID",
        file: path,
      });
    } else if (
      path === stagingProviderFenceCapabilityRepositoryPath &&
      !stagingProviderFenceCapabilityRepositoryExportsAreExact(sourceFile)
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CAPABILITY_REPOSITORY_EXPORT_INVALID",
        file: path,
      });
    } else if (
      path === nodePostgresStagingProviderFenceWorkerCapabilityPath &&
      !nodePostgresStagingProviderFenceWorkerCapabilityExportsAreExact(
        sourceFile,
      )
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CAPABILITY_DRIVER_EXPORT_INVALID",
        file: path,
      });
    }
    if (
      path === nodePostgresBotReplyPinnedSessionTransportPath &&
      !nodePostgresBotReplyPinnedSessionTransportContractIsExact(
        sourceFile,
      )
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_PINNED_SESSION_TRANSPORT_CONTRACT_INVALID",
        file: path,
      });
    }

    const dependencyAnalysis =
      analyzeRuntimeDependencies(sourceFile);

    if (
      dependencyAnalysis.specifiers.some(
        isInlineRuntimeModuleSpecifier,
      )
    ) {
      addFinding({
        code:
          "INLINE_RUNTIME_MODULE_IMPORT_FORBIDDEN",
        file: relativePath(root, file),
      });
    }

    runtimeSpecifiersByFile.set(
      file,
      dependencyAnalysis.specifiers,
    );
    nonLiteralRuntimeImportsByFile.set(
      file,
      dependencyAnalysis.hasNonLiteralRuntimeImport,
    );
    serverOnlyRuntimeCapabilitiesByFile.set(
      file,
      dependencyAnalysis.hasServerOnlyRuntimeCapability,
    );
    dynamicCodeExecutionByFile.set(
      file,
      dependencyAnalysis.hasDynamicCodeExecution,
    );
    vmRuntimeExecutionByFile.set(
      file,
      dependencyAnalysis.hasVmRuntimeExecution,
    );
  }

  const canonicalFileName = (file) =>
    ts.sys.useCaseSensitiveFileNames
      ? file
      : file.toLowerCase();
  const moduleResolutionCache =
    ts.createModuleResolutionCache(
      root,
      canonicalFileName,
      compilerConfiguration.options,
    );
  const resolvedDependenciesBySpecifier =
    new Map(
      files.map((file) => [
        file,
        new Map(
          runtimeSpecifiersByFile
            .get(file)
            .map((specifier) => [
              specifier,
              resolveLocalImport(
                root,
                file,
                specifier,
                compilerConfiguration.options,
                availableFileByCanonicalPath,
                moduleResolutionCache,
              ),
            ]),
        ),
      ]),
    );
  const graph = new Map(
    files.map((file) => [
      file,
      [
        ...resolvedDependenciesBySpecifier
          .get(file)
          .values(),
      ]
        .filter(Boolean),
    ]),
  );

  const inspectCapabilityPortAugmentations = (
    file,
    sourceFile,
  ) => {
    for (const specifier of declaredModuleSpecifiers(sourceFile)) {
      const dependency = resolveLocalImport(
        root,
        file,
        specifier,
        compilerConfiguration.options,
        availableFileByCanonicalPath,
        moduleResolutionCache,
      );
      if (
        dependency !== null &&
        stagingCapabilityPortPaths.has(
          relativePath(root, dependency),
        )
      ) {
        addFinding({
          code:
            "BOT_REPLY_STAGING_CAPABILITY_PORT_AUGMENTATION_FORBIDDEN",
          file: relativePath(root, file),
        });
      }
    }
  };
  const inspectDormantCredentialBoundPreSendSql = (
    file,
    sourceFile,
  ) => {
    const path = relativePath(root, file);
    const allowedIdentifiers =
      allowedDormantSqlIdentifiersForPath(path);

    if (
      sourceFileReferencesDormantCredentialBoundPreSendSql(
        sourceFile,
        allowedIdentifiers,
        path === "scripts/verify-source-guardrails.mjs",
      )
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file: path,
      });
    }
  };

  for (const [file, sourceFile] of parsedSources) {
    inspectCapabilityPortAugmentations(file, sourceFile);
    inspectDormantCredentialBoundPreSendSql(file, sourceFile);
  }
  for (const [file, source] of dormantImporterSources) {
    const sourceFile = parseSourceFile(file, source);
    inspectCapabilityPortAugmentations(
      file,
      sourceFile,
    );
    inspectDormantCredentialBoundPreSendSql(file, sourceFile);
  }

  const dormantWriterPolicyParsedSources = new Map(
    [
      ...sources,
      ...dormantImporterSources,
      ...dormantWriterPolicySources,
    ].map(([file, source]) => [
      file,
      parseSourceFile(file, source),
    ]),
  );
  const directlyReferencedDormantWriterPolicyFiles = new Set();

  for (
    const [file, sourceFile] of
      dormantWriterPolicyParsedSources
  ) {
    const path = relativePath(root, file);
    const allowPolicyDeclaration =
      path === "scripts/verify-source-guardrails.mjs";
    if (
      path !== nodePostgresBotReplyPinnedSessionTransportPath &&
      sourceFileReferencesDormantCredentialBoundPreSendSql(
        sourceFile,
        new Set(),
        allowPolicyDeclaration,
        dormantWriterBarrierAndLateTruthSqlIdentifiers,
      )
    ) {
      directlyReferencedDormantWriterPolicyFiles.add(file);
    }

    if (
      dormantWriterPolicySources.has(file) &&
      sourceFileReferencesDormantCredentialBoundPreSendSql(
        sourceFile,
        allowedDormantSqlIdentifiersForPath(path),
        allowPolicyDeclaration,
        dormantWriterBarrierAndLateTruthSqlIdentifiers,
      )
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file: path,
      });
    }
  }

  for (const [file, source] of dormantWriterPolicySqlSources) {
    const path = relativePath(root, file);
    if (
      sourceReferencesDormantSqlIdentifier(
        source,
        dormantWriterBarrierAndLateTruthSqlIdentifiers,
        allowedDormantSqlIdentifiersForPath(path),
      )
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file: path,
      });
    }
  }

  const dormantWriterPolicyDependencies = new Map(
    [...dormantWriterPolicyParsedSources].map(
      ([file, sourceFile]) => [
        file,
        analyzeRuntimeDependencies(sourceFile).specifiers
          .map((specifier) =>
            resolveLocalImport(
              root,
              file,
              specifier,
              compilerConfiguration.options,
              dormantWriterPolicyAvailableFileByCanonicalPath,
              moduleResolutionCache,
            )
          )
          .filter(Boolean),
      ],
    ),
  );
  const reachesDormantWriterPolicyReference = (entryFile) => {
    const pending = [
      ...(dormantWriterPolicyDependencies.get(entryFile) ?? []),
    ];
    const inspected = new Set();
    while (pending.length > 0) {
      const file = pending.pop();
      if (inspected.has(file)) continue;
      inspected.add(file);
      if (
        directlyReferencedDormantWriterPolicyFiles.has(file)
      ) {
        return true;
      }
      pending.push(
        ...(dormantWriterPolicyDependencies.get(file) ?? []),
      );
    }
    return false;
  };

  for (const file of dormantWriterPolicyParsedSources.keys()) {
    const path = relativePath(root, file);
    if (
      !dormantWriterBarrierAndLateTruthAllowedSqlIdentifiersByPath.has(
        path,
      ) &&
      reachesDormantWriterPolicyReference(file)
    ) {
      addFinding({
        code:
          "BOT_REPLY_STAGING_CREDENTIAL_BOUND_SQL_REFERENCE_FORBIDDEN",
        file: path,
      });
    }
  }

  for (const file of files) {
    const source = sources.get(file);
    const path = relativePath(root, file);

    for (const rule of bannedPatterns) {
      if (rule.pattern.test(source)) {
        addFinding({
          code: rule.code,
          file: path,
        });
      }
    }

    if (dynamicCodeExecutionByFile.get(file)) {
      addFinding({
        code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
        file: path,
      });
    }
    if (vmRuntimeExecutionByFile.get(file)) {
      addFinding({
        code: "VM_RUNTIME_EXECUTION_FORBIDDEN",
        file: path,
      });
    }

    if (
      source.includes("ForTesting")
    ) {
      addFinding({
        code: "TEST_ONLY_READINESS_V2_SEAM_FORBIDDEN",
        file: path,
      });
    }
  }

  const implementationStateFile = files.find(
    (file) =>
      relativePath(root, file) ===
        productionImplementationStatePath,
  );
  if (
    !implementationStateFile ||
    !botReplyDeliveryAdapterIsLiteralFalse(
      parsedSources.get(implementationStateFile),
    )
  ) {
    addFinding({
      code:
        "BOT_REPLY_DELIVERY_ADAPTER_LITERAL_FALSE_REQUIRED",
      file: productionImplementationStatePath,
    });
  }

  const clientEntries = files.filter((file) => {
    const path = relativePath(root, file);

    return (
      conventionClientEntryPaths.has(path) ||
      hasDirective(
        parsedSources.get(file),
        "use client",
      )
    );
  });
  const clientReachableFiles = new Set();

  for (const clientEntry of clientEntries) {
    const pending = [clientEntry];
    const visited = new Set();

    while (pending.length > 0) {
      const file = pending.shift();

      if (!file || visited.has(file)) {
        continue;
      }

      visited.add(file);
      clientReachableFiles.add(file);
      const source = sources.get(file);
      const sourceFile = parsedSources.get(file);

      if (
        file !== clientEntry &&
        hasDirective(sourceFile, "use server")
      ) {
        continue;
      }

      if (
        isServerOnlyModule(
          root,
          file,
          runtimeSpecifiersByFile.get(file),
          serverOnlyRuntimeCapabilitiesByFile.get(file),
        )
      ) {
        addFinding({
          code: "CLIENT_SERVER_BOUNDARY_FORBIDDEN",
          file: relativePath(root, clientEntry),
        });
        continue;
      }

      if (
        serverOnlyIdentifiers.some((identifier) =>
          source.includes(identifier),
        )
      ) {
        addFinding({
          code: "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
          file: relativePath(root, clientEntry),
        });
      }

      if (
        nonLiteralRuntimeImportsByFile.get(file)
      ) {
        addFinding({
          code:
            "CLIENT_NON_LITERAL_RUNTIME_IMPORT_FORBIDDEN",
          file: relativePath(root, clientEntry),
        });
      }

      for (const dependency of graph.get(file) ?? []) {
        pending.push(dependency);
      }

      for (
        const specifier of
          runtimeSpecifiersByFile.get(file)
      ) {
        if (
          isProjectLocalSpecifier(
            specifier,
            compilerConfiguration.options,
          ) &&
          isSourceLikeSpecifier(specifier) &&
          resolvedDependenciesBySpecifier
            .get(file)
            .get(specifier) === null
        ) {
          addFinding({
            code:
              "CLIENT_LOCAL_IMPORT_UNRESOLVED",
            file: relativePath(root, clientEntry),
          });
        }
      }
    }
  }

  const runtimeEntries = files.filter((file) =>
    isRuntimeEntry(
      root,
      file,
      parsedSources.get(file),
    )
  );
  const runtimeReachableFiles = new Set();

  for (const runtimeEntry of runtimeEntries) {
    const pending = [runtimeEntry];
    const visited = new Set();

    while (pending.length > 0) {
      const file = pending.shift();
      if (!file || visited.has(file)) continue;
      visited.add(file);
      runtimeReachableFiles.add(file);

      if (
        fileIsDormantAttestedModule(file)
      ) {
        addFinding({
          code:
            "BOT_REPLY_STAGING_ATTESTED_RUNTIME_DEPENDENCY_FORBIDDEN",
          file: relativePath(root, runtimeEntry),
        });
      }

      if (nonLiteralRuntimeImportsByFile.get(file)) {
        addFinding({
          code:
            "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
          file: relativePath(root, runtimeEntry),
        });
      }

      for (
        const specifier of
          runtimeSpecifiersByFile.get(file) ?? []
      ) {
        if (
          isProjectLocalSpecifier(
            specifier,
            compilerConfiguration.options,
          ) &&
          isSourceLikeSpecifier(specifier) &&
          resolvedDependenciesBySpecifier
            .get(file)
            .get(specifier) === null
        ) {
          addFinding({
            code:
              "RUNTIME_LOCAL_IMPORT_UNRESOLVED",
            file: relativePath(root, runtimeEntry),
          });
        }
      }

      for (const dependency of graph.get(file) ?? []) {
        pending.push(dependency);
      }
    }
  }

  const dormantImporterIsAllowed = (
    importerPath,
    specifier,
    dependencyPath,
  ) =>
    dormantBotReplyStagingAttestedAllowedImporters
      .get(importerPath)
      ?.get(specifier) === dependencyPath;

  for (
    const [importer, dependenciesBySpecifier] of
      resolvedDependenciesBySpecifier
  ) {
    if (runtimeReachableFiles.has(importer)) {
      continue;
    }

    for (
      const [specifier, dependency] of
        dependenciesBySpecifier
    ) {
      if (!dependency) continue;
      const importerPath = relativePath(root, importer);
      const dependencyPath = relativePath(
        root,
        dependency,
      );
      if (
        fileIsDormantAttestedModule(dependency) &&
        !dormantImporterIsAllowed(
          importerPath,
          specifier,
          dependencyPath,
        )
      ) {
        addFinding({
          code:
            "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
          file: importerPath,
        });
      }
    }
  }

  for (
    const [importer, source] of
      dormantImporterSources
  ) {
    const importerPath = relativePath(root, importer);
    const sourceFile = parseSourceFile(importer, source);
    if (sourceFile.parseDiagnostics.length > 0) {
      addFinding({
        code: "SOURCE_PARSE_FAILED",
        file: importerPath,
      });
      continue;
    }

    const dependencyAnalysis =
      analyzeRuntimeDependencies(sourceFile);
    if (
      dependencyAnalysis.hasDynamicCodeExecution
    ) {
      addFinding({
        code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
        file: importerPath,
      });
    }
    if (dependencyAnalysis.hasVmRuntimeExecution) {
      addFinding({
        code: "VM_RUNTIME_EXECUTION_FORBIDDEN",
        file: importerPath,
      });
    }
    if (
      dependencyAnalysis.specifiers.some(
        isInlineRuntimeModuleSpecifier,
      )
    ) {
      addFinding({
        code:
          "INLINE_RUNTIME_MODULE_IMPORT_FORBIDDEN",
        file: importerPath,
      });
    }
    if (
      dependencyAnalysis.hasNonLiteralRuntimeImport
    ) {
      addFinding({
        code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
        file: importerPath,
      });
    }

    for (const specifier of dependencyAnalysis.specifiers) {
      const dependency = resolveLocalImport(
        root,
        importer,
        specifier,
        compilerConfiguration.options,
        availableFileByCanonicalPath,
        moduleResolutionCache,
      );
      if (!dependency) continue;
      const dependencyPath = relativePath(
        root,
        dependency,
      );

      if (
        fileIsDormantAttestedModule(dependency) &&
        !dormantImporterIsAllowed(
          importerPath,
          specifier,
          dependencyPath,
        )
      ) {
        addFinding({
          code:
            "BOT_REPLY_STAGING_ATTESTED_IMPORTER_FORBIDDEN",
          file: importerPath,
        });
      }
    }
  }

  const dormantAttestedModules = files.filter(
    (file) =>
      dormantBotReplyStagingAttestedModulePaths.has(
        relativePath(root, file),
      ),
  );
  const dormantAttestedClosureFiles = new Set();

  for (const dormantModule of dormantAttestedModules) {
    const pending = [dormantModule];
    const visited = new Set();

    while (pending.length > 0) {
      const file = pending.shift();
      if (!file || visited.has(file)) continue;
      visited.add(file);
      dormantAttestedClosureFiles.add(file);

      const path = relativePath(root, file);
      const allowedDependencies =
        dormantAttestedAllowedRuntimeDependencies.get(
          path,
        );
      if (!allowedDependencies) {
        addFinding({
          code:
            "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
          file: relativePath(root, dormantModule),
        });
        continue;
      }

      if (nonLiteralRuntimeImportsByFile.get(file)) {
        addFinding({
          code:
            "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
          file: relativePath(root, dormantModule),
        });
      }

      for (
        const specifier of
          runtimeSpecifiersByFile.get(file) ?? []
      ) {
        const dependency =
          resolvedDependenciesBySpecifier
            .get(file)
            .get(specifier);
        const dependencyPath = dependency
          ? relativePath(root, dependency)
          : null;
        const allowedTarget =
          allowedDependencies.get(specifier);
        const hasAllowedSpecifier =
          allowedDependencies.has(specifier);
        const externalAllowed =
          hasAllowedSpecifier &&
          allowedTarget === null &&
          dependency === null &&
          !isProjectLocalSpecifier(
            specifier,
            compilerConfiguration.options,
          );
        const localAllowed =
          hasAllowedSpecifier &&
          allowedTarget !== null &&
          dependencyPath === allowedTarget;

        if (!externalAllowed && !localAllowed) {
          addFinding({
            code:
              dependencyPath !== null &&
              legacyBotReplyStagingEvidenceModulePaths
                .has(dependencyPath)
                ? "BOT_REPLY_STAGING_ATTESTED_V1_DEPENDENCY_FORBIDDEN"
                : "BOT_REPLY_STAGING_ATTESTED_DEPENDENCY_NOT_ALLOWLISTED",
            file: relativePath(root, dormantModule),
          });
          continue;
        }

        if (dependency) {
          pending.push(dependency);
        }
      }
    }
  }

  for (const file of files) {
    if (
      !runtimeReachableFiles.has(file) &&
      !clientReachableFiles.has(file) &&
      !dormantAttestedClosureFiles.has(file) &&
      nonLiteralRuntimeImportsByFile.get(file)
    ) {
      addFinding({
        code: "RUNTIME_NON_LITERAL_IMPORT_FORBIDDEN",
        file: relativePath(root, file),
      });
    }
  }

  const dependencyEdgesInspected = [
    ...graph.values(),
  ].reduce(
    (total, dependencies) =>
      total + dependencies.length,
    0,
  );

  return Object.freeze({
    status:
      findings.length === 0
        ? "passed"
        : "failed",
    filesInspected: files.length,
    clientEntriesInspected:
      clientEntries.length,
    runtimeEntriesInspected:
      runtimeEntries.length,
    dormantAttestedModulesInspected:
      dormantAttestedModules.length,
    dormantImporterFilesInspected:
      files.length + dormantImporterSources.size,
    dependencyEdgesInspected,
    graphEngine: "typescript-compiler-api",
    findings: Object.freeze(findings),
  });
}

async function runCli() {
  const report =
    await inspectSourceGuardrails();

  if (report.status === "passed") {
    console.log(
      `Source guardrails: PASS (${report.filesInspected} files, ${report.clientEntriesInspected} client graphs, ${report.dependencyEdgesInspected} TypeScript dependency edges)`,
    );
    return;
  }

  console.error(
    `Source guardrails: FAIL (${report.findings.length} findings)`,
  );

  for (const finding of report.findings) {
    console.error(
      `[${finding.code}] ${finding.file}`,
    );
  }

  process.exitCode = 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) ===
    fileURLToPath(
      new URL(
        `file://${process.argv[1]}`,
      ),
    )
) {
  await runCli();
}
