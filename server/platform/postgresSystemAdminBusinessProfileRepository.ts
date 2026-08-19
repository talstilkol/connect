import type {
  PersistedBusinessProfile,
} from "../../db/businessProfileRepository.ts";
import type {
  SystemAdminBusinessProfileMutationResult,
  SystemAdminBusinessProfileRepository,
  UpdateBusinessProfileAsSystemAdminInput,
} from "../../db/systemAdminBusinessProfileRepository.ts";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import {
  deriveBusinessProfileAdminEventKey,
  deriveBusinessProfileDigest,
} from "../admin/systemAdminBusinessProfileKey.ts";
import {
  requireActorExternalUserId,
  requireCanonicalTimestamp,
  requirePositiveTenantId,
  requirePositiveVersion,
} from "../billing/tenantSubscriptionValidation.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const profileRowKeys = Object.freeze([
  "businessName",
  "createdAt",
  "interfaceLanguage",
  "tenantId",
  "timezone",
  "updatedAt",
  "version",
]);
const eventRowKeys = Object.freeze(["eventKey"]);
const tenantRowKeys = Object.freeze(["tenantId"]);

const profileColumns = `
  tenant_id AS "tenantId",
  business_name AS "businessName",
  timezone,
  interface_language AS "interfaceLanguage",
  version,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export const postgresSystemAdminBusinessProfileSql = Object.freeze({
  lockProfile: `
    SELECT ${profileColumns}
    FROM business_profiles
    WHERE tenant_id = $1
    FOR UPDATE
  `,
  findEvent: `
    SELECT event_key AS "eventKey"
    FROM business_profile_admin_events
    WHERE event_key = $1
    LIMIT 1
  `,
  updateProfile: `
    UPDATE business_profiles
    SET
      business_name = $3,
      timezone = $4,
      interface_language = $5,
      version = version + 1,
      updated_at = $6::timestamptz
    WHERE tenant_id = $1
      AND version = $2
    RETURNING ${profileColumns}
  `,
  syncTenantDisplayName: `
    UPDATE tenants
    SET
      display_name = $2,
      updated_at = $3::timestamptz
    WHERE id = $1
    RETURNING id AS "tenantId"
  `,
  insertEvent: `
    INSERT INTO business_profile_admin_events (
      event_key,
      tenant_id,
      previous_profile_digest,
      new_profile_digest,
      changed_fields,
      actor_external_user_id,
      profile_version,
      occurred_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::timestamptz
    )
    RETURNING event_key AS "eventKey"
  `,
});

export interface PostgresSystemAdminBusinessProfileDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function parseProfile(
  value: unknown,
  expectedTenantId: number,
): Readonly<PersistedBusinessProfile> {
  const row = requireExactPostgresRow(value, profileRowKeys);
  const validation = validatePersistedBusinessProfile({
    businessName: row.businessName,
    timezone: row.timezone,
    interfaceLanguage: row.interfaceLanguage,
  });
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);
  if (
    parsePostgresPositiveInteger(row.tenantId) !== expectedTenantId ||
    !validation.success ||
    validation.value.businessName !== row.businessName ||
    validation.value.timezone !== row.timezone ||
    Date.parse(updatedAt) < Date.parse(createdAt)
  ) {
    throw new Error("PostgreSQL returned an invalid business profile");
  }
  return Object.freeze({
    tenantId: expectedTenantId,
    ...validation.value,
    version: parsePostgresPositiveInteger(row.version),
    createdAt,
    updatedAt,
  });
}

async function loadProfile(
  queries: PostgresQueryExecutor,
  tenantId: number,
): Promise<Readonly<PersistedBusinessProfile> | null> {
  const rows = requirePostgresRows(
    await queries.query<unknown>(
      postgresSystemAdminBusinessProfileSql.lockProfile,
      [tenantId],
    ),
    1,
  );
  return rows.length === 0 ? null : parseProfile(rows[0], tenantId);
}

async function eventExists(
  queries: PostgresQueryExecutor,
  eventKey: string,
): Promise<boolean> {
  const rows = requirePostgresRows(
    await queries.query<unknown>(
      postgresSystemAdminBusinessProfileSql.findEvent,
      [eventKey],
    ),
    1,
  );
  if (rows.length === 0) return false;
  const row = requireExactPostgresRow(rows[0], eventRowKeys);
  if (row.eventKey !== eventKey) {
    throw new Error("PostgreSQL returned a mismatched admin event");
  }
  return true;
}

function targetMatches(
  profile: PersistedBusinessProfile,
  target: Readonly<{
    businessName: string;
    timezone: string;
    interfaceLanguage: InterfaceLanguage;
  }>,
): boolean {
  return profile.businessName === target.businessName &&
    profile.timezone === target.timezone &&
    profile.interfaceLanguage === target.interfaceLanguage;
}

function changedFields(
  current: PersistedBusinessProfile,
  target: Readonly<{
    businessName: string;
    timezone: string;
    interfaceLanguage: InterfaceLanguage;
  }>,
): string {
  return [
    current.businessName === target.businessName ? null : "businessName",
    current.timezone === target.timezone ? null : "timezone",
    current.interfaceLanguage === target.interfaceLanguage
      ? null
      : "interfaceLanguage",
  ].filter((field): field is string => field !== null).join(",");
}

function mutationResult(
  outcome: SystemAdminBusinessProfileMutationResult["outcome"],
  profile: Readonly<PersistedBusinessProfile> | null,
): SystemAdminBusinessProfileMutationResult {
  return Object.freeze({ outcome, profile });
}

async function requireSingleIdentity(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  expectedKey: "eventKey" | "tenantId",
  expectedValue: string | number,
): Promise<void> {
  const rows = requirePostgresRows(
    await queries.query<unknown>(sql, parameters),
    1,
  );
  if (rows.length !== 1) {
    throw new Error("PostgreSQL system admin mutation was not confirmed");
  }
  const row = requireExactPostgresRow(
    rows[0],
    expectedKey === "eventKey" ? eventRowKeys : tenantRowKeys,
  );
  const value = expectedKey === "tenantId"
    ? parsePostgresPositiveInteger(row[expectedKey])
    : row[expectedKey];
  if (value !== expectedValue) {
    throw new Error("PostgreSQL returned a cross-tenant admin mutation");
  }
}

function validateInput(input: UpdateBusinessProfileAsSystemAdminInput) {
  const tenantId = requirePositiveTenantId(input?.tenantId);
  const expectedVersion = requirePositiveVersion(input?.expectedVersion);
  const actorExternalUserId = requireActorExternalUserId(
    input?.actorExternalUserId,
  );
  const occurredAt = requireCanonicalTimestamp(input?.occurredAt);
  const validation = validatePersistedBusinessProfile({
    businessName: input?.businessName,
    timezone: input?.timezone,
    interfaceLanguage: input?.interfaceLanguage,
  });
  if (!validation.success) {
    throw new Error("system admin business profile input is invalid");
  }
  return Object.freeze({
    tenantId,
    expectedVersion,
    actorExternalUserId,
    occurredAt,
    target: validation.value,
  });
}

export function createPostgresSystemAdminBusinessProfileRepository(
  dependencies: Readonly<PostgresSystemAdminBusinessProfileDependencies>,
): SystemAdminBusinessProfileRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL system admin profile dependencies are invalid");
  }

  return Object.freeze({
    async update(
      input: UpdateBusinessProfileAsSystemAdminInput,
    ): Promise<SystemAdminBusinessProfileMutationResult> {
      const {
        tenantId,
        expectedVersion,
        actorExternalUserId,
        occurredAt,
        target,
      } = validateInput(input);
      const newProfileDigest = await deriveBusinessProfileDigest(target);
      const eventKey = await deriveBusinessProfileAdminEventKey(tenantId, {
        expectedVersion,
        newProfileDigest,
        actorExternalUserId,
      });

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const current = await loadProfile(transaction, tenantId);
          if (current === null) return mutationResult("not-found", null);
          if (current.version !== expectedVersion) {
            if (
              current.version === expectedVersion + 1 &&
              targetMatches(current, target) &&
              await eventExists(transaction, eventKey)
            ) {
              return mutationResult("unchanged", current);
            }
            return mutationResult("conflict", current);
          }
          if (targetMatches(current, target)) {
            return mutationResult("unchanged", current);
          }

          const previousProfileDigest = await deriveBusinessProfileDigest(current);
          const updatedRows = requirePostgresRows(
            await transaction.query<unknown>(
              postgresSystemAdminBusinessProfileSql.updateProfile,
              [
                tenantId,
                expectedVersion,
                target.businessName,
                target.timezone,
                target.interfaceLanguage,
                occurredAt,
              ],
            ),
            1,
          );
          if (updatedRows.length !== 1) {
            throw new Error("PostgreSQL system admin profile update was not confirmed");
          }
          const updated = parseProfile(updatedRows[0], tenantId);
          if (
            updated.version !== expectedVersion + 1 ||
            updated.updatedAt !== occurredAt ||
            !targetMatches(updated, target)
          ) {
            throw new Error("PostgreSQL returned an invalid admin profile update");
          }

          await requireSingleIdentity(
            transaction,
            postgresSystemAdminBusinessProfileSql.syncTenantDisplayName,
            [tenantId, target.businessName, occurredAt],
            "tenantId",
            tenantId,
          );
          await requireSingleIdentity(
            transaction,
            postgresSystemAdminBusinessProfileSql.insertEvent,
            [
              eventKey,
              tenantId,
              previousProfileDigest,
              newProfileDigest,
              changedFields(current, target),
              actorExternalUserId,
              expectedVersion + 1,
              occurredAt,
            ],
            "eventKey",
            eventKey,
          );
          return mutationResult("updated", updated);
        },
      );
    },
  });
}
