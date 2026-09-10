import { createMetaGraphTransport, MetaGraphError } from "./metaGraphTransport.ts";
import { requireMetaGraphConfiguration, type MetaGraphConfiguration } from "./metaGraphConfiguration.ts";
import type { SensitiveMetaAccessToken } from "./metaPorts.ts";
import { sha256Hex } from "./metaWebhookSecurity.ts";

// Connect resource policies, not provider quotas. Binary output remains
// untrusted content and must pass private quarantine before user access.
export const MAXIMUM_META_MEDIA_DOWNLOAD_BYTES = 100 * 1024 * 1024;
export const META_MEDIA_DOWNLOAD_TIMEOUT_MS = 30_000;
export type MetaMediaDownloadErrorCode = "INVALID_INPUT" | "CONFIGURATION_INVALID" | "INVALID_METADATA" | "URL_NOT_ALLOWED" |
  "TOO_LARGE" | "CONTENT_MISMATCH" | "PROVIDER_REJECTED" | "NETWORK_ERROR" | "TIMEOUT" |
  "AUTHORIZATION_CHANGED" | "DEPENDENCY_UNAVAILABLE" | "IN_PROGRESS";
export class MetaMediaDownloadError extends Error {
  readonly code: MetaMediaDownloadErrorCode;
  constructor(code: MetaMediaDownloadErrorCode) {
    super(`Meta media acquisition failed: ${code}`);
    this.name = "MetaMediaDownloadError";
    this.code = code;
  }
}
function fail(code: MetaMediaDownloadErrorCode): never { throw new MetaMediaDownloadError(code); }
export type MetaMediaAuthorize = <T>(operation: (token: SensitiveMetaAccessToken) => Promise<T>) => Promise<T>;
export interface MetaMediaDownloadInput {
  readonly mediaId: string;
  readonly phoneNumberId: string;
  readonly contentKind: "image" | "audio" | "video" | "document" | "sticker";
  readonly expectedSha256: string | null;
  readonly expectedMimeType: string | null;
}
export interface DownloadedMetaMedia {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly contentSha256: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
}
export interface MetaMediaDownloader {
  download(input: MetaMediaDownloadInput, authorize: MetaMediaAuthorize): Promise<Readonly<DownloadedMetaMedia>>;
}
export interface MetaMediaDownloadOptions {
  readonly fetchImplementation?: typeof fetch;
  readonly maximumBytes?: number;
  readonly requestTimeoutMs?: number;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,31}$/.test(value)) return fail("INVALID_INPUT");
  return value;
}
function mime(value: unknown): string {
  if (typeof value !== "string" || value.length > 255) return fail("INVALID_METADATA");
  const normalized = value.trim().toLowerCase();
  // Ogg voice metadata can contain codecs=opus. Retain a known codec parameter
  // instead of silently dropping arbitrary parameters from a provider value.
  if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*(?:;\s*codecs=opus)?$/.test(normalized)) return fail("INVALID_METADATA");
  return normalized.replace(/;\s*/, "; ");
}
function digest(value: unknown): string {
  if (typeof value !== "string") return fail("INVALID_METADATA");
  if (/^[0-9a-fA-F]{64}$/.test(value)) return value.toLowerCase();
  if (/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    const decoded = atob(value);
    if (decoded.length === 32 && btoa(decoded) === value) return Array.from(decoded, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  }
  return fail("INVALID_METADATA");
}
function downloadUrl(raw: unknown, mediaId: string): URL {
  if (typeof raw !== "string" || raw.length > 4096 || /[\u0000-\u0020\u007f\\]/.test(raw)) return fail("URL_NOT_ALLOWED");
  let url: URL;
  try { url = new URL(raw); } catch { return fail("URL_NOT_ALLOWED"); }
  // A deliberately narrow local allowlist. No arbitrary CDN, redirect,
  // provider query token or subdomain is trusted with an access token.
  if (url.protocol !== "https:" || url.hostname !== "lookaside.fbsbx.com" || url.port !== "" || url.username || url.password || url.hash ||
    url.pathname !== "/whatsapp_business/attachments/" || [...url.searchParams.keys()].some((key) => key.toLowerCase() === "access_token") ||
    (url.searchParams.has("mid") && (url.searchParams.getAll("mid").length !== 1 || url.searchParams.get("mid") !== mediaId))) return fail("URL_NOT_ALLOWED");
  return url;
}
function size(raw: unknown, maximum: number): number {
  const value = typeof raw === "string" && /^[1-9][0-9]{0,8}$/.test(raw) ? Number(raw) : raw;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return fail("INVALID_METADATA");
  if (value > maximum) return fail("TOO_LARGE");
  return value;
}
function kindMatches(kind: MetaMediaDownloadInput["contentKind"], mediaType: string) {
  return kind === "document" || mediaType.startsWith(`${kind === "sticker" ? "image" : kind}/`);
}
function metadata(raw: unknown, input: MetaMediaDownloadInput, maximum: number) {
  if (!record(raw) || raw.id !== input.mediaId || raw.messaging_product !== "whatsapp") return fail("INVALID_METADATA");
  const mediaType = mime(raw.mime_type), contentSha256 = digest(raw.sha256), sizeBytes = size(raw.file_size, maximum);
  if (!kindMatches(input.contentKind, mediaType) || (input.expectedSha256 !== null && contentSha256 !== input.expectedSha256) ||
    (input.expectedMimeType !== null && mediaType !== input.expectedMimeType)) return fail("CONTENT_MISMATCH");
  return Object.freeze({ url: downloadUrl(raw.url, input.mediaId), mediaType, contentSha256, sizeBytes });
}
function sanitize(error: unknown): MetaMediaDownloadError {
  if (error instanceof MetaMediaDownloadError) return error;
  if (error instanceof MetaGraphError) return new MetaMediaDownloadError(error.code === "TIMEOUT" ? "TIMEOUT" :
    error.code === "API_ERROR" ? "PROVIDER_REJECTED" : error.code === "NETWORK_ERROR" ? "NETWORK_ERROR" : "INVALID_METADATA");
  return new MetaMediaDownloadError("DEPENDENCY_UNAVAILABLE");
}

export function createMetaMediaDownloader(configuration: MetaGraphConfiguration, options: MetaMediaDownloadOptions = {}): MetaMediaDownloader {
  let graphConfiguration: MetaGraphConfiguration;
  try { graphConfiguration = requireMetaGraphConfiguration({ META_GRAPH_API_VERSION: configuration?.apiVersion }); }
  catch { return fail("CONFIGURATION_INVALID"); }
  const maximum = options.maximumBytes ?? MAXIMUM_META_MEDIA_DOWNLOAD_BYTES;
  const timeoutMs = options.requestTimeoutMs ?? META_MEDIA_DOWNLOAD_TIMEOUT_MS;
  const fetchImplementation = options.fetchImplementation ?? fetch;
  if (!Number.isSafeInteger(maximum) || maximum <= 0 || maximum > MAXIMUM_META_MEDIA_DOWNLOAD_BYTES ||
    !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000 || typeof fetchImplementation !== "function" ||
    Object.keys(options).some((key) => !["fetchImplementation", "maximumBytes", "requestTimeoutMs"].includes(key))) return fail("CONFIGURATION_INVALID");
  const graph = createMetaGraphTransport(graphConfiguration, { fetchImplementation, requestTimeoutMs: timeoutMs, maxResponseBytes: 64 * 1024 });

  async function binary(expected: ReturnType<typeof metadata>, accessToken: SensitiveMetaAccessToken): Promise<Readonly<DownloadedMetaMedia>> {
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let bytes: Uint8Array<ArrayBuffer> | undefined;
    let succeeded = false;
    const cancel = () => { try { void reader?.cancel().catch(() => {}); } catch {} };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => { controller.abort(); cancel(); bytes?.fill(0); reject(new MetaMediaDownloadError("TIMEOUT")); }, timeoutMs);
    });
    const perform = async () => {
      let response: Response;
      try {
        response = await fetchImplementation(expected.url, { method: "GET", headers: { authorization: `Bearer ${accessToken}`, accept: "*/*" },
          cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal });
      } catch { return fail(controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR"); }
      if (controller.signal.aborted) { void response.body?.cancel().catch(() => {}); return fail("TIMEOUT"); }
      if (response.body !== null) reader = response.body.getReader();
      if (response.redirected || (response.url && response.url !== expected.url.href)) return fail("URL_NOT_ALLOWED");
      if (response.status !== 200) return fail("PROVIDER_REJECTED");
      if (!reader || response.headers.has("content-range") ||
        (response.headers.has("content-encoding") && response.headers.get("content-encoding") !== "identity")) return fail("CONTENT_MISMATCH");
      if (mime(response.headers.get("content-type")) !== expected.mediaType) return fail("CONTENT_MISMATCH");
      const length = response.headers.get("content-length");
      if (length !== null && size(length, maximum) !== expected.sizeBytes) return fail("CONTENT_MISMATCH");
      bytes = new Uint8Array(expected.sizeBytes);
      let offset = 0;
      while (true) {
        let result: ReadableStreamReadResult<Uint8Array>;
        try { result = await reader.read(); } catch { return fail(controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR"); }
        if (controller.signal.aborted) return fail("TIMEOUT");
        if (result.done) break;
        if (!(result.value instanceof Uint8Array) || offset + result.value.byteLength > expected.sizeBytes) return fail("CONTENT_MISMATCH");
        bytes.set(result.value, offset); offset += result.value.byteLength;
      }
      if (offset !== expected.sizeBytes) return fail("CONTENT_MISMATCH");
      const actual = await sha256Hex(bytes);
      if (controller.signal.aborted) return fail("TIMEOUT");
      if (actual !== expected.contentSha256) return fail("CONTENT_MISMATCH");
      return Object.freeze({ bytes, sizeBytes: expected.sizeBytes, mediaType: expected.mediaType, contentSha256: actual });
    };
    try {
      const result = await Promise.race([perform(), deadline]);
      succeeded = true;
      return result;
    } catch (error) { throw sanitize(error); }
    finally {
      clearTimeout(timer);
      if (!succeeded) { controller.abort(); bytes?.fill(0); cancel(); }
      try { reader?.releaseLock(); } catch {}
    }
  }
  return Object.freeze({
    async download(raw, authorize) {
      try {
        if (!record(raw) || typeof authorize !== "function" || Object.keys(raw).sort().join(",") !== "contentKind,expectedMimeType,expectedSha256,mediaId,phoneNumberId" ||
          !["image", "audio", "video", "document", "sticker"].includes(String(raw.contentKind))) return fail("INVALID_INPUT");
        const input = Object.freeze({ mediaId: identifier(raw.mediaId), phoneNumberId: identifier(raw.phoneNumberId), contentKind: raw.contentKind,
          expectedSha256: raw.expectedSha256 === null ? null : digest(raw.expectedSha256), expectedMimeType: raw.expectedMimeType === null ? null : mime(raw.expectedMimeType) });
        const info = metadata(await authorize(async (token) => {
          try {
            return await graph.requestJson({ method: "GET", pathSegments: [input.mediaId], accessToken: token,
              query: { phone_number_id: input.phoneNumberId } });
          } catch (error) { throw sanitize(error); }
        }), input, maximum);
        return await authorize((token) => binary(info, token));
      } catch (error) { throw sanitize(error); }
    },
  } satisfies MetaMediaDownloader);
}
