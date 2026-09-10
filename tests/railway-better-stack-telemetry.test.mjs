import assert from "node:assert/strict";
import test from "node:test";
import { trace } from "@opentelemetry/api";

import {
  createRailwayBetterStackApiTelemetryRuntime,
  createRailwayBetterStackTelemetryRuntime,
  inspectRailwayBetterStackTelemetryConfiguration,
} from "../server/platform/railwayBetterStackTelemetry.ts";
import {
  deriveLocalSpanId,
} from "../server/platform/w3cTraceContext.ts";
import {
  createRailwayWorkerEventOpenTelemetryContext,
} from "../server/platform/betterStackOtlpWorkerSignals.ts";

const configuredEnvironment = Object.freeze({
  APP_RUNTIME_ENVIRONMENT: "production",
  APP_RELEASE_SHA: "a".repeat(40),
  BETTER_STACK_OTLP_LOGS_ENDPOINT:
    "https://in.logs.betterstack.com/v1/logs",
  BETTER_STACK_SOURCE_TOKEN: "bounded-source-token",
});

test("uses a separate Railway API resource and bounded signal contract", async () => {
  const configuration = inspectRailwayBetterStackTelemetryConfiguration(
    configuredEnvironment,
  );
  assert.equal(configuration.status, "configured");
  const emitted = [];
  const stdoutEvents = [];
  const signalEvents = [];
  const runtime = createRailwayBetterStackApiTelemetryRuntime(
    configuration,
    {
      stdoutLogger: {
        record(event) {
          stdoutEvents.push(event);
          return true;
        },
      },
      createOtlpRuntime(received, serviceName) {
        assert.equal(received, configuration);
        assert.equal(serviceName, "connect-railway-api");
        return {
          logger: { emit: (event) => emitted.push(event) },
          async forceFlush() {},
          async shutdown() {},
        };
      },
      createOtlpSignalsRuntime(received, serviceName) {
        assert.equal(received, configuration);
        assert.equal(serviceName, "connect-railway-api");
        return {
          record(event) {
            signalEvents.push(event);
            return true;
          },
          async forceFlush() {},
          async shutdown() {},
        };
      },
    },
  );
  const event = {
    version: 1,
    service: "connect-railway-api",
    kind: "api-signal",
    code: "meta-webhook-queue-publisher-failure",
  };

  assert.equal(runtime.logger.record(event), true);
  assert.deepEqual(stdoutEvents, [event]);
  assert.deepEqual(signalEvents, []);
  assert.deepEqual(emitted[0].attributes, {
    "connect.schema.version": 1,
    "connect.event.kind": "api-signal",
    "connect.event.code": "meta-webhook-queue-publisher-failure",
  });
  assert.equal(emitted[0].body, "api-signal");
  assert.doesNotMatch(
    JSON.stringify(emitted),
    /bounded-source-token|betterstack|tenant|payload|request|header/i,
  );
  assert.equal(await runtime.forceFlush(), true);
  assert.equal(await runtime.shutdown(), true);
});

