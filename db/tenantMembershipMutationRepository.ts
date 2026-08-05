import type {
  TenantRole,
  UserId,
} from "../shared/domain/model.ts";
import type {
  TeamMembership,
  TeamMembershipEventType,
  TeamMembershipMutationResult,
  TeamMembershipStatus,
  TeamOwnerTransferResult,
} from "../shared/domain/teamMembership.ts";
import {
  deriveTeamMembershipEventKey,
  deriveTeamMembershipOperationKey,
} from "../server/team/teamMembershipKey.ts";
import {
  requireFormerOwnerRole,
  requireTeamExternalUserId,
  requireTeamMembershipStatus,
  requireTeamMembershipVersion,
  requireTeamRole,
  requireTeamTenantId,
  requireTeamTimestamp,
} from "../server/team/teamMembershipValidation.ts";
import type {
  D1DatabaseBinding,
  D1PreparedStatement,
  D1Result,
} from "./d1.ts";

const listLimit = 100;

const listMembershipsSql = `
  SELECT
    tenant_id AS tenantId,
    external_user_id AS externalUserId,
    role,
    status,
    version
  FROM tenant_memberships
  WHERE tenant_id = ?1
  ORDER BY id ASC
  LIMIT 101
`;

const findEventSql = `
  SELECT
    event_key AS eventKey,
    operation_key AS operationKey,
    tenant_id AS tenantId,
    target_external_user_id AS targetExternalUserId,
    actor_external_user_id AS actorExternalUserId,
    event_type AS eventType,
    from_role AS fromRole,
    to_role AS toRole,
    from_status AS fromStatus,
    to_status AS toStatus,
    from_version AS fromVersion,
    to_version AS toVersion,
    occurred_at AS occurredAt
  FROM tenant_membership_events
  WHERE operation_key = ?1
    AND target_external_user_id = ?2
  LIMIT 1
`;

const changeRoleSql = `
  UPDATE tenant_memberships
  SET
    role = ?6,
    version = version + 1,
    updated_at = ?7
  WHERE tenant_id = ?1
    AND external_user_id = ?2
    AND version = ?3
    AND role = ?4
    AND status = ?5
`;

const changeStatusSql = `
  UPDATE tenant_memberships
  SET
    status = ?6,
    version = version + 1,
    updated_at = ?7
  WHERE tenant_id = ?1
    AND external_user_id = ?2
    AND version = ?3
    AND role = ?4
    AND status = ?5
`;

const insertEventSql = `
  INSERT INTO tenant_membership_events (
    event_key,
    operation_key,
    tenant_id,
    target_external_user_id,
    actor_external_user_id,
    event_type,
    from_role,
    to_role,
    from_status,
    to_status,
    from_version,
    to_version,
    occurred_at
  )
  SELECT
    ?1, ?2, ?3, ?4, ?5, ?6,
    ?7, ?8, ?9, ?10,
    ?11, ?11 + 1, ?12
  FROM tenant_memberships
  WHERE tenant_id = ?3
    AND external_user_id = ?4
    AND role = ?8
    AND status = ?10
    AND version = ?11 + 1
`;

interface MembershipRow {
  tenantId: unknown;
  externalUserId: unknown;
  role: unknown;
  status: unknown;
  version: unknown;
}

interface MembershipEventRow {
  eventKey: unknown;
  operationKey: unknown;
  tenantId: unknown;
  targetExternalUserId: unknown;
  actorExternalUserId: unknown;
  eventType: unknown;
  fromRole: unknown;
  toRole: unknown;
  fromStatus: unknown;
  toStatus: unknown;
  fromVersion: unknown;
  toVersion: unknown;
  occurredAt: unknown;
}

interface MembershipEvent {
  eventKey: string;
  operationKey: string;
  tenantId: number;
  targetExternalUserId: UserId;
  actorExternalUserId: UserId;
  eventType:
    TeamMembershipEventType;
  fromRole: TenantRole;
  toRole: TenantRole;
  fromStatus:
    TeamMembershipStatus;
  toStatus:
    TeamMembershipStatus;
  fromVersion: number;
  toVersion: number;
  occurredAt: string;
}

