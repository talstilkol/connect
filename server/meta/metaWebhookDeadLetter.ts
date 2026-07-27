import type {
  MetaWebhookQueueDelivery,
} from "./metaWebhookQueueConsumer.ts";
import {
  cloneMetaWebhookQueueMessage,
  parseMetaWebhookQueueMessage,
  type MetaWebhookQueueBinding,
} from "./metaWebhookQueueMessage.ts";
import {
  sha256Hex,
} from "./metaWebhookSecurity.ts";

export type MetaWebhookDeadLetterErrorCode =
  | "INVALID_MESSAGE"
  | "INVALID_CONFIRMATION"
  | "CONFIRMATION_MISMATCH"
  | "REQUEUE_UNAVAILABLE";

export class MetaWebhookDeadLetterError extends Error {
  readonly code: MetaWebhookDeadLetterErrorCode;

  constructor(code: MetaWebhookDeadLetterErrorCode) {
    super("Meta webhook dead-letter operation failed");
    this.name = "MetaWebhookDeadLetterError";
    this.code = code;
  }
}

export type MetaWebhookDeadLetterInspection =
  | {
      status: "replayable";
      messageId: string;
      enqueuedAt: string;
      attempts: number;
      eventKey: string;
      payloadBytes: number;
    }
  | {
      status: "invalid";
      messageId: string | null;
      enqueuedAt: string | null;
      attempts: number | null;
      reason: "INVALID_QUEUE_MESSAGE";
    };

function safeMessageId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 && normalized.length <= 255
    ? normalized
    : null;
}

function safeTimestamp(value: unknown): string | null {
  if (
    !(value instanceof Date) ||
    !Number.isFinite(value.getTime())
  ) {
    return null;
  }

  return value.toISOString();
}

function safeAttempts(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 1
    ? Number(value)
    : null;
}

export async function inspectMetaWebhookDeadLetter(
  delivery: MetaWebhookQueueDelivery,
): Promise<MetaWebhookDeadLetterInspection> {
  const message = parseMetaWebhookQueueMessage(delivery.body);
  const messageId = safeMessageId(delivery.id);
  const enqueuedAt = safeTimestamp(delivery.timestamp);
  const attempts = safeAttempts(delivery.attempts);

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
    eventKey: await sha256Hex(
      new Uint8Array(message.rawPayload),
    ),
    payloadBytes: message.rawPayload.byteLength,
  };
}

export async function requeueConfirmedMetaWebhookDeadLetter(
  delivery: MetaWebhookQueueDelivery,
  queue: MetaWebhookQueueBinding,
  expectedEventKey: string,
): Promise<{
  outcome: "requeued";
  eventKey: string;
}> {
  if (
    typeof expectedEventKey !== "string" ||
    !/^[0-9a-f]{64}$/.test(expectedEventKey)
  ) {
    throw new MetaWebhookDeadLetterError(
      "INVALID_CONFIRMATION",
    );
  }

  const message = parseMetaWebhookQueueMessage(delivery.body);

  if (message === null) {
    throw new MetaWebhookDeadLetterError("INVALID_MESSAGE");
  }

  const eventKey = await sha256Hex(
    new Uint8Array(message.rawPayload),
  );

  if (eventKey !== expectedEventKey) {
    throw new MetaWebhookDeadLetterError(
      "CONFIRMATION_MISMATCH",
    );
  }

  if (!queue || typeof queue.send !== "function") {
    throw new MetaWebhookDeadLetterError(
      "REQUEUE_UNAVAILABLE",
    );
  }

  try {
    await queue.send(
      cloneMetaWebhookQueueMessage(message),
      {
        contentType: "v8",
      },
    );
  } catch {
    throw new MetaWebhookDeadLetterError(
      "REQUEUE_UNAVAILABLE",
    );
  }

  delivery.ack();

  return {
    outcome: "requeued",
    eventKey,
  };
}