test("exports authenticated API requests with native trace correlation and bounded attributes", () => {
  const configuration = inspectRailwayBetterStackTelemetryConfiguration(
    configuredEnvironment,
  );
  assert.equal(configuration.status, "configured");
  const emitted = [];
  const signalEvents = [];
  const runtime = createRailwayBetterStackApiTelemetryRuntime(
    configuration,
    {
      stdoutLogger: { record: () => true },
      createOtlpRuntime() {
        return {
          logger: { emit: (event) => emitted.push(event) },
          async forceFlush() {},
          async shutdown() {},
        };
      },
      createOtlpSignalsRuntime() {
        return {
          record(event) {
            signalEvents.push(event);
            return true;
          },
          async forceFlush() {},
          async shutdown() {},
        };
      },
    },
  );
  const traceContext = Object.freeze({
    traceparent:
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    parentSpanId: "00f067aa0ba902b7",
    traceFlags: 1,
  });

  assert.equal(runtime.logger.record({
    version: 1,
    service: "connect-railway-api",
    kind: "api-request",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "ok",
    code: "OK",
    durationMilliseconds: 25,
    traceContext,
  }), true);

  assert.equal(emitted[0].eventName, "connect.api-request");
  assert.equal(emitted[0].severityText, "INFO");
  assert.deepEqual(emitted[0].attributes, {
    "connect.schema.version": 1,
    "connect.event.kind": "api-request",
    "connect.event.code": "OK",
    "connect.operation.outcome": "ok",
    "connect.duration.ms": 25,
    "connect.operation.name": "contacts.list",
    "connect.request.kind": "query",
  });
  assert.deepEqual(trace.getSpanContext(emitted[0].context), {
    traceId: traceContext.traceId,
    spanId: deriveLocalSpanId(traceContext, "railway"),
    traceFlags: 1,
    isRemote: false,
  });
  assert.deepEqual(signalEvents, [{
    role: "railway-server",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "ok",
    code: "OK",
    durationMilliseconds: 25,
    traceContext,
  }]);
  assert.doesNotMatch(
    JSON.stringify(emitted[0].attributes),
    /trace|span|tenant|payload|authorization|token/i,
  );
});

test("requires complete Better Stack configuration outside local runtimes", () => {
  assert.deepEqual(
    inspectRailwayBetterStackTelemetryConfiguration({
      APP_RUNTIME_ENVIRONMENT: "production",
    }),
    {
      status: "configuration-required",
      missingKeys: [
        "APP_RELEASE_SHA",
        "BETTER_STACK_OTLP_LOGS_ENDPOINT",
        "BETTER_STACK_SOURCE_TOKEN",
      ],
    },
  );
  assert.deepEqual(
    inspectRailwayBetterStackTelemetryConfiguration({
      APP_RUNTIME_ENVIRONMENT: "test",
    }),
    { status: "stdout-only", runtimeEnvironment: "test" },
  );
});

test("rejects insecure, credential-bearing and non-Better-Stack endpoints", () => {
  for (const endpoint of [
    "http://in.logs.betterstack.com/v1/logs",
    "https://name:password@in.logs.betterstack.com/v1/logs",
    "https://in.logs.betterstack.com:8443/v1/logs",
    "https://in.logs.betterstack.com/v1/logs?token=private",
    "https://example.com/v1/logs",
    "https://betterstack.com.evil.example/v1/logs",
    "https://in.logs.betterstack.com/v1/traces",
  ]) {
    assert.equal(
      inspectRailwayBetterStackTelemetryConfiguration({
        ...configuredEnvironment,
        BETTER_STACK_OTLP_LOGS_ENDPOINT: endpoint,
      }).status,
      "invalid",
    );
  }
});

test("emits only bounded OTLP attributes and never exports configuration", async () => {
  const configuration = inspectRailwayBetterStackTelemetryConfiguration(
    configuredEnvironment,
  );
  assert.equal(configuration.status, "configured");
  const emitted = [];
  const stdoutEvents = [];
  const workerSignalEvents = [];
  let flushes = 0;
  let workerSignalFlushes = 0;
  let shutdowns = 0;
  let workerSignalShutdowns = 0;
  const runtime = createRailwayBetterStackTelemetryRuntime(configuration, {
    stdoutLogger: {
      record(event) {
        stdoutEvents.push(event);
        return true;
      },
    },
    createOtlpRuntime(received) {
      assert.equal(received, configuration);
      return {
        logger: {
          emit(event) {
            emitted.push(event);
          },
        },
        async forceFlush() {
          flushes += 1;
        },
        async shutdown() {
          shutdowns += 1;
        },
      };
    },
    createOtlpWorkerSignalsRuntime(received) {
      assert.equal(received, configuration);
      return {
        record(event) {
          workerSignalEvents.push(event);
          return true;
        },
        async forceFlush() {
          workerSignalFlushes += 1;
        },
        async shutdown() {
          workerSignalShutdowns += 1;
        },
      };
    },
  });

  const event = {
    version: 1,
    service: "connect-railway-worker",
    kind: "queue-signal",
    queue: "campaign-delivery",
    code: "dead-letter",
    reason: "retry-exhausted",
  };
  assert.equal(runtime.logger.record(event), true);
  assert.deepEqual(stdoutEvents, [event]);
  assert.deepEqual(workerSignalEvents, [event]);
  assert.equal(emitted.length, 1);
  assert.deepEqual(emitted[0].attributes, {
    "connect.schema.version": 1,
    "connect.event.kind": "queue-signal",
    "connect.event.code": "dead-letter",
    "connect.queue": "campaign-delivery",
    "connect.reason": "retry-exhausted",
  });
  assert.equal(emitted[0].body, "queue-signal");
  assert.doesNotMatch(
    JSON.stringify(emitted),
    /bounded-source-token|betterstack|release|tenant|payload/i,
  );
  assert.equal(await runtime.forceFlush(), true);
  assert.equal(await runtime.shutdown(), true);
  assert.equal(await runtime.shutdown(), true);
  assert.equal(flushes, 1);
  assert.equal(workerSignalFlushes, 1);
  assert.equal(shutdowns, 1);
  assert.equal(workerSignalShutdowns, 1);
});

