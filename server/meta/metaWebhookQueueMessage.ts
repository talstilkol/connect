export const MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES =
  120_000;

// Local Railway/BullMQ admission bound for history batches. The legacy
// Cloudflare queue retains its smaller default. This is not a Meta quota.
export const MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES = 2 * 1024 * 1024;

export function isMetaWebhookPayloadLimit(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= MAXIMUM_RAILWAY_META_WEBHOOK_PAYLOAD_BYTES;
}

export interface MetaWebhookQueueMessage {
  version: 1;
  rawPayload: ArrayBuffer;
  signatureHeader: string;
}

export interface MetaWebhookQueueBinding {
  send(
    body: MetaWebhookQueueMessage,
    options: {
      contentType: "v8";
    },
  ): Promise<unknown>;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function copyArrayBuffer(
  value: ArrayBuffer | Uint8Array,
): ArrayBuffer {
  const source =
    value instanceof Uint8Array
      ? value
      : new Uint8Array(value);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy.buffer;
}

export function createMetaWebhookQueueMessage(
  rawPayload: Uint8Array,
  signatureHeader: string,
): MetaWebhookQueueMessage {
  return {
    version: 1,
    rawPayload: copyArrayBuffer(rawPayload),
    signatureHeader,
  };
}

export function parseMetaWebhookQueueMessage(
  value: unknown,
  maximumPayloadBytes = MAXIMUM_META_WEBHOOK_QUEUE_PAYLOAD_BYTES,
): MetaWebhookQueueMessage | null {
  if (
    !isMetaWebhookPayloadLimit(maximumPayloadBytes) || !isRecord(value) ||
    value.version !== 1 ||
    !(value.rawPayload instanceof ArrayBuffer) ||
    value.rawPayload.byteLength === 0 ||
    value.rawPayload.byteLength >
      maximumPayloadBytes ||
    typeof value.signatureHeader !== "string" ||
    !/^sha256=[0-9a-f]{64}$/.test(
      value.signatureHeader,
    )
  ) {
    return null;
  }

  return {
    version: 1,
    rawPayload: value.rawPayload,
    signatureHeader: value.signatureHeader,
  };
}

export function cloneMetaWebhookQueueMessage(
  value: MetaWebhookQueueMessage,
): MetaWebhookQueueMessage {
  return {
    version: 1,
    rawPayload: copyArrayBuffer(value.rawPayload),
    signatureHeader: value.signatureHeader,
  };
}
