import type {
  ManualSubscriptionInitialStatus,
  ManualSubscriptionOperationalStatus,
  TenantSubscription,
  TenantSubscriptionEvent,
  TenantSubscriptionMutationResult,
} from "../shared/domain/tenantSubscription.ts";
import {
  deriveTenantSubscriptionEventKey,
} from "../server/billing/tenantSubscriptionKey.ts";
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
} from "../server/billing/tenantSubscriptionValidation.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const EVENT_KEY_PATTERN =
  /^tenant_subscription_event_v1_[0-9a-f]{64}$/;
const EVENT_LIST_LIMIT = 100;

const SUBSCRIPTION_COLUMNS_SQL = `
  tenant_id AS tenantId,
  status,
  starts_at AS startsAt,
  ends_at AS endsAt,
  cancelled_at AS cancelledAt,
  version,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const EVENT_COLUMNS_SQL = `
  event_key AS eventKey,
  tenant_id AS tenantId,
  event_type AS eventType,
  from_status AS fromStatus,
  to_status AS toStatus,
  previous_ends_at AS previousEndsAt,
  new_ends_at AS newEndsAt,
  actor_external_user_id AS actorExternalUserId,
  subscription_version AS subscriptionVersion,
  occurred_at AS occurredAt
`;

const FIND_SUBSCRIPTION_SQL = `
  SELECT ${SUBSCRIPTION_COLUMNS_SQL}
  FROM tenant_subscriptions
  WHERE tenant_id = ?1
  LIMIT 1
`;

const LIST_EVENTS_SQL = `
  SELECT ${EVENT_COLUMNS_SQL}
  FROM tenant_subscription_events
  WHERE tenant_id = ?1
  ORDER BY subscription_version DESC
  LIMIT ?2
`;

const INSERT_SUBSCRIPTION_SQL = `
  INSERT INTO tenant_subscriptions (
    tenant_id,
    status,
    starts_at,
    ends_at,
    cancelled_at,
    version,
    updated_at
  )
  SELECT ?1, ?2, ?3, ?4, NULL, 1, ?6
  FROM tenants
  WHERE id = ?1
  ON CONFLICT (tenant_id) DO NOTHING
`;

const SYNC_CREATED_TENANT_STATUS_SQL = `
  UPDATE tenants
  SET status = ?2, updated_at = ?6
  WHERE id = ?1
    AND EXISTS (
      SELECT 1
      FROM tenant_subscriptions
      WHERE tenant_id = ?1
        AND status = ?2
        AND starts_at = ?3
        AND ends_at = ?4
        AND version = 1
    )
`;

const INSERT_CREATED_EVENT_SQL = `
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
    occurred_at
  )
  SELECT
    ?5, ?1, 'created', NULL, ?2,
    NULL, ?4, ?7, 1, ?6
  FROM tenant_subscriptions
  WHERE tenant_id = ?1
    AND status = ?2
    AND starts_at = ?3
    AND ends_at = ?4
    AND version = 1
  ON CONFLICT DO NOTHING
`;

const EXTEND_SUBSCRIPTION_SQL = `
  UPDATE tenant_subscriptions
  SET
    ends_at = ?5,
    version = version + 1,
    updated_at = ?7
  WHERE tenant_id = ?1
    AND version = ?2
    AND status = ?3
    AND ends_at = ?4
`;

const INSERT_EXTENDED_EVENT_SQL = `
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
    occurred_at
  )
  SELECT
    ?6, ?1, 'extended', ?3, ?3,
    ?4, ?5, ?8, ?2 + 1, ?7
  FROM tenant_subscriptions
  WHERE tenant_id = ?1
    AND version = ?2 + 1
    AND status = ?3
    AND ends_at = ?5
    AND updated_at = ?7
