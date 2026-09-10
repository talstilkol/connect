const keyVersion = "v1";
const hmacKeyPattern = /^[A-Za-z0-9+/]{43}=$/;
const phoneNumberPattern = /^\+[1-9][0-9]{0,14}$/;
type OwnedBytes = Uint8Array<ArrayBuffer>;

export interface BotReplyStagingRecipientFingerprintEnvironment {
  readonly BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1?: string;
}

export interface BotReplyStagingRecipientFingerprintDeriver {
  isConfigured(): boolean;
  derive(recipientPhoneNumber: string): Promise<string>;
}

export interface BotReplyStagingRecipientFingerprintOptions {
  readonly crypto?: Pick<Crypto, "subtle">;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeKey(value: string | undefined): OwnedBytes | null {
  const encoded = value?.trim();
  if (!encoded || !hmacKeyPattern.test(encoded)) return null;
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    if (bytes.byteLength !== 32 || bytesToBase64(bytes) !== encoded) {
      bytes.fill(0);
      return null;
    }
    return bytes;
  } catch {
    return null;
  }
}

function hexadecimal(bytes: Uint8Array): string {
  return Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function createBotReplyStagingRecipientFingerprintDeriver(
  environment: BotReplyStagingRecipientFingerprintEnvironment,
  options: BotReplyStagingRecipientFingerprintOptions = {},
): Readonly<BotReplyStagingRecipientFingerprintDeriver> {
  const cryptoObject = options.crypto ??
    (typeof crypto === "undefined" ? undefined : crypto);
  const keyBytes = decodeKey(
    environment?.BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1,
  );
  const configured = Boolean(
    cryptoObject?.subtle &&
      typeof cryptoObject.subtle.importKey === "function" &&
      typeof cryptoObject.subtle.sign === "function" &&
      keyBytes,
  );
  let keyPromise: Promise<CryptoKey> | null = null;

  const requireKey = (): Promise<CryptoKey> => {
    if (!configured || !cryptoObject || !keyBytes) {
      throw new Error(
        "Bot reply staging recipient fingerprint is unavailable",
      );
    }
    if (keyPromise === null) {
      keyPromise = cryptoObject.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      ).finally(() => keyBytes.fill(0));
    }
    return keyPromise;
  };

  return Object.freeze({
    isConfigured() {
      return configured;
    },

    async derive(recipientPhoneNumber: string) {
      if (!phoneNumberPattern.test(recipientPhoneNumber)) {
        throw new Error(
          "Bot reply staging recipient phone number is invalid",
        );
      }
      const key = await requireKey();
      const payload = new TextEncoder().encode(JSON.stringify([
        "connect",
        "bot-reply-staging-recipient",
        keyVersion,
        recipientPhoneNumber,
      ]));
      const signature = new Uint8Array(
        await cryptoObject!.subtle.sign("HMAC", key, payload),
      );
      if (signature.byteLength !== 32) {
        throw new Error(
          "Bot reply staging recipient fingerprint is invalid",
        );
      }
      return `sha256:${hexadecimal(signature)}`;
    },
  });
}
