import { postgresMetaTenantBarrierCte } from "./postgresMetaTenantBarrier.ts";
import type {
  EncryptedMetaCredentialEnvelope,
  MetaCredentialRepository,
  StoreEncryptedMetaCredentialInput,
} from "../../db/metaCredentialRepository.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const KEY_VERSION = "v1";
const INITIALIZATION_VECTOR_PATTERN = /^[A-Za-z0-9+/]{16}$/;
const CIPHERTEXT_PATTERN = /^[A-Za-z0-9+/]{22,11998}={0,2}$/;
const envelopeRowKeys = Object.freeze([
  "tenantId",
  "authorizationVersion",
  "keyVersion",
  "initializationVector",
  "ciphertext",
  "createdAt",
  "updatedAt",
]);

const envelopeColumns = `
  envelope.tenant_id AS "tenantId",
  envelope.key_version AS "keyVersion",
  envelope.initialization_vector AS "initializationVector",
  envelope.ciphertext,
  envelope.created_at AS "createdAt",
  envelope.updated_at AS "updatedAt",
  CASE WHEN connection.status = 'connected' THEN connection.version - 1
    ELSE connection.version END AS "authorizationVersion"
`;

export const postgresMetaCredentialSql = Object.freeze({
  store: `
    WITH ${postgresMetaTenantBarrierCte}, pending_connection AS MATERIALIZED (
      SELECT tenant_id FROM meta_connections CROSS JOIN tenant_barrier
      WHERE tenant_id = $1 AND status = 'pending' AND version = $5
      FOR UPDATE OF meta_connections
    )
    INSERT INTO meta_credential_envelopes (
      tenant_id,
      key_version,
      initialization_vector,
      ciphertext
    )
    SELECT tenant_id, $2, $3, $4 FROM pending_connection
    WHERE true
    ON CONFLICT (tenant_id) DO UPDATE SET
      key_version = EXCLUDED.key_version,
      initialization_vector = EXCLUDED.initialization_vector,
      ciphertext = EXCLUDED.ciphertext,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    RETURNING tenant_id AS "tenantId"
  `,
  findByTenantId: `
    SELECT ${envelopeColumns}
    FROM meta_credential_envelopes AS envelope
    INNER JOIN meta_connections AS connection ON connection.tenant_id = envelope.tenant_id
    WHERE envelope.tenant_id = $1
      AND connection.status IN ('pending', 'connected')
    LIMIT 1
  `,
});

function requireTenantId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("tenantId must be a positive integer");
  }

  return value;
}

function requireKeyVersion(value: string): typeof KEY_VERSION {
  if (value !== KEY_VERSION) {
    throw new Error("Meta credential key version is invalid");
  }

  return value;
}

function requireInitializationVector(value: string): string {
  if (!INITIALIZATION_VECTOR_PATTERN.test(value)) {
    throw new Error("Meta credential initialization vector is invalid");
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
  value: unknown,
): Readonly<EncryptedMetaCredentialEnvelope> {
  const row = requireExactPostgresRow(value, envelopeRowKeys);

  if (
    typeof row.keyVersion !== "string" ||
    typeof row.initializationVector !== "string" ||
    typeof row.ciphertext !== "string"
  ) {
    throw new Error("PostgreSQL returned an invalid Meta credential");
  }

  return Object.freeze({
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    authorizationVersion: parsePostgresPositiveInteger(row.authorizationVersion),
    keyVersion: requireKeyVersion(row.keyVersion),
    initializationVector: requireInitializationVector(
      row.initializationVector,
    ),
    ciphertext: requireCiphertext(row.ciphertext),
    createdAt: parsePostgresTimestamp(row.createdAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
  });
}

export function createPostgresMetaCredentialRepository(
  queries: PostgresQueryExecutor,
): MetaCredentialRepository {
  if (typeof queries?.query !== "function") {
    throw new Error("PostgreSQL Meta credential dependency is invalid");
  }

  return Object.freeze({
    async store(input: StoreEncryptedMetaCredentialInput) {
      const tenantId = requireTenantId(input.tenantId);
      const expectedVersion = input.expectedConnectionVersion;
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion <= 0) {
        throw new Error("Meta credential connection version is invalid");
      }
      const result = await queries.query<Record<string, unknown>>(
        postgresMetaCredentialSql.store,
        [
          tenantId,
          requireKeyVersion(input.keyVersion),
          requireInitializationVector(input.initializationVector),
          requireCiphertext(input.ciphertext),
          expectedVersion,
        ],
      );
      const rows = requirePostgresRows(result, 1);

      if (
        rows.length !== 1 ||
        parsePostgresPositiveInteger(
          requireExactPostgresRow(rows[0], ["tenantId"]).tenantId,
        ) !== tenantId
      ) {
        throw new Error("PostgreSQL Meta credential write was not confirmed");
      }
    },

    async findByTenantId(tenantIdInput: number) {
      const tenantId = requireTenantId(tenantIdInput);
      const result = await queries.query<Record<string, unknown>>(
        postgresMetaCredentialSql.findByTenantId,
        [tenantId],
      );
      const rows = requirePostgresRows(result, 1);
      const envelope = rows.length === 0 ? null : parseEnvelope(rows[0]);

      if (envelope !== null && envelope.tenantId !== tenantId) {
        throw new Error("PostgreSQL returned a cross-tenant Meta credential");
      }

      return envelope;
    },
  });
}
