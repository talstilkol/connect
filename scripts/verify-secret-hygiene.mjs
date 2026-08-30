import {
  execFileSync,
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
  "DATABASE_URL",
  "POSTGRES_API_URL",
  "POSTGRES_WORKER_URL",
  "POSTGRES_VERIFIER_URL",
  "POSTGRES_MIGRATION_URL",
  "POSTGRES_OWNER_URL",
  "REDIS_URL",
  "CLERK_SECRET_KEY",
  "CONNECT_TRACE_CONTEXT_HMAC_KEY",
  "BETTER_STACK_SOURCE_TOKEN",
  "BETTER_STACK_INCIDENT_API_TOKEN",
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
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk_(?:test|live)_[A-Za-z0-9]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
];
const secretEnvironmentNamePattern =
  secretEnvironmentNames.join("|");
const environmentAssignmentPattern =
  new RegExp(
    `^[\\t ]*(?:export[\\t ]+)?(?:${secretEnvironmentNamePattern})[\\t ]*=[\\t ]*(?:"[^"\\r\\n]+"|'[^'\\r\\n]+'|[^\\s#'"\\r\\n][^\\r\\n]*)[\\t ]*$`,
    "m",
  );
const historicalBlobBatchSize = 128;

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
      maxBuffer: 67_108_864,
      stdio: [
        "ignore",
        "pipe",
        "ignore",
      ],
    },
  );
}

function gitWithInput(
  argumentsList,
  input,
  encoding,
  maxBuffer,
) {
  return execFileSync(
    "git",
    argumentsList,
    {
      cwd: projectRoot,
      encoding,
      input,
      maxBuffer,
      stdio: [
        "pipe",
        "pipe",
        "ignore",
      ],
    },
  );
}

function parseNullSeparatedFileNames(
  output,
) {
  return output
    .split("\0")
    .filter(Boolean);
}

export function buildWorkingFileInventory({
  trackedFiles,
  untrackedFiles,
}) {
  const workingFiles = [
    ...new Set([
      ...trackedFiles,
      ...untrackedFiles,
    ]),
  ].sort();

  return Object.freeze({
    trackedFileCount:
      trackedFiles.length,
    untrackedFileCount:
      untrackedFiles.length,
    workingFiles: Object.freeze(
      workingFiles,
    ),
  });
}

function listWorkingFileInventory() {
  const trackedFiles =
    parseNullSeparatedFileNames(
      git([
        "ls-files",
        "-z",
      ]),
    );
  const untrackedFiles =
    parseNullSeparatedFileNames(
      git([
        "ls-files",
        "--others",
        "--exclude-standard",
        "-z",
      ]),
    );

  return buildWorkingFileInventory({
    trackedFiles,
    untrackedFiles,
  });
}

function listHistoricalFileNames() {
  return parseNullSeparatedFileNames(
    git([
      "log",
      "--all",
      "--name-only",
      "--format=",
      "--no-renames",
      "-z",
    ]),
  );
}

function listHistoricalBlobIds() {
  const objectIds = [
    ...new Set(
      git([
        "rev-list",
        "--objects",
        "--all",
      ])
        .split("\n")
        .filter(Boolean)
        .map((line) =>
          line.split(" ", 1)[0]
        ),
    ),
  ];
  const metadata = gitWithInput(
    [
      "cat-file",
      "--batch-check=%(objectname) %(objecttype) %(objectsize)",
    ],
    `${objectIds.join("\n")}\n`,
    "utf8",
    67_108_864,
  );

  return metadata
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split(" "))
    .filter(([, type, size]) =>
      type === "blob" &&
      Number.isSafeInteger(Number(size)) &&
      Number(size) <= maximumScannedFileBytes
    )
    .map(([objectId]) => objectId);
}

function inspectHistoricalBlobBatch(
  objectIds,
) {
  const output = gitWithInput(
    [
      "cat-file",
      "--batch",
    ],
    `${objectIds.join("\n")}\n`,
    null,
    objectIds.length *
      (maximumScannedFileBytes + 128),
  );
  let offset = 0;

  for (const expectedObjectId of objectIds) {
    const headerEnd = output.indexOf(10, offset);
    if (headerEnd === -1) {
      throw new Error(
        "Historical blob header is truncated.",
      );
    }
    const header = output
      .subarray(offset, headerEnd)
      .toString("utf8")
      .split(" ");
    const [objectId, type, sizeText] = header;
    const size = Number(sizeText);
    if (
      header.length !== 3 ||
      objectId !== expectedObjectId ||
      type !== "blob" ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > maximumScannedFileBytes
    ) {
      throw new Error(
        "Historical blob header is invalid.",
      );
    }
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (
      contentEnd >= output.length ||
      output[contentEnd] !== 10
    ) {
      throw new Error(
        "Historical blob content is truncated.",
      );
    }
    const content = output.subarray(
      contentStart,
      contentEnd,
    );
    offset = contentEnd + 1;
    if (
      !content.includes(0) &&
      inspectSecretText(
        content.toString("utf8"),
      ).length > 0
    ) {
      return true;
    }
  }

  if (offset !== output.length) {
    throw new Error(
      "Historical blob batch has trailing bytes.",
    );
  }
  return false;
}

function inspectHistory() {
  const findings = [];

  if (
    listHistoricalFileNames().some(
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
  }

  const objectIds = listHistoricalBlobIds();
  for (
    let index = 0;
    index < objectIds.length;
    index += historicalBlobBatchSize
  ) {
    if (
      inspectHistoricalBlobBatch(
        objectIds.slice(
          index,
          index + historicalBlobBatchSize,
        ),
      )
    ) {
      findings.push(
        finding(
          "SECRET_CONTENT_IN_HISTORY",
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
  const inventory =
    listWorkingFileInventory();

  for (
    const fileName of
      inventory.workingFiles
  ) {
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
    workingFileCount:
      inventory.workingFiles.length,
    trackedFileCount:
      inventory.trackedFileCount,
    untrackedFileCount:
      inventory.untrackedFileCount,
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
      `Secret hygiene: PASS (${report.workingFileCount} working files; ${report.trackedFileCount} tracked, ${report.untrackedFileCount} untracked${
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
