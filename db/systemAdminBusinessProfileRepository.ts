import type {
  InterfaceLanguage,
} from "../shared/domain/businessProfileDraft.ts";
import {
  validatePersistedBusinessProfile,
} from "../shared/validation/persistedBusinessProfile.ts";
import {
  deriveBusinessProfileAdminEventKey,
  deriveBusinessProfileDigest,
} from "../server/admin/systemAdminBusinessProfileKey.ts";
import {
  requireActorExternalUserId,
  requireCanonicalTimestamp,
  requirePositiveTenantId,
  requirePositiveVersion,
} from "../server/billing/tenantSubscriptionValidation.ts";
import type {
  PersistedBusinessProfile,
} from "./businessProfileRepository.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const PROFILE_COLUMNS_SQL = `
  tenant_id AS tenantId,
  business_name AS businessName,
  timezone,
  interface_language AS interfaceLanguage,
  version,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const FIND_PROFILE_SQL = `
  SELECT ${PROFILE_COLUMNS_SQL}
  FROM business_profiles
  WHERE tenant_id = ?1
  LIMIT 1
`;

const FIND_EVENT_SQL = `
  SELECT event_key AS eventKey
  FROM business_profile_admin_events
  WHERE event_key = ?1
  LIMIT 1
`;

const UPDATE_PROFILE_SQL = `
  UPDATE business_profiles
  SET
    business_name = ?6,
    timezone = ?7,
    interface_language = ?8,
    version = version + 1,
    updated_at = ?14
  WHERE tenant_id = ?1
    AND version = ?2
    AND business_name = ?3
    AND timezone = ?4
    AND interface_language = ?5
    AND (
      business_name IS NOT ?6
      OR timezone IS NOT ?7
      OR interface_language IS NOT ?8
    )
`;

const SYNC_TENANT_DISPLAY_NAME_SQL = `
  UPDATE tenants
  SET
    display_name = ?6,
    updated_at = ?14
  WHERE id = ?1
    AND EXISTS (
      SELECT 1
      FROM business_profiles
      WHERE tenant_id = ?1
        AND version = ?2 + 1
        AND business_name = ?6
        AND timezone = ?7
        AND interface_language = ?8
        AND updated_at = ?14
    )
`;

const INSERT_EVENT_SQL = `
  INSERT INTO business_profile_admin_events (
    event_key,
    tenant_id,
    previous_profile_digest,
    new_profile_digest,
    changed_fields,
    actor_external_user_id,
    profile_version,
    occurred_at
  )
  SELECT
    ?9, ?1, ?10, ?11, ?12, ?13,
    ?2 + 1, ?14
  FROM business_profiles
  WHERE tenant_id = ?1
    AND version = ?2 + 1
    AND business_name = ?6
    AND timezone = ?7
    AND interface_language = ?8
    AND updated_at = ?14
  ON CONFLICT (event_key) DO NOTHING
`;

interface EventRow {
  eventKey: string;
}

export type SystemAdminBusinessProfileMutationOutcome =
  | "updated"
  | "unchanged"
  | "not-found"
  | "conflict";

export interface SystemAdminBusinessProfileMutationResult {
  outcome:
    SystemAdminBusinessProfileMutationOutcome;
  profile:
    PersistedBusinessProfile | null;
}

export interface UpdateBusinessProfileAsSystemAdminInput {
  tenantId: number;
  expectedVersion: number;
  businessName: string;
  timezone: string;
  interfaceLanguage: InterfaceLanguage;
  actorExternalUserId: string;
  occurredAt: string;
}

export interface SystemAdminBusinessProfileRepository {
  update(
    input:
      UpdateBusinessProfileAsSystemAdminInput,
  ): Promise<SystemAdminBusinessProfileMutationResult>;
}

