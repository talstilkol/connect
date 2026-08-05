import type {
  TenantRole,
} from "../../shared/domain/model.ts";
import type {
  TeamMembershipEventType,
  TeamMembershipStatus,
} from "../../shared/domain/teamMembership.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  requireFormerOwnerRole,
  requireTeamExternalUserId,
  requireTeamMembershipStatus,
  requireTeamMembershipVersion,
  requireTeamRole,
  requireTeamTenantId,
} from "./teamMembershipValidation.ts";

type OperationIdentity =
  | {
      operation: "change-role";
      tenantId: unknown;
      targetExternalUserId: unknown;
      expectedVersion: unknown;
      toRole: unknown;
      actorExternalUserId: unknown;
    }
  | {
      operation: "change-status";
      tenantId: unknown;
      targetExternalUserId: unknown;
      expectedVersion: unknown;
      toStatus: unknown;
      actorExternalUserId: unknown;
    }
  | {
      operation: "transfer-owner";
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
    };

interface EventIdentity {
  operationKey: string;
  targetExternalUserId: unknown;
  eventType:
    TeamMembershipEventType;
}

async function digestIdentity(
  value: object,
): Promise<string> {
  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify(value),
    ),
  );
}

export async function deriveTeamMembershipOperationKey(
  identity: OperationIdentity,
): Promise<string> {
  const tenantId =
    requireTeamTenantId(
      identity.tenantId,
    );
  const actorExternalUserId =
    requireTeamExternalUserId(
      identity.actorExternalUserId,
    );
  let normalized:
    Record<string, unknown>;

  switch (identity.operation) {
    case "change-role":
      normalized = {
        operation: identity.operation,
        tenantId,
        targetExternalUserId:
          requireTeamExternalUserId(
            identity.targetExternalUserId,
          ),
        expectedVersion:
          requireTeamMembershipVersion(
            identity.expectedVersion,
          ),
        toRole:
          requireTeamRole(
            identity.toRole,
          ),
        actorExternalUserId,
      };
      break;
    case "change-status":
      normalized = {
        operation: identity.operation,
        tenantId,
        targetExternalUserId:
          requireTeamExternalUserId(
            identity.targetExternalUserId,
          ),
        expectedVersion:
          requireTeamMembershipVersion(
            identity.expectedVersion,
          ),
        toStatus:
          requireTeamMembershipStatus(
            identity.toStatus,
          ),
        actorExternalUserId,
      };
      break;
    case "transfer-owner":
      normalized = {
        operation: identity.operation,
        tenantId,
        formerOwnerExternalUserId:
          requireTeamExternalUserId(
            identity.formerOwnerExternalUserId,
          ),
        formerOwnerExpectedVersion:
          requireTeamMembershipVersion(
            identity.formerOwnerExpectedVersion,
          ),
        newOwnerExternalUserId:
          requireTeamExternalUserId(
            identity.newOwnerExternalUserId,
          ),
        newOwnerExpectedVersion:
          requireTeamMembershipVersion(
            identity.newOwnerExpectedVersion,
          ),
        formerOwnerRole:
          requireFormerOwnerRole(
            identity.formerOwnerRole,
          ),
        actorExternalUserId,
      };
      break;
  }

  return `tenant_membership_operation_v1_${await digestIdentity(
    {
      namespace:
        "tenant_membership_operation_v1",
      ...normalized,
    },
  )}`;
}

export async function deriveTeamMembershipEventKey(
  identity: EventIdentity,
): Promise<string> {
  if (
    !/^tenant_membership_operation_v1_[0-9a-f]{64}$/.test(
      identity.operationKey,
    )
  ) {
    throw new Error(
      "team membership operation key is invalid",
    );
  }

  const targetExternalUserId =
    requireTeamExternalUserId(
      identity.targetExternalUserId,
    );
  const eventTypes:
    readonly TeamMembershipEventType[] = [
    "role-changed",
    "suspended",
    "reactivated",
    "owner-transfer-out",
    "owner-transfer-in",
  ];

  if (
    !eventTypes.some(
      (eventType) =>
        eventType ===
        identity.eventType,
    )
  ) {
    throw new Error(
      "team membership event type is invalid",
    );
  }

  return `tenant_membership_event_v1_${await digestIdentity(
    {
      namespace:
        "tenant_membership_event_v1",
      operationKey:
        identity.operationKey,
      targetExternalUserId,
      eventType:
        identity.eventType,
    },
  )}`;
}

export type FormerOwnerRole =
  Exclude<TenantRole, "owner">;
export type MembershipStatus =
  TeamMembershipStatus;
