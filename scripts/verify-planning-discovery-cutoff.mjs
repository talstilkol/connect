import {
  readFile,
  writeFile,
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
} from "./planning-discovery-cutoff-lib.mjs";

function parseArguments() {
  const argumentsList = process.argv.slice(2);
  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== "--verified-at"
  ) {
    throw new Error(
      "usage: node scripts/verify-planning-discovery-cutoff.mjs --verified-at YYYY-MM-DDTHH:mm:ssZ",
    );
  }
  return Object.freeze({
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
) {
  const records = parseNullSeparated(
    git([
      "status",
      "--porcelain=v1",
      "-z",
    ]),
  );
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
        "CONNECT-DISCOVERY-CUTOFF-RECEIPT-ENVELOPE-V1",
      domain:
        "CONNECT.DISCOVERY-CUTOFF-RECEIPT.V1",
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
        "CONNECT-DISCOVERY-CUTOFF-RECEIPT-ENVELOPE-V1",
      domain:
        "CONNECT.DISCOVERY-CUTOFF-RECEIPT.V1",
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
  const { verifiedAt } = parseArguments();
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
      "CONNECT-DISCOVERY-CUTOFF-RECEIPT-ENVELOPE-V1",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-RECEIPT.V1",
  });
  verifyEnvelope({
    envelope: candidates.value,
    schema:
      "CONNECT-DISCOVERY-SOURCE-CANDIDATES-ENVELOPE-V1",
    domain:
      "CONNECT.DISCOVERY-SOURCE-CANDIDATES.V1",
  });
  verifyEnvelope({
    envelope: manifest.value,
    schema:
      "CONNECT-DISCOVERY-CUTOFF-MANIFEST-ENVELOPE-V1",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-MANIFEST.V1",
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
      "CONNECT-DISCOVERY-CUTOFF-RECEIPT-PAYLOAD-V1" ||
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
  if (
    receipt.value.payload.productRepository
      .observedHead !== currentHead ||
    manifest.value.payload.observedHead !==
      currentHead ||
    candidates.value.payload.observedHead !==
      currentHead
  ) {
    throw new Error(
      "candidate is not bound to the current clean input commit",
    );
  }
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
    "CONNECT.DISCOVERY-CUTOFF-PACKAGE-CONTENT.V1",
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
  if (
    manifest.value.payload.outputRegistry.path !==
      outputRegistryPath ||
    manifest.value.payload.outputRegistry.sha256 !==
      sha256(registryBytes)
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

  const reportPayload = Object.freeze({
    schema:
      "CONNECT-DISCOVERY-CUTOFF-VERIFICATION-REPORT-PAYLOAD-V1",
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
      "CONNECT-DISCOVERY-CUTOFF-VERIFICATION-REPORT-ENVELOPE-V1",
    domain:
      "CONNECT.DISCOVERY-CUTOFF-VERIFICATION-REPORT.V1",
    payload: reportPayload,
  });
  await writeFile(
    repoAbsolutePath(reportPath),
    jsonBytes(reportEnvelope),
    { flag: "wx" },
  );
  assertAllowedWorktreeStatus(
    registry.outputDirectory,
  );

  console.log(JSON.stringify({
    status: reportPayload.status,
    observedHead: currentHead,
    packageContentRootSha256:
      expectedPackageRoot,
    checks: reportPayload.checks.length,
    limitations:
      reportPayload.limitations.length,
  }));
}

await main();
