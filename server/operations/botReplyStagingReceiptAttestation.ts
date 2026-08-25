import {
  createHash,
  createPublicKey,
  verify as verifySignature,
  type KeyObject,
} from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

export const botReplyStagingReceiptAttestationPolicyVersion =
  "connect-bot-reply-staging-receipt-attestation-v1" as const;

const maximumReceiptBytes = 48_000;
const minimumAttestationLifetimeMilliseconds = 60 * 1_000;
const maximumAttestationLifetimeMilliseconds = 15 * 60 * 1_000;
const maximumTrustedKeyCount = 8;
const maximumNonceSequence = 2_147_483_647;
const maximumClaimVersion = 2_147_483_647;
const maximumEvidenceVersion = 2_147_483_647;
const maximumCanonicalDepth = 32;
const maximumCanonicalNodes = 10_000;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const keyIdPattern = /^bot_reply_staging_worker_key_v1_[a-f0-9]{64}$/;
const noncePattern = /^bot_reply_staging_attestation_nonce_v1_[a-f0-9]{64}$/;
const auditKeyPattern =
  /^bot_reply_staging_attestation_audit_v1_[a-f0-9]{64}$/;
const signaturePattern = /^ed25519:[A-Za-z0-9_-]{86}$/;

export interface BotReplyStagingReceiptAttestation {
  readonly schemaVersion: 1;
  readonly policyVersion:
    typeof botReplyStagingReceiptAttestationPolicyVersion;
  readonly algorithm: "Ed25519";
  readonly audience: "connect-release-evidence-builder";
  readonly environment: "staging";
  readonly keyId: string;
  readonly runKey: string;
  readonly claimVersion: number;
  readonly requestDigest: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly expectedEvidenceVersion: number;
  readonly receiptDigest: string;
  readonly evidenceCoreDigest: string;
  readonly auditKey: string;
  readonly nonce: string;
  readonly nonceSequence: number;
  readonly issuedAt: string;
  readonly signedAt: string;
  readonly expiresAt: string;
  readonly signature: string;
}

export interface BotReplyStagingReceiptAttestationExpectedBinding {
  readonly trustedKeyId: string;
  readonly runKey: string;
  readonly claimVersion: number;
  readonly requestDigest: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly expectedEvidenceVersion: number;
  readonly evidenceCoreDigest: string;
  readonly auditKey: string;
}

export interface BotReplyStagingReceiptAttestationTrustedKey {
  readonly keyId: string;
  readonly publicKeySpkiBase64Url: string;
  readonly validFrom: string;
  readonly validUntil: string;
}

export interface BotReplyStagingReceiptAttestationNonceClaim {
  readonly policyVersion:
    typeof botReplyStagingReceiptAttestationPolicyVersion;
  readonly keyId: string;
  readonly runKey: string;
  readonly claimVersion: number;
  readonly requestDigest: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly expectedEvidenceVersion: number;
  readonly receiptDigest: string;
  readonly evidenceCoreDigest: string;
  readonly auditKey: string;
  readonly nonce: string;
  readonly nonceSequence: number;
  readonly issuedAt: string;
  readonly signedAt: string;
  readonly expiresAt: string;
  readonly attestationPayloadDigest: string;
}

export type BotReplyStagingReceiptAttestationNonceClaimResult = Readonly<
  | {
      status: "consumed";
      attestationPayloadDigest: string;
    }
  | {
      status: "replayed";
      nonce: string;
      receiptDigest: string;
      evidenceCoreDigest: string;
      expectedEvidenceVersion: number;
      attestationPayloadDigest: string;
    }
  | { status: "conflict" }
>;

export interface BotReplyStagingReceiptAttestationDependencies {
  readonly clock: Readonly<{ now(): Date }>;
  readonly consumeNonce: (
    claim: Readonly<BotReplyStagingReceiptAttestationNonceClaim>,
  ) => Promise<BotReplyStagingReceiptAttestationNonceClaimResult>;
}

