import { createHash } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  botReplyStagingReceiptAttestationPolicyVersion,
  deriveBotReplyStagingReceiptAttestationPayloadDigest,
  deriveBotReplyStagingReceiptDigest,
  verifyBotReplyStagingReceiptAttestation,
  type BotReplyStagingReceiptAttestation,
  type BotReplyStagingReceiptAttestationTrustedKey,
} from "../operations/botReplyStagingReceiptAttestation.ts";

export const railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion =
  "connect-railway-bot-reply-staging-attested-release-evidence-v2" as const;

export const railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion =
  "connect-railway-bot-reply-staging-cross-service-activation-v1" as const;

export const railwayBotReplyStagingAttestedReleaseEvidenceCheckIds =
  Object.freeze([
    "api-configuration",
    "worker-activation",
    "runtime-environment-alignment",
    "tenant-alignment",
  ] as const);

export type RailwayBotReplyStagingAttestedReleaseEvidenceCheckId =
  typeof railwayBotReplyStagingAttestedReleaseEvidenceCheckIds[number];

export interface RailwayBotReplyStagingAttestedReleaseEvidenceReadyReport {
  readonly schemaVersion: 1;
  readonly activationVersion:
    typeof railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion;
  readonly status: "ready";
  readonly code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED";
  readonly passedCheckCount: 4;
  readonly requiredCheckCount: 4;
  readonly checks: readonly Readonly<{
    id: RailwayBotReplyStagingAttestedReleaseEvidenceCheckId;
    status: "passed";
  }>[];
}

export interface RailwayBotReplyStagingAttestedReleaseEvidenceCore {
  readonly activationVersion:
    typeof railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion;
  readonly artifactDigest: string;
  readonly attestationAuditKey: string;
  readonly checkCount: 4;
  readonly checks: readonly Readonly<{
    id: RailwayBotReplyStagingAttestedReleaseEvidenceCheckId;
    status: "passed";
  }>[];
  readonly claimVersion: number;
  readonly commitSha: string;
  readonly environment: "staging";
  readonly expiresAt: string;
  readonly expectedEvidenceVersion: number;
  readonly releaseId: string;
  readonly requestDigest: string;
  readonly receiptDigest: string;
  readonly runKey: string;
  readonly source: "railway-api-worker-cross-service-preflight";
  readonly verifiedAt: string;
}

export interface RailwayBotReplyStagingAttestedReleaseEvidence {
  readonly schemaVersion: 2;
  readonly policyVersion:
    typeof railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion;
  readonly core: Readonly<
    RailwayBotReplyStagingAttestedReleaseEvidenceCore
  >;
  readonly evidenceCoreDigest: string;
  readonly attestation: Readonly<BotReplyStagingReceiptAttestation>;
  readonly attestationPayloadDigest: string;
  readonly evidenceDigest: string;
}

export interface CreateRailwayBotReplyStagingAttestedReleaseEvidenceCoreInput {
  readonly report:
    Readonly<RailwayBotReplyStagingAttestedReleaseEvidenceReadyReport>;
  readonly receipt: unknown;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly runKey: string;
  readonly claimVersion: number;
  readonly requestDigest: string;
  readonly expectedEvidenceVersion: number;
  readonly attestationAuditKey: string;
  readonly lifetimeSeconds: number;
}

export interface RailwayBotReplyStagingAttestedReleaseEvidenceExpectedBinding {
  readonly trustedKeyId: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly runKey: string;
  readonly claimVersion: number;
  readonly requestDigest: string;
  readonly expectedEvidenceVersion: number;
  readonly attestationAuditKey: string;
}

export type RailwayBotReplyStagingAttestedReleaseEvidenceInspection =
  Readonly<
    | {
        status: "signature-valid-only";
        code:
          "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_SIGNATURE_VALID_ONLY";
        releaseId: string;
        runKey: string;
        evidenceCoreDigest: string;
        attestationPayloadDigest: string;
        evidenceDigest: string;
        verifiedAt: string;
        expiresAt: string;
        replayProtected: false;
        evidence: Readonly<RailwayBotReplyStagingAttestedReleaseEvidence>;
      }
    | {
        status: "blocked";
        code:
          | "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_INVALID"
          | "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_BINDING_MISMATCH"
          | "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_ATTESTATION_REJECTED";
        attestationCode: string | null;
        releaseId: null;
        runKey: null;
        evidenceCoreDigest: null;
        attestationPayloadDigest: null;
        evidenceDigest: null;
        verifiedAt: null;
        expiresAt: null;
        replayProtected: false;
        evidence: null;
      }
  >;

export type RailwayBotReplyStagingAttestedReleaseEvidenceErrorCode =
  | "input-invalid"
  | "binding-mismatch"
  | "clock-invalid";

