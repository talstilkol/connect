import {
  createHash,
} from "node:crypto";

export const botReplyStagingEvidencePolicyVersion =
  "connect-bot-reply-staging-evidence-v1" as const;

export const botReplyStagingScenarioRequirements = Object.freeze([
  Object.freeze({ scenario: "text-send", providerErrorCode: null }),
  Object.freeze({ scenario: "button-send", providerErrorCode: null }),
  Object.freeze({ scenario: "button-reply", providerErrorCode: null }),
  Object.freeze({ scenario: "status-sent", providerErrorCode: null }),
  Object.freeze({ scenario: "status-delivered", providerErrorCode: null }),
  Object.freeze({ scenario: "status-read", providerErrorCode: null }),
  Object.freeze({
    scenario: "customer-window-expired",
    providerErrorCode: 131047,
  }),
] as const);

const maximumEvidenceLength = 48_000;
const maximumEvidenceLifetimeMilliseconds =
  24 * 60 * 60 * 1_000;
const maximumObservationAgeMilliseconds =
  24 * 60 * 60 * 1_000;
const commitShaPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const evidenceDigestPattern =
  /^bot_reply_staging_evidence_v1_[a-f0-9]{64}$/;

type BotReplyStagingScenario =
  (typeof botReplyStagingScenarioRequirements)[number]["scenario"];

interface BotReplyScenarioEvidence {
  scenario: BotReplyStagingScenario;
  status: "passed";
  providerErrorCode: number | null;
  observedAt: string;
  evidenceFingerprint: string;
}

export interface BotReplyStagingEvidence {
  schemaVersion: 1;
  policyVersion: typeof botReplyStagingEvidencePolicyVersion;
  environment: "staging";
  provider: "meta-whatsapp-cloud-api";
  connectionMode: "approved-staging-waba";
  graphApiVersion: string;
  verifiedAt: string;
  expiresAt: string;
  releaseId: string;
  commitSha: string;
  artifactDigest: string;
  appFingerprint: string;
  wabaFingerprint: string;
  phoneNumberFingerprint: string;
  scenarios: readonly BotReplyScenarioEvidence[];
  rateLimits: {
    throughput: {
      messagesPerSecond: 20 | 80 | 1_000;
      source: "graph-api";
      observedAt: string;
      evidenceFingerprint: string;
    };
    providerRetry: {
      status: "passed";
      providerErrorCode: 130429;
      retryAfterSeconds: number;
      cooldownScope: "sender";
      observedAt: string;
      evidenceFingerprint: string;
    };
    pairLimit: {
      status: "passed";
      providerErrorCode: 131056;
      cooldownScope: "pair";
      backoffPolicy: "meta-4-power-x";
      observedAt: string;
      evidenceFingerprint: string;
    };
  };
  killSwitch: {
    status: "passed";
    providerRequestCount: 0;
    observedAt: string;
    evidenceFingerprint: string;
  };
  duplicateSafety: {
    status: "passed";
    queueDeliveryCount: number;
    providerRequestCount: 1;
    observedAt: string;
    evidenceFingerprint: string;
  };
  credentialBoundary: {
    source: "encrypted-vault";
    plaintextExposureFindings: 0;
    observedAt: string;
    evidenceFingerprint: string;
  };
  redaction: {
    testedFieldCount: number;
    findings: 0;
    observedAt: string;
    evidenceFingerprint: string;
  };
  evidenceDigest: string;
}

export interface BotReplyStagingEvidenceEnvironment {
  APP_DEPLOYED_COMMIT_SHA?: string;
  APP_RELEASE_ID?: string;
  APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
  BOT_REPLY_STAGING_EVIDENCE_JSON?: string;
}

