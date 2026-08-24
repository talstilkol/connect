import assert from "node:assert/strict";
import test from "node:test";
import { trace } from "@opentelemetry/api";

import {
  createOpenTelemetryLogContext,
  deriveLocalSpanId,
  deriveOpaqueW3cTraceContext,
  parseW3cTraceparent,
} from "../server/platform/w3cTraceContext.ts";

const encodedKey =
  "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY";
const requestId = "fra1::iad1::request-20260821-000001";

test("derives one deterministic opaque W3C context without exposing its inputs", async () => {
  const first = await deriveOpaqueW3cTraceContext(requestId, encodedKey);
  const second = await deriveOpaqueW3cTraceContext(requestId, encodedKey);

  assert.deepEqual(first, second);
  assert.match(
    first.traceparent,
    /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
  );
  assert.doesNotMatch(first.traceparent, /fra1|iad1|request|MDEy/);
  assert.notEqual(first.traceId, "0".repeat(32));
  assert.notEqual(first.parentSpanId, "0".repeat(16));

  const otelContext = createOpenTelemetryLogContext(first);
  assert.deepEqual(trace.getSpanContext(otelContext), {
    traceId: first.traceId,
    spanId: first.parentSpanId,
    traceFlags: 1,
    isRemote: true,
  });
  assert.equal(createOpenTelemetryLogContext(null), undefined);
});

test("strictly accepts only W3C version 00 lowercase non-zero contexts", () => {
  const valid =
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
  assert.deepEqual(parseW3cTraceparent(valid), {
    traceparent: valid,
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    parentSpanId: "00f067aa0ba902b7",
    traceFlags: 1,
  });

  for (const invalid of [
    null,
    "",
    `00-${"0".repeat(32)}-00f067aa0ba902b7-01`,
    `00-4bf92f3577b34da6a3ce929d0e0e4736-${"0".repeat(16)}-01`,
    "FF-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    "00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01",
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01-extra",
  ]) {
    assert.equal(parseW3cTraceparent(invalid), null);
  }
});

test("derives one stable Railway child span without changing propagated context", () => {
  const parsed = parseW3cTraceparent(
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  );
  assert.notEqual(parsed, null);
  assert.equal(deriveLocalSpanId(parsed, "vercel"), parsed.parentSpanId);
  assert.equal(deriveLocalSpanId(parsed, "upstream"), parsed.parentSpanId);
  assert.match(deriveLocalSpanId(parsed, "railway"), /^[0-9a-f]{16}$/);
  assert.notEqual(deriveLocalSpanId(parsed, "railway"), parsed.parentSpanId);
  assert.equal(
    trace.getSpanContext(createOpenTelemetryLogContext(parsed, "railway"))
      ?.spanId,
    deriveLocalSpanId(parsed, "railway"),
  );
});

test("rejects weak or malformed key and request identifiers", async () => {
  for (const [candidateRequestId, candidateKey] of [
    [requestId, "short"],
    [requestId, "A".repeat(43)],
    [requestId, `${encodedKey.slice(0, -1)}Z`],
    ["", encodedKey],
    ["contains space", encodedKey],
    ["x".repeat(513), encodedKey],
  ]) {
    assert.equal(
      await deriveOpaqueW3cTraceContext(candidateRequestId, candidateKey),
      null,
    );
  }
});
