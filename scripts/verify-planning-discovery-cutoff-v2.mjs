import {
  readFile,
} from "node:fs/promises";
import {
  inspectSecretText,
} from "./verify-secret-hygiene.mjs";
import {
  assertExactKeys,
  assertRfc3339,
  assertSafeRelativePath,
  createEnvelope,
  domainDigest,
  git,
  jsonBytes,
  outputRegistryPath,
  parseNullSeparated,
  readOutputRegistry,
  repoAbsolutePath,
  sha256,
  verifyEnvelope,
} from "./planning-discovery-cutoff-v2-lib.mjs";

const expectedToolchainPaths = Object.freeze([
  "scripts/planning-discovery-cutoff-v2-lib.mjs",
  "scripts/create-planning-discovery-cutoff-v2.mjs",
  "scripts/verify-planning-discovery-cutoff-v2.mjs",
  "docs/planning/discovery-cutoff-output-path-registry-v2-2026-08-30.json",
  "docs/planning/source-universe-v4-output-path-registry-v1-2026-08-30.json",
  "docs/planning/discovery-cutoff-v2-tool-contract-2026-08-30.md",
]);

function emitAddFilePatch(
  path,
  bytes,
) {
  const lines = [
    "*** Begin Patch",
    `*** Add File: ${path}`,
  ];
  const text = bytes.toString("utf8");
  const contentLines = text.endsWith("\n")
    ? text.slice(0, -1).split("\n")
    : text.split("\n");
  contentLines.forEach((line) => {
    lines.push(`+${line}`);
  });
  lines.push("*** End Patch");
  return lines.join("\n");
}

function parseArguments() {
  const argumentsList = process.argv.slice(2);
  if (
    argumentsList.length === 1 &&
    argumentsList[0] === "--check-existing"
  ) {
    return Object.freeze({
      mode: "check-existing",
      verifiedAt: null,
    });
  }
  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== "--verified-at"
  ) {
    throw new Error(
      "usage: node scripts/verify-planning-discovery-cutoff-v2.mjs --verified-at YYYY-MM-DDTHH:mm:ssZ",
    );
  }
  return Object.freeze({
    mode: "create-report",
    verifiedAt: assertRfc3339(
      argumentsList[1],
      "verifiedAt",
    ),
  });
}

async function readJson(relativePath) {
  const bytes = await readFile(
    repoAbsolutePath(relativePath),
  );
  return Object.freeze({
    bytes,
    value: JSON.parse(bytes.toString("utf8")),
  });
}

function assertNoPrivateLocator(value) {
  const serialized = JSON.stringify(value);
  if (
    serialized.includes("/Users/") ||
    serialized.includes("file:") ||
    /[A-Za-z]:\\/.test(serialized)
  ) {
    throw new Error(
      "public package contains a private or absolute locator",
    );
  }
}

function assertAllowedWorktreeStatus(
  outputDirectory,
  allowDeclaredOutputChanges,
) {
  const records = parseNullSeparated(
    git([
      "status",
      "--porcelain=v1",
      "-z",
    ]),
  );
  if (
    !allowDeclaredOutputChanges &&
    records.length > 0
  ) {
    throw new Error(
      "existing package verification requires a clean worktree",
    );
  }
  const unexpected = records.filter((record) => {
    const path = record.slice(3);
    return !path.startsWith(
      `${outputDirectory}/`,
    ) && path !== `${outputDirectory}/`;
  });
  if (unexpected.length > 0) {
    throw new Error(
      "worktree changed outside declared output directory",
    );
  }
}

function assertCommitExists(commit) {
  try {
    git([
      "cat-file",
      "-e",
      `${commit}^{commit}`,
    ]);
  } catch {
    throw new Error(
      "observed input commit is unavailable",
    );
  }
}

