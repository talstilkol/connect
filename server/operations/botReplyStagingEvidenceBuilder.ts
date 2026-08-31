import {
  createHash,
} from "node:crypto";

import {
  botReplyStagingEvidencePolicyVersion,
  botReplyStagingScenarioRequirements,
  deriveBotReplyStagingEvidenceDigest,
  inspectBotReplyStagingEvidence,
  type BotReplyStagingEvidence,
} from "./botReplyStagingEvidence.ts";

export const botReplyStagingRunnerVersion =
  "connect-bot-reply-staging-runner-v1" as const;

const maximumReceiptAgeMilliseconds = 60 * 60 * 1_000;
const evidenceLifetimeMilliseconds = 24 * 60 * 60 * 1_000;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;

type ScenarioRequirement =
  (typeof botReplyStagingScenarioRequirements)[number];

interface BotReplyStagingScenarioReceipt {
  scenario: ScenarioRequirement["scenario"];
  status: "passed";
  providerErrorCode: number | null;
  observedAt: string;
  evidenceProof: string;
}

interface BotReplyStagingReceipt {
  schemaVersion: 1;
  runnerVersion: typeof botReplyStagingRunnerVersion;
  environment: "staging";
  provider: "meta-whatsapp-cloud-api";
  connectionMode: "approved-staging-waba";
  graphApiVersion: string;
  verifiedAt: string;
  releaseId: string;
  commitSha: string;
  artifactDigest: string;
  assetProofs: {
    app: string;
    waba: string;
    phoneNumber: string;
  };
  scenarios: readonly BotReplyStagingScenarioReceipt[];
  rateLimits: {
    throughput: {
      messagesPerSecond: 20 | 80 | 1_000;
      source: "graph-api";
      observedAt: string;
      evidenceProof: string;
    };
    providerRetry: {
      status: "passed";
      providerErrorCode: 130429;
      retryAfterSeconds: number;
      cooldownScope: "sender";
      observedAt: string;
      evidenceProof: string;
    };
    pairLimit: {
      status: "passed";
      providerErrorCode: 131056;
      cooldownScope: "pair";
      backoffPolicy: "meta-4-power-x";
      observedAt: string;
      evidenceProof: string;
    };
  };
  killSwitch: {
    status: "passed";
    providerRequestCount: 0;
    observedAt: string;
    evidenceProof: string;
  };
  duplicateSafety: {
    status: "passed";
    queueDeliveryCount: number;
    providerRequestCount: 1;
    observedAt: string;
    evidenceProof: string;
  };
  credentialBoundary: {
    source: "encrypted-vault";
    plaintextExposureFindings: 0;
    observedAt: string;
    evidenceProof: string;
  };
  redaction: {
    testedFieldCount: number;
    findings: 0;
    observedAt: string;
    evidenceProof: string;
  };
}

export class BotReplyStagingEvidenceBuilderError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BotReplyStagingEvidenceBuilderError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new BotReplyStagingEvidenceBuilderError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function isSafeIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return Number.isSafeInteger(value) &&
    Number(value) >= minimum && Number(value) <= maximum;
}

function isEvidenceProof(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 16 && value.length <= 2_048 &&
    value.trim() === value && !value.includes("\0");
}

function scenarioReceiptIsValid(
  value: unknown,
  requirement: ScenarioRequirement,
): value is BotReplyStagingScenarioReceipt {
  return isRecord(value) &&
    hasExactKeys(value, [
      "scenario",
      "status",
      "providerErrorCode",
      "observedAt",
      "evidenceProof",
    ]) &&
    value.scenario === requirement.scenario &&
    value.status === "passed" &&
    value.providerErrorCode === requirement.providerErrorCode &&
    isCanonicalTimestamp(value.observedAt) &&
    isEvidenceProof(value.evidenceProof);
}

function throughputReceiptIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "messagesPerSecond",
      "source",
      "observedAt",
      "evidenceProof",
    ]) &&
    (value.messagesPerSecond === 20 ||
      value.messagesPerSecond === 80 ||
      value.messagesPerSecond === 1_000) &&
    value.source === "graph-api" &&
    isCanonicalTimestamp(value.observedAt) &&
    isEvidenceProof(value.evidenceProof);
}

function providerRetryReceiptIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "providerErrorCode",
      "retryAfterSeconds",
      "cooldownScope",
      "observedAt",
      "evidenceProof",
    ]) &&
    value.status === "passed" &&
    value.providerErrorCode === 130429 &&
    isSafeIntegerInRange(value.retryAfterSeconds, 1, 86_400) &&
    value.cooldownScope === "sender" &&
    isCanonicalTimestamp(value.observedAt) &&
    isEvidenceProof(value.evidenceProof);
}

function pairLimitReceiptIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "providerErrorCode",
      "cooldownScope",
      "backoffPolicy",
      "observedAt",
      "evidenceProof",
    ]) &&
    value.status === "passed" &&
    value.providerErrorCode === 131056 &&
    value.cooldownScope === "pair" &&
    value.backoffPolicy === "meta-4-power-x" &&
    isCanonicalTimestamp(value.observedAt) &&
    isEvidenceProof(value.evidenceProof);
}

function killSwitchReceiptIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "providerRequestCount",
      "observedAt",
      "evidenceProof",
    ]) &&
    value.status === "passed" && value.providerRequestCount === 0 &&
    isCanonicalTimestamp(value.observedAt) &&
    isEvidenceProof(value.evidenceProof);
}

function duplicateSafetyReceiptIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "queueDeliveryCount",
      "providerRequestCount",
      "observedAt",
      "evidenceProof",
    ]) &&
    value.status === "passed" &&
    isSafeIntegerInRange(value.queueDeliveryCount, 2, 100) &&
    value.providerRequestCount === 1 &&
    isCanonicalTimestamp(value.observedAt) &&
    isEvidenceProof(value.evidenceProof);
}

function credentialBoundaryReceiptIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "source",
      "plaintextExposureFindings",
      "observedAt",
      "evidenceProof",
    ]) &&
    value.source === "encrypted-vault" &&
    value.plaintextExposureFindings === 0 &&
    isCanonicalTimestamp(value.observedAt) &&
    isEvidenceProof(value.evidenceProof);
}

function redactionReceiptIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "testedFieldCount",
      "findings",
      "observedAt",
      "evidenceProof",
    ]) &&
    isSafeIntegerInRange(value.testedFieldCount, 12, 1_000) &&
    value.findings === 0 && isCanonicalTimestamp(value.observedAt) &&
    isEvidenceProof(value.evidenceProof);
}

function parseReceipt(value: unknown): BotReplyStagingReceipt {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "runnerVersion",
      "environment",
      "provider",
      "connectionMode",
      "graphApiVersion",
      "verifiedAt",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "assetProofs",
      "scenarios",
      "rateLimits",
      "killSwitch",
      "duplicateSafety",
      "credentialBoundary",
      "redaction",
    ]) ||
    value.schemaVersion !== 1 ||
    value.runnerVersion !== botReplyStagingRunnerVersion ||
    value.environment !== "staging" ||
    value.provider !== "meta-whatsapp-cloud-api" ||
    value.connectionMode !== "approved-staging-waba" ||
    typeof value.graphApiVersion !== "string" ||
    !isCanonicalTimestamp(value.verifiedAt) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !fingerprintPattern.test(value.artifactDigest) ||
    !isRecord(value.assetProofs) ||
    !hasExactKeys(value.assetProofs, ["app", "waba", "phoneNumber"]) ||
    !isEvidenceProof(value.assetProofs.app) ||
    !isEvidenceProof(value.assetProofs.waba) ||
    !isEvidenceProof(value.assetProofs.phoneNumber) ||
    !Array.isArray(value.scenarios) ||
    value.scenarios.length !== botReplyStagingScenarioRequirements.length ||
    !isRecord(value.rateLimits) ||
    !hasExactKeys(value.rateLimits, [
      "throughput",
      "providerRetry",
      "pairLimit",
    ]) ||
    !throughputReceiptIsValid(value.rateLimits.throughput) ||
    !providerRetryReceiptIsValid(value.rateLimits.providerRetry) ||
    !pairLimitReceiptIsValid(value.rateLimits.pairLimit) ||
    !killSwitchReceiptIsValid(value.killSwitch) ||
    !duplicateSafetyReceiptIsValid(value.duplicateSafety) ||
    !credentialBoundaryReceiptIsValid(value.credentialBoundary) ||
    !redactionReceiptIsValid(value.redaction)
  ) {
    fail("BOT_REPLY_STAGING_RECEIPT_INVALID");
  }

  for (
    let index = 0;
    index < botReplyStagingScenarioRequirements.length;
    index += 1
  ) {
    if (!scenarioReceiptIsValid(
      value.scenarios[index],
      botReplyStagingScenarioRequirements[index],
    )) {
      fail("BOT_REPLY_STAGING_RECEIPT_INVALID");
    }
  }

  return value as unknown as BotReplyStagingReceipt;
}

