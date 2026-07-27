export type MetaWebhookEnvelopeErrorCode =
  | "INVALID_JSON"
  | "INVALID_ENVELOPE"
  | "UNSUPPORTED_OBJECT"
  | "AMBIGUOUS_WABA";

export class MetaWebhookEnvelopeError extends Error {
  readonly code: MetaWebhookEnvelopeErrorCode;

  constructor(code: MetaWebhookEnvelopeErrorCode, message: string) {
    super(message);
    this.name = "MetaWebhookEnvelopeError";
    this.code = code;
  }
}

export interface MetaWebhookEnvelope {
  objectType: "whatsapp_business_account";
  wabaId: string;
  payload: Readonly<Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readExternalId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 && normalizedValue.length <= 255
    ? normalizedValue
    : null;
}

function nestedWabaIds(entry: Record<string, unknown>): string[] {
  if (!Array.isArray(entry.changes)) {
    return [];
  }

  const result: string[] = [];

  for (const change of entry.changes) {
    if (!isRecord(change) || !isRecord(change.value)) {
      continue;
    }

    const wabaInfo = change.value.waba_info;

    if (!isRecord(wabaInfo)) {
      continue;
    }

    const wabaId = readExternalId(wabaInfo.waba_id);

    if (wabaId) {
      result.push(wabaId);
    }
  }

  return result;
}

function resolveSingleWabaId(entries: readonly unknown[]): string {
  const candidateIds = new Set<string>();

  for (const candidate of entries) {
    if (!isRecord(candidate)) {
      throw new MetaWebhookEnvelopeError(
        "INVALID_ENVELOPE",
        "Meta webhook entries must be objects",
      );
    }

    const embeddedIds = nestedWabaIds(candidate);

    if (embeddedIds.length > 0) {
      for (const embeddedId of embeddedIds) {
        candidateIds.add(embeddedId);
      }
      continue;
    }

    const entryId = readExternalId(candidate.id);

    if (!entryId) {
      throw new MetaWebhookEnvelopeError(
        "INVALID_ENVELOPE",
        "Meta webhook entry is missing an ID",
      );
    }

    candidateIds.add(entryId);
  }

  if (candidateIds.size !== 1) {
    throw new MetaWebhookEnvelopeError(
      "AMBIGUOUS_WABA",
      "Meta webhook must resolve to exactly one WABA",
    );
  }

  return [...candidateIds][0];
}

export function parseMetaWebhookEnvelope(
  rawPayload: Uint8Array | string,
): MetaWebhookEnvelope {
  let parsedPayload: unknown;

  try {
    const json =
      typeof rawPayload === "string"
        ? rawPayload
        : new TextDecoder().decode(rawPayload);
    parsedPayload = JSON.parse(json);
  } catch {
    throw new MetaWebhookEnvelopeError(
      "INVALID_JSON",
      "Meta webhook body is not valid JSON",
    );
  }

  if (!isRecord(parsedPayload)) {
    throw new MetaWebhookEnvelopeError(
      "INVALID_ENVELOPE",
      "Meta webhook body must be an object",
    );
  }

  if (parsedPayload.object !== "whatsapp_business_account") {
    throw new MetaWebhookEnvelopeError(
      "UNSUPPORTED_OBJECT",
      "Meta webhook object is unsupported",
    );
  }

  if (
    !Array.isArray(parsedPayload.entry) ||
    parsedPayload.entry.length === 0
  ) {
    throw new MetaWebhookEnvelopeError(
      "INVALID_ENVELOPE",
      "Meta webhook must contain at least one entry",
    );
  }

  return {
    objectType: "whatsapp_business_account",
    wabaId: resolveSingleWabaId(parsedPayload.entry),
    payload: parsedPayload,
  };
}