export type BotReplyStagingReceiptAttestationResult = Readonly<
  | {
      status: "verified";
      code: "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_VERIFIED";
      receiptDigest: string;
      keyId: string;
      nonce: string;
      expiresAt: string;
      replayed: boolean;
    }
  | {
      status: "blocked";
      code:
        | "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID"
        | "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_BINDING_MISMATCH"
        | "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_KEY_UNTRUSTED"
        | "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NOT_YET_VALID"
        | "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_EXPIRED"
        | "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_SIGNATURE_INVALID"
        | "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT"
        | "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_DEPENDENCY_UNAVAILABLE";
      receiptDigest: null;
      keyId: null;
      nonce: null;
      expiresAt: null;
      replayed: false;
    }
>;

export type BotReplyStagingReceiptAttestationSignatureVerificationResult =
  Readonly<
    | {
        status: "signature-valid-only";
        code:
          "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_SIGNATURE_VALID_ONLY";
        receiptDigest: string;
        keyId: string;
        nonce: string;
        expiresAt: string;
        replayProtected: false;
      }
    | Extract<
        BotReplyStagingReceiptAttestationResult,
        { status: "blocked" }
      >
  >;

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
const unsignedAttestationKeys = Object.freeze(
  attestationKeys.filter((key) => key !== "signature"),
);
const nonceBindingKeys = Object.freeze([
  "artifactDigest",
  "auditKey",
  "claimVersion",
  "commitSha",
  "evidenceCoreDigest",
  "expectedEvidenceVersion",
  "keyId",
  "nonceSequence",
  "receiptDigest",
  "releaseId",
  "requestDigest",
  "runKey",
]);
const expectedBindingKeys = Object.freeze([
  "artifactDigest",
  "auditKey",
  "claimVersion",
  "commitSha",
  "evidenceCoreDigest",
  "expectedEvidenceVersion",
  "releaseId",
  "requestDigest",
  "runKey",
  "trustedKeyId",
]);
const trustedKeyKeys = Object.freeze([
  "keyId",
  "publicKeySpkiBase64Url",
  "validFrom",
  "validUntil",
]);
const dependencyKeys = Object.freeze(["clock", "consumeNonce"]);
const clockKeys = Object.freeze(["now"]);
const consumedNonceClaimResultKeys = Object.freeze([
  "attestationPayloadDigest",
  "status",
]);
const conflictNonceClaimResultKeys = Object.freeze(["status"]);
const replayedNonceClaimResultKeys = Object.freeze([
  "attestationPayloadDigest",
  "evidenceCoreDigest",
  "expectedEvidenceVersion",
  "nonce",
  "receiptDigest",
  "status",
]);

function snapshotDataRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  if (
    typeof value !== "object" || value === null ||
    nodeUtilTypes.isProxy(value) || Array.isArray(value)
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

function snapshotCanonicalArray(value: unknown): readonly unknown[] | null {
  if (
    typeof value !== "object" || value === null ||
    nodeUtilTypes.isProxy(value) || !Array.isArray(value)
  ) {
    return null;
  }
  try {
    const length = value.length;
    if (
      !Number.isSafeInteger(length) || length < 0 ||
      length > maximumCanonicalNodes
    ) {
      return null;
    }
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
    const lengthDescriptor = descriptors.length;
    if (
      lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
      lengthDescriptor.value !== length ||
      lengthDescriptor.enumerable !== false
    ) {
      return null;
    }
    const snapshot: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      const descriptor = descriptors[key];
      if (
        descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function containsLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return true;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

interface CanonicalJsonState {
  nodes: number;
  bytes: number;
}

function canonicalToken(value: string, state: CanonicalJsonState): string {
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > maximumReceiptBytes - state.bytes) {
    throw new TypeError("JSON value exceeds canonicalization byte boundary");
  }
  state.bytes += bytes;
  return value;
}

function canonicalJson(
  value: unknown,
  ancestors: ReadonlySet<object>,
  depth = 0,
  state: CanonicalJsonState = { nodes: 0, bytes: 0 },
): string {
  state.nodes += 1;
  if (depth > maximumCanonicalDepth || state.nodes > maximumCanonicalNodes) {
    throw new TypeError("JSON value exceeds canonicalization bounds");
  }
  if (value === null) return canonicalToken("null", state);
  if (typeof value === "string" || typeof value === "boolean") {
    if (typeof value === "string" && containsLoneSurrogate(value)) {
      throw new TypeError("string contains a lone Unicode surrogate");
    }
    if (
      typeof value === "string" &&
      Buffer.byteLength(value, "utf8") > maximumReceiptBytes - state.bytes
    ) {
      throw new TypeError("JSON value exceeds canonicalization byte boundary");
    }
    return canonicalToken(JSON.stringify(value), state);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("non-finite JSON number");
    }
    return canonicalToken(JSON.stringify(value), state);
  }
  if (typeof value !== "object") {
    throw new TypeError("unsupported JSON value");
  }
  if (nodeUtilTypes.isProxy(value)) {
    throw new TypeError("proxy is not canonical JSON");
  }
  if (ancestors.has(value)) {
    throw new TypeError("cyclic JSON value");
  }

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    const entries = snapshotCanonicalArray(value);
    if (entries === null) {
      throw new TypeError("array must be dense canonical JSON");
    }
    const fragments = [canonicalToken("[", state)];
    for (let index = 0; index < entries.length; index += 1) {
      if (index > 0) fragments.push(canonicalToken(",", state));
      fragments.push(
        canonicalJson(entries[index], nextAncestors, depth + 1, state),
      );
    }
    fragments.push(canonicalToken("]", state));
    return fragments.join("");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("object must be plain canonical JSON");
  }
  const record = value as Record<string, unknown>;
  const ownKeys = Reflect.ownKeys(record);
  if (ownKeys.length > maximumCanonicalNodes - state.nodes) {
    throw new TypeError("JSON value exceeds canonicalization bounds");
  }
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new TypeError("object contains non-canonical properties");
  }
  const keys = (ownKeys as string[]).sort();
  if (keys.some(containsLoneSurrogate)) {
    throw new TypeError("object key contains a lone Unicode surrogate");
  }
  const descriptors = Object.getOwnPropertyDescriptors(record);
  if (
    keys.some((key) => {
      const descriptor = descriptors[key];
      return descriptor === undefined || !("value" in descriptor) ||
        descriptor.enumerable !== true;
    })
  ) {
    throw new TypeError("object contains accessor properties");
  }
  const fragments = [canonicalToken("{", state)];
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (index > 0) fragments.push(canonicalToken(",", state));
    if (Buffer.byteLength(key, "utf8") > maximumReceiptBytes - state.bytes) {
      throw new TypeError("JSON value exceeds canonicalization byte boundary");
    }
    fragments.push(canonicalToken(JSON.stringify(key), state));
    fragments.push(canonicalToken(":", state));
    fragments.push(canonicalJson(
      descriptors[key].value,
      nextAncestors,
      depth + 1,
      state,
    ));
  }
  fragments.push(canonicalToken("}", state));
  return fragments.join("");
}

export function deriveBotReplyStagingReceiptDigest(receipt: unknown): string {
  const canonicalReceipt = canonicalJson(receipt, new Set());
  if (
    canonicalReceipt.length === 0 ||
    Buffer.byteLength(canonicalReceipt, "utf8") > maximumReceiptBytes
  ) {
    throw new TypeError("receipt is outside the attestation size boundary");
  }
  return `sha256:${createHash("sha256")
    .update(canonicalReceipt, "utf8")
    .digest("hex")}`;
}