`;

const CHANGE_STATUS_SQL = `
  UPDATE tenant_subscriptions
  SET
    status = ?4,
    version = version + 1,
    updated_at = ?6
  WHERE tenant_id = ?1
    AND version = ?2
    AND status = ?3
    AND ends_at = ?5
    AND cancelled_at IS NULL
`;

const SYNC_CHANGED_TENANT_STATUS_SQL = `
  UPDATE tenants
  SET status = ?4, updated_at = ?6
  WHERE id = ?1
    AND EXISTS (
      SELECT 1
      FROM tenant_subscriptions
      WHERE tenant_id = ?1
        AND version = ?2 + 1
        AND status = ?4
        AND ends_at = ?5
        AND updated_at = ?6
    )
`;

const INSERT_STATUS_EVENT_SQL = `
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
    occurred_at
  )
  SELECT
    ?7, ?1, 'status-changed', ?3, ?4,
    ?5, ?5, ?8, ?2 + 1, ?6
  FROM tenant_subscriptions
  WHERE tenant_id = ?1
    AND version = ?2 + 1
    AND status = ?4
    AND ends_at = ?5
    AND updated_at = ?6
`;

const CANCEL_SUBSCRIPTION_SQL = `
  UPDATE tenant_subscriptions
  SET
    status = 'cancelled',
    cancelled_at = ?5,
    version = version + 1,
    updated_at = ?5
  WHERE tenant_id = ?1
    AND version = ?2
    AND status = ?3
    AND ends_at = ?4
    AND cancelled_at IS NULL
`;

const SYNC_CANCELLED_TENANT_STATUS_SQL = `
  UPDATE tenants
  SET status = 'cancelled', updated_at = ?5
  WHERE id = ?1
    AND EXISTS (
      SELECT 1
      FROM tenant_subscriptions
      WHERE tenant_id = ?1
        AND version = ?2 + 1
        AND status = 'cancelled'
        AND ends_at = ?4
        AND cancelled_at = ?5
    )
`;

const INSERT_CANCELLED_EVENT_SQL = `
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
    occurred_at
  )
  SELECT
    ?6, ?1, 'cancelled', ?3, 'cancelled',
    ?4, ?4, ?7, ?2 + 1, ?5
  FROM tenant_subscriptions
  WHERE tenant_id = ?1
    AND version = ?2 + 1
    AND status = 'cancelled'
    AND ends_at = ?4
    AND cancelled_at = ?5
`;

const INSERT_ADMIN_AUDIT_LOG_SQL = `
  INSERT INTO audit_logs (
    tenant_id,
    actor_external_user_id,
    action,
    target_type,
    target_id,
    idempotency_key,
    metadata_json
  )
  SELECT
    ?1, ?2, ?3, 'tenant_subscription',
    CAST(CAST(?1 AS INTEGER) AS TEXT),
    ?4, NULL
  FROM tenant_subscription_events
  WHERE tenant_id = ?1
    AND event_key = ?4
  ON CONFLICT (idempotency_key) DO NOTHING
