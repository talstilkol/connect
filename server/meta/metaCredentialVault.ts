import type {
  MetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import {
  toSensitiveMetaAccessToken,
  type MetaCredentialVault,
  type SensitiveMetaAccessToken,
} from "./metaPorts.ts";

const KEY_VERSION = "v1";
const ENCRYPTION_KEY_PATTERN =
  /^[A-Za-z0-9+/]{43}=$/;
const INITIALIZATION_VECTOR_BYTES = 12;
const AUTHENTICATION_TAG_BITS = 128;
type OwnedBytes = Uint8Array<ArrayBuffer>;

export interface MetaCredentialEncryptionEnvironment {
  META_CREDENTIAL_ENCRYPTION_KEY_V1?: string;
}

export type MetaCredentialVaultErrorCode =
  | "INVALID_CONFIGURATION"
  | "ENCRYPTION_FAILED"
  | "STORAGE_FAILED"
  | "CREDENTIAL_NOT_FOUND"
  | "DECRYPTION_FAILED";

export class MetaCredentialVaultError extends Error {
  readonly code: MetaCredentialVaultErrorCode;

  constructor(
    code: MetaCredentialVaultErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MetaCredentialVaultError";
    this.code = code;
  }
}

export interface MetaCredentialVaultOptions {
  crypto?: Pick<Crypto, "subtle" | "getRandomValues">;
}

function requireTenantId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new MetaCredentialVaultError(
      "STORAGE_FAILED",
      "Meta credential tenant scope is invalid",
    );
  }

  return value;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(
  value: string,
  errorCode: MetaCredentialVaultErrorCode,
): OwnedBytes {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    if (bytesToBase64(bytes) !== value) {
      throw new Error("Non-canonical base64");
    }

    return bytes;
  } catch {
    throw new MetaCredentialVaultError(
      errorCode,
      "Meta credential encoding is invalid",
    );
  }
}

function requireCrypto(
  value:
    | Pick<Crypto, "subtle" | "getRandomValues">
    | undefined,
): Pick<Crypto, "subtle" | "getRandomValues"> {
  const cryptoObject =
    value ??
    (typeof crypto === "undefined" ? undefined : crypto);

  if (
    !cryptoObject ||
    !cryptoObject.subtle ||
    typeof cryptoObject.subtle.importKey !== "function" ||
    typeof cryptoObject.subtle.encrypt !== "function" ||
    typeof cryptoObject.subtle.decrypt !== "function" ||
    typeof cryptoObject.getRandomValues !== "function"
  ) {
    throw new MetaCredentialVaultError(
      "INVALID_CONFIGURATION",
      "Web Crypto is unavailable for Meta credentials",
    );
  }

  return cryptoObject;
}

function requireEncryptionKeyBytes(
  environment: MetaCredentialEncryptionEnvironment,
): OwnedBytes {
  const encodedKey =
    environment.META_CREDENTIAL_ENCRYPTION_KEY_V1?.trim();

  if (
    !encodedKey ||
    !ENCRYPTION_KEY_PATTERN.test(encodedKey)
  ) {
    throw new MetaCredentialVaultError(
      "INVALID_CONFIGURATION",
      "Meta credential encryption key is invalid",
    );
  }

  const keyBytes = base64ToBytes(
    encodedKey,
    "INVALID_CONFIGURATION",
  );

  if (keyBytes.byteLength !== 32) {
    keyBytes.fill(0);
    throw new MetaCredentialVaultError(
      "INVALID_CONFIGURATION",
      "Meta credential encryption key is invalid",
    );
  }

  return keyBytes;
}

export function inspectMetaCredentialEncryptionConfiguration(
  environment: MetaCredentialEncryptionEnvironment,
): "configured" | "invalid" {
  try {
    const keyBytes = requireEncryptionKeyBytes(environment);
    keyBytes.fill(0);
    return "configured";
  } catch {
    return "invalid";
  }
}

function credentialAdditionalData(
  tenantId: number,
): OwnedBytes {
  return new Uint8Array(
    new TextEncoder().encode(
      `connect:meta-access-token:${KEY_VERSION}:tenant:${tenantId}`,
    ),
  );
}

