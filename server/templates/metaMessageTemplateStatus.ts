import type {
  MessageTemplateStatusEventStatus,
} from "../../db/messageTemplateRepository.ts";

export const metaMessageTemplateStatusMap = {
  APPROVED: "approved",
  REINSTATED: "approved",
  PENDING: "pending_review",
  IN_APPEAL: "pending_review",
  REJECTED: "rejected",
  DISABLED: "disabled",
  FLAGGED: "disabled",
  PENDING_DELETION: "disabled",
  DELETED: "deleted",
} as const satisfies Readonly<
  Record<string, MessageTemplateStatusEventStatus>
>;

export type MetaMessageTemplateProviderStatus =
  keyof typeof metaMessageTemplateStatusMap;

export function isMetaMessageTemplateProviderStatus(
  value: unknown,
): value is MetaMessageTemplateProviderStatus {
  return (
    typeof value === "string" &&
    value in metaMessageTemplateStatusMap
  );
}

export function toMessageTemplateStatus(
  value: MetaMessageTemplateProviderStatus,
): MessageTemplateStatusEventStatus {
  return metaMessageTemplateStatusMap[value];
}
