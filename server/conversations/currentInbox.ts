import type {
  InboxDirectoryStatus,
  InboxView,
} from "../../shared/domain/conversationView.ts";
import {
  defaultInboxFilters,
} from "../../shared/domain/conversationView.ts";
import { createCurrentRailwayConversationHandler } from "./currentRailwayConversationHandler.ts";

export type CurrentInboxResult =
  | {
      status: "ready";
      inbox: InboxView;
    }
  | {
      status: Exclude<
        InboxDirectoryStatus,
        "ready"
      >;
      inbox: {
        conversations: readonly [];
        selectedThread: null;
        canReply: false;
        filters: typeof defaultInboxFilters;
      };
    };

export async function readCurrentInbox():
Promise<CurrentInboxResult> {
  try {
    return await createCurrentRailwayConversationHandler().readCurrent();
  } catch {
    return {
      status: "server-error",
      inbox: {
        conversations: [],
        selectedThread: null,
        canReply: false,
        filters: { ...defaultInboxFilters },
      },
    };
  }
}