type ExpectedEvent = Omit<
  MembershipEvent,
  "occurredAt"
>;

export interface ChangeTeamMemberRoleCommand {
  tenantId: unknown;
  targetExternalUserId: unknown;
  expectedVersion: unknown;
  toRole: unknown;
  actorExternalUserId: unknown;
  occurredAt: unknown;
}

export interface ChangeTeamMemberStatusCommand {
  tenantId: unknown;
  targetExternalUserId: unknown;
  expectedVersion: unknown;
  toStatus: unknown;
  actorExternalUserId: unknown;
  occurredAt: unknown;
}

export interface TransferTeamOwnershipCommand {
  tenantId: unknown;
  formerOwnerExternalUserId:
    unknown;
  formerOwnerExpectedVersion:
    unknown;
  newOwnerExternalUserId:
    unknown;
  newOwnerExpectedVersion:
    unknown;
  formerOwnerRole: unknown;
  actorExternalUserId: unknown;
  occurredAt: unknown;
}

export interface TenantMembershipMutationRepository {
  listByTenantId(
    tenantId: unknown,
  ): Promise<readonly TeamMembership[]>;
  changeRole(
    command:
      ChangeTeamMemberRoleCommand,
  ): Promise<TeamMembershipMutationResult>;
  changeStatus(
    command:
      ChangeTeamMemberStatusCommand,
  ): Promise<TeamMembershipMutationResult>;
  transferOwner(
    command:
      TransferTeamOwnershipCommand,
  ): Promise<TeamOwnerTransferResult>;
}

function parseMembership(
  row: MembershipRow,
): TeamMembership {
  return {
    tenantId:
      requireTeamTenantId(
        row.tenantId,
      ),
    externalUserId:
      requireTeamExternalUserId(
        row.externalUserId,
      ),
    role:
      requireTeamRole(row.role),
    status:
      requireTeamMembershipStatus(
        row.status,
      ),
    version:
      requireTeamMembershipVersion(
        row.version,
      ),
  };
}

function parseEventType(
  value: unknown,
): TeamMembershipEventType {
  const eventTypes:
    readonly TeamMembershipEventType[] = [
    "role-changed",
    "suspended",
    "reactivated",
    "owner-transfer-out",
    "owner-transfer-in",
  ];

  if (
    typeof value !== "string" ||
    !eventTypes.some(
      (eventType) =>
        eventType === value,
    )
  ) {
    throw new Error(
      "D1 returned an invalid team membership event type",
    );
  }

  return value as
    TeamMembershipEventType;
}

