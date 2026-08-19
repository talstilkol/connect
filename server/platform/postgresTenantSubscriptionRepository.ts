import type {
  CancelTenantSubscriptionInput,
  ChangeTenantSubscriptionStatusInput,
  CreateTenantSubscriptionInput,
  ExtendTenantSubscriptionInput,
  TenantSubscriptionRepository,
} from "../../db/tenantSubscriptionRepository.ts";
import type {
  TenantSubscription,
  TenantSubscriptionEvent,
  TenantSubscriptionMutationResult,
  TenantSubscriptionStatus,
} from "../../shared/domain/tenantSubscription.ts";
import {
  deriveTenantSubscriptionEventKey,
} from "../billing/tenantSubscriptionKey.ts";
import {
  canCancelSubscription,
  canChangeManualStatus,
  canExtendSubscription,
  isSubscriptionStatus,
  requireActorExternalUserId,
  requireCanonicalTimestamp,
  requireManualInitialStatus,
  requireManualOperationalStatus,
  requirePositiveTenantId,
  requirePositiveVersion,
  requireSubscriptionWindow,
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

const eventKeyPattern = /^tenant_subscription_event_v1_[0-9a-f]{64}$/;
const eventListLimit = 100;
const subscriptionRowKeys = Object.freeze([
  "cancelledAt",
  "createdAt",
  "endsAt",
  "startsAt",
  "status",
  "tenantId",
  "updatedAt",
  "version",
]);
const eventRowKeys = Object.freeze([
  "actorExternalUserId",
  "eventKey",
  "eventType",
  "fromStatus",
  "newEndsAt",
  "occurredAt",
  "previousEndsAt",
  "subscriptionVersion",
  "tenantId",
  "toStatus",
]);

const subscriptionColumns = `
  tenant_id AS "tenantId",
  status,
  starts_at AS "startsAt",
  ends_at AS "endsAt",
  cancelled_at AS "cancelledAt",
  version,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;
const eventColumns = `
  event_key AS "eventKey",
  tenant_id AS "tenantId",
  event_type AS "eventType",
  from_status AS "fromStatus",
  to_status AS "toStatus",
  previous_ends_at AS "previousEndsAt",
  new_ends_at AS "newEndsAt",
  actor_external_user_id AS "actorExternalUserId",
  subscription_version AS "subscriptionVersion",
  occurred_at AS "occurredAt"
`;

export const postgresTenantSubscriptionSql = Object.freeze({
  findByTenantId: `
    SELECT ${subscriptionColumns}
    FROM tenant_subscriptions
    WHERE tenant_id = $1
    LIMIT 1
  `,
  listEvents: `
    SELECT ${eventColumns}
    FROM tenant_subscription_events
    WHERE tenant_id = $1
    ORDER BY subscription_version DESC
    LIMIT $2
  `,
  lockTenant: `
    SELECT id AS "tenantId"
    FROM tenants
    WHERE id = $1
    FOR UPDATE
  `,
  lockSubscription: `
    SELECT ${subscriptionColumns}
    FROM tenant_subscriptions
    WHERE tenant_id = $1
    FOR UPDATE
  `,
  insertSubscription: `
    INSERT INTO tenant_subscriptions (
      tenant_id,
      status,
      starts_at,
      ends_at,
      cancelled_at,
      version,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3::timestamptz, $4::timestamptz,
      NULL, 1, $5::timestamptz, $5::timestamptz
    )
    RETURNING ${subscriptionColumns}
  `,
  extendSubscription: `
    UPDATE tenant_subscriptions
    SET
      ends_at = $3::timestamptz,
      version = version + 1,
      updated_at = $4::timestamptz
    WHERE tenant_id = $1
      AND version = $2
    RETURNING ${subscriptionColumns}
  `,
  changeStatus: `
    UPDATE tenant_subscriptions
    SET
      status = $3,
      version = version + 1,
      updated_at = $4::timestamptz
    WHERE tenant_id = $1
      AND version = $2
      AND cancelled_at IS NULL
    RETURNING ${subscriptionColumns}
  `,
  cancelSubscription: `
    UPDATE tenant_subscriptions
    SET
      status = 'cancelled',
      cancelled_at = $3::timestamptz,
      version = version + 1,
      updated_at = $3::timestamptz
    WHERE tenant_id = $1
      AND version = $2
      AND cancelled_at IS NULL
    RETURNING ${subscriptionColumns}
  `,
  syncTenantStatus: `
    UPDATE tenants
    SET status = $2, updated_at = $3::timestamptz
    WHERE id = $1
    RETURNING id AS "tenantId"
  `,
  insertEvent: `
    INSERT INTO tenant_subscription_events (
      event_key,
      tenant_id,
      event_type,
      from_status,
      to_status,
      previous_ends_at,
      new_ends_at,
      actor_external_user_id,
      subscription_version,
      occurred_at,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6::timestamptz, $7::timestamptz, $8, $9,
      $10::timestamptz, $10::timestamptz
    )
    RETURNING ${eventColumns}
  `,
});

export interface PostgresTenantSubscriptionRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

function parseStatus(value: unknown): TenantSubscriptionStatus {
  if (typeof value !== "string" || !isSubscriptionStatus(value)) {
    throw new Error("PostgreSQL returned an invalid subscription status");
  }
  return value;
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function parseSubscription(value: unknown): TenantSubscription {
  const row = requireExactPostgresRow(value, subscriptionRowKeys);
  const status = parseStatus(row.status);
  const startsAt = parsePostgresTimestamp(row.startsAt);
  const endsAt = parsePostgresTimestamp(row.endsAt);
  requireSubscriptionWindow(startsAt, endsAt);
  const cancelledAt = parseNullableTimestamp(row.cancelledAt);
  if (
    (status === "cancelled" && cancelledAt === null) ||
    (status !== "cancelled" && cancelledAt !== null)
  ) {
    throw new Error("PostgreSQL returned an invalid tenant subscription");
  }
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    throw new Error("PostgreSQL returned an invalid tenant subscription");
  }
  return Object.freeze({
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    status,
    startsAt,
    endsAt,
    cancelledAt,
    version: parsePostgresPositiveInteger(row.version),
    createdAt,
    updatedAt,
  });
}

function parseEvent(value: unknown): TenantSubscriptionEvent {
  const row = requireExactPostgresRow(value, eventRowKeys);
  if (typeof row.eventKey !== "string" || !eventKeyPattern.test(row.eventKey)) {
    throw new Error("PostgreSQL returned an invalid subscription event");
  }
  const eventType = row.eventType === "created" ||
      row.eventType === "extended" ||
      row.eventType === "status-changed" ||
      row.eventType === "cancelled"
    ? row.eventType
    : null;
  const fromStatus = row.fromStatus === null ? null : parseStatus(row.fromStatus);
  const toStatus = parseStatus(row.toStatus);
  const previousEndsAt = parseNullableTimestamp(row.previousEndsAt);
  const newEndsAt = parsePostgresTimestamp(row.newEndsAt);
  const subscriptionVersion = parsePostgresPositiveInteger(
    row.subscriptionVersion,
  );
  const validState = eventType === "created"
    ? fromStatus === null &&
      (toStatus === "trial" || toStatus === "active") &&
      previousEndsAt === null &&
      subscriptionVersion === 1
    : eventType === "extended"
      ? fromStatus === toStatus &&
        previousEndsAt !== null &&
        Date.parse(previousEndsAt) < Date.parse(newEndsAt) &&
        subscriptionVersion >= 2
      : eventType === "status-changed"
        ? fromStatus !== null &&
          fromStatus !== toStatus &&
          (toStatus === "active" ||
            toStatus === "suspended" ||
            toStatus === "blocked") &&
          previousEndsAt === newEndsAt &&
          subscriptionVersion >= 2
        : eventType === "cancelled"
          ? fromStatus !== null &&
            fromStatus !== "cancelled" &&
            toStatus === "cancelled" &&
            previousEndsAt === newEndsAt &&
            subscriptionVersion >= 2
          : false;
  if (!validState || eventType === null || typeof row.actorExternalUserId !== "string") {
    throw new Error("PostgreSQL returned an invalid subscription event");
  }
  const actorExternalUserId = requireActorExternalUserId(
    row.actorExternalUserId,
  );
  if (actorExternalUserId !== row.actorExternalUserId) {
    throw new Error("PostgreSQL returned an invalid subscription event");
  }
  return Object.freeze({
    eventKey: row.eventKey,
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    eventType,
    fromStatus,
    toStatus,
    previousEndsAt,
    newEndsAt,
    actorExternalUserId,
    subscriptionVersion,
    occurredAt: parsePostgresTimestamp(row.occurredAt),
  });
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly unknown[]> {
  return requirePostgresRows(
    await queries.query<unknown>(sql, parameters),
    maximum,
  );
}

async function loadOne(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<unknown | null> {
  const rows = await loadRows(queries, sql, parameters, 1);
  return rows[0] ?? null;
}

function unchanged(
  subscription: TenantSubscription,
): TenantSubscriptionMutationResult {
  return Object.freeze({ outcome: "unchanged", subscription });
}

function missing(
  outcome: "not-found" | "conflict",
  subscription: TenantSubscription | null,
): TenantSubscriptionMutationResult {
  return Object.freeze({ outcome, subscription });
}

function requireScopedSubscription(
  value: unknown,
  tenantId: number,
): TenantSubscription {
  const subscription = parseSubscription(value);
  if (subscription.tenantId !== tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant subscription");
  }
  return subscription;
}

async function requireTenantStatusSync(
  transaction: PostgresQueryExecutor,
  tenantId: number,
  status: TenantSubscriptionStatus,
  occurredAt: string,
): Promise<void> {
  const row = await loadOne(
    transaction,
    postgresTenantSubscriptionSql.syncTenantStatus,
    [tenantId, status, occurredAt],
  );
  const parsed = row === null
    ? null
    : requireExactPostgresRow(row, ["tenantId"]);
  if (
    parsed === null ||
    parsePostgresPositiveInteger(parsed.tenantId) !== tenantId
  ) {
    throw new Error("PostgreSQL tenant status synchronization failed");
  }
}

async function insertAndVerifyEvent(
  transaction: PostgresQueryExecutor,
  event: Readonly<{
    eventKey: string;
    tenantId: number;
    eventType: "created" | "extended" | "status-changed" | "cancelled";
    fromStatus: TenantSubscriptionStatus | null;
    toStatus: TenantSubscriptionStatus;
    previousEndsAt: string | null;
    newEndsAt: string;
    actorExternalUserId: string;
    subscriptionVersion: number;
    occurredAt: string;
  }>,
): Promise<void> {
  const row = await loadOne(
    transaction,
    postgresTenantSubscriptionSql.insertEvent,
    [
      event.eventKey,
      event.tenantId,
      event.eventType,
      event.fromStatus,
      event.toStatus,
      event.previousEndsAt,
      event.newEndsAt,
      event.actorExternalUserId,
      event.subscriptionVersion,
      event.occurredAt,
    ],
  );
  if (row === null) {
    throw new Error("PostgreSQL subscription event insert failed");
  }
  const stored = parseEvent(row);
  if (
    stored.eventKey !== event.eventKey ||
    stored.tenantId !== event.tenantId ||
    stored.subscriptionVersion !== event.subscriptionVersion
  ) {
    throw new Error("PostgreSQL returned conflicting subscription event data");
  }
}

export function createPostgresTenantSubscriptionRepository(
  dependencies: Readonly<PostgresTenantSubscriptionRepositoryDependencies>,
): TenantSubscriptionRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL tenant subscription dependencies are invalid");
  }

  const findByTenantId: TenantSubscriptionRepository["findByTenantId"] = async (
    tenantIdInput,
  ) => {
    const tenantId = requirePositiveTenantId(tenantIdInput);
    const row = await loadOne(
      dependencies.queries,
      postgresTenantSubscriptionSql.findByTenantId,
      [tenantId],
    );
    return row === null ? null : requireScopedSubscription(row, tenantId);
  };

  return Object.freeze({
    findByTenantId,

    async listEvents(tenantIdInput: number) {
      const tenantId = requirePositiveTenantId(tenantIdInput);
      const rows = await loadRows(
        dependencies.queries,
        postgresTenantSubscriptionSql.listEvents,
        [tenantId, eventListLimit],
        eventListLimit,
      );
      return Object.freeze(rows.map((row) => {
        const event = parseEvent(row);
        if (event.tenantId !== tenantId) {
          throw new Error("PostgreSQL returned a cross-tenant subscription event");
        }
        return event;
      }));
    },

    async create(input: CreateTenantSubscriptionInput) {
      const tenantId = requirePositiveTenantId(input?.tenantId);
      const status = requireManualInitialStatus(input?.status);
      const { startsAt, endsAt } = requireSubscriptionWindow(
        input?.startsAt,
        input?.endsAt,
      );
      const actorExternalUserId = requireActorExternalUserId(
        input?.actorExternalUserId,
      );
      const occurredAt = requireCanonicalTimestamp(input?.occurredAt);
      const eventKey = await deriveTenantSubscriptionEventKey(tenantId, {
        eventType: "created",
        expectedVersion: null,
        toStatus: status,
        newEndsAt: endsAt,
        actorExternalUserId,
      });

      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const tenantRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.lockTenant,
            [tenantId],
          );
          if (tenantRow === null) {
            return missing("not-found", null);
          }
          const lockedTenant = requireExactPostgresRow(tenantRow, ["tenantId"]);
          if (parsePostgresPositiveInteger(lockedTenant.tenantId) !== tenantId) {
            throw new Error("PostgreSQL returned a cross-tenant subscription owner");
          }
          const existingRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.lockSubscription,
            [tenantId],
          );
          if (existingRow !== null) {
            const existing = requireScopedSubscription(existingRow, tenantId);
            return existing.status === status &&
                existing.startsAt === startsAt &&
                existing.endsAt === endsAt
              ? unchanged(existing)
              : missing("conflict", existing);
          }
          const insertedRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.insertSubscription,
            [tenantId, status, startsAt, endsAt, occurredAt],
          );
          if (insertedRow === null) {
            throw new Error("PostgreSQL subscription creation failed");
          }
          const subscription = requireScopedSubscription(insertedRow, tenantId);
          await requireTenantStatusSync(
            transaction,
            tenantId,
            status,
            occurredAt,
          );
          await insertAndVerifyEvent(transaction, {
            eventKey,
            tenantId,
            eventType: "created",
            fromStatus: null,
            toStatus: status,
            previousEndsAt: null,
            newEndsAt: endsAt,
            actorExternalUserId,
            subscriptionVersion: 1,
            occurredAt,
          });
          return Object.freeze({ outcome: "created" as const, subscription });
        },
      );
    },

    async extend(input: ExtendTenantSubscriptionInput) {
      const tenantId = requirePositiveTenantId(input?.tenantId);
      const expectedVersion = requirePositiveVersion(input?.expectedVersion);
      const newEndsAt = requireCanonicalTimestamp(input?.newEndsAt);
      const actorExternalUserId = requireActorExternalUserId(
        input?.actorExternalUserId,
      );
      const occurredAt = requireCanonicalTimestamp(input?.occurredAt);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const currentRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.lockSubscription,
            [tenantId],
          );
          if (currentRow === null) return missing("not-found", null);
          const current = requireScopedSubscription(currentRow, tenantId);
          if (current.version !== expectedVersion) {
            return missing("conflict", current);
          }
          if (current.endsAt === newEndsAt) return unchanged(current);
          if (
            !canExtendSubscription(current.status) ||
            Date.parse(newEndsAt) <= Date.parse(current.endsAt)
          ) {
            return Object.freeze({
              outcome: "invalid-transition" as const,
              subscription: current,
            });
          }
          const eventKey = await deriveTenantSubscriptionEventKey(tenantId, {
            eventType: "extended",
            expectedVersion,
            toStatus: current.status,
            newEndsAt,
            actorExternalUserId,
          });
          const updatedRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.extendSubscription,
            [tenantId, expectedVersion, newEndsAt, occurredAt],
          );
          if (updatedRow === null) {
            throw new Error("PostgreSQL subscription extension failed after lock");
          }
          const subscription = requireScopedSubscription(updatedRow, tenantId);
          await insertAndVerifyEvent(transaction, {
            eventKey,
            tenantId,
            eventType: "extended",
            fromStatus: current.status,
            toStatus: current.status,
            previousEndsAt: current.endsAt,
            newEndsAt,
            actorExternalUserId,
            subscriptionVersion: expectedVersion + 1,
            occurredAt,
          });
          return Object.freeze({ outcome: "updated" as const, subscription });
        },
      );
    },

    async changeStatus(input: ChangeTenantSubscriptionStatusInput) {
      const tenantId = requirePositiveTenantId(input?.tenantId);
      const expectedVersion = requirePositiveVersion(input?.expectedVersion);
      const status = requireManualOperationalStatus(input?.status);
      const actorExternalUserId = requireActorExternalUserId(
        input?.actorExternalUserId,
      );
      const occurredAt = requireCanonicalTimestamp(input?.occurredAt);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const currentRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.lockSubscription,
            [tenantId],
          );
          if (currentRow === null) return missing("not-found", null);
          const current = requireScopedSubscription(currentRow, tenantId);
          if (current.version !== expectedVersion) {
            return missing("conflict", current);
          }
          if (current.status === status) return unchanged(current);
          if (
            !canChangeManualStatus(current.status, status) ||
            (status === "active" &&
              Date.parse(occurredAt) >= Date.parse(current.endsAt))
          ) {
            return Object.freeze({
              outcome: "invalid-transition" as const,
              subscription: current,
            });
          }
          const eventKey = await deriveTenantSubscriptionEventKey(tenantId, {
            eventType: "status-changed",
            expectedVersion,
            toStatus: status,
            newEndsAt: current.endsAt,
            actorExternalUserId,
          });
          const updatedRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.changeStatus,
            [tenantId, expectedVersion, status, occurredAt],
          );
          if (updatedRow === null) {
            throw new Error("PostgreSQL subscription status change failed after lock");
          }
          const subscription = requireScopedSubscription(updatedRow, tenantId);
          await requireTenantStatusSync(
            transaction,
            tenantId,
            status,
            occurredAt,
          );
          await insertAndVerifyEvent(transaction, {
            eventKey,
            tenantId,
            eventType: "status-changed",
            fromStatus: current.status,
            toStatus: status,
            previousEndsAt: current.endsAt,
            newEndsAt: current.endsAt,
            actorExternalUserId,
            subscriptionVersion: expectedVersion + 1,
            occurredAt,
          });
          return Object.freeze({ outcome: "updated" as const, subscription });
        },
      );
    },

    async cancel(input: CancelTenantSubscriptionInput) {
      const tenantId = requirePositiveTenantId(input?.tenantId);
      const expectedVersion = requirePositiveVersion(input?.expectedVersion);
      const actorExternalUserId = requireActorExternalUserId(
        input?.actorExternalUserId,
      );
      const occurredAt = requireCanonicalTimestamp(input?.occurredAt);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const currentRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.lockSubscription,
            [tenantId],
          );
          if (currentRow === null) return missing("not-found", null);
          const current = requireScopedSubscription(currentRow, tenantId);
          if (current.version !== expectedVersion) {
            return missing("conflict", current);
          }
          if (current.status === "cancelled") return unchanged(current);
          if (!canCancelSubscription(current.status)) {
            return Object.freeze({
              outcome: "invalid-transition" as const,
              subscription: current,
            });
          }
          const eventKey = await deriveTenantSubscriptionEventKey(tenantId, {
            eventType: "cancelled",
            expectedVersion,
            toStatus: "cancelled",
            newEndsAt: current.endsAt,
            actorExternalUserId,
          });
          const updatedRow = await loadOne(
            transaction,
            postgresTenantSubscriptionSql.cancelSubscription,
            [tenantId, expectedVersion, occurredAt],
          );
          if (updatedRow === null) {
            throw new Error("PostgreSQL subscription cancellation failed after lock");
          }
          const subscription = requireScopedSubscription(updatedRow, tenantId);
          await requireTenantStatusSync(
            transaction,
            tenantId,
            "cancelled",
            occurredAt,
          );
          await insertAndVerifyEvent(transaction, {
            eventKey,
            tenantId,
            eventType: "cancelled",
            fromStatus: current.status,
            toStatus: "cancelled",
            previousEndsAt: current.endsAt,
            newEndsAt: current.endsAt,
            actorExternalUserId,
            subscriptionVersion: expectedVersion + 1,
            occurredAt,
          });
          return Object.freeze({ outcome: "updated" as const, subscription });
        },
      );
    },
  });
}
