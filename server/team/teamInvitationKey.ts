import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  requireTeamTenantId,
} from "./teamMembershipValidation.ts";
import {
  requireTeamInvitationEmail,
  requireTeamInvitationKey,
  requireTeamInvitationOperationKey,
  requireTeamInvitationRole,
  requireTeamInvitationStatus,
} from "./teamInvitationValidation.ts";
import {
  requireTeamMembershipVersion,
  requireTeamTimestamp,
} from "./teamMembershipValidation.ts";
import type {
  TeamInvitationEventType,
} from "../../shared/domain/teamInvitation.ts";
import {
  requireTeamInvitationActor,
} from "./teamInvitationActor.ts";

async function digestIdentity(
  value: object,
): Promise<string> {
  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify(value),
    ),
  );
}

export async function deriveTeamInvitationKey(
  input: {
    tenantId: unknown;
    email: unknown;
  },
): Promise<string> {
  const tenantId =
    requireTeamTenantId(
      input.tenantId,
    );
  const email =
    requireTeamInvitationEmail(
      input.email,
    );

  return `team_invitation_v1_${await digestIdentity(
    {
      namespace:
        "team_invitation_v1",
      tenantId,
      email,
    },
  )}`;
}

export async function deriveTeamInvitationRequestKey(
  input: {
    tenantId: unknown;
    email: unknown;
  },
): Promise<string> {
  const tenantId =
    requireTeamTenantId(
      input.tenantId,
    );
  const email =
    requireTeamInvitationEmail(
      input.email,
    );
  const digest = await sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "team_invitation_request_v1",
        tenantId,
        email,
      }),
    ),
  );

  return `team_invitation_request_v1_${digest}`;
}

export async function deriveTeamInvitationOperationKey(
  input: {
    operation:
      | "request"
      | "re-request"
      | "revoke"
      | "expire";
    tenantId: unknown;
    invitationKey: unknown;
    expectedVersion: unknown;
    role: unknown;
    fromStatus: unknown;
    actorExternalUserId?: unknown;
    systemActorId?: unknown;
    occurredAt: unknown;
    expiresAt: unknown;
  },
): Promise<string> {
  const expectedVersion =
    input.expectedVersion === 0
      ? 0
      : requireTeamMembershipVersion(
          input.expectedVersion,
        );
  const fromStatus =
    input.fromStatus === null
      ? null
      : requireTeamInvitationStatus(
          input.fromStatus,
        );
  const actor =
    requireTeamInvitationActor({
      actorExternalUserId:
        input.actorExternalUserId,
      systemActorId:
        input.systemActorId,
    });
  const actorIdentity =
    actor.kind === "user"
      ? {
          actorExternalUserId:
            actor.id,
        }
      : {
          actorKind: "system",
          systemActorId:
            actor.id,
        };

  return `team_invitation_operation_v1_${await digestIdentity(
    {
      namespace:
        "team_invitation_operation_v1",
      operation: input.operation,
      tenantId:
        requireTeamTenantId(
          input.tenantId,
        ),
      invitationKey:
        requireTeamInvitationKey(
          input.invitationKey,
        ),
      expectedVersion,
      role:
        requireTeamInvitationRole(
          input.role,
        ),
      fromStatus,
      ...actorIdentity,
      occurredAt:
        requireTeamTimestamp(
          input.occurredAt,
        ),
      expiresAt:
        requireTeamTimestamp(
          input.expiresAt,
        ),
    },
  )}`;
}

export async function deriveTeamInvitationEventKey(
  input: {
    operationKey: unknown;
    invitationKey: unknown;
    eventType: unknown;
  },
): Promise<string> {
  const eventTypes:
    readonly TeamInvitationEventType[] = [
    "requested",
    "re-requested",
    "revoked",
    "expired",
  ];

  if (
    typeof input.eventType !==
      "string" ||
    !eventTypes.some(
      (eventType) =>
        eventType ===
        input.eventType,
    )
  ) {
    throw new Error(
      "team invitation event type is invalid",
    );
  }

  return `team_invitation_event_v1_${await digestIdentity(
    {
      namespace:
        "team_invitation_event_v1",
      operationKey:
        requireTeamInvitationOperationKey(
          input.operationKey,
        ),
      invitationKey:
        requireTeamInvitationKey(
          input.invitationKey,
        ),
      eventType: input.eventType,
    },
  )}`;
}

export async function deriveTeamInvitationDeliveryKey(
  input: {
    tenantId: unknown;
    invitationKey: unknown;
    invitationVersion: unknown;
  },
): Promise<string> {
  return `team_invitation_delivery_v1_${await digestIdentity(
    {
      namespace:
        "team_invitation_delivery_v1",
      tenantId:
        requireTeamTenantId(
          input.tenantId,
        ),
      invitationKey:
        requireTeamInvitationKey(
          input.invitationKey,
        ),
      invitationVersion:
        requireTeamMembershipVersion(
          input.invitationVersion,
        ),
    },
  )}`;
}
