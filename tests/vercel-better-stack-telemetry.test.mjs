import assert from "node:assert/strict";
import test from "node:test";
import { trace } from "@opentelemetry/api";

import {
  createVercelBetterStackTelemetrySink,
  inspectVercelBetterStackTelemetryConfiguration,
} from "../server/platform/vercelBetterStackTelemetry.ts";

const configuredEnvironment = Object.freeze({
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_SHA: "b".repeat(40),
  BETTER_STACK_OTLP_LOGS_ENDPOINT:
    "https://in.logs.betterstack.com/v1/logs",
  BETTER_STACK_SOURCE_TOKEN: "bounded-vercel-source-token",
});
const traceContext = Object.freeze({
  traceparent:
    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
  parentSpanId: "00f067aa0ba902b7",
  traceFlags: 1,
});

test("requires complete Better Stack configuration on Vercel deployments", () => {
  assert.deepEqual(
    inspectVercelBetterStackTelemetryConfiguration({}),
    { status: "disabled", runtimeEnvironment: "local" },
  );
  assert.deepEqual(
    inspectVercelBetterStackTelemetryConfiguration({
      VERCEL: "1",
      VERCEL_ENV: "development",
    }),
    { status: "disabled", runtimeEnvironment: "development" },
  );
  assert.deepEqual(
    inspectVercelBetterStackTelemetryConfiguration({
      VERCEL_ENV: "production",
    }),
    {
      status: "configuration-required",
      missingKeys: [
        "VERCEL",
        "VERCEL_GIT_COMMIT_SHA",
        "BETTER_STACK_OTLP_LOGS_ENDPOINT",
        "BETTER_STACK_SOURCE_TOKEN",
      ],
    },
  );
  assert.equal(
    inspectVercelBetterStackTelemetryConfiguration({
      ...configuredEnvironment,
      VERCEL: "0",
    }).status,
    "invalid",
  );
  assert.equal(
    inspectVercelBetterStackTelemetryConfiguration({
      ...configuredEnvironment,
      BETTER_STACK_OTLP_LOGS_ENDPOINT:
        "https://betterstack.com.evil.example/v1/logs",
    }).status,
    "invalid",
  );
});

test("emits a bounded Vercel API event and flushes through after-response", async () => {
  const configuration = inspectVercelBetterStackTelemetryConfiguration(
    configuredEnvironment,
  );
  assert.equal(configuration.status, "configured");
  const emitted = [];
  const stdoutEvents = [];
  const callbacks = [];
  const signalEvents = [];
  let flushes = 0;
  let signalFlushes = 0;
  const sink = createVercelBetterStackTelemetrySink(configuration, {
    stdoutLogger: {
      record(event) {
        stdoutEvents.push(event);
        return true;
      },
    },
    createOtlpRuntime(received, serviceName) {
      assert.equal(received, configuration);
      assert.equal(serviceName, "connect-vercel-web");
      return {
        logger: { emit: (event) => emitted.push(event) },
        async forceFlush() {
          flushes += 1;
        },
        async shutdown() {},
      };
    },
    createOtlpSignalsRuntime(received, serviceName) {
      assert.equal(received, configuration);
      assert.equal(serviceName, "connect-vercel-web");
      return {
        record(event) {
          signalEvents.push(event);
          return true;
        },
        async forceFlush() {
          signalFlushes += 1;
        },
        async shutdown() {},
      };
    },
    scheduleAfterResponse(callback) {
      callbacks.push(callback);
    },
  });
  const event = Object.freeze({
    version: 1,
    service: "connect-vercel-web",
    kind: "railway-api-call",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "remote-error",
    code: "RATE_LIMITED",
    traceContext,
    durationMilliseconds: 25,
  });

  assert.equal(sink.record(event), true);
  assert.equal(sink.scheduleFlush(), true);
  assert.deepEqual(stdoutEvents, [event]);
  assert.deepEqual(signalEvents, [{
    role: "vercel-client",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "remote-error",
    code: "RATE_LIMITED",
    durationMilliseconds: 25,
    traceContext,
  }]);
  assert.equal(callbacks.length, 1);
  assert.deepEqual(emitted[0].attributes, {
    "connect.schema.version": 1,
    "connect.event.kind": "railway-api-call",
    "connect.operation.outcome": "remote-error",
    "connect.event.code": "RATE_LIMITED",
    "connect.duration.ms": 25,
    "connect.operation.name": "contacts.list",
    "connect.request.kind": "query",
  });
  assert.equal(emitted[0].body, "railway-api-call");
  assert.deepEqual(trace.getSpanContext(emitted[0].context), {
    traceId: traceContext.traceId,
    spanId: traceContext.parentSpanId,
    traceFlags: 1,
    isRemote: true,
  });
  assert.doesNotMatch(
    JSON.stringify(emitted),
    /bounded-vercel-source-token|betterstack|tenant|payload|header|authorization/i,
  );
  await callbacks[0]();
  assert.equal(flushes, 1);
  assert.equal(signalFlushes, 1);
});

test("rejects malformed events and contains exporter lifecycle failures", async () => {
  const configuration = inspectVercelBetterStackTelemetryConfiguration(
    configuredEnvironment,
  );
  assert.equal(configuration.status, "configured");
  const callbacks = [];
  const sink = createVercelBetterStackTelemetrySink(configuration, {
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
        async shutdown() {},
      };
    },
    createOtlpSignalsRuntime() {
      return {
        record: () => true,
        async forceFlush() {
          throw new Error("private signals flush failure");
        },
        async shutdown() {},
      };
    },
    scheduleAfterResponse(callback) {
      callbacks.push(callback);
    },
  });

  assert.equal(sink.record({
    version: 1,
    service: "connect-vercel-web",
    kind: "railway-api-call",
    operation: "contacts.list/private",
    requestKind: "query",
    outcome: "ok",
    code: "OK",
    traceContext: null,
    durationMilliseconds: 1,
  }), false);
  assert.equal(sink.record({
    version: 1,
    service: "connect-vercel-web",
    kind: "railway-api-call",
    operation: "contacts.list",
    requestKind: "query",
    outcome: "client-error",
    code: "NETWORK_ERROR",
    traceContext: null,
    durationMilliseconds: 1,
  }), false);
  assert.equal(sink.scheduleFlush(), true);
  await assert.doesNotReject(callbacks[0]());
});
