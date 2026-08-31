import type {
  BotReplyDeliveryRepository,
} from "../../db/botReplyDeliveryRepository.ts";
import type {
  BotReplyProcessor,
  BotReplyProcessorResult,
  PersistedBotReplyDelivery,
} from "../../shared/domain/botReplyDelivery.ts";

const SERVICE_WINDOW_DURATION_MILLISECONDS =
  24 * 60 * 60 * 1_000;
const AMBIGUOUS_ERROR_CODE = "DELIVERY_OUTCOME_UNKNOWN";
const SERVICE_WINDOW_CLOSED_ERROR_CODE =
  "META_SERVICE_WINDOW_CLOSED_LOCAL";
const SERVICE_WINDOW_NOT_OPEN_ERROR_CODE =
  "META_SERVICE_WINDOW_NOT_OPEN_LOCAL";
const deliveryKeyPattern =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const reservationKeyPattern =
  /^whatsapp_rate_reservation_v1_[0-9a-f]{64}$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;

export interface BotReplyDeliveryWorkerClock {
  now(): Date;
}

export interface DispatchBotReplyDeliveryInput {
  tenantId: number;
  deliveryKey: string;
  serviceWindowOpenedAt: string;
  serviceWindowExpiresAt: string;
}

export type DispatchBotReplyDeliveryResult =
  | { outcome: "accepted" }
  | { outcome: "rejected" }
  | { outcome: "ambiguous" }
  | { outcome: "duplicate" }
  | { outcome: "in-progress" }
  | {
      outcome: "deferred";
      retryAt: string;
    };

export interface BotReplyDeliveryWorker {
  isConfigured(): boolean;
  dispatch(
    input: DispatchBotReplyDeliveryInput,
  ): Promise<DispatchBotReplyDeliveryResult>;
}

export interface BotReplyDueDeliveryRunResult {
  scanned: number;
  accepted: number;
  rejected: number;
  deferred: number;
  ambiguous: number;
  duplicates: number;
  inProgress: number;
}

export interface BotReplyDueDeliveryRunner {
  run(limit?: number): Promise<BotReplyDueDeliveryRunResult>;
}

