import { requireRailwayManualReplyConfiguration, type RailwayManualReplyEnvironment } from "./railwayManualReplyConfiguration.ts";
export type RailwayAiReplyDeliveryEnvironment = RailwayManualReplyEnvironment & { AI_REPLY_DELIVERY_ENABLED?: string };
/** Generation may be paused independently of delivering previously approved drafts. */
export function requireRailwayAiReplyDeliveryConfiguration(environment: RailwayAiReplyDeliveryEnvironment = {}): boolean {
  if (environment.AI_REPLY_DELIVERY_ENABLED === undefined || environment.AI_REPLY_DELIVERY_ENABLED === "false") return false;
  if (environment.AI_REPLY_DELIVERY_ENABLED !== "true") throw new Error("AI reply delivery enablement is invalid");
  return requireRailwayManualReplyConfiguration({ ...environment, MANUAL_REPLY_ENABLED: "true" });
}
