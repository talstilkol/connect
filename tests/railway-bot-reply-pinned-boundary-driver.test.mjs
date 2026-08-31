import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

import {
  createRailwayBotReplyPinnedBoundaryDriver,
  railwayBotReplyPinnedBoundaryStatus,
  RailwayBotReplyPinnedBoundaryError,
} from "../server/platform/railwayBotReplyPinnedBoundaryDriver.ts";

const permitKey =
  `bot_reply_staging_pre_send_permit_v1_${"a".repeat(64)}`;
const observationKey =
  `bot_reply_staging_observation_v1_${"b".repeat(64)}`;
const backendPid = 4_172;
const now = "2026-08-26T12:00:00.000Z";
const sendBefore = "2026-08-26T12:00:10.000Z";
const finalizedAt = "2026-08-26T12:00:02.000Z";

function ack(overrides = {}) {
  return {
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    ...overrides,
  };
}

function finalization(overrides = {}) {
  return {
    ...ack(),
    outcome: "finalized",
    state: "completed",
    providerOutcomeKind: "accepted",
    observationKey,
    finalizedAt,
    ...overrides,
  };
}

function manualFinalization(overrides = {}) {
  return {
    ...ack(),
    outcome: "manual-reconciliation-required",
    state: "ambiguous",
    providerOutcomeKind: null,
    observationKey: null,
    finalizedAt: null,
    ...overrides,
  };
}

