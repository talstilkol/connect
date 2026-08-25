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
    code: "DYNAMIC_CODE_EXECUTION_FORBIDDEN",
    pattern:
      /\b(?:eval|Function)\s*\(|new\s+Function\s*\(/,
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
const sourceGuardrailSelfPath =
  "scripts/verify-source-guardrails.mjs";
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
  if (!ts.isTypeAliasDeclaration(node)) {
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

function analyzeRuntimeDependencies(sourceFile) {
  const specifiers = new Set();
  let hasNonLiteralRuntimeImport = false;
  let hasServerOnlyRuntimeCapability = false;
  const nodes = [];
  const createRequireFactoryAliases = new Set();
  const moduleObjectAliases = new Set([
    "module",
  ]);
  const returnedRequireAliases = new Set([
    "require",
  ]);
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
    node.expression.text === "require";
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
          moduleObjectAliases.has(node.expression.text)
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
          moduleObjectAliases.has(node.expression.text)
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
        node.expression.text === "module" ||
        moduleObjectAliases.has(node.expression.text)
      )
    ) || (
      node !== undefined &&
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === "require" &&
      ts.isIdentifier(node.expression) &&
      (
        node.expression.text === "module" ||
        moduleObjectAliases.has(node.expression.text)
      )
    );
  const addBindingAlias = (name, initializer) => {
    if (!name || !initializer) return false;
    let changed = false;
    if (
      ts.isIdentifier(initializer) &&
      moduleObjectAliases.has(initializer.text) &&
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
          returnedRequireAliases.has(initializer.text)
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
        returnedRequireAliases.has(node.expression.text)
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
  const forbiddenLoaderNames = new Set([
    "require",
    "createRequire",
    "getBuiltinModule",
  ]);
  const inspectLoaderCapability = (node) => {
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      (
        ts.isImportDeclaration(node) &&
        importDeclarationIsTypeOnly(node)
      ) ||
      (
        ts.isExportDeclaration(node) &&
        exportDeclarationIsTypeOnly(node)
      ) ||
      (
        ts.isImportEqualsDeclaration(node) &&
        node.isTypeOnly
      )
    ) {
      return;
    }

    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      moduleObjectAliases.has(node.expression.text)
    ) {
      hasNonLiteralRuntimeImport = true;
      return;
    }

    if (
      (
        ts.isIdentifier(node) &&
        forbiddenLoaderNames.has(node.text)
      ) ||
      (
        ts.isStringLiteralLike(node) &&
        forbiddenLoaderNames.has(node.text)
      )
    ) {
      hasNonLiteralRuntimeImport = true;
      hasServerOnlyRuntimeCapability = true;
      return;
    }

    if (
      ts.isIdentifier(node) &&
      (
        node.text === "Buffer" ||
        node.text === "__filename" ||
        node.text === "__dirname"
      )
    ) {
      hasServerOnlyRuntimeCapability = true;
    }

    ts.forEachChild(node, inspectLoaderCapability);
  };
  inspectLoaderCapability(sourceFile);
  if (
    specifiers.has("node:module") ||
    specifiers.has("module") ||
    nodes.some((node) =>
      moduleRequireExpression(node),
    )
  ) {
    hasNonLiteralRuntimeImport = true;
  }
  return {
    specifiers: [...specifiers],
    hasNonLiteralRuntimeImport,
    hasServerOnlyRuntimeCapability,
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
      path === stagingRunCapabilityPortsPath &&
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
        relativePath(root, dependency) ===
          stagingRunCapabilityPortsPath
      ) {
        addFinding({
          code:
            "BOT_REPLY_STAGING_CAPABILITY_PORT_AUGMENTATION_FORBIDDEN",
          file: relativePath(root, file),
        });
      }
    }
  };

  for (const [file, sourceFile] of parsedSources) {
    inspectCapabilityPortAugmentations(file, sourceFile);
  }
  for (const [file, source] of dormantImporterSources) {
    inspectCapabilityPortAugmentations(
      file,
      parseSourceFile(file, source),
    );
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
      dependencyAnalysis.hasNonLiteralRuntimeImport &&
      importerPath !== sourceGuardrailSelfPath
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
