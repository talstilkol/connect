import type { PaddleConfiguration } from "./paddleConfiguration.ts";
import { PaddleError, paddleDigest, paddleId, paddleRecord, parsePaddleSubscription, parsePaddleTransaction, type PaddleCreationObservation, type PaddleProvider } from "./paddleProtocol.ts";

export async function readPaddleBody(stream: ReadableStream<Uint8Array> | null, signal: AbortSignal, limit = 262144): Promise<Uint8Array> {
  if (!stream) throw new PaddleError("INVALID_REQUEST");
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) { if (signal.aborted) throw new PaddleError("DEPENDENCY_UNAVAILABLE"); const part = await reader.read(); if (part.done) break;
      length += part.value.length; if (length > limit) throw new PaddleError("INVALID_REQUEST"); chunks.push(part.value); }
    if (signal.aborted || length === 0) throw new PaddleError("INVALID_REQUEST");
    const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
  } finally { signal.removeEventListener("abort", cancel); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
// One fetch per invocation. A lost response is never converted into another POST.
export function createPaddleProvider(config: PaddleConfiguration, transport: typeof fetch = fetch): PaddleProvider {
  const origin = config.environment === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  async function request(path: string, body?: unknown, authorize?: () => Promise<boolean>, observe?: (observation: PaddleCreationObservation) => Promise<void>): Promise<unknown> {
    const signal = AbortSignal.timeout(8000);
    if (authorize && !await authorize()) throw new PaddleError("AUTHORIZATION_DENIED");
    if (signal.aborted) throw new PaddleError("DEPENDENCY_UNAVAILABLE");
    try {
      const response = await transport(`${origin}${path}`, { method: body === undefined ? "GET" : "POST", redirect: "error", cache: "no-store", signal,
        headers: { authorization: `Bearer ${config.apiKey}`, "paddle-version": "1", accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const bytes = await readPaddleBody(response.body, signal);
      const envelope = paddleRecord(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
      if (observe) {
        const meta = envelope.meta && typeof envelope.meta === "object" ? envelope.meta as Record<string, unknown> : null;
        const data = envelope.data && typeof envelope.data === "object" ? envelope.data as Record<string, unknown> : null;
        const requestId = typeof meta?.request_id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(meta.request_id) ? meta.request_id : null;
        const transactionId = response.ok && typeof data?.id === "string" && /^txn_[a-z0-9]{26}$/.test(data.id) ? data.id : null;
        // Persist only correlation and a digest, before validating the business projection.
        // A failed observation acknowledgment never authorizes a second POST.
        await observe({ requestId, httpStatus: response.status, transactionId, responseDigest: paddleDigest(envelope) });
      }
      if (!response.ok) throw new PaddleError("DEPENDENCY_UNAVAILABLE");
      return envelope.data;
    } catch { throw new PaddleError("DEPENDENCY_UNAVAILABLE"); }
  }
  return {
    async createTransaction(intent, authorize, observe) {
      if (intent.environment !== config.environment || intent.priceId !== config.priceId || intent.productId !== config.productId || intent.checkoutBaseUrl !== config.checkoutBaseUrl) throw new PaddleError("CONFLICT");
      const data = await request("/transactions", { items: [{ price_id: intent.priceId, quantity: 1 }], collection_mode: "automatic", checkout: { url: intent.checkoutBaseUrl } }, authorize, observe);
      const result = parsePaddleTransaction(data, intent);
      if (!["draft", "ready"].includes(result.status) || result.subscriptionId !== null || result.checkoutUrl === null) throw new PaddleError("CONFLICT");
      return result;
    },
    async getTransaction(id, plan) {
      if (plan.environment !== config.environment) throw new PaddleError("CONFLICT");
      const result = parsePaddleTransaction(await request(`/transactions/${paddleId(id, "txn")}`), plan);
      if (result.id !== id) throw new PaddleError("CONFLICT"); return result;
    },
    async getSubscription(id, plan) {
      if (plan.environment !== config.environment) throw new PaddleError("CONFLICT");
      const result = parsePaddleSubscription(await request(`/subscriptions/${paddleId(id, "sub")}`), plan);
      if (result.id !== id) throw new PaddleError("CONFLICT"); return result;
    },
  };
}
