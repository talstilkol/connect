import type {
  ContactRepository,
  PersistedContact,
} from "../../db/contactRepository.ts";
import {
  validatePersistedContact,
} from "../../shared/validation/persistedContact.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const maximumPageSize = 100;
const contactRowKeys = Object.freeze([
  "id",
  "tenantId",
  "phoneNumber",
  "firstName",
  "lastName",
  "email",
  "company",
  "mailingStatus",
  "consentStatus",
  "consentSource",
  "consentRecordedAt",
  "consentWithdrawnAt",
  "consentEvidenceReference",
  "version",
  "createdAt",
  "updatedAt",
]);

export const postgresContactReadSql = Object.freeze({
  findByTenantAndId: `
    SELECT
      id,
      tenant_id AS "tenantId",
      phone_e164 AS "phoneNumber",
      first_name AS "firstName",
      last_name AS "lastName",
      email,
      company,
      mailing_status AS "mailingStatus",
      consent_status AS "consentStatus",
      consent_source AS "consentSource",
      consent_recorded_at AS "consentRecordedAt",
      consent_withdrawn_at AS "consentWithdrawnAt",
      consent_evidence_reference AS "consentEvidenceReference",
      version,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM contacts
    WHERE tenant_id = $1
      AND id = $2
    LIMIT 1
  `,
  findByTenantAndPhone: `
    SELECT
      id,
      tenant_id AS "tenantId",
      phone_e164 AS "phoneNumber",
      first_name AS "firstName",
      last_name AS "lastName",
      email,
      company,
      mailing_status AS "mailingStatus",
      consent_status AS "consentStatus",
      consent_source AS "consentSource",
      consent_recorded_at AS "consentRecordedAt",
      consent_withdrawn_at AS "consentWithdrawnAt",
      consent_evidence_reference AS "consentEvidenceReference",
      version,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM contacts
    WHERE tenant_id = $1
      AND phone_e164 = $2
    LIMIT 1
  `,
  listPageByTenant: `
    SELECT
      id,
      tenant_id AS "tenantId",
      phone_e164 AS "phoneNumber",
      first_name AS "firstName",
      last_name AS "lastName",
      email,
      company,
      mailing_status AS "mailingStatus",
      consent_status AS "consentStatus",
      consent_source AS "consentSource",
      consent_recorded_at AS "consentRecordedAt",
      consent_withdrawn_at AS "consentWithdrawnAt",
      consent_evidence_reference AS "consentEvidenceReference",
      version,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM contacts
    WHERE tenant_id = $1
      AND ($2::bigint IS NULL OR id < $2)
    ORDER BY id DESC
    LIMIT $3
  `,
});

export interface PostgresContactReadRepository {
  readonly findByTenantAndPhone: ContactRepository["findByTenantAndPhone"];
  readonly findByTenantAndId: ContactRepository["findByTenantAndId"];
  readonly listPageByTenant: ContactRepository["listPageByTenant"];
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return Number(value);
}

function requireNullableString(
  value: unknown,
  maximumLength: number,
): string | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value !== value.trim()
  ) {
    throw new Error("PostgreSQL returned an invalid contact string");
  }

  return value;
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function parseContact(value: unknown): Readonly<PersistedContact> {
  const row = requireExactPostgresRow(value, contactRowKeys);
  const profile = {
    phoneNumber: row.phoneNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    company: row.company,
  };
  const validation = validatePersistedContact(profile);

  if (
    !validation.success ||
    validation.value.phoneNumber !== row.phoneNumber ||
    validation.value.firstName !== row.firstName ||
    validation.value.lastName !== row.lastName ||
    validation.value.email !== row.email ||
    validation.value.company !== row.company
  ) {
    throw new Error("PostgreSQL returned an invalid contact profile");
  }

  if (
    row.mailingStatus !== "subscribed" &&
    row.mailingStatus !== "unsubscribed"
  ) {
    throw new Error("PostgreSQL returned an invalid mailing status");
  }
  if (
    row.consentStatus !== "unknown" &&
    row.consentStatus !== "granted" &&
    row.consentStatus !== "withdrawn"
  ) {
    throw new Error("PostgreSQL returned an invalid consent status");
  }

  const consentSource = requireNullableString(row.consentSource, 256);
  const consentRecordedAt = parseNullableTimestamp(row.consentRecordedAt);
  const consentWithdrawnAt = parseNullableTimestamp(
    row.consentWithdrawnAt,
  );
  const consentEvidenceReference = requireNullableString(
    row.consentEvidenceReference,
    2_048,
  );
  const consentStateValid =
    (row.consentStatus === "unknown" &&
      row.mailingStatus === "unsubscribed" &&
      consentSource === null &&
      consentRecordedAt === null &&
      consentWithdrawnAt === null) ||
    (row.consentStatus === "granted" &&
      row.mailingStatus === "subscribed" &&
      consentSource !== null &&
      consentRecordedAt !== null &&
      consentWithdrawnAt === null) ||
    (row.consentStatus === "withdrawn" &&
      row.mailingStatus === "unsubscribed" &&
      consentSource !== null &&
      consentRecordedAt !== null &&
      consentWithdrawnAt !== null &&
      consentWithdrawnAt >= consentRecordedAt);

  if (!consentStateValid) {
    throw new Error("PostgreSQL returned an inconsistent consent state");
  }

  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);
  if (updatedAt < createdAt) {
    throw new Error("PostgreSQL returned an invalid contact timeline");
  }

  return Object.freeze({
    id: parsePostgresPositiveInteger(row.id),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    ...validation.value,
    mailingStatus: row.mailingStatus,
    consentStatus: row.consentStatus,
    consentSource,
    consentRecordedAt,
    consentWithdrawnAt,
    consentEvidenceReference,
    version: parsePostgresPositiveInteger(row.version),
    createdAt,
    updatedAt,
  });
}