function fingerprint(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function buildBotReplyStagingEvidenceFromReceipt({
  receipt: rawReceipt,
  releaseManifest,
  artifactDigest,
  now = new Date(),
}: {
  receipt: unknown;
  releaseManifest: unknown;
  artifactDigest: unknown;
  now?: Date;
}): Readonly<BotReplyStagingEvidence> {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    fail("BOT_REPLY_STAGING_EVIDENCE_CONFIGURATION_INVALID");
  }

  const receipt = parseReceipt(rawReceipt);
  if (
    !isRecord(releaseManifest) ||
    releaseManifest.schemaVersion !== 1 ||
    releaseManifest.releaseId !== receipt.releaseId ||
    releaseManifest.commitSha !== receipt.commitSha
  ) {
    fail("BOT_REPLY_STAGING_EVIDENCE_RELEASE_MISMATCH");
  }
  if (artifactDigest !== receipt.artifactDigest) {
    fail("BOT_REPLY_STAGING_EVIDENCE_ARTIFACT_MISMATCH");
  }

  const verifiedAt = Date.parse(receipt.verifiedAt);
  if (now.getTime() < verifiedAt) {
    fail("BOT_REPLY_STAGING_RECEIPT_NOT_YET_VALID");
  }
  if (now.getTime() - verifiedAt > maximumReceiptAgeMilliseconds) {
    fail("BOT_REPLY_STAGING_RECEIPT_STALE");
  }

  const unsignedEvidence: Omit<
    BotReplyStagingEvidence,
    "evidenceDigest"
  > = {
    schemaVersion: 1,
    policyVersion: botReplyStagingEvidencePolicyVersion,
    environment: "staging",
    provider: "meta-whatsapp-cloud-api",
    connectionMode: "approved-staging-waba",
    graphApiVersion: receipt.graphApiVersion,
    verifiedAt: receipt.verifiedAt,
    expiresAt: new Date(
      verifiedAt + evidenceLifetimeMilliseconds,
    ).toISOString(),
    releaseId: receipt.releaseId,
    commitSha: receipt.commitSha,
    artifactDigest: receipt.artifactDigest,
    appFingerprint: fingerprint(receipt.assetProofs.app),
    wabaFingerprint: fingerprint(receipt.assetProofs.waba),
    phoneNumberFingerprint: fingerprint(
      receipt.assetProofs.phoneNumber,
    ),
    scenarios: receipt.scenarios.map((scenario) => ({
      scenario: scenario.scenario,
      status: scenario.status,
      providerErrorCode: scenario.providerErrorCode,
      observedAt: scenario.observedAt,
      evidenceFingerprint: fingerprint(scenario.evidenceProof),
    })),
    rateLimits: {
      throughput: {
        messagesPerSecond:
          receipt.rateLimits.throughput.messagesPerSecond,
        source: "graph-api",
        observedAt: receipt.rateLimits.throughput.observedAt,
        evidenceFingerprint: fingerprint(
          receipt.rateLimits.throughput.evidenceProof,
        ),
      },
      providerRetry: {
        status: "passed",
        providerErrorCode: 130429,
        retryAfterSeconds:
          receipt.rateLimits.providerRetry.retryAfterSeconds,
        cooldownScope: "sender",
        observedAt: receipt.rateLimits.providerRetry.observedAt,
        evidenceFingerprint: fingerprint(
          receipt.rateLimits.providerRetry.evidenceProof,
        ),
      },
      pairLimit: {
        status: "passed",
        providerErrorCode: 131056,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
        observedAt: receipt.rateLimits.pairLimit.observedAt,
        evidenceFingerprint: fingerprint(
          receipt.rateLimits.pairLimit.evidenceProof,
        ),
      },
    },
    killSwitch: {
      status: "passed",
      providerRequestCount: 0,
      observedAt: receipt.killSwitch.observedAt,
      evidenceFingerprint: fingerprint(
        receipt.killSwitch.evidenceProof,
      ),
    },
    duplicateSafety: {
      status: "passed",
      queueDeliveryCount:
        receipt.duplicateSafety.queueDeliveryCount,
      providerRequestCount: 1,
      observedAt: receipt.duplicateSafety.observedAt,
      evidenceFingerprint: fingerprint(
        receipt.duplicateSafety.evidenceProof,
      ),
    },
    credentialBoundary: {
      source: "encrypted-vault",
      plaintextExposureFindings: 0,
      observedAt: receipt.credentialBoundary.observedAt,
      evidenceFingerprint: fingerprint(
        receipt.credentialBoundary.evidenceProof,
      ),
    },
    redaction: {
      testedFieldCount: receipt.redaction.testedFieldCount,
      findings: 0,
      observedAt: receipt.redaction.observedAt,
      evidenceFingerprint: fingerprint(
        receipt.redaction.evidenceProof,
      ),
    },
  };
  const evidence = {
    ...unsignedEvidence,
    evidenceDigest:
      deriveBotReplyStagingEvidenceDigest(unsignedEvidence),
  };
  const report = inspectBotReplyStagingEvidence({
    APP_DEPLOYED_COMMIT_SHA: receipt.commitSha,
    APP_RELEASE_ID: receipt.releaseId,
    APP_DEPLOYMENT_ARTIFACT_DIGEST: receipt.artifactDigest,
    BOT_REPLY_STAGING_EVIDENCE_JSON: JSON.stringify(evidence),
  }, now);

  if (report.status !== "configured") {
    fail("BOT_REPLY_STAGING_EVIDENCE_INVALID");
  }

  return Object.freeze(evidence);
}
