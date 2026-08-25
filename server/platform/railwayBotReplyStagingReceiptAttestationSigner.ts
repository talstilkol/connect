import {
  createPrivateKey,
  createPublicKey,
  sign as signPayload,
  type KeyObject,
} from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import {
  botReplyStagingReceiptAttestationPolicyVersion,
  deriveBotReplyStagingReceiptAttestationKeyId,
  deriveBotReplyStagingReceiptAttestationNonce,
  deriveBotReplyStagingReceiptDigest,
  serializeBotReplyStagingReceiptAttestationPayload,
  verifyBotReplyStagingReceiptAttestation,
  type BotReplyStagingReceiptAttestation,
} from "../operations/botReplyStagingReceiptAttestation.ts";

export const railwayBotReplyStagingReceiptAttestationSignerVersion =
  "connect-railway-bot-reply-staging-receipt-attestation-signer-v1" as const;

const minimumLifetimeSeconds = 60;
const maximumLifetimeSeconds = 15 * 60;
const configurationKeys = Object.freeze([
  "clock",
  "expectedKeyId",
  "keyValidFrom",
  "keyValidUntil",
  "privateKeyPkcs8Base64Url",
]);
const clockKeys = Object.freeze(["now"]);
const inputKeys = Object.freeze([
  "artifactDigest",
  "auditKey",
  "claimVersion",
  "commitSha",
  "evidenceCoreDigest",
  "expectedEvidenceVersion",
  "lifetimeSeconds",
  "receipt",
  "releaseId",
  "requestDigest",
  "runKey",
]);

export interface RailwayBotReplyStagingReceiptAttestationSignerInput {
  readonly receipt: unknown;
  readonly runKey: string;
  readonly claimVersion: number;
  readonly requestDigest: string;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly expectedEvidenceVersion: number;
  readonly evidenceCoreDigest: string;
  readonly auditKey: string;
  readonly lifetimeSeconds: number;
}

export interface RailwayBotReplyStagingReceiptAttestationSigner {
  readonly signerVersion:
    typeof railwayBotReplyStagingReceiptAttestationSignerVersion;
  readonly keyId: string;
  sign(
    input: Readonly<
      RailwayBotReplyStagingReceiptAttestationSignerInput
    >,
  ): Readonly<BotReplyStagingReceiptAttestation>;
}

export type RailwayBotReplyStagingReceiptAttestationSignerErrorCode =
  | "configuration-invalid"
  | "input-invalid"
  | "key-not-active"
  | "signing-failed";

export class RailwayBotReplyStagingReceiptAttestationSignerError
  extends Error {
  readonly code:
    RailwayBotReplyStagingReceiptAttestationSignerErrorCode;

  constructor(
    code: RailwayBotReplyStagingReceiptAttestationSignerErrorCode,
  ) {
    super(`Railway Bot reply staging attestation signer failed: ${code}`);
    this.name = "RailwayBotReplyStagingReceiptAttestationSignerError";
    this.code = code;
  }
}

function fail(
  code: RailwayBotReplyStagingReceiptAttestationSignerErrorCode,
): never {
  throw new RailwayBotReplyStagingReceiptAttestationSignerError(code);
}

function snapshotExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
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
    if (
      ownKeys.length !== expectedKeys.length ||
      ownKeys.some((key) => typeof key !== "string")
    ) {
      return null;
    }
    const actualKeys = (ownKeys as string[]).sort();
    const sortedExpectedKeys = [...expectedKeys].sort();
    if (
      actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
    ) {
      return null;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of expectedKeys) {
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

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function requirePrivateKey(value: string): Readonly<{
  key: KeyObject;
  publicKeySpkiBase64Url: string;
  keyId: string;
}> {
  if (!/^[A-Za-z0-9_-]{64}$/.test(value)) {
    fail("configuration-invalid");
  }
  const keyBytes = Buffer.from(value, "base64url");
  if (
    keyBytes.byteLength !== 48 ||
    keyBytes.toString("base64url") !== value
  ) {
    keyBytes.fill(0);
    fail("configuration-invalid");
  }
  try {
    const key = createPrivateKey({
      key: keyBytes,
      format: "der",
      type: "pkcs8",
    });
    const canonicalPrivateKeyBytes = key.export({
      format: "der",
      type: "pkcs8",
    });
    const privateKeyIsCanonical = canonicalPrivateKeyBytes.equals(keyBytes);
    canonicalPrivateKeyBytes.fill(0);
    if (key.asymmetricKeyType !== "ed25519" || !privateKeyIsCanonical) {
      fail("configuration-invalid");
    }
    const publicKeySpkiBase64Url = createPublicKey(key)
      .export({ format: "der", type: "spki" })
      .toString("base64url");
    return Object.freeze({
      key,
      publicKeySpkiBase64Url,
      keyId: deriveBotReplyStagingReceiptAttestationKeyId(
        publicKeySpkiBase64Url,
      ),
    });
  } catch (error) {
    if (
      error instanceof
        RailwayBotReplyStagingReceiptAttestationSignerError
    ) {
      throw error;
    }
    fail("configuration-invalid");
  } finally {
    keyBytes.fill(0);
  }
}

export function createRailwayBotReplyStagingReceiptAttestationSigner(
  configuration: Readonly<{
    privateKeyPkcs8Base64Url: string;
    expectedKeyId: string;
    keyValidFrom: string;
    keyValidUntil: string;
    clock: Readonly<{ now(): Date }>;
  }>,
): RailwayBotReplyStagingReceiptAttestationSigner {
  const configurationSnapshot = snapshotExactRecord(
    configuration,
    configurationKeys,
  );
  const clockSnapshot = configurationSnapshot === null
    ? null
    : snapshotExactRecord(configurationSnapshot.clock, clockKeys);
  if (
    configurationSnapshot === null || clockSnapshot === null ||
    typeof configurationSnapshot.privateKeyPkcs8Base64Url !== "string" ||
    typeof configurationSnapshot.expectedKeyId !== "string" ||
    !canonicalTimestamp(configurationSnapshot.keyValidFrom) ||
    !canonicalTimestamp(configurationSnapshot.keyValidUntil) ||
    typeof clockSnapshot.now !== "function" ||
    nodeUtilTypes.isProxy(clockSnapshot.now)
  ) {
    fail("configuration-invalid");
  }
  const privateKey = requirePrivateKey(
    configurationSnapshot.privateKeyPkcs8Base64Url,
  );
  const clockNow = clockSnapshot.now as () => Date;
  const keyValidFrom = configurationSnapshot.keyValidFrom;
  const keyValidUntil = configurationSnapshot.keyValidUntil;
  const validFrom = Date.parse(keyValidFrom);
  const validUntil = Date.parse(keyValidUntil);
  if (
    validFrom >= validUntil ||
    privateKey.keyId !== configurationSnapshot.expectedKeyId
  ) {
    fail("configuration-invalid");
  }

  return Object.freeze({
    signerVersion:
      railwayBotReplyStagingReceiptAttestationSignerVersion,
    keyId: privateKey.keyId,
    sign(
      input: Readonly<
        RailwayBotReplyStagingReceiptAttestationSignerInput
      >,
    ) {
      const inputSnapshot = snapshotExactRecord(input, inputKeys);
      if (
        inputSnapshot === null ||
        !Number.isSafeInteger(inputSnapshot.lifetimeSeconds) ||
        Number(inputSnapshot.lifetimeSeconds) < minimumLifetimeSeconds ||
        Number(inputSnapshot.lifetimeSeconds) > maximumLifetimeSeconds
      ) {
        fail("input-invalid");
      }
      const validatedInput = inputSnapshot as unknown as
        RailwayBotReplyStagingReceiptAttestationSignerInput;
      let nowMilliseconds: number;
      try {
        const clockValue = clockNow();
        if (!(clockValue instanceof Date)) {
          throw new TypeError("clock must return a Date");
        }
        nowMilliseconds = Date.prototype.getTime.call(clockValue);
        if (!Number.isFinite(nowMilliseconds)) {
          throw new TypeError("clock must return a finite Date");
        }
      } catch {
        fail("configuration-invalid");
      }
      let receiptDigest: string;
      try {
        receiptDigest = deriveBotReplyStagingReceiptDigest(
          validatedInput.receipt,
        );
      } catch {
        fail("input-invalid");
      }
      const issuedAt = new Date(nowMilliseconds).toISOString();
      const expiresAt = new Date(
        nowMilliseconds + validatedInput.lifetimeSeconds * 1_000,
      ).toISOString();
      if (
        nowMilliseconds < validFrom ||
        Date.parse(expiresAt) > validUntil
      ) {
        fail("key-not-active");
      }

      const unsigned = {
        schemaVersion: 1 as const,
        policyVersion:
          botReplyStagingReceiptAttestationPolicyVersion,
        algorithm: "Ed25519" as const,
        audience: "connect-release-evidence-builder" as const,
        environment: "staging" as const,
        keyId: privateKey.keyId,
        runKey: validatedInput.runKey,
        claimVersion: validatedInput.claimVersion,
        requestDigest: validatedInput.requestDigest,
        releaseId: validatedInput.releaseId,
        commitSha: validatedInput.commitSha,
        artifactDigest: validatedInput.artifactDigest,
        expectedEvidenceVersion: validatedInput.expectedEvidenceVersion,
        receiptDigest,
        evidenceCoreDigest: validatedInput.evidenceCoreDigest,
        auditKey: validatedInput.auditKey,
        nonceSequence: validatedInput.claimVersion,
        issuedAt,
        signedAt: issuedAt,
        expiresAt,
      };
      let nonce: string;
      let serializedPayload: Buffer;
      try {
        nonce = deriveBotReplyStagingReceiptAttestationNonce(unsigned);
        serializedPayload =
          serializeBotReplyStagingReceiptAttestationPayload({
            ...unsigned,
            nonce,
          });
      } catch {
        fail("input-invalid");
      }
      let signature: Buffer;
      try {
        signature = signPayload(
          null,
          serializedPayload,
          privateKey.key,
        );
      } catch {
        fail("signing-failed");
      }
      if (signature.byteLength !== 64) fail("signing-failed");
      const attestation = Object.freeze({
        ...unsigned,
        nonce,
        signature: `ed25519:${signature.toString("base64url")}`,
      });
      const verification = verifyBotReplyStagingReceiptAttestation({
        receipt: validatedInput.receipt,
        attestation,
        expected: {
          trustedKeyId: privateKey.keyId,
          runKey: validatedInput.runKey,
          claimVersion: validatedInput.claimVersion,
          requestDigest: validatedInput.requestDigest,
          releaseId: validatedInput.releaseId,
          commitSha: validatedInput.commitSha,
          artifactDigest: validatedInput.artifactDigest,
          expectedEvidenceVersion: validatedInput.expectedEvidenceVersion,
          evidenceCoreDigest: validatedInput.evidenceCoreDigest,
          auditKey: validatedInput.auditKey,
        },
        trustedKeys: [{
          keyId: privateKey.keyId,
          publicKeySpkiBase64Url:
            privateKey.publicKeySpkiBase64Url,
          validFrom: keyValidFrom,
          validUntil: keyValidUntil,
        }],
        clock: { now: () => new Date(nowMilliseconds) },
      });
      if (verification.status !== "signature-valid-only") {
        fail("input-invalid");
      }
      return attestation;
    },
  });
}