function fixture(options = {}) {
  const calls = [];
  const deadlineEvents = [];
  const shouldHang = (phase) =>
    options.hangPhase === phase || options.hangPhases?.includes(phase);
  const shouldTimeout = (phase) =>
    options.timeoutPhase === phase || options.timeoutPhases?.includes(phase);
  const providerFact = options.providerFact ?? Object.freeze({
    outcome: "accepted",
    providerMessageId: "wamid.durable-provider-fact",
  });
  const session = {
    async prepare(signal) {
      calls.push({ kind: "prepare", signal });
      if (shouldHang("session-prepare")) {
        return await new Promise(() => undefined);
      }
      if (options.prepareError) throw options.prepareError;
      if (options.mutateSessionAfterCapture) {
        session.consume = async () => {
          throw new Error("mutated consume must not run");
        };
      }
      return options.prepareResult ?? {
        backendPid,
        readyForQuery: "idle",
        sessionReset: "acknowledged",
      };
    },
    async acquire(currentPermitKey, signal) {
      calls.push({ kind: "acquire", permitKey: currentPermitKey, signal });
      if (shouldHang("session-acquire")) {
        return await new Promise(() => undefined);
      }
      if (options.acquireError) throw options.acquireError;
      return options.acquireResult ?? {
        ...ack(),
        outcome: "acquired",
      };
    },
    async consume(currentPermitKey, signal) {
      calls.push({ kind: "consume", permitKey: currentPermitKey, signal });
      if (shouldHang("session-consume")) {
        return await new Promise(() => undefined);
      }
      if (options.consumeError) throw options.consumeError;
      return options.consumeResult ?? {
        ...ack(),
        outcome: "authorized",
        reasonCode: "CAPABILITY_RELEASED",
      };
    },
    async prove(currentPermitKey, signal) {
      calls.push({ kind: "prove", permitKey: currentPermitKey, signal });
      if (shouldHang("session-prove")) {
        return await new Promise(() => undefined);
      }
      if (options.proveError) throw options.proveError;
      return options.proofResult ?? {
        ...ack(),
        outcome: "held",
        sendBefore,
      };
    },
    async persistProviderFact(currentPermitKey, fact, signal) {
      calls.push({
        kind: "persist-provider-fact",
        permitKey: currentPermitKey,
        fact,
        signal,
      });
      if (shouldHang("provider-fact")) {
        return await new Promise(() => undefined);
      }
      if (options.factError) throw options.factError;
      return options.factResult ?? {
        ...ack(),
        outcome: "recorded",
      };
    },
    async persistProviderUncertainty(currentPermitKey, reason, signal) {
      calls.push({
        kind: "persist-provider-uncertainty",
        permitKey: currentPermitKey,
        reason,
        signal,
      });
      if (shouldHang("provider-uncertainty")) {
        return await new Promise(() => undefined);
      }
      if (options.uncertaintyError) throw options.uncertaintyError;
      return options.uncertaintyResult ?? {
        ...ack(),
        outcome: "recorded",
      };
    },
    async finalize(currentPermitKey, signal) {
      calls.push({ kind: "finalize", permitKey: currentPermitKey, signal });
      if (shouldHang("session-finalize")) {
        return await new Promise(() => undefined);
      }
      if (options.finalizeError) throw options.finalizeError;
      return options.finalizationResult ?? finalization();
    },
    async release(currentPermitKey, signal) {
      calls.push({ kind: "release", permitKey: currentPermitKey, signal });
      if (shouldHang("session-release")) {
        return await new Promise(() => undefined);
      }
      if (options.releaseError) throw options.releaseError;
      return options.releaseResult ?? {
        ...ack(),
        outcome: "released",
        releasedCount: options.reconciliation === true ? 2 : 1,
      };
    },
    async close(signal) {
      calls.push({ kind: "close", signal });
      if (shouldHang("session-close")) {
        return await new Promise(() => undefined);
      }
      if (options.closeError) throw options.closeError;
    },
    async destroy(signal) {
      calls.push({ kind: "destroy", signal });
      if (shouldHang("session-destroy")) {
        return await new Promise(() => undefined);
      }
      if (options.destroyError) throw options.destroyError;
    },
  };
  let wallClockIndex = 0;
  const wallClockValues = options.nowValues ?? [options.now ?? now];
  const clockPort = {
    now() {
      const value = wallClockValues[
        Math.min(wallClockIndex, wallClockValues.length - 1)
      ];
      wallClockIndex += 1;
      return new Date(value);
      },
    };
  const sessionsPort = {
    async openPinned(signal) {
      calls.push({ kind: "open-pinned", signal });
      if (options.openPromise) return await options.openPromise;
      if (shouldHang("session-open")) {
        return await new Promise(() => undefined);
      }
      if (options.openError) throw options.openError;
      return options.rawSession ?? session;
    },
  };
  const providerPort = {
    async sendOnce(input, signal) {
      calls.push({ kind: "provider", input, signal });
      if (options.providerPromise) return await options.providerPromise;
      if (shouldHang("provider-send")) {
        return await new Promise(() => undefined);
      }
      if (options.providerError) throw options.providerError;
      return providerFact;
    },
  };
  let monotonicIndex = 0;
  const monotonicValues = options.monotonicValues ?? [1_000];
  const schedulerPort = {
    monotonicNowMilliseconds() {
      const value = monotonicValues[
        Math.min(monotonicIndex, monotonicValues.length - 1)
      ];
      monotonicIndex += 1;
      return value;
    },
    schedule(input, onExpired) {
      const event = {
        canceled: false,
        expired: false,
        fire() {
          event.expired = true;
          onExpired();
        },
        input,
      };
      deadlineEvents.push(event);
      if (options.synchronousTimeoutPhase === input.phase) {
        event.fire();
      } else if (options.doubleMicrotaskTimeoutPhase === input.phase) {
        queueMicrotask(() => {
          queueMicrotask(() => {
            if (event.canceled) return;
            event.fire();
          });
        });
      } else if (shouldTimeout(input.phase)) {
        queueMicrotask(() => {
          if (event.canceled) return;
          event.fire();
        });
      }
      return {
        cancel() {
          event.canceled = true;
          if (options.cancelThrowsPhase === input.phase) {
            throw new Error("deadline cancellation failed");
          }
          if (options.cancelReturnsPhase === input.phase) {
            return "invalid-async-cancel";
          }
        },
      };
    },
  };
  const deadlinesPort = {
    cleanupMilliseconds: 500,
    databaseMilliseconds: 1_000,
    providerMilliseconds: 1_000,
    scheduler: schedulerPort,
  };
  const driver = createRailwayBotReplyPinnedBoundaryDriver({
    clock: clockPort,
    deadlines: deadlinesPort,
    sessions: sessionsPort,
    provider: providerPort,
  });
  return {
    calls,
    clockPort,
    deadlineEvents,
    deadlinesPort,
    driver,
    providerFact,
    providerPort,
    session,
    schedulerPort,
    sessionsPort,
  };
}

function callKinds(calls) {
  return calls.map(({ kind }) => kind);
}

async function listTypeScriptFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) {
      files.push(...await listTypeScriptFiles(entryUrl));
    } else if (entry.isFile() && /\.tsx?$/u.test(entry.name)) {
      files.push(entryUrl);
    }
  }
  return files;
}

