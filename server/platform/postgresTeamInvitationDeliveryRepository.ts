import type {
  ClaimTeamInvitationDeliveryResult,
  PreparedTeamInvitationDelivery,
  TeamInvitationDeliveryRepository,
} from "../../db/teamInvitationDeliveryRepository.ts";
import type {
  TeamInvitationDelivery,
} from "../../shared/domain/teamInvitation.ts";
import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
} from "../team/teamInvitationKey.ts";
import {
  requireTeamInvitationDeliveryErrorCode,
  requireTeamInvitationDeliveryKey,
  requireTeamInvitationDeliveryStatus,
  requireTeamInvitationEmail,
  requireTeamInvitationKey,
  requireTeamInvitationRole,
} from "../team/teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
  requireTeamMembershipVersion,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "../team/teamMembershipValidation.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const deliveryRowKeys = Object.freeze([
  "deliveryKey",
  "tenantId",
  "invitationKey",
  "invitationVersion",
  "status",
  "attemptCount",
  "lastErrorCode",
  "submittedAt",
  "createdAt",
  "updatedAt",
]);
const preparedRowKeys = Object.freeze([
  "normalizedEmail",
  "role",
  "invitedByExternalUserId",
  "requestedAt",
  "expiresAt",
]);
const deferralRowKeys = Object.freeze([
  "retryAfterAt",
  "deferredAt",
]);
const deliveryColumnsSql = `
  delivery_key AS "deliveryKey",
  tenant_id AS "tenantId",
  invitation_key AS "invitationKey",
  invitation_version AS "invitationVersion",
  status,
  attempt_count AS "attemptCount",
  last_error_code AS "lastErrorCode",
  submitted_at AS "submittedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export const postgresTeamInvitationDeliverySql = Object.freeze({
  find: `
    SELECT ${deliveryColumnsSql}
    FROM team_invitation_deliveries
    WHERE tenant_id = $1
      AND delivery_key = $2
    LIMIT 1
  `,
  findActiveDeferral: `
    SELECT
      retry_after_at AS "retryAfterAt",
      deferred_at AS "deferredAt"
    FROM team_invitation_delivery_deferrals
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND retry_after_at > $3::timestamptz
    LIMIT 1
  `,
  claim: `
    UPDATE team_invitation_deliveries
    SET
      status = 'sending',
      attempt_count = 1,
      updated_at = $3::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'pending'
      AND NOT EXISTS (
        SELECT 1
        FROM team_invitation_delivery_deferrals
        WHERE team_invitation_delivery_deferrals.delivery_key =
          team_invitation_deliveries.delivery_key
          AND team_invitation_delivery_deferrals.tenant_id =
            team_invitation_deliveries.tenant_id
          AND team_invitation_delivery_deferrals.retry_after_at >
            $3::timestamptz
      )
      AND EXISTS (
        SELECT 1
        FROM team_invitations
        WHERE team_invitations.tenant_id =
          team_invitation_deliveries.tenant_id
          AND team_invitations.invitation_key =
            team_invitation_deliveries.invitation_key
          AND team_invitations.version =
            team_invitation_deliveries.invitation_version
          AND team_invitations.status = 'pending'
          AND team_invitations.expires_at > $3::timestamptz
      )
    RETURNING ${deliveryColumnsSql}
  `,
  defer: `
    INSERT INTO team_invitation_delivery_deferrals (
      delivery_key,
      tenant_id,
      reason_code,
      retry_after_at,
      deferred_at
    )
    SELECT
      $2,
      $1,
      'PROVIDER_RATE_LIMITED',
      $4::timestamptz,
      $3::timestamptz
    WHERE EXISTS (
      SELECT 1
      FROM team_invitation_deliveries
      WHERE tenant_id = $1
        AND delivery_key = $2
        AND status = 'sending'
    )
    ON CONFLICT (delivery_key) DO UPDATE SET
      retry_after_at = EXCLUDED.retry_after_at,
      deferred_at = EXCLUDED.deferred_at
    WHERE team_invitation_delivery_deferrals.tenant_id = EXCLUDED.tenant_id
    RETURNING
      retry_after_at AS "retryAfterAt",
      deferred_at AS "deferredAt"
  `,
  cancelObsolete: `
    UPDATE team_invitation_deliveries
    SET
      status = 'cancelled',
      last_error_code = 'INVITATION_NOT_DELIVERABLE',
      updated_at = $3::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'pending'
      AND NOT EXISTS (
        SELECT 1
        FROM team_invitations
        WHERE team_invitations.tenant_id =
          team_invitation_deliveries.tenant_id
          AND team_invitations.invitation_key =
            team_invitation_deliveries.invitation_key
          AND team_invitations.version =
            team_invitation_deliveries.invitation_version
          AND team_invitations.status = 'pending'
          AND team_invitations.expires_at > $3::timestamptz
      )
    RETURNING ${deliveryColumnsSql}
  `,
  findPreparedInvitation: `
    SELECT
      normalized_email AS "normalizedEmail",
      role,
      invited_by_external_user_id AS "invitedByExternalUserId",
      requested_at AS "requestedAt",
      expires_at AS "expiresAt"
    FROM team_invitations
    WHERE tenant_id = $1
      AND invitation_key = $2
      AND version = $3
      AND status = 'pending'
    LIMIT 1
  `,
  settle: `
    UPDATE team_invitation_deliveries
    SET
      status = $3,
      last_error_code = $4,
      submitted_at = $5::timestamptz,
      updated_at = $6::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'sending'
    RETURNING ${deliveryColumnsSql}
  `,
  reconcile: `
    UPDATE team_invitation_deliveries
    SET
      status = $3,
      last_error_code = $4,
      submitted_at = $5::timestamptz,
      updated_at = $6::timestamptz
    WHERE tenant_id = $1
      AND delivery_key = $2
      AND status = 'ambiguous'
    RETURNING ${deliveryColumnsSql}
  `,
});

export interface PostgresTeamInvitationDeliveryDependencies {
  readonly queries: PostgresQueryExecutor;
}

function requireAttemptCount(value: unknown): number {
  const normalized =
    typeof value === "string" && /^(?:0|1)$/.test(value)
      ? Number(value)
      : value;

  if (
    !Number.isSafeInteger(normalized) ||
    Number(normalized) < 0 ||
    Number(normalized) > 1
  ) {
    throw new Error("team invitation delivery attempt count is invalid");
  }

  return Number(normalized);
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null
    ? null
    : requireTeamTimestamp(parsePostgresTimestamp(value));
}

function parseDeferral(value: unknown): Readonly<{
  retryAfterAt: string;
  deferredAt: string;
}> {
  const row = requireExactPostgresRow(
    value,
    deferralRowKeys,
  );
  const retryAfterAt = requireTeamTimestamp(
    parsePostgresTimestamp(
      row.retryAfterAt,
    ),
  );
  const deferredAt = requireTeamTimestamp(
    parsePostgresTimestamp(
      row.deferredAt,
    ),
  );
  const delayMilliseconds =
    Date.parse(retryAfterAt) -
    Date.parse(deferredAt);

  if (
    delayMilliseconds < 1_000 ||
    delayMilliseconds > 86_400_000
  ) {
    throw new Error(
      "PostgreSQL returned an invalid invitation delivery deferral",
    );
  }

  return Object.freeze({
    retryAfterAt,
    deferredAt,
  });
}

function retryAfterSeconds(
  retryAfterAt: string,
  occurredAt: string,
): number {
  const seconds = Math.ceil(
    (
      Date.parse(retryAfterAt) -
      Date.parse(occurredAt)
    ) / 1_000,
  );

  if (
    !Number.isSafeInteger(seconds) ||
    seconds < 1 ||
    seconds > 86_400
  ) {
    throw new Error(
      "team invitation delivery retry delay is invalid",
    );
  }

  return seconds;
}

function parseDelivery(value: unknown): Readonly<TeamInvitationDelivery> {
  const row = requireExactPostgresRow(value, deliveryRowKeys);
  const status = requireTeamInvitationDeliveryStatus(row.status);
  const attemptCount = requireAttemptCount(row.attemptCount);
  const lastErrorCode = row.lastErrorCode === null
    ? null
    : requireTeamInvitationDeliveryErrorCode(row.lastErrorCode);
  const submittedAt = parseNullableTimestamp(row.submittedAt);
  const createdAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.createdAt),
  );
  const updatedAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.updatedAt),
  );

  if (
    Date.parse(updatedAt) < Date.parse(createdAt) ||
    (submittedAt !== null && Date.parse(submittedAt) < Date.parse(createdAt)) ||
    (status === "pending" &&
      (attemptCount !== 0 || lastErrorCode !== null || submittedAt !== null)) ||
    (status === "sending" &&
      (attemptCount !== 1 || lastErrorCode !== null || submittedAt !== null)) ||
    (status === "submitted" &&
      (attemptCount !== 1 || lastErrorCode !== null || submittedAt === null)) ||
    ((status === "blocked" ||
      status === "ambiguous" ||
      status === "cancelled") &&
      (lastErrorCode === null || submittedAt !== null))
  ) {
    throw new Error("PostgreSQL returned an invalid invitation delivery state");
  }

  return Object.freeze({
    deliveryKey: requireTeamInvitationDeliveryKey(row.deliveryKey),
    tenantId: requireTeamTenantId(
      parsePostgresPositiveInteger(row.tenantId),
    ),
    invitationKey: requireTeamInvitationKey(row.invitationKey),
    invitationVersion: requireTeamMembershipVersion(
      parsePostgresPositiveInteger(row.invitationVersion),
    ),
    status,
    attemptCount,
    lastErrorCode,
    submittedAt,
    createdAt,
    updatedAt,
  });
}

function parsePrepared(
  value: unknown,
): Omit<PreparedTeamInvitationDelivery, "delivery"> {
  const row = requireExactPostgresRow(value, preparedRowKeys);
  const requestedAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.requestedAt),
  );
  const expiresAt = requireTeamTimestamp(
    parsePostgresTimestamp(row.expiresAt),
  );

  if (Date.parse(expiresAt) <= Date.parse(requestedAt)) {
    throw new Error("PostgreSQL returned an invalid invitation expiry");
  }

  return Object.freeze({
    normalizedEmail: requireTeamInvitationEmail(row.normalizedEmail),
    role: requireTeamInvitationRole(row.role),
    invitedByExternalUserId: requireTeamExternalUserId(
      row.invitedByExternalUserId,
    ),
    requestedAt,
    expiresAt,
  });
}

async function loadOne<TValue>(
  database: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  parse: (value: unknown) => TValue,
): Promise<TValue | null> {
  const result = await database.query<Record<string, unknown>>(
    sql,
    parameters,
  );
  const rows = requirePostgresRows(result, 1);

  return rows.length === 0 ? null : parse(rows[0]);
}

export function createPostgresTeamInvitationDeliveryRepository(
  dependencies: Readonly<PostgresTeamInvitationDeliveryDependencies>,
): TeamInvitationDeliveryRepository {
  if (typeof dependencies.queries?.query !== "function") {
    throw new Error("PostgreSQL invitation delivery dependencies are invalid");
  }

  async function find(
    tenantIdInput: unknown,
    deliveryKeyInput: unknown,
  ): Promise<TeamInvitationDelivery | null> {
    const tenantId = requireTeamTenantId(tenantIdInput);
    const deliveryKey = requireTeamInvitationDeliveryKey(deliveryKeyInput);
    const delivery = await loadOne(
      dependencies.queries,
      postgresTeamInvitationDeliverySql.find,
      [tenantId, deliveryKey],
      parseDelivery,
    );

    if (delivery === null) {
      return null;
    }

    const expectedKey = await deriveTeamInvitationDeliveryKey({
      tenantId: delivery.tenantId,
      invitationKey: delivery.invitationKey,
      invitationVersion: delivery.invitationVersion,
    });

    if (
      delivery.tenantId !== tenantId ||
      delivery.deliveryKey !== deliveryKey ||
      expectedKey !== deliveryKey
    ) {
      throw new Error("PostgreSQL returned invalid invitation delivery scope");
    }

    return delivery;
  }

  async function requireSettled(
    tenantId: number,
    deliveryKey: string,
    status: "submitted" | "blocked" | "ambiguous",
  ): Promise<TeamInvitationDelivery> {
    const delivery = await find(tenantId, deliveryKey);

    if (delivery === null || delivery.status !== status) {
      throw new Error("team invitation delivery persistence failed");
    }

    return delivery;
  }

  async function settle(
    tenantIdInput: unknown,
    deliveryKeyInput: unknown,
    status: "submitted" | "blocked" | "ambiguous",
    errorCodeInput: unknown,
    occurredAtInput: unknown,
  ): Promise<TeamInvitationDelivery> {
    const tenantId = requireTeamTenantId(tenantIdInput);
    const deliveryKey = requireTeamInvitationDeliveryKey(deliveryKeyInput);
    const occurredAt = requireTeamTimestamp(occurredAtInput);
    const errorCode = status === "submitted"
      ? null
      : requireTeamInvitationDeliveryErrorCode(errorCodeInput);
    const submittedAt = status === "submitted" ? occurredAt : null;
    const saved = await loadOne(
      dependencies.queries,
      postgresTeamInvitationDeliverySql.settle,
      [tenantId, deliveryKey, status, errorCode, submittedAt, occurredAt],
      parseDelivery,
    );

    return saved ?? requireSettled(tenantId, deliveryKey, status);
  }

  async function reconcile(
    tenantIdInput: unknown,
    deliveryKeyInput: unknown,
    status: "submitted" | "blocked",
    errorCodeInput: unknown,
    occurredAtInput: unknown,
  ): Promise<TeamInvitationDelivery> {
    const tenantId = requireTeamTenantId(tenantIdInput);
    const deliveryKey = requireTeamInvitationDeliveryKey(deliveryKeyInput);
    const occurredAt = requireTeamTimestamp(occurredAtInput);
    const errorCode = status === "submitted"
      ? null
      : requireTeamInvitationDeliveryErrorCode(errorCodeInput);
    const submittedAt = status === "submitted" ? occurredAt : null;
    const saved = await loadOne(
      dependencies.queries,
      postgresTeamInvitationDeliverySql.reconcile,
      [tenantId, deliveryKey, status, errorCode, submittedAt, occurredAt],
      parseDelivery,
    );

    return saved ?? requireSettled(tenantId, deliveryKey, status);
  }

  return Object.freeze({
    find,

    async defer(
      tenantIdInput: unknown,
      deliveryKeyInput: unknown,
      occurredAtInput: unknown,
      retryAfterAtInput: unknown,
    ) {
      const tenantId = requireTeamTenantId(
        tenantIdInput,
      );
      const deliveryKey = requireTeamInvitationDeliveryKey(
        deliveryKeyInput,
      );
      const occurredAt = requireTeamTimestamp(
        occurredAtInput,
      );
      const retryAfterAt = requireTeamTimestamp(
        retryAfterAtInput,
      );

      retryAfterSeconds(
        retryAfterAt,
        occurredAt,
      );

      const deferral = await loadOne(
        dependencies.queries,
        postgresTeamInvitationDeliverySql.defer,
        [
          tenantId,
          deliveryKey,
          occurredAt,
          retryAfterAt,
        ],
        parseDeferral,
      );

      if (
        deferral === null ||
        deferral.retryAfterAt !== retryAfterAt ||
        deferral.deferredAt !== occurredAt
      ) {
        throw new Error(
          "team invitation delivery deferral persistence failed",
        );
      }

      const delivery = await find(
        tenantId,
        deliveryKey,
      );

      if (
        delivery === null ||
        delivery.status !== "pending" ||
        delivery.updatedAt !== occurredAt
      ) {
        throw new Error(
          "team invitation delivery deferral transition failed",
        );
      }

      return delivery;
    },

    async claim(
      tenantIdInput: unknown,
      deliveryKeyInput: unknown,
      occurredAtInput: unknown,
    ): Promise<ClaimTeamInvitationDeliveryResult> {
      const tenantId = requireTeamTenantId(tenantIdInput);
      const deliveryKey = requireTeamInvitationDeliveryKey(deliveryKeyInput);
      const occurredAt = requireTeamTimestamp(occurredAtInput);
      const current = await find(tenantId, deliveryKey);

      if (current === null) {
        return Object.freeze({ outcome: "not-found" });
      }

      if (current.status === "sending") {
        return Object.freeze({ outcome: "uncertain", delivery: current });
      }

      if (current.status !== "pending") {
        return Object.freeze({ outcome: "duplicate", delivery: current });
      }

      const claimed = await loadOne(
        dependencies.queries,
        postgresTeamInvitationDeliverySql.claim,
        [tenantId, deliveryKey, occurredAt],
        parseDelivery,
      );

      if (claimed === null) {
        const cancelled = await loadOne(
          dependencies.queries,
          postgresTeamInvitationDeliverySql.cancelObsolete,
          [tenantId, deliveryKey, occurredAt],
          parseDelivery,
        );

        if (cancelled !== null) {
          return Object.freeze({ outcome: "cancelled", delivery: cancelled });
        }

        const deferral = await loadOne(
          dependencies.queries,
          postgresTeamInvitationDeliverySql.findActiveDeferral,
          [tenantId, deliveryKey, occurredAt],
          parseDeferral,
        );

        const concurrent = await find(tenantId, deliveryKey);

        if (concurrent === null) {
          return Object.freeze({ outcome: "not-found" });
        }


        if (
          deferral !== null &&
          concurrent.status === "pending"
        ) {
          return Object.freeze({
            outcome: "deferred",
            retryAfterSeconds: retryAfterSeconds(
              deferral.retryAfterAt,
              occurredAt,
            ),
            delivery: concurrent,
          });
        }

        return Object.freeze({
          outcome: concurrent.status === "sending" ? "uncertain" : "duplicate",
          delivery: concurrent,
        });
      }

      const prepared = await loadOne(
        dependencies.queries,
        postgresTeamInvitationDeliverySql.findPreparedInvitation,
        [tenantId, claimed.invitationKey, claimed.invitationVersion],
        parsePrepared,
      );

      if (prepared === null) {
        throw new Error("claimed invitation delivery lost its invitation");
      }

      if (
        await deriveTeamInvitationKey({
          tenantId,
          email: prepared.normalizedEmail,
        }) !== claimed.invitationKey
      ) {
        throw new Error("claimed invitation identity is invalid");
      }

      return Object.freeze({
        outcome: "claimed",
        prepared: Object.freeze({ delivery: claimed, ...prepared }),
      });
    },

    markSubmitted(
      tenantId: unknown,
      deliveryKey: unknown,
      occurredAt: unknown,
    ) {
      return settle(
        tenantId,
        deliveryKey,
        "submitted",
        null,
        occurredAt,
      );
    },

    markBlocked(
      tenantId: unknown,
      deliveryKey: unknown,
      errorCode: unknown,
      occurredAt: unknown,
    ) {
      return settle(
        tenantId,
        deliveryKey,
        "blocked",
        errorCode,
        occurredAt,
      );
    },

    markAmbiguous(
      tenantId: unknown,
      deliveryKey: unknown,
      errorCode: unknown,
      occurredAt: unknown,
    ) {
      return settle(
        tenantId,
        deliveryKey,
        "ambiguous",
        errorCode,
        occurredAt,
      );
    },

    reconcileSubmitted(
      tenantId: unknown,
      deliveryKey: unknown,
      occurredAt: unknown,
    ) {
      return reconcile(
        tenantId,
        deliveryKey,
        "submitted",
        null,
        occurredAt,
      );
    },

    reconcileBlocked(
      tenantId: unknown,
      deliveryKey: unknown,
      errorCode: unknown,
      occurredAt: unknown,
    ) {
      return reconcile(
        tenantId,
        deliveryKey,
        "blocked",
        errorCode,
        occurredAt,
      );
    },
  });
}
