import type {
  MessageTemplateDirectoryStatus,
  MessageTemplateView,
} from "../../shared/domain/messageTemplateView.ts";
import {
  createCurrentRailwayMessageTemplateDirectoryHandler,
} from "./currentRailwayMessageTemplateDirectoryHandler.ts";

export type CurrentMessageTemplatesResult =
  | {
      status: "ready";
      templates: readonly MessageTemplateView[];
      canWrite: boolean;
    }
  | {
      status: Exclude<
        MessageTemplateDirectoryStatus,
        "ready"
      >;
      templates: readonly [];
      canWrite: false;
    };

export async function readCurrentMessageTemplates():
Promise<CurrentMessageTemplatesResult> {
  try {
    return await createCurrentRailwayMessageTemplateDirectoryHandler().read();
  } catch {
    return {
      status: "server-error",
      templates: [],
      canWrite: false,
    };
  }
}
