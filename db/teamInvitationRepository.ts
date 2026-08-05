import type {
  UserId,
} from "../shared/domain/model.ts";
import type {
  TeamInvitation,
  TeamInvitationEventType,
  TeamInvitationMutationResult,
  TeamInvitationRole,
  TeamInvitationStatus,
} from "../shared/domain/teamInvitation.ts";
import {
  deriveTeamInvitationEventKey,
  deriveTeamInvitationDeliveryKey,
  deriveTeamInvitationKey,
  deriveTeamInvitationOperationKey,
} from "../server/team/teamInvitationKey.ts";
import {
  requireTeamInvitationEmail,
  requireTeamInvitationEventKey,
  requireTeamInvitationKey,
  requireTeamInvitationOperationKey,
  requireTeamInvitationRole,
  requireTeamInvitationStatus,
} from "../server/team/teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
  requireTeamMembershipVersion,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "../server/team/teamMembershipValidation.ts";
import type {
  D1DatabaseBinding,
  D1PreparedStatement,
  D1Result,
} from "./d1.ts";

const findInvitationSql = `
  SELECT
    invitation_key AS invitationKey,
    tenant_id AS tenantId,
    normalized_email AS normalizedEmail,
    role,
    status,
    version,
    invited_by_external_user_id AS invitedByExternalUserId,
    last_actor_external_user_id AS lastActorExternalUserId,
    requested_at AS requestedAt,
    expires_at AS expiresAt,
    updated_at AS updatedAt
  FROM team_invitations
  WHERE tenant_id = ?1
    AND invitation_key = ?2
  LIMIT 1
`;

const findEventSql = `
  SELECT
    event_key AS eventKey,
    operation_key AS operationKey,
    invitation_key AS invitationKey,
    tenant_id AS tenantId,
    actor_external_user_id AS actorExternalUserId,
    event_type AS eventType,
    from_role AS fromRole,
    to_role AS toRole,
    from_status AS fromStatus,
    to_status AS toStatus,
    from_version AS fromVersion,
    to_version AS toVersion,
    occurred_at AS occurredAt,
    expires_at AS expiresAt
  FROM team_invitation_events
  WHERE operation_key = ?1
  LIMIT 1
`;

const insertInvitationSql = `
  INSERT INTO team_invitations (
    invitation_key,
    tenant_id,
    normalized_email,
    role,
    status,
    version,
    invited_by_external_user_id,
    last_actor_external_user_id,
    requested_at,
    expires_at,
    updated_at
  )
  VALUES (
    ?1, ?2, ?3, ?4, 'pending', 1,
    ?5, ?5, ?6, ?7, ?6
  )
`;

const reopenInvitationSql = `
  UPDATE team_invitations
  SET
    role = ?5,
    status = 'pending',
    version = version + 1,
    last_actor_external_user_id = ?6,
    requested_at = ?7,
    expires_at = ?8,
    updated_at = ?7
  WHERE tenant_id = ?1
    AND invitation_key = ?2
    AND version = ?3
    AND status = ?4
`;

const transitionInvitationSql = `
  UPDATE team_invitations
  SET
    status = ?5,
    version = version + 1,
    last_actor_external_user_id = ?6,
    updated_at = ?7
  WHERE tenant_id = ?1
    AND invitation_key = ?2
    AND version = ?3
    AND status = ?4
`;

const insertEventSql = `
  INSERT INTO team_invitation_events (
    event_key,
    operation_key,
    invitation_key,
    tenant_id,
    actor_external_user_id,
    event_type,
    from_role,
    to_role,
    from_status,
    to_status,
    from_version,
    to_version,
    occurred_at,
    expires_at
  )
  SELECT
    ?1, ?2, ?3, ?4, ?5, ?6,
    ?7, ?8, ?9, ?10, ?11, ?12,
    ?13, ?14
  FROM team_invitations
  WHERE tenant_id = ?4
    AND invitation_key = ?3
    AND role = ?8
    AND status = ?10
    AND version = ?12
    AND last_actor_external_user_id = ?5
    AND updated_at = ?13
    AND expires_at = ?14
`;