function validStoredText(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 500 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function parseProfile(
  row: PersistedBusinessProfile,
  expectedTenantId: number,
): PersistedBusinessProfile {
  const validation =
    validatePersistedBusinessProfile({
      businessName: row.businessName,
      timezone: row.timezone,
      interfaceLanguage:
        row.interfaceLanguage,
    });

  if (
    row.tenantId !== expectedTenantId ||
    !validation.success ||
    validation.value.businessName !==
      row.businessName ||
    validation.value.timezone !==
      row.timezone ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    !validStoredText(row.createdAt) ||
    !validStoredText(row.updatedAt)
  ) {
    throw new Error(
      "D1 returned an invalid business profile",
    );
  }

  return {
    tenantId: row.tenantId,
    ...validation.value,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function targetMatches(
  profile: PersistedBusinessProfile,
  target: {
    businessName: string;
    timezone: string;
    interfaceLanguage: InterfaceLanguage;
  },
): boolean {
  return (
    profile.businessName ===
      target.businessName &&
    profile.timezone === target.timezone &&
    profile.interfaceLanguage ===
      target.interfaceLanguage
  );
}

function changedFields(
  current: PersistedBusinessProfile,
  target: {
    businessName: string;
    timezone: string;
    interfaceLanguage: InterfaceLanguage;
  },
): string {
  return [
    current.businessName !==
    target.businessName
      ? "businessName"
      : null,
    current.timezone !== target.timezone
      ? "timezone"
      : null,
    current.interfaceLanguage !==
    target.interfaceLanguage
      ? "interfaceLanguage"
      : null,
  ]
    .filter(
      (field): field is string =>
        field !== null,
    )
    .join(",");
}

function assertBatch(
  results: readonly D1Result[],
): void {
  if (
    results.length !== 3 ||
    results.some(
      (result) => !result.success,
    )
  ) {
    throw new Error(
      "D1 system admin business profile mutation failed",
    );
  }
}

export function createSystemAdminBusinessProfileRepository(
  database: D1DatabaseBinding,
): SystemAdminBusinessProfileRepository {
  const findByTenantId = async (
    tenantId: number,
  ): Promise<PersistedBusinessProfile | null> => {
    const normalizedTenantId =
      requirePositiveTenantId(tenantId);
    const row = await database
      .prepare(FIND_PROFILE_SQL)
      .bind(normalizedTenantId)
      .first<PersistedBusinessProfile>();

    return row
      ? parseProfile(
          row,
          normalizedTenantId,
        )
      : null;
  };

  const eventExists = async (
    eventKey: string,
  ): Promise<boolean> => {
    const row = await database
      .prepare(FIND_EVENT_SQL)
      .bind(eventKey)
      .first<EventRow>();

    return row?.eventKey === eventKey;
  };

  return {
    async update(input) {
      const tenantId =
        requirePositiveTenantId(
          input.tenantId,
        );
      const expectedVersion =
        requirePositiveVersion(
          input.expectedVersion,
        );
      const actorExternalUserId =
        requireActorExternalUserId(
          input.actorExternalUserId,
        );
      const occurredAt =
        requireCanonicalTimestamp(
          input.occurredAt,
        );
      const validation =
        validatePersistedBusinessProfile({
          businessName:
            input.businessName,
          timezone: input.timezone,
          interfaceLanguage:
            input.interfaceLanguage,
        });

      if (
        !validation.success ||
        !validStoredText(
          validation.value.businessName,
        ) ||
        !validStoredText(
          validation.value.timezone,
        )
      ) {
        throw new Error(
          "system admin business profile input is invalid",
        );
      }

      const target = validation.value;
      const current =
        await findByTenantId(tenantId);

      if (!current) {
        return {
          outcome: "not-found",
          profile: null,
        };
      }

      const newProfileDigest =
        await deriveBusinessProfileDigest(
          target,
        );
      const eventKey =
        await deriveBusinessProfileAdminEventKey(
          tenantId,
          {
            expectedVersion,
            newProfileDigest,
            actorExternalUserId,
          },
        );

      if (
        current.version !== expectedVersion
      ) {
        if (
          current.version ===
            expectedVersion + 1 &&
          targetMatches(current, target) &&
          (await eventExists(eventKey))
        ) {
          return {
            outcome: "unchanged",
            profile: current,
          };
        }

        return {
          outcome: "conflict",
          profile: current,
        };
      }

      if (targetMatches(current, target)) {
        return {
          outcome: "unchanged",
          profile: current,
        };
      }

      const previousProfileDigest =
        await deriveBusinessProfileDigest(
          current,
        );
      const fields = changedFields(
        current,
        target,
      );
      const bindValues = [
        tenantId,
        expectedVersion,
        current.businessName,
        current.timezone,
        current.interfaceLanguage,
        target.businessName,
        target.timezone,
        target.interfaceLanguage,
        eventKey,
        previousProfileDigest,
        newProfileDigest,
        fields,
        actorExternalUserId,
        occurredAt,
      ] as const;
      const results = await database.batch([
        database
          .prepare(UPDATE_PROFILE_SQL)
          .bind(...bindValues),
        database
          .prepare(
            SYNC_TENANT_DISPLAY_NAME_SQL,
          )
          .bind(...bindValues),
        database
          .prepare(INSERT_EVENT_SQL)
          .bind(...bindValues),
      ]);

      assertBatch(results);

      const saved =
        await findByTenantId(tenantId);
      const auditEventExists =
        await eventExists(eventKey);

      if (
        !saved ||
        saved.version !==
          expectedVersion + 1 ||
        !targetMatches(saved, target) ||
        !auditEventExists
      ) {
        return {
          outcome: "conflict",
          profile: saved,
        };
      }

      return {
        outcome:
          results[0]?.meta?.changes === 0
            ? "unchanged"
            : "updated",
        profile: saved,
      };
    },
  };
}
