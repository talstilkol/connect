import type {
  TeamInvitationDelivery,
  TeamInvitationRole,
} from "../shared/domain/teamInvitation.ts";
import {
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
} from "../server/team/teamInvitationKey.ts";
import {
  requireTeamInvitationDeliveryErrorCode,
  requireTeamInvitationDeliveryKey,
  requireTeamInvitationDeliveryStatus,
  requireTeamInvitationEmail,
  requireTeamInvitationKey,
  requireTeamInvitationRole,
} from "../server/team/teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
  requireTeamMembershipVersion,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "../server/team/teamMembershipValidation.ts";
import type {
  UserId,
} from "../shared/domain/model.ts";
import type {
  D1DatabaseBinding,
} from "./d1.ts";

const deliveryColumnsSql = `
  delivery_key AS deliveryKey,
  tenant_id AS tenantId,
  invitation_key AS invitationKey,
  invitation_version AS invitationVersion,
  status,
  attempt_count AS attemptCount,
  last_error_code AS lastErrorCode,
  submitted_at AS submittedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const findDeliverySql = `
  SELECT
    ${deliveryColumnsSql}
  FROM team_invitation_deliveries
  WHERE tenant_id = ?1
    AND delivery_key = ?2
  LIMIT 1
`;

const claimDeliverySql = `
  UPDATE team_invitation_deliveries
  SET
    status = 'sending',
    attempt_count = 1,
    updated_at = ?3
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'pending'
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
        AND team_invitations.expires_at > ?3
    )
  RETURNING
    ${deliveryColumnsSql}
`;

const cancelObsoleteSql = `
  UPDATE team_invitation_deliveries
  SET
    status = 'cancelled',
    last_error_code =
      'INVITATION_NOT_DELIVERABLE',
    updated_at = ?3
  WHERE tenant_id = ?1
    AND delivery_key = ?2
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
        AND team_invitations.expires_at > ?3
    )
  RETURNING
    ${deliveryColumnsSql}
`;

const findPreparedInvitationSql = `
  SELECT
    normalized_email AS normalizedEmail,
    role,
    invited_by_external_user_id AS invitedByExternalUserId,
    requested_at AS requestedAt,
    expires_at AS expiresAt
  FROM team_invitations
  WHERE tenant_id = ?1
    AND invitation_key = ?2
    AND version = ?3
    AND status = 'pending'
  LIMIT 1
`;

const settleDeliverySql = `
  UPDATE team_invitation_deliveries
  SET
    status = ?3,
    last_error_code = ?4,
    submitted_at = ?5,
    updated_at = ?6
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'sending'
  RETURNING
    ${deliveryColumnsSql}
`;

const reconcileDeliverySql = `
  UPDATE team_invitation_deliveries
  SET
    status = ?3,
    last_error_code = ?4,
    submitted_at = ?5,
    updated_at = ?6
  WHERE tenant_id = ?1
    AND delivery_key = ?2
    AND status = 'ambiguous'
  RETURNING
    ${deliveryColumnsSql}
