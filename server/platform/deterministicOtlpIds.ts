import { createHash } from "node:crypto";
import type { IdGenerator } from "@opentelemetry/sdk-trace";

export type DeterministicOtlpIds = Readonly<{
  traceId: string;
  spanId: string;
}>;

export interface PrimeableDeterministicIdGenerator extends IdGenerator {
  readonly withIds: <T>(
    traceId: string | null,
    spanId: string,
    callback: () => T,
  ) => T;
}

const namespacePattern = /^[a-z][a-z0-9.-]{2,63}$/;
const maximumCanonicalInputLength = 16_384;

function digest(namespace: string, purpose: "trace" | "span", input: string):
string {
  return createHash("sha256")
    .update(`connect.otel.ids.v1\u0000${namespace}\u0000${purpose}\u0000`)
    .update(input)
    .digest("hex");
}

export function deriveDeterministicOtlpIds(
  namespace: string,
  canonicalInput: string,
): DeterministicOtlpIds | null {
  if (
    !namespacePattern.test(namespace) ||
    typeof canonicalInput !== "string" ||
    canonicalInput.length === 0 ||
    canonicalInput.length > maximumCanonicalInputLength
  ) {
    return null;
  }

  const traceId = digest(namespace, "trace", canonicalInput).slice(0, 32);
  const spanId = digest(namespace, "span", canonicalInput).slice(0, 16);
  if (traceId === "0".repeat(32) || spanId === "0".repeat(16)) {
    return null;
  }
  return Object.freeze({ traceId, spanId });
}

export function createPrimeableDeterministicIdGenerator():
PrimeableDeterministicIdGenerator {
  let nextTraceId: string | null = null;
  let nextSpanId: string | null = null;
  let primed = false;

  return Object.freeze({
    generateTraceId() {
      if (!primed || nextTraceId === null) {
        throw new Error("A deterministic trace identifier was not supplied");
      }
      return nextTraceId;
    },
    generateSpanId() {
      if (!primed || nextSpanId === null) {
        throw new Error("A deterministic span identifier was not supplied");
      }
      return nextSpanId;
    },
    withIds<T>(
      traceId: string | null,
      spanId: string,
      callback: () => T,
    ): T {
      if (primed) {
        throw new Error("Deterministic identifiers are already in use");
      }
      primed = true;
      nextTraceId = traceId;
      nextSpanId = spanId;
      try {
        return callback();
      } finally {
        nextTraceId = null;
        nextSpanId = null;
        primed = false;
      }
    },
  });
}
