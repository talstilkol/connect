import { messageContentKinds, type MessageContentKind, type PersistedMessage } from "./conversation.ts";

export const historyDeliveryStates = ["DELIVERED", "ERROR", "PENDING", "PLAYED", "READ", "SENT"] as const;
export type HistoryDeliveryState = (typeof historyDeliveryStates)[number];
export type InboxContentKind = MessageContentKind | "media_placeholder";
export const inboxContentKinds = [...messageContentKinds, "media_placeholder"] as const;

// Historical delivery states are provider snapshots, never live-message
// status or input to automation repositories.
export interface HistoricalInboxMessage extends Omit<PersistedMessage, "status" | "statusUpdatedAt" | "contentKind"> {
  source: "history";
  status: null;
  statusUpdatedAt: null;
  historyDeliveryState: HistoryDeliveryState;
  contentKind: InboxContentKind;
}
export type PersistedInboxMessage = PersistedMessage | HistoricalInboxMessage;

export function isHistoryDeliveryState(value: unknown): value is HistoryDeliveryState {
  return historyDeliveryStates.some((state) => state === value);
}
