import type {
  CampaignAudienceRepository,
} from "../../db/campaignAudienceRepository.ts";
import type {
  CampaignAudienceContact,
  CampaignAudienceSource,
} from "../../shared/domain/campaignAudience.ts";
import {
  validateCampaignAudienceSource,
} from "../../shared/validation/campaignAudience.ts";
import {
  parsePostgresPositiveInteger,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const maximumAudienceReadLimit = 100_001;
const audienceRowKeys = Object.freeze([
  "company",
  "consentStatus",
  "contactId",
  "email",
  "firstName",
  "lastName",
  "mailingStatus",
  "phoneNumber",
  "tenantId",
  "version",
]);

export const postgresCampaignAudienceSql = Object.freeze({
  listEligibleBySource: `
    SELECT
      contact.tenant_id AS "tenantId",
      contact.id AS "contactId",
      contact.phone_e164 AS "phoneNumber",
      contact.first_name AS "firstName",
      contact.last_name AS "lastName",
      contact.email,
      contact.company,
      contact.mailing_status AS "mailingStatus",
      contact.consent_status AS "consentStatus",
      contact.version
    FROM contacts AS contact
    WHERE contact.tenant_id = $1
      AND contact.mailing_status = 'subscribed'
      AND contact.consent_status = 'granted'
      AND (
        $2 = 'all'
        OR (
          $2 = 'list'
          AND EXISTS (
            SELECT 1
            FROM contact_list_memberships AS membership
            INNER JOIN contact_lists AS contact_list
              ON contact_list.tenant_id = membership.tenant_id
             AND contact_list.id = membership.list_id
            WHERE membership.tenant_id = $1
              AND membership.contact_id = contact.id
              AND membership.list_id = $3
          )
        )
        OR (
          $2 = 'tag'
          AND EXISTS (
            SELECT 1
            FROM contact_tag_assignments AS assignment
            INNER JOIN contact_tags AS tag
              ON tag.tenant_id = assignment.tenant_id
             AND tag.id = assignment.tag_id
            WHERE assignment.tenant_id = $1
              AND assignment.contact_id = contact.id
              AND assignment.tag_id = $3
          )
        )
      )
    ORDER BY contact.id ASC
    LIMIT $4
  `,
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return Number(value);
}

function requireNullableText(value: unknown): string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error("PostgreSQL returned invalid audience profile data");
  }
  return value;
}

function sourceGroupId(source: CampaignAudienceSource): number {
  if (source.kind === "list") return source.listId;
  if (source.kind === "tag") return source.tagId;
  return 0;
}

function parseAudienceContact(
  value: unknown,
  tenantId: number,
): Readonly<CampaignAudienceContact> {
  const row = requireExactPostgresRow(value, audienceRowKeys);
  if (parsePostgresPositiveInteger(row.tenantId) !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant campaign audience");
  }
  if (
    typeof row.phoneNumber !== "string" ||
    !/^\+[1-9][0-9]{0,14}$/.test(row.phoneNumber) ||
    row.mailingStatus !== "subscribed" ||
    row.consentStatus !== "granted"
  ) {
    throw new Error("PostgreSQL returned an invalid campaign audience contact");
  }

  return Object.freeze({
    contactId: parsePostgresPositiveInteger(row.contactId),
    phoneNumber: row.phoneNumber,
    firstName: requireNullableText(row.firstName),
    lastName: requireNullableText(row.lastName),
    email: requireNullableText(row.email),
    company: requireNullableText(row.company),
    mailingStatus: row.mailingStatus,
    consentStatus: row.consentStatus,
    version: parsePostgresPositiveInteger(row.version),
  });
}

function requireOrderedUniqueContacts(
  contacts: readonly Readonly<CampaignAudienceContact>[],
): void {
  for (let index = 0; index < contacts.length; index += 1) {
    const previous = index === 0 ? null : contacts[index - 1]!;
    const current = contacts[index]!;
    if (previous !== null && previous.contactId >= current.contactId) {
      throw new Error(
        "PostgreSQL returned an unordered campaign audience",
      );
    }
  }
}

export function createPostgresCampaignAudienceRepository(
  queries: PostgresQueryExecutor,
): CampaignAudienceRepository {
  if (typeof queries?.query !== "function") {
    throw new Error("PostgreSQL campaign audience dependency is invalid");
  }

  return Object.freeze({
    async listEligibleBySource(
      tenantId: number,
      source: CampaignAudienceSource,
      limit: number,
    ) {
      const validatedTenantId = requirePositiveInteger(tenantId, "tenantId");
      const validatedLimit = requirePositiveInteger(limit, "limit");
      const validatedSource = validateCampaignAudienceSource(source);
      if (
        validatedLimit > maximumAudienceReadLimit ||
        !validatedSource.success
      ) {
        throw new Error("campaign audience query is invalid");
      }

      const rows = requirePostgresRows(
        await queries.query<unknown>(
          postgresCampaignAudienceSql.listEligibleBySource,
          [
            validatedTenantId,
            validatedSource.value.kind,
            sourceGroupId(validatedSource.value),
            validatedLimit,
          ],
        ),
        validatedLimit,
      );
      const contacts = Object.freeze(
        rows.map((row) => parseAudienceContact(row, validatedTenantId)),
      );
      requireOrderedUniqueContacts(contacts);
      return contacts;
    },
  });
}
