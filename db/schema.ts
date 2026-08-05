import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const tenantStatuses = [
  "trial",
  "active",
  "payment_failed",
  "suspended",
  "cancelled",
  "expired",
  "blocked",
] as const;
export const tenantSubscriptionEventTypes = [
  "created",
  "extended",
  "status-changed",
  "cancelled",
] as const;
export const productionDecisionEventTypes = [
  "recorded",
] as const;

export const tenantRoles = [
  "owner",
  "manager",
  "agent",
  "viewer",
] as const;

export const membershipStatuses = ["active", "suspended"] as const;
export const tenantMembershipEventTypes = [
  "role-changed",
  "suspended",
  "reactivated",
  "owner-transfer-out",
  "owner-transfer-in",
] as const;
export const teamInvitationStatuses = [
  "pending",
  "revoked",
  "expired",
] as const;
export const teamInvitationEventTypes = [
  "requested",
  "re-requested",
  "revoked",
  "expired",
] as const;
export const teamInvitationActorKinds = [
  "user",
  "system",
] as const;
export const teamInvitationDeliveryStatuses = [
  "pending",
  "sending",
  "submitted",
  "blocked",
  "ambiguous",
  "cancelled",
] as const;
export const interfaceLanguages = ["he", "en", "ar"] as const;
export const mailingStatuses = ["subscribed", "unsubscribed"] as const;
export const consentStatuses = ["unknown", "granted", "withdrawn"] as const;
export const consentEventTypes = ["granted", "unsubscribed"] as const;
export const contactImportJobStatuses = [
  "processing",
  "completed",
] as const;
export const contactImportRowStatuses = [
  "created",
  "updated",
  "unchanged",
  "rejected",
  "duplicate",
] as const;
export const contactImportRowReasons = [
  "missing_phone",
  "invalid_phone",
  "duplicate_in_file",
] as const;
export const metaConnectionStatuses = [
  "pending",
  "connected",
  "verification_required",
  "revoked",
  "error",
  "restricted",
] as const;
export const metaWebhookReceiptStatuses = [
  "processing",
  "processed",
  "failed",
] as const;
export const messageTemplateStatuses = [
  "draft",
  "submitting",
  "pending_review",
  "approved",
  "rejected",
  "disabled",
  "deleted",
] as const;
export const messageTemplateCategories = [
  "MARKETING",
  "UTILITY",
] as const;
export const messageTemplateLanguages = [
  "he",
  "en_US",
  "ar",
] as const;
export const campaignStatuses = [
  "draft",
  "scheduled",
  "running",
  "paused",
  "completed",
  "cancelled",
  "failed",
] as const;
export const campaignDeliveryModes = [
  "immediate",
  "scheduled",
] as const;
export const campaignRecipientStatuses = [
  "pending",
  "queued",
  "sending",
  "accepted",
  "delivered",
  "read",
  "failed",
  "skipped",
  "cancelled",
] as const;
export const conversationStatuses = [
  "new",
  "bot_active",
  "waiting_for_agent",
  "agent_active",
  "waiting_for_contact",
  "closed",
] as const;
export const messageDirections = [
  "inbound",
  "outbound",
] as const;
export const messageContentKinds = [
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contacts",
  "interactive",
  "unsupported",
] as const;
export const messageStatuses = [
  "received",
  "sent",
  "delivered",
  "read",
  "failed",
] as const;
export const botFlowStatuses = [
  "draft",
  "active",
  "inactive",
] as const;
export const botFlowVersionStatuses = [
  "draft",
  "published",
  "archived",
] as const;
export const botReplyDeliveryStatuses = [
  "pending",
  "sending",
  "accepted",
  "rejected",
  "ambiguous",
] as const;
export const aiAgentStatuses = [
  "draft",
  "active",
  "inactive",
] as const;
export const aiAgentVersionStatuses = [
  "draft",
  "published",
  "archived",
] as const;
export const knowledgeSourceStatuses = [
  "pending-upload",
  "pending-validation",
  "pending-scan",
  "scanning",
  "ready",
  "rejected",
  "archived",
] as const;
export const aiRuntimeAuditOutcomes = [
  "reply-planned",
  "handoff",
] as const;
export const aiRuntimeHandoffReasons = [
  "customer-request",
  "no-approved-knowledge",
  "grounding-below-threshold",
  "provider-unavailable",
  "budget-exhausted",
  "policy-violation",
] as const;
export const aiReplyOutboxStatuses = [
  "awaiting-approval",
  "ready-for-delivery",
  "rejected",
] as const;

export const tenants = sqliteTable(
  "tenants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    provisioningKey: text("provisioning_key"),
    displayName: text("display_name").notNull(),
    status: text("status", { enum: tenantStatuses })
      .notNull()
      .default("trial"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "tenants_display_name_not_blank",
      sql`length(trim(${table.displayName})) > 0`,
    ),
    check(
      "tenants_status_valid",
      sql`${table.status} in ('trial', 'active', 'payment_failed', 'suspended', 'cancelled', 'expired', 'blocked')`,
    ),
    uniqueIndex("tenants_provisioning_key_uq").on(table.provisioningKey),
    index("tenants_status_idx").on(table.status),
  ],
);

export const tenantMemberships = sqliteTable(
  "tenant_memberships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    externalUserId: text("external_user_id").notNull(),
    role: text("role", { enum: tenantRoles }).notNull(),
    status: text("status", { enum: membershipStatuses })
      .notNull()
      .default("active"),
    version: integer("version")
      .notNull()
      .default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "tenant_memberships_external_user_id_not_blank",
      sql`length(trim(${table.externalUserId})) > 0`,
    ),
    check(
      "tenant_memberships_role_valid",
      sql`${table.role} in ('owner', 'manager', 'agent', 'viewer')`,
    ),
    check(
      "tenant_memberships_status_valid",
      sql`${table.status} in ('active', 'suspended')`,
    ),
    check(
      "tenant_memberships_version_positive",
      sql`${table.version} >= 1`,
    ),
    uniqueIndex("tenant_memberships_tenant_user_uq").on(
      table.tenantId,
      table.externalUserId,
    ),
    index("tenant_memberships_user_idx").on(table.externalUserId),
  ],
);

export const tenantSelections = sqliteTable(
  "tenant_selections",
  {
    externalUserId: text(
      "external_user_id",
    ).primaryKey(),
    tenantId: integer("tenant_id").notNull(),
    version: integer("version")
      .notNull()
      .default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "tenant_selections_external_user_id_not_blank",
      sql`length(trim(${table.externalUserId})) > 0`,
    ),
    check(
      "tenant_selections_version_positive",
      sql`${table.version} >= 1`,
    ),
    foreignKey({
      columns: [
        table.tenantId,
        table.externalUserId,
      ],
      foreignColumns: [
        tenantMemberships.tenantId,
        tenantMemberships.externalUserId,
      ],
      name:
        "tenant_selections_membership_fk",
    }).onDelete("cascade"),
    index(
      "tenant_selections_tenant_idx",
    ).on(table.tenantId),
  ],
);

export const tenantMembershipEvents =
  sqliteTable(
    "tenant_membership_events",
    {
      eventKey: text(
        "event_key",
      ).primaryKey(),
      operationKey: text(
        "operation_key",
      ).notNull(),
      tenantId: integer("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "restrict",
        }),
      targetExternalUserId: text(
        "target_external_user_id",
      ).notNull(),
      actorExternalUserId: text(
        "actor_external_user_id",
      ).notNull(),
      eventType: text("event_type", {
        enum:
          tenantMembershipEventTypes,
      }).notNull(),
      fromRole: text("from_role", {
        enum: tenantRoles,
      }).notNull(),
      toRole: text("to_role", {
        enum: tenantRoles,
      }).notNull(),
      fromStatus: text("from_status", {
        enum: membershipStatuses,
      }).notNull(),
      toStatus: text("to_status", {
        enum: membershipStatuses,
      }).notNull(),
      fromVersion: integer(
        "from_version",
      ).notNull(),
      toVersion: integer(
        "to_version",
      ).notNull(),
      occurredAt: text(
        "occurred_at",
      ).notNull(),
    },
    (table) => [
      check(
        "tenant_membership_events_event_key_valid",
        sql`length(${table.eventKey}) = 91
          and ${table.eventKey} glob 'tenant_membership_event_v1_[0-9a-f]*'
          and substr(${table.eventKey}, 28) not glob '*[^0-9a-f]*'`,
      ),
      check(
        "tenant_membership_events_operation_key_valid",
        sql`length(${table.operationKey}) = 95
          and ${table.operationKey} glob 'tenant_membership_operation_v1_[0-9a-f]*'
          and substr(${table.operationKey}, 32) not glob '*[^0-9a-f]*'`,
      ),
      check(
        "tenant_membership_events_target_not_blank",
        sql`length(trim(${table.targetExternalUserId})) > 0`,
      ),
      check(
        "tenant_membership_events_actor_not_blank",
        sql`length(trim(${table.actorExternalUserId})) > 0`,
      ),
      check(
        "tenant_membership_events_type_valid",
        sql`${table.eventType} in ('role-changed', 'suspended', 'reactivated', 'owner-transfer-out', 'owner-transfer-in')`,
      ),
      check(
        "tenant_membership_events_from_role_valid",
        sql`${table.fromRole} in ('owner', 'manager', 'agent', 'viewer')`,
      ),
      check(
        "tenant_membership_events_to_role_valid",
        sql`${table.toRole} in ('owner', 'manager', 'agent', 'viewer')`,
      ),
      check(
        "tenant_membership_events_from_status_valid",
        sql`${table.fromStatus} in ('active', 'suspended')`,
      ),
      check(
        "tenant_membership_events_to_status_valid",
        sql`${table.toStatus} in ('active', 'suspended')`,
      ),
      check(
        "tenant_membership_events_version_transition",
        sql`${table.fromVersion} >= 1
          and ${table.toVersion} = ${table.fromVersion} + 1`,
      ),
      check(
        "tenant_membership_events_state_changed",
        sql`${table.fromRole} <> ${table.toRole}
          or ${table.fromStatus} <> ${table.toStatus}`,
      ),
      check(
        "tenant_membership_events_shape_valid",
        sql`(
            ${table.eventType} = 'role-changed'
            and ${table.fromRole} <> ${table.toRole}
            and ${table.fromStatus} = ${table.toStatus}
          ) or (
            ${table.eventType} = 'suspended'
            and ${table.fromRole} = ${table.toRole}
            and ${table.fromStatus} = 'active'
            and ${table.toStatus} = 'suspended'
          ) or (
            ${table.eventType} = 'reactivated'
            and ${table.fromRole} = ${table.toRole}
            and ${table.fromStatus} = 'suspended'
            and ${table.toStatus} = 'active'
          ) or (
            ${table.eventType} = 'owner-transfer-out'
            and ${table.fromRole} = 'owner'
            and ${table.toRole} <> 'owner'
            and ${table.fromStatus} = 'active'
            and ${table.toStatus} = 'active'
          ) or (
            ${table.eventType} = 'owner-transfer-in'
            and ${table.fromRole} <> 'owner'
            and ${table.toRole} = 'owner'
            and ${table.fromStatus} = 'active'
            and ${table.toStatus} = 'active'
          )`,
      ),
      check(
        "tenant_membership_events_occurred_at_canonical",
        sql`length(${table.occurredAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.occurredAt})
            = ${table.occurredAt}`,
      ),
      uniqueIndex(
        "tenant_membership_events_operation_target_uq",
      ).on(
        table.operationKey,
        table.targetExternalUserId,
      ),
      index(
        "tenant_membership_events_tenant_occurred_idx",
      ).on(
        table.tenantId,
        table.occurredAt,
      ),
    ],
  );

export const teamInvitations =
  sqliteTable(
    "team_invitations",
    {
      invitationKey: text(
        "invitation_key",
      ).primaryKey(),
      tenantId: integer("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "restrict",
        }),
      normalizedEmail: text(
        "normalized_email",
      ).notNull(),
      role: text("role", {
        enum: tenantRoles,
      }).notNull(),
      status: text("status", {
        enum:
          teamInvitationStatuses,
      })
        .notNull()
        .default("pending"),
      version: integer("version")
        .notNull()
        .default(1),
      invitedByExternalUserId: text(
        "invited_by_external_user_id",
      ).notNull(),
      lastActorExternalUserId: text(
        "last_actor_external_user_id",
      ).notNull(),
      lastActorKind: text(
        "last_actor_kind",
        {
          enum:
            teamInvitationActorKinds,
        },
      )
        .notNull()
        .default("user"),
      requestedAt: text(
        "requested_at",
      ).notNull(),
      expiresAt: text(
        "expires_at",
      ).notNull(),
      createdAt: text("created_at")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
      updatedAt: text(
        "updated_at",
      ).notNull(),
    },
    (table) => [
      check(
        "team_invitations_key_valid",
        sql`length(${table.invitationKey}) = 83
          and ${table.invitationKey} glob 'team_invitation_v1_[0-9a-f]*'
          and substr(${table.invitationKey}, 20) not glob '*[^0-9a-f]*'`,
      ),
      check(
        "team_invitations_email_normalized",
        sql`length(${table.normalizedEmail}) between 3 and 254
          and ${table.normalizedEmail} = lower(trim(${table.normalizedEmail}))
          and instr(${table.normalizedEmail}, '@') > 1
          and instr(substr(
            ${table.normalizedEmail},
            instr(${table.normalizedEmail}, '@') + 1
          ), '.') > 1`,
      ),
      check(
        "team_invitations_role_valid",
        sql`${table.role} in ('manager', 'agent', 'viewer')`,
      ),
      check(
        "team_invitations_status_valid",
        sql`${table.status} in ('pending', 'revoked', 'expired')`,
      ),
      check(
        "team_invitations_version_positive",
        sql`${table.version} >= 1`,
      ),
      check(
        "team_invitations_inviter_bounded",
        sql`length(trim(${table.invitedByExternalUserId})) between 1 and 512
          and trim(${table.invitedByExternalUserId})
            = ${table.invitedByExternalUserId}`,
      ),
      check(
        "team_invitations_last_actor_bounded",
        sql`length(trim(${table.lastActorExternalUserId})) between 1 and 512
          and trim(${table.lastActorExternalUserId})
            = ${table.lastActorExternalUserId}`,
      ),
      check(
        "team_invitations_last_actor_kind_valid",
        sql`${table.lastActorKind} = 'user'
          or (
            ${table.lastActorKind} = 'system'
            and ${table.status} = 'expired'
            and ${table.lastActorExternalUserId}
              = 'team-invitation-expiration-scheduler-v1'
          )`,
      ),
      check(
        "team_invitations_requested_at_canonical",
        sql`length(${table.requestedAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.requestedAt})
            = ${table.requestedAt}`,
      ),
      check(
        "team_invitations_expires_at_canonical",
        sql`length(${table.expiresAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.expiresAt})
            = ${table.expiresAt}
          and ${table.expiresAt} > ${table.requestedAt}`,
      ),
      check(
        "team_invitations_updated_at_canonical",
        sql`length(${table.updatedAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.updatedAt})
            = ${table.updatedAt}
          and ${table.updatedAt} >= ${table.requestedAt}`,
      ),
      uniqueIndex(
        "team_invitations_tenant_email_uq",
      ).on(
        table.tenantId,
        table.normalizedEmail,
      ),
      uniqueIndex(
        "team_invitations_tenant_key_uq",
      ).on(
        table.tenantId,
        table.invitationKey,
      ),
      index(
        "team_invitations_tenant_status_expiry_idx",
      ).on(
        table.tenantId,
        table.status,
        table.expiresAt,
      ),
      index(
        "team_invitations_expiration_scan_idx",
      ).on(
        table.status,
        table.expiresAt,
        table.invitationKey,
      ),
    ],
  );