function validatePage(
  contacts: readonly Readonly<PersistedContact>[],
  tenantId: number,
  beforeContactId: number | null,
): void {
  for (let index = 0; index < contacts.length; index += 1) {
    const contact = contacts[index]!;
    const previous = index === 0 ? null : contacts[index - 1]!;

    if (
      contact.tenantId !== tenantId ||
      (beforeContactId !== null && contact.id >= beforeContactId) ||
      (previous !== null && previous.id <= contact.id)
    ) {
      throw new Error("PostgreSQL returned an invalid contact page");
    }
  }
}

export function createPostgresContactReadRepository(
  queries: PostgresQueryExecutor,
): Readonly<PostgresContactReadRepository> {
  if (typeof queries?.query !== "function") {
    throw new Error("PostgreSQL contact read dependencies are invalid");
  }

  return Object.freeze({
    async findByTenantAndId(
      tenantIdInput: number,
      contactIdInput: number,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const contactId = requirePositiveInteger(contactIdInput, "contactId");
      const result = await queries.query<Record<string, unknown>>(
        postgresContactReadSql.findByTenantAndId,
        [tenantId, contactId],
      );
      const rows = requirePostgresRows(result, 1);
      const contact = rows.length === 0 ? null : parseContact(rows[0]);
      if (
        contact !== null &&
        (contact.tenantId !== tenantId || contact.id !== contactId)
      ) {
        throw new Error("PostgreSQL returned a cross-tenant contact");
      }
      return contact;
    },

    async findByTenantAndPhone(
      tenantIdInput: number,
      phoneNumberInput: string,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const validation = validatePersistedContact({
        phoneNumber: phoneNumberInput,
        firstName: null,
        lastName: null,
        email: null,
        company: null,
      });

      if (
        !validation.success ||
        validation.value.phoneNumber !== phoneNumberInput
      ) {
        throw new Error("phoneNumber must be a canonical E.164 value");
      }

      const result = await queries.query<Record<string, unknown>>(
        postgresContactReadSql.findByTenantAndPhone,
        [tenantId, phoneNumberInput],
      );
      const rows = requirePostgresRows(result, 1);
      const contact = rows.length === 0 ? null : parseContact(rows[0]);

      if (contact !== null && contact.tenantId !== tenantId) {
        throw new Error("PostgreSQL returned a cross-tenant contact");
      }

      return contact;
    },

    async listPageByTenant(
      tenantIdInput: number,
      beforeContactIdInput: number | null,
      limitInput: number,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const beforeContactId = beforeContactIdInput === null
        ? null
        : requirePositiveInteger(beforeContactIdInput, "beforeContactId");
      const limit = requirePositiveInteger(limitInput, "limit");

      if (limit > maximumPageSize) {
        throw new Error("limit must not exceed 100");
      }

      const result = await queries.query<Record<string, unknown>>(
        postgresContactReadSql.listPageByTenant,
        [tenantId, beforeContactId, limit],
      );
      const contacts = requirePostgresRows(result, limit).map(parseContact);
      validatePage(contacts, tenantId, beforeContactId);
      return Object.freeze(contacts);
    },
  });
}
