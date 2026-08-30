import {
  createHash,
} from "node:crypto";

export const betterStackServiceRequirements = Object.freeze([
  Object.freeze({
    serviceName: "connect-vercel-web",
    logs: true,
    traces: true,
    metrics: false,
  }),
  Object.freeze({
    serviceName: "connect-railway-api",
    logs: true,
    traces: true,
    metrics: true,
  }),
  Object.freeze({
    serviceName: "connect-railway-worker",
    logs: true,
    traces: true,
    metrics: true,
  }),
] as const);

export const betterStackTraceRequirements = Object.freeze([
  Object.freeze({
    scenario: "vercel-railway-api",
    spanCount: 2,
  }),
  Object.freeze({
    scenario: "campaign-message.send",
    spanCount: 2,
  }),
  Object.freeze({
    scenario: "message-template.submit",
    spanCount: 2,
  }),
  Object.freeze({
    scenario: "message-template.list",
    spanCount: 2,
  }),
  Object.freeze({
    scenario: "organization-invitation.list-create",
    spanCount: 3,
  }),
] as const);

export const betterStackMetricRequirements = Object.freeze([
  "connect.railway_api.requests",
  "connect.railway_api.duration",
  "connect.worker.events",
  "connect.worker.operation.duration",
  "connect.worker.provider.duration",
  "connect.worker.items",
] as const);

export const betterStackAlertRequirements = Object.freeze([
  "slo-breach",
  "insufficient-data",
] as const);

const maximumEvidenceLength = 48_000;
const maximumEvidenceLifetimeMilliseconds =
  24 * 60 * 60 * 1_000;
const maximumObservationAgeMilliseconds =
  24 * 60 * 60 * 1_000;
const maximumExerciseDurationMilliseconds =
  60 * 60 * 1_000;
const commitShaPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const evidenceDigestPattern =
  /^better_stack_staging_evidence_v1_[a-f0-9]{64}$/;

type BetterStackServiceName =
  (typeof betterStackServiceRequirements)[number]["serviceName"];
type BetterStackTraceScenario =
  (typeof betterStackTraceRequirements)[number]["scenario"];
type BetterStackMetricName =
  (typeof betterStackMetricRequirements)[number];
type BetterStackAlertScenario =
  (typeof betterStackAlertRequirements)[number];

export interface BetterStackServiceEvidence {
  serviceName: BetterStackServiceName;
  logs: boolean;
  traces: boolean;
  metrics: boolean;
}

export interface BetterStackTraceEvidence {
  scenario: BetterStackTraceScenario;
  status: "passed";
  spanCount: number;
  traceFingerprint: string;
}

export interface BetterStackMetricEvidence {
  metricName: BetterStackMetricName;
  sampleCount: number;
  seriesCount: number;
}

export interface BetterStackAlertEvidence {
  scenario: BetterStackAlertScenario;
  status: "delivered";
  triggeredAt: string;
  deliveredAt: string;
  deliveryFingerprint: string;
}

export interface BetterStackStagingEvidence {
  schemaVersion: 1;
  policyVersion: 1;
  environment: "staging";
  provider: "better-stack";
  protocol: "otlp-http";
  verifiedAt: string;
  expiresAt: string;
  releaseId: string;
  commitSha: string;
  artifactDigest: string;
  sourceFingerprint: string;
  services: readonly BetterStackServiceEvidence[];
  traces: readonly BetterStackTraceEvidence[];
  metrics: readonly BetterStackMetricEvidence[];
  redaction: {
    testedFieldCount: number;
    findings: 0;
  };
  alerts: readonly BetterStackAlertEvidence[];
  retentionPolicyDigest: string;
  costPolicyDigest: string;
  outageRehearsal: {
    status: "passed";
    startedAt: string;
    completedAt: string;
    businessImpact: "none";
  };
  evidenceDigest: string;
}

