import type {
  TeamInvitationDispatchResult,
} from "./teamInvitationDispatchProcessor.ts";
import type {
  TeamInvitationProvider,
} from "./teamInvitationProvider.ts";
import {
  parseTeamInvitationQueueMessage,
} from "./teamInvitationQueueMessage.ts";
import {
  assertQueueBatchCapacity,
} from "../operations/queueBackpressure.ts";

const PROVIDER_RETRY_DELAY_SECONDS = 60;
const STORAGE_RETRY_DELAY_SECONDS = 30;

export interface TeamInvitationQueueDelivery {
  readonly id: string;
  readonly timestamp: Date;
  readonly attempts: number;
  body: unknown;
  ack(): void;
  retry(options: {
    delaySeconds: number;
  }): void;
}

export interface TeamInvitationQueueBatch {
  readonly queue: string;
  messages:
    readonly TeamInvitationQueueDelivery[];
}

export interface TeamInvitationQueueConsumerResult {
  submitted: number;
  blocked: number;
  ambiguous: number;
  duplicates: number;
  cancelled: number;
  discarded: number;
  retried: number;
}

interface DispatchProcessor {
  process(
    tenantId: unknown,
    deliveryKey: unknown,
  ): Promise<TeamInvitationDispatchResult>;
}

function incrementOutcome(
  result:
    TeamInvitationQueueConsumerResult,
  outcome: unknown,
): boolean {
  switch (outcome) {
    case "submitted":
      result.submitted += 1;
      return true;
    case "blocked":
      result.blocked += 1;
      return true;
    case "ambiguous":
      result.ambiguous += 1;
      return true;
    case "cancelled":
      result.cancelled += 1;
      return true;
    case "duplicate":
    case "not-found":
      result.duplicates += 1;
      return true;
    default:
      return false;
  }
}

export function createTeamInvitationQueueConsumer(
  processor: DispatchProcessor,
  provider:
    Pick<TeamInvitationProvider, "isConfigured">,
) {
  if (
    !provider ||
    typeof provider.isConfigured !==
      "function"
  ) {
    throw new Error(
      "Team invitation provider configuration probe is required",
    );
  }

  return {
    async handle(
      batch: TeamInvitationQueueBatch,
    ): Promise<TeamInvitationQueueConsumerResult> {
      assertQueueBatchCapacity(
        batch.messages,
      );
      const result:
        TeamInvitationQueueConsumerResult = {
          submitted: 0,
          blocked: 0,
          ambiguous: 0,
          duplicates: 0,
          cancelled: 0,
          discarded: 0,
          retried: 0,
        };

      for (
        const delivery of
        batch.messages
      ) {
        const message =
          parseTeamInvitationQueueMessage(
            delivery.body,
          );

        if (message === null) {
          delivery.ack();
          result.discarded += 1;
          continue;
        }

        let configured: boolean;

        try {
          configured =
            provider.isConfigured() ===
            true;
        } catch {
          configured = false;
        }

        if (!configured) {
          delivery.retry({
            delaySeconds:
              PROVIDER_RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
          continue;
        }

        try {
          const dispatchResult =
            await processor.process(
              message.tenantId,
              message.deliveryKey,
            );

          if (
            !incrementOutcome(
              result,
              dispatchResult?.outcome,
            )
          ) {
            throw new Error(
              "Invitation dispatch result is invalid",
            );
          }

          delivery.ack();
        } catch {
          delivery.retry({
            delaySeconds:
              STORAGE_RETRY_DELAY_SECONDS,
          });
          result.retried += 1;
        }
      }

      return result;
    },
  };
}