export type BotReplyStagingEvidenceReport = Readonly<
  | {
      status: "configured";
      code: "BOT_REPLY_STAGING_EVIDENCE_VERIFIED";
      releaseId: string;
      commitSha: string;
      artifactDigest: string;
      verifiedAt: string;
      expiresAt: string;
      graphApiVersion: string;
      scenarioCount: 7;
      messagesPerSecond: 20 | 80 | 1_000;
    }
  | {
      status:
        | "disabled"
        | "invalid"
        | "not-yet-valid"
        | "expired"
        | "mismatch";
      code:
        | "BOT_REPLY_STAGING_EVIDENCE_REQUIRED"
        | "BOT_REPLY_STAGING_EVIDENCE_INVALID"
        | "BOT_REPLY_STAGING_EVIDENCE_NOT_YET_VALID"
        | "BOT_REPLY_STAGING_EVIDENCE_EXPIRED"
        | "BOT_REPLY_STAGING_EVIDENCE_MISMATCH";
      releaseId: null;
      commitSha: null;
      artifactDigest: null;
      verifiedAt: null;
      expiresAt: null;
      graphApiVersion: null;
      scenarioCount: 0;
      messagesPerSecond: null;
    }
>;

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

function isFingerprint(value: unknown): value is string {
  return typeof value === "string" && fingerprintPattern.test(value);
}

function isSafeIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return Number.isSafeInteger(value) &&
    Number(value) >= minimum && Number(value) <= maximum;
}

function scenarioEvidenceIsValid(
  value: unknown,
  requirement: (typeof botReplyStagingScenarioRequirements)[number],
): value is BotReplyScenarioEvidence {
  return isRecord(value) &&
    hasExactKeys(value, [
      "scenario",
      "status",
      "providerErrorCode",
      "observedAt",
      "evidenceFingerprint",
    ]) &&
    value.scenario === requirement.scenario &&
    value.status === "passed" &&
    value.providerErrorCode === requirement.providerErrorCode &&
    isCanonicalTimestamp(value.observedAt) &&
    isFingerprint(value.evidenceFingerprint);
}

function throughputEvidenceIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "messagesPerSecond",
      "source",
      "observedAt",
      "evidenceFingerprint",
    ]) &&
    (value.messagesPerSecond === 20 ||
      value.messagesPerSecond === 80 ||
      value.messagesPerSecond === 1_000) &&
    value.source === "graph-api" &&
    isCanonicalTimestamp(value.observedAt) &&
    isFingerprint(value.evidenceFingerprint);
}

function providerRetryEvidenceIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "providerErrorCode",
      "retryAfterSeconds",
      "cooldownScope",
      "observedAt",
      "evidenceFingerprint",
    ]) &&
    value.status === "passed" &&
    value.providerErrorCode === 130429 &&
    isSafeIntegerInRange(value.retryAfterSeconds, 1, 86_400) &&
    value.cooldownScope === "sender" &&
    isCanonicalTimestamp(value.observedAt) &&
    isFingerprint(value.evidenceFingerprint);
}

function pairLimitEvidenceIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "providerErrorCode",
      "cooldownScope",
      "backoffPolicy",
      "observedAt",
      "evidenceFingerprint",
    ]) &&
    value.status === "passed" &&
    value.providerErrorCode === 131056 &&
    value.cooldownScope === "pair" &&
    value.backoffPolicy === "meta-4-power-x" &&
    isCanonicalTimestamp(value.observedAt) &&
    isFingerprint(value.evidenceFingerprint);
}

function killSwitchEvidenceIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "providerRequestCount",
      "observedAt",
      "evidenceFingerprint",
    ]) &&
    value.status === "passed" &&
    value.providerRequestCount === 0 &&
    isCanonicalTimestamp(value.observedAt) &&
    isFingerprint(value.evidenceFingerprint);
}

function duplicateSafetyEvidenceIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "status",
      "queueDeliveryCount",
      "providerRequestCount",
      "observedAt",
      "evidenceFingerprint",
    ]) &&
    value.status === "passed" &&
    isSafeIntegerInRange(value.queueDeliveryCount, 2, 100) &&
    value.providerRequestCount === 1 &&
    isCanonicalTimestamp(value.observedAt) &&
    isFingerprint(value.evidenceFingerprint);
}

function credentialBoundaryEvidenceIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "source",
      "plaintextExposureFindings",
      "observedAt",
      "evidenceFingerprint",
    ]) &&
    value.source === "encrypted-vault" &&
    value.plaintextExposureFindings === 0 &&
    isCanonicalTimestamp(value.observedAt) &&
    isFingerprint(value.evidenceFingerprint);
}

