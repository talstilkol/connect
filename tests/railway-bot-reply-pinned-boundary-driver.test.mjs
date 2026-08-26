import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

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
  const providerFact = options.providerFact ?? Object.freeze({
    outcome: "accepted",
    providerMessageId: "wamid.durable-provider-fact",
  });
  const session = {
    async prepare() {
      calls.push({ kind: "prepare" });
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
    async acquire(currentPermitKey) {
      calls.push({ kind: "acquire", permitKey: currentPermitKey });
      if (options.acquireError) throw options.acquireError;
      return options.acquireResult ?? {
        ...ack(),
        outcome: "acquired",
      };
    },
    async consume(currentPermitKey) {
      calls.push({ kind: "consume", permitKey: currentPermitKey });
      if (options.consumeError) throw options.consumeError;
      return options.consumeResult ?? {
        ...ack(),
        outcome: "authorized",
        reasonCode: "CAPABILITY_RELEASED",
      };
    },
    async prove(currentPermitKey) {
      calls.push({ kind: "prove", permitKey: currentPermitKey });
      if (options.proveError) throw options.proveError;
      return options.proofResult ?? {
        ...ack(),
        outcome: "held",
        sendBefore,
      };
    },
    async persistProviderFact(currentPermitKey, fact) {
      calls.push({
        kind: "persist-provider-fact",
        permitKey: currentPermitKey,
        fact,
      });
      if (options.factError) throw options.factError;
      return options.factResult ?? {
        ...ack(),
        outcome: "recorded",
      };
    },
    async persistProviderUncertainty(currentPermitKey, reason) {
      calls.push({
        kind: "persist-provider-uncertainty",
        permitKey: currentPermitKey,
        reason,
      });
      if (options.uncertaintyError) throw options.uncertaintyError;
      return options.uncertaintyResult ?? {
        ...ack(),
        outcome: "recorded",
      };
    },
    async finalize(currentPermitKey) {
      calls.push({ kind: "finalize", permitKey: currentPermitKey });
      if (options.finalizeError) throw options.finalizeError;
      return options.finalizationResult ?? finalization();
    },
    async release(currentPermitKey) {
      calls.push({ kind: "release", permitKey: currentPermitKey });
      if (options.releaseError) throw options.releaseError;
      return options.releaseResult ?? {
        ...ack(),
        outcome: "released",
        releasedCount: options.reconciliation === true ? 2 : 1,
      };
    },
    async close() {
      calls.push({ kind: "close" });
      if (options.closeError) throw options.closeError;
    },
    async destroy() {
      calls.push({ kind: "destroy" });
      if (options.destroyError) throw options.destroyError;
    },
  };
  const clockPort = {
      now() {
        return new Date(options.now ?? now);
      },
    };
  const sessionsPort = {
      async openPinned() {
        calls.push({ kind: "open-pinned" });
        if (options.openError) throw options.openError;
        return options.rawSession ?? session;
      },
    };
  const providerPort = {
      async sendOnce(input) {
        calls.push({ kind: "provider", input });
        if (options.providerError) throw options.providerError;
        return providerFact;
      },
    };
  const driver = createRailwayBotReplyPinnedBoundaryDriver({
    clock: clockPort,
    sessions: sessionsPort,
    provider: providerPort,
  });
  return {
    calls,
    clockPort,
    driver,
    providerFact,
    providerPort,
    session,
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
      sessions: { openPinned: async () => ({}) },
      provider: { sendOnce: async () => ({}) },
      retry: true,
    }),
    /invalid-dependencies/,
  );
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
  const { driver, providerPort, sessionsPort } = fixture(options);
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
    timeoutContractStatus: "missing",
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
  const serverFiles = await listTypeScriptFiles(
    new URL("../server/", import.meta.url),
  );
  for (const file of serverFiles) {
    if (file.pathname.endsWith(`/${driverFileName}`)) continue;
    assert.doesNotMatch(
      await readFile(file, "utf8"),
      /railwayBotReplyPinnedBoundaryDriver/u,
      `dormant B2b driver must not be imported by ${file.pathname}`,
    );
  }
});
