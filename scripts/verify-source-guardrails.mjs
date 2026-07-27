import {
  readdir,
  readFile,
} from "node:fs/promises";
import {
  dirname,
  extname,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

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
  "vite.config.ts",
  "next.config.ts",
  "drizzle.config.ts",
  "cloudflare-env.d.ts",
];
const sourceExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".mts",
]);
const resolvableExtensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
];
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
  "CLERK_SECRET_KEY",
  "CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "META_CREDENTIAL_ENCRYPTION_KEY_V1",
];
const serverOnlyImportPattern =
  /["'](?:cloudflare:workers|server-only|next\/headers|next\/server|@clerk\/nextjs\/server)["']/;
const clientDirectivePattern =
  /^\s*["']use client["']\s*;?/m;
const serverActionDirectivePattern =
  /^\s*["']use server["']\s*;?/m;

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

function runtimeImportSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+(?!type\b)(?:[^"'();]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+(?!type\b)[^"';]*?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function resolveLocalImport(
  importer,
  specifier,
  availableFiles,
) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const basePath = normalize(
    resolve(dirname(importer), specifier),
  );
  const candidates = [
    basePath,
    ...resolvableExtensions.map(
      (extension) => `${basePath}${extension}`,
    ),
    ...resolvableExtensions.map(
      (extension) =>
        join(basePath, `index${extension}`),
    ),
  ];

  return (
    candidates.find((candidate) =>
      availableFiles.has(candidate),
    ) ?? null
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
  source,
) {
  const path = relativePath(root, file);

  return (
    path.startsWith("db/") ||
    path.startsWith("worker/") ||
    serverOnlyImportPattern.test(source)
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
  const graph = new Map(
    files.map((file) => [
      file,
      runtimeImportSpecifiers(
        sources.get(file),
      )
        .map((specifier) =>
          resolveLocalImport(
            file,
            specifier,
            availableFiles,
          ),
        )
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
  }

  const clientEntries = files.filter((file) =>
    clientDirectivePattern.test(
      sources.get(file),
    ),
  );

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

      if (
        file !== clientEntry &&
        serverActionDirectivePattern.test(source)
      ) {
        continue;
      }

      if (
        isServerOnlyModule(root, file, source)
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

      for (const dependency of graph.get(file) ?? []) {
        pending.push(dependency);
      }
    }
  }

  return Object.freeze({
    status:
      findings.length === 0
        ? "passed"
        : "failed",
    filesInspected: files.length,
    clientEntriesInspected:
      clientEntries.length,
    findings: Object.freeze(findings),
  });
}

async function runCli() {
  const report =
    await inspectSourceGuardrails();

  if (report.status === "passed") {
    console.log(
      `Source guardrails: PASS (${report.filesInspected} files, ${report.clientEntriesInspected} client graphs)`,
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