function redactionEvidenceIsValid(value: unknown): boolean {
  return isRecord(value) &&
    hasExactKeys(value, [
      "testedFieldCount",
      "findings",
      "observedAt",
      "evidenceFingerprint",
    ]) &&
    isSafeIntegerInRange(value.testedFieldCount, 12, 1_000) &&
    value.findings === 0 && isCanonicalTimestamp(value.observedAt) &&
    isFingerprint(value.evidenceFingerprint);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function deriveBotReplyStagingEvidenceDigest(
  evidence: Omit<BotReplyStagingEvidence, "evidenceDigest">,
): string {
  return `bot_reply_staging_evidence_v1_${sha256(JSON.stringify(evidence))}`;
}

function parseEvidence(rawValue: string): BotReplyStagingEvidence | null {
  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "policyVersion",
      "environment",
      "provider",
      "connectionMode",
      "graphApiVersion",
      "verifiedAt",
      "expiresAt",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "appFingerprint",
      "wabaFingerprint",
      "phoneNumberFingerprint",
      "scenarios",
      "rateLimits",
      "killSwitch",
      "duplicateSafety",
      "credentialBoundary",
      "redaction",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    value.policyVersion !== botReplyStagingEvidencePolicyVersion ||
    value.environment !== "staging" ||
    value.provider !== "meta-whatsapp-cloud-api" ||
    value.connectionMode !== "approved-staging-waba" ||
    typeof value.graphApiVersion !== "string" ||
    !graphApiVersionPattern.test(value.graphApiVersion) ||
    !isCanonicalTimestamp(value.verifiedAt) ||
    !isCanonicalTimestamp(value.expiresAt) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    !isFingerprint(value.artifactDigest) ||
    !isFingerprint(value.appFingerprint) ||
    !isFingerprint(value.wabaFingerprint) ||
    !isFingerprint(value.phoneNumberFingerprint) ||
    !Array.isArray(value.scenarios) ||
    value.scenarios.length !== botReplyStagingScenarioRequirements.length ||
    !isRecord(value.rateLimits) ||
    !hasExactKeys(value.rateLimits, [
      "throughput",
      "providerRetry",
      "pairLimit",
    ]) ||
    !throughputEvidenceIsValid(value.rateLimits.throughput) ||
    !providerRetryEvidenceIsValid(value.rateLimits.providerRetry) ||
    !pairLimitEvidenceIsValid(value.rateLimits.pairLimit) ||
    !killSwitchEvidenceIsValid(value.killSwitch) ||
    !duplicateSafetyEvidenceIsValid(value.duplicateSafety) ||
    !credentialBoundaryEvidenceIsValid(value.credentialBoundary) ||
    !redactionEvidenceIsValid(value.redaction) ||
    typeof value.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(value.evidenceDigest)
  ) {
    return null;
  }

  for (
    let index = 0;
    index < botReplyStagingScenarioRequirements.length;
    index += 1
  ) {
    if (!scenarioEvidenceIsValid(
      value.scenarios[index],
      botReplyStagingScenarioRequirements[index],
    )) {
      return null;
    }
  }

  const parsedEvidence =
    value as unknown as BotReplyStagingEvidence;
  const fingerprints = [
    parsedEvidence.appFingerprint,
    parsedEvidence.wabaFingerprint,
    parsedEvidence.phoneNumberFingerprint,
    ...parsedEvidence.scenarios.map(
      (scenario) => scenario.evidenceFingerprint,
    ),
    parsedEvidence.rateLimits.throughput.evidenceFingerprint,
    parsedEvidence.rateLimits.providerRetry.evidenceFingerprint,
    parsedEvidence.rateLimits.pairLimit.evidenceFingerprint,
    parsedEvidence.killSwitch.evidenceFingerprint,
    parsedEvidence.duplicateSafety.evidenceFingerprint,
    parsedEvidence.credentialBoundary.evidenceFingerprint,
  ];
  if (new Set(fingerprints).size !== fingerprints.length) {
    return null;
  }

  const {
    evidenceDigest,
    ...unsignedEvidence
  } = parsedEvidence;
  if (
    evidenceDigest !==
      deriveBotReplyStagingEvidenceDigest(unsignedEvidence)
  ) {
    return null;
  }

  return parsedEvidence;
}

