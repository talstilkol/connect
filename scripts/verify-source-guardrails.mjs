import {
  readdir,
  readFile,
} from "node:fs/promises";
import {
  extname,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
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
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".mts",
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
    extension === ".mjs"
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

function analyzeRuntimeDependencies(sourceFile) {
  const specifiers = new Set();
  let hasNonLiteralRuntimeImport = false;
  const addStringLiteral = (node) => {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.add(node.text);
      return true;
    }

    return false;
  };
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
      const isRequireCall =
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require";

      if (
        (isDynamicImport || isRequireCall) &&
        (!addStringLiteral(node.arguments[0]) ||
          (isRequireCall &&
            node.arguments.length !== 1))
      ) {
        hasNonLiteralRuntimeImport = true;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return {
    specifiers: [...specifiers],
    hasNonLiteralRuntimeImport,
  };
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
  availableFiles,
  moduleResolutionCache,
) {
  const resolvedModule = ts.resolveModuleName(
    specifier,
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

  if (!availableFiles.has(resolvedFile)) {
    return null;
  }

  return resolvedFile.startsWith(
    `${normalize(resolve(root))}/`,
  )
    ? resolvedFile
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
  return (
    specifier.startsWith(".") ||
    Object.keys(
      compilerOptions.paths ?? {},
    ).some((pattern) =>
      matchesPathAlias(specifier, pattern),
    )
  );
}

function isSourceLikeSpecifier(specifier) {
  const extension = extname(specifier);

  return (
    extension.length === 0 ||
    sourceExtensions.has(extension)
  );
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
) {
  const path = relativePath(root, file);

  return (
    path.startsWith("server/") ||
    path.startsWith("db/") ||
    path.startsWith("worker/") ||
    rootServerOnlyPaths.has(path) ||
    /(^|\/)route\.(?:[cm]?[jt]sx?)$/.test(path) ||
    runtimeSpecifiers.some((specifier) =>
      serverOnlyImportPattern.test(specifier),
    )
  );
}

export async function inspectSourceGuardrails(
  root = projectRoot,
) {
  const nestedFiles = (
    await Promise.all(
      sourceRoots.map((sourceRoot) =>
        listSourceFiles(join(root, sourceRoot)),
      ),
    )
  ).flat();
  const rootFiles = rootRuntimeFiles
    .map((file) => join(root, file))
    .filter((file) =>
      sourceExtensions.has(extname(file)),
    );
  const candidateFiles = [
    ...nestedFiles,
    ...rootFiles,
  ];
  const sources = new Map();

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

  const files = [...sources.keys()].sort();
  const availableFiles = new Set(files);
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

  for (const file of files) {
    const sourceFile = parsedSources.get(file);

    if (sourceFile.parseDiagnostics.length > 0) {
      addFinding({
        code: "SOURCE_PARSE_FAILED",
        file: relativePath(root, file),
      });
    }

    const dependencyAnalysis =
      analyzeRuntimeDependencies(sourceFile);

    runtimeSpecifiersByFile.set(
      file,
      dependencyAnalysis.specifiers,
    );
    nonLiteralRuntimeImportsByFile.set(
      file,
      dependencyAnalysis.hasNonLiteralRuntimeImport,
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
                availableFiles,
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

  for (const clientEntry of clientEntries) {
    const pending = [clientEntry];
    const visited = new Set();

    while (pending.length > 0) {
      const file = pending.shift();

      if (!file || visited.has(file)) {
        continue;
      }

      visited.add(file);
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
