export const persistedMetaConnectionStatuses = [
  "pending",
  "connected",
  "verification_required",
  "revoked",
  "error",
  "restricted",
] as const;

export type PersistedMetaConnectionStatus =
  (typeof persistedMetaConnectionStatuses)[number];

export interface MetaConnectionRecord {
  tenantId: number;
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
  status: PersistedMetaConnectionStatus;
  webhookSubscribedAt: string | null;
  connectedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const metaWebhookReceiptStatuses = [
  "processing",
  "processed",
  "failed",
] as const;

export type MetaWebhookReceiptStatus =
  (typeof metaWebhookReceiptStatuses)[number];

export interface MetaWebhookReceipt {
  id: number;
  tenantId: number;
  wabaId: string;
  eventKey: string;
  objectType: string;
  status: MetaWebhookReceiptStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  receivedAt: string;
  processedAt: string | null;
  updatedAt: string;
}