test("uses one pinned physical session and performs one provider call", async () => {
  const { calls, driver, providerFact } = fixture();

  const result = await driver.run({ permitKey });
  assert.deepEqual(result, {
    outcome: "completed",
    providerCallCount: 1,
    providerOutcomeKind: "accepted",
    observationKey,
    finalizedAt,
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "prove",
    "provider",
    "persist-provider-fact",
    "finalize",
    "release",
    "close",
  ]);
  assert.deepEqual(calls[5].input, {
    automaticRetryPolicy: "forbidden",
    sendBefore,
  });
  assert.equal(Object.isFrozen(calls[5].input), true);
  assert.equal("permitKey" in calls[5].input, false);
  assert.notEqual(calls[6].fact, providerFact);
  assert.deepEqual(calls[6].fact, providerFact);
  assert.equal(Object.isFrozen(calls[6].fact), true);
  assert.equal(
    calls.filter(({ kind }) => kind === "provider").length,
    1,
  );
  for (const call of calls) {
    assert.equal(call.signal instanceof AbortSignal, true, call.kind);
    assert.equal(call.signal.aborted, false, call.kind);
  }
  assert.equal(Object.isFrozen(result), true);
});

test("reconciles an old operation without consuming, proving, or sending", async () => {
  const { calls, driver } = fixture({
    reconciliation: true,
    acquireResult: {
      ...ack(),
      outcome: "reconciliation-required",
    },
    finalizationResult: finalization({ outcome: "replayed" }),
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "completed",
    providerCallCount: 0,
    providerOutcomeKind: "accepted",
    observationKey,
    finalizedAt,
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "finalize",
    "release",
    "close",
  ]);
});

test("returns no-send for busy and unresolved barriers", async () => {
  for (const outcome of ["busy", "blocked-unresolved"]) {
    const { calls, driver } = fixture({
      acquireResult: { ...ack(), outcome },
    });
    assert.deepEqual(await driver.run({ permitKey }), {
      outcome: "not-sent",
      providerCallCount: 0,
      reason: outcome,
    });
    assert.deepEqual(callKinds(calls), [
      "open-pinned",
      "prepare",
      "acquire",
      "close",
    ]);
  }
});

test("lost consume COMMIT acknowledgement destroys the client and never sends", async () => {
  const { calls, driver } = fixture({
    consumeError: new Error("commit acknowledgement lost"),
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 0,
    reason: "consume-ack-unknown",
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "destroy",
  ]);
});

test("lost one-shot proof acknowledgement destroys the client and never sends", async () => {
  const { calls, driver } = fixture({
    proveError: new Error("ready-for-query acknowledgement lost"),
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 0,
    reason: "proof-ack-unknown",
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "prove",
    "destroy",
  ]);
});

test("a pre-provider database timeout aborts, destroys, and never sends", async () => {
  const { calls, deadlineEvents, driver } = fixture({
    hangPhase: "session-consume",
    timeoutPhase: "session-consume",
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 0,
    reason: "pre-provider-timeout",
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "destroy",
  ]);
  assert.equal(calls[3].signal.aborted, true);
  assert.equal(callKinds(calls).includes("provider"), false);
  const expired = deadlineEvents.filter(({ expired }) => expired);
  assert.equal(expired.length, 1);
  assert.equal(expired[0].input.phase, "session-consume");
  assert.equal(expired[0].canceled, true);
});

test("a late open session is destroyed after the run already timed out", async () => {
  let resolveOpen;
  const openPromise = new Promise((resolve) => {
    resolveOpen = resolve;
  });
  const { calls, driver, session } = fixture({
    openPromise,
    timeoutPhase: "session-open",
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 0,
    reason: "pre-provider-timeout",
  });
  assert.deepEqual(callKinds(calls), ["open-pinned"]);

  resolveOpen(session);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(callKinds(calls), ["open-pinned", "destroy"]);
  assert.equal(calls[1].signal instanceof AbortSignal, true);
});

