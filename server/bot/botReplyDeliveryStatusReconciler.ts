import type {
  BotReplyDeliveryProviderRepository,
  BotReplyProviderWebhookStatus,
} from "../../db/botReplyDeliveryProviderRepository.ts";
import type {
  WhatsappRateLimitRepository,
} from "../../db/whatsappRateLimitRepository.ts";

export interface BotReplyDeliveryStatusInput {
  tenantId: number;
  providerMessageId: string;
  status: BotReplyProviderWebhookStatus;
  providerErrorCode: number | null;
  statusEventKey: string;
  statusEventAt: string;
}

export interface BotReplyDeliveryStatusReconciler {
  reconcile(
    input: BotReplyDeliveryStatusInput,
  ): Promise<{ outcome: "not-found" | "reconciled" }>;
}

export interface BotReplyDeliveryStatusReconcilerClock {
  now(): Date;
}

const systemClock: Readonly<BotReplyDeliveryStatusReconcilerClock> =
  Object.freeze({ now: () => new Date() });

function reconciledTimestamp(
  clock: Readonly<BotReplyDeliveryStatusReconcilerClock>,
): string {
  const value = clock.now();
  if (
    !(value instanceof Date) ||
    !Number.isFinite(value.getTime())
  ) {
    throw new Error("Bot reply reconciliation clock is invalid");
  }
  return value.toISOString();
}

export function createBotReplyDeliveryStatusReconciler(
  deliveries: BotReplyDeliveryProviderRepository,
  rateLimits: Pick<WhatsappRateLimitRepository, "settle">,
  clock: Readonly<BotReplyDeliveryStatusReconcilerClock> = systemClock,
): Readonly<BotReplyDeliveryStatusReconciler> {
  if (
    typeof deliveries?.applyProviderStatus !== "function" ||
    typeof rateLimits?.settle !== "function" ||
    typeof clock?.now !== "function"
  ) {
    throw new Error("Bot reply status reconciler is invalid");
  }

  return Object.freeze({
    async reconcile(
      input: BotReplyDeliveryStatusInput,
    ): Promise<{ outcome: "not-found" | "reconciled" }> {
      const result = await deliveries.applyProviderStatus({
        tenantId: input.tenantId,
        providerMessageId: input.providerMessageId,
        status: input.status,
        statusEventKey: input.statusEventKey,
        statusEventAt: input.statusEventAt,
        reconciledAt: reconciledTimestamp(clock),
      });
      if (result.outcome === "not-found") {
        return { outcome: "not-found" as const };
      }
      if (
        result.outcome === "event-conflict" ||
        result.outcome === "terminal-conflict"
      ) {
        throw new Error(
          "Bot reply status conflicts with durable evidence",
        );
      }
      if (!("settlement" in result)) {
        throw new Error("Bot reply reconciliation result is invalid");
      }

      if (result.settlement !== null) {
        const settlement = await rateLimits.settle(result.settlement);
        if (
          settlement.outcome !== "settled" ||
          settlement.settlement.reservationKey !==
            result.settlement.reservationKey ||
          settlement.settlement.outcome !== result.settlement.outcome ||
          settlement.settlement.settledAt !== result.settlement.settledAt
        ) {
          throw new Error(
            "Bot reply rate-limit settlement conflicts with provider evidence",
          );
        }
      }

      return { outcome: "reconciled" as const };
    },
  });
}
