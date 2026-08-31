import assert from "node:assert/strict";
import test from "node:test";

import {
  observeTeamInvitationDispatchProcessor,
} from "../server/operations/teamInvitationDeliveryTelemetry.ts";

function clock(...timestamps) {
  const values = timestamps.map((value) => new Date(value));
  return {
    now() {
      const value = values.shift();
      if (value === undefined) {
        throw new Error("telemetry clock exhausted");
      }
      return value;
    },
  };
}

test("records one bounded invitation delivery span source without identities", async () => {
  const events = [];
  const expected = { outcome: "submitted" };
  const observed = observeTeamInvitationDispatchProcessor(
    { async process() { return expected; } },
    {
      async record(event) {
        events.push(event);
        return { outcome: "recorded" };
      },
    },
    clock(
      "2026-08-21T10:00:00.000Z",
      "2026-08-21T10:00:00.025Z",
    ),
  );

  assert.equal(
    await observed.process(7, `team_invitation_delivery_v1_${"a".repeat(64)}`),
    expected,
  );
  assert.deepEqual(events, [{
    version: 1,
    kind: "delivery-attempt",
    queue: "team-invitation",
    outcome: "submitted",
    startedAt: "2026-08-21T10:00:00.000Z",
    completedAt: "2026-08-21T10:00:00.025Z",
    durationMilliseconds: 25,
  }]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /tenant|deliveryKey|email|recipient|payload/i,
  );
});

test("records a failed invitation attempt and preserves the original failure", async () => {
  const failure = new Error("private invitation failure");
  const events = [];
  const observed = observeTeamInvitationDispatchProcessor(
    { async process() { throw failure; } },
    {
      async record(event) {
        events.push(event);
        throw new Error("private telemetry failure");
      },
    },
    clock(
      "2026-08-21T10:00:00.000Z",
      "2026-08-21T10:00:00.010Z",
    ),
  );

  await assert.rejects(observed.process(7, "invalid"), (error) => error === failure);
  assert.equal(events[0].outcome, "failed");
  assert.equal(events[0].durationMilliseconds, 10);
});

test("omits telemetry when the measurement clock is invalid", async () => {
  let calls = 0;
  const observed = observeTeamInvitationDispatchProcessor(
    { async process() { return { outcome: "duplicate" }; } },
    { async record() { calls += 1; } },
    { now() { return new Date("invalid"); } },
  );

  assert.deepEqual(await observed.process(7, "opaque"), {
    outcome: "duplicate",
  });
  assert.equal(calls, 0);
});