test("a late open rejection is consumed after timeout", async () => {
  let rejectOpen;
  const openPromise = new Promise((resolve, reject) => {
    void resolve;
    rejectOpen = reject;
  });
  const { calls, driver } = fixture({
    openPromise,
    timeoutPhase: "session-open",
  });

  assert.equal((await driver.run({ permitKey })).providerCallCount, 0);
  rejectOpen(new Error("late checkout rejection"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(callKinds(calls), ["open-pinned"]);
});

test("a fulfilled open session is destroyed when deadline cancellation is invalid", async () => {
  for (const cancellationFailure of ["throws", "returns-value"]) {
    const option = cancellationFailure === "throws"
      ? { cancelThrowsPhase: "session-open" }
      : { cancelReturnsPhase: "session-open" };
    const { calls, driver } = fixture(option);

    await assert.rejects(
      () => driver.run({ permitKey }),
      (error) =>
        error instanceof RailwayBotReplyPinnedBoundaryError &&
        error.code === "invalid-dependencies",
    );
    assert.deepEqual(callKinds(calls), ["open-pinned", "destroy"]);
  }
});

test("a provider timeout writes durable uncertainty once and ignores a late result", async () => {
  let resolveProvider;
  const providerPromise = new Promise((resolve) => {
    resolveProvider = resolve;
  });
  const { calls, deadlineEvents, driver, providerFact } = fixture({
    providerPromise,
    timeoutPhase: "provider-send",
    finalizationResult: manualFinalization(),
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 1,
    reason: "post-provider-timeout",
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "prove",
    "provider",
    "persist-provider-uncertainty",
    "finalize",
    "release",
    "close",
  ]);
  assert.equal(calls[5].signal.aborted, true);
  assert.equal(calls[6].reason, "provider-call-timed-out");
  assert.equal(
    calls.filter(({ kind }) => kind === "persist-provider-uncertainty").length,
    1,
  );
  assert.equal(
    calls.filter(({ kind }) => kind === "provider").length,
    1,
  );

  resolveProvider(providerFact);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    calls.filter(({ kind }) => kind === "provider").length,
    1,
  );
  assert.equal(
    calls.filter(({ kind }) => kind === "persist-provider-fact").length,
    0,
  );
  assert.equal(
    deadlineEvents.filter(({ expired }) => expired).length,
    1,
  );
});

test("an already-expired provider deadline prevents provider invocation", async () => {
  const { calls, driver } = fixture({
    synchronousTimeoutPhase: "provider-send",
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 0,
    reason: "pre-provider-timeout",
  });
  assert.equal(callKinds(calls).includes("provider"), false);
  assert.equal(callKinds(calls).at(-1), "destroy");
});

test("a deadline microtask between fulfillment and race continuation cannot abort success", async () => {
  const { calls, deadlineEvents, driver } = fixture({
    doubleMicrotaskTimeoutPhase: "provider-send",
  });

  assert.equal((await driver.run({ permitKey })).outcome, "completed");
  const providerCall = calls.find(({ kind }) => kind === "provider");
  assert.equal(providerCall.signal.aborted, false);
  assert.equal(
    deadlineEvents.find(({ input }) => input.phase === "provider-send")
      .expired,
    true,
  );
});

test("wall or monotonic horizon expiry inside the provider callback prevents send", async () => {
  const cases = [
    {
      name: "wall clock crossed sendBefore",
      nowValues: [now, now, sendBefore],
      monotonicValues: [1_000, 1_000, 1_000],
    },
    {
      name: "monotonic scheduler delay consumed the horizon",
      nowValues: [now, now, now],
      monotonicValues: [1_000, 1_000, 11_000],
    },
  ];

  for (const currentCase of cases) {
    const { calls, driver } = fixture(currentCase);
    assert.deepEqual(
      await driver.run({ permitKey }),
      {
        outcome: "manual-reconciliation-required",
        providerCallCount: 0,
        reason: "pre-provider-timeout",
      },
      currentCase.name,
    );
    assert.equal(callKinds(calls).includes("provider"), false);
    assert.equal(callKinds(calls).at(-1), "destroy");
  }
});

test("a post-provider database timeout never repeats the provider call", async () => {
  const { calls, driver } = fixture({
    hangPhase: "provider-fact",
    timeoutPhase: "provider-fact",
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 1,
    reason: "post-provider-timeout",
  });
  assert.deepEqual(callKinds(calls).slice(-2), [
    "persist-provider-fact",
    "destroy",
  ]);
  assert.equal(
    calls.filter(({ kind }) => kind === "provider").length,
    1,
  );
  assert.equal(calls.at(-2).signal.aborted, true);
});

test("a post-provider cleanup timeout is bounded and destroys the session", async () => {
  const { calls, driver } = fixture({
    hangPhase: "session-close",
    timeoutPhase: "session-close",
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 1,
    reason: "post-provider-timeout",
  });
  assert.deepEqual(callKinds(calls).slice(-3), [
    "release",
    "close",
    "destroy",
  ]);
  assert.equal(calls.at(-2).signal.aborted, true);
});

test("cleanup remains bounded when both close and destroy ignore abort", async () => {
  const { calls, driver } = fixture({
    hangPhases: ["session-close", "session-destroy"],
    timeoutPhases: ["session-close", "session-destroy"],
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 1,
    reason: "post-provider-timeout",
  });
  assert.deepEqual(callKinds(calls).slice(-3), [
    "release",
    "close",
    "destroy",
  ]);
  assert.equal(calls.at(-2).signal.aborted, true);
  assert.equal(calls.at(-1).signal.aborted, true);
});

test("provider timeout remains the primary manual outcome through later failures", async () => {
  const cases = [
    { uncertaintyError: new Error("uncertainty write failed") },
    { finalizeError: new Error("finalization failed") },
    { releaseError: new Error("release failed") },
  ];

  for (const failure of cases) {
    const { calls, driver } = fixture({
      ...failure,
      hangPhase: "provider-send",
      timeoutPhase: "provider-send",
    });
    assert.deepEqual(await driver.run({ permitKey }), {
      outcome: "manual-reconciliation-required",
      providerCallCount: 1,
      reason: "post-provider-timeout",
    });
    assert.equal(
      calls.filter(({ kind }) => kind === "provider").length,
      1,
    );
    assert.equal(
      calls.filter(({ kind }) => kind === "persist-provider-fact").length,
      0,
    );
  }
});

test("never retries an ambiguous provider call and persists uncertainty once", async () => {
  const { calls, driver } = fixture({
    providerError: new Error("response boundary unknown"),
    finalizationResult: manualFinalization(),
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 1,
    reason: "provider-outcome-unknown",
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "prove",
    "provider",
    "persist-provider-uncertainty",
    "finalize",
    "release",
    "close",
  ]);
  assert.equal(
    calls.filter(({ kind }) => kind === "provider").length,
    1,
  );
  assert.equal(calls[6].reason, "provider-call-threw");
});

test("lost durable fact acknowledgement never repeats the provider or fact write", async () => {
  const { calls, driver } = fixture({
    factError: new Error("fact commit acknowledgement lost"),
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 1,
    reason: "provider-fact-ack-unknown",
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "prove",
    "provider",
    "persist-provider-fact",
    "destroy",
  ]);
});

test("rejects a changed backend PID before the provider boundary", async () => {
  const { calls, driver } = fixture({
    consumeResult: {
      ...ack({ backendPid: backendPid + 1 }),
      outcome: "authorized",
      reasonCode: "CAPABILITY_RELEASED",
    },
  });

  await assert.rejects(
    () => driver.run({ permitKey }),
    (error) =>
      error instanceof RailwayBotReplyPinnedBoundaryError &&
      error.code === "physical-client-changed",
  );
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "destroy",
  ]);
});