export function deriveBotReplyStagingReceiptAttestationNonce(
  binding: Readonly<Pick<
    BotReplyStagingReceiptAttestation,
    | "keyId"
    | "runKey"
    | "claimVersion"
    | "requestDigest"
    | "releaseId"
    | "commitSha"
    | "artifactDigest"
    | "expectedEvidenceVersion"
    | "receiptDigest"
    | "evidenceCoreDigest"
    | "auditKey"
    | "nonceSequence"
  >>,
): string {
  const snapshot = snapshotDataRecord(binding);
  if (
    snapshot === null ||
    nonceBindingKeys.some((key) => !Object.hasOwn(snapshot, key))
  ) {
    throw new TypeError("invalid attestation nonce binding");
  }
  const payload = canonicalJson([
    botReplyStagingReceiptAttestationPolicyVersion,
    "nonce",
    snapshot.keyId,
    snapshot.runKey,
    snapshot.claimVersion,
    snapshot.requestDigest,
    snapshot.releaseId,
    snapshot.commitSha,
    snapshot.artifactDigest,
    snapshot.expectedEvidenceVersion,
    snapshot.receiptDigest,
    snapshot.evidenceCoreDigest,
    snapshot.auditKey,
    snapshot.nonceSequence,
  ], new Set());
  return `bot_reply_staging_attestation_nonce_v1_${createHash("sha256")
    .update(payload, "utf8")
    .digest("hex")}`;
}

function unsignedAttestation(
  attestation: Readonly<
    Omit<BotReplyStagingReceiptAttestation, "signature">
  >,
): Omit<BotReplyStagingReceiptAttestation, "signature"> {
  const snapshot = snapshotExactRecord(attestation, unsignedAttestationKeys) ??
    snapshotExactRecord(attestation, attestationKeys);
  if (snapshot === null) {
    throw new TypeError("invalid attestation payload envelope");
  }
  const safeAttestation = snapshot as unknown as
    BotReplyStagingReceiptAttestation;
  return {
    schemaVersion: safeAttestation.schemaVersion,
    policyVersion: safeAttestation.policyVersion,
    algorithm: safeAttestation.algorithm,
    audience: safeAttestation.audience,
    environment: safeAttestation.environment,
    keyId: safeAttestation.keyId,
    runKey: safeAttestation.runKey,
    claimVersion: safeAttestation.claimVersion,
    requestDigest: safeAttestation.requestDigest,
    releaseId: safeAttestation.releaseId,
    commitSha: safeAttestation.commitSha,
    artifactDigest: safeAttestation.artifactDigest,
    expectedEvidenceVersion: safeAttestation.expectedEvidenceVersion,
    receiptDigest: safeAttestation.receiptDigest,
    evidenceCoreDigest: safeAttestation.evidenceCoreDigest,
    auditKey: safeAttestation.auditKey,
    nonce: safeAttestation.nonce,
    nonceSequence: safeAttestation.nonceSequence,
    issuedAt: safeAttestation.issuedAt,
    signedAt: safeAttestation.signedAt,
    expiresAt: safeAttestation.expiresAt,
  };
}

export function serializeBotReplyStagingReceiptAttestationPayload(
  attestation: Readonly<
    Omit<BotReplyStagingReceiptAttestation, "signature">
  >,
): Buffer {
  return Buffer.from(
    canonicalJson(unsignedAttestation(attestation), new Set()),
    "utf8",
  );
}

export function deriveBotReplyStagingReceiptAttestationPayloadDigest(
  attestation: Readonly<
    Omit<BotReplyStagingReceiptAttestation, "signature">
  >,
): string {
  return `sha256:${createHash("sha256")
    .update(serializeBotReplyStagingReceiptAttestationPayload(attestation))
    .digest("hex")}`;
}

export function deriveBotReplyStagingReceiptAttestationKeyId(
  publicKeySpkiBase64Url: string,
): string {
  const key = requireEd25519PublicKey(publicKeySpkiBase64Url);
  const subjectPublicKeyInfo = key.export({ format: "der", type: "spki" });
  return `bot_reply_staging_worker_key_v1_${createHash("sha256")
    .update(subjectPublicKeyInfo)
    .digest("hex")}`;
}

