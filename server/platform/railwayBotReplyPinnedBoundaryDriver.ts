import { types as nodeUtilTypes } from "node:util";

const permitKeyPattern =
  /^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$/;
const observationKeyPattern =
  /^bot_reply_staging_observation_v1_[a-f0-9]{64}$/;
const maximumPostgresProcessId = 2_147_483_647;
const maximumProviderBoundaryMilliseconds = 15_000;
const maximumRetryAfterSeconds = 86_400;
const inputKeys = Object.freeze(["permitKey"]);
const dependencyKeys = Object.freeze(["clock", "provider", "sessions"]);
const sessionKeys = Object.freeze([
  "acquire",
  "close",
  "consume",
  "destroy",
  "finalize",
  "persistProviderFact",
  "persistProviderUncertainty",
  "prepare",
  "prove",
  "release",
]);

type ExactRecord = Readonly<Record<string, unknown>>;

export const railwayBotReplyPinnedBoundaryStatus = Object.freeze({
  activationAllowed: false as const,
  concreteAdapterStatus: "missing" as const,
  timeoutContractStatus: "missing" as const,
});

export type RailwayBotReplyPinnedProviderFact = Readonly<
  | {
      outcome: "accepted";
      providerMessageId: string;
    }
  | {
      outcome: "sender-deferred";
      providerErrorCode: 130429;
      retryAfterSeconds: number;
    }
  | {
      outcome: "pair-deferred";
      providerErrorCode: 131056;
      retryAfterSeconds: number;
    }
  | {
      outcome: "service-window-rejected";
      providerErrorCode: 131047;
    }
>;

export type RailwayBotReplyPinnedCommitAcknowledgement = Readonly<{
  backendPid: number;
  commitAck: "acknowledged";
  readyForQuery: "idle";
}>;

export type RailwayBotReplyPinnedAcquireResult =
  RailwayBotReplyPinnedCommitAcknowledgement & Readonly<{
    outcome:
      | "acquired"
      | "busy"
      | "blocked-unresolved"
      | "reconciliation-required";
  }>;

export type RailwayBotReplyPinnedConsumeResult =
  RailwayBotReplyPinnedCommitAcknowledgement & Readonly<
    | {
        outcome: "authorized";
        reasonCode: "CAPABILITY_RELEASED";
      }
    | {
        outcome: "denied" | "replay-blocked";
        reasonCode: string;
      }
  >;

export type RailwayBotReplyPinnedProofResult =
  RailwayBotReplyPinnedCommitAcknowledgement & Readonly<{
    outcome: "held";
    sendBefore: string;
  }>;

export type RailwayBotReplyPinnedFactResult =
  RailwayBotReplyPinnedCommitAcknowledgement & Readonly<{
    outcome: "recorded";
  }>;

export type RailwayBotReplyPinnedFinalizationResult =
  RailwayBotReplyPinnedCommitAcknowledgement & Readonly<
    | {
        outcome: "finalized" | "replayed";
        state: "completed";
        providerOutcomeKind:
          | "accepted"
          | "sender-deferred"
          | "pair-deferred"
          | "service-window-rejected";
        observationKey: string;
        finalizedAt: string;
      }
    | {
        outcome: "manual-reconciliation-required";
        state: "ambiguous" | "lease-expired-without-outcome";
        providerOutcomeKind: null;
        observationKey: null;
        finalizedAt: null;
      }
    | {
        outcome: "pending";
        state: "reserved";
        providerOutcomeKind: null;
        observationKey: null;
        finalizedAt: null;
      }
    | {
        outcome: "closed";
        state: "denied" | "unconsumed";
        providerOutcomeKind: null;
        observationKey: null;
        finalizedAt: null;
      }
  >;

export type RailwayBotReplyPinnedReleaseResult =
  RailwayBotReplyPinnedCommitAcknowledgement & Readonly<{
    outcome: "released" | "not-held" | "lock-leaked";
    releasedCount: number;
  }>;

