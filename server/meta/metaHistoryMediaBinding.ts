import type { MetaHistoryItem, MetaHistoryMessage, MetaHistoryScope } from "./metaHistorySync.ts";

export type MetaHistoryMediaItem = Extract<MetaHistoryItem, { kind: "media" }>;
export interface BoundMetaHistoryMedia {
  readonly scope: Readonly<MetaHistoryScope>;
  readonly messageKey: string;
  readonly message: MetaHistoryMessage;
  readonly media: MetaHistoryMediaItem;
}
export interface MetaHistoryMediaSource {
  readBoundMedia(tenantId: number, messageKey: string): Promise<Readonly<BoundMetaHistoryMedia> | null>;
}

// Inputs have already passed normalizeMetaHistorySync. The separate media
// event's sender/time are observations, not replacement message identity.
export function isMetaHistoryMediaCompatible(message: MetaHistoryMessage, media: MetaHistoryMediaItem): boolean {
  if (message.providerMessageId !== media.providerMessageId) return false;
  if (message.contentKind === "media_placeholder") return message.content === null;
  if (message.contentKind !== media.contentKind || typeof message.content !== "object" || message.content === null ||
    Array.isArray(message.content) || typeof media.content !== "object" || media.content === null || Array.isArray(media.content)) return false;
  const original = message.content as Record<string, unknown>;
  const incoming = media.content as Record<string, unknown>;
  // A media event may enrich an original descriptor, but cannot contradict
  // a field both sources supplied. Canonical content has stable key order.
  return Object.keys(original).every((key) => !Object.hasOwn(incoming, key) || JSON.stringify(original[key]) === JSON.stringify(incoming[key]));
}