function requireEd25519PublicKey(
  publicKeySpkiBase64Url: string,
): KeyObject {
  if (
    typeof publicKeySpkiBase64Url !== "string" ||
    !/^[A-Za-z0-9_-]{59}$/.test(publicKeySpkiBase64Url)
  ) {
    throw new TypeError("invalid Ed25519 public key");
  }
  const subjectPublicKeyInfo = Buffer.from(
    publicKeySpkiBase64Url,
    "base64url",
  );
  if (
    subjectPublicKeyInfo.byteLength !== 44 ||
    subjectPublicKeyInfo.toString("base64url") !== publicKeySpkiBase64Url
  ) {
    throw new TypeError("invalid Ed25519 public key");
  }
  const key = createPublicKey({
    key: subjectPublicKeyInfo,
    format: "der",
    type: "spki",
  });
  if (key.asymmetricKeyType !== "ed25519") {
    throw new TypeError("public key must be Ed25519");
  }
  const canonicalSubjectPublicKeyInfo = key.export({
    format: "der",
    type: "spki",
  });
  if (!canonicalSubjectPublicKeyInfo.equals(subjectPublicKeyInfo)) {
    throw new TypeError("public key must use canonical Ed25519 SPKI");
  }
  return key;
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
    !Number.isSafeInteger(snapshot.claimVersion) ||
    Number(snapshot.claimVersion) < 1 ||
    Number(snapshot.claimVersion) > maximumClaimVersion ||
    typeof snapshot.requestDigest !== "string" ||
    !digestPattern.test(snapshot.requestDigest) ||
    typeof snapshot.releaseId !== "string" ||
    !releaseIdPattern.test(snapshot.releaseId) ||
    typeof snapshot.commitSha !== "string" ||
    !commitShaPattern.test(snapshot.commitSha) ||
    typeof snapshot.artifactDigest !== "string" ||
    !digestPattern.test(snapshot.artifactDigest) ||
    !Number.isSafeInteger(snapshot.expectedEvidenceVersion) ||
    Number(snapshot.expectedEvidenceVersion) < 0 ||
    Number(snapshot.expectedEvidenceVersion) >= maximumEvidenceVersion ||
    typeof snapshot.receiptDigest !== "string" ||
    !digestPattern.test(snapshot.receiptDigest) ||
    typeof snapshot.evidenceCoreDigest !== "string" ||
    !digestPattern.test(snapshot.evidenceCoreDigest) ||
    typeof snapshot.auditKey !== "string" ||
    !auditKeyPattern.test(snapshot.auditKey) ||
    typeof snapshot.nonce !== "string" ||
    !noncePattern.test(snapshot.nonce) ||
    !Number.isSafeInteger(snapshot.nonceSequence) ||
    Number(snapshot.nonceSequence) < 1 ||
    Number(snapshot.nonceSequence) > maximumNonceSequence ||
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
  return snapshot as unknown as BotReplyStagingReceiptAttestation;
}

function parseExpectedBinding(
  value: unknown,
): BotReplyStagingReceiptAttestationExpectedBinding | null {
  const snapshot = snapshotExactRecord(value, expectedBindingKeys);
  return snapshot !== null &&
      typeof snapshot.trustedKeyId === "string" &&
      keyIdPattern.test(snapshot.trustedKeyId) &&
      typeof snapshot.runKey === "string" &&
      runKeyPattern.test(snapshot.runKey) &&
      Number.isSafeInteger(snapshot.claimVersion) &&
      Number(snapshot.claimVersion) >= 1 &&
      Number(snapshot.claimVersion) <= maximumClaimVersion &&
      typeof snapshot.requestDigest === "string" &&
      digestPattern.test(snapshot.requestDigest) &&
      typeof snapshot.releaseId === "string" &&
      releaseIdPattern.test(snapshot.releaseId) &&
      typeof snapshot.commitSha === "string" &&
      commitShaPattern.test(snapshot.commitSha) &&
      typeof snapshot.artifactDigest === "string" &&
      digestPattern.test(snapshot.artifactDigest) &&
      typeof snapshot.evidenceCoreDigest === "string" &&
      digestPattern.test(snapshot.evidenceCoreDigest) &&
      typeof snapshot.auditKey === "string" &&
      auditKeyPattern.test(snapshot.auditKey) &&
      Number.isSafeInteger(snapshot.expectedEvidenceVersion) &&
      Number(snapshot.expectedEvidenceVersion) >= 0 &&
      Number(snapshot.expectedEvidenceVersion) < maximumEvidenceVersion
    ? snapshot as unknown as BotReplyStagingReceiptAttestationExpectedBinding
    : null;
}