test("does not send after the proved provider boundary expires", async () => {
  const { calls, driver } = fixture({ now: sendBefore });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 0,
    reason: "provider-boundary-expired",
  });
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "prove",
    "release",
    "close",
  ]);
});

test("rejects a proved send boundary more than fifteen seconds ahead", async () => {
  const { calls, driver } = fixture({
    proofResult: {
      ...ack(),
      outcome: "held",
      sendBefore: "2026-08-26T12:00:15.001Z",
    },
  });

  await assert.rejects(
    () => driver.run({ permitKey }),
    (error) =>
      error instanceof RailwayBotReplyPinnedBoundaryError &&
      error.code === "invalid-database-result",
  );
  assert.deepEqual(callKinds(calls), [
    "open-pinned",
    "prepare",
    "acquire",
    "consume",
    "prove",
    "destroy",
  ]);
});

test("destroys a session when exact lock release is not acknowledged", async () => {
  const { calls, driver } = fixture({
    releaseResult: {
      ...ack(),
      outcome: "lock-leaked",
      releasedCount: 1,
    },
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 1,
    reason: "release-ack-unknown",
  });
  assert.deepEqual(callKinds(calls).slice(-2), ["release", "destroy"]);
  assert.equal(callKinds(calls).includes("close"), false);
});

