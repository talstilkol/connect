import {
  readdir,
  readFile,
} from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const sourceRoots = [
  "app",
  "features",
  "server",
  "shared",
];
const sourceExtensions = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
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
  "CLERK_SECRET_KEY",
  "CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "META_CREDENTIAL_ENCRYPTION_KEY_V1",
];

async function listSourceFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });
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

export async function inspectSourceGuardrails(
  root = projectRoot,
) {
  const files = (
    await Promise.all(
      sourceRoots.map((sourceRoot) =>
        listSourceFiles(join(root, sourceRoot)),
      ),
    )
  )
    .flat()
    .sort();
  const findings = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const isClientModule =
      /^\s*["']use client["'];/m.test(source);

    for (const rule of bannedPatterns) {
      if (rule.pattern.test(source)) {
        findings.push({
          code: rule.code,
          file: file.slice(root.length + 1),
        });
      }
    }

    if (
      isClientModule &&
      /(?:from|import)\s*\(?["']cloudflare:workers["']/.test(
        source,
      )
    ) {
      findings.push({
        code: "CLIENT_CLOUDFLARE_ENV_FORBIDDEN",
        file: file.slice(root.length + 1),
      });
    }

    if (isClientModule) {
      for (const identifier of serverOnlyIdentifiers) {
        if (source.includes(identifier)) {
          findings.push({
            code: "CLIENT_SECRET_IDENTIFIER_FORBIDDEN",
            file: file.slice(
              root.length + 1,
            ),
          });
          break;
        }
      }
    }
  }

  return Object.freeze({
    status:
      findings.length === 0
        ? "passed"
        : "failed",
    filesInspected: files.length,
    findings: Object.freeze(findings),
  });
}

async function runCli() {
  const report =
    await inspectSourceGuardrails();

  if (report.status === "passed") {
    console.log(
      `Source guardrails: PASS (${report.filesInspected} files)`,
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
