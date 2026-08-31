import type {
  TenantSession,
} from "../auth/tenantSession.ts";
import type {
  MessageTemplateSubmissionQueueMessage,
} from "../templates/messageTemplateSubmissionQueueMessage.ts";

export const RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION =
  "templates.submit" as const;

export interface RailwayMessageTemplateSubmissionMutationPayload {
  readonly templateKey: string;
}

export interface RailwayMessageTemplateSubmissionMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: typeof RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: Readonly<RailwayMessageTemplateSubmissionMutationPayload>;
}

export type RailwayMessageTemplateSubmissionMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      queueMessage: Readonly<MessageTemplateSubmissionQueueMessage>;
    }>
  | Readonly<{
      outcome:
        | "conflict"
        | "not-found"
        | "not-editable"
        | "meta-not-connected"
        | "unavailable";
      tenantId: null;
      queueMessage: null;
    }>;

export interface RailwayMessageTemplateSubmissionMutationExecutor {
  execute(
    command: Readonly<RailwayMessageTemplateSubmissionMutationCommand>,
  ): Promise<RailwayMessageTemplateSubmissionMutationResult>;
}