export interface RailwayBotReplyPinnedSession {
  /**
   * The Port must ROLLBACK and DISCARD ALL on its one checked-out physical
   * client before returning this acknowledgement.
   */
  prepare(): Promise<Readonly<{
    backendPid: number;
    readyForQuery: "idle";
    sessionReset: "acknowledged";
  }>>;
  acquire(permitKey: string): Promise<RailwayBotReplyPinnedAcquireResult>;
  consume(permitKey: string): Promise<RailwayBotReplyPinnedConsumeResult>;
  prove(permitKey: string): Promise<RailwayBotReplyPinnedProofResult>;
  persistProviderFact(
    permitKey: string,
    fact: RailwayBotReplyPinnedProviderFact,
  ): Promise<RailwayBotReplyPinnedFactResult>;
  persistProviderUncertainty(
    permitKey: string,
    reason: "provider-call-threw",
  ): Promise<RailwayBotReplyPinnedFactResult>;
  finalize(
    permitKey: string,
  ): Promise<RailwayBotReplyPinnedFinalizationResult>;
  release(permitKey: string): Promise<RailwayBotReplyPinnedReleaseResult>;
  close(): Promise<void>;
  destroy(): Promise<void>;
}

export interface RailwayBotReplyPinnedBoundaryDependencies {
  readonly clock: Readonly<{ now(): Date }>;
  readonly sessions: Readonly<{
    openPinned(): Promise<RailwayBotReplyPinnedSession>;
  }>;
  readonly provider: Readonly<{
    sendOnce(
      input: Readonly<{
        automaticRetryPolicy: "forbidden";
        sendBefore: string;
      }>,
    ): Promise<RailwayBotReplyPinnedProviderFact>;
  }>;
}

export type RailwayBotReplyPinnedBoundaryResult = Readonly<
  | {
      outcome: "completed";
      providerCallCount: 0 | 1;
      providerOutcomeKind:
        | "accepted"
        | "sender-deferred"
        | "pair-deferred"
        | "service-window-rejected";
      observationKey: string;
      finalizedAt: string;
    }
  | {
      outcome: "not-sent";
      providerCallCount: 0;
      reason:
        | "busy"
        | "blocked-unresolved"
        | "denied"
        | "replay-blocked";
    }
  | {
      outcome: "manual-reconciliation-required";
      providerCallCount: 0 | 1;
      reason:
        | "session-open-ack-unknown"
        | "acquire-ack-unknown"
        | "consume-ack-unknown"
        | "proof-ack-unknown"
        | "provider-boundary-expired"
        | "provider-outcome-unknown"
        | "provider-fact-ack-unknown"
        | "finalization-ack-unknown"
        | "reconciliation-required"
        | "release-ack-unknown";
    }
>;

export type RailwayBotReplyPinnedBoundaryErrorCode =
  | "invalid-dependencies"
  | "invalid-input"
  | "invalid-session"
  | "invalid-database-result"
  | "invalid-provider-result"
  | "physical-client-changed";

export class RailwayBotReplyPinnedBoundaryError extends Error {
  readonly code: RailwayBotReplyPinnedBoundaryErrorCode;

  constructor(code: RailwayBotReplyPinnedBoundaryErrorCode) {
    super(`Railway bot reply pinned boundary failed: ${code}`);
    this.name = "RailwayBotReplyPinnedBoundaryError";
    this.code = code;
  }
}

function fail(code: RailwayBotReplyPinnedBoundaryErrorCode): never {
  throw new RailwayBotReplyPinnedBoundaryError(code);
}

function requireExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  code: RailwayBotReplyPinnedBoundaryErrorCode,
): ExactRecord {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail(code);
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return fail(code);
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      return fail(code);
    }
    const actualKeys = (ownKeys as string[]).sort();
    const normalizedExpectedKeys = [...expectedKeys].sort();
    if (
      actualKeys.length !== normalizedExpectedKeys.length ||
      actualKeys.some(
        (key, index) => key !== normalizedExpectedKeys[index],
      )
    ) {
      return fail(code);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of actualKeys) {
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return fail(code);
      }
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch (error) {
    if (error instanceof RailwayBotReplyPinnedBoundaryError) {
      throw error;
    }
    return fail(code);
  }
}

