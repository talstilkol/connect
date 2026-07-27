export type MetaWebhookChallengeFailure =
  | "invalid_mode"
  | "invalid_token"
  | "missing_challenge";

export type MetaWebhookChallengeResult =
  | {
      accepted: true;
      challenge: string;
    }
  | {
      accepted: false;
      reason: MetaWebhookChallengeFailure;
    };

export interface MetaWebhookChallengeInput {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
}

type RawPayload = ArrayBuffer | Uint8Array | string;

function requireConfiguredSecret(
  value: string,
  fieldName: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be configured`);
  }

  return value;
}

function toArrayBuffer(value: RawPayload): ArrayBuffer {
  const source =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : value instanceof Uint8Array
        ? value
        : new Uint8Array(value);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);

  return copy.buffer;
}

function constantTimeBytesEqual(
  left: Uint8Array,
  right: Uint8Array,
): boolean {
  const comparedLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < comparedLength; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0;
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();

  return constantTimeBytesEqual(
    encoder.encode(left),
    encoder.encode(right),
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    return null;
  }

  const result = new Uint8Array(value.length / 2);

  for (let index = 0; index < value.length; index += 2) {
    result[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }

  return result;
}

function requireSubtleCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable");
  }

  return globalThis.crypto.subtle;
}

export function verifyMetaWebhookChallenge(
  input: MetaWebhookChallengeInput,
  expectedVerifyToken: string,
): MetaWebhookChallengeResult {
  const configuredToken = requireConfiguredSecret(
    expectedVerifyToken,
    "META_WEBHOOK_VERIFY_TOKEN",
  );

  if (input.mode !== "subscribe") {
    return { accepted: false, reason: "invalid_mode" };
  }

  if (
    input.verifyToken === null ||
    !constantTimeTextEqual(input.verifyToken, configuredToken)
  ) {
    return { accepted: false, reason: "invalid_token" };
  }

  if (!input.challenge) {
    return { accepted: false, reason: "missing_challenge" };
  }

  return {
    accepted: true,
    challenge: input.challenge,
  };
}

export async function sha256Hex(payload: RawPayload): Promise<string> {
  const digest = await requireSubtleCrypto().digest(
    "SHA-256",
    toArrayBuffer(payload),
  );

  return bytesToHex(new Uint8Array(digest));
}

export async function createMetaWebhookSignature(
  payload: RawPayload,
  appSecret: string,
): Promise<string> {
  const configuredSecret = requireConfiguredSecret(
    appSecret,
    "META_APP_SECRET",
  );
  const cryptoKey = await requireSubtleCrypto().importKey(
    "raw",
    new TextEncoder().encode(configuredSecret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await requireSubtleCrypto().sign(
    "HMAC",
    cryptoKey,
    toArrayBuffer(payload),
  );

  return `sha256=${bytesToHex(new Uint8Array(signature))}`;
}

export async function verifyMetaWebhookSignature(
  payload: RawPayload,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  requireConfiguredSecret(appSecret, "META_APP_SECRET");

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const receivedSignature = hexToBytes(signatureHeader.slice(7));

  if (!receivedSignature) {
    return false;
  }

  const expectedHeader = await createMetaWebhookSignature(
    payload,
    appSecret,
  );
  const expectedSignature = hexToBytes(expectedHeader.slice(7));

  return (
    expectedSignature !== null &&
    constantTimeBytesEqual(receivedSignature, expectedSignature)
  );
}