function verifyToolchainAtObservedHead(
  receiptPayload,
) {
  if (
    !Array.isArray(receiptPayload.toolchain) ||
    receiptPayload.toolchain.length !==
      expectedToolchainPaths.length
  ) {
    throw new Error(
      "receipt toolchain is missing",
    );
  }
  for (const row of receiptPayload.toolchain) {
    assertExactKeys(
      row,
      ["path", "byteLength", "sha256"],
      "receipt toolchain member",
    );
    assertSafeRelativePath(row.path);
    const bytes = git([
      "show",
      `${receiptPayload.productRepository.observedHead}:${row.path}`,
    ]);
    if (
      bytes.byteLength !== row.byteLength ||
      sha256(bytes) !== row.sha256
    ) {
      throw new Error(
        "receipt toolchain does not match observed commit",
      );
    }
  }
  const actualPaths =
    receiptPayload.toolchain.map(
      ({ path }) => path,
    );
  assertSameStringArray(
    actualPaths,
    expectedToolchainPaths,
    "receipt toolchain paths",
  );
}

function assertSameStringArray(
  actual,
  expected,
  label,
) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    actual.some(
      (value, index) =>
        value !== expected[index],
    )
  ) {
    throw new Error(`${label} does not match its registry`);
  }
}

function verifyDeclaredOutputRegistries({
  receiptPayload,
  registry,
  observedHead,
}) {
  const declared =
    receiptPayload.declaredOutputRegistry;
  assertExactKeys(
    declared,
    [
      "path",
      "sha256",
      "outputDirectory",
      "outputPaths",
      "allOutputsAbsentAtCutoff",
      "successorOutputRegistry",
    ],
    "declared cutoff output registry",
  );
  if (
    declared.path !== outputRegistryPath ||
    declared.sha256 !==
      registry.registrySha256 ||
    declared.outputDirectory !==
      registry.outputDirectory ||
    declared.allOutputsAbsentAtCutoff !== true
  ) {
    throw new Error(
      "cutoff output registry binding is invalid",
    );
  }
  assertSameStringArray(
    declared.outputPaths,
    registry.outputPaths,
    "cutoff output paths",
  );

  const successor =
    declared.successorOutputRegistry;
  assertExactKeys(
    successor,
    [
      "path",
      "sha256",
      "artifactId",
      "outputDirectory",
      "packageMemberPaths",
      "reviewAndAcceptancePaths",
      "outputPaths",
      "allOutputsAbsentAtCutoff",
    ],
    "declared successor output registry",
  );
  const expected =
    registry.successorOutputRegistry;
  if (
    successor.path !== expected.registryPath ||
    successor.sha256 !==
      expected.registrySha256 ||
    successor.artifactId !==
      expected.artifactId ||
    successor.outputDirectory !==
      expected.outputDirectory ||
    successor.allOutputsAbsentAtCutoff !== true
  ) {
    throw new Error(
      "successor output registry binding is invalid",
    );
  }
  assertSameStringArray(
    successor.packageMemberPaths,
    expected.packageMemberPaths,
    "successor package member paths",
  );
  assertSameStringArray(
    successor.reviewAndAcceptancePaths,
    expected.reviewAndAcceptancePaths,
    "successor review paths",
  );
  assertSameStringArray(
    successor.outputPaths,
    expected.outputPaths,
    "successor output paths",
  );

  const trackedPaths = new Set(
    parseNullSeparated(
      git([
        "ls-tree",
        "-r",
        "-z",
        "--name-only",
        observedHead,
      ]),
    ),
  );
  const declaredPaths = [
    ...registry.outputPaths,
    ...expected.outputPaths,
  ];
  if (
    declaredPaths.some((path) =>
      trackedPaths.has(path),
    )
  ) {
    throw new Error(
      "a declared output existed in the observed Git tree",
    );
  }
}

