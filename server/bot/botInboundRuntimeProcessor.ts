import type {
  BotReplyDeliveryRepository,
} from "../../db/botReplyDeliveryRepository.ts";
import type {
  BotReplyProcessor,
  BotReplyProcessorResult,
  PersistedBotReplyDelivery,
} from "../../shared/domain/botReplyDelivery.ts";
import {
  deriveBotReplyDeliveryKey,
  toBotReplyPayload,
} from "./botReplyDeliveryKey.ts";
import type {
  BotRuntimeSkipReason,
  BotRuntimeService,
  ProcessBotRuntimeResult,
} from "./botRuntimeService.ts";

const AMBIGUOUS_ERROR_CODE =
  "DELIVERY_OUTCOME_UNKNOWN";

export type BotInboundRuntimeProcessorErrorCode =
  | "INVALID_INPUT"
  | "PROCESSOR_UNAVAILABLE"
  | "PERSISTENCE_FAILED"
  | "RUNTIME_FAILED";

export class BotInboundRuntimeProcessorError
  extends Error {
  readonly code: BotInboundRuntimeProcessorErrorCode;

  constructor(
    code: BotInboundRuntimeProcessorErrorCode,
  ) {
    super("Inbound bot runtime processing failed");
    this.name =
      "BotInboundRuntimeProcessorError";
    this.code = code;
  }
}

export interface ProcessInboundBotRuntimeInput {
  tenantId: number;
  conversationKey: string;
  inboundMessageKey: string;
  recipientPhoneNumber: string;
  phoneNumberId: string;
  textContent: string | null;
}

export interface ProcessInboundBotRuntimeResult {
  runtimeOutcome:
    ProcessBotRuntimeResult["outcome"];
  runtimeSkipReason:
    BotRuntimeSkipReason | null;
  staged: number;
  accepted: number;
  rejected: number;
  duplicates: number;
  ambiguous: number;
}

export interface BotInboundRuntimeProcessor {
  process(
    input: ProcessInboundBotRuntimeInput,
  ): Promise<ProcessInboundBotRuntimeResult>;
}

export interface BotRuntimeClock {
  now(): Date;
}

function processorError(
  code: BotInboundRuntimeProcessorErrorCode,
): BotInboundRuntimeProcessorError {
  return new BotInboundRuntimeProcessorError(
    code,
  );
}

function timestamp(
  clock: BotRuntimeClock,
): string {
  const current = clock.now();

  if (
    !(current instanceof Date) ||
    !Number.isFinite(current.getTime())
  ) {
    throw processorError("RUNTIME_FAILED");
  }

  return current.toISOString();
}

function assertInput(
  input: ProcessInboundBotRuntimeInput,
): void {
  if (
    !Number.isSafeInteger(input.tenantId) ||
    input.tenantId <= 0 ||
    !/^conversation_v1_[0-9a-f]{64}$/.test(
      input.conversationKey,
    ) ||
    !/^message_v1_[0-9a-f]{64}$/.test(
      input.inboundMessageKey,
    ) ||
    !/^\+[1-9][0-9]{0,14}$/.test(
      input.recipientPhoneNumber,
    ) ||
    typeof input.phoneNumberId !== "string" ||
    input.phoneNumberId.trim() !==
      input.phoneNumberId ||
    input.phoneNumberId.length === 0 ||
    input.phoneNumberId.length > 255
  ) {
    throw processorError("INVALID_INPUT");
  }
}

function parseProcessorResult(
  value: BotReplyProcessorResult,
): BotReplyProcessorResult | null {
  if (
    value?.outcome === "accepted" &&
    typeof value.providerMessageId ===
      "string" &&
    value.providerMessageId.trim() ===
      value.providerMessageId &&
    value.providerMessageId.length > 0 &&
    value.providerMessageId.length <= 255
  ) {
    return {
      outcome: "accepted",
      providerMessageId:
        value.providerMessageId,
    };
  }

  if (
    value?.outcome === "rejected" &&
    typeof value.errorCode === "string" &&
    /^[A-Z0-9_]{1,100}$/.test(
      value.errorCode,
    )
  ) {
    return {
      outcome: "rejected",
      errorCode: value.errorCode,
    };
  }

  return null;
}

function emptyResult(
  runtimeResult: ProcessBotRuntimeResult,
): ProcessInboundBotRuntimeResult {
  return {
    runtimeOutcome: runtimeResult.outcome,
    runtimeSkipReason:
      runtimeResult.outcome === "skipped"
        ? runtimeResult.reason
        : null,
    staged: 0,
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    ambiguous: 0,
  };
}