test("rejects malformed input and dependency extensions before I/O", async () => {
  const { calls, driver } = fixture();
  await assert.rejects(
    () => driver.run({ permitKey, credential: "forbidden" }),
    (error) =>
      error instanceof RailwayBotReplyPinnedBoundaryError &&
      error.code === "invalid-input",
  );
  assert.deepEqual(calls, []);

  assert.throws(
    () => createRailwayBotReplyPinnedBoundaryDriver({
      clock: { now: () => new Date(now) },
      deadlines: {
        cleanupMilliseconds: 500,
        databaseMilliseconds: 1_000,
        providerMilliseconds: 1_000,
        scheduler: {
          monotonicNowMilliseconds: () => 1_000,
          schedule: () => ({ cancel() {} }),
        },
      },
      sessions: { openPinned: async () => ({}) },
      provider: { sendOnce: async () => ({}) },
      retry: true,
    }),
    /invalid-dependencies/,
  );
});

test("a driver and its provider binding are each claimable exactly once", async () => {
  const fixtureState = fixture();
  const {
    calls,
    clockPort,
    deadlinesPort,
    driver,
    providerPort,
    sessionsPort,
  } = fixtureState;

  assert.equal((await driver.run({ permitKey })).outcome, "completed");
  await assert.rejects(
    () => driver.run({ permitKey }),
    (error) =>
      error instanceof RailwayBotReplyPinnedBoundaryError &&
      error.code === "driver-already-used",
  );
  assert.equal(
    calls.filter(({ kind }) => kind === "open-pinned").length,
    1,
  );

  assert.throws(
    () => createRailwayBotReplyPinnedBoundaryDriver({
      clock: clockPort,
      deadlines: deadlinesPort,
      provider: providerPort,
      sessions: sessionsPort,
    }),
    (error) =>
      error instanceof RailwayBotReplyPinnedBoundaryError &&
      error.code === "provider-binding-reused",
  );
});

test("a concurrent second run fails before any second I/O", async () => {
  const { calls, driver } = fixture({
    hangPhase: "session-open",
    timeoutPhase: "session-open",
  });

  const firstRun = driver.run({ permitKey });
  await assert.rejects(
    () => driver.run({ permitKey }),
    (error) =>
      error instanceof RailwayBotReplyPinnedBoundaryError &&
      error.code === "driver-already-used",
  );
  assert.deepEqual(await firstRun, {
    outcome: "manual-reconciliation-required",
    providerCallCount: 0,
    reason: "pre-provider-timeout",
  });
  assert.deepEqual(callKinds(calls), ["open-pinned"]);
});

test("every settled deadline is canceled and exposes only an immutable phase", async () => {
  const { calls, deadlineEvents, driver } = fixture();

  assert.equal((await driver.run({ permitKey })).outcome, "completed");
  assert.equal(deadlineEvents.length > 0, true);
  for (const event of deadlineEvents) {
    assert.equal(event.canceled, true);
    assert.equal(event.expired, false);
    assert.equal(Object.isFrozen(event.input), true);
    assert.deepEqual(Object.keys(event.input).sort(), [
      "milliseconds",
      "phase",
    ]);
    assert.equal("permitKey" in event.input, false);
  }
  for (const event of deadlineEvents) event.fire();
  for (const call of calls) assert.equal(call.signal.aborted, false);
});

test("a backwards monotonic clock fails closed before provider I/O", async () => {
  const { calls, driver } = fixture({
    monotonicValues: [1_001, 1_000],
  });

  await assert.rejects(
    () => driver.run({ permitKey }),
    (error) =>
      error instanceof RailwayBotReplyPinnedBoundaryError &&
      error.code === "invalid-dependencies",
  );
  assert.equal(callKinds(calls).includes("provider"), false);
  assert.equal(callKinds(calls).at(-1), "destroy");
});

test("best-effort destroys a malformed raw session after checkout", async () => {
  const options = {};
  const { calls, driver, session } = fixture(options);
  options.rawSession = {
    ...session,
    unexpected: true,
    async destroy() {
      calls.push({ kind: "destroy-malformed" });
    },
  };

  await assert.rejects(
    () => driver.run({ permitKey }),
    (error) =>
      error instanceof RailwayBotReplyPinnedBoundaryError &&
      error.code === "invalid-session",
  );
  assert.deepEqual(callKinds(calls), ["open-pinned", "destroy-malformed"]);
});

