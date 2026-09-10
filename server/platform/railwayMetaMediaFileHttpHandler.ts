import type { TenantSession } from "../auth/tenantSession.ts";
import { MetaMediaFileReadError, type AuthorizedMetaMediaFile } from "../meta/metaMediaFileRead.ts";
import type { EndUserSessionVerifier } from "./railwayApiHttpHandler.ts";
import type { RailwayTenantSessionResolver } from "./railwayTenantSessionResolver.ts";
import type { createRailwayMetaMediaFileReadRuntime } from "./railwayMetaMediaFileReadRuntime.ts";

export const RAILWAY_MEDIA_FILE_PREFIX = "/v1/media-files/";
export type RailwayMetaMediaFileDelivery = (file: AuthorizedMetaMediaFile, headers: Headers, signal: AbortSignal) => Promise<void>;
export interface RailwayMetaMediaFileHttpHandler {
  // null means the trusted consumer already completed the binary response.
  handle(request: Request, deliver: RailwayMetaMediaFileDelivery): Promise<Response | null>;
  close(): Promise<void>;
}
export function createRailwayMetaMediaFileHttpHandler(dependencies: Readonly<{
  origin: string;
  verifier: EndUserSessionVerifier;
  sessions: Pick<RailwayTenantSessionResolver, "resolve">;
  files: ReturnType<typeof createRailwayMetaMediaFileReadRuntime>;
  deadlineMs?: number;
}>): RailwayMetaMediaFileHttpHandler {
  const deadlineMs = dependencies.deadlineMs ?? 120_000;
  const origin = new URL(dependencies.origin);
  if (origin.origin !== dependencies.origin || !["http:", "https:"].includes(origin.protocol) ||
    (origin.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) ||
    !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 120_000) throw new Error("Media HTTP configuration is invalid");
  let closed = false;
  let active: { controller: AbortController; settled: Promise<void> } | undefined;
  function headers(cors: boolean) {
    const headers = new Headers({ "cache-control": "private, no-store", "x-content-type-options": "nosniff",
      "x-frame-options": "DENY", "referrer-policy": "no-referrer", "vary": "Origin" });
    if (cors) {
      headers.set("access-control-allow-origin", dependencies.origin);
      headers.set("access-control-expose-headers", "Content-Disposition, Retry-After");
    }
    return headers;
  }
  function response(status: number, cors: boolean) {
    const result = headers(cors);
    result.set("content-type", "text/plain; charset=utf-8");
    if (status === 429) result.set("retry-after", "60");
    if (status === 503) result.set("retry-after", "5");
    return new Response("MEDIA_FILE_UNAVAILABLE", { status, headers: result });
  }
  return Object.freeze({
    async handle(request: Request, deliver: RailwayMetaMediaFileDelivery) {
      const url = new URL(request.url), cors = request.headers.get("origin") === dependencies.origin;
      const match = /^\/v1\/media-files\/(message_v1_[0-9a-f]{64})$/.exec(url.pathname);
      if (!match || url.search || url.hash) return response(404, cors);
      if (!cors) return response(403, false);
      if (request.headers.has("range") || request.headers.has("cookie") || request.headers.has("transfer-encoding") ||
        (request.headers.has("content-length") && request.headers.get("content-length") !== "0")) return response(400, true);
      if (request.method === "OPTIONS") {
        if (request.headers.get("access-control-request-method") !== "GET" ||
          request.headers.get("access-control-request-headers")?.toLowerCase().trim() !== "authorization") return response(403, true);
        const result = headers(true);
        result.set("access-control-allow-methods", "GET"); result.set("access-control-allow-headers", "Authorization");
        result.set("vary", "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
        return new Response(null, { status: 204, headers: result });
      }
      if (request.method !== "GET" || request.body !== null) return response(405, true);
      const authorization = request.headers.get("authorization");
      // Clerk session JWT, passed only in a header. No query/cookie credentials.
      const token = authorization && /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization)?.[1];
      if (!token || token.length > 8192) return response(401, true);
      if (closed || active) return response(503, true);
      const controller = new AbortController();
      const cancel = () => controller.abort();
      request.signal.addEventListener("abort", cancel, { once: true });
      if (request.signal.aborted) cancel();
      const timer = setTimeout(cancel, deadlineMs);
      const check = () => { if (controller.signal.aborted || closed) throw new MetaMediaFileReadError("DEPENDENCY_UNAVAILABLE"); };
      // Keep the single-flight slot until dependencies actually settle, even if
      // a timeout returns early. A late identity result cannot start S3 or send bytes.
      let done: () => void = () => {};
      const flight = { controller, settled: new Promise<void>(resolve => { done = resolve; }) };
      active = flight;
      const work = (async (): Promise<Response | null> => {
        try {
          check();
          const identity = await dependencies.verifier.verify(token); check();
          if (!identity) return response(401, true);
          const session = await dependencies.sessions.resolve(identity); check();
          const authorizeRequest = async () => {
            check(); const current = await dependencies.verifier.verify(token); check();
            if (!current || current.externalUserId !== identity.externalUserId || current.externalOrganizationId !== identity.externalOrganizationId) {
              throw new MetaMediaFileReadError("ACCESS_DENIED");
            }
            const selected: TenantSession = await dependencies.sessions.resolve(current); check();
            if (selected.tenantId !== session.tenantId || selected.externalUserId !== session.externalUserId) throw new MetaMediaFileReadError("ACCESS_DENIED");
          };
          await authorizeRequest();
          await dependencies.files.admit(session, match[1]); check();
          await dependencies.files.withFile(session, match[1], async file => {
            check(); const result = headers(true);
            result.set("content-type", file.contentType); result.set("content-disposition", "attachment; filename=\"media.bin\"");
            result.set("content-length", String(file.sizeBytes));
            await deliver(file, result, controller.signal);
          }, { signal: controller.signal, authorizeRequest });
          return null;
        } catch (error) {
          const code = error instanceof MetaMediaFileReadError ? error.code : "DEPENDENCY_UNAVAILABLE";
          return response(code === "ACCESS_DENIED" ? 403 : code === "RATE_LIMITED" ? 429 : code === "NOT_READY" || code === "CONTENT_MISMATCH" ? 409 : 503, true);
        } finally {
          clearTimeout(timer); request.signal.removeEventListener("abort", cancel);
          if (active === flight) active = undefined;
          done();
        }
      })();
      let onAbort: () => void = () => {};
      const aborted = new Promise<Response>(resolve => {
        onAbort = () => resolve(response(503, true));
        controller.signal.addEventListener("abort", onAbort, { once: true });
        if (controller.signal.aborted) onAbort();
      });
      try { return await Promise.race([work, aborted]); }
      finally { controller.signal.removeEventListener("abort", onAbort); }
    },
    async close() {
      closed = true; const pending = active; pending?.controller.abort();
      dependencies.files.close(); await pending?.settled;
    },
  });
}