function verifyCapturedShapes({
  receiptPayload,
  candidatesPayload,
  manifestPayload,
}) {
  if (
    receiptPayload.artifactId !==
      "CONNECT-DISCOVERY-CUTOFF-CANDIDATE-V2-2026-08-30" ||
    receiptPayload.status !==
      "CANDIDATE-NOT-ACCEPTED-NOT-SOURCE-UNIVERSE" ||
    receiptPayload.clockAuthority !==
      "LOCAL-CLOCK-UNTRUSTED"
  ) {
    throw new Error(
      "receipt authority labels are invalid",
    );
  }
  assertRfc3339(
    receiptPayload.observedAt,
    "receipt observedAt",
  );
  assertExactKeys(
    receiptPayload.productRepository,
    [
      "identity",
      "branch",
      "observedHead",
      "cleanAtCutoff",
      "headTree",
      "index",
      "worktreeStatus",
      "untracked",
      "ignored",
      "trackedSymlinkCount",
      "submoduleCount",
      "allFilesystemSymlinks",
      "workingSecretHygiene",
    ],
    "product repository observation",
  );
  const product =
    receiptPayload.productRepository;
  if (
    product.identity !== "talstilkol/connect" ||
    typeof product.branch !== "string" ||
    product.branch.length === 0 ||
    !/^[0-9a-f]{40}$/.test(
      product.observedHead,
    ) ||
    product.cleanAtCutoff !== true ||
    product.worktreeStatus.entryCount !== 0 ||
    product.untracked.entryCount !== 0 ||
    product.workingSecretHygiene.status !==
      "passed" ||
    product.workingSecretHygiene.historyIncluded !==
      false
  ) {
    throw new Error(
      "product repository cutoff state is invalid",
    );
  }

  assertExactKeys(
    candidatesPayload,
    [
      "schema",
      "observedAt",
      "observedHead",
      "authority",
      "candidates",
      "missingSourceTerminals",
    ],
    "source candidates payload",
  );
  if (
    candidatesPayload.schema !==
      "CONNECT-DISCOVERY-SOURCE-CANDIDATES-PAYLOAD-V2" ||
    candidatesPayload.authority !==
      "CANDIDATE-NOT-ADMITTED-NOT-ACCEPTED" ||
    candidatesPayload.observedAt !==
      receiptPayload.observedAt ||
    !Array.isArray(candidatesPayload.candidates) ||
    candidatesPayload.candidates.length !== 7 ||
    new Set(
      candidatesPayload.candidates.map(
        ({ sourceId }) => sourceId,
      ),
    ).size !== 7 ||
    !Array.isArray(
      candidatesPayload.missingSourceTerminals,
    ) ||
    candidatesPayload.missingSourceTerminals.length !== 3
  ) {
    throw new Error(
      "source candidates denominator is invalid",
    );
  }
  candidatesPayload.candidates.forEach(
    (candidate, index) => {
      assertExactKeys(
        candidate,
        [
          "sourceId",
          "sourceClass",
          "custody",
          "status",
        ],
        `source candidate ${index + 1}`,
      );
    },
  );

  assertExactKeys(
    manifestPayload,
    [
      "schema",
      "observedHead",
      "outputRegistry",
      "members",
      "packageContentRootSha256",
      "selfMembership",
      "verificationReportMembership",
    ],
    "manifest payload",
  );
  if (
    manifestPayload.schema !==
      "CONNECT-DISCOVERY-CUTOFF-MANIFEST-PAYLOAD-V2"
  ) {
    throw new Error(
      "manifest payload schema is invalid",
    );
  }
}

