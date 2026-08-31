import {
  createHash,
} from "node:crypto";

import type {
  EncryptedMetaCredentialEnvelope,
  MetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import {
  createMetaCredentialVault,
  inspectMetaCredentialEncryptionConfiguration,
  type MetaCredentialEncryptionEnvironment,
  type MetaCredentialVaultOptions,
} from "../meta/metaCredentialVault.ts";
import {
  inspectBetterStackStagingEvidence,
  type BetterStackStagingEvidenceEnvironment,
} from "../operations/betterStackStagingEvidence.ts";
import type {
  BotReplyStagingCredentialBoundaryFact,
  BotReplyStagingRedactionFact,
  BotReplyStagingSecurityObservationReader,
} from "../operations/botReplyStagingObservationSource.ts";
import type {
  BotReplyStagingStepContext,
} from "../operations/botReplyStagingScenarioExecutor.ts";

const readerVersion =
  "connect-railway-bot-reply-staging-security-observation-reader-v1";
const operationKeyPattern =
  /^bot_reply_staging_step_v1_[a-f0-9]{64}$/;
const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const auditKeyPattern = /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const initializationVectorPattern = /^[A-Za-z0-9+/]{16}$/;
const ciphertextPattern = /^[A-Za-z0-9+/]{22,11998}={0,2}$/;

export type RailwayBotReplyStagingSecurityObservationEnvironment =
  MetaCredentialEncryptionEnvironment &
    BetterStackStagingEvidenceEnvironment;

export interface RailwayBotReplyStagingSecurityObservationClock {
  now(): Date;
}

export interface RailwayBotReplyStagingSecurityObservationReaderOptions {
  readonly environment:
    RailwayBotReplyStagingSecurityObservationEnvironment;
  readonly credentials: MetaCredentialRepository;
  readonly clock: RailwayBotReplyStagingSecurityObservationClock;
  readonly credentialVaultOptions?: MetaCredentialVaultOptions;
}

export type RailwayBotReplyStagingSecurityObservationErrorCode =
  | "BOT_REPLY_STAGING_SECURITY_CONFIGURATION_INVALID"
  | "BOT_REPLY_STAGING_SECURITY_CONTEXT_INVALID"
  | "BOT_REPLY_STAGING_SECURITY_CREDENTIAL_INVALID"
  | "BOT_REPLY_STAGING_SECURITY_TELEMETRY_INVALID";

export class RailwayBotReplyStagingSecurityObservationError extends Error {
  readonly code: RailwayBotReplyStagingSecurityObservationErrorCode;

  constructor(code: RailwayBotReplyStagingSecurityObservationErrorCode) {
    super(code);
    this.name = "RailwayBotReplyStagingSecurityObservationError";
    this.code = code;
  }
}

interface ObservationBinding {
  readonly schemaVersion: 1;
  readonly runKey: string;
  readonly operationKey: string;
  readonly targetTenantId: number;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly observedAt: string;
}

interface VerifiedRedactionEvidence {
  readonly observedAt: string;
  readonly testedFieldCount: number;
  readonly evidenceDigest: string;
}

function fail(
  code: RailwayBotReplyStagingSecurityObservationErrorCode,
): never {
  throw new RailwayBotReplyStagingSecurityObservationError(code);
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

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function canonicalTimestampMilliseconds(value: unknown): number | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString() === value
    ? milliseconds
    : null;
}

function requireOptions(
  options:
    Readonly<RailwayBotReplyStagingSecurityObservationReaderOptions>,
): void {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => ![
      "clock",
      "credentials",
      "credentialVaultOptions",
      "environment",
    ].includes(key)) ||
    !options.environment || typeof options.environment !== "object" ||
    typeof options.credentials?.findByTenantId !== "function" ||
    typeof options.credentials?.store !== "function" ||
    typeof options.clock?.now !== "function"
  ) {
    fail("BOT_REPLY_STAGING_SECURITY_CONFIGURATION_INVALID");
  }
}

function requireNow(
  clock: Readonly<RailwayBotReplyStagingSecurityObservationClock>,
): Date {
  let now: Date;
  try {
    now = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_SECURITY_CONFIGURATION_INVALID");
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    fail("BOT_REPLY_STAGING_SECURITY_CONFIGURATION_INVALID");
  }
  return now;
}