test("links one Worker operational log to its deterministic local span", async () => {
  const configuration = inspectRailwayBetterStackTelemetryConfiguration(
    configuredEnvironment,
  );
  assert.equal(configuration.status, "configured");
  const emitted = [];
  const signalEvents = [];
  const runtime = createRailwayBetterStackTelemetryRuntime(configuration, {
    stdoutLogger: { record: () => true },
    createOtlpRuntime() {
      return {
        logger: { emit: (event) => emitted.push(event) },
        async forceFlush() {},
        async shutdown() {},
      };
    },
    createOtlpWorkerSignalsRuntime() {
      return {
        record(event) {
          signalEvents.push(event);
          return true;
        },
        async forceFlush() {},
        async shutdown() {},
      };
    },
  });
  const event = {
    version: 1,
    service: "connect-railway-worker",
    kind: "operational-event",
    event: {
      version: 1,
      kind: "knowledge-scan-recovery",
      outcome: "scan-clean",
      startedAt: "2026-08-21T08:00:00.000Z",
      completedAt: "2026-08-21T08:00:00.010Z",
      durationMilliseconds: 10,
    },
  };

  assert.equal(runtime.logger.record(event), true);
  assert.deepEqual(signalEvents, [event]);
  assert.equal(
    emitted[0].timestamp.toISOString(),
    event.event.completedAt,
  );
  assert.deepEqual(
    trace.getSpanContext(emitted[0].context),
    trace.getSpanContext(
      createRailwayWorkerEventOpenTelemetryContext(event),
    ),
  );
  await runtime.shutdown();
});

test("contains exporter emission, flush and shutdown failures", async () => {
  const configuration = inspectRailwayBetterStackTelemetryConfiguration(
    configuredEnvironment,
  );
  assert.equal(configuration.status, "configured");
  const runtime = createRailwayBetterStackTelemetryRuntime(configuration, {
    stdoutLogger: { record: () => true },
    createOtlpRuntime() {
      return {
        logger: {
          emit() {
            throw new Error("private exporter failure");
          },
        },
        async forceFlush() {
          throw new Error("private flush failure");
        },
        async shutdown() {
          throw new Error("private shutdown failure");
        },
      };
    },
    createOtlpWorkerSignalsRuntime() {
      return {
        record() {
          throw new Error("private Worker signal failure");
        },
        async forceFlush() {
          throw new Error("private Worker signal flush failure");
        },
        async shutdown() {
          throw new Error("private Worker signal shutdown failure");
        },
      };
    },
  });

  assert.equal(runtime.logger.record({
    version: 1,
    service: "connect-railway-worker",
    kind: "worker-signal",
    code: "shutdown-failure",
  }), false);
  assert.equal(await runtime.forceFlush(), false);
  assert.equal(await runtime.shutdown(), false);
});