export class RailwayBotReplyStagingAttestedReleaseEvidenceError
  extends Error {
  readonly code: RailwayBotReplyStagingAttestedReleaseEvidenceErrorCode;

  constructor(
    code: RailwayBotReplyStagingAttestedReleaseEvidenceErrorCode,
  ) {
    super(`Railway Bot reply staging attested evidence failed: ${code}`);
    this.name = "RailwayBotReplyStagingAttestedReleaseEvidenceError";
    this.code = code;
  }
}

const minimumLifetimeMilliseconds = 60 * 1_000;
const maximumLifetimeMilliseconds = 15 * 60 * 1_000;
export const railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes =
  8_192 as const;
const maximumCanonicalDepth = 8;
const maximumCanonicalNodes = 256;
const maximumCanonicalBytes = 64_000;
const maximumVersion = 2_147_483_647;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const attestationAuditKeyPattern =
  /^bot_reply_staging_attestation_audit_v1_[a-f0-9]{64}$/;
const keyIdPattern = /^bot_reply_staging_worker_key_v1_[a-f0-9]{64}$/;
const noncePattern =
  /^bot_reply_staging_attestation_nonce_v1_[a-f0-9]{64}$/;
const signaturePattern = /^ed25519:[A-Za-z0-9_-]{86}$/;
const evidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v2_[a-f0-9]{64}$/;

const coreKeys = Object.freeze([
  "activationVersion",
  "artifactDigest",
  "attestationAuditKey",
  "checkCount",
  "checks",
  "claimVersion",
  "commitSha",
  "environment",
  "expiresAt",
  "expectedEvidenceVersion",
  "releaseId",
  "requestDigest",
  "receiptDigest",
  "runKey",
  "source",
  "verifiedAt",
]);
const checkKeys = Object.freeze(["id", "status"]);
const readyReportKeys = Object.freeze([
  "activationVersion",
  "checks",
  "code",
  "passedCheckCount",
  "requiredCheckCount",
  "schemaVersion",
  "status",
]);
const coreInputKeys = Object.freeze([
  "artifactDigest",
  "attestationAuditKey",
  "claimVersion",
  "commitSha",
  "expectedEvidenceVersion",
  "lifetimeSeconds",
  "receipt",
  "releaseId",
  "report",
  "requestDigest",
  "runKey",
]);
const assemblyInputKeys = Object.freeze(["attestation", "core"]);
const expectedBindingKeys = Object.freeze([
  "artifactDigest",
  "attestationAuditKey",
  "claimVersion",
  "commitSha",
  "expectedEvidenceVersion",
  "releaseId",
  "requestDigest",
  "runKey",
  "trustedKeyId",
]);
const inspectionInputKeys = Object.freeze([
  "clock",
  "evidence",
  "expected",
  "receipt",
  "trustedKeys",
]);
const clockKeys = Object.freeze(["now"]);
const envelopeKeys = Object.freeze([
  "attestation",
  "attestationPayloadDigest",
  "core",
  "evidenceCoreDigest",
  "evidenceDigest",
  "policyVersion",
  "schemaVersion",
]);
const attestationKeys = Object.freeze([
  "algorithm",
  "artifactDigest",
  "auditKey",
  "audience",
  "commitSha",
  "claimVersion",
  "environment",
  "evidenceCoreDigest",
  "expectedEvidenceVersion",
  "expiresAt",
  "issuedAt",
  "keyId",
  "nonce",
  "nonceSequence",
  "policyVersion",
  "receiptDigest",
  "releaseId",
  "requestDigest",
  "runKey",
  "schemaVersion",
  "signature",
  "signedAt",
]);

function fail(
  code: RailwayBotReplyStagingAttestedReleaseEvidenceErrorCode,
): never {
  throw new RailwayBotReplyStagingAttestedReleaseEvidenceError(code);
}

function snapshotDataRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" || value === null || Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return null;
  }
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of ownKeys as string[]) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function snapshotExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, unknown>> | null {
  const snapshot = snapshotDataRecord(value);
  if (snapshot === null) return null;
  const actualKeys = Object.keys(snapshot).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return actualKeys.length === sortedExpectedKeys.length &&
      actualKeys.every((key, index) => key === sortedExpectedKeys[index])
    ? snapshot
    : null;
}

function snapshotDenseArray(
  value: unknown,
  maximumLength: number,
): readonly unknown[] | null {
  if (
    typeof value !== "object" || value === null || !Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return null;
  }
  try {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0 || lengthDescriptor.value > maximumLength
    ) {
      return null;
    }
    const length = lengthDescriptor.value as number;
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== length + 1 || !ownKeys.includes("length") ||
      ownKeys.some((key) => typeof key !== "string")
    ) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const entries: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      entries.push(descriptor.value);
    }
    return Object.freeze(entries);
  } catch {
    return null;
  }
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function positiveVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 &&
    Number(value) <= maximumVersion;
}

function expectedVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 &&
    Number(value) < maximumVersion;
}

function parseChecks(value: unknown): RailwayBotReplyStagingAttestedReleaseEvidenceCore["checks"] | null {
  const entries = snapshotDenseArray(value, 4);
  if (entries === null || entries.length !== 4) return null;
  const checks: Array<Readonly<{
    id: RailwayBotReplyStagingAttestedReleaseEvidenceCheckId;
    status: "passed";
  }>> = [];
  for (let index = 0; index < entries.length; index += 1) {
    const snapshot = snapshotExactRecord(entries[index], checkKeys);
    const expectedId =
      railwayBotReplyStagingAttestedReleaseEvidenceCheckIds[index];
    if (
      snapshot === null || snapshot.id !== expectedId ||
      snapshot.status !== "passed"
    ) {
      return null;
    }
    checks.push(Object.freeze({ id: expectedId, status: "passed" as const }));
  }
  return Object.freeze(checks);
}

function parseReadyReport(
  value: unknown,
): RailwayBotReplyStagingAttestedReleaseEvidenceReadyReport | null {
  const snapshot = snapshotExactRecord(value, readyReportKeys);
  const checks = snapshot === null ? null : parseChecks(snapshot.checks);
  if (
    snapshot === null || checks === null || snapshot.schemaVersion !== 1 ||
    snapshot.activationVersion !==
      railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion ||
    snapshot.status !== "ready" ||
    snapshot.code !== "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED" ||
    snapshot.passedCheckCount !== 4 || snapshot.requiredCheckCount !== 4
  ) {
    return null;
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    activationVersion:
      railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
    status: "ready" as const,
    code: "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED" as const,
    passedCheckCount: 4 as const,
    requiredCheckCount: 4 as const,
    checks,
  });
}

function parseCore(
  value: unknown,
): RailwayBotReplyStagingAttestedReleaseEvidenceCore | null {
  const snapshot = snapshotExactRecord(value, coreKeys);
  const checks = snapshot === null ? null : parseChecks(snapshot.checks);
  if (
    snapshot === null || checks === null ||
    snapshot.activationVersion !==
      railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion ||
    typeof snapshot.artifactDigest !== "string" ||
    !digestPattern.test(snapshot.artifactDigest) ||
    typeof snapshot.attestationAuditKey !== "string" ||
    !attestationAuditKeyPattern.test(snapshot.attestationAuditKey) ||
    snapshot.checkCount !== 4 || !positiveVersion(snapshot.claimVersion) ||
    typeof snapshot.commitSha !== "string" ||
    !commitShaPattern.test(snapshot.commitSha) ||
    snapshot.environment !== "staging" ||
    !canonicalTimestamp(snapshot.expiresAt) ||
    !expectedVersion(snapshot.expectedEvidenceVersion) ||
    typeof snapshot.releaseId !== "string" ||
    !releaseIdPattern.test(snapshot.releaseId) ||
    typeof snapshot.requestDigest !== "string" ||
    !digestPattern.test(snapshot.requestDigest) ||
    typeof snapshot.receiptDigest !== "string" ||
    !digestPattern.test(snapshot.receiptDigest) ||
    typeof snapshot.runKey !== "string" ||
    !runKeyPattern.test(snapshot.runKey) ||
    snapshot.source !== "railway-api-worker-cross-service-preflight" ||
    !canonicalTimestamp(snapshot.verifiedAt)
  ) {
    return null;
  }
  const lifetime = Date.parse(snapshot.expiresAt) -
    Date.parse(snapshot.verifiedAt);
  if (
    lifetime < minimumLifetimeMilliseconds ||
    lifetime > maximumLifetimeMilliseconds
  ) {
    return null;
  }
  return Object.freeze({
    activationVersion:
      railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
    artifactDigest: snapshot.artifactDigest,
    attestationAuditKey: snapshot.attestationAuditKey,
    checkCount: 4 as const,
    checks,
    claimVersion: snapshot.claimVersion,
    commitSha: snapshot.commitSha,
    environment: "staging" as const,
    expiresAt: snapshot.expiresAt,
    expectedEvidenceVersion: snapshot.expectedEvidenceVersion,
    releaseId: snapshot.releaseId,
    requestDigest: snapshot.requestDigest,
    receiptDigest: snapshot.receiptDigest,
    runKey: snapshot.runKey,
    source: "railway-api-worker-cross-service-preflight" as const,
    verifiedAt: snapshot.verifiedAt,
  });
}