function requireContext(
  context: Readonly<BotReplyStagingStepContext>,
  environment:
    Readonly<RailwayBotReplyStagingSecurityObservationEnvironment>,
  now: Readonly<Date>,
): void {
  const requestedAt = canonicalTimestampMilliseconds(
    context?.run?.requestedAt,
  );
  const leaseExpiresAt = canonicalTimestampMilliseconds(
    context?.claim?.leaseExpiresAt,
  );
  if (
    !context || typeof context !== "object" ||
    !context.run || typeof context.run !== "object" ||
    !context.claim || typeof context.claim !== "object" ||
    typeof context.operationKey !== "string" ||
    !operationKeyPattern.test(context.operationKey) ||
    typeof context.run.runKey !== "string" ||
    !runKeyPattern.test(context.run.runKey) ||
    !positiveInteger(context.run.targetTenantId) ||
    !positiveInteger(context.run.expectedConnectionVersion) ||
    !positiveInteger(context.run.expectedPolicyVersion) ||
    typeof context.run.releaseId !== "string" ||
    !releaseIdPattern.test(context.run.releaseId) ||
    typeof context.run.commitSha !== "string" ||
    !commitShaPattern.test(context.run.commitSha) ||
    typeof context.run.artifactDigest !== "string" ||
    !fingerprintPattern.test(context.run.artifactDigest) ||
    typeof context.run.graphApiVersion !== "string" ||
    !graphApiVersionPattern.test(context.run.graphApiVersion) ||
    requestedAt === null || leaseExpiresAt === null ||
    leaseExpiresAt <= requestedAt ||
    now.getTime() < requestedAt || now.getTime() > leaseExpiresAt ||
    context.claim.runKey !== context.run.runKey ||
    typeof context.claim.auditKey !== "string" ||
    !auditKeyPattern.test(context.claim.auditKey) ||
    !positiveInteger(context.claim.claimVersion) ||
    environment.APP_RELEASE_ID !== context.run.releaseId ||
    environment.APP_DEPLOYED_COMMIT_SHA !== context.run.commitSha ||
    environment.APP_DEPLOYMENT_ARTIFACT_DIGEST !==
      context.run.artifactDigest
  ) {
    fail("BOT_REPLY_STAGING_SECURITY_CONTEXT_INVALID");
  }
}

function binding(
  context: Readonly<BotReplyStagingStepContext>,
  observedAt: string,
): ObservationBinding {
  return {
    schemaVersion: 1,
    runKey: context.run.runKey,
    operationKey: context.operationKey,
    targetTenantId: context.run.targetTenantId,
    connectionVersion: context.run.expectedConnectionVersion,
    policyVersion: context.run.expectedPolicyVersion,
    releaseId: context.run.releaseId,
    commitSha: context.run.commitSha,
    artifactDigest: context.run.artifactDigest,
    graphApiVersion: context.run.graphApiVersion,
    observedAt,
  };
}

function recordDigest(
  domain: "credential-boundary" | "redaction",
  observationBinding: Readonly<ObservationBinding>,
  details: readonly (string | number)[],
): string {
  const digest = createHash("sha256")
    .update(readerVersion)
    .update("\0")
    .update(domain);
  for (const value of [
    observationBinding.runKey,
    observationBinding.operationKey,
    observationBinding.targetTenantId,
    observationBinding.connectionVersion,
    observationBinding.policyVersion,
    observationBinding.releaseId,
    observationBinding.commitSha,
    observationBinding.artifactDigest,
    observationBinding.graphApiVersion,
    observationBinding.observedAt,
    ...details,
  ]) {
    digest.update("\0").update(String(value));
  }
  return `sha256:${digest.digest("hex")}`;
}

function requireEnvelope(
  value: EncryptedMetaCredentialEnvelope | null,
  tenantId: number,
  now: Readonly<Date>,
): Readonly<EncryptedMetaCredentialEnvelope> {
  if (!isRecord(value) || !hasExactKeys(value, [
    "ciphertext",
    "createdAt",
    "initializationVector",
    "keyVersion",
    "tenantId",
    "updatedAt",
  ])) {
    fail("BOT_REPLY_STAGING_SECURITY_CREDENTIAL_INVALID");
  }
  const createdAt = canonicalTimestampMilliseconds(value.createdAt);
  const updatedAt = canonicalTimestampMilliseconds(value.updatedAt);
  if (
    value.tenantId !== tenantId || value.keyVersion !== "v1" ||
    typeof value.initializationVector !== "string" ||
    !initializationVectorPattern.test(value.initializationVector) ||
    typeof value.ciphertext !== "string" || value.ciphertext.length < 24 ||
    value.ciphertext.length > 12_000 ||
    !ciphertextPattern.test(value.ciphertext) ||
    createdAt === null || updatedAt === null ||
    updatedAt < createdAt || updatedAt > now.getTime()
  ) {
    fail("BOT_REPLY_STAGING_SECURITY_CREDENTIAL_INVALID");
  }
  return value as unknown as Readonly<EncryptedMetaCredentialEnvelope>;
}

function readVerifiedRedactionEvidence(
  environment:
    Readonly<RailwayBotReplyStagingSecurityObservationEnvironment>,
  now: Readonly<Date>,
): VerifiedRedactionEvidence | null {
  const report = inspectBetterStackStagingEvidence(environment, now);
  if (report.status !== "configured") return null;
  const raw = environment.BETTER_STACK_STAGING_EVIDENCE_JSON;
  if (typeof raw !== "string") return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isRecord(value) || !isRecord(value.redaction) ||
    !hasExactKeys(value.redaction, ["findings", "testedFieldCount"]) ||
    !Number.isSafeInteger(value.redaction.testedFieldCount) ||
    Number(value.redaction.testedFieldCount) < 12 ||
    Number(value.redaction.testedFieldCount) > 100 ||
    value.redaction.findings !== 0 ||
    typeof value.evidenceDigest !== "string" ||
    !/^better_stack_staging_evidence_v1_[a-f0-9]{64}$/
      .test(value.evidenceDigest)
  ) {
    return null;
  }
  return Object.freeze({
    observedAt: report.verifiedAt,
    testedFieldCount: Number(value.redaction.testedFieldCount),
    evidenceDigest: value.evidenceDigest,
  });
}

