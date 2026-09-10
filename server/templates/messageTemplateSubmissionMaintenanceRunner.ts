import type {
  MessageTemplateSubmissionCandidateRepository,
} from "../../db/messageTemplateSubmissionOutboxRepository.ts";
import {
  QUEUE_BATCH_CAPACITY,
} from "../operations/queueBackpressure.ts";
import {
  createMessageTemplateSubmissionQueueMessage,
  type MessageTemplateSubmissionQueueMessage,
} from "./messageTemplateSubmissionQueueMessage.ts";
import type {
  MessageTemplateSubmissionReconciliationResult,
} from "./messageTemplateSubmissionReconciliation.ts";

const DEFAULT_PENDING_MINIMUM_AGE_SECONDS = 5;
const DEFAULT_AMBIGUOUS_MINIMUM_AGE_SECONDS = 60;
const MAXIMUM_SCAN_AGE_SECONDS = 24 * 60 * 60;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export interface MessageTemplateSubmissionQueuePublisher {
  publish(
    messages: readonly Readonly<MessageTemplateSubmissionQueueMessage>[],
  ): Promise<void>;
}

interface MessageTemplateSubmissionReconciler {
  process(
    tenantId: unknown,
    submissionKey: unknown,
  ): Promise<MessageTemplateSubmissionReconciliationResult>;
}

export interface MessageTemplateSubmissionMaintenanceResult {
  readonly pendingCandidates: number;
  readonly published: number;
  readonly ambiguousCandidates: number;
  readonly resolvedSubmitted: number;
  readonly resolvedRejected: number;
  readonly deferred: number;
  readonly duplicates: number;
  readonly missing: number;
  readonly failed: number;
}

type MutableMessageTemplateSubmissionMaintenanceResult = {
  -readonly [Key in keyof MessageTemplateSubmissionMaintenanceResult]:
    MessageTemplateSubmissionMaintenanceResult[Key];
};

export class MessageTemplateSubmissionMaintenanceError extends Error {
  constructor() {
    super("Message template submission maintenance could not complete");
    this.name = "MessageTemplateSubmissionMaintenanceError";
  }
}

export interface MessageTemplateSubmissionMaintenanceDependencies {
  readonly candidates: MessageTemplateSubmissionCandidateRepository;
  readonly publisher: MessageTemplateSubmissionQueuePublisher;
  readonly reconciler: MessageTemplateSubmissionReconciler;
  readonly clock?: () => string;
  readonly batchSize?: number;
  readonly pendingMinimumAgeSeconds?: number;
  readonly ambiguousMinimumAgeSeconds?: number;
}

const allowedDependencyKeys = Object.freeze([
  "ambiguousMinimumAgeSeconds",
  "batchSize",
  "candidates",
  "clock",
  "pendingMinimumAgeSeconds",
  "publisher",
  "reconciler",
]);

function requireTimestamp(value: unknown): string {
  if (
    typeof value !== "string" || !timestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value
  ) {
    throw new MessageTemplateSubmissionMaintenanceError();
  }

  return value;
}

function requireBatchSize(value: unknown): number {
  if (
    !Number.isSafeInteger(value) || Number(value) < 1 ||
    Number(value) > QUEUE_BATCH_CAPACITY
  ) {
    throw new MessageTemplateSubmissionMaintenanceError();
  }

  return Number(value);
}

function requireAgeSeconds(value: unknown): number {
  if (
    !Number.isSafeInteger(value) || Number(value) < 0 ||
    Number(value) > MAXIMUM_SCAN_AGE_SECONDS
  ) {
    throw new MessageTemplateSubmissionMaintenanceError();
  }

  return Number(value);
}

function cutoffAt(now: string, minimumAgeSeconds: number): string {
  return new Date(
    Date.parse(now) - minimumAgeSeconds * 1_000,
  ).toISOString();
}

function emptyResult(): MutableMessageTemplateSubmissionMaintenanceResult {
  return {
    pendingCandidates: 0,
    published: 0,
    ambiguousCandidates: 0,
    resolvedSubmitted: 0,
    resolvedRejected: 0,
    deferred: 0,
    duplicates: 0,
    missing: 0,
    failed: 0,
  };
}

