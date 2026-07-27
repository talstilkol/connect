import type {
  ConsentStatus,
  MailingStatus,
} from "../shared/domain/model";
import type { PersistedContactProfile } from "../shared/validation/persistedContact";
import type { D1DatabaseBinding } from "./d1";

const UPSERT_CONTACT_PROFILE_SQL = `
  INSERT INTO contacts (
    tenant_id,
    phone_e164,
    first_name,
    last_name,
    email,
    company
  )
  VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  ON CONFLICT (tenant_id, phone_e164) DO UPDATE SET
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    company = excluded.company,
    version = contacts.version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE contacts.first_name IS NOT excluded.first_name
    OR contacts.last_name IS NOT excluded.last_name
    OR contacts.email IS NOT excluded.email
    OR contacts.company IS NOT excluded.company
`;

const SELECT_CONTACT_BY_PHONE_SQL = `
  SELECT
    id,
    tenant_id AS tenantId,
    phone_e164 AS phoneNumber,
    first_name AS firstName,
    last_name AS lastName,
    email,
    company,
    mailing_status AS mailingStatus,
    consent_status AS consentStatus,
    consent_source AS consentSource,
    consent_recorded_at AS consentRecordedAt,
    consent_withdrawn_at AS consentWithdrawnAt,
    consent_evidence_reference AS consentEvidenceReference,
    version,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM contacts
  WHERE tenant_id = ?1
    AND phone_e164 = ?2
  LIMIT 1
`;

const SELECT_CONTACT_BY_ID_SQL = `
  SELECT
    id,
    tenant_id AS tenantId,
    phone_e164 AS phoneNumber,
    first_name AS firstName,
    last_name AS lastName,
    email,
    company,
    mailing_status AS mailingStatus,
    consent_status AS consentStatus,
    consent_source AS consentSource,
    consent_recorded_at AS consentRecordedAt,
    consent_withdrawn_at AS consentWithdrawnAt,
    consent_evidence_reference AS consentEvidenceReference,
    version,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM contacts
  WHERE tenant_id = ?1
    AND id = ?2
  LIMIT 1
`;

const LIST_CONTACT_PAGE_SQL = `
  SELECT
    id,
    tenant_id AS tenantId,
    phone_e164 AS phoneNumber,
    first_name AS firstName,
    last_name AS lastName,
    email,
    company,
    mailing_status AS mailingStatus,
    consent_status AS consentStatus,
    consent_source AS consentSource,
    consent_recorded_at AS consentRecordedAt,
    consent_withdrawn_at AS consentWithdrawnAt,
    consent_evidence_reference AS consentEvidenceReference,
    version,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM contacts
  WHERE tenant_id = ?1
    AND (?2 IS NULL OR id < ?2)
  ORDER BY id DESC
  LIMIT ?3
`;

interface ContactRow {
  id: number;
  tenantId: number;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  mailingStatus: string;
  consentStatus: string;
  consentSource: string | null;
  consentRecordedAt: string | null;
  consentWithdrawnAt: string | null;
  consentEvidenceReference: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedContact extends PersistedContactProfile {
  id: number;
  tenantId: number;
  mailingStatus: MailingStatus;
  consentStatus: ConsentStatus;
  consentSource: string | null;
  consentRecordedAt: string | null;
  consentWithdrawnAt: string | null;
  consentEvidenceReference: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveContactProfileInput extends PersistedContactProfile {
  tenantId: number;
}

export interface ContactRepository {
  saveProfile(input: SaveContactProfileInput): Promise<PersistedContact>;
  findByTenantAndPhone(
    tenantId: number,
    phoneNumber: string,
  ): Promise<PersistedContact | null>;
  findByTenantAndId(
    tenantId: number,
    contactId: number,
  ): Promise<PersistedContact | null>;
  listByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedContact[]>;
  listPageByTenant(
    tenantId: number,
    beforeContactId: number | null,
    limit: number,
  ): Promise<readonly PersistedContact[]>;
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function isMailingStatus(value: string): value is MailingStatus {
  return value === "subscribed" || value === "unsubscribed";
}

function isConsentStatus(value: string): value is ConsentStatus {
  return (
    value === "unknown" ||
    value === "granted" ||
    value === "withdrawn"
  );
}

export function parseContactRow(row: ContactRow): PersistedContact {
  if (!Number.isSafeInteger(row.id) || row.id <= 0) {
    throw new Error("D1 returned an invalid contact ID");
  }

  if (!Number.isSafeInteger(row.tenantId) || row.tenantId <= 0) {
    throw new Error("D1 returned an invalid contact tenant ID");
  }

  if (!isMailingStatus(row.mailingStatus)) {
    throw new Error("D1 returned an invalid mailing status");
  }

  if (!isConsentStatus(row.consentStatus)) {
    throw new Error("D1 returned an invalid consent status");
  }

  if (!Number.isSafeInteger(row.version) || row.version <= 0) {
    throw new Error("D1 returned an invalid contact version");
  }

  return {
    ...row,
    mailingStatus: row.mailingStatus,
    consentStatus: row.consentStatus,
  };
}

export function createContactRepository(
  database: D1DatabaseBinding,
): ContactRepository {
  const listPageByTenant: ContactRepository["listPageByTenant"] = async (
    tenantId,
    beforeContactId,
    limit,
  ) => {
    assertPositiveInteger(tenantId, "tenantId");
    assertPositiveInteger(limit, "limit");

    if (beforeContactId !== null) {
      assertPositiveInteger(beforeContactId, "beforeContactId");
    }

    if (limit > 100) {
      throw new Error("limit must not exceed 100");
    }

    const result = await database
      .prepare(LIST_CONTACT_PAGE_SQL)
      .bind(tenantId, beforeContactId, limit)
      .all<ContactRow>();

    if (!result.success) {
      throw new Error(result.error ?? "D1 contact list read failed");
    }

    return (result.results ?? []).map(parseContactRow);
  };

  return {
    async saveProfile(input) {
      assertPositiveInteger(input.tenantId, "tenantId");

      const writeResult = await database
        .prepare(UPSERT_CONTACT_PROFILE_SQL)
        .bind(
          input.tenantId,
          input.phoneNumber,
          input.firstName,
          input.lastName,
          input.email,
          input.company,
        )
        .run();

      if (!writeResult.success) {
        throw new Error(writeResult.error ?? "D1 contact write failed");
      }

      const contact = await database
        .prepare(SELECT_CONTACT_BY_PHONE_SQL)
        .bind(input.tenantId, input.phoneNumber)
        .first<ContactRow>();

      if (!contact) {
        throw new Error("D1 did not return the saved contact");
      }

      return parseContactRow(contact);
    },

    async findByTenantAndPhone(tenantId, phoneNumber) {
      assertPositiveInteger(tenantId, "tenantId");

      const contact = await database
        .prepare(SELECT_CONTACT_BY_PHONE_SQL)
        .bind(tenantId, phoneNumber)
        .first<ContactRow>();

      return contact ? parseContactRow(contact) : null;
    },

    async findByTenantAndId(tenantId, contactId) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(contactId, "contactId");

      const contact = await database
        .prepare(SELECT_CONTACT_BY_ID_SQL)
        .bind(tenantId, contactId)
        .first<ContactRow>();

      return contact ? parseContactRow(contact) : null;
    },

    listByTenant(tenantId, limit) {
      return listPageByTenant(tenantId, null, limit);
    },

    listPageByTenant,
  };
}
