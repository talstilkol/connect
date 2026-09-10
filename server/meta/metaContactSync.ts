import { isWhatsAppDisplayName } from "../../shared/domain/contactDisplayName.ts";
import type { MetaContactSyncWebhookEvent } from "./metaWebhookEventDispatcher.ts";
import { MetaWebhookProcessorError } from "./metaWebhookIngress.ts";

export interface MetaContactSyncScope {
  readonly tenantId: number;
  readonly wabaId: string;
  readonly phoneNumberId: string;
  readonly connectionVersion: number;
}

export interface MetaContactSyncChange {
  readonly phoneNumber: string;
  readonly action: "add" | "remove";
  readonly fullName: string | null;
  readonly firstName: string | null;
  readonly occurredAt: string;
}

export interface MetaContactSyncRepository {
  record(scope: MetaContactSyncScope, change: MetaContactSyncChange): Promise<{
    outcome: "updated" | "duplicate" | "ignored";
  }>;
}

function fail(): never { throw new MetaWebhookProcessorError("INVALID_CONTACT_SYNC"); }
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function phone(value: unknown): string {
  if (typeof value !== "string" || !/^\+?[1-9][0-9]{0,14}$/.test(value)) return fail();
  return value.startsWith("+") ? value : `+${value}`;
}
function identity(value: unknown): string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 ||
    value.length > 255 || /[\u0000-\u001f\u007f]/.test(value)) return fail();
  return value;
}
function name(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return fail();
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (!isWhatsAppDisplayName(normalized)) return fail();
  return normalized;
}

export function parseMetaContactSync(event: MetaContactSyncWebhookEvent, expectedPhoneNumberId: string): readonly MetaContactSyncChange[] {
  const value = event.value;
  if (value.messaging_product !== "whatsapp" || !record(value.metadata) ||
    value.metadata.phone_number_id !== expectedPhoneNumberId || !Array.isArray(event.stateSync) ||
    event.stateSync.length === 0 || event.stateSync.length > 10_000) return fail();
  const businessPhone = phone(value.metadata.display_phone_number);
  return Object.freeze(event.stateSync.map((entry) => {
    if (!record(entry) || entry.type !== "contact" || !record(entry.contact) ||
      !record(entry.metadata) || (entry.action !== "add" && entry.action !== "remove")) return fail();
    const phoneNumber = phone(entry.contact.phone_number);
    if (phoneNumber === businessPhone) return fail();
    const rawTime = entry.metadata.timestamp;
    const seconds = typeof rawTime === "string" && /^[0-9]{1,12}$/.test(rawTime) ? Number(rawTime) : rawTime;
    if (typeof seconds !== "number" || !Number.isSafeInteger(seconds) || seconds <= 0 || seconds > 253_402_300_799) return fail();
    // A removal retains no address-book names, even if the payload repeats them.
    return Object.freeze({ phoneNumber, action: entry.action,
      fullName: entry.action === "remove" ? null : name(entry.contact.full_name),
      firstName: entry.action === "remove" ? null : name(entry.contact.first_name),
      occurredAt: new Date(seconds * 1_000).toISOString() });
  }));
}

export function normalizeMetaContactSync(scope: MetaContactSyncScope, change: MetaContactSyncChange) {
  if (!Number.isSafeInteger(scope?.tenantId) || scope.tenantId <= 0 ||
    !Number.isSafeInteger(scope.connectionVersion) || scope.connectionVersion <= 0 ||
    !record(change) || (change.action !== "add" && change.action !== "remove") ||
    typeof change.occurredAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(change.occurredAt) ||
    !Number.isFinite(Date.parse(change.occurredAt)) || Date.parse(change.occurredAt) <= 0 ||
    new Date(change.occurredAt).toISOString() !== change.occurredAt ||
    (change.fullName !== null && !isWhatsAppDisplayName(change.fullName)) ||
    (change.firstName !== null && !isWhatsAppDisplayName(change.firstName)) ||
    (change.action === "remove" && (change.fullName !== null || change.firstName !== null))) return fail();
  return Object.freeze({
    scope: Object.freeze({ tenantId: scope.tenantId, wabaId: identity(scope.wabaId),
      phoneNumberId: identity(scope.phoneNumberId), connectionVersion: scope.connectionVersion }),
    change: Object.freeze({ phoneNumber: phone(change.phoneNumber), action: change.action,
      fullName: change.fullName, firstName: change.firstName, occurredAt: change.occurredAt }),
  });
}

export interface MetaContactSyncState {
  readonly occurredAt: string;
  readonly status: "present" | "removed" | "conflicted";
  readonly fullName: string | null;
  readonly firstName: string | null;
}

export function reduceMetaContactSync(state: MetaContactSyncState | null, change: MetaContactSyncChange): MetaContactSyncState {
  if (state !== null && state.occurredAt > change.occurredAt) return state;
  if (state?.occurredAt === change.occurredAt) {
    if (state.status === "removed") return state;
    if (change.action !== "remove") {
      if (state.status === "conflicted" || (state.fullName === change.fullName && state.firstName === change.firstName)) return state;
      return { occurredAt: state.occurredAt, status: "conflicted", fullName: null, firstName: null };
    }
  }
  return { occurredAt: change.occurredAt, status: change.action === "add" ? "present" : "removed",
    fullName: change.fullName, firstName: change.firstName };
}
