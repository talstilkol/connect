import type { MessageTemplateView } from "../../shared/domain/messageTemplateView.ts";
import type { ValidatedMessageTemplateDraft } from "../../shared/domain/messageTemplate.ts";
import type { TenantSession } from "../auth/tenantSession.ts";

export const RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION =
  "templates.draft.save" as const;

export interface RailwayMessageTemplateDraftMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: typeof RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: Readonly<ValidatedMessageTemplateDraft>;
}

export type RailwayMessageTemplateDraftMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      template: Readonly<MessageTemplateView>;
    }>
  | Readonly<{
      outcome: "conflict" | "not-editable" | "unavailable";
      tenantId: null;
      template: null;
    }>;

export interface RailwayMessageTemplateDraftMutationExecutor {
  execute(
    command: Readonly<RailwayMessageTemplateDraftMutationCommand>,
  ): Promise<RailwayMessageTemplateDraftMutationResult>;
}