function parseAttestation(
  value: unknown,
): BotReplyStagingReceiptAttestation | null {
  const snapshot = snapshotExactRecord(value, attestationKeys);
  if (
    snapshot === null || snapshot.schemaVersion !== 1 ||
    snapshot.policyVersion !==
      botReplyStagingReceiptAttestationPolicyVersion ||
    snapshot.algorithm !== "Ed25519" ||
    snapshot.audience !== "connect-release-evidence-builder" ||
    snapshot.environment !== "staging" ||
    typeof snapshot.keyId !== "string" ||
    !keyIdPattern.test(snapshot.keyId) ||
    typeof snapshot.runKey !== "string" ||
    !runKeyPattern.test(snapshot.runKey) ||
    !positiveVersion(snapshot.claimVersion) ||
    typeof snapshot.requestDigest !== "string" ||
    !digestPattern.test(snapshot.requestDigest) ||
    typeof snapshot.releaseId !== "string" ||
    !releaseIdPattern.test(snapshot.releaseId) ||
    typeof snapshot.commitSha !== "string" ||
    !commitShaPattern.test(snapshot.commitSha) ||
    typeof snapshot.artifactDigest !== "string" ||
    !digestPattern.test(snapshot.artifactDigest) ||
    !expectedVersion(snapshot.expectedEvidenceVersion) ||
    typeof snapshot.receiptDigest !== "string" ||
    !digestPattern.test(snapshot.receiptDigest) ||
    typeof snapshot.evidenceCoreDigest !== "string" ||
    !digestPattern.test(snapshot.evidenceCoreDigest) ||
    typeof snapshot.auditKey !== "string" ||
    !attestationAuditKeyPattern.test(snapshot.auditKey) ||
    typeof snapshot.nonce !== "string" ||
    !noncePattern.test(snapshot.nonce) ||
    !positiveVersion(snapshot.nonceSequence) ||
    snapshot.nonceSequence !== snapshot.claimVersion ||
    !canonicalTimestamp(snapshot.issuedAt) ||
    !canonicalTimestamp(snapshot.signedAt) ||
    !canonicalTimestamp(snapshot.expiresAt) ||
    typeof snapshot.signature !== "string" ||
    !signaturePattern.test(snapshot.signature)
  ) {
    return null;
  }
  const signatureBytes = Buffer.from(snapshot.signature.slice(8), "base64url");
  if (
    signatureBytes.byteLength !== 64 ||
    signatureBytes.toString("base64url") !== snapshot.signature.slice(8)
  ) {
    return null;
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
    algorithm: "Ed25519" as const,
    audience: "connect-release-evidence-builder" as const,
    environment: "staging" as const,
    keyId: snapshot.keyId,
    runKey: snapshot.runKey,
    claimVersion: snapshot.claimVersion,
    requestDigest: snapshot.requestDigest,
    releaseId: snapshot.releaseId,
    commitSha: snapshot.commitSha,
    artifactDigest: snapshot.artifactDigest,
    expectedEvidenceVersion: snapshot.expectedEvidenceVersion,
    receiptDigest: snapshot.receiptDigest,
    evidenceCoreDigest: snapshot.evidenceCoreDigest,
    auditKey: snapshot.auditKey,
    nonce: snapshot.nonce,
    nonceSequence: snapshot.nonceSequence,
    issuedAt: snapshot.issuedAt,
    signedAt: snapshot.signedAt,
    expiresAt: snapshot.expiresAt,
    signature: snapshot.signature,
  });
}

function coreAndAttestationMatch(
  core: Readonly<RailwayBotReplyStagingAttestedReleaseEvidenceCore>,
  evidenceCoreDigest: string,
  attestation: Readonly<BotReplyStagingReceiptAttestation>,
): boolean {
  return attestation.runKey === core.runKey &&
    attestation.claimVersion === core.claimVersion &&
    attestation.requestDigest === core.requestDigest &&
    attestation.releaseId === core.releaseId &&
    attestation.commitSha === core.commitSha &&
    attestation.artifactDigest === core.artifactDigest &&
    attestation.expectedEvidenceVersion === core.expectedEvidenceVersion &&
    attestation.receiptDigest === core.receiptDigest &&
    attestation.evidenceCoreDigest === evidenceCoreDigest &&
    attestation.auditKey === core.attestationAuditKey &&
    attestation.issuedAt === core.verifiedAt &&
    attestation.signedAt === core.verifiedAt &&
    attestation.expiresAt === core.expiresAt;
}

interface CanonicalState {
  nodes: number;
  bytes: number;
}

function canonicalToken(value: string, state: CanonicalState): string {
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > maximumCanonicalBytes - state.bytes) {
    throw new TypeError("canonical evidence exceeds byte boundary");
  }
  state.bytes += bytes;
  return value;
}

