import {
  ROOT_CONTEXT,
  trace,
  type Context,
  type SpanContext,
} from "@opentelemetry/api";

export const W3C_TRACEPARENT_HEADER = "traceparent" as const;

const VERSION_ZERO_TRACEPARENT_PATTERN =
  /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const ALL_ZERO_TRACE_ID = "0".repeat(32);
const ALL_ZERO_SPAN_ID = "0".repeat(16);
const OPAQUE_TRACE_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const VERCEL_REQUEST_ID_PATTERN = /^[A-Za-z0-9:._-]{1,512}$/;

export type W3cTraceContext = Readonly<{
  traceparent: string;
  traceId: string;
  parentSpanId: string;
  traceFlags: number;
}>;

function decodeCanonicalKey(value: string): Uint8Array | null {
  if (!OPAQUE_TRACE_KEY_PATTERN.test(value)) {
    return null;
  }

  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/") + "=";
    const binary = globalThis.atob(base64);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );

    if (bytes.byteLength !== 32) {
      return null;
    }

    const canonical = globalThis.btoa(
      Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""),
    ).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    if (canonical !== value) {
      return null;
    }

    return bytes.every((byte) => byte === 0) ? null : bytes;
  } catch {
    return null;
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function deriveHmac(
  keyBytes: Uint8Array,
  purpose: "trace" | "vercel-span",
  requestId: string,
): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new Uint8Array(keyBytes).buffer,
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const input = new TextEncoder().encode(
    `connect.opaque-trace.v1\u0000${purpose}\u0000${requestId}`,
  );
  return new Uint8Array(
    await globalThis.crypto.subtle.sign("HMAC", key, input),
  );
}

export function parseW3cTraceparent(
  value: string | null,
): W3cTraceContext | null {
  if (value === null) {
    return null;
  }

  const match = VERSION_ZERO_TRACEPARENT_PATTERN.exec(value);
  if (
    match === null ||
    match[1] === ALL_ZERO_TRACE_ID ||
    match[2] === ALL_ZERO_SPAN_ID
  ) {
    return null;
  }

  return Object.freeze({
    traceparent: value,
    traceId: match[1],
    parentSpanId: match[2],
    traceFlags: Number.parseInt(match[3], 16),
  });
}

export async function deriveOpaqueW3cTraceContext(
  requestId: string,
  encodedKey: string,
): Promise<W3cTraceContext | null> {
  const keyBytes = decodeCanonicalKey(encodedKey);
  if (
    keyBytes === null ||
    !VERCEL_REQUEST_ID_PATTERN.test(requestId)
  ) {
    return null;
  }

  const [traceDigest, spanDigest] = await Promise.all([
    deriveHmac(keyBytes, "trace", requestId),
    deriveHmac(keyBytes, "vercel-span", requestId),
  ]);
  const traceId = toHex(traceDigest.subarray(0, 16));
  const parentSpanId = toHex(spanDigest.subarray(0, 8));

  return parseW3cTraceparent(
    `00-${traceId}-${parentSpanId}-01`,
  );
}

export function createOpenTelemetryLogContext(
  value: W3cTraceContext | null,
  role: "upstream" | "vercel" | "railway" = "upstream",
): Context | undefined {
  if (value === null) {
    return undefined;
  }

  const spanContext: SpanContext = {
    traceId: value.traceId,
    spanId: deriveLocalSpanId(value, role),
    traceFlags: value.traceFlags,
    isRemote: role === "upstream",
  };

  return trace.setSpanContext(ROOT_CONTEXT, spanContext);
}

export function deriveLocalSpanId(
  value: W3cTraceContext,
  role: "upstream" | "vercel" | "railway",
): string {
  if (role === "upstream" || role === "vercel") {
    return value.parentSpanId;
  }

  const high = (
    Number.parseInt(value.traceId.slice(16, 24), 16) ^
    Number.parseInt(value.parentSpanId.slice(0, 8), 16) ^
    0x7261696c
  ) >>> 0;
  const low = (
    Number.parseInt(value.traceId.slice(24, 32), 16) ^
    Number.parseInt(value.parentSpanId.slice(8, 16), 16) ^
    0x77617901
  ) >>> 0;
  const normalizedHigh = high === 0 && low === 0 ? 0x7261696c : high;
  const normalizedLow = high === 0 && low === 0 ? 0x77617901 : low;
  return `${normalizedHigh.toString(16).padStart(8, "0")}${
    normalizedLow.toString(16).padStart(8, "0")
  }`;
}
