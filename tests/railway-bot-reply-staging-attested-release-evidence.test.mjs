import assert from "node:assert/strict";
import {
  createPrivateKey,
  createPublicKey,
  sign,
} from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import {
  botReplyStagingReceiptAttestationPolicyVersion,
  deriveBotReplyStagingReceiptAttestationKeyId,
  deriveBotReplyStagingReceiptAttestationNonce,
  deriveBotReplyStagingReceiptDigest,
  serializeBotReplyStagingReceiptAttestationPayload,
} from "../server/operations/botReplyStagingReceiptAttestation.ts";
import {
  assembleRailwayBotReplyStagingAttestedReleaseEvidence,
  createRailwayBotReplyStagingAttestedReleaseEvidenceCore,
  deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest,
  inspectRailwayBotReplyStagingAttestedReleaseEvidence,
  RailwayBotReplyStagingAttestedReleaseEvidenceError,
  railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
  railwayBotReplyStagingAttestedReleaseEvidenceCheckIds,
  railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes,
  railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
  serializeRailwayBotReplyStagingAttestedReleaseEvidence,
} from "../server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";

// Published RFC 8032 test vector 1; never use this key outside tests.
const rfc8032PrivateSeed =
  "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
const privateKey = createPrivateKey({
  key: Buffer.from(
    `302e020100300506032b657004220420${rfc8032PrivateSeed}`,
    "hex",
  ),
  format: "der",
  type: "pkcs8",
});
const publicKeySpkiBase64Url = createPublicKey(privateKey)
  .export({ format: "der", type: "spki" })
  .toString("base64url");
const keyId = deriveBotReplyStagingReceiptAttestationKeyId(
  publicKeySpkiBase64Url,
);
const verifiedAt = "2026-08-25T10:00:00.000Z";
const releaseId = `connect_release_v1_${"1".repeat(64)}`;
const commitSha = "2".repeat(40);
const artifactDigest = `sha256:${"3".repeat(64)}`;
const runKey = `bot_reply_staging_run_v1_${"4".repeat(64)}`;
const requestDigest = `sha256:${"5".repeat(64)}`;
const attestationAuditKey =
  `bot_reply_staging_attestation_audit_v1_${"6".repeat(64)}`;

function readyReport(overrides = {}) {
  return {
    schemaVersion: 1,
    activationVersion:
      railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
    status: "ready",
    code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED",
    passedCheckCount: 4,
    requiredCheckCount: 4,
    checks: railwayBotReplyStagingAttestedReleaseEvidenceCheckIds.map((id) => ({
      id,
      status: "passed",
    })),
    ...overrides,
  };
}

function receipt(overrides = {}) {
  return {
    schemaVersion: 1,
    runKey,
    releaseId,
    commitSha,
    artifactDigest,
    scenarioCount: 7,
    status: "passed",
    ...overrides,
  };
}

function coreInput(overrides = {}) {
  return {
    report: readyReport(),
    receipt: receipt(),
    releaseId,
    commitSha,
    artifactDigest,
    runKey,
    claimVersion: 11,
    requestDigest,
    expectedEvidenceVersion: 0,
    attestationAuditKey,
    lifetimeSeconds: 300,
    ...overrides,
  };
}

const clock = Object.freeze({
  now: () => new Date(verifiedAt),
});

function createCore(overrides = {}) {
  return createRailwayBotReplyStagingAttestedReleaseEvidenceCore(
    coreInput(overrides),
    clock,
  );
}