function canonicalJson(
  value: unknown,
  ancestors: ReadonlySet<object> = new Set(),
  depth = 0,
  state: CanonicalState = { nodes: 0, bytes: 0 },
): string {
  state.nodes += 1;
  if (depth > maximumCanonicalDepth || state.nodes > maximumCanonicalNodes) {
    throw new TypeError("canonical evidence exceeds structural boundary");
  }
  if (value === null) return canonicalToken("null", state);
  if (typeof value === "string" || typeof value === "boolean") {
    return canonicalToken(JSON.stringify(value), state);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number");
    return canonicalToken(JSON.stringify(value), state);
  }
  if (typeof value !== "object" || nodeUtilTypes.isProxy(value)) {
    throw new TypeError("unsupported canonical evidence value");
  }
  if (ancestors.has(value)) throw new TypeError("cyclic evidence value");
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    const entries = snapshotDenseArray(value, maximumCanonicalNodes);
    if (entries === null) throw new TypeError("non-canonical evidence array");
    const fragments = [canonicalToken("[", state)];
    for (let index = 0; index < entries.length; index += 1) {
      if (index > 0) fragments.push(canonicalToken(",", state));
      fragments.push(canonicalJson(
        entries[index],
        nextAncestors,
        depth + 1,
        state,
      ));
    }
    fragments.push(canonicalToken("]", state));
    return fragments.join("");
  }
  const snapshot = snapshotDataRecord(value);
  if (snapshot === null) throw new TypeError("non-canonical evidence record");
  const keys = Object.keys(snapshot).sort();
  const fragments = [canonicalToken("{", state)];
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (index > 0) fragments.push(canonicalToken(",", state));
    fragments.push(canonicalToken(JSON.stringify(key), state));
    fragments.push(canonicalToken(":", state));
    fragments.push(canonicalJson(
      snapshot[key],
      nextAncestors,
      depth + 1,
      state,
    ));
  }
  fragments.push(canonicalToken("}", state));
  return fragments.join("");
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJson(value), "utf8")
    .digest("hex");
}

function safeClockNow(value: unknown): Date {
  const snapshot = snapshotExactRecord(value, clockKeys);
  if (
    snapshot === null || typeof snapshot.now !== "function" ||
    nodeUtilTypes.isProxy(snapshot.now)
  ) {
    fail("clock-invalid");
  }
  try {
    const clockValue = Reflect.apply(snapshot.now, value, []);
    if (!(clockValue instanceof Date)) fail("clock-invalid");
    const milliseconds = Date.prototype.getTime.call(clockValue);
    if (!Number.isFinite(milliseconds)) fail("clock-invalid");
    return new Date(milliseconds);
  } catch (error) {
    if (error instanceof RailwayBotReplyStagingAttestedReleaseEvidenceError) {
      throw error;
    }
    fail("clock-invalid");
  }
}

export function createRailwayBotReplyStagingAttestedReleaseEvidenceCore(
  input: Readonly<
    CreateRailwayBotReplyStagingAttestedReleaseEvidenceCoreInput
  >,
  clock: Readonly<{ now(): Date }>,
): Readonly<RailwayBotReplyStagingAttestedReleaseEvidenceCore> {
  const snapshot = snapshotExactRecord(input, coreInputKeys);
  const report = snapshot === null ? null : parseReadyReport(snapshot.report);
  if (
    snapshot === null || report === null ||
    typeof snapshot.releaseId !== "string" ||
    !releaseIdPattern.test(snapshot.releaseId) ||
    typeof snapshot.commitSha !== "string" ||
    !commitShaPattern.test(snapshot.commitSha) ||
    typeof snapshot.artifactDigest !== "string" ||
    !digestPattern.test(snapshot.artifactDigest) ||
    typeof snapshot.runKey !== "string" ||
    !runKeyPattern.test(snapshot.runKey) ||
    !positiveVersion(snapshot.claimVersion) ||
    typeof snapshot.requestDigest !== "string" ||
    !digestPattern.test(snapshot.requestDigest) ||
    !expectedVersion(snapshot.expectedEvidenceVersion) ||
    typeof snapshot.attestationAuditKey !== "string" ||
    !attestationAuditKeyPattern.test(snapshot.attestationAuditKey) ||
    !Number.isSafeInteger(snapshot.lifetimeSeconds) ||
    Number(snapshot.lifetimeSeconds) < minimumLifetimeMilliseconds / 1_000 ||
    Number(snapshot.lifetimeSeconds) > maximumLifetimeMilliseconds / 1_000
  ) {
    fail("input-invalid");
  }
  let receiptDigest: string;
  try {
    receiptDigest = deriveBotReplyStagingReceiptDigest(snapshot.receipt);
  } catch {
    fail("input-invalid");
  }
  const verifiedAt = safeClockNow(clock);
  const expiresAt = new Date(
    verifiedAt.getTime() + Number(snapshot.lifetimeSeconds) * 1_000,
  );
  return Object.freeze({
    activationVersion:
      railwayBotReplyStagingAttestedReleaseEvidenceActivationVersion,
    artifactDigest: snapshot.artifactDigest,
    attestationAuditKey: snapshot.attestationAuditKey,
    checkCount: 4 as const,
    checks: report.checks,
    claimVersion: snapshot.claimVersion,
    commitSha: snapshot.commitSha,
    environment: "staging" as const,
    expiresAt: expiresAt.toISOString(),
    expectedEvidenceVersion: snapshot.expectedEvidenceVersion,
    releaseId: snapshot.releaseId,
    requestDigest: snapshot.requestDigest,
    receiptDigest,
    runKey: snapshot.runKey,
    source: "railway-api-worker-cross-service-preflight" as const,
    verifiedAt: verifiedAt.toISOString(),
  });
}