function captureMethod<TMethod>(
  record: ExactRecord,
  key: string,
  receiver: unknown,
  code: RailwayBotReplyPinnedBoundaryErrorCode,
): TMethod {
  const method = record[key];
  if (typeof method !== "function") return fail(code);
  return ((...args: unknown[]) =>
    Reflect.apply(method, receiver, args)) as TMethod;
}

function requireDependencies(
  value: unknown,
): Readonly<RailwayBotReplyPinnedBoundaryDependencies> {
  const dependencies = requireExactRecord(
    value,
    dependencyKeys,
    "invalid-dependencies",
  );
  const clock = requireExactRecord(
    dependencies.clock,
    ["now"],
    "invalid-dependencies",
  );
  const sessions = requireExactRecord(
    dependencies.sessions,
    ["openPinned"],
    "invalid-dependencies",
  );
  const provider = requireExactRecord(
    dependencies.provider,
    ["sendOnce"],
    "invalid-dependencies",
  );
  return Object.freeze({
    clock: Object.freeze({
      now: captureMethod<
        RailwayBotReplyPinnedBoundaryDependencies["clock"]["now"]
      >(clock, "now", dependencies.clock, "invalid-dependencies"),
    }),
    sessions: Object.freeze({
      openPinned: captureMethod<
        RailwayBotReplyPinnedBoundaryDependencies["sessions"]["openPinned"]
      >(
        sessions,
        "openPinned",
        dependencies.sessions,
        "invalid-dependencies",
      ),
    }),
    provider: Object.freeze({
      sendOnce: captureMethod<
        RailwayBotReplyPinnedBoundaryDependencies["provider"]["sendOnce"]
      >(
        provider,
        "sendOnce",
        dependencies.provider,
        "invalid-dependencies",
      ),
    }),
  });
}

function requireInput(value: unknown): string {
  const input = requireExactRecord(value, inputKeys, "invalid-input");
  if (
    typeof input.permitKey !== "string" ||
    !permitKeyPattern.test(input.permitKey)
  ) {
    return fail("invalid-input");
  }
  return input.permitKey;
}

function requireSession(
  value: unknown,
): RailwayBotReplyPinnedSession {
  const session = requireExactRecord(value, sessionKeys, "invalid-session");
  const captured = Object.create(null) as Record<string, unknown>;
  for (const key of sessionKeys) {
    captured[key] = captureMethod(
      session,
      key,
      value,
      "invalid-session",
    );
  }
  return Object.freeze(captured) as unknown as RailwayBotReplyPinnedSession;
}

function requireBackendPid(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximumPostgresProcessId
  ) {
    return fail("invalid-database-result");
  }
  return Number(value);
}

function requireCanonicalTimestamp(value: unknown): string {
  if (typeof value !== "string" || value.length > 40) {
    return fail("invalid-database-result");
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    return fail("invalid-database-result");
  }
  return value;
}