function createAttestation(core, overrides = {}) {
  const unsignedWithoutNonce = {
    schemaVersion: 1,
    policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
    algorithm: "Ed25519",
    audience: "connect-release-evidence-builder",
    environment: "staging",
    keyId,
    runKey: core.runKey,
    claimVersion: core.claimVersion,
    requestDigest: core.requestDigest,
    releaseId: core.releaseId,
    commitSha: core.commitSha,
    artifactDigest: core.artifactDigest,
    expectedEvidenceVersion: core.expectedEvidenceVersion,
    receiptDigest: core.receiptDigest,
    evidenceCoreDigest:
      deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(core),
    auditKey: core.attestationAuditKey,
    nonceSequence: core.claimVersion,
    issuedAt: core.verifiedAt,
    signedAt: core.verifiedAt,
    expiresAt: core.expiresAt,
    ...overrides,
  };
  const nonce = deriveBotReplyStagingReceiptAttestationNonce(
    unsignedWithoutNonce,
  );
  const unsigned = { ...unsignedWithoutNonce, nonce };
  const signature = sign(
    null,
    serializeBotReplyStagingReceiptAttestationPayload(unsigned),
    privateKey,
  );
  return {
    ...unsigned,
    signature: `ed25519:${signature.toString("base64url")}`,
  };
}

function expected(overrides = {}) {
  return {
    trustedKeyId: keyId,
    releaseId,
    commitSha,
    artifactDigest,
    runKey,
    claimVersion: 11,
    requestDigest,
    expectedEvidenceVersion: 0,
    attestationAuditKey,
    ...overrides,
  };
}

function trustedKeys() {
  return [{
    keyId,
    publicKeySpkiBase64Url,
    validFrom: "2026-08-01T00:00:00.000Z",
    validUntil: "2026-09-01T00:00:00.000Z",
  }];
}

function inspect(evidence, overrides = {}) {
  return inspectRailwayBotReplyStagingAttestedReleaseEvidence({
    evidence,
    receipt: receipt(),
    expected: expected(),
    trustedKeys: trustedKeys(),
    clock,
    ...overrides,
  });
}

function expectsEvidenceError(code) {
  return (error) =>
    error instanceof RailwayBotReplyStagingAttestedReleaseEvidenceError &&
    error.code === code;
}

test("creates one explicit release/run/receipt-bound evidence core", () => {
  const core = createCore();

  assert.deepEqual(Object.keys(core).sort(), [
    "activationVersion",
    "artifactDigest",
    "attestationAuditKey",
    "checkCount",
    "checks",
    "claimVersion",
    "commitSha",
    "environment",
    "expectedEvidenceVersion",
    "expiresAt",
    "receiptDigest",
    "releaseId",
    "requestDigest",
    "runKey",
    "source",
    "verifiedAt",
  ]);
  assert.equal(core.verifiedAt, verifiedAt);
  assert.equal(core.expiresAt, "2026-08-25T10:05:00.000Z");
  assert.equal(core.receiptDigest, deriveBotReplyStagingReceiptDigest(receipt()));
  assert.deepEqual(
    core.checks.map(({ id, status }) => ({ id, status })),
    railwayBotReplyStagingAttestedReleaseEvidenceCheckIds.map((id) => ({
      id,
      status: "passed",
    })),
  );
  assert.match(
    deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(core),
    /^sha256:[a-f0-9]{64}$/,
  );
  assert.ok(Object.isFrozen(core));
  assert.ok(Object.isFrozen(core.checks));
  assert.ok(core.checks.every(Object.isFrozen));
});

test("uses strict canonical SHA-256 independent of property insertion order", () => {
  const core = createCore();
  const reordered = Object.fromEntries(Object.entries(core).reverse());

  assert.equal(
    deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(reordered),
    deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(core),
  );
  assert.deepEqual(createCore(), createCore());
});