export function deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(
  core: Readonly<RailwayBotReplyStagingAttestedReleaseEvidenceCore>,
): string {
  const parsed = parseCore(core);
  if (parsed === null) fail("input-invalid");
  return `sha256:${sha256(parsed)}`;
}

function envelopeWithoutDigest(
  core: Readonly<RailwayBotReplyStagingAttestedReleaseEvidenceCore>,
  evidenceCoreDigest: string,
  attestation: Readonly<BotReplyStagingReceiptAttestation>,
  attestationPayloadDigest: string,
) {
  return Object.freeze({
    schemaVersion: 2 as const,
    policyVersion:
      railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
    core,
    evidenceCoreDigest,
    attestation,
    attestationPayloadDigest,
  });
}

export function deriveRailwayBotReplyStagingAttestedReleaseEvidenceDigest(
  evidence: Omit<
    RailwayBotReplyStagingAttestedReleaseEvidence,
    "evidenceDigest"
  >,
): string {
  const snapshot = snapshotExactRecord(
    evidence,
    envelopeKeys.filter((key) => key !== "evidenceDigest"),
  );
  if (snapshot === null) fail("input-invalid");
  const core = parseCore(snapshot.core);
  const attestation = parseAttestation(snapshot.attestation);
  if (
    core === null || attestation === null || snapshot.schemaVersion !== 2 ||
    snapshot.policyVersion !==
      railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion ||
    typeof snapshot.evidenceCoreDigest !== "string" ||
    !digestPattern.test(snapshot.evidenceCoreDigest) ||
    typeof snapshot.attestationPayloadDigest !== "string" ||
    !digestPattern.test(snapshot.attestationPayloadDigest)
  ) {
    fail("input-invalid");
  }
  return `bot_reply_staging_cross_service_evidence_v2_${sha256(
    envelopeWithoutDigest(
      core,
      snapshot.evidenceCoreDigest,
      attestation,
      snapshot.attestationPayloadDigest,
    ),
  )}`;
}

export function assembleRailwayBotReplyStagingAttestedReleaseEvidence(
  input: Readonly<{
    core: Readonly<RailwayBotReplyStagingAttestedReleaseEvidenceCore>;
    attestation: Readonly<BotReplyStagingReceiptAttestation>;
  }>,
): Readonly<RailwayBotReplyStagingAttestedReleaseEvidence> {
  const snapshot = snapshotExactRecord(input, assemblyInputKeys);
  const core = snapshot === null ? null : parseCore(snapshot.core);
  const attestation = snapshot === null
    ? null
    : parseAttestation(snapshot.attestation);
  if (core === null || attestation === null) fail("input-invalid");
  const evidenceCoreDigest =
    deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(core);
  if (!coreAndAttestationMatch(core, evidenceCoreDigest, attestation)) {
    fail("binding-mismatch");
  }
  let attestationPayloadDigest: string;
  try {
    attestationPayloadDigest =
      deriveBotReplyStagingReceiptAttestationPayloadDigest(attestation);
  } catch {
    fail("input-invalid");
  }
  const unsignedEnvelope = envelopeWithoutDigest(
    core,
    evidenceCoreDigest,
    attestation,
    attestationPayloadDigest,
  );
  const evidence = Object.freeze({
    ...unsignedEnvelope,
    evidenceDigest:
      deriveRailwayBotReplyStagingAttestedReleaseEvidenceDigest(
        unsignedEnvelope,
      ),
  });
  if (
    Buffer.byteLength(serializeParsedEnvelope(evidence), "utf8") >
      railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes
  ) {
    fail("input-invalid");
  }
  return evidence;
}

