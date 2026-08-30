import {
  execFileSync,
} from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import {
  relative,
  resolve,
} from "node:path";
import {
  inspectSecretHygiene,
} from "./verify-secret-hygiene.mjs";
import {
  assertRfc3339,
  canonicalJson,
  createEnvelope,
  domainDigest,
  git,
  jsonBytes,
  outputRegistryPath,
  parseNullSeparated,
  projectRoot,
  rawSetObservation,
  readOutputRegistry,
  repoAbsolutePath,
  sha256,
  toWorkspaceLabel,
  workspaceContainerRoot,
} from "./planning-discovery-cutoff-lib.mjs";

const toolchainPaths = Object.freeze([
  "scripts/planning-discovery-cutoff-lib.mjs",
  "scripts/create-planning-discovery-cutoff.mjs",
  "scripts/verify-planning-discovery-cutoff.mjs",
  "docs/planning/discovery-cutoff-output-path-registry-v1-2026-08-30.json",
  "docs/planning/discovery-cutoff-tool-contract-2026-08-30.md",
]);

function parseArguments() {
  const argumentsList = process.argv.slice(2);
  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== "--observed-at"
  ) {
    throw new Error(
      "usage: node scripts/create-planning-discovery-cutoff.mjs --observed-at YYYY-MM-DDTHH:mm:ssZ",
    );
  }
  return Object.freeze({
    observedAt: assertRfc3339(
      argumentsList[1],
      "observedAt",
    ),
  });
}

async function assertAbsent(
  relativePath,
) {
  try {
    await access(repoAbsolutePath(relativePath));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }
  throw new Error(
    `declared output already exists: ${relativePath}`,
  );
}

function textGit(
  argumentsList,
  cwd = projectRoot,
) {
  return git(argumentsList, cwd)
    .toString("utf8")
    .trim();
}

function lineObservation(buffer) {
  const lines = buffer
    .toString("utf8")
    .split("\n")
    .filter(Boolean);
  return Object.freeze({
    entryCount: lines.length,
    rawSha256: sha256(buffer),
    lines,
  });
}

function parseRemoteRefs(buffer) {
  return buffer
    .toString("utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [commit, ref] = line.split("\t");
      if (
        !/^[0-9a-f]{40}$/.test(commit) ||
        !/^refs\/(?:heads|tags)\//.test(ref)
      ) {
        throw new Error(
          "remote ref output contains an invalid row",
        );
      }
      return Object.freeze({ commit, ref });
    });
}

function parseDefaultBranch(buffer) {
  const firstLine = buffer
    .toString("utf8")
    .split("\n")
    .find(Boolean);
  const match = firstLine?.match(
    /^ref: refs\/heads\/([^\t]+)\tHEAD$/,
  );
  if (!match) {
    throw new Error(
      "remote default branch symref is unavailable",
    );
  }
  return match[1];
}