function parseTrustedKeys(
  value: unknown,
): ReadonlyMap<string, Readonly<{
  key: KeyObject;
  validFrom: number;
  validUntil: number;
}>> | null {
  const candidates = snapshotCanonicalArray(value);
  if (
    candidates === null || candidates.length < 1 ||
    candidates.length > maximumTrustedKeyCount
  ) {
    return null;
  }
  const parsed = new Map<string, Readonly<{
    key: KeyObject;
    validFrom: number;
    validUntil: number;
  }>>();
  try {
    for (const rawCandidate of candidates) {
      const candidate = snapshotExactRecord(rawCandidate, trustedKeyKeys);
      if (
        candidate === null ||
        typeof candidate.keyId !== "string" ||
        !keyIdPattern.test(candidate.keyId) ||
        typeof candidate.publicKeySpkiBase64Url !== "string" ||
        !canonicalTimestamp(candidate.validFrom) ||
        !canonicalTimestamp(candidate.validUntil)
      ) {
        return null;
      }
      const validFrom = Date.parse(candidate.validFrom);
      const validUntil = Date.parse(candidate.validUntil);
      const key = requireEd25519PublicKey(
        candidate.publicKeySpkiBase64Url,
      );
      if (
        validFrom >= validUntil ||
        deriveBotReplyStagingReceiptAttestationKeyId(
          candidate.publicKeySpkiBase64Url,
        ) !== candidate.keyId || parsed.has(candidate.keyId)
      ) {
        return null;
      }
      parsed.set(candidate.keyId, Object.freeze({ key, validFrom, validUntil }));
    }
  } catch {
    return null;
  }
  return parsed;
}

type BlockedAttestationResult = Extract<
  BotReplyStagingReceiptAttestationResult,
  { status: "blocked" }
>;

function blocked(
  code: Extract<
    BotReplyStagingReceiptAttestationResult,
    { status: "blocked" }
  >["code"],
): BlockedAttestationResult {
  return Object.freeze({
    status: "blocked" as const,
    code,
    receiptDigest: null,
    keyId: null,
    nonce: null,
    expiresAt: null,
    replayed: false as const,
  });
}

interface VerifiedAttestation {
  readonly status: "signature-valid";
  readonly attestation: Readonly<BotReplyStagingReceiptAttestation>;
}

function parseClockNow(value: unknown): (() => Date) | null {
  const snapshot = snapshotExactRecord(value, clockKeys);
  return snapshot !== null && typeof snapshot.now === "function" &&
      !nodeUtilTypes.isProxy(snapshot.now)
    ? snapshot.now as () => Date
    : null;
}

function verified(
  attestation: Readonly<BotReplyStagingReceiptAttestation>,
  replayed: boolean,
): Extract<
  BotReplyStagingReceiptAttestationResult,
  { status: "verified" }
> {
  return Object.freeze({
    status: "verified" as const,
    code: "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_VERIFIED" as const,
    receiptDigest: attestation.receiptDigest,
    keyId: attestation.keyId,
    nonce: attestation.nonce,
    expiresAt: attestation.expiresAt,
    replayed,
  });
}

function signatureValidOnly(
  attestation: Readonly<BotReplyStagingReceiptAttestation>,
): Extract<
  BotReplyStagingReceiptAttestationSignatureVerificationResult,
  { status: "signature-valid-only" }
> {
  return Object.freeze({
    status: "signature-valid-only" as const,
    code:
      "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_SIGNATURE_VALID_ONLY" as const,
    receiptDigest: attestation.receiptDigest,
    keyId: attestation.keyId,
    nonce: attestation.nonce,
    expiresAt: attestation.expiresAt,
    replayProtected: false as const,
  });
}

