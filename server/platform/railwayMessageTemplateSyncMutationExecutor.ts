import type { TenantSession } from "../auth/tenantSession.ts";
import type { MessageTemplateSyncActionSummary } from "../templates/messageTemplateActionResult.ts";
import type { MessageTemplateView } from "../../shared/domain/messageTemplateView.ts";

export const RAILWAY_MESSAGE_TEMPLATE_SYNC_OPERATION = "templates.sync" as const;

export interface RailwayMessageTemplateSyncState {
  readonly templates: readonly MessageTemplateView[];
  readonly summary: MessageTemplateSyncActionSummary;
}

export interface RailwayMessageTemplateSyncMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: typeof RAILWAY_MESSAGE_TEMPLATE_SYNC_OPERATION;
  readonly payload: Readonly<{ requestedAt: string }>;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
}

export type RailwayMessageTemplateSyncMutationResult = Readonly<
  | { outcome: "committed" | "replayed"; tenantId: number; state: RailwayMessageTemplateSyncState }
  | { outcome: "conflict" | "authorization-changed" | "meta-not-connected" | "unavailable";
      tenantId: null; state: null }
>;

export interface RailwayMessageTemplateSyncMutationExecutor {
  execute(command: RailwayMessageTemplateSyncMutationCommand): Promise<RailwayMessageTemplateSyncMutationResult>;
}

export function isTemplateSyncTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