function requireProviderFact(
  value: unknown,
): RailwayBotReplyPinnedProviderFact {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-provider-result");
  }

  let outcome: unknown;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, "outcome");
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      return fail("invalid-provider-result");
    }
    outcome = descriptor.value;
  } catch {
    return fail("invalid-provider-result");
  }

  if (outcome === "accepted") {
    const fact = requireExactRecord(
      value,
      ["outcome", "providerMessageId"],
      "invalid-provider-result",
    );
    if (
      typeof fact.providerMessageId !== "string" ||
      !fact.providerMessageId.startsWith("wamid.") ||
      fact.providerMessageId.length <= "wamid.".length ||
      fact.providerMessageId.length > 255 ||
      fact.providerMessageId.trim() !== fact.providerMessageId ||
      /\s|[\u0000-\u001f\u007f]/u.test(fact.providerMessageId)
    ) {
      return fail("invalid-provider-result");
    }
    return Object.freeze({
      outcome: "accepted",
      providerMessageId: fact.providerMessageId,
    });
  }

  if (outcome === "service-window-rejected") {
    const fact = requireExactRecord(
      value,
      ["outcome", "providerErrorCode"],
      "invalid-provider-result",
    );
    if (fact.providerErrorCode !== 131047) {
      return fail("invalid-provider-result");
    }
    return Object.freeze({
      outcome: "service-window-rejected",
      providerErrorCode: 131047,
    });
  }

  if (outcome === "sender-deferred" || outcome === "pair-deferred") {
    const fact = requireExactRecord(
      value,
      ["outcome", "providerErrorCode", "retryAfterSeconds"],
      "invalid-provider-result",
    );
    const expectedCode = outcome === "sender-deferred" ? 130429 : 131056;
    if (
      fact.providerErrorCode !== expectedCode ||
      !Number.isSafeInteger(fact.retryAfterSeconds) ||
      Number(fact.retryAfterSeconds) < 1 ||
      Number(fact.retryAfterSeconds) > maximumRetryAfterSeconds
    ) {
      return fail("invalid-provider-result");
    }
    return Object.freeze({
      outcome,
      providerErrorCode: expectedCode,
      retryAfterSeconds: Number(fact.retryAfterSeconds),
    }) as RailwayBotReplyPinnedProviderFact;
  }

  return fail("invalid-provider-result");
}

function requireClockMilliseconds(clock: Readonly<{ now(): Date }>): number {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    return fail("invalid-dependencies");
  }
  if (
    !nodeUtilTypes.isDate(value) ||
    nodeUtilTypes.isProxy(value) ||
    !Number.isFinite(value.getTime())
  ) {
    return fail("invalid-dependencies");
  }
  return value.getTime();
}

function requireInitialState(
  value: unknown,
): Readonly<{
  backendPid: number;
  readyForQuery: "idle";
  sessionReset: "acknowledged";
}> {
  const result = requireExactRecord(
    value,
    ["backendPid", "readyForQuery", "sessionReset"],
    "invalid-database-result",
  );
  if (
    result.readyForQuery !== "idle" ||
    result.sessionReset !== "acknowledged"
  ) {
    return fail("invalid-database-result");
  }
  return Object.freeze({
    backendPid: requireBackendPid(result.backendPid),
    readyForQuery: "idle",
    sessionReset: "acknowledged",
  });
}

function requireAck(
  value: ExactRecord,
  expectedBackendPid: number,
): void {
  if (
    value.commitAck !== "acknowledged" ||
    value.readyForQuery !== "idle"
  ) {
    return fail("invalid-database-result");
  }
  const backendPid = requireBackendPid(value.backendPid);
  if (backendPid !== expectedBackendPid) {
    return fail("physical-client-changed");
  }
}

function requireAcquire(
  value: unknown,
  backendPid: number,
): RailwayBotReplyPinnedAcquireResult {
  const result = requireExactRecord(
    value,
    ["backendPid", "commitAck", "outcome", "readyForQuery"],
    "invalid-database-result",
  );
  requireAck(result, backendPid);
  if (
    result.outcome !== "acquired" &&
    result.outcome !== "busy" &&
    result.outcome !== "blocked-unresolved" &&
    result.outcome !== "reconciliation-required"
  ) {
    return fail("invalid-database-result");
  }
  return Object.freeze({
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: result.outcome,
  }) as RailwayBotReplyPinnedAcquireResult;
}

function requireConsume(
  value: unknown,
  backendPid: number,
): RailwayBotReplyPinnedConsumeResult {
  const result = requireExactRecord(
    value,
    ["backendPid", "commitAck", "outcome", "readyForQuery", "reasonCode"],
    "invalid-database-result",
  );
  requireAck(result, backendPid);
  if (
    (result.outcome !== "authorized" &&
      result.outcome !== "denied" &&
      result.outcome !== "replay-blocked") ||
    typeof result.reasonCode !== "string" ||
    result.reasonCode.length < 1 ||
    result.reasonCode.length > 100 ||
    (result.outcome === "authorized" &&
      result.reasonCode !== "CAPABILITY_RELEASED")
  ) {
    return fail("invalid-database-result");
  }
  return Object.freeze({
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: result.outcome,
    reasonCode: result.reasonCode,
  }) as RailwayBotReplyPinnedConsumeResult;
}