export const teamInvitationEvents =
  sqliteTable(
    "team_invitation_events",
    {
      eventKey: text(
        "event_key",
      ).primaryKey(),
      operationKey: text(
        "operation_key",
      ).notNull(),
      invitationKey: text(
        "invitation_key",
      ).notNull(),
      tenantId: integer(
        "tenant_id",
      ).notNull(),
      actorExternalUserId: text(
        "actor_external_user_id",
      ).notNull(),
      actorKind: text("actor_kind", {
        enum:
          teamInvitationActorKinds,
      })
        .notNull()
        .default("user"),
      eventType: text("event_type", {
        enum:
          teamInvitationEventTypes,
      }).notNull(),
      fromRole: text("from_role", {
        enum: tenantRoles,
      }),
      toRole: text("to_role", {
        enum: tenantRoles,
      }).notNull(),
      fromStatus: text(
        "from_status",
        {
          enum:
            teamInvitationStatuses,
        },
      ),
      toStatus: text("to_status", {
        enum:
          teamInvitationStatuses,
      }).notNull(),
      fromVersion: integer(
        "from_version",
      ).notNull(),
      toVersion: integer(
        "to_version",
      ).notNull(),
      occurredAt: text(
        "occurred_at",
      ).notNull(),
      expiresAt: text(
        "expires_at",
      ).notNull(),
      createdAt: text("created_at")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    },
    (table) => [
      check(
        "team_invitation_events_key_valid",
        sql`length(${table.eventKey}) = 89
          and ${table.eventKey} glob 'team_invitation_event_v1_[0-9a-f]*'
          and substr(${table.eventKey}, 26) not glob '*[^0-9a-f]*'`,
      ),
      check(
        "team_invitation_events_operation_key_valid",
        sql`length(${table.operationKey}) = 93
          and ${table.operationKey} glob 'team_invitation_operation_v1_[0-9a-f]*'
          and substr(${table.operationKey}, 30) not glob '*[^0-9a-f]*'`,
      ),
      check(
        "team_invitation_events_actor_bounded",
        sql`length(trim(${table.actorExternalUserId})) between 1 and 512
          and trim(${table.actorExternalUserId})
            = ${table.actorExternalUserId}`,
      ),
      check(
        "team_invitation_events_actor_kind_valid",
        sql`${table.actorKind} = 'user'
          or (
            ${table.actorKind} = 'system'
            and ${table.eventType} = 'expired'
            and ${table.actorExternalUserId}
              = 'team-invitation-expiration-scheduler-v1'
          )`,
      ),
      check(
        "team_invitation_events_type_valid",
        sql`${table.eventType} in ('requested', 're-requested', 'revoked', 'expired')`,
      ),
      check(
        "team_invitation_events_to_role_valid",
        sql`${table.toRole} in ('manager', 'agent', 'viewer')`,
      ),
      check(
        "team_invitation_events_to_status_valid",
        sql`${table.toStatus} in ('pending', 'revoked', 'expired')`,
      ),
      check(
        "team_invitation_events_version_transition",
        sql`(
            ${table.eventType} = 'requested'
            and ${table.fromVersion} = 0
            and ${table.toVersion} = 1
          ) or (
            ${table.eventType} <> 'requested'
            and ${table.fromVersion} >= 1
            and ${table.toVersion} = ${table.fromVersion} + 1
          )`,
      ),
      check(
        "team_invitation_events_shape_valid",
        sql`(
            ${table.eventType} = 'requested'
            and ${table.fromRole} is null
            and ${table.fromStatus} is null
            and ${table.toStatus} = 'pending'
          ) or (
            ${table.eventType} = 're-requested'
            and ${table.fromRole} in ('manager', 'agent', 'viewer')
            and ${table.fromStatus} in ('revoked', 'expired')
            and ${table.toStatus} = 'pending'
          ) or (
            ${table.eventType} = 'revoked'
            and ${table.fromRole} = ${table.toRole}
            and ${table.fromStatus} = 'pending'
            and ${table.toStatus} = 'revoked'
          ) or (
            ${table.eventType} = 'expired'
            and ${table.fromRole} = ${table.toRole}
            and ${table.fromStatus} = 'pending'
            and ${table.toStatus} = 'expired'
          )`,
      ),
      check(
        "team_invitation_events_occurred_at_canonical",
        sql`length(${table.occurredAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.occurredAt})
            = ${table.occurredAt}`,
      ),
      check(
        "team_invitation_events_expires_at_canonical",
        sql`length(${table.expiresAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.expiresAt})
            = ${table.expiresAt}
          and (
            ${table.toStatus} <> 'pending'
            or ${table.expiresAt} > ${table.occurredAt}
          )`,
      ),
      foreignKey({
        columns: [
          table.tenantId,
          table.invitationKey,
        ],
        foreignColumns: [
          teamInvitations.tenantId,
          teamInvitations.invitationKey,
        ],
        name:
          "team_invitation_events_invitation_fk",
      }).onDelete("restrict"),
      uniqueIndex(
        "team_invitation_events_operation_uq",
      ).on(table.operationKey),
      uniqueIndex(
        "team_invitation_events_invitation_version_uq",
      ).on(
        table.invitationKey,
        table.toVersion,
      ),
      index(
        "team_invitation_events_tenant_occurred_idx",
      ).on(
        table.tenantId,
        table.occurredAt,
      ),
    ],
  );

export const teamInvitationDeliveries =
  sqliteTable(
    "team_invitation_deliveries",
    {
      deliveryKey: text(
        "delivery_key",
      ).primaryKey(),
      tenantId: integer(
        "tenant_id",
      ).notNull(),
      invitationKey: text(
        "invitation_key",
      ).notNull(),
      invitationVersion: integer(
        "invitation_version",
      ).notNull(),
      status: text("status", {
        enum:
          teamInvitationDeliveryStatuses,
      })
        .notNull()
        .default("pending"),
      attemptCount: integer(
        "attempt_count",
      )
        .notNull()
        .default(0),
      lastErrorCode: text(
        "last_error_code",
      ),
      submittedAt: text(
        "submitted_at",
      ),
      createdAt: text(
        "created_at",
      ).notNull(),
      updatedAt: text(
        "updated_at",
      ).notNull(),
    },
    (table) => [
      check(
        "team_invitation_deliveries_key_valid",
        sql`length(${table.deliveryKey}) = 92
          and ${table.deliveryKey} glob 'team_invitation_delivery_v1_[0-9a-f]*'
          and substr(${table.deliveryKey}, 29) not glob '*[^0-9a-f]*'`,
      ),
      check(
        "team_invitation_deliveries_version_positive",
        sql`${table.invitationVersion} >= 1`,
      ),
      check(
        "team_invitation_deliveries_status_valid",
        sql`${table.status} in ('pending', 'sending', 'submitted', 'blocked', 'ambiguous', 'cancelled')`,
      ),
      check(
        "team_invitation_deliveries_attempt_count_valid",
        sql`${table.attemptCount} >= 0`,
      ),
      check(
        "team_invitation_deliveries_error_code_valid",
        sql`${table.lastErrorCode} is null
          or (
            length(${table.lastErrorCode}) between 1 and 100
            and ${table.lastErrorCode} not glob '*[^A-Z0-9_]*'
          )`,
      ),
      check(
        "team_invitation_deliveries_created_at_canonical",
        sql`length(${table.createdAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.createdAt})
            = ${table.createdAt}`,
      ),
      check(
        "team_invitation_deliveries_updated_at_canonical",
        sql`length(${table.updatedAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.updatedAt})
            = ${table.updatedAt}
          and ${table.updatedAt} >= ${table.createdAt}`,
      ),
      check(
        "team_invitation_deliveries_submitted_at_canonical",
        sql`${table.submittedAt} is null
          or (
            length(${table.submittedAt}) = 24
            and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.submittedAt})
              = ${table.submittedAt}
            and ${table.submittedAt} >= ${table.createdAt}
          )`,
      ),
      check(
        "team_invitation_deliveries_state_shape_valid",
        sql`(
            ${table.status} = 'pending'
            and ${table.attemptCount} = 0
            and ${table.lastErrorCode} is null
            and ${table.submittedAt} is null
          ) or (
            ${table.status} = 'sending'
            and ${table.attemptCount} = 1
            and ${table.lastErrorCode} is null
            and ${table.submittedAt} is null
          ) or (
            ${table.status} = 'submitted'
            and ${table.attemptCount} = 1
            and ${table.lastErrorCode} is null
            and ${table.submittedAt} is not null
          ) or (
            ${table.status} in ('blocked', 'ambiguous', 'cancelled')
            and ${table.attemptCount} in (0, 1)
            and ${table.lastErrorCode} is not null
            and ${table.submittedAt} is null
          )`,
      ),
      foreignKey({
        columns: [
          table.tenantId,
          table.invitationKey,
        ],
        foreignColumns: [
          teamInvitations.tenantId,
          teamInvitations.invitationKey,
        ],
        name:
          "team_invitation_deliveries_invitation_fk",
      }).onDelete("restrict"),
      uniqueIndex(
        "team_invitation_deliveries_invitation_version_uq",
      ).on(
        table.invitationKey,
        table.invitationVersion,
      ),
      index(
        "team_invitation_deliveries_status_created_idx",
      ).on(
        table.status,
        table.createdAt,
      ),
    ],
  );

export const businessProfiles = sqliteTable(
  "business_profiles",
  {
    tenantId: integer("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    timezone: text("timezone").notNull(),
    interfaceLanguage: text("interface_language", {
      enum: interfaceLanguages,
    }).notNull(),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "business_profiles_business_name_not_blank",
      sql`length(trim(${table.businessName})) > 0`,
    ),
    check(
      "business_profiles_timezone_not_blank",
      sql`length(trim(${table.timezone})) > 0`,
    ),
    check(
      "business_profiles_language_valid",
      sql`${table.interfaceLanguage} in ('he', 'en', 'ar')`,
    ),
    check(
      "business_profiles_version_positive",
      sql`${table.version} >= 1`,
    ),
  ],
);