function countReconciliation(
  result: MutableMessageTemplateSubmissionMaintenanceResult,
  outcome: MessageTemplateSubmissionReconciliationResult["outcome"],
): void {
  if (outcome === "resolved-submitted") {
    result.resolvedSubmitted += 1;
  } else if (outcome === "resolved-rejected") {
    result.resolvedRejected += 1;
  } else if (outcome === "deferred") {
    result.deferred += 1;
  } else if (outcome === "duplicate") {
    result.duplicates += 1;
  } else if (outcome === "not-found") {
    result.missing += 1;
  } else {
    throw new MessageTemplateSubmissionMaintenanceError();
  }
}

/**
 * Provider-neutral scheduler core. Publishing is intentionally at-least-once:
 * a relay crash can enqueue a duplicate identity, but the atomic outbox claim
 * prevents a duplicate provider POST. Ambiguous work is reconciled by GET only.
 */
export function createMessageTemplateSubmissionMaintenanceRunner(
  dependencies: Readonly<MessageTemplateSubmissionMaintenanceDependencies>,
) {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).some(
      (key) => !allowedDependencyKeys.includes(key),
    ) ||
    typeof dependencies.candidates?.listPendingBefore !== "function" ||
    typeof dependencies.candidates?.listAmbiguousBefore !== "function" ||
    typeof dependencies.publisher?.publish !== "function" ||
    typeof dependencies.reconciler?.process !== "function" ||
    (dependencies.clock !== undefined && typeof dependencies.clock !== "function")
  ) {
    throw new MessageTemplateSubmissionMaintenanceError();
  }

  const batchSize = requireBatchSize(
    dependencies.batchSize ?? QUEUE_BATCH_CAPACITY,
  );
  const pendingMinimumAgeSeconds = requireAgeSeconds(
    dependencies.pendingMinimumAgeSeconds ??
      DEFAULT_PENDING_MINIMUM_AGE_SECONDS,
  );
  const ambiguousMinimumAgeSeconds = requireAgeSeconds(
    dependencies.ambiguousMinimumAgeSeconds ??
      DEFAULT_AMBIGUOUS_MINIMUM_AGE_SECONDS,
  );
  const clock = dependencies.clock ?? (() => new Date().toISOString());

  return Object.freeze({
    async run(): Promise<Readonly<MessageTemplateSubmissionMaintenanceResult>> {
      const now = requireTimestamp(clock());
      const result = emptyResult();
      let pending;
      let ambiguous;

      try {
        pending = await dependencies.candidates.listPendingBefore(
          cutoffAt(now, pendingMinimumAgeSeconds),
          batchSize,
        );
      } catch {
        throw new MessageTemplateSubmissionMaintenanceError();
      }

      result.pendingCandidates = pending.length;
      if (pending.length > 0) {
        let messages;

        try {
          messages = pending.map((candidate) =>
            createMessageTemplateSubmissionQueueMessage(
              candidate.tenantId,
              candidate.submissionKey,
            )
          );
        } catch {
          throw new MessageTemplateSubmissionMaintenanceError();
        }

        try {
          await dependencies.publisher.publish(Object.freeze(messages));
        } catch {
          throw new MessageTemplateSubmissionMaintenanceError();
        }
        result.published = messages.length;
      }

      try {
        ambiguous = await dependencies.candidates.listAmbiguousBefore(
          cutoffAt(now, ambiguousMinimumAgeSeconds),
          batchSize,
        );
      } catch {
        throw new MessageTemplateSubmissionMaintenanceError();
      }

      result.ambiguousCandidates = ambiguous.length;
      for (const candidate of ambiguous) {
        try {
          const reconciliation = await dependencies.reconciler.process(
            candidate.tenantId,
            candidate.submissionKey,
          );
          countReconciliation(result, reconciliation.outcome);
        } catch {
          result.failed += 1;
        }
      }

      return Object.freeze(result);
    },
  });
}