function parseEvent(
  row: MembershipEventRow,
): MembershipEvent {
  if (
    typeof row.eventKey !==
      "string" ||
    !/^tenant_membership_event_v1_[0-9a-f]{64}$/.test(
      row.eventKey,
    ) ||
    typeof row.operationKey !==
      "string" ||
    !/^tenant_membership_operation_v1_[0-9a-f]{64}$/.test(
      row.operationKey,
    )
  ) {
    throw new Error(
      "D1 returned an invalid team membership event identity",
    );
  }

  return {
    eventKey: row.eventKey,
    operationKey: row.operationKey,
    tenantId:
      requireTeamTenantId(
        row.tenantId,
      ),
    targetExternalUserId:
      requireTeamExternalUserId(
        row.targetExternalUserId,
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
      requireTeamRole(
        row.fromRole,
      ),
    toRole:
      requireTeamRole(row.toRole),
    fromStatus:
      requireTeamMembershipStatus(
        row.fromStatus,
      ),
    toStatus:
      requireTeamMembershipStatus(
        row.toStatus,
      ),
    fromVersion:
      requireTeamMembershipVersion(
        row.fromVersion,
      ),
    toVersion:
      requireTeamMembershipVersion(
        row.toVersion,
      ),
    occurredAt:
      requireTeamTimestamp(
        row.occurredAt,
      ),
  };
}

function eventMatches(
  event: MembershipEvent | null,
  expected: ExpectedEvent,
): boolean {
  return (
    event !== null &&
    event.eventKey ===
      expected.eventKey &&
    event.operationKey ===
      expected.operationKey &&
    event.tenantId ===
      expected.tenantId &&
    event.targetExternalUserId ===
      expected.targetExternalUserId &&
    event.actorExternalUserId ===
      expected.actorExternalUserId &&
    event.eventType ===
      expected.eventType &&
    event.fromRole ===
      expected.fromRole &&
    event.toRole === expected.toRole &&
    event.fromStatus ===
      expected.fromStatus &&
    event.toStatus ===
      expected.toStatus &&
    event.fromVersion ===
      expected.fromVersion &&
    event.toVersion ===
      expected.toVersion
  );
}

function eventIntentMatches(
  event: MembershipEvent | null,
  expected: {
    eventKey: string;
    operationKey: string;
    tenantId: number;
    targetExternalUserId: UserId;
    actorExternalUserId: UserId;
    eventType:
      TeamMembershipEventType;
    toRole: TenantRole;
    toStatus:
      TeamMembershipStatus;
    fromVersion: number;
  },
): boolean {
  return (
    event !== null &&
    event.eventKey ===
      expected.eventKey &&
    event.operationKey ===
      expected.operationKey &&
    event.tenantId ===
      expected.tenantId &&
    event.targetExternalUserId ===
      expected.targetExternalUserId &&
    event.actorExternalUserId ===
      expected.actorExternalUserId &&
    event.eventType ===
      expected.eventType &&
    event.toRole === expected.toRole &&
    event.toStatus ===
      expected.toStatus &&
    event.fromVersion ===
      expected.fromVersion &&
    event.toVersion ===
      expected.fromVersion + 1
  );
}

function batchSucceeded(
  results:
    readonly D1Result[],
): boolean {
  return results.every(
    (result) => result.success,
  );
}

export function createTenantMembershipMutationRepository(
  database: D1DatabaseBinding,
): TenantMembershipMutationRepository {
  async function listByTenantId(
    tenantIdInput: unknown,
  ): Promise<readonly TeamMembership[]> {
    const tenantId =
      requireTeamTenantId(
        tenantIdInput,
      );
    const result = await database
      .prepare(listMembershipsSql)
      .bind(tenantId)
      .all<MembershipRow>();

    if (!result.success) {
      throw new Error(
        "team membership persistence failed",
      );
    }

    const rows = result.results ?? [];

    if (rows.length > listLimit) {
      throw new Error(
        "team membership list exceeds the safe limit",
      );
    }

    const memberships =
      rows.map(parseMembership);

    if (
      memberships.some(
        (membership) =>
          membership.tenantId !==
          tenantId,
      ) ||
      new Set(
        memberships.map(
          (membership) =>
            membership.externalUserId,
        ),
      ).size !== memberships.length
    ) {
      throw new Error(
        "D1 returned invalid team membership scope",
      );
    }

    return memberships;
  }

  async function findMember(
    tenantId: number,
    externalUserId: UserId,
  ): Promise<TeamMembership | null> {
    return (
      (
        await listByTenantId(
          tenantId,
        )
      ).find(
        (membership) =>
          membership.externalUserId ===
          externalUserId,
      ) ?? null
    );
  }

  async function findEvent(
    operationKey: string,
    targetExternalUserId: UserId,
  ): Promise<MembershipEvent | null> {
    const row = await database
      .prepare(findEventSql)
      .bind(
        operationKey,
        targetExternalUserId,
      )
      .first<MembershipEventRow>();

    return row === null
      ? null
      : parseEvent(row);
  }

  async function executeBatch(
    statements:
      readonly D1PreparedStatement[],
  ): Promise<boolean> {
    try {
      return batchSucceeded(
        await database.batch(
          statements,
        ),
      );
    } catch {
      return false;
    }
  }

  async function verifySingleResult(
    tenantId: number,
    targetExternalUserId:
      UserId,
    expectedVersion: number,
    expectedRole: TenantRole,
    expectedStatus:
      TeamMembershipStatus,
    expectedEvent:
      ExpectedEvent,
    batchWasSuccessful: boolean,
  ): Promise<TeamMembershipMutationResult> {
    const [
      membership,
      event,
    ] = await Promise.all([
      findMember(
        tenantId,
        targetExternalUserId,
      ),
      findEvent(
        expectedEvent.operationKey,
        targetExternalUserId,
      ),
    ]);

    if (
      membership !== null &&
      membership.version ===
        expectedVersion + 1 &&
      membership.role ===
        expectedRole &&
      membership.status ===
        expectedStatus &&
      eventMatches(
        event,
        expectedEvent,
      )
    ) {
      return {
        outcome:
          batchWasSuccessful
            ? "updated"
            : "unchanged",
        membership,
      };
    }

    if (!batchWasSuccessful) {
      throw new Error(
        "team membership persistence failed",
      );
    }

    return {
      outcome: "conflict",
      membership,
    };
  }

  return {
    listByTenantId,

    async changeRole(command) {
      const tenantId =
        requireTeamTenantId(
          command.tenantId,
        );
      const targetExternalUserId =
        requireTeamExternalUserId(
          command.targetExternalUserId,
        );
      const expectedVersion =
        requireTeamMembershipVersion(
          command.expectedVersion,
        );
      const toRole =
        requireTeamRole(
          command.toRole,
        );
      const actorExternalUserId =
        requireTeamExternalUserId(
          command.actorExternalUserId,
        );
      const occurredAt =
        requireTeamTimestamp(
          command.occurredAt,
        );
      const current =
        await findMember(
          tenantId,
          targetExternalUserId,
        );

      if (current === null) {
        return {
          outcome: "not-found",
          membership: null,
        };
      }

      const operationKey =
        await deriveTeamMembershipOperationKey(
          {
            operation: "change-role",
            tenantId,
            targetExternalUserId,
            expectedVersion,
            toRole,
            actorExternalUserId,
          },
        );
      const eventKey =
        await deriveTeamMembershipEventKey(
          {
            operationKey,
            targetExternalUserId,
            eventType:
              "role-changed",
          },
        );

      if (
        current.version ===
          expectedVersion + 1 &&
        current.role === toRole &&
        eventIntentMatches(
          await findEvent(
            operationKey,
            targetExternalUserId,
          ),
          {
            eventKey,
            operationKey,
            tenantId,
            targetExternalUserId,
            actorExternalUserId,
            eventType:
              "role-changed",
            toRole,
            toStatus:
              current.status,
            fromVersion:
              expectedVersion,
          },
        )
      ) {
        return {
          outcome: "unchanged",
          membership: current,
        };
      }

      if (
        current.version ===
          expectedVersion &&
        current.role === toRole
      ) {
        return {
          outcome: "unchanged",
          membership: current,
        };
      }

      if (
        current.version !==
          expectedVersion
      ) {
        return {
          outcome: "conflict",
          membership: current,
        };
      }

      if (
        current.role === "owner" ||
        toRole === "owner"
      ) {
        return {
          outcome:
            "invalid-transition",
          membership: current,
        };
      }

      const expectedEvent:
        ExpectedEvent = {
        eventKey,
        operationKey,
        tenantId,
        targetExternalUserId,
        actorExternalUserId,
        eventType: "role-changed",
        fromRole: current.role,
        toRole,
        fromStatus: current.status,
        toStatus: current.status,
        fromVersion:
          expectedVersion,
        toVersion:
          expectedVersion + 1,
      };
      const batchWasSuccessful =
        await executeBatch([
          database
            .prepare(changeRoleSql)
            .bind(
              tenantId,
              targetExternalUserId,
              expectedVersion,
              current.role,
              current.status,
              toRole,
              occurredAt,
            ),
          database
            .prepare(insertEventSql)
            .bind(
              eventKey,
              operationKey,
              tenantId,
              targetExternalUserId,
              actorExternalUserId,
              "role-changed",
              current.role,
              toRole,
              current.status,
              current.status,
              expectedVersion,
              occurredAt,
            ),
        ]);

      return verifySingleResult(
        tenantId,
        targetExternalUserId,
        expectedVersion,
        toRole,
        current.status,
        expectedEvent,
        batchWasSuccessful,
      );
    },

    async changeStatus(command) {
      const tenantId =
        requireTeamTenantId(
          command.tenantId,
        );
      const targetExternalUserId =
        requireTeamExternalUserId(
          command.targetExternalUserId,
        );
      const expectedVersion =
        requireTeamMembershipVersion(
          command.expectedVersion,
        );
      const toStatus =
        requireTeamMembershipStatus(
          command.toStatus,
        );
      const actorExternalUserId =
        requireTeamExternalUserId(
          command.actorExternalUserId,
        );
      const occurredAt =
        requireTeamTimestamp(
          command.occurredAt,
        );
      const current =
        await findMember(
          tenantId,
          targetExternalUserId,
        );

      if (current === null) {
        return {
          outcome: "not-found",
          membership: null,
        };
      }

      const eventType:
        TeamMembershipEventType =
        toStatus === "suspended"
          ? "suspended"
          : "reactivated";
      const operationKey =
        await deriveTeamMembershipOperationKey(
          {
            operation:
              "change-status",
            tenantId,
            targetExternalUserId,
            expectedVersion,
            toStatus,
            actorExternalUserId,
          },
        );
      const eventKey =
        await deriveTeamMembershipEventKey(
          {
            operationKey,
            targetExternalUserId,
            eventType,
          },
        );

      if (
        current.version ===
          expectedVersion + 1 &&
        current.status === toStatus &&
        eventIntentMatches(
          await findEvent(
            operationKey,
            targetExternalUserId,
          ),
          {
            eventKey,
            operationKey,
            tenantId,
            targetExternalUserId,
            actorExternalUserId,
            eventType,
            toRole: current.role,
            toStatus,
            fromVersion:
              expectedVersion,
          },
        )
      ) {
        return {
          outcome: "unchanged",
          membership: current,
        };
      }

      if (
        current.version ===
          expectedVersion &&
        current.status === toStatus
      ) {
        return {
          outcome: "unchanged",
          membership: current,
        };
      }

      if (
        current.version !==
          expectedVersion
      ) {
        return {
          outcome: "conflict",
          membership: current,
        };
      }

      const expectedEvent:
        ExpectedEvent = {
        eventKey,
        operationKey,
        tenantId,
        targetExternalUserId,
        actorExternalUserId,
        eventType,
        fromRole: current.role,
        toRole: current.role,
        fromStatus:
          current.status,
        toStatus,
        fromVersion:
          expectedVersion,
        toVersion:
          expectedVersion + 1,
      };
      const batchWasSuccessful =
        await executeBatch([
          database
            .prepare(changeStatusSql)
            .bind(
              tenantId,
              targetExternalUserId,
              expectedVersion,
              current.role,
              current.status,
              toStatus,
              occurredAt,
            ),
          database
            .prepare(insertEventSql)
            .bind(
              eventKey,
              operationKey,
              tenantId,
              targetExternalUserId,
              actorExternalUserId,
              eventType,
              current.role,
              current.role,
              current.status,
              toStatus,
              expectedVersion,
              occurredAt,
            ),
        ]);

      return verifySingleResult(
        tenantId,
        targetExternalUserId,
        expectedVersion,
        current.role,
        toStatus,
        expectedEvent,
        batchWasSuccessful,
      );
    },

    async transferOwner(command) {
      const tenantId =
        requireTeamTenantId(
          command.tenantId,
        );
      const formerOwnerExternalUserId =
        requireTeamExternalUserId(
          command
            .formerOwnerExternalUserId,
        );
      const formerOwnerExpectedVersion =
        requireTeamMembershipVersion(
          command
            .formerOwnerExpectedVersion,
        );
      const newOwnerExternalUserId =
        requireTeamExternalUserId(
          command.newOwnerExternalUserId,
        );
      const newOwnerExpectedVersion =
        requireTeamMembershipVersion(
          command
            .newOwnerExpectedVersion,
        );
      const formerOwnerRole =
        requireFormerOwnerRole(
          command.formerOwnerRole,
        );
      const actorExternalUserId =
        requireTeamExternalUserId(
          command.actorExternalUserId,
        );
      const occurredAt =
        requireTeamTimestamp(
          command.occurredAt,
        );

      if (
        formerOwnerExternalUserId ===
        newOwnerExternalUserId
      ) {
        return {
          outcome:
            "invalid-transition",
          formerOwner: null,
          newOwner: null,
        };
      }

      const memberships =
        await listByTenantId(
          tenantId,
        );
      const formerOwner =
        memberships.find(
          (membership) =>
            membership.externalUserId ===
            formerOwnerExternalUserId,
        ) ?? null;
      const newOwner =
        memberships.find(
          (membership) =>
            membership.externalUserId ===
            newOwnerExternalUserId,
        ) ?? null;

      if (
        formerOwner === null ||
        newOwner === null
      ) {
        return {
          outcome: "not-found",
          formerOwner,
          newOwner,
        };
      }

      const operationKey =
        await deriveTeamMembershipOperationKey(
          {
            operation:
              "transfer-owner",
            tenantId,
            formerOwnerExternalUserId,
            formerOwnerExpectedVersion,
            newOwnerExternalUserId,
            newOwnerExpectedVersion,
            formerOwnerRole,
            actorExternalUserId,
          },
        );
      const newOwnerEventKey =
        await deriveTeamMembershipEventKey(
          {
            operationKey,
            targetExternalUserId:
              newOwnerExternalUserId,
            eventType:
              "owner-transfer-in",
          },
        );
      const formerOwnerEventKey =
        await deriveTeamMembershipEventKey(
          {
            operationKey,
            targetExternalUserId:
              formerOwnerExternalUserId,
            eventType:
              "owner-transfer-out",
          },
        );

      if (
        formerOwner.version ===
          formerOwnerExpectedVersion + 1 &&
        formerOwner.role ===
          formerOwnerRole &&
        formerOwner.status === "active" &&
        newOwner.version ===
          newOwnerExpectedVersion + 1 &&
        newOwner.role === "owner" &&
        newOwner.status === "active" &&
        eventIntentMatches(
          await findEvent(
            operationKey,
            formerOwnerExternalUserId,
          ),
          {
            eventKey:
              formerOwnerEventKey,
            operationKey,
            tenantId,
            targetExternalUserId:
              formerOwnerExternalUserId,
            actorExternalUserId,
            eventType:
              "owner-transfer-out",
            toRole: formerOwnerRole,
            toStatus: "active",
            fromVersion:
              formerOwnerExpectedVersion,
          },
        ) &&
        eventIntentMatches(
          await findEvent(
            operationKey,
            newOwnerExternalUserId,
          ),
          {
            eventKey:
              newOwnerEventKey,
            operationKey,
            tenantId,
            targetExternalUserId:
              newOwnerExternalUserId,
            actorExternalUserId,
            eventType:
              "owner-transfer-in",
            toRole: "owner",
            toStatus: "active",
            fromVersion:
              newOwnerExpectedVersion,
          },
        )
      ) {
        return {
          outcome: "unchanged",
          formerOwner,
          newOwner,
        };
      }

      if (
        formerOwner.version !==
          formerOwnerExpectedVersion ||
        newOwner.version !==
          newOwnerExpectedVersion
      ) {
        return {
          outcome: "conflict",
          formerOwner,
          newOwner,
        };
      }

      if (
        formerOwner.role !==
          "owner" ||
        formerOwner.status !==
          "active" ||
        newOwner.role === "owner" ||
        newOwner.status !== "active"
      ) {
        return {
          outcome:
            "invalid-transition",
          formerOwner,
          newOwner,
        };
      }

      const newOwnerFromRole =
        requireFormerOwnerRole(
          newOwner.role,
        );
      const newOwnerExpectedEvent:
        ExpectedEvent = {
        eventKey: newOwnerEventKey,
        operationKey,
        tenantId,
        targetExternalUserId:
          newOwnerExternalUserId,
        actorExternalUserId,
        eventType:
          "owner-transfer-in",
        fromRole:
          newOwnerFromRole,
        toRole: "owner",
        fromStatus: "active",
        toStatus: "active",
        fromVersion:
          newOwnerExpectedVersion,
        toVersion:
          newOwnerExpectedVersion + 1,
      };
      const formerOwnerExpectedEvent:
        ExpectedEvent = {
        eventKey:
          formerOwnerEventKey,
        operationKey,
        tenantId,
        targetExternalUserId:
          formerOwnerExternalUserId,
        actorExternalUserId,
        eventType:
          "owner-transfer-out",
        fromRole: "owner",
        toRole: formerOwnerRole,
        fromStatus: "active",
        toStatus: "active",
        fromVersion:
          formerOwnerExpectedVersion,
        toVersion:
          formerOwnerExpectedVersion + 1,
      };
      const batchWasSuccessful =
        await executeBatch([
          database
            .prepare(changeRoleSql)
            .bind(
              tenantId,
              newOwnerExternalUserId,
              newOwnerExpectedVersion,
              newOwnerFromRole,
              "active",
              "owner",
              occurredAt,
            ),
          database
            .prepare(insertEventSql)
            .bind(
              newOwnerEventKey,
              operationKey,
              tenantId,
              newOwnerExternalUserId,
              actorExternalUserId,
              "owner-transfer-in",
              newOwnerFromRole,
              "owner",
              "active",
              "active",
              newOwnerExpectedVersion,
              occurredAt,
            ),
          database
            .prepare(changeRoleSql)
            .bind(
              tenantId,
              formerOwnerExternalUserId,
              formerOwnerExpectedVersion,
              "owner",
              "active",
              formerOwnerRole,
              occurredAt,
            ),
          database
            .prepare(insertEventSql)
            .bind(
              formerOwnerEventKey,
              operationKey,
              tenantId,
              formerOwnerExternalUserId,
              actorExternalUserId,
              "owner-transfer-out",
              "owner",
              formerOwnerRole,
              "active",
              "active",
              formerOwnerExpectedVersion,
              occurredAt,
            ),
        ]);
      const [
        savedFormerOwner,
        savedNewOwner,
        savedFormerOwnerEvent,
        savedNewOwnerEvent,
      ] = await Promise.all([
        findMember(
          tenantId,
          formerOwnerExternalUserId,
        ),
        findMember(
          tenantId,
          newOwnerExternalUserId,
        ),
        findEvent(
          operationKey,
          formerOwnerExternalUserId,
        ),
        findEvent(
          operationKey,
          newOwnerExternalUserId,
        ),
      ]);

      if (
        savedFormerOwner !== null &&
        savedNewOwner !== null &&
        savedFormerOwner.role ===
          formerOwnerRole &&
        savedFormerOwner.status ===
          "active" &&
        savedFormerOwner.version ===
          formerOwnerExpectedVersion + 1 &&
        savedNewOwner.role ===
          "owner" &&
        savedNewOwner.status ===
          "active" &&
        savedNewOwner.version ===
          newOwnerExpectedVersion + 1 &&
        eventMatches(
          savedFormerOwnerEvent,
          formerOwnerExpectedEvent,
        ) &&
        eventMatches(
          savedNewOwnerEvent,
          newOwnerExpectedEvent,
        )
      ) {
        return {
          outcome:
            batchWasSuccessful
              ? "updated"
              : "unchanged",
          formerOwner:
            savedFormerOwner,
          newOwner: savedNewOwner,
        };
      }

      if (!batchWasSuccessful) {
        throw new Error(
          "team membership persistence failed",
        );
      }

      return {
        outcome: "conflict",
        formerOwner:
          savedFormerOwner,
        newOwner: savedNewOwner,
      };
    },
  };
}