export function createRailwayBotReplyStagingSecurityObservationReader(
  options:
    Readonly<RailwayBotReplyStagingSecurityObservationReaderOptions>,
): BotReplyStagingSecurityObservationReader {
  requireOptions(options);
  if (
    inspectMetaCredentialEncryptionConfiguration(options.environment) !==
      "configured"
  ) {
    fail("BOT_REPLY_STAGING_SECURITY_CONFIGURATION_INVALID");
  }
  let credentialVault;
  try {
    credentialVault = createMetaCredentialVault(
      options.credentials,
      options.environment,
      options.credentialVaultOptions,
    );
  } catch {
    fail("BOT_REPLY_STAGING_SECURITY_CONFIGURATION_INVALID");
  }

  return Object.freeze({
    isConfigured() {
      try {
        return readVerifiedRedactionEvidence(
          options.environment,
          requireNow(options.clock),
        ) !== null;
      } catch {
        return false;
      }
    },

    async readCredentialBoundary(
      context: Readonly<BotReplyStagingStepContext>,
    ): Promise<BotReplyStagingCredentialBoundaryFact> {
      const now = requireNow(options.clock);
      requireContext(context, options.environment, now);
      if (readVerifiedRedactionEvidence(options.environment, now) === null) {
        fail("BOT_REPLY_STAGING_SECURITY_TELEMETRY_INVALID");
      }
      let candidate: EncryptedMetaCredentialEnvelope | null;
      try {
        candidate = await options.credentials.findByTenantId(
          context.run.targetTenantId,
        );
      } catch {
        fail("BOT_REPLY_STAGING_SECURITY_CREDENTIAL_INVALID");
      }
      const envelope = requireEnvelope(
        candidate,
        context.run.targetTenantId,
        now,
      );
      try {
        await credentialVault.withAccessToken(
          context.run.targetTenantId,
          async (accessToken) => {
            if (
              typeof accessToken !== "string" ||
              accessToken.trim().length === 0 || accessToken.length > 8_192 ||
              accessToken === envelope.initializationVector ||
              accessToken === envelope.ciphertext
            ) {
              fail("BOT_REPLY_STAGING_SECURITY_CREDENTIAL_INVALID");
            }
          },
        );
      } catch (error) {
        if (error instanceof RailwayBotReplyStagingSecurityObservationError) {
          throw error;
        }
        fail("BOT_REPLY_STAGING_SECURITY_CREDENTIAL_INVALID");
      }
      const observedAt = now.toISOString();
      const observationBinding = binding(context, observedAt);
      const envelopeDigest = createHash("sha256")
        .update(envelope.keyVersion)
        .update("\0")
        .update(envelope.initializationVector)
        .update("\0")
        .update(envelope.ciphertext)
        .digest("hex");
      return Object.freeze({
        ...observationBinding,
        source: "encrypted-vault-audit",
        plaintextExposureFindings: 0,
        recordDigest: recordDigest(
          "credential-boundary",
          observationBinding,
          [envelope.createdAt, envelope.updatedAt, envelopeDigest],
        ),
      });
    },

    async readRedaction(
      context: Readonly<BotReplyStagingStepContext>,
    ): Promise<BotReplyStagingRedactionFact> {
      const now = requireNow(options.clock);
      requireContext(context, options.environment, now);
      const evidence = readVerifiedRedactionEvidence(
        options.environment,
        now,
      );
      if (evidence === null) {
        fail("BOT_REPLY_STAGING_SECURITY_TELEMETRY_INVALID");
      }
      const observedAtMilliseconds = canonicalTimestampMilliseconds(
        evidence.observedAt,
      );
      if (
        observedAtMilliseconds === null ||
        observedAtMilliseconds < Date.parse(context.run.requestedAt) ||
        observedAtMilliseconds > now.getTime() ||
        observedAtMilliseconds > Date.parse(context.claim.leaseExpiresAt)
      ) {
        fail("BOT_REPLY_STAGING_SECURITY_TELEMETRY_INVALID");
      }
      const observationBinding = binding(context, evidence.observedAt);
      return Object.freeze({
        ...observationBinding,
        source: "durable-telemetry-audit",
        testedFieldCount: evidence.testedFieldCount,
        findings: 0,
        recordDigest: recordDigest(
          "redaction",
          observationBinding,
          [evidence.testedFieldCount, evidence.evidenceDigest],
        ),
      });
    },
  });
}
