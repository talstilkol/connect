export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type TenantId = Brand<number, "TenantId">;
export type UserId = Brand<string, "UserId">;
export type ContactId = Brand<string, "ContactId">;
export type CampaignId = Brand<string, "CampaignId">;
export type ConversationId = Brand<string, "ConversationId">;

export type TenantStatus =
  | "trial"
  | "active"
  | "payment_failed"
  | "suspended"
  | "cancelled"
  | "expired"
  | "blocked";

export type WhatsAppConnectionStatus =
  | "disconnected"
  | "pending"
  | "connected"
  | "verification_required"
  | "revoked"
  | "error"
  | "restricted";

export type TemplateStatus =
  | "draft"
  | "submitting"
  | "pending_review"
  | "approved"
  | "rejected"
  | "disabled"
  | "deleted";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

export type ConversationStatus =
  | "new"
  | "bot_active"
  | "waiting_for_agent"
  | "agent_active"
  | "waiting_for_contact"
  | "closed";

export type MailingStatus = "subscribed" | "unsubscribed";

export type ConsentStatus = "unknown" | "granted" | "withdrawn";

export interface ContactConsent {
  status: ConsentStatus;
  source: string | null;
  recordedAt: string | null;
  withdrawnAt: string | null;
  evidenceReference: string | null;
}

export interface TenantContext {
  tenantId: TenantId;
  displayName: string;
  status: TenantStatus;
  role: TenantRole;
}

export interface ContactSummary {
  id: ContactId;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  mailingStatus: MailingStatus;
  consent: ContactConsent;
}

export interface CampaignSummary {
  id: CampaignId;
  name: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  recipientCount: number;
}

export interface ConversationSummary {
  id: ConversationId;
  status: ConversationStatus;
  assignedUserId: UserId | null;
  unreadCount: number;
}

export type TenantRole =
  | "owner"
  | "manager"
  | "agent"
  | "viewer";

export type Permission =
  | "workspace.manage"
  | "team.manage"
  | "contacts.read"
  | "contacts.write"
  | "templates.read"
  | "templates.write"
  | "campaigns.read"
  | "campaigns.write"
  | "conversations.read"
  | "conversations.reply"
  | "bot.read"
  | "bot.write"
  | "ai.read"
  | "ai.write"
  | "reports.read"
  | "billing.read";

export const roleLabels: Record<TenantRole, string> = {
  owner: "בעל חשבון",
  manager: "מנהל לקוח",
  agent: "נציג שירות",
  viewer: "משתמש צפייה",
};

export const rolePermissions: Record<TenantRole, readonly Permission[]> = {
  owner: [
    "workspace.manage",
    "team.manage",
    "contacts.read",
    "contacts.write",
    "templates.read",
    "templates.write",
    "campaigns.read",
    "campaigns.write",
    "conversations.read",
    "conversations.reply",
    "bot.read",
    "bot.write",
    "ai.read",
    "ai.write",
    "reports.read",
    "billing.read",
  ],
  manager: [
    "team.manage",
    "contacts.read",
    "contacts.write",
    "templates.read",
    "templates.write",
    "campaigns.read",
    "campaigns.write",
    "conversations.read",
    "conversations.reply",
    "bot.read",
    "bot.write",
    "ai.read",
    "ai.write",
    "reports.read",
    "billing.read",
  ],
  agent: [
    "contacts.read",
    "conversations.read",
    "conversations.reply",
  ],
  viewer: [
    "contacts.read",
    "templates.read",
    "campaigns.read",
    "conversations.read",
    "bot.read",
    "ai.read",
    "reports.read",
    "billing.read",
  ],
};

export function hasPermission(
  role: TenantRole,
  permission: Permission,
): boolean {
  return rolePermissions[role].includes(permission);
}