function parseExpectedBinding(
  value: unknown,
): RailwayBotReplyStagingAttestedReleaseEvidenceExpectedBinding | null {
  const snapshot = snapshotExactRecord(value, expectedBindingKeys);
  if (
    snapshot === null || typeof snapshot.trustedKeyId !== "string" ||
    !keyIdPattern.test(snapshot.trustedKeyId) ||
    typeof snapshot.releaseId !== "string" ||
    !releaseIdPattern.test(snapshot.releaseId) ||
    typeof snapshot.commitSha !== "string" ||
    !commitShaPattern.test(snapshot.commitSha) ||
    typeof snapshot.artifactDigest !== "string" ||
    !digestPattern.test(snapshot.artifactDigest) ||
    typeof snapshot.runKey !== "string" ||
    !runKeyPattern.test(snapshot.runKey) ||
    !positiveVersion(snapshot.claimVersion) ||
    typeof snapshot.requestDigest !== "string" ||
    !digestPattern.test(snapshot.requestDigest) ||
    !expectedVersion(snapshot.expectedEvidenceVersion) ||
    typeof snapshot.attestationAuditKey !== "string" ||
    !attestationAuditKeyPattern.test(snapshot.attestationAuditKey)
  ) {
    return null;
  }
  return Object.freeze({
    trustedKeyId: snapshot.trustedKeyId,
    releaseId: snapshot.releaseId,
    commitSha: snapshot.commitSha,
    artifactDigest: snapshot.artifactDigest,
    runKey: snapshot.runKey,
    claimVersion: snapshot.claimVersion,
    requestDigest: snapshot.requestDigest,
    expectedEvidenceVersion: snapshot.expectedEvidenceVersion,
    attestationAuditKey: snapshot.attestationAuditKey,
  });
}

function expectedBindingMatches(
  core: Readonly<RailwayBotReplyStagingAttestedReleaseEvidenceCore>,
  attestation: Readonly<BotReplyStagingReceiptAttestation>,
  expected: Readonly<
    RailwayBotReplyStagingAttestedReleaseEvidenceExpectedBinding
  >,
): boolean {
  return attestation.keyId === expected.trustedKeyId &&
    core.releaseId === expected.releaseId &&
    core.commitSha === expected.commitSha &&
    core.artifactDigest === expected.artifactDigest &&
    core.runKey === expected.runKey &&
    core.claimVersion === expected.claimVersion &&
    core.requestDigest === expected.requestDigest &&
    core.expectedEvidenceVersion === expected.expectedEvidenceVersion &&
    core.attestationAuditKey === expected.attestationAuditKey;
}

function blockedInspection(
  code: Extract<
    RailwayBotReplyStagingAttestedReleaseEvidenceInspection,
    { status: "blocked" }
  >["code"],
  attestationCode: string | null = null,
): RailwayBotReplyStagingAttestedReleaseEvidenceInspection {
  return Object.freeze({
    status: "blocked" as const,
    code,
    attestationCode,
    releaseId: null,
    runKey: null,
    evidenceCoreDigest: null,
    attestationPayloadDigest: null,
    evidenceDigest: null,
    verifiedAt: null,
    expiresAt: null,
    replayProtected: false as const,
    evidence: null,
  });
}

function serializeParsedEnvelope(
  evidence: Readonly<RailwayBotReplyStagingAttestedReleaseEvidence>,
): string {
  return JSON.stringify({
    schemaVersion: evidence.schemaVersion,
    policyVersion: evidence.policyVersion,
    core: evidence.core,
    evidenceCoreDigest: evidence.evidenceCoreDigest,
    attestation: evidence.attestation,
    attestationPayloadDigest: evidence.attestationPayloadDigest,
    evidenceDigest: evidence.evidenceDigest,
  });
}

function parseEnvelope(
  value: unknown,
): RailwayBotReplyStagingAttestedReleaseEvidence | null {
  const snapshot = snapshotExactRecord(value, envelopeKeys);
  const core = snapshot === null ? null : parseCore(snapshot.core);
  const attestation = snapshot === null
    ? null
    : parseAttestation(snapshot.attestation);
  if (
    snapshot === null || core === null || attestation === null ||
    snapshot.schemaVersion !== 2 ||
    snapshot.policyVersion !==
      railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion ||
    typeof snapshot.evidenceCoreDigest !== "string" ||
    !digestPattern.test(snapshot.evidenceCoreDigest) ||
    typeof snapshot.attestationPayloadDigest !== "string" ||
    !digestPattern.test(snapshot.attestationPayloadDigest) ||
    typeof snapshot.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(snapshot.evidenceDigest)
  ) {
    return null;
  }
  let expectedCoreDigest: string;
  let expectedAttestationPayloadDigest: string;
  let expectedEvidenceDigest: string;
  try {
    expectedCoreDigest =
      deriveRailwayBotReplyStagingAttestedReleaseEvidenceCoreDigest(core);
    expectedAttestationPayloadDigest =
      deriveBotReplyStagingReceiptAttestationPayloadDigest(attestation);
    expectedEvidenceDigest =
      deriveRailwayBotReplyStagingAttestedReleaseEvidenceDigest(
        envelopeWithoutDigest(
          core,
          snapshot.evidenceCoreDigest,
          attestation,
          snapshot.attestationPayloadDigest,
        ),
      );
  } catch {
    return null;
  }
  if (
    snapshot.evidenceCoreDigest !== expectedCoreDigest ||
    snapshot.attestationPayloadDigest !== expectedAttestationPayloadDigest ||
    snapshot.evidenceDigest !== expectedEvidenceDigest ||
    !coreAndAttestationMatch(core, expectedCoreDigest, attestation)
  ) {
    return null;
  }
  const parsed = Object.freeze({
    schemaVersion: 2 as const,
    policyVersion:
      railwayBotReplyStagingAttestedReleaseEvidencePolicyVersion,
    core,
    evidenceCoreDigest: expectedCoreDigest,
    attestation,
    attestationPayloadDigest: expectedAttestationPayloadDigest,
    evidenceDigest: expectedEvidenceDigest,
  });
  return Buffer.byteLength(serializeParsedEnvelope(parsed), "utf8") <=
      railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes
    ? parsed
    : null;
}

