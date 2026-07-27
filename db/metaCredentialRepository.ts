import type { D1DatabaseBinding } from "./d1";

const KEY_VERSION = "v1";
const INITIALIZATION_VECTOR_PATTERN =
  /^[A-Za-z0-9+/]{16}$/;
const CIPHERTEXT_PATTERN =
  /^[A-Za-z0-9+/]{22,11998}={0,2}$/;

const UPSERT_ENVELOPE_SQL = `
  INSERT INTO meta_credential_envelopes (
    tenant_id,
    key_version,
    initialization_vector,
    ciphertext
  )
  VALUES (?1, ?2, ?3, ?4)
  ON CONFLICT (tenant_id) DO UPDATE SET
    key_version = excluded.key_version,
    initialization_vector = excluded.initialization_vector,
    ciphertext = excluded.ciphertext,
    updated_at = CURRENT_TIMESTAMP
`;

const SELECT_ENVELOPE_SQL = `
  SELECT
    tenant_id AS tenantId,
    key_version AS keyVersion,
    initialization_vector AS initializationVector,
    ciphertext,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM meta_credential_envelopes
  WHERE tenant_id = ?1
  LIMIT 1
`;

export interface EncryptedMetaCredentialEnvelope {
  tenantId: number;
  keyVersion: typeof KEY_VERSION;
  initializationVector: string;
  ciphertext: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreEncryptedMetaCredentialInput {
  tenantId: number;
  keyVersion: typeof KEY_VERSION;
  initializationVector: string;
  ciphertext: string;
}

export interface MetaCredentialRepository {
  store(
    input: StoreEncryptedMetaCredentialInput,
  ): Promise<void>;
  findByTenantId(
    tenantId: number,
  ): Promise<EncryptedMetaCredentialEnvelope | null>;
}

function requireTenantId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("tenantId must be a positive integer");
  }

  return value;
}

function requireKeyVersion(
  value: string,
): typeof KEY_VERSION {
  if (value !== KEY_VERSION) {
    throw new Error("Meta credential key version is invalid");
  }

  return value;
}

function requireInitializationVector(value: string): string {
  if (!INITIALIZATION_VECTOR_PATTERN.test(value)) {
    throw new Error(
      "Meta credential initialization vector is invalid",
    );
  }

  return value;
}

function requireCiphertext(value: string): string {
  if (
    value.length < 24 ||
    value.length > 12_000 ||
    !CIPHERTEXT_PATTERN.test(value)
  ) {
    throw new Error("Meta credential ciphertext is invalid");
  }

  return value;
}

function parseEnvelope(
  value: EncryptedMetaCredentialEnvelope,
): EncryptedMetaCredentialEnvelope {
  requireTenantId(value.tenantId);
  requireKeyVersion(value.keyVersion);
  requireInitializationVector(value.initializationVector);
  requireCiphertext(value.ciphertext);

  if (!value.createdAt || !value.updatedAt) {
    throw new Error("D1 returned an invalid Meta credential");
  }

  return value;
}

export function createMetaCredentialRepository(
  database: D1DatabaseBinding,
): MetaCredentialRepository {
  return {
    async store(input) {
      const tenantId = requireTenantId(input.tenantId);
      const keyVersion = requireKeyVersion(
        input.keyVersion,
      );
      const initializationVector =
        requireInitializationVector(
          input.initializationVector,
        );
      const ciphertext = requireCiphertext(input.ciphertext);
      const result = await database
        .prepare(UPSERT_ENVELOPE_SQL)
        .bind(
          tenantId,
          keyVersion,
          initializationVector,
          ciphertext,
        )
        .run();

      if (!result.success) {
        throw new Error(
          result.error ?? "D1 Meta credential write failed",
        );
      }
    },

    async findByTenantId(tenantId) {
      const envelope = await database
        .prepare(SELECT_ENVELOPE_SQL)
        .bind(requireTenantId(tenantId))
        .first<EncryptedMetaCredentialEnvelope>();

      return envelope ? parseEnvelope(envelope) : null;
    },
  };
}