const insertDeliverySql = `
  INSERT INTO team_invitation_deliveries (
    delivery_key,
    tenant_id,
    invitation_key,
    invitation_version,
    status,
    attempt_count,
    created_at,
    updated_at
  )
  SELECT
    ?1, ?2, ?3, ?4,
    'pending', 0, ?5, ?5
  FROM team_invitations
  WHERE tenant_id = ?2
    AND invitation_key = ?3
    AND version = ?4
    AND status = 'pending'
    AND requested_at = ?5
`;

const findDeliverySql = `
  SELECT
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
  FROM team_invitation_deliveries
  WHERE delivery_key = ?1
  LIMIT 1
`;

interface InvitationRow {
  invitationKey: unknown;
  tenantId: unknown;
  normalizedEmail: unknown;
  role: unknown;
  status: unknown;
  version: unknown;
  invitedByExternalUserId: unknown;
  lastActorExternalUserId: unknown;
  requestedAt: unknown;
  expiresAt: unknown;
  updatedAt: unknown;
}

interface InvitationEventRow {
  eventKey: unknown;
  operationKey: unknown;
  invitationKey: unknown;
  tenantId: unknown;
  actorExternalUserId: unknown;
  eventType: unknown;
  fromRole: unknown;
  toRole: unknown;
  fromStatus: unknown;
  toStatus: unknown;
  fromVersion: unknown;
  toVersion: unknown;
  occurredAt: unknown;
  expiresAt: unknown;
}