test("assembles the exact v2 envelope with full v1 attestation", () => {
  const core = createCore();
  const attestation = createAttestation(core);
  const evidence = assembleRailwayBotReplyStagingAttestedReleaseEvidence({
    core,
    attestation,
  });

  assert.deepEqual(Object.keys(evidence).sort(), [
    "attestation",
    "attestationPayloadDigest",
    "core",
    "evidenceCoreDigest",
    "evidenceDigest",
    "policyVersion",
    "schemaVersion",
  ]);
  assert.equal(evidence.schemaVersion, 2);
  assert.equal(
    evidence.policyVersion,
    railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
  );
  assert.deepEqual(evidence.attestation, attestation);
  assert.match(evidence.attestationPayloadDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(evidence.evidenceCoreDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(
    evidence.evidenceDigest,
    /^bot_reply_staging_cross_service_evidence_v2_[a-f0-9]{64}$/,
  );
  assert.ok(Object.isFrozen(evidence));
  assert.ok(Object.isFrozen(evidence.attestation));
});

test("verifies the Ed25519 envelope statelessly and reports no replay protection", () => {
  const core = createCore();
  const evidence = assembleRailwayBotReplyStagingAttestedReleaseEvidence({
    core,
    attestation: createAttestation(core),
  });
  const result = inspect(evidence);

  assert.deepEqual(result, {
    status: "signature-valid-only",
    code:
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_SIGNATURE_VALID_ONLY",
    releaseId,
    runKey,
    evidenceCoreDigest: evidence.evidenceCoreDigest,
    attestationPayloadDigest: evidence.attestationPayloadDigest,
    evidenceDigest: evidence.evidenceDigest,
    verifiedAt,
    expiresAt: core.expiresAt,
    replayProtected: false,
    evidence,
  });
});

test("serializes deterministically within the PostgreSQL 8,192-byte boundary", () => {
  const core = createCore();
  const evidence = assembleRailwayBotReplyStagingAttestedReleaseEvidence({
    core,
    attestation: createAttestation(core),
  });
  const serialized =
    serializeRailwayBotReplyStagingAttestedReleaseEvidence(evidence);

  assert.equal(serialized, serializeRailwayBotReplyStagingAttestedReleaseEvidence(
    structuredClone(evidence),
  ));
  assert.ok(
    Buffer.byteLength(serialized, "utf8") <=
      railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes,
  );

  const oversized = structuredClone(evidence);
  oversized.attestation.signature = `ed25519:${"A".repeat(9_000)}`;
  assert.ok(
    Buffer.byteLength(JSON.stringify(oversized), "utf8") >
      railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes,
  );
  assert.throws(
    () => serializeRailwayBotReplyStagingAttestedReleaseEvidence(oversized),
    expectsEvidenceError("input-invalid"),
  );
  assert.equal(
    inspect(oversized).code,
    "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_INVALID",
  );
});

test("requires exact issued, signed and expiry timestamps", () => {
  const core = createCore();
  for (const overrides of [
    { issuedAt: "2026-08-25T10:00:00.001Z" },
    { signedAt: "2026-08-25T10:00:00.001Z" },
    { expiresAt: "2026-08-25T10:05:00.001Z" },
  ]) {
    assert.throws(
      () => assembleRailwayBotReplyStagingAttestedReleaseEvidence({
        core,
        attestation: createAttestation(core, overrides),
      }),
      expectsEvidenceError("binding-mismatch"),
    );
  }
});

test("requires all release, run, version, receipt and audit bindings", () => {
  const core = createCore();
  const mismatches = [
    { releaseId: `connect_release_v1_${"7".repeat(64)}` },
    { commitSha: "7".repeat(40) },
    { artifactDigest: `sha256:${"7".repeat(64)}` },
    { runKey: `bot_reply_staging_run_v1_${"7".repeat(64)}` },
    { claimVersion: 12, nonceSequence: 12 },
    { requestDigest: `sha256:${"7".repeat(64)}` },
    { expectedEvidenceVersion: 1 },
    { receiptDigest: `sha256:${"7".repeat(64)}` },
    { evidenceCoreDigest: `sha256:${"7".repeat(64)}` },
    {
      auditKey:
        `bot_reply_staging_attestation_audit_v1_${"7".repeat(64)}`,
    },
  ];
  for (const overrides of mismatches) {
    assert.throws(
      () => assembleRailwayBotReplyStagingAttestedReleaseEvidence({
        core,
        attestation: createAttestation(core, overrides),
      }),
      expectsEvidenceError("binding-mismatch"),
    );
  }
});

test("rejects invalid lifetime, failed/reordered checks and extension fields", () => {
  const failedChecks = readyReport();
  failedChecks.checks[0].status = "blocked";
  const reorderedChecks = readyReport();
  reorderedChecks.checks.reverse();
  const cases = [
    coreInput({ lifetimeSeconds: 59 }),
    coreInput({ lifetimeSeconds: 901 }),
    coreInput({ report: failedChecks }),
    coreInput({ report: reorderedChecks }),
    { ...coreInput(), tenantId: 7 },
  ];
  for (const candidate of cases) {
    assert.throws(
      () => createRailwayBotReplyStagingAttestedReleaseEvidenceCore(
        candidate,
        clock,
      ),
      expectsEvidenceError("input-invalid"),
    );
  }
});

test("rejects accessor and Proxy inputs without invoking hostile traps", () => {
  let reads = 0;
  const accessorInput = coreInput();
  Object.defineProperty(accessorInput, "receipt", {
    enumerable: true,
    get() {
      reads += 1;
      return receipt();
    },
  });
  assert.throws(
    () => createRailwayBotReplyStagingAttestedReleaseEvidenceCore(
      accessorInput,
      clock,
    ),
    expectsEvidenceError("input-invalid"),
  );
  assert.equal(reads, 0);

  const proxiedInput = new Proxy(coreInput(), {
    get() {
      reads += 1;
      return "forbidden";
    },
  });
  assert.throws(
    () => createRailwayBotReplyStagingAttestedReleaseEvidenceCore(
      proxiedInput,
      clock,
    ),
    expectsEvidenceError("input-invalid"),
  );
  assert.equal(reads, 0);

  const reportWithProxiedChecks = coreInput({
    report: {
      ...readyReport(),
      checks: new Proxy(readyReport().checks, {
        get() {
          reads += 1;
          return "forbidden";
        },
      }),
    },
  });
  assert.throws(
    () => createRailwayBotReplyStagingAttestedReleaseEvidenceCore(
      reportWithProxiedChecks,
      clock,
    ),
    expectsEvidenceError("input-invalid"),
  );
  assert.equal(reads, 0);
});

test("detects digest tampering, a different receipt and external binding mismatch", () => {
  const core = createCore();
  const evidence = assembleRailwayBotReplyStagingAttestedReleaseEvidence({
    core,
    attestation: createAttestation(core),
  });
  const tampered = structuredClone(evidence);
  tampered.evidenceDigest =
    `bot_reply_staging_cross_service_evidence_v2_${"7".repeat(64)}`;
  assert.equal(inspect(tampered).code,
    "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_INVALID");

  assert.equal(
    inspect(evidence, { receipt: receipt({ scenarioCount: 8 }) }).code,
    "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_BINDING_MISMATCH",
  );
  assert.equal(
    inspect(evidence, {
      expected: expected({
        releaseId: `connect_release_v1_${"7".repeat(64)}`,
      }),
    }).code,
    "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_BINDING_MISMATCH",
  );
  assert.equal(
    inspect(evidence, {
      expected: expected({
        trustedKeyId:
          `bot_reply_staging_worker_key_v1_${"7".repeat(64)}`,
      }),
    }).code,
    "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_BINDING_MISMATCH",
  );
});

test("separates signature rejection and expiry while remaining stateless", () => {
  const core = createCore();
  const attestation = createAttestation(core);
  const invalidSignature = {
    ...attestation,
    signature: `ed25519:${"A".repeat(86)}`,
  };
  const invalidEvidence =
    assembleRailwayBotReplyStagingAttestedReleaseEvidence({
      core,
      attestation: invalidSignature,
    });
  const signatureResult = inspect(invalidEvidence);
  assert.equal(
    signatureResult.code,
    "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_ATTESTATION_REJECTED",
  );
  assert.equal(
    signatureResult.attestationCode,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_SIGNATURE_INVALID",
  );
  assert.equal(signatureResult.replayProtected, false);

  const evidence = assembleRailwayBotReplyStagingAttestedReleaseEvidence({
    core,
    attestation,
  });
  const expiredResult = inspect(evidence, {
    clock: { now: () => new Date(core.expiresAt) },
  });
  assert.equal(
    expiredResult.attestationCode,
    "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_EXPIRED",
  );
  assert.equal(expiredResult.replayProtected, false);
});

test("rejects Proxy envelope inspection without invoking traps", () => {
  const core = createCore();
  const evidence = assembleRailwayBotReplyStagingAttestedReleaseEvidence({
    core,
    attestation: createAttestation(core),
  });
  let reads = 0;
  const proxiedEvidence = new Proxy(evidence, {
    get() {
      reads += 1;
      return "forbidden";
    },
  });
  const result = inspect(proxiedEvidence);
  assert.equal(
    result.code,
    "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_INVALID",
  );
  assert.equal(result.replayProtected, false);
  assert.equal(reads, 0);
});

test("contains no randomized identity path and stays dormant", async () => {
  const projectRoot = new URL("../", import.meta.url);
  const moduleFile =
    "server/platform/railwayBotReplyStagingAttestedReleaseEvidence.ts";
  const allowedProtectedReferenceCounts = new Map([
    [
      "scripts/verify-bot-reply-staging-attested-evidence-postgres.mjs",
      new Map([
        ["railwayBotReplyStagingAttestedReleaseEvidence", 5],
        ["postgresBotReplyStagingAttestedReleaseEvidenceRepository", 1],
        ["postgresBotReplyStagingAttestedReleaseEvidenceReadRepository", 1],
        ["botReplyStagingAttestedReleaseCutoverReadiness", 1],
        ["evaluateBotReplyStagingAttestedReleaseCutoverReadiness", 2],
        ["verifyBotReplyStagingAttestedEvidencePostgres", 1],
        ["publish_bot_reply_staging_attested_evidence_with_audit", 1],
      ]),
    ],
    [
      "scripts/verify-node-postgres-integration.mjs",
      new Map([
        ["verifyBotReplyStagingAttestedEvidencePostgres", 2],
        ["verify-bot-reply-staging-attested-evidence-postgres", 1],
      ]),
    ],
    [
      "scripts/verify-source-guardrails.mjs",
      new Map([
        ["postgresBotReplyStagingAttestedReleaseEvidenceReadRepository", 2],
        ["botReplyStagingAttestedReleaseCutoverReadiness", 2],
        ["verify-bot-reply-staging-attested-evidence-postgres", 1],
      ]),
    ],
    [
      "server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts",
      new Map([
        ["railwayBotReplyStagingAttestedReleaseEvidence", 5],
        ["postgresBotReplyStagingAttestedReleaseEvidenceReadRepository", 1],
        ["botReplyStagingAttestedReleaseCutoverReadiness", 5],
        ["evaluateBotReplyStagingAttestedReleaseCutoverReadiness", 1],
      ]),
    ],
    [
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceRepository.ts",
      new Map([
        ["railwayBotReplyStagingAttestedReleaseEvidence", 3],
        ["postgresBotReplyStagingAttestedReleaseEvidenceRepository", 1],
        ["publish_bot_reply_staging_attested_evidence_with_audit", 1],
      ]),
    ],
    [
      "server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts",
      new Map([
        ["railwayBotReplyStagingAttestedReleaseEvidence", 4],
        ["postgresBotReplyStagingAttestedReleaseEvidenceReadRepository", 1],
      ]),
    ],
    [
      "server/platform/postgresRuntimeCapabilityEvidence.ts",
      new Map([
        ["publish_bot_reply_staging_attested_evidence_with_audit", 1],
      ]),
    ],
  ]);
  const protectedDormantReferences = [
    "railwayBotReplyStagingAttestedReleaseEvidence",
    "postgresBotReplyStagingAttestedReleaseEvidenceRepository",
    "postgresBotReplyStagingAttestedReleaseEvidenceReadRepository",
    "botReplyStagingAttestedReleaseCutoverReadiness",
    "evaluateBotReplyStagingAttestedReleaseCutoverReadiness",
    "verifyBotReplyStagingAttestedEvidencePostgres",
    "verify-bot-reply-staging-attested-evidence-postgres",
    "verify-node-postgres-integration",
    "verify:node-postgres-integration",
    "publish_bot_reply_staging_attested_evidence_with_audit",
  ];
  const source = await readFile(new URL(moduleFile, projectRoot), "utf8");
  assert.doesNotMatch(
    source,
    /Math\.random|crypto\.randomUUID|randomBytes|generateKeyPair/,
  );
  assert.doesNotMatch(
    source,
    /railwayBotReplyStagingCrossServiceActivation|botReplyStagingEvidenceBuilder/,
  );
  const candidateProbeSource = await readFile(
    new URL(
      "server/platform/postgresRuntimeCapabilityEvidence.ts",
      projectRoot,
    ),
    "utf8",
  );
  assert.match(candidateProbeSource, /readonly activationAllowed: false/);
  assert.match(candidateProbeSource, /activationAllowed: false/);
  assert.match(candidateProbeSource, /status: "candidate" \| "blocked"/);
  assert.doesNotMatch(
    candidateProbeSource,
    /(?:SELECT|PERFORM)\s+public\.publish_bot_reply_staging_attested_evidence_with_audit/i,
  );

  const packageManifest = JSON.parse(
    await readFile(new URL("package.json", projectRoot), "utf8"),
  );
  const allowedIntegrationScript = "verify:node-postgres-integration";
  assert.equal(
    packageManifest.scripts?.[allowedIntegrationScript],
    "node scripts/verify-node-postgres-integration.mjs",
  );
  const packageScriptViolations = [];
  for (const [scriptName, command] of Object.entries(
    packageManifest.scripts ?? {},
  )) {
    assert.equal(typeof command, "string", scriptName);
    if (scriptName === allowedIntegrationScript) continue;
    for (const protectedReference of protectedDormantReferences) {
      if (command.includes(protectedReference)) {
        packageScriptViolations.push({
          protectedReference,
          scriptName,
        });
      }
    }
  }
  assert.deepEqual(packageScriptViolations, []);

  const sourceRoots = [
    "app",
    "db",
    "features",
    "scripts",
    "server",
    "shared",
    "worker",
  ];
  async function listSourceFiles(relativeDirectory) {
    const entries = await readdir(new URL(`${relativeDirectory}/`, projectRoot), {
      withFileTypes: true,
    });
    const files = [];
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) {
        files.push(...await listSourceFiles(relativePath));
      } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
        files.push(relativePath);
      }
    }
    return files;
  }

  const rootRuntimeFiles = [
    "proxy.ts",
    "vite.config.ts",
    "next.config.ts",
    "drizzle.config.ts",
    "postcss.config.mjs",
    "cloudflare-env.d.ts",
  ];
  const allowedInventoryLiterals = new Map([
    [
      "shared/domain/hostingMigrationRegistry.ts",
      ['"scripts/verify-node-postgres-integration.mjs"'],
    ],
    [
      "scripts/verify-source-guardrails.mjs",
      [
        '"server/operations/botReplyStagingAttestedReleaseCutoverReadiness.ts"',
        '"server/platform/postgresBotReplyStagingAttestedReleaseEvidenceReadRepository.ts"',
      ],
    ],
  ]);
  const sourceFiles = [...rootRuntimeFiles, ...(await Promise.all(
    sourceRoots.map(listSourceFiles),
  )).flat()];
  const forbiddenReferences = [];
  for (const sourceFile of sourceFiles) {
    if (sourceFile === moduleFile) {
      continue;
    }
    const candidate = await readFile(new URL(sourceFile, projectRoot), "utf8");
    let guardedCandidate = candidate;
    for (const allowedLiteral of allowedInventoryLiterals.get(sourceFile) ?? []) {
      assert.equal(
        candidate.split(allowedLiteral).length - 1,
        1,
        `${sourceFile} must contain the allowed inventory literal exactly once`,
      );
      guardedCandidate = guardedCandidate.replace(allowedLiteral, "");
    }
    for (const [protectedReference, expectedCount] of
      allowedProtectedReferenceCounts.get(sourceFile) ?? []) {
      assert.equal(
        candidate.split(protectedReference).length - 1,
        expectedCount,
        `${sourceFile} protected reference inventory changed`,
      );
      guardedCandidate = guardedCandidate
        .split(protectedReference)
        .join("");
    }
    for (const protectedReference of protectedDormantReferences) {
      if (guardedCandidate.includes(protectedReference)) {
        forbiddenReferences.push({
          protectedReference,
          sourceFile,
        });
      }
    }
  }
  assert.deepEqual(forbiddenReferences, []);
});