test("accepts only the four exact bounded provider facts", async () => {
  const cases = [
    {
      fact: {
        outcome: "accepted",
        providerMessageId: "wamid.accepted-fact",
      },
      providerOutcomeKind: "accepted",
    },
    {
      fact: {
        outcome: "sender-deferred",
        providerErrorCode: 130429,
        retryAfterSeconds: 86_400,
      },
      providerOutcomeKind: "sender-deferred",
    },
    {
      fact: {
        outcome: "pair-deferred",
        providerErrorCode: 131056,
        retryAfterSeconds: 1,
      },
      providerOutcomeKind: "pair-deferred",
    },
    {
      fact: {
        outcome: "service-window-rejected",
        providerErrorCode: 131047,
      },
      providerOutcomeKind: "service-window-rejected",
    },
  ];

  for (const { fact, providerOutcomeKind } of cases) {
    const { calls, driver } = fixture({
      providerFact: fact,
      finalizationResult: finalization({ providerOutcomeKind }),
    });
    const result = await driver.run({ permitKey });
    assert.equal(result.outcome, "completed");
    assert.equal(result.providerOutcomeKind, providerOutcomeKind);
    const persisted = calls.find(
      ({ kind }) => kind === "persist-provider-fact",
    ).fact;
    assert.deepEqual(persisted, fact);
    assert.notEqual(persisted, fact);
    assert.equal(Object.isFrozen(persisted), true);
  }
});

test("converts extended or unbounded provider facts to durable uncertainty", async () => {
  const invalidFacts = [
    {
      outcome: "accepted",
      providerMessageId: "wamid.accepted-fact",
      accessToken: "forbidden",
    },
    {
      outcome: "accepted",
      providerMessageId: "wamid.accepted-fact",
      observedAt: now,
    },
    {
      outcome: "accepted",
      providerMessageId: "wamid.accepted-fact",
      recipientPhoneNumber: "forbidden",
    },
    {
      outcome: "accepted",
      providerMessageId: "wamid.accepted-fact",
      providerRequestKey: "forbidden",
    },
    {
      outcome: "accepted",
      providerMessageId: "wamid.accepted-fact",
      rawError: "forbidden",
    },
    { outcome: "accepted", providerMessageId: "not-wamid" },
    {
      outcome: "sender-deferred",
      providerErrorCode: 131056,
      retryAfterSeconds: 5,
    },
    {
      outcome: "pair-deferred",
      providerErrorCode: 131056,
      retryAfterSeconds: 86_401,
    },
    {
      outcome: "service-window-rejected",
      providerErrorCode: 131056,
    },
  ];

  for (const providerFact of invalidFacts) {
    const { calls, driver } = fixture({
      providerFact,
      finalizationResult: manualFinalization(),
    });
    assert.deepEqual(await driver.run({ permitKey }), {
      outcome: "manual-reconciliation-required",
      providerCallCount: 1,
      reason: "provider-outcome-unknown",
    });
    assert.equal(
      callKinds(calls).includes("persist-provider-fact"),
      false,
    );
    assert.equal(
      callKinds(calls).filter(
        (kind) => kind === "persist-provider-uncertainty",
      ).length,
      1,
    );
  }
});

test("treats replayed fact acknowledgement as manual and destroys without retry", async () => {
  const { calls, driver } = fixture({
    factResult: { ...ack(), outcome: "replayed" },
  });

  assert.deepEqual(await driver.run({ permitKey }), {
    outcome: "manual-reconciliation-required",
    providerCallCount: 1,
    reason: "provider-fact-ack-unknown",
  });
  assert.equal(
    callKinds(calls).filter((kind) => kind === "provider").length,
    1,
  );
  assert.deepEqual(callKinds(calls).slice(-2), [
    "persist-provider-fact",
    "destroy",
  ]);
});

test("captures dependency and session methods before later mutation", async () => {
  const options = { mutateSessionAfterCapture: true };
  const {
    clockPort,
    deadlinesPort,
    driver,
    providerPort,
    schedulerPort,
    sessionsPort,
  } = fixture(options);
  clockPort.now = () => {
    throw new Error("mutated wall clock must not run");
  };
  deadlinesPort.providerMilliseconds = 1;
  schedulerPort.monotonicNowMilliseconds = () => {
    throw new Error("mutated monotonic clock must not run");
  };
  providerPort.sendOnce = async () => {
    throw new Error("mutated provider method must not run");
  };
  sessionsPort.openPinned = async () => {
    throw new Error("mutated session factory must not run");
  };

  const result = await driver.run({ permitKey });
  assert.equal(result.outcome, "completed");
  assert.equal(result.providerCallCount, 1);
});

