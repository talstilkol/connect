import type {
  WhatsappPhoneThroughputPolicy,
  WhatsappPortfolioCapacity,
} from "./whatsappRateLimit.ts";

export const whatsappCampaignDeliveryPolicyStates = [
  "enabled",
  "disabled",
] as const;

export type WhatsappCampaignDeliveryPolicyState =
  (typeof whatsappCampaignDeliveryPolicyStates)[number];

export interface WhatsappCampaignDeliveryPolicyRecord {
  eventKey: string;
  tenantId: number;
  connectionVersion: number;
  policyVersion: number;
  deliveryState:
    WhatsappCampaignDeliveryPolicyState;
  portfolioCapacity:
    WhatsappPortfolioCapacity;
  phoneThroughput:
    WhatsappPhoneThroughputPolicy | null;
  reservationDurationSeconds: number;
  metaGraphApiVersion: string;
  evidenceDigest: string;
  evidenceCheckedAt: string;
  evidenceExpiresAt: string;
  actorExternalUserId: string;
  recordedAt: string;
}

export type WhatsappCampaignDeliveryPolicyMutationResult =
  | {
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      record:
        WhatsappCampaignDeliveryPolicyRecord;
    }
  | {
      outcome: "conflict";
      record:
        WhatsappCampaignDeliveryPolicyRecord | null;
    };

export type WhatsappCampaignDeliveryPolicyRecordView =
  Omit<
    WhatsappCampaignDeliveryPolicyRecord,
    "actorExternalUserId"
  >;

export type SystemAdminWhatsappDeliveryPolicyViewStatus =
  | "ready"
  | "configuration-required"
  | "unauthenticated"
  | "permission-denied"
  | "not-found"
  | "server-error";

export interface SystemAdminWhatsappDeliveryPolicyConnectionView {
  tenantId: number;
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
  status: string;
  version: number;
}

export interface CurrentSystemAdminWhatsappDeliveryPolicy {
  status:
    SystemAdminWhatsappDeliveryPolicyViewStatus;
  connection:
    SystemAdminWhatsappDeliveryPolicyConnectionView | null;
  record:
    WhatsappCampaignDeliveryPolicyRecordView | null;
}

export function toWhatsappCampaignDeliveryPolicyRecordView(
  record:
    WhatsappCampaignDeliveryPolicyRecord,
): WhatsappCampaignDeliveryPolicyRecordView {
  return {
    eventKey: record.eventKey,
    tenantId: record.tenantId,
    connectionVersion:
      record.connectionVersion,
    policyVersion: record.policyVersion,
    deliveryState: record.deliveryState,
    portfolioCapacity:
      record.portfolioCapacity,
    phoneThroughput:
      record.phoneThroughput,
    reservationDurationSeconds:
      record.reservationDurationSeconds,
    metaGraphApiVersion:
      record.metaGraphApiVersion,
    evidenceDigest:
      record.evidenceDigest,
    evidenceCheckedAt:
      record.evidenceCheckedAt,
    evidenceExpiresAt:
      record.evidenceExpiresAt,
    recordedAt: record.recordedAt,
  };
}