export interface BetterStackStagingEvidenceEnvironment {
  APP_DEPLOYED_COMMIT_SHA?: string;
  APP_RELEASE_ID?: string;
  APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
  BETTER_STACK_STAGING_EVIDENCE_JSON?: string;
}

export type BetterStackStagingEvidenceReport = Readonly<
  | {
      status: "configured";
      code: "BETTER_STACK_STAGING_EVIDENCE_VERIFIED";
      releaseId: string;
      commitSha: string;
      artifactDigest: string;
      verifiedAt: string;
      expiresAt: string;
      serviceCount: 3;
      traceScenarioCount: 5;
      metricCount: 6;
      alertTestCount: 2;
    }
  | {
      status:
        | "disabled"
        | "invalid"
        | "not-yet-valid"
        | "expired"
        | "mismatch";
      code:
        | "BETTER_STACK_STAGING_EVIDENCE_REQUIRED"
        | "BETTER_STACK_STAGING_EVIDENCE_INVALID"
        | "BETTER_STACK_STAGING_EVIDENCE_NOT_YET_VALID"
        | "BETTER_STACK_STAGING_EVIDENCE_EXPIRED"
        | "BETTER_STACK_STAGING_EVIDENCE_MISMATCH";
      releaseId: null;
      commitSha: null;
      artifactDigest: null;
      verifiedAt: null;
      expiresAt: null;
      serviceCount: 0;
      traceScenarioCount: 0;
      metricCount: 0;
      alertTestCount: 0;
    }
>;

function sha256(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
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

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function isCanonicalTimestamp(
  value: unknown,
): value is string {
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
    (value as number) >= minimum &&
    (value as number) <= maximum;
}

function canonicalEvidenceIdentity(
  evidence: Omit<BetterStackStagingEvidence, "evidenceDigest">,
): string {
  return JSON.stringify({
    schemaVersion: evidence.schemaVersion,
    policyVersion: evidence.policyVersion,
    environment: evidence.environment,
    provider: evidence.provider,
    protocol: evidence.protocol,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    releaseId: evidence.releaseId,
    commitSha: evidence.commitSha,
    artifactDigest: evidence.artifactDigest,
    sourceFingerprint: evidence.sourceFingerprint,
    services: evidence.services.map((service) => ({
      serviceName: service.serviceName,
      logs: service.logs,
      traces: service.traces,
      metrics: service.metrics,
    })),
    traces: evidence.traces.map((trace) => ({
      scenario: trace.scenario,
      status: trace.status,
      spanCount: trace.spanCount,
      traceFingerprint: trace.traceFingerprint,
    })),
    metrics: evidence.metrics.map((metric) => ({
      metricName: metric.metricName,
      sampleCount: metric.sampleCount,
      seriesCount: metric.seriesCount,
    })),
    redaction: {
      testedFieldCount: evidence.redaction.testedFieldCount,
      findings: evidence.redaction.findings,
    },
    alerts: evidence.alerts.map((alert) => ({
      scenario: alert.scenario,
      status: alert.status,
      triggeredAt: alert.triggeredAt,
      deliveredAt: alert.deliveredAt,
      deliveryFingerprint: alert.deliveryFingerprint,
    })),
    retentionPolicyDigest: evidence.retentionPolicyDigest,
    costPolicyDigest: evidence.costPolicyDigest,
    outageRehearsal: {
      status: evidence.outageRehearsal.status,
      startedAt: evidence.outageRehearsal.startedAt,
      completedAt: evidence.outageRehearsal.completedAt,
      businessImpact: evidence.outageRehearsal.businessImpact,
    },
  });
}

export function deriveBetterStackStagingEvidenceDigest(
  evidence: Omit<BetterStackStagingEvidence, "evidenceDigest">,
): string {
  return `better_stack_staging_evidence_v1_${sha256(
    canonicalEvidenceIdentity(evidence),
  )}`;
}

function parseServiceEvidence(
  value: unknown,
  index: number,
): BetterStackServiceEvidence | null {
  const requirement = betterStackServiceRequirements[index];
  if (
    requirement === undefined ||
    !isPlainObject(value) ||
    !hasExactKeys(value, ["serviceName", "logs", "traces", "metrics"]) ||
    value.serviceName !== requirement.serviceName ||
    value.logs !== requirement.logs ||
    value.traces !== requirement.traces ||
    value.metrics !== requirement.metrics
  ) {
    return null;
  }

  return {
    serviceName: requirement.serviceName,
    logs: requirement.logs,
    traces: requirement.traces,
    metrics: requirement.metrics,
  };
}

function parseTraceEvidence(
  value: unknown,
  index: number,
): BetterStackTraceEvidence | null {
  const requirement = betterStackTraceRequirements[index];
  if (
    requirement === undefined ||
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "scenario",
      "status",
      "spanCount",
      "traceFingerprint",
    ]) ||
    value.scenario !== requirement.scenario ||
    value.status !== "passed" ||
    value.spanCount !== requirement.spanCount ||
    typeof value.traceFingerprint !== "string" ||
    !fingerprintPattern.test(value.traceFingerprint)
  ) {
    return null;
  }

  return {
    scenario: requirement.scenario,
    status: "passed",
    spanCount: requirement.spanCount,
    traceFingerprint: value.traceFingerprint,
  };
}