interface InvitationDeliveryRow {
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

interface InvitationEvent {
  eventKey: string;
  operationKey: string;
  invitationKey: string;
  tenantId: number;
  actorExternalUserId: UserId;
  eventType:
    TeamInvitationEventType;
  fromRole:
    TeamInvitationRole | null;
  toRole: TeamInvitationRole;
  fromStatus:
    TeamInvitationStatus | null;
  toStatus:
    TeamInvitationStatus;
  fromVersion: number;
  toVersion: number;
  occurredAt: string;
  expiresAt: string;
}

export interface RequestTeamInvitationCommand {
  tenantId: unknown;
  email: unknown;
  role: unknown;
  expectedVersion: unknown;
  actorExternalUserId: unknown;
  requestedAt: unknown;
  expiresAt: unknown;
}

export interface TransitionTeamInvitationCommand {
  tenantId: unknown;
  invitationKey: unknown;
  expectedVersion: unknown;
  toStatus: unknown;
  actorExternalUserId: unknown;
  occurredAt: unknown;
}

export interface TeamInvitationRepository {
  find(
    tenantId: unknown,
    invitationKey: unknown,
  ): Promise<TeamInvitation | null>;
  request(
    command:
      RequestTeamInvitationCommand,
  ): Promise<TeamInvitationMutationResult>;
  transition(
    command:
      TransitionTeamInvitationCommand,
  ): Promise<TeamInvitationMutationResult>;
}

function requireExpectedVersion(
  value: unknown,
): number {
  return value === 0
    ? 0
    : requireTeamMembershipVersion(
        value,
      );
}

function requireExpiry(
  requestedAt: string,
  expiresAtInput: unknown,
): string {
  const expiresAt =
    requireTeamTimestamp(
      expiresAtInput,
    );

  if (
    Date.parse(expiresAt) <=
      Date.parse(requestedAt)
  ) {
    throw new Error(
      "team invitation expiry is invalid",
    );
  }

  return expiresAt;
}

function parseInvitation(
  row: InvitationRow,
): TeamInvitation {
  const requestedAt =
    requireTeamTimestamp(
      row.requestedAt,
    );
  const expiresAt =
    requireExpiry(
      requestedAt,
      row.expiresAt,
    );
  const updatedAt =
    requireTeamTimestamp(
      row.updatedAt,
    );

  if (
    Date.parse(updatedAt) <
      Date.parse(requestedAt)
  ) {
    throw new Error(
      "D1 returned an invalid invitation timeline",
    );
  }

  return {
    invitationKey:
      requireTeamInvitationKey(
        row.invitationKey,
      ),
    tenantId:
      requireTeamTenantId(
        row.tenantId,
      ),
    normalizedEmail:
      requireTeamInvitationEmail(
        row.normalizedEmail,
      ),
    role:
      requireTeamInvitationRole(
        row.role,
      ),
    status:
      requireTeamInvitationStatus(
        row.status,
      ),
    version:
      requireTeamMembershipVersion(
        row.version,
      ),
    invitedByExternalUserId:
      requireTeamExternalUserId(
        row.invitedByExternalUserId,
      ),
    lastActorExternalUserId:
      requireTeamExternalUserId(
        row.lastActorExternalUserId,
      ),
    requestedAt,
    expiresAt,
    updatedAt,
  };
}

function parseEventType(
  value: unknown,
): TeamInvitationEventType {
  const eventTypes:
    readonly TeamInvitationEventType[] = [
    "requested",
    "re-requested",
    "revoked",
    "expired",
  ];

  if (
    typeof value !== "string" ||
    !eventTypes.some(
      (eventType) =>
        eventType === value,
    )
  ) {
    throw new Error(
      "D1 returned an invalid invitation event type",
    );
  }

  return value as
    TeamInvitationEventType;
}

function parseEvent(
  row: InvitationEventRow,
): InvitationEvent {
  const fromVersion =
    row.fromVersion === 0
      ? 0
      : requireTeamMembershipVersion(
          row.fromVersion,
        );

  return {
    eventKey:
      requireTeamInvitationEventKey(
        row.eventKey,
      ),
    operationKey:
      requireTeamInvitationOperationKey(
        row.operationKey,
      ),
    invitationKey:
      requireTeamInvitationKey(
        row.invitationKey,
      ),
    tenantId:
      requireTeamTenantId(
        row.tenantId,
      ),
    actorExternalUserId:
      requireTeamExternalUserId(
        row.actorExternalUserId,
      ),
    eventType:
      parseEventType(
        row.eventType,
      ),
    fromRole:
      row.fromRole === null
        ? null
        : requireTeamInvitationRole(
            row.fromRole,
          ),
    toRole:
      requireTeamInvitationRole(
        row.toRole,
      ),
    fromStatus:
      row.fromStatus === null
        ? null
        : requireTeamInvitationStatus(
            row.fromStatus,
          ),
    toStatus:
      requireTeamInvitationStatus(
        row.toStatus,
      ),
    fromVersion,
    toVersion:
      requireTeamMembershipVersion(
        row.toVersion,
      ),
    occurredAt:
      requireTeamTimestamp(
        row.occurredAt,
      ),
    expiresAt:
      requireTeamTimestamp(
        row.expiresAt,
      ),
  };
}

function eventsMatch(
  actual: InvitationEvent | null,
  expected: InvitationEvent,
): boolean {
  return (
    actual !== null &&
    Object.keys(expected).every(
      (key) =>
        actual[
          key as keyof InvitationEvent
        ] ===
        expected[
          key as keyof InvitationEvent
        ],
    )
  );
}

function batchesSucceeded(
  results:
    readonly D1Result[],
  expectedLength: number,
): boolean {
  return (
    results.length ===
      expectedLength &&
    results.every(
      (result) =>
        result.success &&
        result.meta?.changes === 1,
    )
  );
}

export function createTeamInvitationRepository(
  database: D1DatabaseBinding,
): TeamInvitationRepository {
  async function find(
    tenantIdInput: unknown,
    invitationKeyInput: unknown,
  ): Promise<TeamInvitation | null> {
    const tenantId =
      requireTeamTenantId(
        tenantIdInput,
      );
    const invitationKey =
      requireTeamInvitationKey(
        invitationKeyInput,
      );
    const row = await database
      .prepare(findInvitationSql)
      .bind(
        tenantId,
        invitationKey,
      )
      .first<InvitationRow>();

    if (row === null) {
      return null;
    }

    const invitation =
      parseInvitation(row);

    if (
      invitation.tenantId !==
        tenantId ||
      invitation.invitationKey !==
        invitationKey ||
      await deriveTeamInvitationKey({
        tenantId,
        email:
          invitation.normalizedEmail,
      }) !== invitationKey
    ) {
      throw new Error(
        "D1 returned invalid invitation scope",
      );
    }

    return invitation;
  }

  async function findEvent(
    operationKey: string,
  ): Promise<InvitationEvent | null> {
    const row = await database
      .prepare(findEventSql)
      .bind(operationKey)
      .first<InvitationEventRow>();

    return row === null
      ? null
      : parseEvent(row);
  }

  async function executeBatch(
    statements:
      readonly D1PreparedStatement[],
  ): Promise<boolean> {
    try {
      return batchesSucceeded(
        await database.batch(
          statements,
        ),
        statements.length,
      );
    } catch {
      return false;
    }
  }

  async function verify(
    tenantId: number,
    invitationKey: string,
    expectedInvitation: {
      role: TeamInvitationRole;
      status:
        TeamInvitationStatus;
      version: number;
      actorExternalUserId:
        UserId;
      occurredAt: string;
      expiresAt: string;
    },
    expectedEvent:
      InvitationEvent,
    expectedDelivery:
      | {
          deliveryKey: string;
          invitationVersion: number;
          createdAt: string;
        }
      | null,
    batchWasSuccessful: boolean,
    successOutcome:
      "created" | "updated",
  ): Promise<TeamInvitationMutationResult> {
    const [
      invitation,
      event,
      delivery,
    ] = await Promise.all([
      find(
        tenantId,
        invitationKey,
      ),
      findEvent(
        expectedEvent.operationKey,
      ),
      expectedDelivery === null
        ? Promise.resolve(null)
        : database
            .prepare(
              findDeliverySql,
            )
            .bind(
              expectedDelivery
                .deliveryKey,
            )
            .first<InvitationDeliveryRow>(),
    ]);
    const deliveryMatches =
      expectedDelivery === null ||
      (
        delivery !== null &&
        delivery.deliveryKey ===
          expectedDelivery
            .deliveryKey &&
        delivery.tenantId ===
          tenantId &&
        delivery.invitationKey ===
          invitationKey &&
        delivery.invitationVersion ===
          expectedDelivery
            .invitationVersion &&
        delivery.status ===
          "pending" &&
        delivery.attemptCount === 0 &&
        delivery.lastErrorCode ===
          null &&
        delivery.submittedAt ===
          null &&
        delivery.createdAt ===
          expectedDelivery
            .createdAt &&
        delivery.updatedAt ===
          expectedDelivery
            .createdAt
      );

    if (
      invitation !== null &&
      invitation.role ===
        expectedInvitation.role &&
      invitation.status ===
        expectedInvitation.status &&
      invitation.version ===
        expectedInvitation.version &&
      invitation.lastActorExternalUserId ===
        expectedInvitation
          .actorExternalUserId &&
      invitation.updatedAt ===
        expectedInvitation
          .occurredAt &&
      invitation.expiresAt ===
        expectedInvitation
          .expiresAt &&
      eventsMatch(
        event,
        expectedEvent,
      ) &&
      deliveryMatches
    ) {
      return {
        outcome:
          batchWasSuccessful
            ? successOutcome
            : "unchanged",
        invitation,
      };
    }

    if (!batchWasSuccessful) {
      throw new Error(
        "team invitation persistence failed",
      );
    }

    return {
      outcome: "conflict",
      invitation,
    };
  }

  return {
    find,

    async request(command) {
      const tenantId =
        requireTeamTenantId(
          command.tenantId,
        );
      const normalizedEmail =
        requireTeamInvitationEmail(
          command.email,
        );
      const role =
        requireTeamInvitationRole(
          command.role,
        );
      const expectedVersion =
        requireExpectedVersion(
          command.expectedVersion,
        );
      const actorExternalUserId =
        requireTeamExternalUserId(
          command.actorExternalUserId,
        );
      const requestedAt =
        requireTeamTimestamp(
          command.requestedAt,
        );
      const expiresAt =
        requireExpiry(
          requestedAt,
          command.expiresAt,
        );
      const invitationKey =
        await deriveTeamInvitationKey({
          tenantId,
          email: normalizedEmail,
        });
      const current =
        await find(
          tenantId,
          invitationKey,
        );
      const eventType =
        expectedVersion === 0
          ? "requested"
          : "re-requested";
      const fromStatus =
        expectedVersion === 0
          ? null
          : current?.status ??
            null;
      const operationKey =
        await deriveTeamInvitationOperationKey(
          {
            operation:
              expectedVersion === 0
                ? "request"
                : "re-request",
            tenantId,
            invitationKey,
            expectedVersion,
            role,
            fromStatus,
            actorExternalUserId,
            occurredAt:
              requestedAt,
            expiresAt,
          },
        );
      const eventKey =
        await deriveTeamInvitationEventKey(
          {
            operationKey,
            invitationKey,
            eventType,
          },
        );
      const deliveryKey =
        await deriveTeamInvitationDeliveryKey(
          {
            tenantId,
            invitationKey,
            invitationVersion:
              expectedVersion + 1,
          },
        );

      if (
        current !== null &&
        current.version ===
          expectedVersion + 1
      ) {
        const existingEvent =
          await findEvent(
            operationKey,
          );

        if (
          existingEvent !== null &&
          existingEvent.eventKey ===
            eventKey
        ) {
          const delivery =
            await database
              .prepare(
                findDeliverySql,
              )
              .bind(deliveryKey)
              .first<InvitationDeliveryRow>();

          if (
            delivery !== null &&
            delivery.deliveryKey ===
              deliveryKey &&
            delivery.tenantId ===
              tenantId &&
            delivery.invitationKey ===
              invitationKey &&
            delivery.invitationVersion ===
              current.version
          ) {
            return {
              outcome: "unchanged",
              invitation: current,
            };
          }

          throw new Error(
            "team invitation outbox is missing",
          );
        }
      }

      if (
        current === null &&
        expectedVersion !== 0
      ) {
        return {
          outcome: "not-found",
          invitation: null,
        };
      }

      if (
        current !== null &&
        current.version !==
          expectedVersion
      ) {
        return {
          outcome: "conflict",
          invitation: current,
        };
      }

      if (
        current !== null &&
        current.status === "pending"
      ) {
        return {
          outcome:
            "invalid-transition",
          invitation: current,
        };
      }

      const toVersion =
        expectedVersion + 1;
      const expectedEvent:
        InvitationEvent = {
        eventKey,
        operationKey,
        invitationKey,
        tenantId,
        actorExternalUserId,
        eventType,
        fromRole:
          current?.role ?? null,
        toRole: role,
        fromStatus,
        toStatus: "pending",
        fromVersion:
          expectedVersion,
        toVersion,
        occurredAt: requestedAt,
        expiresAt,
      };
      const statements =
        current === null
          ? [
              database
                .prepare(
                  insertInvitationSql,
                )
                .bind(
                  invitationKey,
                  tenantId,
                  normalizedEmail,
                  role,
                  actorExternalUserId,
                  requestedAt,
                  expiresAt,
                ),
            ]
          : [
              database
                .prepare(
                  reopenInvitationSql,
                )
                .bind(
                  tenantId,
                  invitationKey,
                  expectedVersion,
                  current.status,
                  role,
                  actorExternalUserId,
                  requestedAt,
                  expiresAt,
                ),
            ];
      const batchWasSuccessful =
        await executeBatch([
          statements[0],
          database
            .prepare(insertEventSql)
            .bind(
              eventKey,
              operationKey,
              invitationKey,
              tenantId,
              actorExternalUserId,
              eventType,
              current?.role ??
                null,
              role,
              fromStatus,
              "pending",
              expectedVersion,
              toVersion,
              requestedAt,
              expiresAt,
            ),
          database
            .prepare(
              insertDeliverySql,
            )
            .bind(
              deliveryKey,
              tenantId,
              invitationKey,
              toVersion,
              requestedAt,
            ),
        ]);

      return verify(
        tenantId,
        invitationKey,
        {
          role,
          status: "pending",
          version: toVersion,
          actorExternalUserId,
          occurredAt: requestedAt,
          expiresAt,
        },
        expectedEvent,
        {
          deliveryKey,
          invitationVersion:
            toVersion,
          createdAt:
            requestedAt,
        },
        batchWasSuccessful,
        current === null
          ? "created"
          : "updated",
      );
    },

    async transition(command) {
      const tenantId =
        requireTeamTenantId(
          command.tenantId,
        );
      const invitationKey =
        requireTeamInvitationKey(
          command.invitationKey,
        );
      const expectedVersion =
        requireTeamMembershipVersion(
          command.expectedVersion,
        );
      const toStatus =
        requireTeamInvitationStatus(
          command.toStatus,
        );

      if (
        toStatus === "pending"
      ) {
        throw new Error(
          "pending requires a new invitation request",
        );
      }

      const actorExternalUserId =
        requireTeamExternalUserId(
          command.actorExternalUserId,
        );
      const occurredAt =
        requireTeamTimestamp(
          command.occurredAt,
        );
      const current =
        await find(
          tenantId,
          invitationKey,
        );

      if (current === null) {
        return {
          outcome: "not-found",
          invitation: null,
        };
      }

      const eventType =
        toStatus === "revoked"
          ? "revoked"
          : "expired";
      const operationKey =
        await deriveTeamInvitationOperationKey(
          {
            operation:
              toStatus === "revoked"
                ? "revoke"
                : "expire",
            tenantId,
            invitationKey,
            expectedVersion,
            role: current.role,
            fromStatus:
              "pending",
            actorExternalUserId,
            occurredAt,
            expiresAt:
              current.expiresAt,
          },
        );
      const eventKey =
        await deriveTeamInvitationEventKey(
          {
            operationKey,
            invitationKey,
            eventType,
          },
        );

      if (
        current.version ===
          expectedVersion + 1 &&
        current.status ===
          toStatus
      ) {
        const existingEvent =
          await findEvent(
            operationKey,
          );

        if (
          existingEvent !== null &&
          existingEvent.eventKey ===
            eventKey
        ) {
          return {
            outcome: "unchanged",
            invitation: current,
          };
        }
      }

      if (
        current.version !==
          expectedVersion
      ) {
        return {
          outcome: "conflict",
          invitation: current,
        };
      }

      if (
        current.status !==
          "pending"
      ) {
        return {
          outcome:
            "invalid-transition",
          invitation: current,
        };
      }

      const toVersion =
        expectedVersion + 1;
      const expectedEvent:
        InvitationEvent = {
        eventKey,
        operationKey,
        invitationKey,
        tenantId,
        actorExternalUserId,
        eventType,
        fromRole:
          current.role,
        toRole: current.role,
        fromStatus: "pending",
        toStatus,
        fromVersion:
          expectedVersion,
        toVersion,
        occurredAt,
        expiresAt:
          current.expiresAt,
      };
      const batchWasSuccessful =
        await executeBatch([
          database
            .prepare(
              transitionInvitationSql,
            )
            .bind(
              tenantId,
              invitationKey,
              expectedVersion,
              "pending",
              toStatus,
              actorExternalUserId,
              occurredAt,
            ),
          database
            .prepare(insertEventSql)
            .bind(
              eventKey,
              operationKey,
              invitationKey,
              tenantId,
              actorExternalUserId,
              eventType,
              current.role,
              current.role,
              "pending",
              toStatus,
              expectedVersion,
              toVersion,
              occurredAt,
              current.expiresAt,
            ),
        ]);

      return verify(
        tenantId,
        invitationKey,
        {
          role: current.role,
          status: toStatus,
          version: toVersion,
          actorExternalUserId,
          occurredAt,
          expiresAt:
            current.expiresAt,
        },
        expectedEvent,
        null,
        batchWasSuccessful,
        "updated",
      );
    },
  };
}
