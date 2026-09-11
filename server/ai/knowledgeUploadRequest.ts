import { sha256Hex } from "../meta/metaWebhookSecurity.ts";
// Bounded relay fits the existing 256 KiB Railway envelope. Segments respect
// the contract's 16 KiB per-string limit; they are not independent uploads.
export const KNOWLEDGE_MAX_UPLOAD_BYTES = 131_072;
export const KNOWLEDGE_UPLOAD_OPERATION = "ai.knowledge.upload";
export class KnowledgeIngestionError extends Error {
  readonly code: "INVALID_REQUEST" | "AUTHORIZATION_DENIED" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE" | "CONFIGURATION_REQUIRED";
  constructor(code: "INVALID_REQUEST" | "AUTHORIZATION_DENIED" | "CONFLICT" | "DEPENDENCY_UNAVAILABLE" | "CONFIGURATION_REQUIRED") {
    super(code); this.code=code; this.name = "KnowledgeIngestionError";
  }
}
export interface KnowledgeUploadPayload { readonly fileName: string; readonly mediaType: string; readonly segments: readonly string[]; }
export function parseKnowledgeUploadPayload(raw: unknown): KnowledgeUploadPayload {
  const invalid = (): never => { throw new KnowledgeIngestionError("INVALID_REQUEST"); };
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).sort().join(",") !== "fileName,mediaType,segments") return invalid();
  const p = raw as Record<string, unknown>;
  if (typeof p.fileName !== "string" || p.fileName.length < 1 || p.fileName.length > 512 || p.fileName.trim() !== p.fileName || /[\u0000-\u001f\u007f]/.test(p.fileName) ||
    (p.mediaType !== "text/plain" && p.mediaType !== "text/markdown") || !Array.isArray(p.segments) || p.segments.length < 1 || p.segments.length > 11 ||
    p.segments.some((s, i) => typeof s !== "string" || s.length === 0 || s.length > 16384 || s.length % 4 !== 0 ||
      (i < (p.segments as unknown[]).length - 1 ? s.length !== 16384 || !/^[A-Za-z0-9+/]+$/.test(s) : !/^[A-Za-z0-9+/]+={0,2}$/.test(s)))) return invalid();
  const encoded = p.segments.join("");
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.length > KNOWLEDGE_MAX_UPLOAD_BYTES || bytes.toString("base64") !== encoded) return invalid();
  return Object.freeze({ fileName: p.fileName, mediaType: p.mediaType, segments: Object.freeze([...p.segments]) });
}
export async function knowledgeUploadContent(payload: KnowledgeUploadPayload) {
  const bytes = new Uint8Array(Buffer.from(payload.segments.join(""), "base64"));
  return { bytes, contentSha256: await sha256Hex(bytes) };
}