`;

interface SubscriptionRow {
  tenantId: number;
  status: string;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionEventRow {
  eventKey: string;
  tenantId: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  previousEndsAt: string | null;
  newEndsAt: string;
  actorExternalUserId: string;
  subscriptionVersion: number;
  occurredAt: string;
}

export interface CreateTenantSubscriptionInput {
  tenantId: number;
  status: ManualSubscriptionInitialStatus;
  startsAt: string;
  endsAt: string;
  actorExternalUserId: string;
  occurredAt: string;
}

export interface ExtendTenantSubscriptionInput {
  tenantId: number;
  expectedVersion: number;
  newEndsAt: string;
  actorExternalUserId: string;
  occurredAt: string;
}

export interface ChangeTenantSubscriptionStatusInput {
  tenantId: number;
  expectedVersion: number;
  status: ManualSubscriptionOperationalStatus;
  actorExternalUserId: string;
  occurredAt: string;
}

export interface CancelTenantSubscriptionInput {
  tenantId: number;
  expectedVersion: number;
  actorExternalUserId: string;
  occurredAt: string;
}

export interface TenantSubscriptionRepository {
  findByTenantId(
    tenantId: number,
  ): Promise<TenantSubscription | null>;
  listEvents(
    tenantId: number,
  ): Promise<
    readonly TenantSubscriptionEvent[]
  >;
  create(
    input: CreateTenantSubscriptionInput,
  ): Promise<TenantSubscriptionMutationResult>;
  extend(
    input: ExtendTenantSubscriptionInput,
  ): Promise<TenantSubscriptionMutationResult>;
  changeStatus(
    input: ChangeTenantSubscriptionStatusInput,
  ): Promise<TenantSubscriptionMutationResult>;
  cancel(
    input: CancelTenantSubscriptionInput,
  ): Promise<TenantSubscriptionMutationResult>;
}

function nonBlank(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function parseSubscription(
  row: SubscriptionRow,
): TenantSubscription {
  const status = isSubscriptionStatus(
    row.status,
  )
    ? row.status
    : null;
  const validCancelledState =
    status === "cancelled"
      ? row.cancelledAt !== null
      : row.cancelledAt === null;

  if (
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !status ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    !nonBlank(row.createdAt) ||
    !nonBlank(row.updatedAt) ||
    !validCancelledState
  ) {
    throw new Error(
      "D1 returned an invalid tenant subscription",
    );
  }

  requireSubscriptionWindow(
    row.startsAt,
    row.endsAt,
  );

  if (row.cancelledAt !== null) {
    requireCanonicalTimestamp(
      row.cancelledAt,
    );
  }

  return {
    tenantId: row.tenantId,
    status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    cancelledAt: row.cancelledAt,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseEvent(
  row: SubscriptionEventRow,
): TenantSubscriptionEvent {
  const eventTypes = [
    "created",
    "extended",
    "status-changed",
    "cancelled",
  ] as const;
  const eventType = eventTypes.find(
    (candidate) =>
      candidate === row.eventType,
  );
  const fromStatus =
    row.fromStatus === null
      ? null
      : isSubscriptionStatus(
            row.fromStatus,
          )
        ? row.fromStatus
        : undefined;
  const toStatus = isSubscriptionStatus(
    row.toStatus,
  )
    ? row.toStatus
    : null;
  const eventStateValid =
    eventType === "created"
      ? fromStatus === null &&
        (toStatus === "trial" ||
          toStatus === "active") &&
        row.previousEndsAt === null &&
        row.subscriptionVersion === 1
      : eventType === "extended"
        ? fromStatus !== null &&
          fromStatus === toStatus &&
          row.previousEndsAt !== null &&
          Date.parse(
            row.previousEndsAt,
          ) < Date.parse(row.newEndsAt) &&
          row.subscriptionVersion >= 2
        : eventType === "status-changed"
          ? fromStatus !== null &&
            fromStatus !== toStatus &&
            (toStatus === "active" ||
              toStatus === "suspended" ||
              toStatus === "blocked") &&
            row.previousEndsAt !== null &&
            row.previousEndsAt ===
              row.newEndsAt &&
            row.subscriptionVersion >= 2
          : eventType === "cancelled"
            ? fromStatus !== null &&
              fromStatus !== "cancelled" &&
              toStatus === "cancelled" &&
              row.previousEndsAt !== null &&
              row.previousEndsAt ===
                row.newEndsAt &&
              row.subscriptionVersion >= 2
            : false;

  if (
    !EVENT_KEY_PATTERN.test(row.eventKey) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !eventType ||
    fromStatus === undefined ||
    !toStatus ||
    !eventStateValid ||
    !Number.isSafeInteger(
      row.subscriptionVersion,
    ) ||
    row.subscriptionVersion <= 0
  ) {
    throw new Error(
      "D1 returned an invalid tenant subscription event",
    );
  }

  if (row.previousEndsAt !== null) {
    requireCanonicalTimestamp(
      row.previousEndsAt,
    );
  }

  requireCanonicalTimestamp(row.newEndsAt);
  requireCanonicalTimestamp(row.occurredAt);
  const actorExternalUserId =
    requireActorExternalUserId(
      row.actorExternalUserId,
    );

  return {
    eventKey: row.eventKey,
    tenantId: row.tenantId,
    eventType,
    fromStatus,
    toStatus,
    previousEndsAt: row.previousEndsAt,
    newEndsAt: row.newEndsAt,
    actorExternalUserId,
    subscriptionVersion:
      row.subscriptionVersion,
    occurredAt: row.occurredAt,
  };
}

function assertBatch(
  results: readonly D1Result[],
  expectedLength: number,
): void {
  if (
    results.length !== expectedLength ||
    results.some(
      (result) => !result.success,
    )
  ) {
    throw new Error(
      "D1 tenant subscription mutation failed",
    );
  }
}

function unchanged(
  subscription: TenantSubscription,
): TenantSubscriptionMutationResult {
  return {
    outcome: "unchanged",
    subscription,
  };
}

function missing(
  outcome: "not-found" | "conflict",
  subscription: TenantSubscription | null,
): TenantSubscriptionMutationResult {
  return {
    outcome,
    subscription,
  };
}

export function createTenantSubscriptionRepository(
  database: D1DatabaseBinding,
): TenantSubscriptionRepository {
  const findByTenantId = async (
    tenantId: number,
  ): Promise<TenantSubscription | null> => {
    requirePositiveTenantId(tenantId);
    const row = await database
      .prepare(FIND_SUBSCRIPTION_SQL)
      .bind(tenantId)
      .first<SubscriptionRow>();

    return row ? parseSubscription(row) : null;
  };

  return {
    findByTenantId,

    async listEvents(tenantId) {
      requirePositiveTenantId(tenantId);
      const result = await database
        .prepare(LIST_EVENTS_SQL)
        .bind(
          tenantId,
          EVENT_LIST_LIMIT,
        )
        .all<SubscriptionEventRow>();

      if (!result.success) {
        throw new Error(
          "D1 tenant subscription event read failed",
        );
      }

      return (result.results ?? []).map(
        parseEvent,
      );
    },

    async create(input) {
      const tenantId =
        requirePositiveTenantId(
          input.tenantId,
        );
      const status =
        requireManualInitialStatus(
          input.status,
        );
      const { startsAt, endsAt } =
        requireSubscriptionWindow(
          input.startsAt,
          input.endsAt,
        );
      const occurredAt =
        requireCanonicalTimestamp(
          input.occurredAt,
        );
      const actorExternalUserId =
        requireActorExternalUserId(
          input.actorExternalUserId,
        );
      const existing =
        await findByTenantId(tenantId);

      if (existing) {
        return existing.status === status &&
          existing.startsAt === startsAt &&
          existing.endsAt === endsAt
          ? unchanged(existing)
          : missing(
              "conflict",
              existing,
            );
      }

      const eventKey =
        await deriveTenantSubscriptionEventKey(
          tenantId,
          {
            eventType: "created",
            expectedVersion: null,
            toStatus: status,
            newEndsAt: endsAt,
            actorExternalUserId,
          },
        );
      const results = await database.batch([
        database
          .prepare(INSERT_SUBSCRIPTION_SQL)
          .bind(
            tenantId,
            status,
            startsAt,
            endsAt,
            eventKey,
            occurredAt,
          ),
        database
          .prepare(
            SYNC_CREATED_TENANT_STATUS_SQL,
          )
          .bind(
            tenantId,
            status,
            startsAt,
            endsAt,
            eventKey,
            occurredAt,
          ),
        database
          .prepare(INSERT_CREATED_EVENT_SQL)
          .bind(
            tenantId,
            status,
            startsAt,
            endsAt,
            eventKey,
            occurredAt,
            actorExternalUserId,
          ),
        database
          .prepare(
            INSERT_ADMIN_AUDIT_LOG_SQL,
          )
          .bind(
            tenantId,
            actorExternalUserId,
            "subscription.created",
            eventKey,
          ),
      ]);

      assertBatch(results, 4);
      const subscription =
        await findByTenantId(tenantId);

      if (!subscription) {
        return missing("not-found", null);
      }

      return subscription.status === status &&
        subscription.startsAt === startsAt &&
        subscription.endsAt === endsAt
        ? {
            outcome:
              results[0]?.meta?.changes === 0
                ? "unchanged"
                : "created",
            subscription,
          }
        : missing(
            "conflict",
            subscription,
          );
    },

    async extend(input) {
      const tenantId =
        requirePositiveTenantId(
          input.tenantId,
        );
      const expectedVersion =
        requirePositiveVersion(
          input.expectedVersion,
        );
      const newEndsAt =
        requireCanonicalTimestamp(
          input.newEndsAt,
        );
      const occurredAt =
        requireCanonicalTimestamp(
          input.occurredAt,
        );
      const actorExternalUserId =
        requireActorExternalUserId(
          input.actorExternalUserId,
        );
      const current =
        await findByTenantId(tenantId);

      if (!current) {
        return missing("not-found", null);
      }

      if (
        current.version !== expectedVersion
      ) {
        return missing("conflict", current);
      }

      if (current.endsAt === newEndsAt) {
        return unchanged(current);
      }

      if (
        !canExtendSubscription(
          current.status,
        ) ||
        Date.parse(newEndsAt) <=
          Date.parse(current.endsAt)
      ) {
        return {
          outcome: "invalid-transition",
          subscription: current,
        };
      }

      const eventKey =
        await deriveTenantSubscriptionEventKey(
          tenantId,
          {
            eventType: "extended",
            expectedVersion,
            toStatus: current.status,
            newEndsAt,
            actorExternalUserId,
          },
        );
      const results = await database.batch([
        database
          .prepare(EXTEND_SUBSCRIPTION_SQL)
          .bind(
            tenantId,
            expectedVersion,
            current.status,
            current.endsAt,
            newEndsAt,
            eventKey,
            occurredAt,
          ),
        database
          .prepare(
            INSERT_EXTENDED_EVENT_SQL,
          )
          .bind(
            tenantId,
            expectedVersion,
            current.status,
            current.endsAt,
            newEndsAt,
            eventKey,
            occurredAt,
            actorExternalUserId,
          ),
        database
          .prepare(
            INSERT_ADMIN_AUDIT_LOG_SQL,
          )
          .bind(
            tenantId,
            actorExternalUserId,
            "subscription.extended",
            eventKey,
          ),
      ]);

      assertBatch(results, 3);
      const subscription =
        await findByTenantId(tenantId);

      return subscription?.version ===
          expectedVersion + 1 &&
        subscription.endsAt === newEndsAt
        ? {
            outcome: "updated",
            subscription,
          }
        : missing(
            "conflict",
            subscription,
          );
    },

    async changeStatus(input) {
      const tenantId =
        requirePositiveTenantId(
          input.tenantId,
        );
      const expectedVersion =
        requirePositiveVersion(
          input.expectedVersion,
        );
      const status =
        requireManualOperationalStatus(
          input.status,
        );
      const occurredAt =
        requireCanonicalTimestamp(
          input.occurredAt,
        );
      const actorExternalUserId =
        requireActorExternalUserId(
          input.actorExternalUserId,
        );
      const current =
        await findByTenantId(tenantId);

      if (!current) {
        return missing("not-found", null);
      }

      if (
        current.version !== expectedVersion
      ) {
        return missing("conflict", current);
      }

      if (current.status === status) {
        return unchanged(current);
      }

      if (
        !canChangeManualStatus(
          current.status,
          status,
        ) ||
        (status === "active" &&
          Date.parse(occurredAt) >=
            Date.parse(current.endsAt))
      ) {
        return {
          outcome: "invalid-transition",
          subscription: current,
        };
      }

      const eventKey =
        await deriveTenantSubscriptionEventKey(
          tenantId,
          {
            eventType: "status-changed",
            expectedVersion,
            toStatus: status,
            newEndsAt: current.endsAt,
            actorExternalUserId,
          },
        );
      const bindValues = [
        tenantId,
        expectedVersion,
        current.status,
        status,
        current.endsAt,
        occurredAt,
        eventKey,
        actorExternalUserId,
      ] as const;
      const results = await database.batch([
        database
          .prepare(CHANGE_STATUS_SQL)
          .bind(...bindValues.slice(0, 6)),
        database
          .prepare(
            SYNC_CHANGED_TENANT_STATUS_SQL,
          )
          .bind(...bindValues.slice(0, 6)),
        database
          .prepare(INSERT_STATUS_EVENT_SQL)
          .bind(...bindValues),
        database
          .prepare(
            INSERT_ADMIN_AUDIT_LOG_SQL,
          )
          .bind(
            tenantId,
            actorExternalUserId,
            "subscription.status_changed",
            eventKey,
          ),
      ]);

      assertBatch(results, 4);
      const subscription =
        await findByTenantId(tenantId);

      return subscription?.version ===
          expectedVersion + 1 &&
        subscription.status === status
        ? {
            outcome: "updated",
            subscription,
          }
        : missing(
            "conflict",
            subscription,
          );
    },

    async cancel(input) {
      const tenantId =
        requirePositiveTenantId(
          input.tenantId,
        );
      const expectedVersion =
        requirePositiveVersion(
          input.expectedVersion,
        );
      const occurredAt =
        requireCanonicalTimestamp(
          input.occurredAt,
        );
      const actorExternalUserId =
        requireActorExternalUserId(
          input.actorExternalUserId,
        );
      const current =
        await findByTenantId(tenantId);

      if (!current) {
        return missing("not-found", null);
      }

      if (
        current.version !== expectedVersion
      ) {
        return missing("conflict", current);
      }

      if (current.status === "cancelled") {
        return unchanged(current);
      }

      if (
        !canCancelSubscription(
          current.status,
        )
      ) {
        return {
          outcome: "invalid-transition",
          subscription: current,
        };
      }

      const eventKey =
        await deriveTenantSubscriptionEventKey(
          tenantId,
          {
            eventType: "cancelled",
            expectedVersion,
            toStatus: "cancelled",
            newEndsAt: current.endsAt,
            actorExternalUserId,
          },
        );
      const bindValues = [
        tenantId,
        expectedVersion,
        current.status,
        current.endsAt,
        occurredAt,
        eventKey,
        actorExternalUserId,
      ] as const;
      const results = await database.batch([
        database
          .prepare(CANCEL_SUBSCRIPTION_SQL)
          .bind(...bindValues.slice(0, 5)),
        database
          .prepare(
            SYNC_CANCELLED_TENANT_STATUS_SQL,
          )
          .bind(...bindValues.slice(0, 5)),
        database
          .prepare(
            INSERT_CANCELLED_EVENT_SQL,
          )
          .bind(...bindValues),
        database
          .prepare(
            INSERT_ADMIN_AUDIT_LOG_SQL,
          )
          .bind(
            tenantId,
            actorExternalUserId,
            "subscription.cancelled",
            eventKey,
          ),
      ]);

      assertBatch(results, 4);
      const subscription =
        await findByTenantId(tenantId);

      return subscription?.version ===
          expectedVersion + 1 &&
        subscription.status ===
          "cancelled" &&
        subscription.cancelledAt ===
          occurredAt
        ? {
            outcome: "updated",
            subscription,
          }
        : missing(
            "conflict",
            subscription,
          );
    },
  };
}