function verifyExistingReport({
  reportEnvelope,
  observedHead,
  packageContentRootSha256,
}) {
  verifyEnvelope({
    envelope: reportEnvelope,
    schema:
      "CONNECT-DISCOVERY-CUTOFF-VERIFICATION-REPORT-ENVELOPE-V2",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-VERIFICATION-REPORT.V2",
  });
  assertExactKeys(
    reportEnvelope.payload,
    [
      "schema",
      "status",
      "owner",
      "verifiedAt",
      "observedHead",
      "packageContentRootSha256",
      "checks",
      "limitations",
    ],
    "verification report payload",
  );
  if (
    reportEnvelope.payload.schema !==
      "CONNECT-DISCOVERY-CUTOFF-VERIFICATION-REPORT-PAYLOAD-V2" ||
    reportEnvelope.payload.status !==
      "PASS-CANDIDATE-NOT-ACCEPTED" ||
    reportEnvelope.payload.owner !== "Tal" ||
    reportEnvelope.payload.observedHead !==
      observedHead ||
    reportEnvelope.payload
      .packageContentRootSha256 !==
      packageContentRootSha256 ||
    !Array.isArray(
      reportEnvelope.payload.checks,
    ) ||
    !Array.isArray(
      reportEnvelope.payload.limitations,
    )
  ) {
    throw new Error(
      "existing verification report is inconsistent",
    );
  }
  assertRfc3339(
    reportEnvelope.payload.verifiedAt,
    "existing report verifiedAt",
  );
}

function assertNegativeMutations(
  receiptEnvelope,
) {
  const mutation = structuredClone(
    receiptEnvelope,
  );
  const originalHead =
    mutation.payload.productRepository
      .observedHead;
  const replacementPrefix =
    originalHead[0] === "0" ? "1" : "0";
  mutation.payload.productRepository.observedHead =
    `${replacementPrefix}${originalHead.slice(1)}`;
  let digestRejected = false;
  try {
    verifyEnvelope({
      envelope: mutation,
      schema:
        "CONNECT-DISCOVERY-CUTOFF-RECEIPT-ENVELOPE-V2",
      domain:
        "CONNECT.DISCOVERY-CUTOFF-RECEIPT.V2",
    });
  } catch {
    digestRejected = true;
  }
  if (!digestRejected) {
    throw new Error(
      "receipt mutation was not rejected",
    );
  }

  for (const unsafePath of [
    "../outside",
    "/absolute/outside",
    "file:outside",
  ]) {
    let pathRejected = false;
    try {
      assertSafeRelativePath(unsafePath);
    } catch {
      pathRejected = true;
    }
    if (!pathRejected) {
      throw new Error(
        "unsafe path mutation was not rejected",
      );
    }
  }

  const unknownFieldMutation = {
    ...receiptEnvelope,
    unexpected: true,
  };
  let unknownFieldRejected = false;
  try {
    verifyEnvelope({
      envelope: unknownFieldMutation,
      schema:
        "CONNECT-DISCOVERY-CUTOFF-RECEIPT-ENVELOPE-V2",
      domain:
        "CONNECT.DISCOVERY-CUTOFF-RECEIPT.V2",
    });
  } catch {
    unknownFieldRejected = true;
  }
  if (!unknownFieldRejected) {
    throw new Error(
      "unknown envelope field was not rejected",
    );
  }
}

