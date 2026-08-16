import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  createTeamInvitationQueueMessage,
  parseTeamInvitationQueueMessage,
  type TeamInvitationQueueMessage,
} from "./teamInvitationQueueMessage.ts";
import type {
  TeamInvitationQueueDelivery,
} from "./teamInvitationQueueConsumer.ts";

export interface TeamInvitationRecoveryQueue {
  send(
    body: TeamInvitationQueueMessage,
    options: { contentType: "json" },
  ): Promise<unknown>;
}

export type TeamInvitationDeadLetterErrorCode =
  | "INVALID_MESSAGE"
  | "INVALID_CONFIRMATION"
  | "CONFIRMATION_MISMATCH"
  | "REQUEUE_UNAVAILABLE";

export class TeamInvitationDeadLetterError
  extends Error {
  readonly code: TeamInvitationDeadLetterErrorCode;

  constructor(
    code: TeamInvitationDeadLetterErrorCode,
  ) {
    super(
      "Team invitation dead-letter operation failed",
    );
    this.name = "TeamInvitationDeadLetterError";
    this.code = code;
  }
}

export type TeamInvitationDeadLetterInspection =
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
    normalized.length <= 255 &&
    normalized === value &&
    !/[\u0000-\u001f\u007f]/.test(normalized)
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
  message: TeamInvitationQueueMessage,
): Promise<string> {
  return sha256Hex(
    new TextEncoder().encode(
      JSON.stringify({
        namespace:
          "team_invitation_delivery_recovery_v1",
        version: message.version,
        tenantId: message.tenantId,
        deliveryKey: message.deliveryKey,
      }),
    ),
  );
}

export async function inspectTeamInvitationDeadLetter(
  delivery: TeamInvitationQueueDelivery,
): Promise<TeamInvitationDeadLetterInspection> {
  const message =
    parseTeamInvitationQueueMessage(
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

export async function requeueConfirmedTeamInvitationDeadLetter(
  delivery: TeamInvitationQueueDelivery,
  queue: TeamInvitationRecoveryQueue,
  expectedRecoveryKey: string,
): Promise<{
  outcome: "requeued";
  recoveryKey: string;
}> {
  if (
    typeof expectedRecoveryKey !== "string" ||
    !/^[0-9a-f]{64}$/.test(expectedRecoveryKey)
  ) {
    throw new TeamInvitationDeadLetterError(
      "INVALID_CONFIRMATION",
    );
  }

  const message =
    parseTeamInvitationQueueMessage(
      delivery.body,
    );

  if (message === null) {
    throw new TeamInvitationDeadLetterError(
      "INVALID_MESSAGE",
    );
  }

  const recoveryKey =
    await deriveRecoveryKey(message);

  if (recoveryKey !== expectedRecoveryKey) {
    throw new TeamInvitationDeadLetterError(
      "CONFIRMATION_MISMATCH",
    );
  }

  if (
    !queue ||
    typeof queue.send !== "function"
  ) {
    throw new TeamInvitationDeadLetterError(
      "REQUEUE_UNAVAILABLE",
    );
  }

  try {
    await queue.send(
      createTeamInvitationQueueMessage(
        message.tenantId,
        message.deliveryKey,
      ),
      { contentType: "json" },
    );
  } catch {
    throw new TeamInvitationDeadLetterError(
      "REQUEUE_UNAVAILABLE",
    );
  }

  delivery.ack();

  return {
    outcome: "requeued",
    recoveryKey,
  };
}
