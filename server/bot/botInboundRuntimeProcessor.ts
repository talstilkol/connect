import type {
  BotReplyDeliveryRepository,
} from "../../db/botReplyDeliveryRepository.ts";
import type {
  BotReplyProcessor,
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
import {
  createBotReplyDeliveryWorker,
} from "./botReplyDeliveryWorker.ts";

const SERVICE_WINDOW_DURATION_MILLISECONDS =
  24 * 60 * 60 * 1_000;

export type BotRuntimePolicySkipReason =
  | "service-window-closed"
  | "service-window-not-open";

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
  selectedBotOptionKey: string | null;
  replyToProviderMessageId: string | null;
  inboundMessageOccurredAt: string;
}

export interface ProcessInboundBotRuntimeResult {
  runtimeOutcome:
    | ProcessBotRuntimeResult["outcome"]
    | "policy-skipped";
  runtimeSkipReason:
    | BotRuntimeSkipReason
    | BotRuntimePolicySkipReason
    | null;
  staged: number;
  accepted: number;
  rejected: number;
  deferred: number;
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

interface OpenServiceWindow {
  outcome: "open";
  openedAt: string;
  expiresAt: string;
}

interface ClosedServiceWindow {
  outcome: "closed";
  reason: BotRuntimePolicySkipReason;
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
  let current: Date;

  try {
    current = clock.now();
  } catch {
    throw processorError("RUNTIME_FAILED");
  }

  if (
    !(current instanceof Date) ||
    !Number.isFinite(current.getTime())
  ) {
    throw processorError("RUNTIME_FAILED");
  }

  return current.toISOString();
}

function canonicalTimestampMilliseconds(
  value: unknown,
): number | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 40
  ) {
    return null;
  }

  const milliseconds = Date.parse(value);

  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    return null;
  }

  return milliseconds;
}

function resolveServiceWindow(
  occurredAt: string,
  clock: BotRuntimeClock,
): OpenServiceWindow | ClosedServiceWindow {
  const openedAtMilliseconds =
    canonicalTimestampMilliseconds(occurredAt);

  if (openedAtMilliseconds === null) {
    throw processorError("INVALID_INPUT");
  }

  const currentTimestamp = timestamp(clock);
  const currentMilliseconds =
    canonicalTimestampMilliseconds(
      currentTimestamp,
    );
  const expiresAtMilliseconds =
    openedAtMilliseconds +
    SERVICE_WINDOW_DURATION_MILLISECONDS;

  if (
    currentMilliseconds === null ||
    !Number.isFinite(expiresAtMilliseconds) ||
    expiresAtMilliseconds > 8_640_000_000_000_000
  ) {
    throw processorError("RUNTIME_FAILED");
  }

  if (currentMilliseconds < openedAtMilliseconds) {
    return {
      outcome: "closed",
      reason: "service-window-not-open",
    };
  }

  if (currentMilliseconds >= expiresAtMilliseconds) {
    return {
      outcome: "closed",
      reason: "service-window-closed",
    };
  }

  return {
    outcome: "open",
    openedAt: occurredAt,
    expiresAt: new Date(
      expiresAtMilliseconds,
    ).toISOString(),
  };
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
    input.phoneNumberId.length > 255 ||
    (input.selectedBotOptionKey !== null &&
      (typeof input.selectedBotOptionKey !==
        "string" ||
        !/^bot_option_v1_[0-9a-f]{64}$/.test(
          input.selectedBotOptionKey,
        ))) ||
    (input.replyToProviderMessageId !== null &&
      (typeof input.replyToProviderMessageId !==
        "string" ||
        input.replyToProviderMessageId.trim() !==
          input.replyToProviderMessageId ||
        input.replyToProviderMessageId.length === 0 ||
        input.replyToProviderMessageId.length > 255)) ||
    ((input.selectedBotOptionKey === null) !==
      (input.replyToProviderMessageId === null)) ||
    canonicalTimestampMilliseconds(
      input.inboundMessageOccurredAt,
    ) === null
  ) {
    throw processorError("INVALID_INPUT");
  }
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
    deferred: 0,
    duplicates: 0,
    ambiguous: 0,
  };
}

function policySkipResult(
  reason: BotRuntimePolicySkipReason,
): ProcessInboundBotRuntimeResult {
  return {
    runtimeOutcome: "policy-skipped",
    runtimeSkipReason: reason,
    staged: 0,
    accepted: 0,
    rejected: 0,
    deferred: 0,
    duplicates: 0,
    ambiguous: 0,
  };
}

export function createBotInboundRuntimeProcessor(
  runtime: BotRuntimeService,
  deliveries: BotReplyDeliveryRepository,
  processor: BotReplyProcessor,
  clock: BotRuntimeClock,
): BotInboundRuntimeProcessor {
  const deliveryWorker =
    createBotReplyDeliveryWorker(
      deliveries,
      processor,
      clock,
    );

  return {
    async process(input) {
      assertInput(input);
      const serviceWindow =
        resolveServiceWindow(
          input.inboundMessageOccurredAt,
          clock,
        );

      if (serviceWindow.outcome === "closed") {
        return policySkipResult(
          serviceWindow.reason,
        );
      }

      let runtimeResult:
        ProcessBotRuntimeResult;

      try {
        runtimeResult =
          await runtime.processInbound(
            input.tenantId,
            input.conversationKey,
            input.inboundMessageKey,
            input.textContent,
            input.selectedBotOptionKey,
            input.replyToProviderMessageId,
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
              senderPhoneNumberId:
                input.phoneNumberId,
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

      if (!deliveryWorker.isConfigured()) {
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

        try {
          const dispatched =
            await deliveryWorker.dispatch({
              tenantId: delivery.tenantId,
              deliveryKey: delivery.deliveryKey,
              serviceWindowOpenedAt:
                serviceWindow.openedAt,
              serviceWindowExpiresAt:
                serviceWindow.expiresAt,
            });

          if (dispatched.outcome === "accepted") {
            result.accepted += 1;
          } else if (
            dispatched.outcome === "rejected"
          ) {
            result.rejected += 1;
          } else if (
            dispatched.outcome === "deferred"
          ) {
            result.deferred += 1;
          } else if (
            dispatched.outcome === "ambiguous"
          ) {
            result.ambiguous += 1;
          } else {
            result.duplicates += 1;
          }
        } catch {
          throw processorError(
            "PERSISTENCE_FAILED",
          );
        }
      }

      return result;
    },
  };
}
