import assert from "node:assert/strict";
import test from "node:test";
import { trace } from "@opentelemetry/api";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
} from "@opentelemetry/sdk-metrics";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace";

import {
  createBetterStackOtlpWorkerSignalsRuntime,
  createRailwayWorkerEventOpenTelemetryContext,
} from "../server/platform/betterStackOtlpWorkerSignals.ts";

const configuration = Object.freeze({
  runtimeEnvironment: "staging",
  releaseSha: "d".repeat(40),
  endpoint: "https://in.logs.betterstack.com/v1/logs",
  sourceToken: "bounded-worker-signals-source-token",
});

function fixture() {
  const spanExporter = new InMemorySpanExporter();
  const metricExporter = new InMemoryMetricExporter(
    AggregationTemporality.CUMULATIVE,
  );
  const endpoints = [];
  const runtime = createBetterStackOtlpWorkerSignalsRuntime(configuration, {
    createTraceExporter(endpoint, token) {
      endpoints.push({ kind: "traces", endpoint, token });
      return spanExporter;
    },
    createMetricExporter(endpoint, token) {
      endpoints.push({ kind: "metrics", endpoint, token });
      return metricExporter;
    },
  });
  return { runtime, spanExporter, metricExporter, endpoints };
}

function metrics(exporter) {
  return exporter.getMetrics().flatMap((resourceMetrics) =>
    resourceMetrics.scopeMetrics.flatMap((scopeMetrics) =>
      scopeMetrics.metrics,
    ),
  );
}

const campaignEvent = Object.freeze({
  version: 1,
  service: "connect-railway-worker",
  kind: "operational-event",
  event: Object.freeze({
    version: 1,
    kind: "queue-batch",
    queue: "campaign-delivery",
    outcome: "completed",
    startedAt: "2026-08-21T08:00:00.000Z",
    completedAt: "2026-08-21T08:00:00.025Z",
    durationMilliseconds: 25,
    counts: Object.freeze({
      accepted: 1,
      rejected: 0,
      deferred: 0,
      skipped: 0,
      duplicates: 0,
      ambiguous: 0,
      discarded: 0,
      retried: 0,
    }),
  }),
});

test("exports one deterministic Worker operation span and bounded metrics", async () => {
  const testFixture = fixture();
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

  assert.equal(testFixture.runtime.record(campaignEvent), true);
  await testFixture.runtime.forceFlush();

  const [span] = testFixture.spanExporter.getFinishedSpans();
  const logContext = createRailwayWorkerEventOpenTelemetryContext(
    campaignEvent,
  );
  assert.equal(span.name, "connect.worker.queue-batch");
  assert.equal(
    trace.getSpanContext(logContext)?.traceId,
    span.spanContext().traceId,
  );
  assert.equal(
    trace.getSpanContext(logContext)?.spanId,
    span.spanContext().spanId,
  );
  assert.equal(span.parentSpanContext, undefined);
  assert.equal(span.status.code, 1);
  assert.deepEqual(span.attributes, {
    "connect.schema.version": 1,
    "connect.event.kind": "operational-event",
    "connect.operation.kind": "queue-batch",
    "connect.operation.outcome": "completed",
    "connect.queue": "campaign-delivery",
  });
  assert.deepEqual(metrics(testFixture.metricExporter)
    .map((metric) => metric.descriptor.name).sort(), [
    "connect.worker.events",
    "connect.worker.items",
    "connect.worker.operation.duration",
  ]);
  assert.doesNotMatch(
    JSON.stringify(span.attributes),
    /token|tenant|payload|recipient|authorization|url/i,
  );
  await testFixture.runtime.shutdown();
  await testFixture.runtime.shutdown();
});

test("counts bounded signals from all four queues without creating fake spans", async () => {
  const testFixture = fixture();
  for (const queue of [
    "campaign-delivery",
    "message-template-submission",
    "meta-webhook",
    "team-invitation",
  ]) {
    assert.equal(testFixture.runtime.record({
      version: 1,
      service: "connect-railway-worker",
      kind: "queue-signal",
      queue,
      code: "connection-failure",
    }), true);
  }
  assert.equal(testFixture.runtime.record({
    version: 1,
    service: "connect-railway-worker",
    kind: "queue-signal",
    queue: "team-invitation",
    code: "dead-letter-cleanup",
    count: 3,
  }), true);
  await testFixture.runtime.forceFlush();

  assert.equal(testFixture.spanExporter.getFinishedSpans().length, 0);
  assert.deepEqual(metrics(testFixture.metricExporter)
    .map((metric) => metric.descriptor.name).sort(), [
    "connect.worker.events",
    "connect.worker.items",
  ]);
  await testFixture.runtime.shutdown();
});

test("keeps Worker trace identity stable when count insertion order changes", () => {
  const reordered = {
    ...campaignEvent,
    event: {
      ...campaignEvent.event,
      counts: {
        retried: 0,
        discarded: 0,
        ambiguous: 0,
        duplicates: 0,
        skipped: 0,
        deferred: 0,
        rejected: 0,
        accepted: 1,
      },
    },
  };
  assert.deepEqual(
    trace.getSpanContext(
      createRailwayWorkerEventOpenTelemetryContext(campaignEvent),
    ),
    trace.getSpanContext(
      createRailwayWorkerEventOpenTelemetryContext(reordered),
    ),
  );
});