function parseMetricEvidence(
  value: unknown,
  index: number,
): BetterStackMetricEvidence | null {
  const metricName = betterStackMetricRequirements[index];
  if (
    metricName === undefined ||
    !isPlainObject(value) ||
    !hasExactKeys(value, ["metricName", "sampleCount", "seriesCount"]) ||
    value.metricName !== metricName ||
    !isSafeIntegerInRange(value.sampleCount, 1, 1_000_000) ||
    !isSafeIntegerInRange(value.seriesCount, 1, 128)
  ) {
    return null;
  }

  return {
    metricName,
    sampleCount: value.sampleCount,
    seriesCount: value.seriesCount,
  };
}

function parseAlertEvidence(
  value: unknown,
  index: number,
): BetterStackAlertEvidence | null {
  const scenario = betterStackAlertRequirements[index];
  if (
    scenario === undefined ||
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "scenario",
      "status",
      "triggeredAt",
      "deliveredAt",
      "deliveryFingerprint",
    ]) ||
    value.scenario !== scenario ||
    value.status !== "delivered" ||
    !isCanonicalTimestamp(value.triggeredAt) ||
    !isCanonicalTimestamp(value.deliveredAt) ||
    typeof value.deliveryFingerprint !== "string" ||
    !fingerprintPattern.test(value.deliveryFingerprint)
  ) {
    return null;
  }

  return {
    scenario,
    status: "delivered",
    triggeredAt: value.triggeredAt,
    deliveredAt: value.deliveredAt,
    deliveryFingerprint: value.deliveryFingerprint,
  };
}

