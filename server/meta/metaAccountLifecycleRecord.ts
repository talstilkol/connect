import type { MetaAccountUpdateWebhookEvent } from "./metaWebhookEventDispatcher.ts";
import { MetaWebhookProcessorError } from "./metaWebhookIngress.ts";

export const metaAccountLifecycleTypes = ["PARTNER_REMOVED", "ACCOUNT_OFFBOARDED", "ACCOUNT_RECONNECTED"] as const;
export type MetaAccountLifecycleType = (typeof metaAccountLifecycleTypes)[number];
export interface MetaAccountLifecycleObservation {
  event: MetaAccountLifecycleType;
  occurredAt: string;
  ownerBusinessId: string | null;
  reportedPhoneNumber: string | null;
  reason: string | null;
  initiatedBy: string | null;
}
export interface MetaAccountLifecycleCommand {
  tenantId: number;
  receiptId: number;
  eventKey: string;
  wabaId: string;
  phoneNumberId: string;
  businessPortfolioId: string;
  connectionVersion: number;
  events: readonly MetaAccountLifecycleObservation[];
}
export interface MetaAccountLifecycleRepository {
  recordBatch(command: MetaAccountLifecycleCommand): Promise<void>;
}
function fail(): never { throw new MetaWebhookProcessorError("INVALID_ACCOUNT_LIFECYCLE"); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function bounded(value: unknown, pattern: RegExp, max: number): string {
  if (typeof value !== "string" || value.length > max || !pattern.test(value)) return fail(); return value;
}
export function normalizeMetaAccountLifecycleObservation(value: MetaAccountLifecycleObservation): Readonly<MetaAccountLifecycleObservation> {
  if (!value || !metaAccountLifecycleTypes.some((event) => event === value.event) || typeof value.occurredAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(value.occurredAt) || !Number.isFinite(Date.parse(value.occurredAt)) ||
    new Date(value.occurredAt).toISOString() !== value.occurredAt || Date.parse(value.occurredAt) <= 0) return fail();
  return Object.freeze({ event: value.event, occurredAt: value.occurredAt,
    ownerBusinessId: value.ownerBusinessId === null ? null : bounded(value.ownerBusinessId, /^[1-9][0-9]*$/, 255),
    reportedPhoneNumber: value.reportedPhoneNumber === null ? null : bounded(value.reportedPhoneNumber, /^\+[1-9][0-9]{0,14}$/, 16),
    reason: value.reason === null ? null : bounded(value.reason, /^[A-Z][A-Z0-9_]*$/, 128),
    initiatedBy: value.initiatedBy === null ? null : bounded(value.initiatedBy, /^[A-Z][A-Z0-9_]*$/, 64) });
}
export function parseMetaAccountLifecycleObservation(event: MetaAccountUpdateWebhookEvent, wabaId: string): Readonly<MetaAccountLifecycleObservation> {
  const value = event.value;
  if (!record(value) || !Number.isSafeInteger(event.occurredAt) || event.occurredAt <= 0 || event.occurredAt > 253_402_300_799) return fail();
  let ownerBusinessId: string | null = null;
  if (value.waba_info !== undefined) {
    if (!record(value.waba_info) || value.waba_info.waba_id !== wabaId) return fail();
    ownerBusinessId = value.waba_info.owner_business_id === undefined ? null : bounded(value.waba_info.owner_business_id, /^[1-9][0-9]*$/, 255);
  }
  let reportedPhoneNumber: string | null = null;
  if (value.phone_number !== undefined) {
    const phone = bounded(value.phone_number, /^\+?[1-9][0-9]{0,14}$/, 16);
    reportedPhoneNumber = phone.startsWith("+") ? phone : `+${phone}`;
  }
  let reason: string | null = null, initiatedBy: string | null = null;
  if (value.disconnection_info !== undefined) {
    if (value.event !== "PARTNER_REMOVED" || !record(value.disconnection_info)) return fail();
    reason = value.disconnection_info.reason === undefined ? null : bounded(value.disconnection_info.reason, /^[A-Z][A-Z0-9_]*$/, 128);
    initiatedBy = value.disconnection_info.initiated_by === undefined ? null : bounded(value.disconnection_info.initiated_by, /^[A-Z][A-Z0-9_]*$/, 64);
  }
  return normalizeMetaAccountLifecycleObservation({ event: value.event as MetaAccountLifecycleType, occurredAt: new Date(event.occurredAt * 1000).toISOString(),
    ownerBusinessId, reportedPhoneNumber, reason, initiatedBy });
}