export function createMetaCredentialVault(
  repository: MetaCredentialRepository,
  environment: MetaCredentialEncryptionEnvironment,
  options: MetaCredentialVaultOptions = {},
): MetaCredentialVault {
  const cryptoObject = requireCrypto(options.crypto);
  const keyBytes = requireEncryptionKeyBytes(environment);
  let keyPromise: Promise<CryptoKey> | null = null;

  const requireKey = (): Promise<CryptoKey> => {
    if (keyPromise === null) {
      keyPromise = cryptoObject.subtle
        .importKey(
          "raw",
          keyBytes,
          { name: "AES-GCM" },
          false,
          ["encrypt", "decrypt"],
        )
        .finally(() => {
          keyBytes.fill(0);
        });
    }

    return keyPromise;
  };

  return {
    async storeAccessToken(tenantId, accessToken) {
      const normalizedTenantId = requireTenantId(tenantId);
      const plaintext = new Uint8Array(
        new TextEncoder().encode(accessToken),
      );
      const initializationVector = new Uint8Array(
        INITIALIZATION_VECTOR_BYTES,
      );

      try {
        cryptoObject.getRandomValues(initializationVector);
        const key = await requireKey();
        const encrypted = await cryptoObject.subtle.encrypt(
          {
            name: "AES-GCM",
            iv: initializationVector,
            additionalData:
              credentialAdditionalData(normalizedTenantId),
            tagLength: AUTHENTICATION_TAG_BITS,
          },
          key,
          plaintext,
        );

        try {
          await repository.store({
            tenantId: normalizedTenantId,
            keyVersion: KEY_VERSION,
            initializationVector: bytesToBase64(
              initializationVector,
            ),
            ciphertext: bytesToBase64(
              new Uint8Array(encrypted),
            ),
          });
        } catch {
          throw new MetaCredentialVaultError(
            "STORAGE_FAILED",
            "Encrypted Meta credential could not be stored",
          );
        }
      } catch (error) {
        if (error instanceof MetaCredentialVaultError) {
          throw error;
        }

        throw new MetaCredentialVaultError(
          "ENCRYPTION_FAILED",
          "Meta credential encryption failed",
        );
      } finally {
        plaintext.fill(0);
        initializationVector.fill(0);
      }
    },

    async withAccessToken<TResult>(
      tenantId: number,
      operation: (
        accessToken: SensitiveMetaAccessToken,
      ) => Promise<TResult>,
    ): Promise<TResult> {
      const normalizedTenantId = requireTenantId(tenantId);
      let envelope;

      try {
        envelope = await repository.findByTenantId(
          normalizedTenantId,
        );
      } catch {
        throw new MetaCredentialVaultError(
          "STORAGE_FAILED",
          "Encrypted Meta credential could not be read",
        );
      }

      if (!envelope) {
        throw new MetaCredentialVaultError(
          "CREDENTIAL_NOT_FOUND",
          "Meta credential is unavailable",
        );
      }

      let plaintext: OwnedBytes | null = null;
      let accessToken: SensitiveMetaAccessToken;

      try {
        const initializationVector = base64ToBytes(
          envelope.initializationVector,
          "DECRYPTION_FAILED",
        );
        const ciphertext = base64ToBytes(
          envelope.ciphertext,
          "DECRYPTION_FAILED",
        );

        if (
          envelope.keyVersion !== KEY_VERSION ||
          initializationVector.byteLength !==
            INITIALIZATION_VECTOR_BYTES
        ) {
          throw new MetaCredentialVaultError(
            "DECRYPTION_FAILED",
            "Meta credential envelope is invalid",
          );
        }

        const key = await requireKey();
        const decrypted = await cryptoObject.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: initializationVector,
            additionalData:
              credentialAdditionalData(normalizedTenantId),
            tagLength: AUTHENTICATION_TAG_BITS,
          },
          key,
          ciphertext,
        );
        plaintext = new Uint8Array(decrypted);
        accessToken = toSensitiveMetaAccessToken(
          new TextDecoder("utf-8", {
            fatal: true,
          }).decode(plaintext),
        );
      } catch (error) {
        if (
          error instanceof MetaCredentialVaultError &&
          error.code !== "DECRYPTION_FAILED"
        ) {
          plaintext?.fill(0);
          throw error;
        }

        plaintext?.fill(0);
        throw new MetaCredentialVaultError(
          "DECRYPTION_FAILED",
          "Meta credential decryption failed",
        );
      }

      try {
        return await operation(accessToken);
      } finally {
        plaintext?.fill(0);
      }
    },
  };
}