function timestamp(clock: BotReplyDeliveryWorkerClock): string {
  let current: Date;

  try {
    current = clock.now();
  } catch {
    throw new Error("Bot reply delivery clock is unavailable");
  }

  if (
    !(current instanceof Date) ||
    !Number.isFinite(current.getTime())
  ) {
    throw new Error("Bot reply delivery clock is invalid");
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

function requireInput(
  input: DispatchBotReplyDeliveryInput,
): Readonly<{
  openedAtMilliseconds: number;
  expiresAtMilliseconds: number;
}> {
  const openedAtMilliseconds =
    canonicalTimestampMilliseconds(
      input.serviceWindowOpenedAt,
    );
  const expiresAtMilliseconds =
    canonicalTimestampMilliseconds(
      input.serviceWindowExpiresAt,
    );

  if (
    !Number.isSafeInteger(input.tenantId) ||
    input.tenantId < 1 ||
    !deliveryKeyPattern.test(input.deliveryKey) ||
    openedAtMilliseconds === null ||
    expiresAtMilliseconds === null ||
    expiresAtMilliseconds - openedAtMilliseconds !==
      SERVICE_WINDOW_DURATION_MILLISECONDS
  ) {
    throw new Error("Bot reply delivery dispatch input is invalid");
  }

  return {
    openedAtMilliseconds,
    expiresAtMilliseconds,
  };
}

function parseProcessorResult(
  value: BotReplyProcessorResult,
): BotReplyProcessorResult | null {
  if (
    value?.outcome === "accepted" &&
    typeof value.providerMessageId === "string" &&
    value.providerMessageId.trim() === value.providerMessageId &&
    value.providerMessageId.length > 0 &&
    value.providerMessageId.length <= 255 &&
    reservationKeyPattern.test(value.reservationKey)
  ) {
    return {
      outcome: "accepted",
      providerMessageId: value.providerMessageId,
      reservationKey: value.reservationKey,
    };
  }

  if (
    value?.outcome === "rejected" &&
    typeof value.errorCode === "string" &&
    errorCodePattern.test(value.errorCode) &&
    value.providerErrorCode === 131047 &&
    value.errorCode === "META_SERVICE_WINDOW_CLOSED" &&
    reservationKeyPattern.test(value.reservationKey ?? "")
  ) {
    return {
      outcome: "rejected",
      errorCode: "META_SERVICE_WINDOW_CLOSED",
      reservationKey: value.reservationKey as string,
      providerErrorCode: 131047,
    };
  }

  if (
    value?.outcome === "rejected" &&
    typeof value.errorCode === "string" &&
    errorCodePattern.test(value.errorCode) &&
    value.providerErrorCode === undefined &&
    value.reservationKey === undefined
  ) {
    return {
      outcome: "rejected",
      errorCode: value.errorCode,
    };
  }

  if (
    value?.outcome === "deferred" &&
    typeof value.errorCode === "string" &&
    errorCodePattern.test(value.errorCode) &&
    canonicalTimestampMilliseconds(value.retryAt) !== null
  ) {
    if (
      value.reservationKey === undefined &&
      value.providerErrorCode === undefined &&
      value.cooldownScope === undefined &&
      value.retryAfterSeconds === undefined
    ) {
      return {
        outcome: "deferred",
        errorCode: value.errorCode,
        retryAt: value.retryAt,
      };
    }

    const providerFieldsAreValid =
      reservationKeyPattern.test(value.reservationKey ?? "") &&
      Number.isSafeInteger(value.retryAfterSeconds) &&
      Number(value.retryAfterSeconds) >= 1 &&
      Number(value.retryAfterSeconds) <= 86_400;

    if (
      providerFieldsAreValid &&
      value.providerErrorCode === 130429 &&
      value.cooldownScope === "sender" &&
      value.errorCode === "META_PHONE_THROUGHPUT_LIMITED"
    ) {
      return {
        outcome: "deferred",
        errorCode: "META_PHONE_THROUGHPUT_LIMITED",
        retryAt: value.retryAt,
        reservationKey: value.reservationKey as string,
        providerErrorCode: 130429,
        cooldownScope: "sender",
        retryAfterSeconds: Number(value.retryAfterSeconds),
      };
    }

    if (
      providerFieldsAreValid &&
      value.providerErrorCode === 131056 &&
      value.cooldownScope === "pair" &&
      value.errorCode === "META_PAIR_RATE_LIMITED"
    ) {
      return {
        outcome: "deferred",
        errorCode: "META_PAIR_RATE_LIMITED",
        retryAt: value.retryAt,
        reservationKey: value.reservationKey as string,
        providerErrorCode: 131056,
        cooldownScope: "pair",
        retryAfterSeconds: Number(value.retryAfterSeconds),
      };
    }
  }

  return null;
}

function processorIsConfigured(
  processor: BotReplyProcessor,
): boolean {
  try {
    return processor.isConfigured() === true;
  } catch {
    return false;
  }
}

async function markAmbiguous(
  deliveries: BotReplyDeliveryRepository,
  delivery: PersistedBotReplyDelivery,
  clock: BotReplyDeliveryWorkerClock,
): Promise<void> {
  await deliveries.markAmbiguous(
    delivery.tenantId,
    delivery.deliveryKey,
    delivery.claimVersion,
    AMBIGUOUS_ERROR_CODE,
    timestamp(clock),
  );
}

export function createBotReplyDeliveryWorker(
  deliveries: BotReplyDeliveryRepository,
  processor: BotReplyProcessor,
  clock: BotReplyDeliveryWorkerClock,
): BotReplyDeliveryWorker {
  return {
    isConfigured() {
      return processorIsConfigured(processor);
    },

    async dispatch(input) {
      const window = requireInput(input);

      if (!processorIsConfigured(processor)) {
        throw new Error("Bot reply delivery processor is unavailable");
      }

      let claim;

      try {
        claim = await deliveries.claim(
          input.tenantId,
          input.deliveryKey,
          timestamp(clock),
        );
      } catch {
        throw new Error("Bot reply delivery claim failed");
      }

      if (claim.outcome === "not-found") {
        throw new Error("Bot reply delivery was not found");
      }

      if (claim.outcome === "duplicate") {
        return { outcome: "duplicate" };
      }

      if (claim.outcome === "deferred") {
        return {
          outcome: "deferred",
          retryAt: claim.retryAt,
        };
      }

      if (claim.outcome === "uncertain") {
        // Another worker may own this exact claim. Observing `sending` is
        // never enough evidence to overwrite it or submit again.
        return { outcome: "in-progress" };
      }

      const attemptedAt = timestamp(clock);
      const attemptedAtMilliseconds =
        canonicalTimestampMilliseconds(attemptedAt);

      if (attemptedAtMilliseconds === null) {
        throw new Error("Bot reply delivery attempt time is invalid");
      }

      if (
        attemptedAtMilliseconds < window.openedAtMilliseconds ||
        attemptedAtMilliseconds >= window.expiresAtMilliseconds
      ) {
        await deliveries.markRejected(
          claim.delivery.tenantId,
          claim.delivery.deliveryKey,
          claim.delivery.claimVersion,
          attemptedAtMilliseconds < window.openedAtMilliseconds
            ? SERVICE_WINDOW_NOT_OPEN_ERROR_CODE
            : SERVICE_WINDOW_CLOSED_ERROR_CODE,
          attemptedAt,
        );
        return { outcome: "rejected" };
      }

      try {
        const result = parseProcessorResult(
          await processor.process({
            phoneNumberId:
              claim.delivery.senderPhoneNumberId,
            serviceWindowOpenedAt:
              input.serviceWindowOpenedAt,
            serviceWindowExpiresAt:
              input.serviceWindowExpiresAt,
            attemptedAt,
            delivery: claim.delivery,
          }),
        );

        if (!result) {
          throw new Error("Bot reply processor result is invalid");
        }

        if (result.outcome === "accepted") {
          await deliveries.markAccepted(
            claim.delivery.tenantId,
            claim.delivery.deliveryKey,
            claim.delivery.claimVersion,
            result.providerMessageId,
            result.reservationKey,
            timestamp(clock),
          );
          return { outcome: "accepted" };
        }

        if (result.outcome === "rejected") {
          const rejectedAt = timestamp(clock);

          if (result.providerErrorCode === 131047) {
            if (
              typeof deliveries.rejectProviderServiceWindow !==
                "function" ||
              result.reservationKey === undefined
            ) {
              throw new Error(
                "Bot reply service-window rejection provenance is unavailable",
              );
            }

            await deliveries.rejectProviderServiceWindow({
              tenantId: claim.delivery.tenantId,
              deliveryKey: claim.delivery.deliveryKey,
              expectedClaimVersion:
                claim.delivery.claimVersion,
              reservationKey: result.reservationKey,
              providerErrorCode: 131047,
              reasonCode: "META_SERVICE_WINDOW_CLOSED",
              serviceWindowOpenedAt:
                input.serviceWindowOpenedAt,
              serviceWindowExpiresAt:
                input.serviceWindowExpiresAt,
              attemptedAt,
              rejectedAt,
            });
          } else {
            await deliveries.markRejected(
              claim.delivery.tenantId,
              claim.delivery.deliveryKey,
              claim.delivery.claimVersion,
              result.errorCode,
              rejectedAt,
            );
          }
          return { outcome: "rejected" };
        }

        const retryAtMilliseconds =
          canonicalTimestampMilliseconds(result.retryAt);

        if (
          retryAtMilliseconds === null ||
          retryAtMilliseconds <= attemptedAtMilliseconds
        ) {
          throw new Error("Bot reply deferral result is invalid");
        }

        if (retryAtMilliseconds >= window.expiresAtMilliseconds) {
          await deliveries.markRejected(
            claim.delivery.tenantId,
            claim.delivery.deliveryKey,
            claim.delivery.claimVersion,
            SERVICE_WINDOW_CLOSED_ERROR_CODE,
            timestamp(clock),
          );
          return { outcome: "rejected" };
        }

        const deferredAt = timestamp(clock);

        if (result.providerErrorCode !== undefined) {
          if (
            typeof deliveries.deferProviderRejection !== "function" ||
            result.reservationKey === undefined ||
            result.cooldownScope === undefined ||
            result.retryAfterSeconds === undefined ||
            retryAtMilliseconds - attemptedAtMilliseconds !==
              result.retryAfterSeconds * 1_000
          ) {
            throw new Error(
              "Bot reply provider deferral provenance is unavailable",
            );
          }

          await deliveries.deferProviderRejection({
            tenantId: claim.delivery.tenantId,
            deliveryKey: claim.delivery.deliveryKey,
            expectedClaimVersion:
              claim.delivery.claimVersion,
            attemptedAt,
            deferredAt,
            retryAt: result.retryAt,
            reasonCode: result.errorCode,
            reservationKey: result.reservationKey,
            providerErrorCode: result.providerErrorCode,
            cooldownScope: result.cooldownScope,
            retryAfterSeconds:
              result.retryAfterSeconds,
          });
        } else {
          await deliveries.defer(
            claim.delivery.tenantId,
            claim.delivery.deliveryKey,
            claim.delivery.claimVersion,
            deferredAt,
            result.retryAt,
            result.errorCode,
          );
        }
        return {
          outcome: "deferred",
          retryAt: result.retryAt,
        };
      } catch {
        try {
          await markAmbiguous(
            deliveries,
            claim.delivery,
            clock,
          );
        } catch {
          throw new Error("Bot reply delivery ambiguity persistence failed");
        }

        return { outcome: "ambiguous" };
      }
    },
  };
}

export function createBotReplyDueDeliveryRunner(
  deliveries: Pick<
    BotReplyDeliveryRepository,
    "listDueDeferrals"
  >,
  worker: BotReplyDeliveryWorker,
  clock: BotReplyDeliveryWorkerClock,
): BotReplyDueDeliveryRunner {
  return {
    async run(limit = 100) {
      if (
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        !worker.isConfigured()
      ) {
        throw new Error("Bot reply due delivery runner is unavailable");
      }

      const due = await deliveries.listDueDeferrals(
        timestamp(clock),
        limit,
      );
      const result: BotReplyDueDeliveryRunResult = {
        scanned: due.length,
        accepted: 0,
        rejected: 0,
        deferred: 0,
        ambiguous: 0,
        duplicates: 0,
        inProgress: 0,
      };
      let failures = 0;

      for (const delivery of due) {
        try {
          const dispatched = await worker.dispatch({
            tenantId: delivery.tenantId,
            deliveryKey: delivery.deliveryKey,
            serviceWindowOpenedAt:
              delivery.serviceWindowOpenedAt,
            serviceWindowExpiresAt:
              delivery.serviceWindowExpiresAt,
          });

          if (dispatched.outcome === "accepted") {
            result.accepted += 1;
          } else if (dispatched.outcome === "rejected") {
            result.rejected += 1;
          } else if (dispatched.outcome === "deferred") {
            result.deferred += 1;
          } else if (dispatched.outcome === "ambiguous") {
            result.ambiguous += 1;
          } else if (dispatched.outcome === "duplicate") {
            result.duplicates += 1;
          } else {
            result.inProgress += 1;
          }
        } catch {
          failures += 1;
        }
      }

      if (failures > 0) {
        throw new Error("Bot reply due delivery run failed");
      }

      return result;
    },
  };
}