`;

interface DeliveryRow {
  deliveryKey: unknown;
  tenantId: unknown;
  invitationKey: unknown;
  invitationVersion: unknown;
  status: unknown;
  attemptCount: unknown;
  lastErrorCode: unknown;
  submittedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

interface PreparedInvitationRow {
  normalizedEmail: unknown;
  role: unknown;
  invitedByExternalUserId: unknown;
  requestedAt: unknown;
  expiresAt: unknown;
}

export interface PreparedTeamInvitationDelivery {
  delivery:
    TeamInvitationDelivery;
  normalizedEmail: string;
  role: TeamInvitationRole;
  invitedByExternalUserId: UserId;
  requestedAt: string;
  expiresAt: string;
}

export type ClaimTeamInvitationDeliveryResult =
  | {
      outcome: "claimed";
      prepared:
        PreparedTeamInvitationDelivery;
    }
  | {
      outcome:
        | "duplicate"
        | "uncertain"
        | "cancelled";
      delivery:
        TeamInvitationDelivery;
    }
  | {
      outcome: "not-found";
    };

export interface TeamInvitationDeliveryRepository {
  find(
    tenantId: unknown,
    deliveryKey: unknown,
  ): Promise<TeamInvitationDelivery | null>;
  claim(
    tenantId: unknown,
    deliveryKey: unknown,
    occurredAt: unknown,
  ): Promise<ClaimTeamInvitationDeliveryResult>;
  markSubmitted(
    tenantId: unknown,
    deliveryKey: unknown,
    occurredAt: unknown,
  ): Promise<TeamInvitationDelivery>;
  markBlocked(
    tenantId: unknown,
    deliveryKey: unknown,
    errorCode: unknown,
    occurredAt: unknown,
  ): Promise<TeamInvitationDelivery>;
  markAmbiguous(
    tenantId: unknown,
    deliveryKey: unknown,
    errorCode: unknown,
    occurredAt: unknown,
  ): Promise<TeamInvitationDelivery>;
  reconcileSubmitted(
    tenantId: unknown,
    deliveryKey: unknown,
    occurredAt: unknown,
  ): Promise<TeamInvitationDelivery>;
  reconcileBlocked(
    tenantId: unknown,
    deliveryKey: unknown,
    errorCode: unknown,
    occurredAt: unknown,
  ): Promise<TeamInvitationDelivery>;
}

function requireAttemptCount(
  value: unknown,
): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 0 ||
    Number(value) > 1
  ) {
    throw new Error(
      "team invitation delivery attempt count is invalid",
    );
  }

  return Number(value);
}

function parseNullableTimestamp(
  value: unknown,
): string | null {
  return value === null
    ? null
    : requireTeamTimestamp(value);
}

function parseDelivery(
  row: DeliveryRow,
): TeamInvitationDelivery {
  const status =
    requireTeamInvitationDeliveryStatus(
      row.status,
    );
  const attemptCount =
    requireAttemptCount(
      row.attemptCount,
    );
  const lastErrorCode =
    row.lastErrorCode === null
      ? null
      : requireTeamInvitationDeliveryErrorCode(
          row.lastErrorCode,
        );
  const submittedAt =
    parseNullableTimestamp(
      row.submittedAt,
    );
  const createdAt =
    requireTeamTimestamp(
      row.createdAt,
    );
  const updatedAt =
    requireTeamTimestamp(
      row.updatedAt,
    );

  if (
    Date.parse(updatedAt) <
      Date.parse(createdAt) ||
    (
      submittedAt !== null &&
      Date.parse(submittedAt) <
        Date.parse(createdAt)
    ) ||
    (
      status === "pending" &&
      (
        attemptCount !== 0 ||
        lastErrorCode !== null ||
        submittedAt !== null
      )
    ) ||
    (
      status === "sending" &&
      (
        attemptCount !== 1 ||
        lastErrorCode !== null ||
        submittedAt !== null
      )
    ) ||
    (
      status === "submitted" &&
      (
        attemptCount !== 1 ||
        lastErrorCode !== null ||
        submittedAt === null
      )
    ) ||
    (
      (
        status === "blocked" ||
        status === "ambiguous" ||
        status === "cancelled"
      ) &&
      (
        lastErrorCode === null ||
        submittedAt !== null
      )
    )
  ) {
    throw new Error(
      "D1 returned an invalid invitation delivery state",
    );
  }

  return {
    deliveryKey:
      requireTeamInvitationDeliveryKey(
        row.deliveryKey,
      ),
    tenantId:
      requireTeamTenantId(
        row.tenantId,
      ),
    invitationKey:
      requireTeamInvitationKey(
        row.invitationKey,
      ),
    invitationVersion:
      requireTeamMembershipVersion(
        row.invitationVersion,
      ),
    status,
    attemptCount,
    lastErrorCode,
    submittedAt,
    createdAt,
    updatedAt,
  };
}

function parsePrepared(
  row: PreparedInvitationRow,
): Omit<
  PreparedTeamInvitationDelivery,
  "delivery"
> {
  const requestedAt =
    requireTeamTimestamp(
      row.requestedAt,
    );
  const expiresAt =
    requireTeamTimestamp(
      row.expiresAt,
    );

  if (
    Date.parse(expiresAt) <=
      Date.parse(requestedAt)
  ) {
    throw new Error(
      "D1 returned an invalid invitation expiry",
    );
  }

  return {
    normalizedEmail:
      requireTeamInvitationEmail(
        row.normalizedEmail,
      ),
    role:
      requireTeamInvitationRole(
        row.role,
      ),
    invitedByExternalUserId:
      requireTeamExternalUserId(
        row.invitedByExternalUserId,
      ),
    requestedAt,
    expiresAt,
  };
}

export function createTeamInvitationDeliveryRepository(
  database: D1DatabaseBinding,
): TeamInvitationDeliveryRepository {
  async function find(
    tenantIdInput: unknown,
    deliveryKeyInput: unknown,
  ): Promise<TeamInvitationDelivery | null> {
    const tenantId =
      requireTeamTenantId(
        tenantIdInput,
      );
    const deliveryKey =
      requireTeamInvitationDeliveryKey(
        deliveryKeyInput,
      );
    const row = await database
      .prepare(findDeliverySql)
      .bind(
        tenantId,
        deliveryKey,
      )
      .first<DeliveryRow>();

    if (row === null) {
      return null;
    }

    const delivery =
      parseDelivery(row);
    const expectedKey =
      await deriveTeamInvitationDeliveryKey(
        {
          tenantId:
            delivery.tenantId,
          invitationKey:
            delivery.invitationKey,
          invitationVersion:
            delivery.invitationVersion,
        },
      );

    if (
      delivery.tenantId !==
        tenantId ||
      delivery.deliveryKey !==
        deliveryKey ||
      expectedKey !== deliveryKey
    ) {
      throw new Error(
        "D1 returned invalid invitation delivery scope",
      );
    }

    return delivery;
  }

  async function requireSettled(
    tenantId: number,
    deliveryKey: string,
    status:
      | "submitted"
      | "blocked"
      | "ambiguous",
  ): Promise<TeamInvitationDelivery> {
    const delivery =
      await find(
        tenantId,
        deliveryKey,
      );

    if (
      delivery === null ||
      delivery.status !== status
    ) {
      throw new Error(
        "team invitation delivery persistence failed",
      );
    }

    return delivery;
  }

  async function settle(
    tenantIdInput: unknown,
    deliveryKeyInput: unknown,
    status:
      | "submitted"
      | "blocked"
      | "ambiguous",
    errorCodeInput: unknown,
    occurredAtInput: unknown,
  ): Promise<TeamInvitationDelivery> {
    const tenantId =
      requireTeamTenantId(
        tenantIdInput,
      );
    const deliveryKey =
      requireTeamInvitationDeliveryKey(
        deliveryKeyInput,
      );
    const occurredAt =
      requireTeamTimestamp(
        occurredAtInput,
      );
    const errorCode =
      status === "submitted"
        ? null
        : requireTeamInvitationDeliveryErrorCode(
            errorCodeInput,
          );
    const submittedAt =
      status === "submitted"
        ? occurredAt
        : null;
    const row = await database
      .prepare(settleDeliverySql)
      .bind(
        tenantId,
        deliveryKey,
        status,
        errorCode,
        submittedAt,
        occurredAt,
      )
      .first<DeliveryRow>();

    if (row !== null) {
      return parseDelivery(row);
    }

    return requireSettled(
      tenantId,
      deliveryKey,
      status,
    );
  }

  async function reconcile(
    tenantIdInput: unknown,
    deliveryKeyInput: unknown,
    status:
      | "submitted"
      | "blocked",
    errorCodeInput: unknown,
    occurredAtInput: unknown,
  ): Promise<TeamInvitationDelivery> {
    const tenantId =
      requireTeamTenantId(
        tenantIdInput,
      );
    const deliveryKey =
      requireTeamInvitationDeliveryKey(
        deliveryKeyInput,
      );
    const occurredAt =
      requireTeamTimestamp(
        occurredAtInput,
      );
    const errorCode =
      status === "submitted"
        ? null
        : requireTeamInvitationDeliveryErrorCode(
            errorCodeInput,
          );
    const submittedAt =
      status === "submitted"
        ? occurredAt
        : null;
    const row = await database
      .prepare(reconcileDeliverySql)
      .bind(
        tenantId,
        deliveryKey,
        status,
        errorCode,
        submittedAt,
        occurredAt,
      )
      .first<DeliveryRow>();

    if (row !== null) {
      return parseDelivery(row);
    }

    return requireSettled(
      tenantId,
      deliveryKey,
      status,
    );
  }

  return {
    find,

    async claim(
      tenantIdInput,
      deliveryKeyInput,
      occurredAtInput,
    ) {
      const tenantId =
        requireTeamTenantId(
          tenantIdInput,
        );
      const deliveryKey =
        requireTeamInvitationDeliveryKey(
          deliveryKeyInput,
        );
      const occurredAt =
        requireTeamTimestamp(
          occurredAtInput,
        );
      const current =
        await find(
          tenantId,
          deliveryKey,
        );

      if (current === null) {
        return {
          outcome:
            "not-found",
        };
      }

      if (
        current.status ===
        "sending"
      ) {
        return {
          outcome: "uncertain",
          delivery: current,
        };
      }

      if (
        current.status !==
        "pending"
      ) {
        return {
          outcome: "duplicate",
          delivery: current,
        };
      }

      const claimedRow =
        await database
          .prepare(
            claimDeliverySql,
          )
          .bind(
            tenantId,
            deliveryKey,
            occurredAt,
          )
          .first<DeliveryRow>();

      if (claimedRow === null) {
        const cancelledRow =
          await database
            .prepare(
              cancelObsoleteSql,
            )
            .bind(
              tenantId,
              deliveryKey,
              occurredAt,
            )
            .first<DeliveryRow>();

        if (
          cancelledRow !== null
        ) {
          return {
            outcome:
              "cancelled",
            delivery:
              parseDelivery(
                cancelledRow,
              ),
          };
        }

        const concurrent =
          await find(
            tenantId,
            deliveryKey,
          );

        if (concurrent === null) {
          return {
            outcome:
              "not-found",
          };
        }

        return {
          outcome:
            concurrent.status ===
            "sending"
              ? "uncertain"
              : "duplicate",
          delivery: concurrent,
        };
      }

      const delivery =
        parseDelivery(
          claimedRow,
        );
      const invitationRow =
        await database
          .prepare(
            findPreparedInvitationSql,
          )
          .bind(
            tenantId,
            delivery.invitationKey,
            delivery
              .invitationVersion,
          )
          .first<PreparedInvitationRow>();

      if (invitationRow === null) {
        throw new Error(
          "claimed invitation delivery lost its invitation",
        );
      }

      const prepared =
        parsePrepared(
          invitationRow,
        );

      if (
        await deriveTeamInvitationKey({
          tenantId,
          email:
            prepared.normalizedEmail,
        }) !==
        delivery.invitationKey
      ) {
        throw new Error(
          "claimed invitation identity is invalid",
        );
      }

      return {
        outcome: "claimed",
        prepared: {
          delivery,
          ...prepared,
        },
      };
    },

    markSubmitted(
      tenantId,
      deliveryKey,
      occurredAt,
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
      tenantId,
      deliveryKey,
      errorCode,
      occurredAt,
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
      tenantId,
      deliveryKey,
      errorCode,
      occurredAt,
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
      tenantId,
      deliveryKey,
      occurredAt,
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
      tenantId,
      deliveryKey,
      errorCode,
      occurredAt,
    ) {
      return reconcile(
        tenantId,
        deliveryKey,
        "blocked",
        errorCode,
        occurredAt,
      );
    },
  };
}