function collectNestedRepositories() {
  const output = execFileSync(
    "find",
    [
      workspaceContainerRoot,
      "-name",
      ".git",
      "-type",
      "d",
      "-prune",
      "-print0",
    ],
    {
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const labels = parseNullSeparated(output)
    .map((path) => toWorkspaceLabel(path))
    .sort();
  return Object.freeze({
    entryCount: labels.length,
    labels,
    labelSetSha256: domainDigest(
      "CONNECT.NESTED-GIT-LABELS.V1",
      labels,
    ),
  });
}

function collectSymlinkObservation() {
  const output = execFileSync(
    "find",
    [
      projectRoot,
      "-path",
      resolve(projectRoot, ".git"),
      "-prune",
      "-o",
      "-type",
      "l",
      "-print0",
    ],
    {
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const relativePaths = parseNullSeparated(output)
    .map((path) => relative(projectRoot, path))
    .sort();
  return Object.freeze({
    entryCount: relativePaths.length,
    pathSetSha256: domainDigest(
      "CONNECT.SYMLINK-PATHS.V1",
      relativePaths,
    ),
  });
}

async function collectToolchain() {
  const rows = [];
  for (const path of toolchainPaths) {
    const bytes = await readFile(
      repoAbsolutePath(path),
    );
    rows.push(Object.freeze({
      path,
      byteLength: bytes.byteLength,
      sha256: sha256(bytes),
    }));
  }
  return Object.freeze(rows);
}

function sourceCandidatePayload({
  observedAt,
  observedHead,
}) {
  return Object.freeze({
    schema:
      "CONNECT-DISCOVERY-SOURCE-CANDIDATES-PAYLOAD-V1",
    observedAt,
    observedHead,
    authority:
      "CANDIDATE-NOT-ADMITTED-NOT-ACCEPTED",
    candidates: Object.freeze([
      {
        sourceId: "SRC-USER-DIRECTIVES",
        sourceClass: "USER-DIRECTIVE",
        custody: "PUBLIC-PROJECTION-PARTIAL",
        status: "DISCOVERED-NOT-ADMITTED",
      },
      {
        sourceId: "SRC-SPEC-DETAILED-TEXT",
        sourceClass: "PROVIDED-SPECIFICATION",
        custody: "EXTERNAL-PRIVATE-CANDIDATE",
        status: "BYTE-RECHECK-AND-RIGHTS-REVIEW-REQUIRED",
      },
      {
        sourceId: "SRC-SPEC-WHATSAPP-PDF",
        sourceClass: "PROVIDED-SPECIFICATION",
        custody: "EXTERNAL-PRIVATE-CANDIDATE",
        status: "BYTE-RECHECK-AND-RIGHTS-REVIEW-REQUIRED",
      },
      {
        sourceId: "SRC-OFFICIAL-EXTERNAL",
        sourceClass: "OFFICIAL-EXTERNAL",
        custody: "PUBLIC-URL-PLUS-CAPTURE-REQUIRED",
        status: "DISCOVERY-INCOMPLETE",
      },
      {
        sourceId: "SRC-REPOSITORY-HEAD",
        sourceClass: "OBSERVED-SYSTEM",
        custody: "PUBLIC-SAFE-WORKING-SET",
        status: "OBSERVED-NOT-ADMITTED",
      },
      {
        sourceId: "SRC-PLANNING-DERIVATIVES",
        sourceClass: "DERIVED-PLANNING",
        custody: "PUBLIC-SAFE-SUBJECT-TO-SCANS",
        status: "DISCOVERED-NOT-ADMITTED",
      },
      {
        sourceId: "SRC-IGNORED-FRONTIER",
        sourceClass: "IMPLEMENTATION-BYPRODUCT-OR-PRIVATE",
        custody: "PROHIBITED-FROM-PUBLIC-BY-DEFAULT",
        status: "ROOT-ONLY-NOT-ADMITTED",
      },
    ]),
    missingSourceTerminals: Object.freeze([
      "PRIVATE-SOURCE-CUSTODY-ABSENT-BLOCKING",
      "OFFICIAL-SOURCE-CAPTURE-INCOMPLETE-BLOCKING",
      "GITHUB-API-SURFACES-UNOBSERVED-BLOCKING",
    ]),
  });
}

async function main() {
  const { observedAt } = parseArguments();
  const registry = await readOutputRegistry();
  for (const path of registry.outputPaths) {
    await assertAbsent(path);
  }
  await assertAbsent(registry.outputDirectory);

  const worktreeStatus = git([
    "status",
    "--porcelain=v1",
    "-z",
  ]);
  if (worktreeStatus.byteLength !== 0) {
    throw new Error(
      "product repository must be clean before cutoff generation",
    );
  }

  const secretReport =
    await inspectSecretHygiene();
  if (secretReport.status !== "passed") {
    throw new Error(
      "working-file secret hygiene did not pass",
    );
  }

  const head = textGit(["rev-parse", "HEAD"]);
  const branch = textGit([
    "branch",
    "--show-current",
  ]);
  if (
    !/^[0-9a-f]{40}$/.test(head) ||
    branch.length === 0
  ) {
    throw new Error("Git identity is incomplete");
  }

  const headTree = git([
    "ls-tree",
    "-r",
    "-z",
    "--full-tree",
    "HEAD",
  ]);
  const index = git([
    "ls-files",
    "--stage",
    "-z",
  ]);
  const untracked = git([
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
  ]);
  const ignored = git([
    "ls-files",
    "--others",
    "--ignored",
    "--exclude-standard",
    "-z",
  ]);
  const outerStatus = git(
    ["status", "--porcelain=v1", "-z"],
    workspaceContainerRoot,
  );
  const remoteRefBytes = git([
    "ls-remote",
    "--heads",
    "--tags",
    "origin",
  ]);
  const remoteSymrefBytes = git([
    "ls-remote",
    "--symref",
    "origin",
    "HEAD",
  ]);
  const remoteRefs = parseRemoteRefs(
    remoteRefBytes,
  );
  const remoteRefObservation =
    lineObservation(remoteRefBytes);
  const defaultBranch = parseDefaultBranch(
    remoteSymrefBytes,
  );
  const defaultRef = remoteRefs.find(
    ({ ref }) =>
      ref === `refs/heads/${defaultBranch}`,
  );
  if (!defaultRef) {
    throw new Error(
      "default remote branch is absent from branch snapshot",
    );
  }

  const indexRecords =
    parseNullSeparated(index);
  const trackedSymlinkCount =
    indexRecords.filter((record) =>
      record.startsWith("120000 "),
    ).length;
  const submoduleCount =
    indexRecords.filter((record) =>
      record.startsWith("160000 "),
    ).length;

  const receiptPayload = Object.freeze({
    schema:
      "CONNECT-DISCOVERY-CUTOFF-RECEIPT-PAYLOAD-V1",
    artifactId:
      "CONNECT-DISCOVERY-CUTOFF-CANDIDATE-V1-2026-08-30",
    status:
      "CANDIDATE-NOT-ACCEPTED-NOT-SOURCE-UNIVERSE",
    owner: "Tal",
    observedAt,
    clockAuthority: "LOCAL-CLOCK-UNTRUSTED",
    repositoryVisibilityInvariant: "PUBLIC",
    developmentFreeze: "ACTIVE",
    gate29: "BLOCKED",
    declaredOutputRegistry: Object.freeze({
      path: outputRegistryPath,
      outputDirectory:
        registry.outputDirectory,
      outputPaths: registry.outputPaths,
      allOutputsAbsentAtCutoff: true,
    }),
    productRepository: Object.freeze({
      identity: "talstilkol/connect",
      branch,
      observedHead: head,
      cleanAtCutoff: true,
      headTree: rawSetObservation(headTree),
      index: rawSetObservation(index),
      worktreeStatus:
        rawSetObservation(worktreeStatus),
      untracked: rawSetObservation(untracked),
      ignored: rawSetObservation(ignored),
      trackedSymlinkCount,
      submoduleCount,
      allFilesystemSymlinks:
        collectSymlinkObservation(),
      workingSecretHygiene: Object.freeze({
        status: secretReport.status,
        workingFileCount:
          secretReport.workingFileCount,
        trackedFileCount:
          secretReport.trackedFileCount,
        untrackedFileCount:
          secretReport.untrackedFileCount,
        historyIncluded: false,
      }),
    }),
    workspaceContainer: Object.freeze({
      authority: "DISCOVERY-CONTAINER-NOT-PUBLIC-GIT-AUTHORITY",
      status: rawSetObservation(outerStatus),
      nestedGitIdentities:
        collectNestedRepositories(),
    }),
    remoteObservation: Object.freeze({
      transport: "GIT-LS-REMOTE-READ-ONLY",
      remote: "origin",
      defaultBranch,
      defaultBranchHead: defaultRef.commit,
      refs: remoteRefs,
      refSet: Object.freeze({
        entryCount:
          remoteRefObservation.entryCount,
        rawSha256:
          remoteRefObservation.rawSha256,
      }),
      limitations: Object.freeze([
        "PULL-REQUEST-REFS-NOT-OBSERVED",
        "GITHUB-RULESETS-NOT-OBSERVED",
        "GITHUB-SECURITY-SETTINGS-NOT-OBSERVED",
        "GITHUB-API-PAGINATION-NOT-OBSERVED",
      ]),
    }),
    toolchain: await collectToolchain(),
    blockers: Object.freeze([
      "TRUSTED-TIME-ABSENT",
      "GITHUB-API-AND-PR-COVERAGE-ABSENT",
      "PRIVATE-SOURCE-CUSTODY-AND-RIGHTS-UNAPPROVED",
      "OFFICIAL-SOURCE-CAPTURE-FRONTIER-INCOMPLETE",
      "B0-AND-REVIEW-PROTOCOL-NOT-ACCEPTED",
      "INDEPENDENT-REVIEW-ABSENT",
    ]),
  });

  const candidatesPayload =
    sourceCandidatePayload({
      observedAt,
      observedHead: head,
    });
  const receiptEnvelope = createEnvelope({
    schema:
      "CONNECT-DISCOVERY-CUTOFF-RECEIPT-ENVELOPE-V1",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-RECEIPT.V1",
    payload: receiptPayload,
  });
  const candidatesEnvelope = createEnvelope({
    schema:
      "CONNECT-DISCOVERY-SOURCE-CANDIDATES-ENVELOPE-V1",
    domain:
      "CONNECT.DISCOVERY-SOURCE-CANDIDATES.V1",
    payload: candidatesPayload,
  });
  const receiptBytes = jsonBytes(
    receiptEnvelope,
  );
  const candidatesBytes = jsonBytes(
    candidatesEnvelope,
  );
  const receiptPath = registry.outputPaths.find(
    (path) => path.endsWith("/receipt.json"),
  );
  const candidatesPath =
    registry.outputPaths.find((path) =>
      path.endsWith("/source-candidates.json"),
    );
  const manifestPath = registry.outputPaths.find(
    (path) => path.endsWith("/manifest.json"),
  );
  if (
    !receiptPath ||
    !candidatesPath ||
    !manifestPath
  ) {
    throw new Error(
      "output registry is missing package member paths",
    );
  }

  await mkdir(
    repoAbsolutePath(registry.outputDirectory),
    { recursive: false },
  );
  await writeFile(
    repoAbsolutePath(receiptPath),
    receiptBytes,
    { flag: "wx" },
  );
  await writeFile(
    repoAbsolutePath(candidatesPath),
    candidatesBytes,
    { flag: "wx" },
  );

  const members = Object.freeze([
    {
      path: receiptPath,
      byteLength: receiptBytes.byteLength,
      sha256: sha256(receiptBytes),
      payloadSha256:
        receiptEnvelope.payloadSha256,
    },
    {
      path: candidatesPath,
      byteLength:
        candidatesBytes.byteLength,
      sha256: sha256(candidatesBytes),
      payloadSha256:
        candidatesEnvelope.payloadSha256,
    },
  ].sort((left, right) =>
    left.path.localeCompare(right.path),
  ));
  const manifestPayload = Object.freeze({
    schema:
      "CONNECT-DISCOVERY-CUTOFF-MANIFEST-PAYLOAD-V1",
    observedHead: head,
    outputRegistry: Object.freeze({
      path: outputRegistryPath,
      sha256: sha256(
        await readFile(
          repoAbsolutePath(outputRegistryPath),
        ),
      ),
    }),
    members,
    packageContentRootSha256: domainDigest(
      "CONNECT.DISCOVERY-CUTOFF-PACKAGE-CONTENT.V1",
      members,
    ),
    selfMembership: false,
    verificationReportMembership: false,
  });
  const manifestEnvelope = createEnvelope({
    schema:
      "CONNECT-DISCOVERY-CUTOFF-MANIFEST-ENVELOPE-V1",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-MANIFEST.V1",
    payload: manifestPayload,
  });
  await writeFile(
    repoAbsolutePath(manifestPath),
    jsonBytes(manifestEnvelope),
    { flag: "wx" },
  );

  console.log(canonicalJson({
    status: "CREATED-CANDIDATE-NOT-ACCEPTED",
    observedHead: head,
    packageContentRootSha256:
      manifestPayload.packageContentRootSha256,
    outputDirectory:
      registry.outputDirectory,
  }));
}

await main();
