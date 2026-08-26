import {
  readdir,
  readFile,
  realpath,
} from "node:fs/promises";
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
const dormantCredentialBoundPreSendVerifierPaths =
  new Set([
    "scripts/verify-bot-reply-staging-credential-bound-pre-send-session-barrier-postgres.mjs",
    "scripts/verify-postgres-migration-contract.mjs",
  ]);
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

async function listSourceFiles(directory) {
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
      const absolutePath = join(
        directory,
        entry.name,
      );

      if (entry.isDirectory()) {
        return listSourceFiles(absolutePath);
      }

      return sourceExtensions.has(
        extname(entry.name),
      )
        ? [absolutePath]
        : [];
    }),
  );

  return nested.flat();
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

async function listPackageManifests(directory) {
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
      if (entry.isDirectory()) {
        return listPackageManifests(path);
      }
      return entry.isFile() && entry.name === "package.json"
        ? [path]
        : [];
    }),
  );
  return nested.flat();
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
  return null;
}

function sourceFileReferencesDormantCredentialBoundPreSendSql(
  sourceFile,
  allowPolicyDeclaration = false,
) {
  let referencesDormantSql = false;
  const containsDormantIdentifier = (value) => {
    if (value === null) return false;
    for (
      const identifier of
      dormantCredentialBoundPreSendSqlIdentifiers
    ) {
      if (value.includes(identifier)) return true;
    }
    return false;
  };
  const visit = (node) => {
    if (referencesDormantSql) return;
    if (
      allowPolicyDeclaration &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text ===
        "dormantCredentialBoundPreSendSqlIdentifiers"
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
      )
    ) {
      referencesDormantSql = containsDormantIdentifier(
        runtimeStaticString(node),
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
    nestedPackageManifests,
    symbolicLinkPaths,
  ] =
    await Promise.all([
      Promise.all(
      sourceRoots.map((sourceRoot) =>
        listSourceFiles(join(root, sourceRoot)),
      ),
      ).then((groups) => groups.flat()),
      Promise.all(
        [...sourceRoots, "scripts"].map(
          (sourceRoot) =>
            listPackageManifests(
              join(root, sourceRoot),
            ),
        ),
      ).then((groups) => groups.flat()),
      listSymbolicLinks(root),
    ]);
  const packageManifestFiles = [...new Set([
    join(root, "package.json"),
    ...nestedPackageManifests,
  ])].sort();
  const rootFiles = rootRuntimeFiles
    .map((file) => join(root, file))
    .filter((file) =>
      sourceExtensions.has(extname(file)),
    );
  const candidateFiles = [...new Set([
    ...nestedFiles,
    ...rootFiles,
  ])];
  const candidateFileSet = new Set(candidateFiles);
  const dormantImporterCandidateFiles = [
    ...await listSourceFiles(join(root, "scripts")),
    ...await listImmediateSourceFiles(root),
  ]
    .filter((file) => !candidateFileSet.has(file))
    .sort();
  const sources = new Map();
  const dormantImporterSources = new Map();

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

  const files = [...sources.keys()].sort();
  const graphIdentityFiles = [...new Set([
    ...files,
    ...dormantImporterSources.keys(),
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
  const compilerConfiguration =
    await readCompilerOptions(root);

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

    const targets = new Set();
    collectPackageRuntimeTargets(
      manifest.imports,
      targets,
    );
    collectPackageRuntimeTargets(
      manifest.exports,
      targets,
    );
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

    if (
      !dormantCredentialBoundPreSendVerifierPaths.has(path) &&
      sourceFileReferencesDormantCredentialBoundPreSendSql(
        sourceFile,
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