function invalidReport(
  status:
    | "disabled"
    | "invalid"
    | "not-yet-valid"
    | "expired"
    | "mismatch",
  code:
    | "BOT_REPLY_STAGING_EVIDENCE_REQUIRED"
    | "BOT_REPLY_STAGING_EVIDENCE_INVALID"
    | "BOT_REPLY_STAGING_EVIDENCE_NOT_YET_VALID"
    | "BOT_REPLY_STAGING_EVIDENCE_EXPIRED"
    | "BOT_REPLY_STAGING_EVIDENCE_MISMATCH",
): BotReplyStagingEvidenceReport {
  return Object.freeze({
    status,
    code,
    releaseId: null,
    commitSha: null,
    artifactDigest: null,
    verifiedAt: null,
    expiresAt: null,
    graphApiVersion: null,
    scenarioCount: 0,
    messagesPerSecond: null,
  });
}

export function inspectBotReplyStagingEvidence(
  environment: BotReplyStagingEvidenceEnvironment,
  now: Date = new Date(),
): BotReplyStagingEvidenceReport {
  const rawValue = environment.BOT_REPLY_STAGING_EVIDENCE_JSON;
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return invalidReport(
      "disabled",
      "BOT_REPLY_STAGING_EVIDENCE_REQUIRED",
    );
  }

  if (
    Buffer.byteLength(rawValue, "utf8") > maximumEvidenceLength ||
    !Number.isFinite(now.getTime())
  ) {
    return invalidReport(
      "invalid",
      "BOT_REPLY_STAGING_EVIDENCE_INVALID",
    );
  }

  const evidence = parseEvidence(rawValue);
  if (evidence === null) {
    return invalidReport(
      "invalid",
      "BOT_REPLY_STAGING_EVIDENCE_INVALID",
    );
  }

  const verifiedAt = Date.parse(evidence.verifiedAt);
  const expiresAt = Date.parse(evidence.expiresAt);
  if (
    expiresAt <= verifiedAt ||
    expiresAt - verifiedAt > maximumEvidenceLifetimeMilliseconds
  ) {
    return invalidReport(
      "invalid",
      "BOT_REPLY_STAGING_EVIDENCE_INVALID",
    );
  }
  if (now.getTime() < verifiedAt) {
    return invalidReport(
      "not-yet-valid",
      "BOT_REPLY_STAGING_EVIDENCE_NOT_YET_VALID",
    );
  }
  if (now.getTime() >= expiresAt) {
    return invalidReport(
      "expired",
      "BOT_REPLY_STAGING_EVIDENCE_EXPIRED",
    );
  }

  const observationTimes = [
    ...evidence.scenarios.map((scenario) => scenario.observedAt),
    evidence.rateLimits.throughput.observedAt,
    evidence.rateLimits.providerRetry.observedAt,
    evidence.rateLimits.pairLimit.observedAt,
    evidence.killSwitch.observedAt,
    evidence.duplicateSafety.observedAt,
    evidence.credentialBoundary.observedAt,
    evidence.redaction.observedAt,
  ].map((timestamp) => Date.parse(timestamp));
  if (observationTimes.some((observedAt) =>
    observedAt > verifiedAt ||
    verifiedAt - observedAt > maximumObservationAgeMilliseconds
  )) {
    return invalidReport(
      "invalid",
      "BOT_REPLY_STAGING_EVIDENCE_INVALID",
    );
  }

  if (
    environment.APP_DEPLOYED_COMMIT_SHA !== evidence.commitSha ||
    environment.APP_RELEASE_ID !== evidence.releaseId ||
    environment.APP_DEPLOYMENT_ARTIFACT_DIGEST !== evidence.artifactDigest
  ) {
    return invalidReport(
      "mismatch",
      "BOT_REPLY_STAGING_EVIDENCE_MISMATCH",
    );
  }

  return Object.freeze({
    status: "configured",
    code: "BOT_REPLY_STAGING_EVIDENCE_VERIFIED",
    releaseId: evidence.releaseId,
    commitSha: evidence.commitSha,
    artifactDigest: evidence.artifactDigest,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    graphApiVersion: evidence.graphApiVersion,
    scenarioCount: 7,
    messagesPerSecond:
      evidence.rateLimits.throughput.messagesPerSecond,
  });
}