function requireProof(
  value: unknown,
  backendPid: number,
): RailwayBotReplyPinnedProofResult {
  const result = requireExactRecord(
    value,
    [
      "backendPid",
      "commitAck",
      "outcome",
      "readyForQuery",
      "sendBefore",
    ],
    "invalid-database-result",
  );
  requireAck(result, backendPid);
  if (result.outcome !== "held") {
    return fail("invalid-database-result");
  }
  const sendBefore = requireCanonicalTimestamp(result.sendBefore);
  return Object.freeze({
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: "held",
    sendBefore,
  });
}

function requireFactResult(
  value: unknown,
  backendPid: number,
): RailwayBotReplyPinnedFactResult {
  const result = requireExactRecord(
    value,
    ["backendPid", "commitAck", "outcome", "readyForQuery"],
    "invalid-database-result",
  );
  requireAck(result, backendPid);
  if (result.outcome !== "recorded") {
    return fail("invalid-database-result");
  }
  return Object.freeze({
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: "recorded",
  });
}

function requireFinalization(
  value: unknown,
  backendPid: number,
): RailwayBotReplyPinnedFinalizationResult {
  const result = requireExactRecord(
    value,
    [
      "backendPid",
      "commitAck",
      "finalizedAt",
      "observationKey",
      "outcome",
      "providerOutcomeKind",
      "readyForQuery",
      "state",
    ],
    "invalid-database-result",
  );
  requireAck(result, backendPid);

  if (result.outcome === "finalized" || result.outcome === "replayed") {
    if (
      result.state !== "completed" ||
      (
        result.providerOutcomeKind !== "accepted" &&
        result.providerOutcomeKind !== "sender-deferred" &&
        result.providerOutcomeKind !== "pair-deferred" &&
        result.providerOutcomeKind !== "service-window-rejected"
      ) ||
      typeof result.observationKey !== "string" ||
      !observationKeyPattern.test(result.observationKey)
    ) {
      return fail("invalid-database-result");
    }
    const finalizedAt = requireCanonicalTimestamp(result.finalizedAt);
    return Object.freeze({
      backendPid,
      commitAck: "acknowledged",
      readyForQuery: "idle",
      outcome: result.outcome,
      state: "completed",
      providerOutcomeKind: result.providerOutcomeKind,
      observationKey: result.observationKey,
      finalizedAt,
    }) as RailwayBotReplyPinnedFinalizationResult;
  }

  const nullEvidence = result.providerOutcomeKind === null &&
    result.observationKey === null && result.finalizedAt === null;
  if (
    !nullEvidence ||
    !(
      (
        result.outcome === "manual-reconciliation-required" &&
        (
          result.state === "ambiguous" ||
          result.state === "lease-expired-without-outcome"
        )
      ) ||
      (result.outcome === "pending" && result.state === "reserved") ||
      (
        result.outcome === "closed" &&
        (result.state === "denied" || result.state === "unconsumed")
      )
    )
  ) {
    return fail("invalid-database-result");
  }
  return Object.freeze({
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: result.outcome,
    state: result.state,
    providerOutcomeKind: null,
    observationKey: null,
    finalizedAt: null,
  }) as RailwayBotReplyPinnedFinalizationResult;
}

function requireRelease(
  value: unknown,
  backendPid: number,
  expectedReleasedCount: 1 | 2,
): RailwayBotReplyPinnedReleaseResult {
  const result = requireExactRecord(
    value,
    [
      "backendPid",
      "commitAck",
      "outcome",
      "readyForQuery",
      "releasedCount",
    ],
    "invalid-database-result",
  );
  requireAck(result, backendPid);
  if (
    result.outcome !== "released" ||
    result.releasedCount !== expectedReleasedCount
  ) {
    return fail("invalid-database-result");
  }
  return Object.freeze({
    backendPid,
    commitAck: "acknowledged",
    readyForQuery: "idle",
    outcome: "released",
    releasedCount: expectedReleasedCount,
  });
}

