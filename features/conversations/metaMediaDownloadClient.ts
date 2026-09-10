export const META_MEDIA_DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024;
export function readMetaMediaDownloadOrigin(value: string | undefined, production: boolean): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && !production && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) return null;
    return url.origin;
  } catch { return null; }
}
export class MetaMediaDownloadError extends Error {
  readonly code: "unavailable" | "rate-limited" | "signed-out";
  constructor(code: MetaMediaDownloadError["code"] = "unavailable") { super("Media download unavailable"); this.code = code; }
}
export async function getMetaMediaDownloadToken(getToken: () => Promise<string | null>, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  let cancel: () => void = () => {};
  try {
    const aborted = new Promise<never>((_resolve, reject) => {
      cancel = () => reject(new DOMException("Download cancelled", "AbortError"));
      signal.addEventListener("abort", cancel, { once: true });
    });
    const token = await Promise.race([getToken(), aborted]); signal.throwIfAborted();
    if (!token) throw new MetaMediaDownloadError("signed-out");
    return token;
  } finally { signal.removeEventListener("abort", cancel); }
}
export async function fetchMetaMediaDownload(options: Readonly<{
  origin: string; messageKey: string; token: string; signal: AbortSignal; fetch?: typeof fetch;
}>): Promise<Blob> {
  if (!readMetaMediaDownloadOrigin(options.origin, false) || !/^message_v1_[0-9a-f]{64}$/.test(options.messageKey) ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(options.token) || options.token.length > 8192) throw new MetaMediaDownloadError();
  options.signal.throwIfAborted();
  const response = await (options.fetch ?? fetch)(`${options.origin}/v1/media-files/${options.messageKey}`, {
    method: "GET", headers: { authorization: `Bearer ${options.token}` }, credentials: "omit", cache: "no-store",
    redirect: "error", referrerPolicy: "no-referrer", signal: options.signal,
  });
  let bytes: Uint8Array<ArrayBuffer> | undefined;
  const reader = response.body?.getReader();
  const cancel = () => { void reader?.cancel().catch(() => {}); };
  options.signal.addEventListener("abort", cancel, { once: true });
  try {
    options.signal.throwIfAborted();
    if (response.status !== 200) throw new MetaMediaDownloadError(response.status === 429 ? "rate-limited" : response.status === 401 ? "signed-out" : "unavailable");
    const length = response.headers.get("content-length");
    const size = length && /^[1-9][0-9]{0,8}$/.test(length) ? Number(length) : 0;
    if (!reader || response.redirected || response.headers.get("content-type") !== "application/octet-stream" ||
      response.headers.get("content-disposition") !== 'attachment; filename="media.bin"' ||
      response.headers.get("cache-control") !== "private, no-store" || response.headers.has("content-range") ||
      size < 1 || size > META_MEDIA_DOWNLOAD_MAX_BYTES) throw new MetaMediaDownloadError();
    bytes = new Uint8Array(size); let offset = 0;
    while (true) {
      const chunk = await reader.read(); options.signal.throwIfAborted();
      if (chunk.done) break;
      if (!(chunk.value instanceof Uint8Array) || !chunk.value.length || offset + chunk.value.length > size) throw new MetaMediaDownloadError();
      bytes.set(chunk.value, offset); offset += chunk.value.length;
    }
    if (offset !== size) throw new MetaMediaDownloadError();
    return new Blob([bytes], { type: "application/octet-stream" });
  } finally {
    options.signal.removeEventListener("abort", cancel); cancel(); reader?.releaseLock(); bytes?.fill(0);
  }
}
