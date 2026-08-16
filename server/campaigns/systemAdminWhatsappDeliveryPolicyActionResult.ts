import type {
  WhatsappCampaignDeliveryPolicyRecordView,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";

export type SystemAdminWhatsappDeliveryPolicyActionResult =
  | {
      status: "saved";
      outcome:
        | "created"
        | "updated"
        | "unchanged";
      record:
        WhatsappCampaignDeliveryPolicyRecordView;
    }
  | {
      status:
        | "configuration-required"
        | "unauthenticated"
        | "permission-denied"
        | "invalid-input"
        | "not-found"
        | "connection-not-ready"
        | "conflict"
        | "server-error";
    };