async function markAmbiguous(
  deliveries: BotReplyDeliveryRepository,
  delivery: PersistedBotReplyDelivery,
  clock: BotRuntimeClock,
): Promise<void> {
  await deliveries.markAmbiguous(
    delivery.tenantId,
    delivery.deliveryKey,
    AMBIGUOUS_ERROR_CODE,
    timestamp(clock),
  );
}

export function createBotInboundRuntimeProcessor(
  runtime: BotRuntimeService,
  deliveries: BotReplyDeliveryRepository,
  processor: BotReplyProcessor,
  clock: BotRuntimeClock,
): BotInboundRuntimeProcessor {
  return {
    async process(input) {
      assertInput(input);
      let runtimeResult:
        ProcessBotRuntimeResult;

      try {
        runtimeResult =
          await runtime.processInbound(
            input.tenantId,
            input.conversationKey,
            input.inboundMessageKey,
            input.textContent,
          );
      } catch {
        throw processorError(
          "RUNTIME_FAILED",
        );
      }

      if (
        runtimeResult.outcome === "skipped" ||
        runtimeResult.outcome === "conflict"
      ) {
        return emptyResult(
          runtimeResult,
        );
      }

      const result = emptyResult(
        runtimeResult,
      );
      const staged:
        PersistedBotReplyDelivery[] = [];

      try {
        for (
          let index = 0;
          index <
          runtimeResult.plan.replies.length;
          index += 1
        ) {
          const replyIndex = index + 1;
          const reply = toBotReplyPayload(
            runtimeResult.plan.replies[index],
          );
          const deliveryKey =
            await deriveBotReplyDeliveryKey(
              input.tenantId,
              {
                conversationKey:
                  input.conversationKey,
                inboundMessageKey:
                  input.inboundMessageKey,
                botFlowVersionKey:
                  runtimeResult.botFlowVersionKey,
                replyIndex,
                reply,
              },
            );
          const stage =
            await deliveries.stage({
              deliveryKey,
              tenantId: input.tenantId,
              conversationKey:
                input.conversationKey,
              inboundMessageKey:
                input.inboundMessageKey,
              botFlowKey:
                runtimeResult.botFlowKey,
              botFlowVersionKey:
                runtimeResult.botFlowVersionKey,
              replyIndex,
              recipientPhoneNumber:
                input.recipientPhoneNumber,
              reply,
            });

          if (stage.outcome === "created") {
            result.staged += 1;
          }

          staged.push(stage.delivery);
        }
      } catch {
        throw processorError(
          "PERSISTENCE_FAILED",
        );
      }

      if (staged.length === 0) {
        return result;
      }

      if (!processor.isConfigured()) {
        throw processorError(
          "PROCESSOR_UNAVAILABLE",
        );
      }

      for (const delivery of staged) {
        if (
          delivery.status === "accepted" ||
          delivery.status === "rejected" ||
          delivery.status === "ambiguous"
        ) {
          result.duplicates += 1;
          continue;
        }

        let claimed;

        try {
          claimed = await deliveries.claim(
            delivery.tenantId,
            delivery.deliveryKey,
            timestamp(clock),
          );
        } catch {
          throw processorError(
            "PERSISTENCE_FAILED",
          );
        }

        if (claimed.outcome === "not-found") {
          throw processorError(
            "PERSISTENCE_FAILED",
          );
        }

        if (claimed.outcome === "duplicate") {
          result.duplicates += 1;
          continue;
        }

        if (claimed.outcome === "uncertain") {
          try {
            await markAmbiguous(
              deliveries,
              claimed.delivery,
              clock,
            );
          } catch {
            throw processorError(
              "PERSISTENCE_FAILED",
            );
          }

          result.ambiguous += 1;
          continue;
        }

        try {
          const processorResult =
            parseProcessorResult(
              await processor.process({
                phoneNumberId:
                  input.phoneNumberId,
                delivery:
                  claimed.delivery,
              }),
            );

          if (!processorResult) {
            throw new Error(
              "bot reply processor result is invalid",
            );
          }

          if (
            processorResult.outcome ===
            "accepted"
          ) {
            await deliveries.markAccepted(
              delivery.tenantId,
              delivery.deliveryKey,
              processorResult.providerMessageId,
              timestamp(clock),
            );
            result.accepted += 1;
            continue;
          }

          await deliveries.markRejected(
            delivery.tenantId,
            delivery.deliveryKey,
            processorResult.errorCode,
            timestamp(clock),
          );
          result.rejected += 1;
        } catch {
          try {
            await markAmbiguous(
              deliveries,
              claimed.delivery,
              clock,
            );
          } catch {
            throw processorError(
              "PERSISTENCE_FAILED",
            );
          }

          result.ambiguous += 1;
        }
      }

      return result;
    },
  };
}
