export {
  QUEUE_BATCH_CAPACITY,
} from "../../shared/domain/queuePolicy.ts";
import {
  QUEUE_BATCH_CAPACITY,
} from "../../shared/domain/queuePolicy.ts";

export class QueueBackpressureError extends Error {
  constructor() {
    super("Queue batch exceeds processing capacity");
    this.name = "QueueBackpressureError";
  }
}

export function assertQueueBatchCapacity(
  messages: readonly unknown[],
): void {
  if (
    !Array.isArray(messages) ||
    messages.length > QUEUE_BATCH_CAPACITY
  ) {
    throw new QueueBackpressureError();
  }
}
