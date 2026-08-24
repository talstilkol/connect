import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderRequestTelemetryScope,
  observeProviderRequest,
} from "../server/operations/providerRequestTelemetry.ts";

function request(operation, startedAt, completedAt) {
  return {
    provider: operation.startsWith("organization-") ? "clerk" : "meta",
    operation,
    outcome: "completed",
    startedAt,
    completedAt,
    durationMilliseconds:
      Date.parse(completedAt) - Date.parse(startedAt),
  };
}

test("isolates concurrent provider measurements and exposes none outside a scope", async () => {
  const scope = createProviderRequestTelemetryScope();
  const [metaRequests, clerkRequests] = await Promise.all([
    scope.run(async () => {
      await Promise.resolve();
      assert.equal(scope.record(request(
        "campaign-message.send",
        "2026-08-21T10:00:00.000Z",
        "2026-08-21T10:00:00.010Z",
      )), true);
      return scope.snapshot();
    }),
    scope.run(async () => {
      assert.equal(scope.record(request(
        "organization-invitation.list",
        "2026-08-21T10:00:00.020Z",
        "2026-08-21T10:00:00.030Z",
      )), true);
      await Promise.resolve();
      return scope.snapshot();
    }),
  ]);

  assert.deepEqual(metaRequests.map((value) => value.operation), [
    "campaign-message.send",
  ]);
  assert.deepEqual(clerkRequests.map((value) => value.operation), [
    "organization-invitation.list",
  ]);
  assert.deepEqual(scope.snapshot(), []);
});

test("bounds one scope to 64 provider calls", async () => {
  const scope = createProviderRequestTelemetryScope();
  await scope.run(async () => {
    const measurement = request(
      "message-template.list",
      "2026-08-21T10:00:00.000Z",
      "2026-08-21T10:00:00.001Z",
    );
    for (let index = 0; index < 64; index += 1) {
      assert.equal(scope.record(measurement), true);
    }
    assert.equal(scope.record(measurement), false);
    assert.equal(scope.snapshot().length, 64);
  });
});

test("records a failed provider request without changing its error", async () => {
  const scope = createProviderRequestTelemetryScope();
  const failure = new Error("private provider failure");
  const timestamps = [
    new Date("2026-08-21T10:00:00.000Z"),
    new Date("2026-08-21T10:00:00.025Z"),
  ];
  let requests;

  await scope.run(async () => {
    await assert.rejects(
      observeProviderRequest(
        scope,
        {
          now() {
            const value = timestamps.shift();
            if (value === undefined) throw new Error("test clock exhausted");
            return value;
          },
        },
        {
          provider: "meta",
          operation: "message-template.list",
        },
        async () => {
          throw failure;
        },
      ),
      (error) => error === failure,
    );
    requests = scope.snapshot();
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].outcome, "failed");
  assert.equal(requests[0].durationMilliseconds, 25);
  assert.doesNotMatch(
    JSON.stringify(requests),
    /private provider failure/i,
  );
});