function completedResult(
  finalization: RailwayBotReplyPinnedFinalizationResult,
  providerCallCount: 0 | 1,
): RailwayBotReplyPinnedBoundaryResult {
  if (
    finalization.outcome !== "finalized" &&
    finalization.outcome !== "replayed"
  ) {
    return fail("invalid-database-result");
  }
  return Object.freeze({
    outcome: "completed",
    providerCallCount,
    providerOutcomeKind: finalization.providerOutcomeKind,
    observationKey: finalization.observationKey,
    finalizedAt: finalization.finalizedAt,
  });
}

function manualResult(
  reason: Extract<
    RailwayBotReplyPinnedBoundaryResult,
    { outcome: "manual-reconciliation-required" }
  >["reason"],
  providerCallCount: 0 | 1,
): RailwayBotReplyPinnedBoundaryResult {
  return Object.freeze({
    outcome: "manual-reconciliation-required",
    providerCallCount,
    reason,
  });
}

async function destroyUnknownSession(value: unknown): Promise<void> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return;
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, "destroy");
    if (
      descriptor !== undefined &&
      "value" in descriptor &&
      typeof descriptor.value === "function"
    ) {
      await Reflect.apply(descriptor.value, value, []);
    }
  } catch {
    // A malformed session remains unusable even when destroy itself fails.
  }
}

async function destroySession(
  session: RailwayBotReplyPinnedSession | undefined,
): Promise<void> {
  if (session === undefined) return;
  try {
    await session.destroy();
  } catch {
    // A failed destroy cannot authorize reuse or another provider call.
  }
}

async function releaseAndClose(
  session: RailwayBotReplyPinnedSession,
  permitKey: string,
  backendPid: number,
  expectedReleasedCount: 1 | 2,
): Promise<boolean> {
  try {
    requireRelease(
      await session.release(permitKey),
      backendPid,
      expectedReleasedCount,
    );
    await session.close();
    return true;
  } catch {
    await destroySession(session);
    return false;
  }
}