export function serializeRailwayBotReplyStagingAttestedReleaseEvidence(
  evidence: Readonly<RailwayBotReplyStagingAttestedReleaseEvidence>,
): string {
  const parsed = parseEnvelope(evidence);
  if (parsed === null) fail("input-invalid");
  const serialized = serializeParsedEnvelope(parsed);
  if (
    Buffer.byteLength(serialized, "utf8") >
      railwayBotReplyStagingAttestedReleaseEvidenceMaximumBytes
  ) {
    fail("input-invalid");
  }
  return serialized;
}

export function inspectRailwayBotReplyStagingAttestedReleaseEvidence(
  input: Readonly<{
    evidence: unknown;
    receipt: unknown;
    expected: Readonly<
      RailwayBotReplyStagingAttestedReleaseEvidenceExpectedBinding
    >;
    trustedKeys: readonly Readonly<
      BotReplyStagingReceiptAttestationTrustedKey
    >[];
    clock: Readonly<{ now(): Date }>;
  }>,
): RailwayBotReplyStagingAttestedReleaseEvidenceInspection {
  const snapshot = snapshotExactRecord(input, inspectionInputKeys);
  const evidence = snapshot === null ? null : parseEnvelope(snapshot.evidence);
  const expected = snapshot === null
    ? null
    : parseExpectedBinding(snapshot.expected);
  const clock = snapshot === null
    ? null
    : snapshotExactRecord(snapshot.clock, clockKeys);
  if (
    snapshot === null || evidence === null || expected === null ||
    clock === null || typeof clock.now !== "function" ||
    nodeUtilTypes.isProxy(clock.now)
  ) {
    return blockedInspection(
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_INVALID",
    );
  }
  let receiptDigest: string;
  try {
    receiptDigest = deriveBotReplyStagingReceiptDigest(snapshot.receipt);
  } catch {
    return blockedInspection(
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_INVALID",
    );
  }
  if (
    !expectedBindingMatches(evidence.core, evidence.attestation, expected) ||
    receiptDigest !== evidence.core.receiptDigest
  ) {
    return blockedInspection(
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_BINDING_MISMATCH",
    );
  }
  const verification = verifyBotReplyStagingReceiptAttestation({
    receipt: snapshot.receipt,
    attestation: evidence.attestation,
    expected: {
      trustedKeyId: expected.trustedKeyId,
      runKey: evidence.core.runKey,
      claimVersion: evidence.core.claimVersion,
      requestDigest: evidence.core.requestDigest,
      releaseId: evidence.core.releaseId,
      commitSha: evidence.core.commitSha,
      artifactDigest: evidence.core.artifactDigest,
      expectedEvidenceVersion: evidence.core.expectedEvidenceVersion,
      evidenceCoreDigest: evidence.evidenceCoreDigest,
      auditKey: evidence.core.attestationAuditKey,
    },
    trustedKeys: snapshot.trustedKeys,
    clock: { now: clock.now as () => Date },
  });
  if (verification.status !== "signature-valid-only") {
    return blockedInspection(
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_ATTESTATION_REJECTED",
      verification.code,
    );
  }
  return Object.freeze({
    status: "signature-valid-only" as const,
    code:
      "BOT_REPLY_STAGING_ATTESTED_RELEASE_EVIDENCE_SIGNATURE_VALID_ONLY" as const,
    releaseId: evidence.core.releaseId,
    runKey: evidence.core.runKey,
    evidenceCoreDigest: evidence.evidenceCoreDigest,
    attestationPayloadDigest: evidence.attestationPayloadDigest,
    evidenceDigest: evidence.evidenceDigest,
    verifiedAt: evidence.core.verifiedAt,
    expiresAt: evidence.core.expiresAt,
    replayProtected: false as const,
    evidence,
  });
}
