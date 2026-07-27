export const QUEUE_BATCH_CAPACITY = 10;

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
