import type {
  PersistedMessageTemplate,
} from "../shared/domain/messageTemplate.ts";
import type {
  MessageTemplateSubmissionOutboxRecord,
} from "../server/templates/messageTemplateSubmissionOutbox.ts";

export interface PreparedMessageTemplateSubmission {
  readonly outbox: Readonly<MessageTemplateSubmissionOutboxRecord>;
  readonly template: Readonly<PersistedMessageTemplate>;
}

export type ClaimMessageTemplateSubmissionResult =
  | Readonly<{
      outcome: "claimed";
      prepared: Readonly<PreparedMessageTemplateSubmission>;
    }>
  | Readonly<{
      outcome: "duplicate" | "ambiguous" | "blocked";
      outbox: Readonly<MessageTemplateSubmissionOutboxRecord>;
    }>
  | Readonly<{ outcome: "not-found" }>;

export interface MessageTemplateSubmissionOutboxRepository {
  find(
    tenantId: unknown,
    submissionKey: unknown,
  ): Promise<Readonly<MessageTemplateSubmissionOutboxRecord> | null>;
  claim(
    tenantId: unknown,
    submissionKey: unknown,
    graphApiVersion: unknown,
    occurredAt: unknown,
  ): Promise<ClaimMessageTemplateSubmissionResult>;
  markSubmitted(
    tenantId: unknown,
    submissionKey: unknown,
    metaTemplateId: unknown,
    occurredAt: unknown,
  ): Promise<Readonly<MessageTemplateSubmissionOutboxRecord>>;
  markRejected(
    tenantId: unknown,
    submissionKey: unknown,
    errorCode: unknown,
    occurredAt: unknown,
  ): Promise<Readonly<MessageTemplateSubmissionOutboxRecord>>;
  markAmbiguous(
    tenantId: unknown,
    submissionKey: unknown,
    errorCode: unknown,
    occurredAt: unknown,
  ): Promise<Readonly<MessageTemplateSubmissionOutboxRecord>>;
  reconcileSubmitted(
    tenantId: unknown,
    submissionKey: unknown,
    metaTemplateId: unknown,
    occurredAt: unknown,
  ): Promise<Readonly<MessageTemplateSubmissionOutboxRecord>>;
  reconcileRejected(
    tenantId: unknown,
    submissionKey: unknown,
    errorCode: unknown,
    occurredAt: unknown,
  ): Promise<Readonly<MessageTemplateSubmissionOutboxRecord>>;
}

/**
 * Read-only scheduler view. Publishing remains outside PostgreSQL, so a relay
 * may emit the same identity more than once. The claim transition is the
 * authoritative idempotency boundary before any provider POST.
 */
export interface MessageTemplateSubmissionCandidateRepository {
  listPendingBefore(
    cutoffAt: unknown,
    limit: unknown,
  ): Promise<readonly Readonly<MessageTemplateSubmissionOutboxRecord>[]>;
  listAmbiguousBefore(
    cutoffAt: unknown,
    limit: unknown,
  ): Promise<readonly Readonly<MessageTemplateSubmissionOutboxRecord>[]>;
}