export const metaConnections = sqliteTable(
  "meta_connections",
  {
    tenantId: integer("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    businessPortfolioId: text("business_portfolio_id").notNull(),
    wabaId: text("waba_id").notNull(),
    phoneNumberId: text("phone_number_id").notNull(),
    status: text("status", { enum: metaConnectionStatuses })
      .notNull()
      .default("pending"),
    webhookSubscribedAt: text("webhook_subscribed_at"),
    connectedAt: text("connected_at"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "meta_connections_business_portfolio_id_not_blank",
      sql`length(trim(${table.businessPortfolioId})) > 0`,
    ),
    check(
      "meta_connections_waba_id_not_blank",
      sql`length(trim(${table.wabaId})) > 0`,
    ),
    check(
      "meta_connections_phone_number_id_not_blank",
      sql`length(trim(${table.phoneNumberId})) > 0`,
    ),
    check(
      "meta_connections_status_valid",
      sql`${table.status} in ('pending', 'connected', 'verification_required', 'revoked', 'error', 'restricted')`,
    ),
    check(
      "meta_connections_lifecycle_consistent",
      sql`(
        ${table.status} = 'pending'
        and ${table.webhookSubscribedAt} is null
        and ${table.connectedAt} is null
      ) or (
        ${table.status} = 'connected'
        and ${table.webhookSubscribedAt} is not null
        and ${table.connectedAt} is not null
      ) or (
        ${table.status} in ('verification_required', 'revoked', 'error', 'restricted')
      )`,
    ),
    check(
      "meta_connections_version_positive",
      sql`${table.version} >= 1`,
    ),
    uniqueIndex("meta_connections_waba_uq").on(table.wabaId),
    uniqueIndex("meta_connections_phone_number_uq").on(
      table.phoneNumberId,
    ),
    index("meta_connections_status_idx").on(table.status),
  ],
);

export const metaCredentialEnvelopes = sqliteTable(
  "meta_credential_envelopes",
  {
    tenantId: integer("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    keyVersion: text("key_version").notNull(),
    initializationVector: text("initialization_vector").notNull(),
    ciphertext: text("ciphertext").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "meta_credential_envelopes_key_version_valid",
      sql`${table.keyVersion} = 'v1'`,
    ),
    check(
      "meta_credential_envelopes_iv_base64",
      sql`length(${table.initializationVector}) = 16
        and ${table.initializationVector} not glob '*[^A-Za-z0-9+/]*'`,
    ),
    check(
      "meta_credential_envelopes_ciphertext_bounded",
      sql`length(${table.ciphertext}) between 24 and 12000
        and ${table.ciphertext} not glob '*[^A-Za-z0-9+/=]*'`,
    ),
  ],
);

export const metaWebhookReceipts = sqliteTable(
  "meta_webhook_receipts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    wabaId: text("waba_id").notNull(),
    eventKey: text("event_key").notNull(),
    objectType: text("object_type").notNull(),
    status: text("status", { enum: metaWebhookReceiptStatuses })
      .notNull()
      .default("processing"),
    attemptCount: integer("attempt_count").notNull().default(1),
    lastErrorCode: text("last_error_code"),
    receivedAt: text("received_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    processedAt: text("processed_at"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "meta_webhook_receipts_waba_id_not_blank",
      sql`length(trim(${table.wabaId})) > 0`,
    ),
    check(
      "meta_webhook_receipts_event_key_sha256",
      sql`length(${table.eventKey}) = 64
        and ${table.eventKey} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "meta_webhook_receipts_object_type_not_blank",
      sql`length(trim(${table.objectType})) > 0`,
    ),
    check(
      "meta_webhook_receipts_status_valid",
      sql`${table.status} in ('processing', 'processed', 'failed')`,
    ),
    check(
      "meta_webhook_receipts_attempt_count_positive",
      sql`${table.attemptCount} >= 1`,
    ),
    check(
      "meta_webhook_receipts_state_consistent",
      sql`(
        ${table.status} = 'processing'
        and ${table.processedAt} is null
        and ${table.lastErrorCode} is null
      ) or (
        ${table.status} = 'processed'
        and ${table.processedAt} is not null
        and ${table.lastErrorCode} is null
      ) or (
        ${table.status} = 'failed'
        and ${table.processedAt} is null
        and length(trim(${table.lastErrorCode})) > 0
      )`,
    ),
    uniqueIndex("meta_webhook_receipts_tenant_event_uq").on(
      table.tenantId,
      table.eventKey,
    ),
    index("meta_webhook_receipts_tenant_status_idx").on(
      table.tenantId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const messageTemplates = sqliteTable(
  "message_templates",
  {
    templateKey: text("template_key").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    metaTemplateId: text("meta_template_id"),
    name: text("name").notNull(),
    language: text("language", {
      enum: messageTemplateLanguages,
    }).notNull(),
    category: text("category", {
      enum: messageTemplateCategories,
    }).notNull(),
    status: text("status", {
      enum: messageTemplateStatuses,
    })
      .notNull()
      .default("draft"),
    definitionJson: text("definition_json").notNull(),
    submissionKey: text("submission_key"),
    submissionStartedAt: text("submission_started_at"),
    lastSubmissionErrorCode: text(
      "last_submission_error_code",
    ),
    lastStatusEventKey: text("last_status_event_key"),
    lastStatusEventAt: text("last_status_event_at"),
    version: integer("version").notNull().default(1),
    submittedAt: text("submitted_at"),
    reviewedAt: text("reviewed_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "message_templates_key_sha256",
      sql`length(${table.templateKey}) = 76
        and substr(${table.templateKey}, 1, 12) = 'template_v1_'
        and substr(${table.templateKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "message_templates_meta_id_valid",
      sql`${table.metaTemplateId} is null
        or (
          length(${table.metaTemplateId}) between 1 and 255
          and ${table.metaTemplateId} not glob '*[^0-9]*'
        )`,
    ),
    check(
      "message_templates_name_valid",
      sql`length(${table.name}) between 1 and 255
        and ${table.name} not glob '*[^a-z0-9_]*'`,
    ),
    check(
      "message_templates_language_valid",
      sql`${table.language} in ('he', 'en_US', 'ar')`,
    ),
    check(
      "message_templates_category_valid",
      sql`${table.category} in ('MARKETING', 'UTILITY')`,
    ),
    check(
      "message_templates_status_valid",
      sql`${table.status} in ('draft', 'submitting', 'pending_review', 'approved', 'rejected', 'disabled', 'deleted')`,
    ),
    check(
      "message_templates_definition_json_valid",
      sql`length(${table.definitionJson}) between 2 and 50000
        and json_valid(${table.definitionJson})`,
    ),
    check(
      "message_templates_submission_key_valid",
      sql`${table.submissionKey} is null
        or (
          length(${table.submissionKey}) = 87
          and substr(${table.submissionKey}, 1, 23) = 'template_submission_v1_'
          and substr(${table.submissionKey}, 24) not glob '*[^0-9a-f]*'
        )`,
    ),
    check(
      "message_templates_submission_error_code_valid",
      sql`${table.lastSubmissionErrorCode} is null
        or (
          length(${table.lastSubmissionErrorCode}) between 1 and 100
          and ${table.lastSubmissionErrorCode} not glob '*[^A-Z0-9_]*'
        )`,
    ),
    check(
      "message_templates_status_event_key_valid",
      sql`${table.lastStatusEventKey} is null
        or (
          length(${table.lastStatusEventKey}) = 64
          and ${table.lastStatusEventKey} not glob '*[^0-9a-f]*'
        )`,
    ),
    check(
      "message_templates_status_event_at_valid",
      sql`${table.lastStatusEventAt} is null
        or (
          length(${table.lastStatusEventAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.lastStatusEventAt})
            = ${table.lastStatusEventAt}
        )`,
    ),
    check(
      "message_templates_status_event_pair_consistent",
      sql`(
        ${table.lastStatusEventKey} is null
        and ${table.lastStatusEventAt} is null
      ) or (
        ${table.lastStatusEventKey} is not null
        and ${table.lastStatusEventAt} is not null
      )`,
    ),
    check(
      "message_templates_version_positive",
      sql`${table.version} >= 1`,
    ),
    check(
      "message_templates_lifecycle_consistent",
      sql`(
        ${table.status} = 'draft'
        and ${table.metaTemplateId} is null
        and ${table.submissionKey} is null
        and ${table.submissionStartedAt} is null
        and ${table.lastStatusEventKey} is null
        and ${table.lastStatusEventAt} is null
        and ${table.submittedAt} is null
        and ${table.reviewedAt} is null
      ) or (
        ${table.status} = 'submitting'
        and ${table.metaTemplateId} is null
        and ${table.submissionKey} is not null
        and ${table.submissionStartedAt} is not null
        and ${table.lastSubmissionErrorCode} is null
        and ${table.lastStatusEventKey} is null
        and ${table.lastStatusEventAt} is null
        and ${table.submittedAt} is null
        and ${table.reviewedAt} is null
      ) or (
        ${table.status} = 'pending_review'
        and ${table.metaTemplateId} is not null
        and ${table.submissionKey} is not null
        and ${table.submissionStartedAt} is not null
        and ${table.lastSubmissionErrorCode} is null
        and ${table.submittedAt} is not null
        and ${table.reviewedAt} is null
      ) or (
        ${table.status} in ('approved', 'rejected', 'disabled', 'deleted')
        and ${table.metaTemplateId} is not null
        and ${table.submissionKey} is not null
        and ${table.submissionStartedAt} is not null
        and ${table.lastSubmissionErrorCode} is null
        and ${table.submittedAt} is not null
        and ${table.reviewedAt} is not null
      )`,
    ),
    uniqueIndex("message_templates_tenant_name_language_uq").on(
      table.tenantId,
      table.name,
      table.language,
    ),
    uniqueIndex("message_templates_tenant_key_uq").on(
      table.tenantId,
      table.templateKey,
    ),
    uniqueIndex("message_templates_meta_id_uq")
      .on(table.metaTemplateId)
      .where(sql`${table.metaTemplateId} is not null`),
    index("message_templates_tenant_status_updated_idx").on(
      table.tenantId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    actorExternalUserId: text("actor_external_user_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    idempotencyKey: text("idempotency_key"),
    metadataJson: text("metadata_json"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "audit_logs_action_not_blank",
      sql`length(trim(${table.action})) > 0`,
    ),
    check(
      "audit_logs_target_type_not_blank",
      sql`length(trim(${table.targetType})) > 0`,
    ),
    index("audit_logs_tenant_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
    uniqueIndex("audit_logs_idempotency_key_uq").on(
      table.idempotencyKey,
    ),
  ],
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phoneE164: text("phone_e164").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    company: text("company"),
    mailingStatus: text("mailing_status", {
      enum: mailingStatuses,
    })
      .notNull()
      .default("unsubscribed"),
    consentStatus: text("consent_status", {
      enum: consentStatuses,
    })
      .notNull()
      .default("unknown"),
    consentSource: text("consent_source"),
    consentRecordedAt: text("consent_recorded_at"),
    consentWithdrawnAt: text("consent_withdrawn_at"),
    consentEvidenceReference: text("consent_evidence_reference"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "contacts_phone_e164_valid",
      sql`length(${table.phoneE164}) between 2 and 16
        and substr(${table.phoneE164}, 1, 1) = '+'
        and substr(${table.phoneE164}, 2, 1) between '1' and '9'
        and substr(${table.phoneE164}, 2) not glob '*[^0-9]*'`,
    ),
    check(
      "contacts_mailing_status_valid",
      sql`${table.mailingStatus} in ('subscribed', 'unsubscribed')`,
    ),
    check(
      "contacts_consent_status_valid",
      sql`${table.consentStatus} in ('unknown', 'granted', 'withdrawn')`,
    ),
    check(
      "contacts_consent_state_consistent",
      sql`(
        ${table.consentStatus} = 'unknown'
        and ${table.mailingStatus} = 'unsubscribed'
        and ${table.consentSource} is null
        and ${table.consentRecordedAt} is null
        and ${table.consentWithdrawnAt} is null
      ) or (
        ${table.consentStatus} = 'granted'
        and ${table.mailingStatus} = 'subscribed'
        and ${table.consentSource} is not null
        and ${table.consentRecordedAt} is not null
        and ${table.consentWithdrawnAt} is null
      ) or (
        ${table.consentStatus} = 'withdrawn'
        and ${table.mailingStatus} = 'unsubscribed'
        and ${table.consentSource} is not null
        and ${table.consentRecordedAt} is not null
        and ${table.consentWithdrawnAt} is not null
      )`,
    ),
    check("contacts_version_positive", sql`${table.version} >= 1`),
    uniqueIndex("contacts_tenant_phone_uq").on(
      table.tenantId,
      table.phoneE164,
    ),
    uniqueIndex("contacts_tenant_id_uq").on(
      table.tenantId,
      table.id,
    ),
    index("contacts_tenant_updated_idx").on(
      table.tenantId,
      table.updatedAt,
    ),
    index("contacts_tenant_id_idx").on(table.tenantId, table.id),
    index("contacts_tenant_mailing_idx").on(
      table.tenantId,
      table.mailingStatus,
    ),
  ],
);

export const campaigns = sqliteTable(
  "campaigns",
  {
    campaignKey: text("campaign_key").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),
    name: text("name").notNull(),
    status: text("status", {
      enum: campaignStatuses,
    })
      .notNull()
      .default("draft"),
    deliveryMode: text("delivery_mode", {
      enum: campaignDeliveryModes,
    }).notNull(),
    scheduledAt: text("scheduled_at"),
    timezone: text("timezone").notNull(),
    templateKey: text("template_key").notNull(),
    templateSnapshotJson: text(
      "template_snapshot_json",
    ).notNull(),
    audienceSnapshotKey: text(
      "audience_snapshot_key",
    ).notNull(),
    recipientCount: integer("recipient_count").notNull(),
    version: integer("version").notNull().default(1),
    activatedAt: text("activated_at"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    lastErrorCode: text("last_error_code"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "campaigns_key_sha256",
      sql`length(${table.campaignKey}) = 76
        and substr(${table.campaignKey}, 1, 12) = 'campaign_v1_'
        and substr(${table.campaignKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "campaigns_name_bounded",
      sql`length(trim(${table.name})) between 1 and 160`,
    ),
    check(
      "campaigns_status_valid",
      sql`${table.status} in ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed')`,
    ),
    check(
      "campaigns_delivery_mode_valid",
      sql`${table.deliveryMode} in ('immediate', 'scheduled')`,
    ),
    check(
      "campaigns_schedule_consistent",
      sql`(
        ${table.deliveryMode} = 'immediate'
        and ${table.scheduledAt} is null
      ) or (
        ${table.deliveryMode} = 'scheduled'
        and length(trim(${table.scheduledAt})) > 0
      )`,
    ),
    check(
      "campaigns_timezone_bounded",
      sql`length(trim(${table.timezone})) between 1 and 100`,
    ),
    check(
      "campaigns_template_key_sha256",
      sql`length(${table.templateKey}) = 76
        and substr(${table.templateKey}, 1, 12) = 'template_v1_'
        and substr(${table.templateKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "campaigns_template_snapshot_json_valid",
      sql`length(${table.templateSnapshotJson}) between 2 and 50000
        and json_valid(${table.templateSnapshotJson})`,
    ),
    check(
      "campaigns_audience_key_sha256",
      sql`length(${table.audienceSnapshotKey}) = 64
        and ${table.audienceSnapshotKey} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "campaigns_recipient_count_bounded",
      sql`${table.recipientCount} between 1 and 100000`,
    ),
    check(
      "campaigns_version_positive",
      sql`${table.version} >= 1`,
    ),
    check(
      "campaigns_error_code_valid",
      sql`${table.lastErrorCode} is null
        or (
          length(${table.lastErrorCode}) between 1 and 100
          and ${table.lastErrorCode} not glob '*[^A-Z0-9_]*'
        )`,
    ),
    uniqueIndex("campaigns_tenant_key_uq").on(
      table.tenantId,
      table.campaignKey,
    ),
    index("campaigns_tenant_audience_idx").on(
      table.tenantId,
      table.audienceSnapshotKey,
    ),
    index("campaigns_tenant_status_schedule_idx").on(
      table.tenantId,
      table.status,
      table.scheduledAt,
    ),
    foreignKey({
      name: "campaigns_tenant_template_fk",
      columns: [table.tenantId, table.templateKey],
      foreignColumns: [
        messageTemplates.tenantId,
        messageTemplates.templateKey,
      ],
    }).onDelete("restrict"),
  ],
);

export const campaignRecipients = sqliteTable(
  "campaign_recipients",
  {
    campaignKey: text("campaign_key").notNull(),
    tenantId: integer("tenant_id").notNull(),
    contactId: integer("contact_id").notNull(),
    contactVersion: integer("contact_version").notNull(),
    phoneE164: text("phone_e164").notNull(),
    personalizationJson: text(
      "personalization_json",
    ).notNull(),
    personalizationKey: text(
      "personalization_key",
    ).notNull(),
    deliveryKey: text("delivery_key").notNull(),
    status: text("status", {
      enum: campaignRecipientStatuses,
    })
      .notNull()
      .default("pending"),
    attemptCount: integer("attempt_count")
      .notNull()
      .default(0),
    lastErrorCode: text("last_error_code"),
    queuedAt: text("queued_at"),
    acceptedAt: text("accepted_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({
      columns: [table.campaignKey, table.contactId],
    }),
    check(
      "campaign_recipients_campaign_key_sha256",
      sql`length(${table.campaignKey}) = 76
        and substr(${table.campaignKey}, 1, 12) = 'campaign_v1_'
        and substr(${table.campaignKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "campaign_recipients_contact_version_positive",
      sql`${table.contactVersion} >= 1`,
    ),
    check(
      "campaign_recipients_phone_e164_valid",
      sql`length(${table.phoneE164}) between 2 and 16
        and substr(${table.phoneE164}, 1, 1) = '+'
        and substr(${table.phoneE164}, 2, 1) between '1' and '9'
        and substr(${table.phoneE164}, 2) not glob '*[^0-9]*'`,
    ),
    check(
      "campaign_recipients_personalization_json_valid",
      sql`length(${table.personalizationJson}) between 2 and 50000
        and json_valid(${table.personalizationJson})`,
    ),
    check(
      "campaign_recipients_personalization_key_sha256",
      sql`length(${table.personalizationKey}) = 64
        and ${table.personalizationKey} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "campaign_recipients_delivery_key_sha256",
      sql`length(${table.deliveryKey}) = 85
        and substr(${table.deliveryKey}, 1, 21) = 'campaign_delivery_v1_'
        and substr(${table.deliveryKey}, 22) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "campaign_recipients_status_valid",
      sql`${table.status} in ('pending', 'queued', 'sending', 'accepted', 'delivered', 'read', 'failed', 'skipped', 'cancelled')`,
    ),
    check(
      "campaign_recipients_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "campaign_recipients_error_code_valid",
      sql`${table.lastErrorCode} is null
        or (
          length(${table.lastErrorCode}) between 1 and 100
          and ${table.lastErrorCode} not glob '*[^A-Z0-9_]*'
        )`,
    ),
    uniqueIndex("campaign_recipients_delivery_key_uq").on(
      table.deliveryKey,
    ),
    index("campaign_recipients_tenant_status_idx").on(
      table.tenantId,
      table.status,
      table.contactId,
    ),
    foreignKey({
      name: "campaign_recipients_tenant_campaign_fk",
      columns: [table.tenantId, table.campaignKey],
      foreignColumns: [
        campaigns.tenantId,
        campaigns.campaignKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "campaign_recipients_tenant_contact_fk",
      columns: [table.tenantId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.id],
    }).onDelete("restrict"),
  ],
);

export const contactConsentEvents = sqliteTable(
  "contact_consent_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    eventType: text("event_type", {
      enum: consentEventTypes,
    }).notNull(),
    source: text("source").notNull(),
    occurredAt: text("occurred_at").notNull(),
    evidenceReference: text("evidence_reference"),
    actorExternalUserId: text("actor_external_user_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "contact_consent_events_type_valid",
      sql`${table.eventType} in ('granted', 'unsubscribed')`,
    ),
    check(
      "contact_consent_events_source_not_blank",
      sql`length(trim(${table.source})) > 0`,
    ),
    check(
      "contact_consent_events_occurred_at_not_blank",
      sql`length(trim(${table.occurredAt})) > 0`,
    ),
    check(
      "contact_consent_events_idempotency_key_not_blank",
      sql`length(trim(${table.idempotencyKey})) > 0`,
    ),
    uniqueIndex("contact_consent_events_tenant_key_uq").on(
      table.tenantId,
      table.idempotencyKey,
    ),
    index("contact_consent_events_contact_time_idx").on(
      table.tenantId,
      table.contactId,
      table.occurredAt,
    ),
  ],
);

export const contactImportJobs = sqliteTable(
  "contact_import_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    fileName: text("file_name").notNull(),
    totalRows: integer("total_rows").notNull(),
    processedRows: integer("processed_rows").notNull().default(0),
    createdRows: integer("created_rows").notNull().default(0),
    updatedRows: integer("updated_rows").notNull().default(0),
    unchangedRows: integer("unchanged_rows").notNull().default(0),
    rejectedRows: integer("rejected_rows").notNull().default(0),
    duplicateRows: integer("duplicate_rows").notNull().default(0),
    status: text("status", {
      enum: contactImportJobStatuses,
    })
      .notNull()
      .default("processing"),
    createdByExternalUserId: text("created_by_external_user_id").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
  },
  (table) => [
    check(
      "contact_import_jobs_idempotency_key_not_blank",
      sql`length(trim(${table.idempotencyKey})) > 0`,
    ),
    check(
      "contact_import_jobs_file_name_not_blank",
      sql`length(trim(${table.fileName})) > 0`,
    ),
    check(
      "contact_import_jobs_total_rows_positive",
      sql`${table.totalRows} > 0`,
    ),
    check(
      "contact_import_jobs_counts_valid",
      sql`${table.processedRows} >= 0
        and ${table.createdRows} >= 0
        and ${table.updatedRows} >= 0
        and ${table.unchangedRows} >= 0
        and ${table.rejectedRows} >= 0
        and ${table.duplicateRows} >= 0
        and ${table.processedRows} <= ${table.totalRows}
        and ${table.processedRows} = ${table.createdRows}
          + ${table.updatedRows}
          + ${table.unchangedRows}
          + ${table.rejectedRows}
          + ${table.duplicateRows}`,
    ),
    check(
      "contact_import_jobs_status_valid",
      sql`${table.status} in ('processing', 'completed')`,
    ),
    check(
      "contact_import_jobs_completion_consistent",
      sql`(
        ${table.status} = 'processing'
        and ${table.completedAt} is null
      ) or (
        ${table.status} = 'completed'
        and ${table.processedRows} = ${table.totalRows}
        and ${table.completedAt} is not null
      )`,
    ),
    check(
      "contact_import_jobs_actor_not_blank",
      sql`length(trim(${table.createdByExternalUserId})) > 0`,
    ),
    uniqueIndex("contact_import_jobs_tenant_key_uq").on(
      table.tenantId,
      table.idempotencyKey,
    ),
    index("contact_import_jobs_tenant_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);

export const contactImportRows = sqliteTable(
  "contact_import_rows",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    jobId: integer("job_id")
      .notNull()
      .references(() => contactImportJobs.id, { onDelete: "cascade" }),
    sourceRowNumber: integer("source_row_number").notNull(),
    contactId: integer("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    phoneFingerprint: text("phone_fingerprint"),
    status: text("status", {
      enum: contactImportRowStatuses,
    }).notNull(),
    reason: text("reason", {
      enum: contactImportRowReasons,
    }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "contact_import_rows_source_row_positive",
      sql`${table.sourceRowNumber} >= 2`,
    ),
    check(
      "contact_import_rows_status_valid",
      sql`${table.status} in ('created', 'updated', 'unchanged', 'rejected', 'duplicate')`,
    ),
    check(
      "contact_import_rows_reason_valid",
      sql`${table.reason} is null
        or ${table.reason} in ('missing_phone', 'invalid_phone', 'duplicate_in_file')`,
    ),
    check(
      "contact_import_rows_outcome_consistent",
      sql`(
        ${table.status} in ('created', 'updated', 'unchanged')
        and ${table.contactId} is not null
        and ${table.phoneFingerprint} is not null
        and ${table.reason} is null
      ) or (
        ${table.status} = 'duplicate'
        and ${table.phoneFingerprint} is not null
        and ${table.reason} = 'duplicate_in_file'
      ) or (
        ${table.status} = 'rejected'
        and ${table.contactId} is null
        and ${table.phoneFingerprint} is null
        and ${table.reason} in ('missing_phone', 'invalid_phone')
      )`,
    ),
    uniqueIndex("contact_import_rows_job_source_uq").on(
      table.jobId,
      table.sourceRowNumber,
    ),
    index("contact_import_rows_job_phone_idx").on(
      table.jobId,
      table.phoneFingerprint,
    ),
    index("contact_import_rows_tenant_job_idx").on(
      table.tenantId,
      table.jobId,
    ),
  ],
);

export const contactTags = sqliteTable(
  "contact_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "contact_tags_name_not_blank",
      sql`length(trim(${table.name})) > 0`,
    ),
    check(
      "contact_tags_normalized_name_not_blank",
      sql`length(trim(${table.normalizedName})) > 0`,
    ),
    uniqueIndex("contact_tags_tenant_name_uq").on(
      table.tenantId,
      table.normalizedName,
    ),
    index("contact_tags_tenant_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);

export const contactLists = sqliteTable(
  "contact_lists",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "contact_lists_name_not_blank",
      sql`length(trim(${table.name})) > 0`,
    ),
    check(
      "contact_lists_normalized_name_not_blank",
      sql`length(trim(${table.normalizedName})) > 0`,
    ),
    uniqueIndex("contact_lists_tenant_name_uq").on(
      table.tenantId,
      table.normalizedName,
    ),
    index("contact_lists_tenant_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);

export const contactTagAssignments = sqliteTable(
  "contact_tag_assignments",
  {
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => contactTags.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({
      name: "contact_tag_assignments_pk",
      columns: [table.contactId, table.tagId],
    }),
    index("contact_tag_assignments_tenant_contact_idx").on(
      table.tenantId,
      table.contactId,
    ),
    index("contact_tag_assignments_tenant_tag_idx").on(
      table.tenantId,
      table.tagId,
    ),
  ],
);

export const contactListMemberships = sqliteTable(
  "contact_list_memberships",
  {
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contactId: integer("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    listId: integer("list_id")
      .notNull()
      .references(() => contactLists.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({
      name: "contact_list_memberships_pk",
      columns: [table.contactId, table.listId],
    }),
    index("contact_list_memberships_tenant_contact_idx").on(
      table.tenantId,
      table.contactId,
    ),
    index("contact_list_memberships_tenant_list_idx").on(
      table.tenantId,
      table.listId,
    ),
  ],
);

export const botFlows = sqliteTable(
  "bot_flows",
  {
    botFlowKey: text("bot_flow_key").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),
    name: text("name").notNull(),
    status: text("status", {
      enum: botFlowStatuses,
    })
      .notNull()
      .default("draft"),
    latestVersionKey: text(
      "latest_version_key",
    ).notNull(),
    latestVersionNumber: integer(
      "latest_version_number",
    ).notNull(),
    activeVersionKey: text("active_version_key"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "bot_flows_key_sha256",
      sql`length(${table.botFlowKey}) = 76
        and substr(${table.botFlowKey}, 1, 12) = 'bot_flow_v1_'
        and substr(${table.botFlowKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_flows_name_bounded",
      sql`length(trim(${table.name})) between 1 and 160`,
    ),
    check(
      "bot_flows_status_valid",
      sql`${table.status} in ('draft', 'active', 'inactive')`,
    ),
    check(
      "bot_flows_latest_version_key_sha256",
      sql`length(${table.latestVersionKey}) = 84
        and substr(${table.latestVersionKey}, 1, 20) = 'bot_flow_version_v1_'
        and substr(${table.latestVersionKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_flows_active_version_key_sha256",
      sql`${table.activeVersionKey} is null
        or (
          length(${table.activeVersionKey}) = 84
          and substr(${table.activeVersionKey}, 1, 20) = 'bot_flow_version_v1_'
          and substr(${table.activeVersionKey}, 21) not glob '*[^0-9a-f]*'
        )`,
    ),
    check(
      "bot_flows_active_state_consistent",
      sql`(
        ${table.status} = 'draft'
        and ${table.activeVersionKey} is null
      ) or (
        ${table.status} in ('active', 'inactive')
        and ${table.activeVersionKey} is not null
      )`,
    ),
    check(
      "bot_flows_latest_version_positive",
      sql`${table.latestVersionNumber} >= 1`,
    ),
    check(
      "bot_flows_version_positive",
      sql`${table.version} >= 1`,
    ),
    uniqueIndex("bot_flows_tenant_key_uq").on(
      table.tenantId,
      table.botFlowKey,
    ),
    index("bot_flows_tenant_status_updated_idx").on(
      table.tenantId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const botFlowVersions = sqliteTable(
  "bot_flow_versions",
  {
    botFlowVersionKey: text(
      "bot_flow_version_key",
    ).primaryKey(),
    botFlowKey: text("bot_flow_key").notNull(),
    tenantId: integer("tenant_id").notNull(),
    versionNumber: integer(
      "version_number",
    ).notNull(),
    status: text("status", {
      enum: botFlowVersionStatuses,
    })
      .notNull()
      .default("draft"),
    definitionJson: text(
      "definition_json",
    ).notNull(),
    publishedAt: text("published_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "bot_flow_versions_key_sha256",
      sql`length(${table.botFlowVersionKey}) = 84
        and substr(${table.botFlowVersionKey}, 1, 20) = 'bot_flow_version_v1_'
        and substr(${table.botFlowVersionKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_flow_versions_flow_key_sha256",
      sql`length(${table.botFlowKey}) = 76
        and substr(${table.botFlowKey}, 1, 12) = 'bot_flow_v1_'
        and substr(${table.botFlowKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_flow_versions_number_positive",
      sql`${table.versionNumber} >= 1`,
    ),
    check(
      "bot_flow_versions_status_valid",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
    check(
      "bot_flow_versions_definition_json_valid",
      sql`length(${table.definitionJson}) between 2 and 1000000
        and json_valid(${table.definitionJson})`,
    ),
    check(
      "bot_flow_versions_publication_consistent",
      sql`(
        ${table.status} = 'draft'
        and ${table.publishedAt} is null
      ) or (
        ${table.status} in ('published', 'archived')
        and ${table.publishedAt} is not null
      )`,
    ),
    uniqueIndex(
      "bot_flow_versions_tenant_key_uq",
    ).on(
      table.tenantId,
      table.botFlowVersionKey,
    ),
    uniqueIndex(
      "bot_flow_versions_tenant_number_uq",
    ).on(
      table.tenantId,
      table.botFlowKey,
      table.versionNumber,
    ),
    uniqueIndex(
      "bot_flow_versions_one_published_uq",
    )
      .on(table.tenantId, table.botFlowKey)
      .where(sql`${table.status} = 'published'`),
    index("bot_flow_versions_tenant_flow_idx").on(
      table.tenantId,
      table.botFlowKey,
      table.versionNumber,
    ),
    foreignKey({
      name: "bot_flow_versions_tenant_flow_fk",
      columns: [table.tenantId, table.botFlowKey],
      foreignColumns: [
        botFlows.tenantId,
        botFlows.botFlowKey,
      ],
    }).onDelete("cascade"),
  ],
);

export const knowledgeSources = sqliteTable(
  "knowledge_sources",
  {
    sourceKey: text("source_key").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),
    contentSha256: text(
      "content_sha256",
    ).notNull(),
    fileName: text("file_name").notNull(),
    mediaType: text("media_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageObjectKey: text(
      "storage_object_key",
    ).notNull(),
    status: text("status", {
      enum: knowledgeSourceStatuses,
    })
      .notNull()
      .default("pending-validation"),
    lastErrorCode: text("last_error_code"),
    readyAt: text("ready_at"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "knowledge_sources_key_sha256",
      sql`length(${table.sourceKey}) = 84
        and substr(${table.sourceKey}, 1, 20) = 'knowledge_source_v1_'
        and substr(${table.sourceKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "knowledge_sources_digest_sha256",
      sql`length(${table.contentSha256}) = 64
        and ${table.contentSha256} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "knowledge_sources_file_name_bounded",
      sql`length(trim(${table.fileName})) between 1 and 512`,
    ),
    check(
      "knowledge_sources_media_type_bounded",
      sql`length(trim(${table.mediaType})) between 3 and 255`,
    ),
    check(
      "knowledge_sources_size_positive",
      sql`${table.sizeBytes} between 1 and 9007199254740991`,
    ),
    check(
      "knowledge_sources_object_key_bounded",
      sql`length(${table.storageObjectKey}) between 1 and 1024`,
    ),
    check(
      "knowledge_sources_status_valid",
      sql`${table.status} in ('pending-upload', 'pending-validation', 'pending-scan', 'scanning', 'ready', 'rejected', 'archived')`,
    ),
    check(
      "knowledge_sources_error_code_valid",
      sql`${table.lastErrorCode} is null
        or (
          length(${table.lastErrorCode}) between 1 and 100
          and ${table.lastErrorCode} not glob '*[^A-Z0-9_]*'
        )`,
    ),
    check(
      "knowledge_sources_state_consistent",
      sql`(
        ${table.status} in ('pending-upload', 'pending-validation', 'pending-scan', 'scanning')
        and ${table.lastErrorCode} is null
        and ${table.readyAt} is null
      ) or (
        ${table.status} = 'ready'
        and ${table.lastErrorCode} is null
        and ${table.readyAt} is not null
      ) or (
        ${table.status} = 'rejected'
        and ${table.lastErrorCode} is not null
        and ${table.readyAt} is null
      ) or (
        ${table.status} = 'archived'
        and not (
          ${table.lastErrorCode} is not null
          and ${table.readyAt} is not null
        )
      )`,
    ),
    check(
      "knowledge_sources_version_positive",
      sql`${table.version} >= 1`,
    ),
    uniqueIndex(
      "knowledge_sources_tenant_key_uq",
    ).on(table.tenantId, table.sourceKey),
    uniqueIndex(
      "knowledge_sources_tenant_digest_uq",
    ).on(table.tenantId, table.contentSha256),
    uniqueIndex(
      "knowledge_sources_storage_key_uq",
    ).on(table.storageObjectKey),
    index(
      "knowledge_sources_tenant_status_updated_idx",
    ).on(
      table.tenantId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const knowledgePassages = sqliteTable(
  "knowledge_passages",
  {
    passageKey: text("passage_key").primaryKey(),
    tenantId: integer("tenant_id").notNull(),
    sourceKey: text("source_key").notNull(),
    passageOrdinal: integer(
      "passage_ordinal",
    ).notNull(),
    contentSha256: text(
      "content_sha256",
    ).notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "knowledge_passages_key_sha256",
      sql`length(${table.passageKey}) = 85
        and substr(${table.passageKey}, 1, 21) = 'knowledge_passage_v1_'
        and substr(${table.passageKey}, 22) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "knowledge_passages_source_key_sha256",
      sql`length(${table.sourceKey}) = 84
        and substr(${table.sourceKey}, 1, 20) = 'knowledge_source_v1_'
        and substr(${table.sourceKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "knowledge_passages_ordinal_positive",
      sql`${table.passageOrdinal} >= 1`,
    ),
    check(
      "knowledge_passages_digest_sha256",
      sql`length(${table.contentSha256}) = 64
        and ${table.contentSha256} not glob '*[^0-9a-f]*'`,
    ),
    check(
      "knowledge_passages_content_bounded",
      sql`length(trim(${table.content})) between 1 and 16384`,
    ),
    uniqueIndex(
      "knowledge_passages_tenant_key_uq",
    ).on(table.tenantId, table.passageKey),
    uniqueIndex(
      "knowledge_passages_tenant_source_ordinal_uq",
    ).on(
      table.tenantId,
      table.sourceKey,
      table.passageOrdinal,
    ),
    index(
      "knowledge_passages_tenant_source_idx",
    ).on(
      table.tenantId,
      table.sourceKey,
      table.passageOrdinal,
    ),
    foreignKey({
      name: "knowledge_passages_tenant_source_fk",
      columns: [
        table.tenantId,
        table.sourceKey,
      ],
      foreignColumns: [
        knowledgeSources.tenantId,
        knowledgeSources.sourceKey,
      ],
    }).onDelete("cascade"),
  ],
);

export const aiAgents = sqliteTable(
  "ai_agents",
  {
    aiAgentKey: text("ai_agent_key").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),
    name: text("name").notNull(),
    status: text("status", {
      enum: aiAgentStatuses,
    })
      .notNull()
      .default("draft"),
    latestVersionKey: text(
      "latest_version_key",
    ).notNull(),
    latestVersionNumber: integer(
      "latest_version_number",
    ).notNull(),
    activeVersionKey: text("active_version_key"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "ai_agents_key_sha256",
      sql`length(${table.aiAgentKey}) = 76
        and substr(${table.aiAgentKey}, 1, 12) = 'ai_agent_v1_'
        and substr(${table.aiAgentKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_agents_name_bounded",
      sql`length(trim(${table.name})) between 1 and 160`,
    ),
    check(
      "ai_agents_status_valid",
      sql`${table.status} in ('draft', 'active', 'inactive')`,
    ),
    check(
      "ai_agents_latest_version_key_sha256",
      sql`length(${table.latestVersionKey}) = 84
        and substr(${table.latestVersionKey}, 1, 20) = 'ai_agent_version_v1_'
        and substr(${table.latestVersionKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_agents_active_version_key_sha256",
      sql`${table.activeVersionKey} is null
        or (
          length(${table.activeVersionKey}) = 84
          and substr(${table.activeVersionKey}, 1, 20) = 'ai_agent_version_v1_'
          and substr(${table.activeVersionKey}, 21) not glob '*[^0-9a-f]*'
        )`,
    ),
    check(
      "ai_agents_active_state_consistent",
      sql`(
        ${table.status} = 'draft'
        and ${table.activeVersionKey} is null
      ) or (
        ${table.status} in ('active', 'inactive')
        and ${table.activeVersionKey} is not null
      )`,
    ),
    check(
      "ai_agents_latest_version_positive",
      sql`${table.latestVersionNumber} >= 1`,
    ),
    check(
      "ai_agents_version_positive",
      sql`${table.version} >= 1`,
    ),
    uniqueIndex("ai_agents_tenant_key_uq").on(
      table.tenantId,
      table.aiAgentKey,
    ),
    index(
      "ai_agents_tenant_status_updated_idx",
    ).on(
      table.tenantId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export const aiAgentVersions = sqliteTable(
  "ai_agent_versions",
  {
    aiAgentVersionKey: text(
      "ai_agent_version_key",
    ).primaryKey(),
    aiAgentKey: text("ai_agent_key").notNull(),
    tenantId: integer("tenant_id").notNull(),
    versionNumber: integer(
      "version_number",
    ).notNull(),
    status: text("status", {
      enum: aiAgentVersionStatuses,
    })
      .notNull()
      .default("draft"),
    definitionJson: text(
      "definition_json",
    ).notNull(),
    publishedAt: text("published_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "ai_agent_versions_key_sha256",
      sql`length(${table.aiAgentVersionKey}) = 84
        and substr(${table.aiAgentVersionKey}, 1, 20) = 'ai_agent_version_v1_'
        and substr(${table.aiAgentVersionKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_agent_versions_agent_key_sha256",
      sql`length(${table.aiAgentKey}) = 76
        and substr(${table.aiAgentKey}, 1, 12) = 'ai_agent_v1_'
        and substr(${table.aiAgentKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_agent_versions_number_positive",
      sql`${table.versionNumber} >= 1`,
    ),
    check(
      "ai_agent_versions_status_valid",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
    check(
      "ai_agent_versions_definition_json_valid",
      sql`length(${table.definitionJson}) between 2 and 1000000
        and json_valid(${table.definitionJson})`,
    ),
    check(
      "ai_agent_versions_publication_consistent",
      sql`(
        ${table.status} = 'draft'
        and ${table.publishedAt} is null
      ) or (
        ${table.status} in ('published', 'archived')
        and ${table.publishedAt} is not null
      )`,
    ),
    uniqueIndex(
      "ai_agent_versions_tenant_key_uq",
    ).on(
      table.tenantId,
      table.aiAgentVersionKey,
    ),
    uniqueIndex(
      "ai_agent_versions_tenant_number_uq",
    ).on(
      table.tenantId,
      table.aiAgentKey,
      table.versionNumber,
    ),
    uniqueIndex(
      "ai_agent_versions_one_published_uq",
    )
      .on(table.tenantId, table.aiAgentKey)
      .where(sql`${table.status} = 'published'`),
    index(
      "ai_agent_versions_tenant_agent_idx",
    ).on(
      table.tenantId,
      table.aiAgentKey,
      table.versionNumber,
    ),
    foreignKey({
      name: "ai_agent_versions_tenant_agent_fk",
      columns: [
        table.tenantId,
        table.aiAgentKey,
      ],
      foreignColumns: [
        aiAgents.tenantId,
        aiAgents.aiAgentKey,
      ],
    }).onDelete("cascade"),
  ],
);

export const aiAgentVersionSources = sqliteTable(
  "ai_agent_version_sources",
  {
    tenantId: integer("tenant_id").notNull(),
    aiAgentVersionKey: text(
      "ai_agent_version_key",
    ).notNull(),
    sourceKey: text("source_key").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({
      name: "ai_agent_version_sources_pk",
      columns: [
        table.aiAgentVersionKey,
        table.sourceKey,
      ],
    }),
    index(
      "ai_agent_version_sources_tenant_version_idx",
    ).on(
      table.tenantId,
      table.aiAgentVersionKey,
    ),
    index(
      "ai_agent_version_sources_tenant_source_idx",
    ).on(table.tenantId, table.sourceKey),
    foreignKey({
      name: "ai_agent_version_sources_version_fk",
      columns: [
        table.tenantId,
        table.aiAgentVersionKey,
      ],
      foreignColumns: [
        aiAgentVersions.tenantId,
        aiAgentVersions.aiAgentVersionKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "ai_agent_version_sources_source_fk",
      columns: [
        table.tenantId,
        table.sourceKey,
      ],
      foreignColumns: [
        knowledgeSources.tenantId,
        knowledgeSources.sourceKey,
      ],
    }).onDelete("restrict"),
  ],
);

export const conversations = sqliteTable(
  "conversations",
  {
    conversationKey: text("conversation_key").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contactId: integer("contact_id").notNull(),
    status: text("status", {
      enum: conversationStatuses,
    })
      .notNull()
      .default("new"),
    assignedExternalUserId: text(
      "assigned_external_user_id",
    ),
    unreadCount: integer("unread_count")
      .notNull()
      .default(0),
    lastMessageKey: text("last_message_key"),
    lastMessageAt: text("last_message_at"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "conversations_key_sha256",
      sql`length(${table.conversationKey}) = 80
        and substr(${table.conversationKey}, 1, 16) = 'conversation_v1_'
        and substr(${table.conversationKey}, 17) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "conversations_status_valid",
      sql`${table.status} in ('new', 'bot_active', 'waiting_for_agent', 'agent_active', 'waiting_for_contact', 'closed')`,
    ),
    check(
      "conversations_assignee_bounded",
      sql`${table.assignedExternalUserId} is null
        or length(trim(${table.assignedExternalUserId})) between 1 and 255`,
    ),
    check(
      "conversations_unread_count_nonnegative",
      sql`${table.unreadCount} >= 0`,
    ),
    check(
      "conversations_last_message_key_valid",
      sql`${table.lastMessageKey} is null
        or (
          length(${table.lastMessageKey}) = 75
          and substr(${table.lastMessageKey}, 1, 11) = 'message_v1_'
          and substr(${table.lastMessageKey}, 12) not glob '*[^0-9a-f]*'
        )`,
    ),
    check(
      "conversations_last_message_at_valid",
      sql`${table.lastMessageAt} is null
        or (
          length(${table.lastMessageAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.lastMessageAt})
            = ${table.lastMessageAt}
        )`,
    ),
    check(
      "conversations_last_message_pair_consistent",
      sql`(
        ${table.lastMessageKey} is null
        and ${table.lastMessageAt} is null
      ) or (
        ${table.lastMessageKey} is not null
        and ${table.lastMessageAt} is not null
      )`,
    ),
    check(
      "conversations_version_positive",
      sql`${table.version} >= 1`,
    ),
    uniqueIndex("conversations_tenant_key_uq").on(
      table.tenantId,
      table.conversationKey,
    ),
    uniqueIndex("conversations_tenant_contact_uq").on(
      table.tenantId,
      table.contactId,
    ),
    index("conversations_tenant_status_activity_idx").on(
      table.tenantId,
      table.status,
      table.lastMessageAt,
    ),
    foreignKey({
      name: "conversations_tenant_contact_fk",
      columns: [table.tenantId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.id],
    }).onDelete("cascade"),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    messageKey: text("message_key").primaryKey(),
    conversationKey: text("conversation_key").notNull(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    providerMessageId: text("provider_message_id").notNull(),
    direction: text("direction", {
      enum: messageDirections,
    }).notNull(),
    contentKind: text("content_kind", {
      enum: messageContentKinds,
    }).notNull(),
    status: text("status", {
      enum: messageStatuses,
    }).notNull(),
    textContent: text("text_content"),
    occurredAt: text("occurred_at").notNull(),
    statusUpdatedAt: text("status_updated_at").notNull(),
    lastStatusEventKey: text("last_status_event_key"),
    lastStatusEventAt: text("last_status_event_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "messages_key_sha256",
      sql`length(${table.messageKey}) = 75
        and substr(${table.messageKey}, 1, 11) = 'message_v1_'
        and substr(${table.messageKey}, 12) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "messages_conversation_key_sha256",
      sql`length(${table.conversationKey}) = 80
        and substr(${table.conversationKey}, 1, 16) = 'conversation_v1_'
        and substr(${table.conversationKey}, 17) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "messages_provider_id_bounded",
      sql`length(trim(${table.providerMessageId})) between 1 and 255`,
    ),
    check(
      "messages_direction_valid",
      sql`${table.direction} in ('inbound', 'outbound')`,
    ),
    check(
      "messages_content_kind_valid",
      sql`${table.contentKind} in ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts', 'interactive', 'unsupported')`,
    ),
    check(
      "messages_status_valid",
      sql`${table.status} in ('received', 'sent', 'delivered', 'read', 'failed')`,
    ),
    check(
      "messages_direction_status_consistent",
      sql`(
        ${table.direction} = 'inbound'
        and ${table.status} = 'received'
      ) or (
        ${table.direction} = 'outbound'
        and ${table.status} in ('sent', 'delivered', 'read', 'failed')
      )`,
    ),
    check(
      "messages_content_consistent",
      sql`(
        ${table.contentKind} = 'text'
        and ${table.textContent} is not null
        and length(trim(${table.textContent})) between 1 and 16384
      ) or (
        ${table.contentKind} <> 'text'
        and ${table.textContent} is null
      )`,
    ),
    check(
      "messages_occurred_at_valid",
      sql`length(${table.occurredAt}) = 24
        and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.occurredAt})
          = ${table.occurredAt}`,
    ),
    check(
      "messages_status_updated_at_valid",
      sql`length(${table.statusUpdatedAt}) = 24
        and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.statusUpdatedAt})
          = ${table.statusUpdatedAt}`,
    ),
    check(
      "messages_status_event_key_valid",
      sql`${table.lastStatusEventKey} is null
        or (
          length(${table.lastStatusEventKey}) = 64
          and ${table.lastStatusEventKey} not glob '*[^0-9a-f]*'
        )`,
    ),
    check(
      "messages_status_event_at_valid",
      sql`${table.lastStatusEventAt} is null
        or (
          length(${table.lastStatusEventAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.lastStatusEventAt})
            = ${table.lastStatusEventAt}
        )`,
    ),
    check(
      "messages_status_event_pair_consistent",
      sql`(
        ${table.lastStatusEventKey} is null
        and ${table.lastStatusEventAt} is null
      ) or (
        ${table.lastStatusEventKey} is not null
        and ${table.lastStatusEventAt} is not null
      )`,
    ),
    uniqueIndex("messages_tenant_key_uq").on(
      table.tenantId,
      table.messageKey,
    ),
    uniqueIndex("messages_tenant_provider_id_uq").on(
      table.tenantId,
      table.providerMessageId,
    ),
    index("messages_tenant_conversation_time_idx").on(
      table.tenantId,
      table.conversationKey,
      table.occurredAt,
      table.messageKey,
    ),
    foreignKey({
      name: "messages_tenant_conversation_fk",
      columns: [table.tenantId, table.conversationKey],
      foreignColumns: [
        conversations.tenantId,
        conversations.conversationKey,
      ],
    }).onDelete("cascade"),
  ],
);

export const aiRuntimeCostAuthorizations =
  sqliteTable(
    "ai_runtime_cost_authorizations",
    {
      requestKey: text("request_key").primaryKey(),
      tenantId: integer("tenant_id")
        .notNull()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),
      aiAgentKey: text("ai_agent_key").notNull(),
      periodStart: text("period_start").notNull(),
      monthlyLimitMinorUnits: integer(
        "monthly_limit_minor_units",
      ).notNull(),
      currency: text("currency").notNull(),
      createdAt: text("created_at")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    },
    (table) => [
      check(
        "ai_runtime_cost_authorizations_request_key_sha256",
        sql`length(${table.requestKey}) = 87
          and substr(${table.requestKey}, 1, 23) = 'ai_provider_request_v1_'
          and substr(${table.requestKey}, 24) not glob '*[^0-9a-f]*'`,
      ),
      check(
        "ai_runtime_cost_authorizations_period_start_valid",
        sql`length(${table.periodStart}) = 10
          and strftime('%Y-%m-01', ${table.periodStart}) = ${table.periodStart}`,
      ),
      check(
        "ai_runtime_cost_authorizations_limit_positive",
        sql`${table.monthlyLimitMinorUnits} between 1 and 9007199254740991`,
      ),
      check(
        "ai_runtime_cost_authorizations_currency_valid",
        sql`length(${table.currency}) = 3
          and ${table.currency} not glob '*[^A-Z]*'`,
      ),
      uniqueIndex(
        "ai_runtime_cost_authorizations_tenant_request_uq",
      ).on(table.tenantId, table.requestKey),
      index(
        "ai_runtime_cost_authorizations_tenant_agent_period_idx",
      ).on(
        table.tenantId,
        table.aiAgentKey,
        table.periodStart,
      ),
      foreignKey({
        name: "ai_runtime_cost_authorizations_tenant_agent_fk",
        columns: [table.tenantId, table.aiAgentKey],
        foreignColumns: [
          aiAgents.tenantId,
          aiAgents.aiAgentKey,
        ],
      }).onDelete("cascade"),
    ],
  );

export const aiRuntimeUsage = sqliteTable(
  "ai_runtime_usage",
  {
    requestKey: text("request_key").primaryKey(),
    tenantId: integer("tenant_id").notNull(),
    aiAgentKey: text("ai_agent_key").notNull(),
    periodStart: text("period_start").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    costMinorUnits: integer(
      "cost_minor_units",
    ).notNull(),
    currency: text("currency").notNull(),
    withinLimit: integer("within_limit", {
      mode: "boolean",
    }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "ai_runtime_usage_request_key_sha256",
      sql`length(${table.requestKey}) = 87
        and substr(${table.requestKey}, 1, 23) = 'ai_provider_request_v1_'
        and substr(${table.requestKey}, 24) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_runtime_usage_period_start_valid",
      sql`length(${table.periodStart}) = 10
        and strftime('%Y-%m-01', ${table.periodStart}) = ${table.periodStart}`,
    ),
    check(
      "ai_runtime_usage_input_tokens_nonnegative",
      sql`${table.inputTokens} between 0 and 9007199254740991`,
    ),
    check(
      "ai_runtime_usage_output_tokens_positive",
      sql`${table.outputTokens} between 1 and 9007199254740991`,
    ),
    check(
      "ai_runtime_usage_cost_nonnegative",
      sql`${table.costMinorUnits} between 0 and 9007199254740991`,
    ),
    check(
      "ai_runtime_usage_currency_valid",
      sql`length(${table.currency}) = 3
        and ${table.currency} not glob '*[^A-Z]*'`,
    ),
    check(
      "ai_runtime_usage_within_limit_boolean",
      sql`${table.withinLimit} in (0, 1)`,
    ),
    uniqueIndex(
      "ai_runtime_usage_tenant_request_uq",
    ).on(table.tenantId, table.requestKey),
    index(
      "ai_runtime_usage_tenant_agent_period_idx",
    ).on(
      table.tenantId,
      table.aiAgentKey,
      table.periodStart,
    ),
    foreignKey({
      name: "ai_runtime_usage_authorization_fk",
      columns: [table.tenantId, table.requestKey],
      foreignColumns: [
        aiRuntimeCostAuthorizations.tenantId,
        aiRuntimeCostAuthorizations.requestKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "ai_runtime_usage_tenant_agent_fk",
      columns: [table.tenantId, table.aiAgentKey],
      foreignColumns: [
        aiAgents.tenantId,
        aiAgents.aiAgentKey,
      ],
    }).onDelete("cascade"),
  ],
);

export const aiRuntimeAuditEvents = sqliteTable(
  "ai_runtime_audit_events",
  {
    auditKey: text("audit_key").primaryKey(),
    requestKey: text("request_key").notNull(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),
    conversationKey: text(
      "conversation_key",
    ).notNull(),
    inboundMessageKey: text(
      "inbound_message_key",
    ).notNull(),
    aiAgentKey: text("ai_agent_key").notNull(),
    aiAgentVersionKey: text(
      "ai_agent_version_key",
    ).notNull(),
    expectedConversationVersion: integer(
      "expected_conversation_version",
    ).notNull(),
    outcome: text("outcome", {
      enum: aiRuntimeAuditOutcomes,
    }).notNull(),
    reason: text("reason", {
      enum: aiRuntimeHandoffReasons,
    }),
    responseMode: text("response_mode").notNull(),
    groundingScoreBasisPoints: integer(
      "grounding_score_basis_points",
    ),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costMinorUnits: integer(
      "cost_minor_units",
    ),
    currency: text("currency").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "ai_runtime_audit_events_audit_key_sha256",
      sql`length(${table.auditKey}) = 84
        and substr(${table.auditKey}, 1, 20) = 'ai_runtime_audit_v1_'
        and substr(${table.auditKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_runtime_audit_events_request_key_sha256",
      sql`length(${table.requestKey}) = 87
        and substr(${table.requestKey}, 1, 23) = 'ai_provider_request_v1_'
        and substr(${table.requestKey}, 24) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_runtime_audit_events_conversation_key_sha256",
      sql`length(${table.conversationKey}) = 80
        and substr(${table.conversationKey}, 1, 16) = 'conversation_v1_'
        and substr(${table.conversationKey}, 17) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_runtime_audit_events_message_key_sha256",
      sql`length(${table.inboundMessageKey}) = 75
        and substr(${table.inboundMessageKey}, 1, 11) = 'message_v1_'
        and substr(${table.inboundMessageKey}, 12) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_runtime_audit_events_agent_key_sha256",
      sql`length(${table.aiAgentKey}) = 76
        and substr(${table.aiAgentKey}, 1, 12) = 'ai_agent_v1_'
        and substr(${table.aiAgentKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_runtime_audit_events_version_key_sha256",
      sql`length(${table.aiAgentVersionKey}) = 84
        and substr(${table.aiAgentVersionKey}, 1, 20) = 'ai_agent_version_v1_'
        and substr(${table.aiAgentVersionKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_runtime_audit_events_expected_version_positive",
      sql`${table.expectedConversationVersion} >= 1`,
    ),
    check(
      "ai_runtime_audit_events_outcome_valid",
      sql`${table.outcome} in ('reply-planned', 'handoff')`,
    ),
    check(
      "ai_runtime_audit_events_reason_valid",
      sql`${table.reason} is null
        or ${table.reason} in (
          'customer-request',
          'no-approved-knowledge',
          'grounding-below-threshold',
          'provider-unavailable',
          'budget-exhausted',
          'policy-violation'
        )`,
    ),
    check(
      "ai_runtime_audit_events_response_mode_valid",
      sql`${table.responseMode} in ('automatic', 'agent-approval')`,
    ),
    check(
      "ai_runtime_audit_events_grounding_valid",
      sql`${table.groundingScoreBasisPoints} is null
        or ${table.groundingScoreBasisPoints} between 0 and 10000`,
    ),
    check(
      "ai_runtime_audit_events_usage_valid",
      sql`(
        ${table.inputTokens} is null
        and ${table.outputTokens} is null
        and ${table.costMinorUnits} is null
      ) or (
        ${table.inputTokens} between 0 and 9007199254740991
        and ${table.outputTokens} between 1 and 9007199254740991
        and ${table.costMinorUnits} between 0 and 9007199254740991
      )`,
    ),
    check(
      "ai_runtime_audit_events_currency_valid",
      sql`length(${table.currency}) = 3
        and ${table.currency} not glob '*[^A-Z]*'`,
    ),
    check(
      "ai_runtime_audit_events_state_consistent",
      sql`(
        ${table.outcome} = 'reply-planned'
        and ${table.reason} is null
        and ${table.groundingScoreBasisPoints} is not null
        and ${table.inputTokens} is not null
      ) or (
        ${table.outcome} = 'handoff'
        and ${table.reason} is not null
      )`,
    ),
    uniqueIndex(
      "ai_runtime_audit_events_tenant_audit_uq",
    ).on(table.tenantId, table.auditKey),
    uniqueIndex(
      "ai_runtime_audit_events_tenant_request_uq",
    ).on(table.tenantId, table.requestKey),
    index(
      "ai_runtime_audit_events_tenant_conversation_created_idx",
    ).on(
      table.tenantId,
      table.conversationKey,
      table.createdAt,
    ),
    index(
      "ai_runtime_audit_events_tenant_agent_created_idx",
    ).on(
      table.tenantId,
      table.aiAgentKey,
      table.createdAt,
    ),
    foreignKey({
      name: "ai_runtime_audit_events_tenant_conversation_fk",
      columns: [
        table.tenantId,
        table.conversationKey,
      ],
      foreignColumns: [
        conversations.tenantId,
        conversations.conversationKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "ai_runtime_audit_events_tenant_message_fk",
      columns: [
        table.tenantId,
        table.inboundMessageKey,
      ],
      foreignColumns: [
        messages.tenantId,
        messages.messageKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "ai_runtime_audit_events_tenant_agent_fk",
      columns: [table.tenantId, table.aiAgentKey],
      foreignColumns: [
        aiAgents.tenantId,
        aiAgents.aiAgentKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "ai_runtime_audit_events_tenant_version_fk",
      columns: [
        table.tenantId,
        table.aiAgentVersionKey,
      ],
      foreignColumns: [
        aiAgentVersions.tenantId,
        aiAgentVersions.aiAgentVersionKey,
      ],
    }).onDelete("cascade"),
  ],
);

export const aiReplyOutbox = sqliteTable(
  "ai_reply_outbox",
  {
    outboxKey: text("outbox_key").primaryKey(),
    requestKey: text("request_key").notNull(),
    auditKey: text("audit_key").notNull(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),
    conversationKey: text(
      "conversation_key",
    ).notNull(),
    inboundMessageKey: text(
      "inbound_message_key",
    ).notNull(),
    aiAgentKey: text("ai_agent_key").notNull(),
    aiAgentVersionKey: text(
      "ai_agent_version_key",
    ).notNull(),
    expectedConversationVersion: integer(
      "expected_conversation_version",
    ).notNull(),
    recipientPhoneE164: text(
      "recipient_phone_e164",
    ).notNull(),
    responseMode: text("response_mode").notNull(),
    replyText: text("reply_text").notNull(),
    groundedSourceKeysJson: text(
      "grounded_source_keys_json",
    ).notNull(),
    groundingScoreBasisPoints: integer(
      "grounding_score_basis_points",
    ).notNull(),
    status: text("status", {
      enum: aiReplyOutboxStatuses,
    }).notNull(),
    decidedByExternalUserId: text(
      "decided_by_external_user_id",
    ),
    decidedAt: text("decided_at"),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "ai_reply_outbox_key_sha256",
      sql`length(${table.outboxKey}) = 83
        and substr(${table.outboxKey}, 1, 19) = 'ai_reply_outbox_v1_'
        and substr(${table.outboxKey}, 20) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_reply_outbox_request_key_sha256",
      sql`length(${table.requestKey}) = 87
        and substr(${table.requestKey}, 1, 23) = 'ai_provider_request_v1_'
        and substr(${table.requestKey}, 24) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_reply_outbox_audit_key_sha256",
      sql`length(${table.auditKey}) = 84
        and substr(${table.auditKey}, 1, 20) = 'ai_runtime_audit_v1_'
        and substr(${table.auditKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_reply_outbox_conversation_key_sha256",
      sql`length(${table.conversationKey}) = 80
        and substr(${table.conversationKey}, 1, 16) = 'conversation_v1_'
        and substr(${table.conversationKey}, 17) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_reply_outbox_message_key_sha256",
      sql`length(${table.inboundMessageKey}) = 75
        and substr(${table.inboundMessageKey}, 1, 11) = 'message_v1_'
        and substr(${table.inboundMessageKey}, 12) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_reply_outbox_agent_key_sha256",
      sql`length(${table.aiAgentKey}) = 76
        and substr(${table.aiAgentKey}, 1, 12) = 'ai_agent_v1_'
        and substr(${table.aiAgentKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_reply_outbox_version_key_sha256",
      sql`length(${table.aiAgentVersionKey}) = 84
        and substr(${table.aiAgentVersionKey}, 1, 20) = 'ai_agent_version_v1_'
        and substr(${table.aiAgentVersionKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "ai_reply_outbox_expected_version_positive",
      sql`${table.expectedConversationVersion} >= 1`,
    ),
    check(
      "ai_reply_outbox_phone_valid",
      sql`length(${table.recipientPhoneE164}) between 2 and 16
        and substr(${table.recipientPhoneE164}, 1, 1) = '+'
        and substr(${table.recipientPhoneE164}, 2, 1) between '1' and '9'
        and substr(${table.recipientPhoneE164}, 2) not glob '*[^0-9]*'`,
    ),
    check(
      "ai_reply_outbox_response_mode_valid",
      sql`${table.responseMode} in ('automatic', 'agent-approval')`,
    ),
    check(
      "ai_reply_outbox_reply_text_bounded",
      sql`length(trim(${table.replyText})) between 1 and 4096`,
    ),
    check(
      "ai_reply_outbox_sources_json_valid",
      sql`length(${table.groundedSourceKeysJson}) between 2 and 100000
        and json_valid(${table.groundedSourceKeysJson})
        and json_type(${table.groundedSourceKeysJson}) = 'array'
        and json_array_length(${table.groundedSourceKeysJson}) between 1 and 100`,
    ),
    check(
      "ai_reply_outbox_grounding_valid",
      sql`${table.groundingScoreBasisPoints} between 0 and 10000`,
    ),
    check(
      "ai_reply_outbox_status_valid",
      sql`${table.status} in ('awaiting-approval', 'ready-for-delivery', 'rejected')`,
    ),
    check(
      "ai_reply_outbox_decider_bounded",
      sql`${table.decidedByExternalUserId} is null
        or length(trim(${table.decidedByExternalUserId})) between 1 and 255`,
    ),
    check(
      "ai_reply_outbox_version_positive",
      sql`${table.version} >= 1`,
    ),
    check(
      "ai_reply_outbox_state_consistent",
      sql`(
        ${table.responseMode} = 'automatic'
        and ${table.status} = 'ready-for-delivery'
        and ${table.decidedByExternalUserId} is null
        and ${table.decidedAt} is null
        and ${table.version} = 1
      ) or (
        ${table.responseMode} = 'agent-approval'
        and ${table.status} = 'awaiting-approval'
        and ${table.decidedByExternalUserId} is null
        and ${table.decidedAt} is null
        and ${table.version} = 1
      ) or (
        ${table.responseMode} = 'agent-approval'
        and ${table.status} in ('ready-for-delivery', 'rejected')
        and ${table.decidedByExternalUserId} is not null
        and ${table.decidedAt} is not null
        and ${table.version} >= 2
      )`,
    ),
    uniqueIndex(
      "ai_reply_outbox_tenant_key_uq",
    ).on(table.tenantId, table.outboxKey),
    uniqueIndex(
      "ai_reply_outbox_tenant_request_uq",
    ).on(table.tenantId, table.requestKey),
    uniqueIndex(
      "ai_reply_outbox_tenant_inbound_uq",
    ).on(
      table.tenantId,
      table.inboundMessageKey,
    ),
    index(
      "ai_reply_outbox_tenant_status_created_idx",
    ).on(
      table.tenantId,
      table.status,
      table.createdAt,
    ),
    foreignKey({
      name: "ai_reply_outbox_tenant_audit_fk",
      columns: [
        table.tenantId,
        table.auditKey,
      ],
      foreignColumns: [
        aiRuntimeAuditEvents.tenantId,
        aiRuntimeAuditEvents.auditKey,
      ],
    }).onDelete("cascade"),
  ],
);

export const botReplyDeliveries = sqliteTable(
  "bot_reply_deliveries",
  {
    deliveryKey: text("delivery_key").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id, {
        onDelete: "cascade",
      }),
    conversationKey: text(
      "conversation_key",
    ).notNull(),
    inboundMessageKey: text(
      "inbound_message_key",
    ).notNull(),
    botFlowKey: text("bot_flow_key").notNull(),
    botFlowVersionKey: text(
      "bot_flow_version_key",
    ).notNull(),
    replyIndex: integer("reply_index").notNull(),
    recipientPhoneE164: text(
      "recipient_phone_e164",
    ).notNull(),
    replyJson: text("reply_json").notNull(),
    status: text("status", {
      enum: botReplyDeliveryStatuses,
    })
      .notNull()
      .default("pending"),
    attemptCount: integer("attempt_count")
      .notNull()
      .default(0),
    providerMessageId: text(
      "provider_message_id",
    ),
    lastErrorCode: text("last_error_code"),
    acceptedAt: text("accepted_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "bot_reply_deliveries_key_sha256",
      sql`length(${table.deliveryKey}) = 86
        and substr(${table.deliveryKey}, 1, 22) = 'bot_reply_delivery_v1_'
        and substr(${table.deliveryKey}, 23) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_reply_deliveries_conversation_key_sha256",
      sql`length(${table.conversationKey}) = 80
        and substr(${table.conversationKey}, 1, 16) = 'conversation_v1_'
        and substr(${table.conversationKey}, 17) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_reply_deliveries_inbound_key_sha256",
      sql`length(${table.inboundMessageKey}) = 75
        and substr(${table.inboundMessageKey}, 1, 11) = 'message_v1_'
        and substr(${table.inboundMessageKey}, 12) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_reply_deliveries_flow_key_sha256",
      sql`length(${table.botFlowKey}) = 76
        and substr(${table.botFlowKey}, 1, 12) = 'bot_flow_v1_'
        and substr(${table.botFlowKey}, 13) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_reply_deliveries_version_key_sha256",
      sql`length(${table.botFlowVersionKey}) = 84
        and substr(${table.botFlowVersionKey}, 1, 20) = 'bot_flow_version_v1_'
        and substr(${table.botFlowVersionKey}, 21) not glob '*[^0-9a-f]*'`,
    ),
    check(
      "bot_reply_deliveries_reply_index_positive",
      sql`${table.replyIndex} >= 1`,
    ),
    check(
      "bot_reply_deliveries_phone_valid",
      sql`length(${table.recipientPhoneE164}) between 2 and 16
        and substr(${table.recipientPhoneE164}, 1, 1) = '+'
        and substr(${table.recipientPhoneE164}, 2, 1) between '1' and '9'
        and substr(${table.recipientPhoneE164}, 2) not glob '*[^0-9]*'`,
    ),
    check(
      "bot_reply_deliveries_reply_json_valid",
      sql`length(${table.replyJson}) between 2 and 50000
        and json_valid(${table.replyJson})`,
    ),
    check(
      "bot_reply_deliveries_status_valid",
      sql`${table.status} in ('pending', 'sending', 'accepted', 'rejected', 'ambiguous')`,
    ),
    check(
      "bot_reply_deliveries_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "bot_reply_deliveries_provider_id_bounded",
      sql`${table.providerMessageId} is null
        or length(trim(${table.providerMessageId})) between 1 and 255`,
    ),
    check(
      "bot_reply_deliveries_error_code_valid",
      sql`${table.lastErrorCode} is null
        or (
          length(${table.lastErrorCode}) between 1 and 100
          and ${table.lastErrorCode} not glob '*[^A-Z0-9_]*'
        )`,
    ),
    check(
      "bot_reply_deliveries_state_consistent",
      sql`(
        ${table.status} = 'pending'
        and ${table.attemptCount} = 0
        and ${table.providerMessageId} is null
        and ${table.lastErrorCode} is null
        and ${table.acceptedAt} is null
      ) or (
        ${table.status} = 'sending'
        and ${table.attemptCount} >= 1
        and ${table.providerMessageId} is null
        and ${table.lastErrorCode} is null
        and ${table.acceptedAt} is null
      ) or (
        ${table.status} = 'accepted'
        and ${table.attemptCount} >= 1
        and ${table.providerMessageId} is not null
        and ${table.lastErrorCode} is null
        and ${table.acceptedAt} is not null
      ) or (
        ${table.status} in ('rejected', 'ambiguous')
        and ${table.attemptCount} >= 1
        and ${table.providerMessageId} is null
        and ${table.lastErrorCode} is not null
        and ${table.acceptedAt} is null
      )`,
    ),
    uniqueIndex(
      "bot_reply_deliveries_tenant_key_uq",
    ).on(table.tenantId, table.deliveryKey),
    uniqueIndex(
      "bot_reply_deliveries_inbound_reply_uq",
    ).on(
      table.tenantId,
      table.inboundMessageKey,
      table.replyIndex,
    ),
    uniqueIndex(
      "bot_reply_deliveries_provider_id_uq",
    )
      .on(
        table.tenantId,
        table.providerMessageId,
      )
      .where(
        sql`${table.providerMessageId} is not null`,
      ),
    index(
      "bot_reply_deliveries_tenant_status_idx",
    ).on(
      table.tenantId,
      table.status,
      table.createdAt,
    ),
    foreignKey({
      name: "bot_reply_deliveries_conversation_fk",
      columns: [
        table.tenantId,
        table.conversationKey,
      ],
      foreignColumns: [
        conversations.tenantId,
        conversations.conversationKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "bot_reply_deliveries_inbound_message_fk",
      columns: [
        table.tenantId,
        table.inboundMessageKey,
      ],
      foreignColumns: [
        messages.tenantId,
        messages.messageKey,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "bot_reply_deliveries_flow_version_fk",
      columns: [
        table.tenantId,
        table.botFlowVersionKey,
      ],
      foreignColumns: [
        botFlowVersions.tenantId,
        botFlowVersions.botFlowVersionKey,
      ],
    }).onDelete("restrict"),
  ],
);

export const tenantSubscriptions =
  sqliteTable(
    "tenant_subscriptions",
    {
      tenantId: integer("tenant_id")
        .primaryKey()
        .references(() => tenants.id, {
          onDelete: "cascade",
        }),
      status: text("status", {
        enum: tenantStatuses,
      }).notNull(),
      startsAt: text("starts_at").notNull(),
      endsAt: text("ends_at").notNull(),
      cancelledAt: text("cancelled_at"),
      version: integer("version")
        .notNull()
        .default(1),
      createdAt: text("created_at")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
      updatedAt: text("updated_at")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    },
    (table) => [
      check(
        "tenant_subscriptions_status_valid",
        sql`${table.status} in ('trial', 'active', 'payment_failed', 'suspended', 'cancelled', 'expired', 'blocked')`,
      ),
      check(
        "tenant_subscriptions_starts_at_canonical",
        sql`length(${table.startsAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.startsAt})
            = ${table.startsAt}`,
      ),
      check(
        "tenant_subscriptions_ends_at_canonical",
        sql`length(${table.endsAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.endsAt})
            = ${table.endsAt}`,
      ),
      check(
        "tenant_subscriptions_window_valid",
        sql`unixepoch(${table.startsAt}) < unixepoch(${table.endsAt})`,
      ),
      check(
        "tenant_subscriptions_cancelled_at_canonical",
        sql`${table.cancelledAt} is null
          or (
            length(${table.cancelledAt}) = 24
            and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.cancelledAt})
              = ${table.cancelledAt}
          )`,
      ),
      check(
        "tenant_subscriptions_version_positive",
        sql`${table.version} >= 1`,
      ),
      check(
        "tenant_subscriptions_cancelled_state_consistent",
        sql`(
          ${table.status} = 'cancelled'
          and ${table.cancelledAt} is not null
        ) or (
          ${table.status} <> 'cancelled'
          and ${table.cancelledAt} is null
        )`,
      ),
      index(
        "tenant_subscriptions_status_ends_idx",
      ).on(table.status, table.endsAt),
    ],
  );

export const tenantSubscriptionEvents =
  sqliteTable(
    "tenant_subscription_events",
    {
      eventKey: text("event_key")
        .primaryKey(),
      tenantId: integer("tenant_id")
        .notNull()
        .references(
          () => tenantSubscriptions.tenantId,
          { onDelete: "cascade" },
        ),
      eventType: text("event_type", {
        enum: tenantSubscriptionEventTypes,
      }).notNull(),
      fromStatus: text("from_status", {
        enum: tenantStatuses,
      }),
      toStatus: text("to_status", {
        enum: tenantStatuses,
      }).notNull(),
      previousEndsAt: text(
        "previous_ends_at",
      ),
      newEndsAt: text(
        "new_ends_at",
      ).notNull(),
      actorExternalUserId: text(
        "actor_external_user_id",
      ).notNull(),
      subscriptionVersion: integer(
        "subscription_version",
      ).notNull(),
      occurredAt: text(
        "occurred_at",
      ).notNull(),
      createdAt: text("created_at")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    },
    (table) => [
      check(
        "tenant_subscription_events_key_sha256",
        sql`length(${table.eventKey}) = 93
          and substr(${table.eventKey}, 1, 29)
            = 'tenant_subscription_event_v1_'
          and substr(${table.eventKey}, 30)
            not glob '*[^0-9a-f]*'`,
      ),
      check(
        "tenant_subscription_events_type_valid",
        sql`${table.eventType} in ('created', 'extended', 'status-changed', 'cancelled')`,
      ),
      check(
        "tenant_subscription_events_status_valid",
        sql`${table.toStatus} in ('trial', 'active', 'payment_failed', 'suspended', 'cancelled', 'expired', 'blocked')
          and (
            ${table.fromStatus} is null
            or ${table.fromStatus} in ('trial', 'active', 'payment_failed', 'suspended', 'cancelled', 'expired', 'blocked')
          )`,
      ),
      check(
        "tenant_subscription_events_previous_end_canonical",
        sql`${table.previousEndsAt} is null
          or (
            length(${table.previousEndsAt}) = 24
            and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.previousEndsAt})
              = ${table.previousEndsAt}
          )`,
      ),
      check(
        "tenant_subscription_events_new_end_canonical",
        sql`length(${table.newEndsAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.newEndsAt})
            = ${table.newEndsAt}`,
      ),
      check(
        "tenant_subscription_events_actor_bounded",
        sql`length(trim(${table.actorExternalUserId})) between 1 and 255`,
      ),
      check(
        "tenant_subscription_events_version_positive",
        sql`${table.subscriptionVersion} >= 1`,
      ),
      check(
        "tenant_subscription_events_occurred_at_canonical",
        sql`length(${table.occurredAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.occurredAt})
            = ${table.occurredAt}`,
      ),
      check(
        "tenant_subscription_events_state_consistent",
        sql`(
          ${table.eventType} = 'created'
          and ${table.fromStatus} is null
          and ${table.toStatus} in ('trial', 'active')
          and ${table.previousEndsAt} is null
          and ${table.subscriptionVersion} = 1
        ) or (
          ${table.eventType} = 'extended'
          and ${table.fromStatus} = ${table.toStatus}
          and ${table.previousEndsAt} is not null
          and unixepoch(${table.previousEndsAt}) < unixepoch(${table.newEndsAt})
          and ${table.subscriptionVersion} >= 2
        ) or (
          ${table.eventType} = 'status-changed'
          and ${table.fromStatus} is not null
          and ${table.fromStatus} <> ${table.toStatus}
          and ${table.toStatus} in ('active', 'suspended', 'blocked')
          and ${table.previousEndsAt} = ${table.newEndsAt}
          and ${table.subscriptionVersion} >= 2
        ) or (
          ${table.eventType} = 'cancelled'
          and ${table.fromStatus} is not null
          and ${table.fromStatus} <> 'cancelled'
          and ${table.toStatus} = 'cancelled'
          and ${table.previousEndsAt} = ${table.newEndsAt}
          and ${table.subscriptionVersion} >= 2
        )`,
      ),
      uniqueIndex(
        "tenant_subscription_events_tenant_version_uq",
      ).on(
        table.tenantId,
        table.subscriptionVersion,
      ),
      index(
        "tenant_subscription_events_tenant_occurred_idx",
      ).on(table.tenantId, table.occurredAt),
    ],
  );

export const productionDecisionRecords =
  sqliteTable(
    "production_decision_records",
    {
      checkId: text("check_id")
        .primaryKey(),
      selection: text("selection")
        .notNull(),
      rationale: text("rationale")
        .notNull(),
      version: integer("version")
        .notNull()
        .default(1),
      lastEventKey: text(
        "last_event_key",
      ).notNull(),
      decidedByExternalUserId: text(
        "decided_by_external_user_id",
      ).notNull(),
      decidedAt: text("decided_at")
        .notNull(),
      updatedAt: text("updated_at")
        .notNull(),
    },
    (table) => [
      check(
        "production_decision_records_check_id_bounded",
        sql`length(trim(${table.checkId})) between 3 and 100
          and trim(${table.checkId}) = ${table.checkId}`,
      ),
      check(
        "production_decision_records_selection_bounded",
        sql`length(trim(${table.selection})) between 1 and 120
          and trim(${table.selection}) = ${table.selection}`,
      ),
      check(
        "production_decision_records_rationale_bounded",
        sql`length(trim(${table.rationale})) between 1 and 2000
          and trim(${table.rationale}) = ${table.rationale}`,
      ),
      check(
        "production_decision_records_version_positive",
        sql`${table.version} >= 1`,
      ),
      check(
        "production_decision_records_event_key_sha256",
        sql`length(${table.lastEventKey}) = 93
          and substr(${table.lastEventKey}, 1, 29)
            = 'production_decision_event_v1_'
          and substr(${table.lastEventKey}, 30)
            not glob '*[^0-9a-f]*'`,
      ),
      check(
        "production_decision_records_actor_bounded",
        sql`length(trim(${table.decidedByExternalUserId})) between 1 and 255
          and trim(${table.decidedByExternalUserId})
            = ${table.decidedByExternalUserId}`,
      ),
      check(
        "production_decision_records_decided_at_canonical",
        sql`length(${table.decidedAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.decidedAt})
            = ${table.decidedAt}`,
      ),
      check(
        "production_decision_records_updated_at_canonical",
        sql`length(${table.updatedAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.updatedAt})
            = ${table.updatedAt}`,
      ),
      index(
        "production_decision_records_updated_idx",
      ).on(table.updatedAt),
    ],
  );

export const productionDecisionEvents =
  sqliteTable(
    "production_decision_events",
    {
      eventKey: text("event_key")
        .primaryKey(),
      checkId: text("check_id")
        .notNull()
        .references(
          () =>
            productionDecisionRecords.checkId,
          { onDelete: "restrict" },
        ),
      eventType: text("event_type", {
        enum: productionDecisionEventTypes,
      })
        .notNull()
        .default("recorded"),
      selection: text("selection")
        .notNull(),
      rationale: text("rationale")
        .notNull(),
      actorExternalUserId: text(
        "actor_external_user_id",
      ).notNull(),
      decisionVersion: integer(
        "decision_version",
      ).notNull(),
      occurredAt: text("occurred_at")
        .notNull(),
      createdAt: text("created_at")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    },
    (table) => [
      check(
        "production_decision_events_key_sha256",
        sql`length(${table.eventKey}) = 93
          and substr(${table.eventKey}, 1, 29)
            = 'production_decision_event_v1_'
          and substr(${table.eventKey}, 30)
            not glob '*[^0-9a-f]*'`,
      ),
      check(
        "production_decision_events_type_valid",
        sql`${table.eventType} = 'recorded'`,
      ),
      check(
        "production_decision_events_selection_bounded",
        sql`length(trim(${table.selection})) between 1 and 120
          and trim(${table.selection}) = ${table.selection}`,
      ),
      check(
        "production_decision_events_rationale_bounded",
        sql`length(trim(${table.rationale})) between 1 and 2000
          and trim(${table.rationale}) = ${table.rationale}`,
      ),
      check(
        "production_decision_events_actor_bounded",
        sql`length(trim(${table.actorExternalUserId})) between 1 and 255
          and trim(${table.actorExternalUserId})
            = ${table.actorExternalUserId}`,
      ),
      check(
        "production_decision_events_version_positive",
        sql`${table.decisionVersion} >= 1`,
      ),
      check(
        "production_decision_events_occurred_at_canonical",
        sql`length(${table.occurredAt}) = 24
          and strftime('%Y-%m-%dT%H:%M:%fZ', ${table.occurredAt})
            = ${table.occurredAt}`,
      ),
      uniqueIndex(
        "production_decision_events_check_version_uq",
      ).on(
        table.checkId,
        table.decisionVersion,
      ),
      index(
        "production_decision_events_check_occurred_idx",
      ).on(
        table.checkId,
        table.occurredAt,
      ),
    ],
  );

export type TenantRow = typeof tenants.$inferSelect;
export type NewTenantRow = typeof tenants.$inferInsert;
export type TenantMembershipRow = typeof tenantMemberships.$inferSelect;
export type NewTenantMembershipRow = typeof tenantMemberships.$inferInsert;
export type TenantMembershipEventRow =
  typeof tenantMembershipEvents.$inferSelect;
export type NewTenantMembershipEventRow =
  typeof tenantMembershipEvents.$inferInsert;
export type TeamInvitationRow =
  typeof teamInvitations.$inferSelect;
export type NewTeamInvitationRow =
  typeof teamInvitations.$inferInsert;
export type TeamInvitationEventRow =
  typeof teamInvitationEvents.$inferSelect;
export type NewTeamInvitationEventRow =
  typeof teamInvitationEvents.$inferInsert;
export type TeamInvitationDeliveryRow =
  typeof teamInvitationDeliveries.$inferSelect;
export type NewTeamInvitationDeliveryRow =
  typeof teamInvitationDeliveries.$inferInsert;
export type BusinessProfileRow = typeof businessProfiles.$inferSelect;
export type NewBusinessProfileRow = typeof businessProfiles.$inferInsert;
export type MetaConnectionRow = typeof metaConnections.$inferSelect;
export type NewMetaConnectionRow = typeof metaConnections.$inferInsert;
export type MetaCredentialEnvelopeRow =
  typeof metaCredentialEnvelopes.$inferSelect;
export type NewMetaCredentialEnvelopeRow =
  typeof metaCredentialEnvelopes.$inferInsert;
export type MetaWebhookReceiptRow =
  typeof metaWebhookReceipts.$inferSelect;
export type NewMetaWebhookReceiptRow =
  typeof metaWebhookReceipts.$inferInsert;
export type MessageTemplateRow =
  typeof messageTemplates.$inferSelect;
export type NewMessageTemplateRow =
  typeof messageTemplates.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;
export type ContactConsentEventRow =
  typeof contactConsentEvents.$inferSelect;
export type NewContactConsentEventRow =
  typeof contactConsentEvents.$inferInsert;
export type ContactImportJobRow = typeof contactImportJobs.$inferSelect;
export type NewContactImportJobRow = typeof contactImportJobs.$inferInsert;
export type ContactImportRow = typeof contactImportRows.$inferSelect;
export type NewContactImportRow = typeof contactImportRows.$inferInsert;
export type ContactTagRow = typeof contactTags.$inferSelect;
export type NewContactTagRow = typeof contactTags.$inferInsert;
export type ContactListRow = typeof contactLists.$inferSelect;
export type NewContactListRow = typeof contactLists.$inferInsert;
export type ContactTagAssignmentRow =
  typeof contactTagAssignments.$inferSelect;
export type ContactListMembershipRow =
  typeof contactListMemberships.$inferSelect;
export type ConversationRow =
  typeof conversations.$inferSelect;
export type NewConversationRow =
  typeof conversations.$inferInsert;
export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
export type BotFlowRow = typeof botFlows.$inferSelect;
export type NewBotFlowRow = typeof botFlows.$inferInsert;
export type BotFlowVersionRow =
  typeof botFlowVersions.$inferSelect;
export type NewBotFlowVersionRow =
  typeof botFlowVersions.$inferInsert;
export type BotReplyDeliveryRow =
  typeof botReplyDeliveries.$inferSelect;
export type NewBotReplyDeliveryRow =
  typeof botReplyDeliveries.$inferInsert;
export type KnowledgeSourceRow =
  typeof knowledgeSources.$inferSelect;
export type NewKnowledgeSourceRow =
  typeof knowledgeSources.$inferInsert;
export type KnowledgePassageRow =
  typeof knowledgePassages.$inferSelect;
export type NewKnowledgePassageRow =
  typeof knowledgePassages.$inferInsert;
export type AiReplyOutboxRow =
  typeof aiReplyOutbox.$inferSelect;
export type NewAiReplyOutboxRow =
  typeof aiReplyOutbox.$inferInsert;
export type AiAgentRow =
  typeof aiAgents.$inferSelect;
export type NewAiAgentRow =
  typeof aiAgents.$inferInsert;
export type AiAgentVersionRow =
  typeof aiAgentVersions.$inferSelect;
export type NewAiAgentVersionRow =
  typeof aiAgentVersions.$inferInsert;
export type AiAgentVersionSourceRow =
  typeof aiAgentVersionSources.$inferSelect;
export type TenantSubscriptionRow =
  typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscriptionRow =
  typeof tenantSubscriptions.$inferInsert;
export type TenantSubscriptionEventRow =
  typeof tenantSubscriptionEvents.$inferSelect;
export type NewTenantSubscriptionEventRow =
  typeof tenantSubscriptionEvents.$inferInsert;
export type ProductionDecisionRecordRow =
  typeof productionDecisionRecords.$inferSelect;
export type NewProductionDecisionRecordRow =
  typeof productionDecisionRecords.$inferInsert;
export type ProductionDecisionEventRow =
  typeof productionDecisionEvents.$inferSelect;
export type NewProductionDecisionEventRow =
  typeof productionDecisionEvents.$inferInsert;