test("exports one delivery parent and one deterministic Meta client child", async () => {
  const testFixture = fixture();
  const event = {
    version: 1,
    service: "connect-railway-worker",
    kind: "operational-event",
    event: {
      version: 1,
      kind: "delivery-attempt",
      queue: "message-template-submission",
      outcome: "submitted",
      startedAt: "2026-08-21T10:00:00.000Z",
      completedAt: "2026-08-21T10:00:00.090Z",
      durationMilliseconds: 90,
      providerRequests: [{
        provider: "meta",
        operation: "message-template.submit",
        outcome: "completed",
        startedAt: "2026-08-21T10:00:00.020Z",
        completedAt: "2026-08-21T10:00:00.070Z",
        durationMilliseconds: 50,
      }],
    },
  };

  assert.equal(testFixture.runtime.record(event), true);
  await testFixture.runtime.forceFlush();

  const spans = testFixture.spanExporter.getFinishedSpans();
  const parent = spans.find((span) => span.name === "connect.worker.delivery-attempt");
  const child = spans.find(
    (span) => span.name ===
      "connect.provider.meta.message-template.submit",
  );
  assert.ok(parent);
  assert.ok(child);
  assert.equal(child.spanContext().traceId, parent.spanContext().traceId);
  assert.equal(child.parentSpanContext?.spanId, parent.spanContext().spanId);
  assert.equal(parent.kind, 4);
  assert.equal(child.kind, 2);
  assert.deepEqual(child.attributes, {
    "connect.schema.version": 1,
    "connect.event.kind": "provider-request",
    "connect.provider": "meta",
    "connect.provider.operation": "message-template.submit",
    "connect.operation.outcome": "completed",
  });
  assert.deepEqual(metrics(testFixture.metricExporter)
    .map((metric) => metric.descriptor.name).sort(), [
    "connect.worker.events",
    "connect.worker.operation.duration",
    "connect.worker.provider.duration",
  ]);
  assert.doesNotMatch(
    JSON.stringify(spans.map((span) => span.attributes)),
    /tenant|submissionKey|templateKey|waba|token|payload|url/i,
  );
  await testFixture.runtime.shutdown();
});

test("exports an invitation delivery parent without inventing a provider child", async () => {
  const testFixture = fixture();
  assert.equal(testFixture.runtime.record({
    version: 1,
    service: "connect-railway-worker",
    kind: "operational-event",
    event: {
      version: 1,
      kind: "delivery-attempt",
      queue: "team-invitation",
      outcome: "blocked",
      startedAt: "2026-08-21T10:00:00.000Z",
      completedAt: "2026-08-21T10:00:00.015Z",
      durationMilliseconds: 15,
    },
  }), true);
  await testFixture.runtime.forceFlush();

  const spans = testFixture.spanExporter.getFinishedSpans();
  assert.equal(spans.length, 1);
  assert.equal(spans[0].name, "connect.worker.delivery-attempt");
  assert.equal(spans[0].attributes["connect.queue"], "team-invitation");
  await testFixture.runtime.shutdown();
});

test("exports every bounded provider request as a deterministic sibling child", async () => {
  const testFixture = fixture();
  const event = {
    version: 1,
    service: "connect-railway-worker",
    kind: "operational-event",
    event: {
      version: 1,
      kind: "delivery-attempt",
      queue: "team-invitation",
      outcome: "submitted",
      startedAt: "2026-08-21T10:00:00.000Z",
      completedAt: "2026-08-21T10:00:00.050Z",
      durationMilliseconds: 50,
      providerRequests: [
        {
          provider: "clerk",
          operation: "organization-invitation.list",
          outcome: "completed",
          startedAt: "2026-08-21T10:00:00.010Z",
          completedAt: "2026-08-21T10:00:00.020Z",
          durationMilliseconds: 10,
        },
        {
          provider: "clerk",
          operation: "organization-invitation.create",
          outcome: "failed",
          startedAt: "2026-08-21T10:00:00.030Z",
          completedAt: "2026-08-21T10:00:00.040Z",
          durationMilliseconds: 10,
        },
      ],
    },
  };

  assert.equal(testFixture.runtime.record(event), true);
  await testFixture.runtime.forceFlush();
  const spans = testFixture.spanExporter.getFinishedSpans();
  const parent = spans.find(
    (span) => span.name === "connect.worker.delivery-attempt",
  );
  const children = spans.filter(
    (span) => span.name.startsWith("connect.provider.clerk."),
  );
  assert.ok(parent);
  assert.equal(children.length, 2);
  assert.equal(new Set(
    children.map((span) => span.spanContext().spanId),
  ).size, 2);
  assert.deepEqual(children.map((span) => span.name), [
    "connect.provider.clerk.organization-invitation.list",
    "connect.provider.clerk.organization-invitation.create",
  ]);
  assert.deepEqual(children.map((span) => span.status.code), [1, 2]);
  assert.equal(children.every(
    (span) => span.parentSpanContext?.spanId === parent.spanContext().spanId,
  ), true);
  assert.doesNotMatch(
    JSON.stringify(spans.map((span) => span.attributes)),
    /tenant|email|organizationId|requestKey|token|payload|url/i,
  );
  await testFixture.runtime.shutdown();
});

test("rejects extended, inconsistent, and unbounded Worker events", async () => {
  const testFixture = fixture();
  assert.equal(testFixture.runtime.record({
    ...campaignEvent,
    tenantId: "private-tenant",
  }), false);
  assert.equal(testFixture.runtime.record({
    version: 1,
    service: "connect-railway-worker",
    kind: "queue-signal",
    queue: "team-invitation",
    code: "dead-letter-cleanup",
    count: 1_000_001,
  }), false);
  assert.equal(testFixture.runtime.record({
    version: 1,
    service: "connect-railway-worker",
    kind: "worker-signal",
    code: "private-provider-error",
  }), false);
  await testFixture.runtime.forceFlush();
  assert.equal(testFixture.spanExporter.getFinishedSpans().length, 0);
  assert.deepEqual(metrics(testFixture.metricExporter), []);
  await testFixture.runtime.shutdown();
});