test("exports an immutable explicit no-activation status", () => {
  assert.deepEqual(railwayBotReplyPinnedBoundaryStatus, {
    activationAllowed: false,
    concreteAdapterStatus: "missing",
    providerBindingStatus: "wrapper-identity-one-shot-contract",
    timeoutContractStatus: "contract-only",
  });
  assert.equal(Object.isFrozen(railwayBotReplyPinnedBoundaryStatus), true);
});

test("is a dormant contract, not an activation path, with no SQL, Meta adapter, retry, or randomness", async () => {
  const source = await readFile(
    new URL(
      "../server/platform/railwayBotReplyPinnedBoundaryDriver.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(source, /metaBotReplyAdapter|metaBotReplyRuntime/);
  assert.doesNotMatch(source, /(?:acquire|consume|prove|finalize|release)_bot_reply/);
  assert.doesNotMatch(source, /Math\.random|crypto\.randomUUID/);
  assert.doesNotMatch(source, /\bwhile\s*\(|\bfor\s*\(\s*;/);

  const driverFileName = "railwayBotReplyPinnedBoundaryDriver.ts";
  const transportFileName =
    "nodePostgresBotReplyPinnedSessionTransport.ts";
  const compositionFileName =
    "railwayBotReplyPinnedBoundaryComposition.ts";
  const serverFiles = await listTypeScriptFiles(
    new URL("../server/", import.meta.url),
  );
  for (const file of serverFiles) {
    if (file.pathname.endsWith(`/${driverFileName}`)) continue;
    const candidateSource = await readFile(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file.pathname,
      candidateSource,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS,
    );
    const allowedDriverImportRanges = [];
    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteralLike(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.includes(
          "railwayBotReplyPinnedBoundaryDriver",
        )
      ) {
        continue;
      }
      const allowedTransportTypeImport =
        file.pathname.endsWith(`/${transportFileName}`) &&
        statement.moduleSpecifier.text ===
          "./railwayBotReplyPinnedBoundaryDriver.ts" &&
        statement.importClause?.isTypeOnly === true;
      const compositionImportsFactory =
        statement.importClause?.namedBindings !== undefined &&
        ts.isNamedImports(statement.importClause.namedBindings) &&
        statement.importClause.namedBindings.elements.some(
          (element) =>
            element.isTypeOnly === false &&
            element.propertyName === undefined &&
            element.name.text ===
              "createRailwayBotReplyPinnedBoundaryDriver",
        );
      const allowedCompositionRuntimeImport =
        file.pathname.endsWith(`/${compositionFileName}`) &&
        statement.moduleSpecifier.text ===
          "./railwayBotReplyPinnedBoundaryDriver.ts" &&
        statement.importClause !== undefined &&
        statement.importClause.name === undefined &&
        statement.importClause.isTypeOnly === false &&
        compositionImportsFactory;
      assert.equal(
        allowedTransportTypeImport || allowedCompositionRuntimeImport,
        true,
        `only the dormant transport/composition may import the driver: ${file.pathname}`,
      );
      allowedDriverImportRanges.push([
        statement.getStart(sourceFile),
        statement.end,
      ]);
    }
    if (file.pathname.endsWith(`/${transportFileName}`)) {
      assert.equal(
        allowedDriverImportRanges.length,
        1,
        "the dormant transport must have exactly one type-only driver import",
      );
    }
    if (file.pathname.endsWith(`/${compositionFileName}`)) {
      assert.equal(
        allowedDriverImportRanges.length,
        1,
        "the dormant composition must have exactly one runtime driver import",
      );
    }
    let runtimeCandidate = candidateSource;
    for (const [start, end] of allowedDriverImportRanges.toReversed()) {
      runtimeCandidate =
        `${runtimeCandidate.slice(0, start)}${" ".repeat(end - start)}` +
        runtimeCandidate.slice(end);
    }
    assert.doesNotMatch(
      runtimeCandidate,
      /railwayBotReplyPinnedBoundaryDriver/u,
      `dormant B2b driver must not be runtime-referenced by ${file.pathname}`,
    );
  }
});
