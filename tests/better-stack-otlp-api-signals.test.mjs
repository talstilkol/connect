import assert from "node:assert/strict";
import test from "node:test";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace";

import {
  createBetterStackOtlpApiSignalsRuntime,
} from "../server/platform/betterStackOtlpApiSignals.ts";
import {
  deriveLocalSpanId,
} from "../server/platform/w3cTraceContext.ts";

const configuration = Object.freeze({
  runtimeEnvironment: "staging",
  releaseSha: "c".repeat(40),
  endpoint: "https://in.logs.betterstack.com/v1/logs",
  sourceToken: "bounded-api-signals-source-token",
});
const traceContext = Object.freeze({
  traceparent:
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
  parentSpanId: "00f067aa0ba902b7",
  traceFlags: 1,
});

function fixture(serviceName) {
  const spanExporter = new InMemorySpanExporter();
  const metricExporter = new InMemoryMetricExporter(
    AggregationTemporality.CUMULATIVE,
  );
  const endpoints = [];
  const runtime = createBetterStackOtlpApiSignalsRuntime(
    configuration,
    serviceName,
    {
      createTraceExporter(endpoint, token) {
        endpoints.push({ kind: "traces", endpoint, token });
        return spanExporter;
      },
      createMetricExporter(endpoint, token) {
        endpoints.push({ kind: "metrics", endpoint, token });
        return metricExporter;
      },
      clock: () => 2_000,
    },
  );
  return { runtime, spanExporter, metricExporter, endpoints };
}

function metricNames(metricExporter) {
  return metricExporter.getMetrics().flatMap((resourceMetrics) =>
    resourceMetrics.scopeMetrics.flatMap((scopeMetrics) =>
      scopeMetrics.metrics.map((metric) => metric.descriptor.name),
    ),
  );
}

test("exports a deterministic Vercel root span and bounded request metrics", async () => {
  const testFixture = fixture("connect-vercel-web");
  assert.deepEqual(testFixture.endpoints, [
    {
      kind: "traces",
      endpoint: "https://in.logs.betterstack.com/v1/traces",
      token: configuration.sourceToken,
    },
    {
      kind: "metrics",
      endpoint: "https://in.logs.betterstack.com/v1/metrics",
      token: configuration.sourceToken,
    },
  ]);

  assert.equal(testFixture.runtime.record({
    role: "vercel-client",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "remote-error",
    code: "RATE_LIMITED",
    durationMilliseconds: 25,
    traceContext,
  }), true);
  await testFixture.runtime.forceFlush();

  const [span] = testFixture.spanExporter.getFinishedSpans();
  assert.equal(span.name, "connect.railway-api.client");
  assert.equal(span.spanContext().traceId, traceContext.traceId);
  assert.equal(span.spanContext().spanId, traceContext.parentSpanId);
  assert.equal(span.parentSpanContext, undefined);
  assert.deepEqual(span.attributes, {
    "connect.schema.version": 1,
    "connect.operation.outcome": "remote-error",
    "connect.event.code": "RATE_LIMITED",
    "connect.request.role": "vercel-client",
    "connect.operation.name": "contacts.list",
    "connect.request.kind": "query",
  });
  assert.equal(span.status.code, 2);
  assert.deepEqual(metricNames(testFixture.metricExporter).sort(), [
    "connect.railway_api.duration",
    "connect.railway_api.requests",
  ]);
  assert.doesNotMatch(
    JSON.stringify({ spans: [span.attributes], metrics: metricNames(
      testFixture.metricExporter,
    ) }),
    /token|tenant|payload|authorization|header|url/i,
  );
  await testFixture.runtime.shutdown();
  await testFixture.runtime.shutdown();
});

test("exports Railway as a deterministic child of the propagated Vercel span", async () => {
  const testFixture = fixture("connect-railway-api");
  assert.equal(testFixture.runtime.record({
    role: "railway-server",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "ok",
    code: "OK",
    durationMilliseconds: 20,
    traceContext,
  }), true);
  await testFixture.runtime.forceFlush();

  const [span] = testFixture.spanExporter.getFinishedSpans();
  assert.equal(span.name, "connect.railway-api.server");
  assert.equal(span.spanContext().traceId, traceContext.traceId);
  assert.equal(
    span.spanContext().spanId,
    deriveLocalSpanId(traceContext, "railway"),
  );
  assert.equal(span.parentSpanContext?.spanId, traceContext.parentSpanId);
  assert.equal(span.parentSpanContext?.isRemote, true);
  assert.equal(span.status.code, 1);
  await testFixture.runtime.shutdown();
});

test("rejects malformed and high-cardinality signals without exporting", async () => {
  const testFixture = fixture("connect-vercel-web");
  const valid = {
    role: "vercel-client",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "ok",
    code: "OK",
    durationMilliseconds: 1,
    traceContext,
  };
  assert.equal(testFixture.runtime.record({
    ...valid,
    operation: "contacts.list/private-user",
  }), false);
  assert.equal(testFixture.runtime.record({
    ...valid,
    code: "private error text",
  }), false);
  assert.equal(testFixture.runtime.record({
    ...valid,
    role: "railway-server",
    outcome: "client-error",
  }), false);
  assert.equal(testFixture.runtime.record({
    ...valid,
    traceContext: { ...traceContext, traceId: "0".repeat(32) },
  }), false);
  await testFixture.runtime.forceFlush();
  assert.equal(testFixture.spanExporter.getFinishedSpans().length, 0);
  assert.deepEqual(metricNames(testFixture.metricExporter), []);
  await testFixture.runtime.shutdown();
});

test("rejects untrusted OTLP destinations and malformed release credentials", () => {
  const dependencies = {
    createTraceExporter() {
      throw new Error("exporter must not be created");
    },
    createMetricExporter() {
      throw new Error("exporter must not be created");
    },
    clock: () => 2_000,
  };

  for (const invalidConfiguration of [
    {
      ...configuration,
      endpoint: "https://example.com/v1/logs",
    },
    {
      ...configuration,
      endpoint: "https://in.logs.betterstack.com/v1/traces",
    },
    {
      ...configuration,
      releaseSha: "not-a-release-sha",
    },
    {
      ...configuration,
      sourceToken: "short",
    },
  ]) {
    assert.throws(
      () => createBetterStackOtlpApiSignalsRuntime(
        invalidConfiguration,
        "connect-vercel-web",
        dependencies,
      ),
      /configuration is invalid/,
    );
  }
});
