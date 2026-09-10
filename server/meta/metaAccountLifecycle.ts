import type { MetaWebhookEnvelope } from "./metaWebhookEnvelope.ts";

export function isMetaAccountLifecycleEvent(value: unknown): boolean {
  return value === "PARTNER_REMOVED" || value === "ACCOUNT_OFFBOARDED" ||
    value === "ACCOUNT_RECONNECTED";
}

export function isMetaAccountRevocationEvent(value: unknown): boolean {
  return value === "PARTNER_REMOVED" || value === "ACCOUNT_OFFBOARDED";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// This only widens admission for lifecycle-only envelopes. Signature and WABA
// resolution are still mandatory; messages cannot enter through this exception.
export function isMetaAccountLifecycleEnvelope(envelope: MetaWebhookEnvelope): boolean {
  const entries = envelope.payload.entry;
  return Array.isArray(entries) && entries.length > 0 && entries.every((entry) =>
    isRecord(entry) && Array.isArray(entry.changes) && entry.changes.length > 0 &&
    entry.changes.every((change: unknown) => isRecord(change) &&
      change.field === "account_update" && isRecord(change.value) &&
      isMetaAccountLifecycleEvent(change.value.event)),
  );
}
