import { createHmac, timingSafeEqual } from "node:crypto";
import { PaddleError, paddleDigest, paddleId, paddleRecord, paddleTimestamp, type PaddleNotice } from "./paddleProtocol.ts";
import { readPaddleBody } from "./paddleProvider.ts";

export function verifyPaddleNotice(bytes: Uint8Array, signature: string | null, secret: string, now: number): PaddleNotice {
  if (bytes.length < 1 || bytes.length > 262144 || !signature || signature.length > 1024 || !Number.isFinite(now)) throw new PaddleError("INVALID_SIGNATURE");
  const components = signature.split(";"); let timestamp: string | undefined; const signatures: string[] = [];
  for (const component of components) {
    const [key, value, extra] = component.trim().split("=");
    if (extra !== undefined) throw new PaddleError("INVALID_SIGNATURE");
    if (key === "ts" && timestamp === undefined && /^\d{10,12}$/.test(value ?? "")) timestamp = value;
    else if (key === "h1" && /^[a-f0-9]{64}$/.test(value ?? "") && signatures.length < 8) signatures.push(value);
    else throw new PaddleError("INVALID_SIGNATURE");
  }
  if (!timestamp || signatures.length === 0 || Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 5) throw new PaddleError("INVALID_SIGNATURE");
  const expected = createHmac("sha256", secret).update(`${timestamp}:`).update(bytes).digest();
  let valid = false; for (const candidate of signatures) valid = timingSafeEqual(expected, Buffer.from(candidate, "hex")) || valid;
  if (!valid) throw new PaddleError("INVALID_SIGNATURE");
  let event: Record<string, unknown>;
  try { event = paddleRecord(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))); } catch { throw new PaddleError("INVALID_REQUEST"); }
  const eventId = paddleId(event.event_id, "evt"), occurredAt = paddleTimestamp(event.occurred_at);
  if (typeof event.event_type !== "string" || !/^[a-z_]{1,64}\.[a-z_]{1,64}$/.test(event.event_type)) throw new PaddleError("INVALID_REQUEST");
  const data = paddleRecord(event.data);
  const entityId = event.event_type.startsWith("transaction.") ? paddleId(data.id, "txn") : event.event_type.startsWith("subscription.") ? paddleId(data.id, "sub") : null;
  // notification_id differs between deliveries/destinations; it is not event identity.
  return { eventId, eventType: event.event_type, occurredAt, entityId, digest: paddleDigest({ eventId, eventType: event.event_type, occurredAt, data }) };
}
export function createPaddleWebhookHandler(secret: string, record: (notice: PaddleNotice) => Promise<void>, clock = Date.now) {
  return { async handle(request: Request): Promise<Response> {
    const headers = { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" };
    if (request.method !== "POST" || new URL(request.url).search || !/^application\/json(?:\s*;.*)?$/i.test(request.headers.get("content-type") ?? "") || request.headers.has("content-encoding")) return new Response("INVALID_REQUEST", { status: 400, headers });
    try {
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(4000)]);
      const bytes = await readPaddleBody(request.body, signal);
      const notice = verifyPaddleNotice(bytes, request.headers.get("paddle-signature"), secret, clock());
      await record(notice); return new Response("OK", { status: 200, headers });
    } catch (error) {
      const code = error instanceof PaddleError ? error.code : "DEPENDENCY_UNAVAILABLE";
      return new Response(code, { status: code === "INVALID_SIGNATURE" ? 401 : code === "INVALID_REQUEST" ? 400 : 503, headers });
    }
  } };
}