async function main() {
  const { mode, verifiedAt } = parseArguments();
  const registry = await readOutputRegistry();
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
  const reportPath = registry.outputPaths.find(
    (path) =>
      path.endsWith("/verification-report.json"),
  );
  if (
    !receiptPath ||
    !candidatesPath ||
    !manifestPath ||
    !reportPath
  ) {
    throw new Error(
      "output registry is incomplete",
    );
  }

  assertAllowedWorktreeStatus(
    registry.outputDirectory,
    mode === "create-report",
  );
  const currentHead = git([
    "rev-parse",
    "HEAD",
  ]).toString("utf8").trim();
  const receipt = await readJson(receiptPath);
  const candidates = await readJson(
    candidatesPath,
  );
  const manifest = await readJson(manifestPath);

  verifyEnvelope({
    envelope: receipt.value,
    schema:
      "CONNECT-DISCOVERY-CUTOFF-RECEIPT-ENVELOPE-V2",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-RECEIPT.V2",
  });
  verifyEnvelope({
    envelope: candidates.value,
    schema:
      "CONNECT-DISCOVERY-SOURCE-CANDIDATES-ENVELOPE-V2",
    domain:
      "CONNECT.DISCOVERY-SOURCE-CANDIDATES.V2",
  });
  verifyEnvelope({
    envelope: manifest.value,
    schema:
      "CONNECT-DISCOVERY-CUTOFF-MANIFEST-ENVELOPE-V2",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-MANIFEST.V2",
  });

  assertExactKeys(
    receipt.value.payload,
    [
      "schema",
      "artifactId",
      "status",
      "owner",
      "observedAt",
      "clockAuthority",
      "repositoryVisibilityInvariant",
      "developmentFreeze",
      "gate29",
      "declaredOutputRegistry",
      "productRepository",
      "workspaceContainer",
      "remoteObservation",
      "toolchain",
      "blockers",
    ],
    "receipt payload",
  );
  if (
    receipt.value.payload.schema !==
      "CONNECT-DISCOVERY-CUTOFF-RECEIPT-PAYLOAD-V2" ||
    receipt.value.payload.owner !== "Tal" ||
    receipt.value.payload.repositoryVisibilityInvariant !==
      "PUBLIC" ||
    receipt.value.payload.developmentFreeze !==
      "ACTIVE" ||
    receipt.value.payload.gate29 !== "BLOCKED"
  ) {
    throw new Error(
      "receipt invariants are invalid",
    );
  }
  verifyCapturedShapes({
    receiptPayload: receipt.value.payload,
    candidatesPayload:
      candidates.value.payload,
    manifestPayload: manifest.value.payload,
  });
  const observedHead =
    receipt.value.payload.productRepository
      .observedHead;
  assertCommitExists(observedHead);
  if (
    manifest.value.payload.observedHead !==
      observedHead ||
    candidates.value.payload.observedHead !==
      observedHead ||
    (
      mode === "create-report" &&
      observedHead !== currentHead
    )
  ) {
    throw new Error(
      "candidate is not bound to the current clean input commit",
    );
  }
  verifyToolchainAtObservedHead(
    receipt.value.payload,
  );
  verifyDeclaredOutputRegistries({
    receiptPayload: receipt.value.payload,
    registry,
    observedHead,
  });
  if (
    receipt.value.payload.declaredOutputRegistry
      .allOutputsAbsentAtCutoff !== true ||
    manifest.value.payload.selfMembership !== false ||
    manifest.value.payload
      .verificationReportMembership !== false
  ) {
    throw new Error(
      "self-membership controls are invalid",
    );
  }

  const expectedMembers = [
    {
      path: receiptPath,
      bytes: receipt.bytes,
      payloadSha256:
        receipt.value.payloadSha256,
    },
    {
      path: candidatesPath,
      bytes: candidates.bytes,
      payloadSha256:
        candidates.value.payloadSha256,
    },
  ].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  const actualMembers =
    manifest.value.payload.members;
  if (
    !Array.isArray(actualMembers) ||
    actualMembers.length !==
      expectedMembers.length
  ) {
    throw new Error(
      "manifest member count is invalid",
    );
  }
  expectedMembers.forEach((expected, index) => {
    const actual = actualMembers[index];
    assertExactKeys(
      actual,
      [
        "path",
        "byteLength",
        "sha256",
        "payloadSha256",
      ],
      `manifest member ${index + 1}`,
    );
    if (
      actual.path !== expected.path ||
      actual.byteLength !==
        expected.bytes.byteLength ||
      actual.sha256 !== sha256(expected.bytes) ||
      actual.payloadSha256 !==
        expected.payloadSha256
    ) {
      throw new Error(
        "manifest member does not match file bytes",
      );
    }
  });
  const expectedPackageRoot = domainDigest(
    "CONNECT.DISCOVERY-CUTOFF-PACKAGE-CONTENT.V2",
    actualMembers,
  );
  if (
    manifest.value.payload
      .packageContentRootSha256 !==
    expectedPackageRoot
  ) {
    throw new Error(
      "package content root mismatch",
    );
  }
  const registryBytes = await readFile(
    repoAbsolutePath(outputRegistryPath),
  );
  const manifestRegistry =
    manifest.value.payload.outputRegistry;
  assertExactKeys(
    manifestRegistry,
    [
      "path",
      "sha256",
      "successorPath",
      "successorSha256",
    ],
    "manifest output registry binding",
  );
  if (
    manifestRegistry.path !==
      outputRegistryPath ||
    manifestRegistry.sha256 !==
      sha256(registryBytes) ||
    manifestRegistry.successorPath !==
      registry.successorOutputRegistry.registryPath ||
    manifestRegistry.successorSha256 !==
      registry.successorOutputRegistry.registrySha256
  ) {
    throw new Error(
      "manifest is not bound to the output registry",
    );
  }

  [receipt, candidates, manifest].forEach(
    ({ bytes, value }) => {
      assertNoPrivateLocator(value);
      if (
        inspectSecretText(
          bytes.toString("utf8"),
        ).length > 0
      ) {
        throw new Error(
          "generated package contains secret-shaped content",
        );
      }
    },
  );
  assertNegativeMutations(receipt.value);

  if (mode === "check-existing") {
    const report = await readJson(reportPath);
    assertNoPrivateLocator(report.value);
    if (
      inspectSecretText(
        report.bytes.toString("utf8"),
      ).length > 0
    ) {
      throw new Error(
        "existing report contains secret-shaped content",
      );
    }
    verifyExistingReport({
      reportEnvelope: report.value,
      observedHead,
      packageContentRootSha256:
        expectedPackageRoot,
    });
    console.log(JSON.stringify({
      status:
        "PASS-EXISTING-CANDIDATE-NOT-ACCEPTED",
      observedHead,
      currentHead,
      packageContentRootSha256:
        expectedPackageRoot,
      reportPayloadSha256:
        report.value.payloadSha256,
    }));
    return;
  }

  const reportPayload = Object.freeze({
    schema:
      "CONNECT-DISCOVERY-CUTOFF-VERIFICATION-REPORT-PAYLOAD-V2",
    status: "PASS-CANDIDATE-NOT-ACCEPTED",
    owner: "Tal",
    verifiedAt,
    observedHead: currentHead,
    packageContentRootSha256:
      expectedPackageRoot,
    checks: Object.freeze([
      "CLOSED-ENVELOPE-SCHEMAS",
      "PAYLOAD-DIGESTS",
      "MEMBER-BYTE-DIGESTS",
      "PACKAGE-CONTENT-ROOT",
      "OUTPUT-REGISTRY-BINDING",
      "SUCCESSOR-OUTPUT-REGISTRY-BINDING",
      "DECLARED-OUTPUTS-ABSENT-AT-OBSERVED-HEAD",
      "CURRENT-HEAD-BINDING",
      "NO-SELF-MEMBERSHIP",
      "NO-PRIVATE-LOCATOR",
      "NO-SECRET-SHAPED-CONTENT",
      "NEGATIVE-DIGEST-MUTATION",
      "NEGATIVE-PATH-MUTATIONS",
      "NEGATIVE-UNKNOWN-FIELD-MUTATION",
    ]),
    limitations: Object.freeze([
      "NOT-INDEPENDENT-REVIEW",
      "NOT-B0-ACCEPTANCE",
      "NOT-SOURCE-UNIVERSE-ACCEPTANCE",
      "LOCAL-CLOCK-UNTRUSTED",
      "GITHUB-API-SURFACES-UNOBSERVED",
    ]),
  });
  const reportEnvelope = createEnvelope({
    schema:
      "CONNECT-DISCOVERY-CUTOFF-VERIFICATION-REPORT-ENVELOPE-V2",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-VERIFICATION-REPORT.V2",
    payload: reportPayload,
  });
  const reportBytes = jsonBytes(
    reportEnvelope,
  );
  console.log(
    emitAddFilePatch(
      reportPath,
      reportBytes,
    ),
  );
}

await main();