function verifyAttestation({
  receipt,
  attestation: rawAttestation,
  expected: rawExpected,
  trustedKeys: rawTrustedKeys,
  clock,
}: {
  readonly receipt: unknown;
  readonly attestation: unknown;
  readonly expected: unknown;
  readonly trustedKeys: unknown;
  readonly clock: Readonly<{ now(): Date }>;
}): VerifiedAttestation | BlockedAttestationResult {
  const attestation = parseAttestation(rawAttestation);
  const expected = parseExpectedBinding(rawExpected);
  const trustedKeys = parseTrustedKeys(rawTrustedKeys);
  const clockNow = parseClockNow(clock);
  if (
    attestation === null || expected === null || trustedKeys === null ||
    clockNow === null
  ) {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID");
  }

  let receiptDigest: string;
  let nowMilliseconds: number;
  try {
    receiptDigest = deriveBotReplyStagingReceiptDigest(receipt);
    const clockValue = clockNow();
    if (!(clockValue instanceof Date)) {
      throw new TypeError("clock must return a Date");
    }
    nowMilliseconds = Date.prototype.getTime.call(clockValue);
    if (!Number.isFinite(nowMilliseconds)) {
      throw new TypeError("clock must return a finite Date");
    }
  } catch {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID");
  }

  if (
    attestation.keyId !== expected.trustedKeyId ||
    attestation.runKey !== expected.runKey ||
    attestation.claimVersion !== expected.claimVersion ||
    attestation.requestDigest !== expected.requestDigest ||
    attestation.releaseId !== expected.releaseId ||
    attestation.commitSha !== expected.commitSha ||
    attestation.artifactDigest !== expected.artifactDigest ||
    attestation.expectedEvidenceVersion !== expected.expectedEvidenceVersion ||
    attestation.receiptDigest !== receiptDigest ||
    attestation.evidenceCoreDigest !== expected.evidenceCoreDigest ||
    attestation.auditKey !== expected.auditKey ||
    attestation.nonce !==
      deriveBotReplyStagingReceiptAttestationNonce(attestation)
  ) {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_BINDING_MISMATCH");
  }

  const issuedAt = Date.parse(attestation.issuedAt);
  const signedAt = Date.parse(attestation.signedAt);
  const expiresAt = Date.parse(attestation.expiresAt);
  if (
    signedAt < issuedAt || signedAt >= expiresAt ||
    expiresAt - issuedAt < minimumAttestationLifetimeMilliseconds ||
    expiresAt - issuedAt > maximumAttestationLifetimeMilliseconds
  ) {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID");
  }
  if (nowMilliseconds < signedAt) {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NOT_YET_VALID");
  }
  if (nowMilliseconds >= expiresAt) {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_EXPIRED");
  }

  const trustedKey = trustedKeys.get(attestation.keyId);
  if (
    trustedKey === undefined || issuedAt < trustedKey.validFrom ||
    expiresAt > trustedKey.validUntil
  ) {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_KEY_UNTRUSTED");
  }
  let signatureIsValid = false;
  try {
    signatureIsValid = verifySignature(
      null,
      serializeBotReplyStagingReceiptAttestationPayload(attestation),
      trustedKey.key,
      Buffer.from(attestation.signature.slice(8), "base64url"),
    );
  } catch {
    signatureIsValid = false;
  }
  if (!signatureIsValid) {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_SIGNATURE_INVALID");
  }

  return Object.freeze({
    status: "signature-valid" as const,
    attestation,
  });
}

export function verifyBotReplyStagingReceiptAttestation({
  receipt,
  attestation,
  expected,
  trustedKeys,
  clock,
}: {
  readonly receipt: unknown;
  readonly attestation: unknown;
  readonly expected: unknown;
  readonly trustedKeys: unknown;
  readonly clock: Readonly<{ now(): Date }>;
}): BotReplyStagingReceiptAttestationSignatureVerificationResult {
  const outcome = verifyAttestation({
    receipt,
    attestation,
    expected,
    trustedKeys,
    clock,
  });
  return outcome.status === "signature-valid"
    ? signatureValidOnly(outcome.attestation)
    : outcome;
}