export function createRailwayBotReplyPinnedBoundaryDriver(
  rawDependencies:
    Readonly<RailwayBotReplyPinnedBoundaryDependencies>,
): Readonly<{
  run(
    input: Readonly<{ permitKey: string }>,
  ): Promise<RailwayBotReplyPinnedBoundaryResult>;
}> {
  const dependencies = requireDependencies(rawDependencies);

  return Object.freeze({
    async run(rawInput) {
      const permitKey = requireInput(rawInput);
      let rawSession: unknown;
      let session: RailwayBotReplyPinnedSession | undefined;
      let backendPid: number;

      try {
        rawSession = await dependencies.sessions.openPinned();
        session = requireSession(rawSession);
        backendPid = requireInitialState(await session.prepare()).backendPid;
      } catch (error) {
        if (session === undefined) {
          await destroyUnknownSession(rawSession);
        } else {
          await destroySession(session);
        }
        if (error instanceof RailwayBotReplyPinnedBoundaryError) throw error;
        return manualResult("session-open-ack-unknown", 0);
      }

      let acquisition: RailwayBotReplyPinnedAcquireResult;
      try {
        acquisition = requireAcquire(
          await session.acquire(permitKey),
          backendPid,
        );
      } catch (error) {
        await destroySession(session);
        if (error instanceof RailwayBotReplyPinnedBoundaryError) throw error;
        return manualResult("acquire-ack-unknown", 0);
      }

      if (
        acquisition.outcome === "busy" ||
        acquisition.outcome === "blocked-unresolved"
      ) {
        try {
          await session.close();
        } catch {
          await destroySession(session);
        }
        return Object.freeze({
          outcome: "not-sent",
          providerCallCount: 0,
          reason: acquisition.outcome,
        });
      }

      if (acquisition.outcome === "reconciliation-required") {
        let finalization: RailwayBotReplyPinnedFinalizationResult;
        try {
          finalization = requireFinalization(
            await session.finalize(permitKey),
            backendPid,
          );
        } catch (error) {
          await destroySession(session);
          if (error instanceof RailwayBotReplyPinnedBoundaryError) throw error;
          return manualResult("finalization-ack-unknown", 0);
        }
        const released = await releaseAndClose(
          session,
          permitKey,
          backendPid,
          2,
        );
        if (!released) return manualResult("release-ack-unknown", 0);
        if (
          finalization.outcome === "finalized" ||
          finalization.outcome === "replayed"
        ) {
          return completedResult(finalization, 0);
        }
        return manualResult("reconciliation-required", 0);
      }

      let consumption: RailwayBotReplyPinnedConsumeResult;
      try {
        consumption = requireConsume(
          await session.consume(permitKey),
          backendPid,
        );
      } catch (error) {
        await destroySession(session);
        if (error instanceof RailwayBotReplyPinnedBoundaryError) throw error;
        return manualResult("consume-ack-unknown", 0);
      }

      if (consumption.outcome !== "authorized") {
        const released = await releaseAndClose(
          session,
          permitKey,
          backendPid,
          1,
        );
        if (!released) return manualResult("release-ack-unknown", 0);
        return Object.freeze({
          outcome: "not-sent",
          providerCallCount: 0,
          reason: consumption.outcome,
        });
      }

      let proof: RailwayBotReplyPinnedProofResult;
      try {
        proof = requireProof(await session.prove(permitKey), backendPid);
      } catch (error) {
        await destroySession(session);
        if (error instanceof RailwayBotReplyPinnedBoundaryError) throw error;
        return manualResult("proof-ack-unknown", 0);
      }

      let providerBoundaryMilliseconds: number;
      try {
        providerBoundaryMilliseconds =
          Date.parse(proof.sendBefore) -
          requireClockMilliseconds(dependencies.clock);
      } catch (error) {
        await destroySession(session);
        throw error;
      }
      if (providerBoundaryMilliseconds <= 0) {
        const released = await releaseAndClose(
          session,
          permitKey,
          backendPid,
          1,
        );
        if (!released) return manualResult("release-ack-unknown", 0);
        return manualResult("provider-boundary-expired", 0);
      }

      if (
        providerBoundaryMilliseconds > maximumProviderBoundaryMilliseconds
      ) {
        await destroySession(session);
        return fail("invalid-database-result");
      }

      let providerFact: RailwayBotReplyPinnedProviderFact | null = null;
      try {
        providerFact = requireProviderFact(
          await dependencies.provider.sendOnce(Object.freeze({
            automaticRetryPolicy: "forbidden",
            sendBefore: proof.sendBefore,
          })),
        );
      } catch {
        // A thrown or malformed provider response is an uncertain side effect.
      }

      try {
        if (providerFact === null) {
          requireFactResult(
            await session.persistProviderUncertainty(
              permitKey,
              "provider-call-threw",
            ),
            backendPid,
          );
        } else {
          requireFactResult(
            await session.persistProviderFact(permitKey, providerFact),
            backendPid,
          );
        }
      } catch {
        await destroySession(session);
        return manualResult("provider-fact-ack-unknown", 1);
      }

      let finalization: RailwayBotReplyPinnedFinalizationResult;
      try {
        finalization = requireFinalization(
          await session.finalize(permitKey),
          backendPid,
        );
      } catch {
        await destroySession(session);
        return manualResult("finalization-ack-unknown", 1);
      }

      const released = await releaseAndClose(
        session,
        permitKey,
        backendPid,
        1,
      );
      if (!released) return manualResult("release-ack-unknown", 1);
      if (
        finalization.outcome === "finalized" ||
        finalization.outcome === "replayed"
      ) {
        return completedResult(finalization, 1);
      }
      return manualResult("provider-outcome-unknown", 1);
    },
  });
}
