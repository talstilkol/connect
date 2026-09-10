import {
  inspectMessageTemplateSubmissionReadiness,
  type MessageTemplateSubmissionEnvironment,
} from "../templates/messageTemplateSubmissionReadiness.ts";

export interface RailwayMessageTemplateSyncEnvironment extends MessageTemplateSubmissionEnvironment {
  readonly MESSAGE_TEMPLATE_SYNC_ENABLED?: string;
}

export function inspectRailwayMessageTemplateSyncConfiguration(
  environment: RailwayMessageTemplateSyncEnvironment,
): "disabled" | "configured" | "invalid" {
  const enabled = environment.MESSAGE_TEMPLATE_SYNC_ENABLED;
  if (enabled === undefined || enabled === "" || enabled === "false") return "disabled";
  if (enabled !== "true") return "invalid";
  return inspectMessageTemplateSubmissionReadiness(environment).status === "configured" ? "configured" : "invalid";
}