export async function verifyAndConsumeBotReplyStagingReceiptAttestation({
  receipt,
  attestation,
  expected,
  trustedKeys,
  dependencies,
}: {
  readonly receipt: unknown;
  readonly attestation: unknown;
  readonly expected: unknown;
  readonly trustedKeys: unknown;
  readonly dependencies:
    Readonly<BotReplyStagingReceiptAttestationDependencies>;
}): Promise<BotReplyStagingReceiptAttestationResult> {
  const dependencySnapshot = snapshotExactRecord(dependencies, dependencyKeys);
  const clockNow = dependencySnapshot === null
    ? null
    : parseClockNow(dependencySnapshot.clock);
  const consumeNonce = dependencySnapshot?.consumeNonce;
  if (
    dependencySnapshot === null || clockNow === null ||
    typeof consumeNonce !== "function" || nodeUtilTypes.isProxy(consumeNonce)
  ) {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID");
  }
  const verification = verifyAttestation({
    receipt,
    attestation,
    expected,
    trustedKeys,
    clock: { now: clockNow },
  });
  if (verification.status !== "signature-valid") return verification;
  const verifiedAttestation = verification.attestation;

  let attestationPayloadDigest: string;
  try {
    attestationPayloadDigest =
      deriveBotReplyStagingReceiptAttestationPayloadDigest(
        verifiedAttestation,
      );
  } catch {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_INVALID");
  }

  let nonceResult: BotReplyStagingReceiptAttestationNonceClaimResult;
  try {
    nonceResult = await consumeNonce(Object.freeze({
      policyVersion: botReplyStagingReceiptAttestationPolicyVersion,
      keyId: verifiedAttestation.keyId,
      runKey: verifiedAttestation.runKey,
      claimVersion: verifiedAttestation.claimVersion,
      requestDigest: verifiedAttestation.requestDigest,
      releaseId: verifiedAttestation.releaseId,
      commitSha: verifiedAttestation.commitSha,
      artifactDigest: verifiedAttestation.artifactDigest,
      expectedEvidenceVersion: verifiedAttestation.expectedEvidenceVersion,
      receiptDigest: verifiedAttestation.receiptDigest,
      evidenceCoreDigest: verifiedAttestation.evidenceCoreDigest,
      auditKey: verifiedAttestation.auditKey,
      nonce: verifiedAttestation.nonce,
      nonceSequence: verifiedAttestation.nonceSequence,
      issuedAt: verifiedAttestation.issuedAt,
      signedAt: verifiedAttestation.signedAt,
      expiresAt: verifiedAttestation.expiresAt,
      attestationPayloadDigest,
    }));
  } catch {
    return blocked(
      "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_DEPENDENCY_UNAVAILABLE",
    );
  }
  const replayedNonceResult = snapshotExactRecord(
    nonceResult,
    replayedNonceClaimResultKeys,
  );
  if (replayedNonceResult?.status === "replayed") {
    if (
      replayedNonceResult.nonce !== verifiedAttestation.nonce ||
      replayedNonceResult.receiptDigest !== verifiedAttestation.receiptDigest ||
      replayedNonceResult.evidenceCoreDigest !==
        verifiedAttestation.evidenceCoreDigest ||
      replayedNonceResult.expectedEvidenceVersion !==
        verifiedAttestation.expectedEvidenceVersion ||
      replayedNonceResult.attestationPayloadDigest !==
        attestationPayloadDigest
    ) {
      return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT");
    }
    return verified(verifiedAttestation, true);
  }
  const consumedNonceResult = snapshotExactRecord(
    nonceResult,
    consumedNonceClaimResultKeys,
  );
  if (consumedNonceResult?.status === "consumed") {
    if (
      consumedNonceResult.attestationPayloadDigest !==
        attestationPayloadDigest
    ) {
      return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT");
    }
    return verified(verifiedAttestation, false);
  }
  const conflictNonceResult = snapshotExactRecord(
    nonceResult,
    conflictNonceClaimResultKeys,
  );
  if (conflictNonceResult === null) {
    return blocked(
      "BOT_REPLY_STAGING_RECEIPT_ATTESTATION_DEPENDENCY_UNAVAILABLE",
    );
  }
  if (conflictNonceResult.status !== "conflict") {
    return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT");
  }
  return blocked("BOT_REPLY_STAGING_RECEIPT_ATTESTATION_NONCE_CONFLICT");
}