function parseEvidence(rawValue: string): BetterStackStagingEvidence | null {
  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    return null;
  }

  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "policyVersion",
      "environment",
      "provider",
      "protocol",
      "verifiedAt",
      "expiresAt",
      "releaseId",
      "commitSha",
      "artifactDigest",
      "sourceFingerprint",
      "services",
      "traces",
      "metrics",
      "redaction",
      "alerts",
      "retentionPolicyDigest",
      "costPolicyDigest",
      "outageRehearsal",
      "evidenceDigest",
    ]) ||
    value.schemaVersion !== 1 ||
    value.policyVersion !== 1 ||
    value.environment !== "staging" ||
    value.provider !== "better-stack" ||
    value.protocol !== "otlp-http" ||
    !isCanonicalTimestamp(value.verifiedAt) ||
    !isCanonicalTimestamp(value.expiresAt) ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    typeof value.artifactDigest !== "string" ||
    !fingerprintPattern.test(value.artifactDigest) ||
    typeof value.sourceFingerprint !== "string" ||
    !fingerprintPattern.test(value.sourceFingerprint) ||
    !Array.isArray(value.services) ||
    value.services.length !== betterStackServiceRequirements.length ||
    !Array.isArray(value.traces) ||
    value.traces.length !== betterStackTraceRequirements.length ||
    !Array.isArray(value.metrics) ||
    value.metrics.length !== betterStackMetricRequirements.length ||
    !Array.isArray(value.alerts) ||
    value.alerts.length !== betterStackAlertRequirements.length ||
    !isPlainObject(value.redaction) ||
    !hasExactKeys(value.redaction, ["testedFieldCount", "findings"]) ||
    !isSafeIntegerInRange(value.redaction.testedFieldCount, 1, 100) ||
    value.redaction.findings !== 0 ||
    typeof value.retentionPolicyDigest !== "string" ||
    !fingerprintPattern.test(value.retentionPolicyDigest) ||
    typeof value.costPolicyDigest !== "string" ||
    !fingerprintPattern.test(value.costPolicyDigest) ||
    value.retentionPolicyDigest === value.costPolicyDigest ||
    !isPlainObject(value.outageRehearsal) ||
    !hasExactKeys(value.outageRehearsal, [
      "status",
      "startedAt",
      "completedAt",
      "businessImpact",
    ]) ||
    value.outageRehearsal.status !== "passed" ||
    !isCanonicalTimestamp(value.outageRehearsal.startedAt) ||
    !isCanonicalTimestamp(value.outageRehearsal.completedAt) ||
    value.outageRehearsal.businessImpact !== "none" ||
    typeof value.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(value.evidenceDigest)
  ) {
    return null;
  }

  const services = value.services.map(parseServiceEvidence);
  const traces = value.traces.map(parseTraceEvidence);
  const metrics = value.metrics.map(parseMetricEvidence);
  const alerts = value.alerts.map(parseAlertEvidence);
  if (
    services.some((item) => item === null) ||
    traces.some((item) => item === null) ||
    metrics.some((item) => item === null) ||
    alerts.some((item) => item === null)
  ) {
    return null;
  }

  const fingerprints = [
    value.artifactDigest,
    value.sourceFingerprint,
    value.retentionPolicyDigest,
    value.costPolicyDigest,
    ...traces.map((item) => item?.traceFingerprint),
    ...alerts.map((item) => item?.deliveryFingerprint),
  ];
  if (new Set(fingerprints).size !== fingerprints.length) {
    return null;
  }

  const evidenceWithoutDigest = {
    schemaVersion: 1 as const,
    policyVersion: 1 as const,
    environment: "staging" as const,
    provider: "better-stack" as const,
    protocol: "otlp-http" as const,
    verifiedAt: value.verifiedAt,
    expiresAt: value.expiresAt,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    artifactDigest: value.artifactDigest,
    sourceFingerprint: value.sourceFingerprint,
    services: services as BetterStackServiceEvidence[],
    traces: traces as BetterStackTraceEvidence[],
    metrics: metrics as BetterStackMetricEvidence[],
    redaction: {
      testedFieldCount: value.redaction.testedFieldCount,
      findings: 0 as const,
    },
    alerts: alerts as BetterStackAlertEvidence[],
    retentionPolicyDigest: value.retentionPolicyDigest,
    costPolicyDigest: value.costPolicyDigest,
    outageRehearsal: {
      status: "passed" as const,
      startedAt: value.outageRehearsal.startedAt,
      completedAt: value.outageRehearsal.completedAt,
      businessImpact: "none" as const,
    },
  };

  if (
    deriveBetterStackStagingEvidenceDigest(evidenceWithoutDigest) !==
      value.evidenceDigest
  ) {
    return null;
  }

  return {
    ...evidenceWithoutDigest,
    evidenceDigest: value.evidenceDigest,
  };
}

