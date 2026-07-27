import {
  execFileSync,
  spawnSync,
} from "node:child_process";
import {
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  fileURLToPath,
} from "node:url";

const projectRoot = fileURLToPath(
  new URL("../", import.meta.url),
);
const maximumScannedFileBytes =
  1_048_576;
const secretEnvironmentNames = [
  "CLERK_SECRET_KEY",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "META_CREDENTIAL_ENCRYPTION_KEY_V1",
];
const unsafeFilePatterns = [
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)$/,
  /\.(?:key|p12|pfx|pem)$/i,
];
const allowedEnvironmentFile =
  ".env.example";
const contentPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bsk_(?:test|live)_[A-Za-z0-9]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
];
const historyExtendedPattern = [
  "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
  "AKIA[0-9A-Z]{16}",
  "gh[pousr]_[A-Za-z0-9]{20,}",
  "sk_(test|live)_[A-Za-z0-9]{20,}",
  "xox[baprs]-[A-Za-z0-9-]{20,}",
  "sk-(proj-)?[A-Za-z0-9_-]{20,}",
  `^(${secretEnvironmentNames.join("|")})=.+$`,
].join("|");

function finding(code) {
  return Object.freeze({ code });
}

export function inspectTrackedFileName(
  fileName,
) {
  if (
    fileName === allowedEnvironmentFile
  ) {
    return Object.freeze([]);
  }

  return Object.freeze(
    unsafeFilePatterns.some((pattern) =>
      pattern.test(fileName),
    )
      ? [finding("SECRET_FILE_TRACKED")]
      : [],
  );
}

export function inspectSecretText(
  text,
) {
  if (contentPatterns.some((pattern) =>
    pattern.test(text),
  )) {
    return Object.freeze([
      finding("SECRET_CONTENT_DETECTED"),
    ]);
  }

  const environmentAssignmentPattern =
    new RegExp(
      `^(?:${secretEnvironmentNames.join("|")})=.+$`,
      "m",
    );

  return Object.freeze(
    environmentAssignmentPattern.test(text)
      ? [
          finding(
            "SECRET_ENVIRONMENT_VALUE_TRACKED",
          ),
        ]
      : [],
  );
}

function git(argumentsList) {
  return execFileSync(
    "git",
    argumentsList,
    {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: [
        "ignore",
        "pipe",
        "ignore",
      ],
    },
  );
}

function inspectHistory() {
  const findings = [];
  const commits = git([
    "rev-list",
    "--all",
  ])
    .split("\n")
    .filter(Boolean);

  for (const commit of commits) {
    const fileNames = git([
      "ls-tree",
      "-r",
      "--name-only",
      commit,
    ])
      .split("\n")
      .filter(Boolean);

    if (
      fileNames.some(
        (fileName) =>
          inspectTrackedFileName(fileName)
            .length > 0,
      )
    ) {
      findings.push(
        finding(
          "SECRET_FILE_IN_HISTORY",
        ),
      );
      break;
    }
  }

  for (const commit of commits) {
    const result = spawnSync(
      "git",
      [
        "grep",
        "-I",
        "-E",
        "-q",
        "-e",
        historyExtendedPattern,
        commit,
      ],
      {
        cwd: projectRoot,
        stdio: "ignore",
      },
    );

    if (result.status === 0) {
      findings.push(
        finding(
          "SECRET_CONTENT_IN_HISTORY",
        ),
      );
      break;
    }

    if (result.status !== 1) {
      findings.push(
        finding(
          "SECRET_HISTORY_SCAN_FAILED",
        ),
      );
      break;
    }
  }

  return findings;
}

export async function inspectSecretHygiene({
  includeHistory = false,
} = {}) {
  const findings = [];
  const trackedFiles = git([
    "ls-files",
    "-z",
  ])
    .split("\0")
    .filter(Boolean);

  for (const fileName of trackedFiles) {
    findings.push(
      ...inspectTrackedFileName(fileName),
    );

    try {
      const content = await readFile(
        join(projectRoot, fileName),
      );

      if (
        content.byteLength >
          maximumScannedFileBytes ||
        content.includes(0)
      ) {
        continue;
      }

      findings.push(
        ...inspectSecretText(
          content.toString("utf8"),
        ),
      );
    } catch {
      findings.push(
        finding("SECRET_FILE_READ_FAILED"),
      );
    }
  }

  if (includeHistory) {
    try {
      findings.push(...inspectHistory());
    } catch {
      findings.push(
        finding(
          "SECRET_HISTORY_SCAN_FAILED",
        ),
      );
    }
  }

  return Object.freeze({
    status:
      findings.length === 0
        ? "passed"
        : "failed",
    trackedFileCount: trackedFiles.length,
    historyIncluded: includeHistory,
    findings: Object.freeze(findings),
  });
}

async function runCli() {
  const includeHistory =
    process.argv.length === 3 &&
    process.argv[2] === "--history";

  if (
    process.argv.length >
      (includeHistory ? 3 : 2)
  ) {
    console.error(
      "Secret hygiene: INVALID_ARGUMENTS",
    );
    process.exitCode = 1;
    return;
  }

  const report =
    await inspectSecretHygiene({
      includeHistory,
    });

  if (report.status === "passed") {
    console.log(
      `Secret hygiene: PASS (${report.trackedFileCount} tracked files${
        report.historyIncluded
          ? ", history included"
          : ""
      })`,
    );
    return;
  }

  console.error(
    `Secret hygiene: FAIL (${report.findings.length} findings)`,
  );
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
