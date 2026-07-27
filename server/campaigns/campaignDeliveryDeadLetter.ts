import type {
  CampaignDeliveryQueueDelivery,
} from "./campaignDeliveryQueueConsumer.ts";
import {
  createCampaignDeliveryQueueMessage,
  parseCampaignDeliveryQueueMessage,
  type CampaignDeliveryQueueMessage,
} from "./campaignDeliveryQueueMessage.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";

export interface CampaignDeliveryRecoveryQueue {
  sendBatch(
    messages: readonly {
      body: CampaignDeliveryQueueMessage;
      contentType: "json";
    }[],
  ): Promise<unknown>;
}

export type CampaignDeliveryDeadLetterErrorCode =
  | "INVALID_MESSAGE"
  | "INVALID_CONFIRMATION"
  | "CONFIRMATION_MISMATCH"
  | "REQUEUE_UNAVAILABLE";

export class CampaignDeliveryDeadLetterError extends Error {
  readonly code: CampaignDeliveryDeadLetterErrorCode;

  constructor(
    code: CampaignDeliveryDeadLetterErrorCode,
  ) {
    super(
      "Campaign delivery dead-letter operation failed",
    );
    this.name =
      "CampaignDeliveryDeadLetterError";
    this.code = code;
  }
}

export type CampaignDeliveryDeadLetterInspection =
  | {
      status: "replayable";
      messageId: string;
      enqueuedAt: string;
      attempts: number;
      recoveryKey: string;
    }
  | {
      status: "invalid";
      messageId: string | null;
      enqueuedAt: string | null;
      attempts: number | null;
      reason: "INVALID_QUEUE_MESSAGE";
    };

function safeMessageId(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return (
    normalized.length > 0 &&
    normalized.length <= 255
  )
    ? normalized
    : null;
}

function safeTimestamp(
  value: unknown,
): string | null {
  if (
    !(value instanceof Date) ||
    !Number.isFinite(value.getTime())
  ) {
    return null;
  }

  return value.toISOString();
}

function safeAttempts(
  value: unknown,
): number | null {
  return (
    Number.isSafeInteger(value) &&
    Number(value) >= 1
  )
    ? Number(value)
    : null;
}

async function deriveRecoveryKey(
  message: CampaignDeliveryQueueMessage,
): Promise<string> {
  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "campaign_delivery_recovery_v1",
        version: message.version,
        deliveryKey: message.deliveryKey,
      }),
    ),
  );
}

export async function inspectCampaignDeliveryDeadLetter(
  delivery: CampaignDeliveryQueueDelivery,
): Promise<CampaignDeliveryDeadLetterInspection> {
  const message =
    parseCampaignDeliveryQueueMessage(
      delivery.body,
    );
  const messageId = safeMessageId(delivery.id);
  const enqueuedAt = safeTimestamp(
    delivery.timestamp,
  );
  const attempts = safeAttempts(
    delivery.attempts,
  );

  if (
    message === null ||
    messageId === null ||
    enqueuedAt === null ||
    attempts === null
  ) {
    return {
      status: "invalid",
      messageId,
      enqueuedAt,
      attempts,
      reason: "INVALID_QUEUE_MESSAGE",
    };
  }

  return {
    status: "replayable",
    messageId,
    enqueuedAt,
    attempts,
    recoveryKey:
      await deriveRecoveryKey(message),
  };
}

export async function requeueConfirmedCampaignDeliveryDeadLetter(
  delivery: CampaignDeliveryQueueDelivery,
  queue: CampaignDeliveryRecoveryQueue,
  expectedRecoveryKey: string,
): Promise<{
  outcome: "requeued";
  recoveryKey: string;
}> {
  if (
    typeof expectedRecoveryKey !== "string" ||
    !/^[0-9a-f]{64}$/.test(
      expectedRecoveryKey,
    )
  ) {
    throw new CampaignDeliveryDeadLetterError(
      "INVALID_CONFIRMATION",
    );
  }

  const message =
    parseCampaignDeliveryQueueMessage(
      delivery.body,
    );

  if (message === null) {
    throw new CampaignDeliveryDeadLetterError(
      "INVALID_MESSAGE",
    );
  }

  const recoveryKey =
    await deriveRecoveryKey(message);

  if (recoveryKey !== expectedRecoveryKey) {
    throw new CampaignDeliveryDeadLetterError(
      "CONFIRMATION_MISMATCH",
    );
  }

  if (
    !queue ||
    typeof queue.sendBatch !== "function"
  ) {
    throw new CampaignDeliveryDeadLetterError(
      "REQUEUE_UNAVAILABLE",
    );
  }

  try {
    await queue.sendBatch([
      {
        body:
          createCampaignDeliveryQueueMessage(
            message.deliveryKey,
          ),
        contentType: "json",
      },
    ]);
  } catch {
    throw new CampaignDeliveryDeadLetterError(
      "REQUEUE_UNAVAILABLE",
    );
  }

  delivery.ack();

  return {
    outcome: "requeued",
    recoveryKey,
  };
}