function invalidReport(
  status:
    | "disabled"
    | "invalid"
    | "not-yet-valid"
    | "expired"
    | "mismatch",
  code:
    | "BETTER_STACK_STAGING_EVIDENCE_REQUIRED"
    | "BETTER_STACK_STAGING_EVIDENCE_INVALID"
    | "BETTER_STACK_STAGING_EVIDENCE_NOT_YET_VALID"
    | "BETTER_STACK_STAGING_EVIDENCE_EXPIRED"
    | "BETTER_STACK_STAGING_EVIDENCE_MISMATCH",
): BetterStackStagingEvidenceReport {
  return Object.freeze({
    status,
    code,
    releaseId: null,
    commitSha: null,
    artifactDigest: null,
    verifiedAt: null,
    expiresAt: null,
    serviceCount: 0,
    traceScenarioCount: 0,
    metricCount: 0,
    alertTestCount: 0,
  });
}

export function inspectBetterStackStagingEvidence(
  environment: BetterStackStagingEvidenceEnvironment,
  now: Date = new Date(),
): BetterStackStagingEvidenceReport {
  const rawValue = environment.BETTER_STACK_STAGING_EVIDENCE_JSON;
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return invalidReport(
      "disabled",
      "BETTER_STACK_STAGING_EVIDENCE_REQUIRED",
    );
  }

  if (
    Buffer.byteLength(rawValue, "utf8") > maximumEvidenceLength ||
    !Number.isFinite(now.getTime())
  ) {
    return invalidReport(
      "invalid",
      "BETTER_STACK_STAGING_EVIDENCE_INVALID",
    );
  }

  const evidence = parseEvidence(rawValue);
  if (evidence === null) {
    return invalidReport(
      "invalid",
      "BETTER_STACK_STAGING_EVIDENCE_INVALID",
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
      "BETTER_STACK_STAGING_EVIDENCE_INVALID",
    );
  }
  if (now.getTime() < verifiedAt) {
    return invalidReport(
      "not-yet-valid",
      "BETTER_STACK_STAGING_EVIDENCE_NOT_YET_VALID",
    );
  }
  if (now.getTime() >= expiresAt) {
    return invalidReport(
      "expired",
      "BETTER_STACK_STAGING_EVIDENCE_EXPIRED",
    );
  }

  const observations = [
    ...evidence.alerts.flatMap((alert) => [
      [Date.parse(alert.triggeredAt), Date.parse(alert.deliveredAt)],
    ]),
    [
      Date.parse(evidence.outageRehearsal.startedAt),
      Date.parse(evidence.outageRehearsal.completedAt),
    ],
  ];
  if (
    observations.some(([startedAt, completedAt]) =>
      completedAt < startedAt ||
      completedAt - startedAt > maximumExerciseDurationMilliseconds ||
      completedAt > verifiedAt ||
      verifiedAt - completedAt > maximumObservationAgeMilliseconds
    )
  ) {
    return invalidReport(
      "invalid",
      "BETTER_STACK_STAGING_EVIDENCE_INVALID",
    );
  }

  if (
    environment.APP_DEPLOYED_COMMIT_SHA !== evidence.commitSha ||
    environment.APP_RELEASE_ID !== evidence.releaseId ||
    environment.APP_DEPLOYMENT_ARTIFACT_DIGEST !== evidence.artifactDigest
  ) {
    return invalidReport(
      "mismatch",
      "BETTER_STACK_STAGING_EVIDENCE_MISMATCH",
    );
  }

  return Object.freeze({
    status: "configured",
    code: "BETTER_STACK_STAGING_EVIDENCE_VERIFIED",
    releaseId: evidence.releaseId,
    commitSha: evidence.commitSha,
    artifactDigest: evidence.artifactDigest,
    verifiedAt: evidence.verifiedAt,
    expiresAt: evidence.expiresAt,
    serviceCount: 3,
    traceScenarioCount: 5,
    metricCount: 6,
    alertTestCount: 2,
  });
}
