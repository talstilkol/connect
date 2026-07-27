import type {
  CampaignAudienceContact,
  CampaignAudienceSource,
} from "../shared/domain/campaignAudience.ts";
import {
  validateCampaignAudienceSource,
} from "../shared/validation/campaignAudience.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const MAXIMUM_AUDIENCE_READ_LIMIT = 100_001;

const LIST_ELIGIBLE_AUDIENCE_SQL = `
  SELECT
    contacts.id AS contactId,
    contacts.phone_e164 AS phoneNumber,
    contacts.first_name AS firstName,
    contacts.last_name AS lastName,
    contacts.email,
    contacts.company,
    contacts.mailing_status AS mailingStatus,
    contacts.consent_status AS consentStatus,
    contacts.version
  FROM contacts
  WHERE contacts.tenant_id = ?1
    AND contacts.mailing_status = 'subscribed'
    AND contacts.consent_status = 'granted'
    AND (
      ?2 = 'all'
      OR (
        ?2 = 'list'
        AND EXISTS (
          SELECT 1
          FROM contact_list_memberships AS memberships
          INNER JOIN contact_lists AS lists
            ON lists.id = memberships.list_id
            AND lists.tenant_id = memberships.tenant_id
          WHERE memberships.tenant_id = ?1
            AND memberships.contact_id = contacts.id
            AND memberships.list_id = ?3
        )
      )
      OR (
        ?2 = 'tag'
        AND EXISTS (
          SELECT 1
          FROM contact_tag_assignments AS assignments
          INNER JOIN contact_tags AS tags
            ON tags.id = assignments.tag_id
            AND tags.tenant_id = assignments.tenant_id
          WHERE assignments.tenant_id = ?1
            AND assignments.contact_id = contacts.id
            AND assignments.tag_id = ?3
        )
      )
    )
  ORDER BY contacts.id ASC
  LIMIT ?4
`;

interface CampaignAudienceContactRow {
  contactId: number;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  mailingStatus: string;
  consentStatus: string;
  version: number;
}

export interface CampaignAudienceRepository {
  listEligibleBySource(
    tenantId: number,
    source: CampaignAudienceSource,
    limit: number,
  ): Promise<readonly CampaignAudienceContact[]>;
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${fieldName} must be a positive integer`,
    );
  }
}

function sourceGroupId(
  source: CampaignAudienceSource,
): number {
  if (source.kind === "list") {
    return source.listId;
  }

  if (source.kind === "tag") {
    return source.tagId;
  }

  return 0;
}

function parseContactRow(
  row: CampaignAudienceContactRow,
): CampaignAudienceContact {
  if (
    !Number.isSafeInteger(row.contactId) ||
    row.contactId <= 0 ||
    typeof row.phoneNumber !== "string" ||
    !/^\+[1-9][0-9]{0,14}$/.test(
      row.phoneNumber,
    ) ||
    row.mailingStatus !== "subscribed" ||
    row.consentStatus !== "granted" ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    ![row.firstName, row.lastName, row.email, row.company]
      .every(
        (value) =>
          value === null || typeof value === "string",
      )
  ) {
    throw new Error(
      "D1 returned an invalid campaign audience contact",
    );
  }

  return {
    contactId: row.contactId,
    phoneNumber: row.phoneNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    company: row.company,
    mailingStatus: row.mailingStatus,
    consentStatus: row.consentStatus,
    version: row.version,
  };
}

export function createCampaignAudienceRepository(
  database: D1DatabaseBinding,
): CampaignAudienceRepository {
  return {
    async listEligibleBySource(
      tenantId,
      source,
      limit,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertPositiveInteger(limit, "limit");

      if (
        limit > MAXIMUM_AUDIENCE_READ_LIMIT ||
        !validateCampaignAudienceSource(source).success
      ) {
        throw new Error(
          "campaign audience query is invalid",
        );
      }

      const result = await database
        .prepare(LIST_ELIGIBLE_AUDIENCE_SQL)
        .bind(
          tenantId,
          source.kind,
          sourceGroupId(source),
          limit,
        )
        .all<CampaignAudienceContactRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 campaign audience read failed",
        );
      }

      return (result.results ?? []).map(
        parseContactRow,
      );
    },
  };
}
