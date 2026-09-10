import { types as nodeUtilTypes } from "node:util";

import type { Pool, PoolClient } from "pg";

import type {
  RailwayBotReplyPinnedAcquireResult,
  RailwayBotReplyPinnedConsumeResult,
  RailwayBotReplyPinnedFactResult,
  RailwayBotReplyPinnedFinalizationResult,
  RailwayBotReplyPinnedProofResult,
  RailwayBotReplyPinnedProviderFact,
  RailwayBotReplyPinnedReleaseResult,
} from "./railwayBotReplyPinnedBoundaryDriver.ts";

const maximumPostgresProcessId = 2_147_483_647;
const permitKeyPattern =
  /^bot_reply_staging_pre_send_permit_v1_[a-f0-9]{64}$/;
const observationKeyPattern =
  /^bot_reply_staging_observation_v1_[a-f0-9]{64}$/;
const denialReasonCodes = Object.freeze([
  "AUTHORIZATION_STALE",
  "CONNECTION_CHANGED",
  "CREDENTIAL_CHANGED",
  "DELIVERY_STALE",
  "OPERATION_ALREADY_FENCED",
  "OPERATION_KIND_NOT_RELEASABLE",
  "PERMIT_EXPIRED",
  "POLICY_DISABLED",
  "PROVIDER_COOLDOWN_ACTIVE",
  "RESERVATION_STALE",
  "RUN_STALE",
  "SERVICE_WINDOW_CLOSED",
] as const);
const dependencyKeys = Object.freeze(["pool"]);
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
const abortSignalAbortedGetter = Object.getOwnPropertyDescriptor(
  AbortSignal.prototype,
  "aborted",
)?.get;
const eventTargetAddEventListener = EventTarget.prototype.addEventListener;
const eventTargetRemoveEventListener = EventTarget.prototype.removeEventListener;

const controlStatements = Object.freeze({
  beginReadCommitted: "BEGIN ISOLATION LEVEL READ COMMITTED",
  commit: "COMMIT",
  discardAll: "DISCARD ALL",
  rollback: "ROLLBACK",
});

const queryStatements = Object.freeze({
  acquire: [
    "SELECT capability.outcome,",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.acquire_bot_reply_staging_pre_send_session_barrier_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  consume: [
    "SELECT capability.outcome, capability.\"reasonCode\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.consume_bot_reply_staging_credential_bound_pre_send_permit_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  finalize: [
    "SELECT capability.outcome, capability.state,",
    "capability.\"providerOutcomeKind\", capability.\"observationKey\",",
    "capability.\"finalizedAt\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.finalize_bot_reply_staging_credential_bound_pre_send_permit_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  persistProviderFact: [
    "SELECT capability.outcome, capability.\"providerOutcomeKind\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.write_bot_reply_staging_provider_fact_v1(",
    "$1::TEXT, $2::TEXT, $3::TEXT, $4::INTEGER, $5::INTEGER",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  persistProviderUncertainty: [
    "SELECT capability.outcome, capability.state,",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.write_bot_reply_staging_provider_uncertainty_v1(",
    "$1::TEXT, $2::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  lockProof: [
    "SELECT pg_catalog.count(*)::integer AS \"advisoryLockCount\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM pg_catalog.pg_locks AS lock",
    "WHERE lock.pid = pg_catalog.pg_backend_pid()",
    "AND lock.locktype = 'advisory'",
    "AND lock.granted",
  ].join(" "),
  pid: "SELECT pg_catalog.pg_backend_pid()::integer AS \"backendPid\"",
  prove: [
    "SELECT capability.outcome, capability.\"backendPid\",",
    "capability.\"sendBefore\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.prove_bot_reply_staging_pre_send_session_barrier_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  reconcile: [
    "SELECT capability.outcome, capability.state,",
    "capability.\"providerOutcomeKind\", capability.\"observationKey\",",
    "capability.\"finalizedAt\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.reconcile_bot_reply_staging_credential_bound_pre_send_permit_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
  release: [
    "SELECT capability.outcome, capability.\"releasedCount\",",
    "pg_catalog.pg_backend_pid()::integer AS \"ackBackendPid\"",
    "FROM public.release_bot_reply_staging_pre_send_session_barrier_v1(",
    "$1::TEXT",
    ") AS capability",
    "LIMIT 2",
  ].join(" "),
});

const controlResultKeys = Object.freeze([
  "RowCtor",
  "_parsers",
  "_prebuiltEmptyResultObject",
  "_types",
  "command",
  "fields",
  "oid",
  "rowAsArray",
  "rowCount",
  "rows",
]);
const selectResultKeys = Object.freeze([
  ...controlResultKeys,
  "parseRow",
]);
const fieldKeys = Object.freeze([
  "columnID",
  "dataTypeID",
  "dataTypeModifier",
  "dataTypeSize",
  "format",
  "name",
  "tableID",
]);

type ExpectedField = Readonly<{
  dataTypeID: 23 | 25 | 1184;
  dataTypeSize: -1 | 4 | 8;
  name: string;
}>;

function expectedField(
  name: string,
  dataTypeID: ExpectedField["dataTypeID"],
  dataTypeSize: ExpectedField["dataTypeSize"],
): ExpectedField {
  return Object.freeze({ dataTypeID, dataTypeSize, name });
}

const resultFields = Object.freeze({
  acquire: Object.freeze([
    expectedField("outcome", 25, -1),
    expectedField("ackBackendPid", 23, 4),
  ]),
  consume: Object.freeze([
    expectedField("outcome", 25, -1),
    expectedField("reasonCode", 25, -1),
    expectedField("ackBackendPid", 23, 4),
  ]),
  finalization: Object.freeze([
    expectedField("outcome", 25, -1),
    expectedField("state", 25, -1),
    expectedField("providerOutcomeKind", 25, -1),
    expectedField("observationKey", 25, -1),
    expectedField("finalizedAt", 1184, 8),
    expectedField("ackBackendPid", 23, 4),
  ]),
  lockProof: Object.freeze([
    expectedField("advisoryLockCount", 23, 4),
    expectedField("ackBackendPid", 23, 4),
  ]),
  pid: Object.freeze([
    expectedField("backendPid", 23, 4),
  ]),
  providerFact: Object.freeze([
    expectedField("outcome", 25, -1),
    expectedField("providerOutcomeKind", 25, -1),
    expectedField("ackBackendPid", 23, 4),
  ]),
  providerUncertainty: Object.freeze([
    expectedField("outcome", 25, -1),
    expectedField("state", 25, -1),
    expectedField("ackBackendPid", 23, 4),
  ]),
  prove: Object.freeze([
    expectedField("outcome", 25, -1),
    expectedField("backendPid", 23, 4),
    expectedField("sendBefore", 1184, 8),
    expectedField("ackBackendPid", 23, 4),
  ]),
  release: Object.freeze([
    expectedField("outcome", 25, -1),
    expectedField("releasedCount", 23, 4),
    expectedField("ackBackendPid", 23, 4),
  ]),
});

type ExactRecord = Readonly<Record<string, unknown>>;
type SessionPhase =
  | "opened"
  | "no-lock"
  | "acquired-lock"
  | "consumed-lock"
  | "proved-lock"
  | "provider-fact-lock"
  | "provider-uncertainty-lock"
  | "reconciliation-lock"
  | "finalized-lock"
  | "released"
  | "closed"
  | "destroyed";

type CheckedPool = Readonly<{
  connect: Pool["connect"];
}>;

type RuntimePoolClient = PoolClient & Readonly<{
  pipeline?: unknown;
}>;

type CheckedClient = Readonly<{
  client: RuntimePoolClient;
  getTransactionStatus: PoolClient["getTransactionStatus"];
  once: PoolClient["once"];
  query: PoolClient["query"];
  release: PoolClient["release"];
  removeListener: PoolClient["removeListener"];
}>;

export const nodePostgresBotReplyPinnedSessionTransportStatus = Object.freeze({
  activationAllowed: false as const,
  runtimeImporters: 0 as const,
  trustedWriters: "missing" as const,
});

export type NodePostgresBotReplyPinnedSessionTransportErrorCode =
  | "aborted"
  | "concurrent-use"
  | "connection-failed"
  | "destroy-failed"
  | "invalid-client"
  | "invalid-dependency"
  | "invalid-phase"
  | "invalid-result"
  | "invalid-signal"
  | "physical-client-changed"
  | "query-failed"
  | "release-failed";

export class NodePostgresBotReplyPinnedSessionTransportError extends Error {
  readonly code: NodePostgresBotReplyPinnedSessionTransportErrorCode;

  constructor(code: NodePostgresBotReplyPinnedSessionTransportErrorCode) {
    super(`node-postgres pinned session transport failed: ${code}`);
    this.name = "NodePostgresBotReplyPinnedSessionTransportError";
    this.code = code;
  }
}

export interface NodePostgresBotReplyPinnedSession {
  prepare(signal: AbortSignal): Promise<Readonly<{
    backendPid: number;
    readyForQuery: "idle";
    sessionReset: "acknowledged";
  }>>;
  acquire(
    permitKey: string,
    signal: AbortSignal,
  ): Promise<RailwayBotReplyPinnedAcquireResult>;
  consume(
    permitKey: string,
    signal: AbortSignal,
  ): Promise<RailwayBotReplyPinnedConsumeResult>;
  prove(
    permitKey: string,
    signal: AbortSignal,
  ): Promise<RailwayBotReplyPinnedProofResult>;
  persistProviderFact(
    permitKey: string,
    fact: RailwayBotReplyPinnedProviderFact,
    signal: AbortSignal,
  ): Promise<RailwayBotReplyPinnedFactResult>;
  persistProviderUncertainty(
    permitKey: string,
    reason: "provider-call-threw" | "provider-call-timed-out",
    signal: AbortSignal,
  ): Promise<RailwayBotReplyPinnedFactResult>;
  finalize(
    permitKey: string,
    signal: AbortSignal,
  ): Promise<RailwayBotReplyPinnedFinalizationResult>;
  release(
    permitKey: string,
    signal: AbortSignal,
  ): Promise<RailwayBotReplyPinnedReleaseResult>;
  close(signal: AbortSignal): Promise<void>;
  destroy(signal: AbortSignal): Promise<void>;
}

export interface NodePostgresBotReplyPinnedSessionTransport {
  openPinned(signal: AbortSignal): Promise<NodePostgresBotReplyPinnedSession>;
}

function transportError(
  code: NodePostgresBotReplyPinnedSessionTransportErrorCode,
): NodePostgresBotReplyPinnedSessionTransportError {
  return new NodePostgresBotReplyPinnedSessionTransportError(code);
}

function fail(
  code: NodePostgresBotReplyPinnedSessionTransportErrorCode,
): never {
  throw transportError(code);
}

function requireExactDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
  code: NodePostgresBotReplyPinnedSessionTransportErrorCode,
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
    if (ownKeys.some((key) => typeof key !== "string")) return fail(code);
    const keys = (ownKeys as string[]).sort();
    const expected = [...expectedKeys].sort();
    if (
      keys.length !== expected.length ||
      keys.some((key, index) => key !== expected[index])
    ) {
      return fail(code);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
      string,
      PropertyDescriptor
    >;
    const snapshot = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
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
    if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {
      throw error;
    }
    return fail(code);
  }
}

function captureMethod<TFunction extends (...arguments_: never[]) => unknown>(
  value: object,
  key: string,
  code: NodePostgresBotReplyPinnedSessionTransportErrorCode,
): TFunction {
  try {
    const method = Reflect.get(value, key);
    if (typeof method !== "function") return fail(code);
    return ((...arguments_: never[]) =>
      Reflect.apply(method, value, arguments_)) as TFunction;
  } catch (error) {
    if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {
      throw error;
    }
    return fail(code);
  }
}

function requirePool(value: unknown): CheckedPool {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-dependency");
  }
  return Object.freeze({
    connect: captureMethod<Pool["connect"]>(
      value,
      "connect",
      "invalid-dependency",
    ),
  });
}

function destroyUnknownClient(value: unknown): void {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return;
  }
  try {
    const release = Reflect.get(value, "release");
    if (typeof release === "function") {
      Reflect.apply(release, value, [true]);
    }
  } catch {
    // The checkout remains unusable and no session is returned.
  }
}

function requireClient(value: unknown): CheckedClient {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-client");
  }
  let pipeline: unknown;
  try {
    pipeline = Reflect.get(value, "pipeline");
  } catch {
    return fail("invalid-client");
  }
  if (pipeline !== false) return fail("invalid-client");
  return Object.freeze({
    client: value as RuntimePoolClient,
    getTransactionStatus: captureMethod<PoolClient["getTransactionStatus"]>(
      value,
      "getTransactionStatus",
      "invalid-client",
    ),
    once: captureMethod<PoolClient["once"]>(
      value,
      "once",
      "invalid-client",
    ),
    query: captureMethod<PoolClient["query"]>(
      value,
      "query",
      "invalid-client",
    ),
    release: captureMethod<PoolClient["release"]>(
      value,
      "release",
      "invalid-client",
    ),
    removeListener: captureMethod<PoolClient["removeListener"]>(
      value,
      "removeListener",
      "invalid-client",
    ),
  });
}

function signalIsAborted(signal: AbortSignal): boolean {
  if (abortSignalAbortedGetter === undefined) {
    return fail("invalid-signal");
  }
  const aborted = Reflect.apply(
    abortSignalAbortedGetter,
    signal,
    [],
  );
  if (typeof aborted !== "boolean") return fail("invalid-signal");
  return aborted;
}

function addAbortListener(
  signal: AbortSignal,
  listener: () => void,
): void {
  Reflect.apply(eventTargetAddEventListener, signal, [
    "abort",
    listener,
    { once: true },
  ]);
}

function removeAbortListener(
  signal: AbortSignal,
  listener: () => void,
): void {
  Reflect.apply(eventTargetRemoveEventListener, signal, [
    "abort",
    listener,
  ]);
}

function requireSignal(value: unknown): AbortSignal {
  if (
    typeof value !== "object" ||
    value === null ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-signal");
  }
  try {
    signalIsAborted(value as AbortSignal);
    return value as AbortSignal;
  } catch (error) {
    if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {
      throw error;
    }
    return fail("invalid-signal");
  }
}

function requirePermitKey(value: unknown): string {
  if (typeof value !== "string" || !permitKeyPattern.test(value)) {
    return fail("invalid-result");
  }
  return value;
}

type PostgresParameter = string | number | null;

type ProviderFactParameters = Readonly<{
  outcomeKind: RailwayBotReplyPinnedProviderFact["outcome"];
  values: readonly PostgresParameter[];
}>;

function requireProviderMessageId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 510 ||
    value !== value.trim() ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value) ||
    [...value].length > 255 ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && codePoint >= 0xd800 && codePoint <= 0xdfff;
    })
  ) {
    return fail("invalid-result");
  }
  return value;
}

function requireRetryAfterSeconds(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > 86_400
  ) {
    return fail("invalid-result");
  }
  return Number(value);
}

function requireProviderFact(value: unknown): ProviderFactParameters {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-result");
  }
  try {
    const outcomeDescriptor = Object.getOwnPropertyDescriptor(value, "outcome");
    if (
      outcomeDescriptor === undefined ||
      !("value" in outcomeDescriptor) ||
      outcomeDescriptor.enumerable !== true
    ) {
      return fail("invalid-result");
    }
    const outcome = outcomeDescriptor.value;
    if (outcome === "accepted") {
      const fact = requireExactDataRecord(
        value,
        ["outcome", "providerMessageId"],
        "invalid-result",
      );
      return Object.freeze({
        outcomeKind: outcome,
        values: Object.freeze([
          outcome,
          requireProviderMessageId(fact.providerMessageId),
          null,
          null,
        ]),
      });
    }
    if (outcome === "sender-deferred" || outcome === "pair-deferred") {
      const fact = requireExactDataRecord(
        value,
        ["outcome", "providerErrorCode", "retryAfterSeconds"],
        "invalid-result",
      );
      const expectedErrorCode = outcome === "sender-deferred" ? 130_429 : 131_056;
      if (fact.providerErrorCode !== expectedErrorCode) {
        return fail("invalid-result");
      }
      return Object.freeze({
        outcomeKind: outcome,
        values: Object.freeze([
          outcome,
          null,
          expectedErrorCode,
          requireRetryAfterSeconds(fact.retryAfterSeconds),
        ]),
      });
    }
    if (outcome === "service-window-rejected") {
      const fact = requireExactDataRecord(
        value,
        ["outcome", "providerErrorCode"],
        "invalid-result",
      );
      if (fact.providerErrorCode !== 131_047) {
        return fail("invalid-result");
      }
      return Object.freeze({
        outcomeKind: outcome,
        values: Object.freeze([outcome, null, 131_047, null]),
      });
    }
    return fail("invalid-result");
  } catch (error) {
    if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {
      throw error;
    }
    return fail("invalid-result");
  }
}

function requireProviderUncertaintyReason(
  value: unknown,
): "threw" | "timeout" {
  if (value === "provider-call-threw") return "threw";
  if (value === "provider-call-timed-out") return "timeout";
  return fail("invalid-result");
}

function isDenialReasonCode(value: unknown): value is string {
  return typeof value === "string" && denialReasonCodes.some(
    (reasonCode) => reasonCode === value,
  );
}

function requireBackendPid(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximumPostgresProcessId
  ) {
    return fail("invalid-result");
  }
  return Number(value);
}

function canonicalTimestamp(value: unknown): string {
  let milliseconds: number;
  if (
    nodeUtilTypes.isDate(value) &&
    !nodeUtilTypes.isProxy(value)
  ) {
    try {
      milliseconds = Date.prototype.getTime.call(value);
    } catch {
      return fail("invalid-result");
    }
  } else if (typeof value === "string" && value.length <= 40) {
    milliseconds = Date.parse(value);
    if (
      !Number.isFinite(milliseconds) ||
      new Date(milliseconds).toISOString() !== value
    ) {
      return fail("invalid-result");
    }
  } else {
    return fail("invalid-result");
  }
  if (!Number.isFinite(milliseconds)) return fail("invalid-result");
  return new Date(milliseconds).toISOString();
}

function requireExactOwnKeys(
  value: object,
  expectedKeys: readonly string[],
): Record<string, PropertyDescriptor> {
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    return fail("invalid-result");
  }
  const sortedKeys = (ownKeys as string[]).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (
    sortedKeys.length !== sortedExpectedKeys.length ||
    sortedKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    return fail("invalid-result");
  }
  return Object.getOwnPropertyDescriptors(value) as Record<
    string,
    PropertyDescriptor
  >;
}

function requireDataValue(
  descriptors: Record<string, PropertyDescriptor>,
  key: string,
): unknown {
  const descriptor = descriptors[key];
  if (descriptor === undefined || !("value" in descriptor)) {
    return fail("invalid-result");
  }
  return descriptor.value;
}

function requireField(
  value: unknown,
  expected: ExpectedField,
): void {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-result");
  }
  const descriptors = requireExactOwnKeys(value, fieldKeys);
  if (
    requireDataValue(descriptors, "name") !== expected.name ||
    requireDataValue(descriptors, "tableID") !== 0 ||
    requireDataValue(descriptors, "columnID") !== 0 ||
    requireDataValue(descriptors, "dataTypeID") !== expected.dataTypeID ||
    requireDataValue(descriptors, "dataTypeSize") !== expected.dataTypeSize ||
    requireDataValue(descriptors, "dataTypeModifier") !== -1 ||
    requireDataValue(descriptors, "format") !== "text"
  ) {
    return fail("invalid-result");
  }
}

function requireFields(
  value: unknown,
  expectedFields: readonly ExpectedField[],
): void {
  if (
    !Array.isArray(value) ||
    nodeUtilTypes.isProxy(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length !== expectedFields.length ||
    Reflect.ownKeys(value).length !== expectedFields.length + 1
  ) {
    return fail("invalid-result");
  }
  for (let index = 0; index < expectedFields.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      return fail("invalid-result");
    }
    requireField(descriptor.value, expectedFields[index]);
  }
}

function requireRow(
  value: unknown,
  expectedLength: number,
): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    nodeUtilTypes.isProxy(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length !== expectedLength ||
    Reflect.ownKeys(value).length !== expectedLength + 1
  ) {
    return fail("invalid-result");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
    string,
    PropertyDescriptor
  >;
  const snapshot: unknown[] = [];
  for (let index = 0; index < expectedLength; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      return fail("invalid-result");
    }
    snapshot.push(descriptor.value);
  }
  return Object.freeze(snapshot);
}

function requireSelectRow(
  value: unknown,
  expectedFields: readonly ExpectedField[],
): readonly unknown[] {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-result");
  }
  try {
    const descriptors = requireExactOwnKeys(value, selectResultKeys);
    const command = requireDataValue(descriptors, "command");
    const rowCount = requireDataValue(descriptors, "rowCount");
    const oid = requireDataValue(descriptors, "oid");
    const rows = requireDataValue(descriptors, "rows");
    const fields = requireDataValue(descriptors, "fields");
    if (
      command !== "SELECT" ||
      rowCount !== 1 ||
      oid !== null ||
      requireDataValue(descriptors, "rowAsArray") !== true ||
      typeof requireDataValue(descriptors, "parseRow") !== "function"
    ) {
      return fail("invalid-result");
    }
    requireFields(fields, expectedFields);
    const rawRows = rows;
    if (
      !Array.isArray(rawRows) ||
      nodeUtilTypes.isProxy(rawRows) ||
      Object.getPrototypeOf(rawRows) !== Array.prototype ||
      rawRows.length !== 1 ||
      Reflect.ownKeys(rawRows).length !== 2
    ) {
      return fail("invalid-result");
    }
    const rowDescriptor = Object.getOwnPropertyDescriptor(rawRows, "0");
    if (
      rowDescriptor === undefined ||
      !("value" in rowDescriptor) ||
      rowDescriptor.enumerable !== true
    ) {
      return fail("invalid-result");
    }
    return requireRow(rowDescriptor.value, expectedFields.length);
  } catch (error) {
    if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {
      throw error;
    }
    return fail("invalid-result");
  }
}

function requireControlResult(value: unknown, expectedCommand: string): void {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    nodeUtilTypes.isProxy(value)
  ) {
    return fail("invalid-result");
  }
  try {
    const descriptors = requireExactOwnKeys(value, controlResultKeys);
    const command = requireDataValue(descriptors, "command");
    const rowCount = requireDataValue(descriptors, "rowCount");
    const rows = requireDataValue(descriptors, "rows");
    const fields = requireDataValue(descriptors, "fields");
    if (
      command !== expectedCommand ||
      rowCount !== null ||
      requireDataValue(descriptors, "oid") !== null ||
      requireDataValue(descriptors, "rowAsArray") !== false ||
      !Array.isArray(rows) ||
      nodeUtilTypes.isProxy(rows) ||
      Object.getPrototypeOf(rows) !== Array.prototype ||
      Reflect.ownKeys(rows).length !== 1 ||
      !Array.isArray(fields) ||
      nodeUtilTypes.isProxy(fields) ||
      Object.getPrototypeOf(fields) !== Array.prototype ||
      Reflect.ownKeys(fields).length !== 1
    ) {
      return fail("invalid-result");
    }
  } catch (error) {
    if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {
      throw error;
    }
    return fail("invalid-result");
  }
}

function resultConfig(
  text: string,
  values: readonly PostgresParameter[],
): Readonly<{
  text: string;
  values: readonly PostgresParameter[];
  rowMode: "array";
}> {
  return Object.freeze({
    text,
    values: Object.freeze([...values]),
    rowMode: "array" as const,
  });
}

function acknowledgement(backendPid: number) {
  return Object.freeze({
    backendPid,
    commitAck: "acknowledged" as const,
    readyForQuery: "idle" as const,
  });
}

function createSession(checkedClient: CheckedClient): NodePostgresBotReplyPinnedSession {
  let phase: SessionPhase = "opened";
  let backendPid: number | null = null;
  let expectedReleaseCount: 1 | 2 | null = null;
  let inFlight = false;
  let releaseInvoked = false;
  let physicalDestroy: Promise<void> | null = null;

  const currentTransactionStatus = (): "I" | "T" | "E" | null => {
    try {
      return checkedClient.getTransactionStatus();
    } catch {
      return fail("query-failed");
    }
  };

  const startPhysicalDestroy = (): Promise<void> => {
    if (physicalDestroy !== null) return physicalDestroy;
    phase = "destroyed";
    physicalDestroy = new Promise<void>((resolve, reject) => {
      if (releaseInvoked) {
        resolve();
        return;
      }
      releaseInvoked = true;
      let settled = false;
      const onEnd = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      try {
        checkedClient.once("end", onEnd);
        checkedClient.release(true);
      } catch {
        try {
          checkedClient.removeListener("end", onEnd);
        } catch {
          // No second release is attempted after an uncertain release call.
        }
        if (!settled) {
          settled = true;
          reject(transportError("destroy-failed"));
        }
      }
    });
    // Destruction is also started from fail-closed paths that deliberately do
    // not await cleanup. Keep those paths free of unhandled rejections while
    // preserving the rejection for an explicit destroy() caller.
    void physicalDestroy.catch(() => undefined);
    return physicalDestroy;
  };

  const awaitDestroy = async (rawSignal: unknown): Promise<void> => {
    const destroyPromise = startPhysicalDestroy();
    const signal = requireSignal(rawSignal);
    if (signalIsAborted(signal)) return fail("aborted");
    let removeAbort: () => void = () => {};
    const abortPromise = new Promise<never>((_resolve, reject) => {
      const onAbort = () => reject(transportError("aborted"));
      addAbortListener(signal, onAbort);
      removeAbort = () => removeAbortListener(signal, onAbort);
    });
    try {
      await Promise.race([destroyPromise, abortPromise]);
    } finally {
      removeAbort();
    }
  };

  const query = async (input: unknown): Promise<unknown> => {
    try {
      const value = await Reflect.apply(
        checkedClient.query,
        checkedClient.client,
        [input],
      );
      if (phase === "destroyed") return fail("aborted");
      return value;
    } catch (error) {
      if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {
        throw error;
      }
      return fail("query-failed");
    }
  };

  const requireStatus = (expected: "I" | "T"): void => {
    if (currentTransactionStatus() !== expected) return fail("invalid-result");
  };

  const runCommittedCapability = async (
    text: string,
    values: readonly PostgresParameter[],
    expectedFields: readonly ExpectedField[],
  ): Promise<readonly unknown[]> => {
    requireStatus("I");
    requireControlResult(
      await query(controlStatements.beginReadCommitted),
      "BEGIN",
    );
    requireStatus("T");
    const rawResult = await query(resultConfig(text, values));
    requireStatus("T");
    const row = requireSelectRow(rawResult, expectedFields);
    requireControlResult(await query(controlStatements.commit), "COMMIT");
    requireStatus("I");
    return row;
  };

  const requireCurrentPid = (value: unknown): number => {
    const pid = requireBackendPid(value);
    if (backendPid === null || pid !== backendPid) {
      return fail("physical-client-changed");
    }
    return pid;
  };

  const withExclusive = async <TValue>(
    rawSignal: unknown,
    allowedPhases: readonly SessionPhase[],
    operation: () => Promise<TValue>,
  ): Promise<TValue> => {
    let signal: AbortSignal;
    try {
      signal = requireSignal(rawSignal);
    } catch {
      void startPhysicalDestroy();
      throw transportError("invalid-signal");
    }
    if (inFlight) {
      void startPhysicalDestroy();
      return fail("concurrent-use");
    }
    if (!allowedPhases.includes(phase)) {
      void startPhysicalDestroy();
      return fail("invalid-phase");
    }
    if (signalIsAborted(signal)) {
      void startPhysicalDestroy();
      return fail("aborted");
    }

    inFlight = true;
    let aborted = false;
    let rejectAbort: (reason: NodePostgresBotReplyPinnedSessionTransportError) =>
      void = () => {};
    const abortPromise = new Promise<never>((_resolve, reject) => {
      rejectAbort = reject;
    });
    const onAbort = () => {
      aborted = true;
      void startPhysicalDestroy();
      rejectAbort(transportError("aborted"));
    };
    addAbortListener(signal, onAbort);
    try {
      const operationPromise = operation();
      const value = await Promise.race([operationPromise, abortPromise]);
      if (aborted || phase === "destroyed") return fail("aborted");
      return value;
    } catch (error) {
      void startPhysicalDestroy();
      if (aborted) return fail("aborted");
      if (error instanceof NodePostgresBotReplyPinnedSessionTransportError) {
        throw error;
      }
      return fail("query-failed");
    } finally {
      removeAbortListener(signal, onAbort);
      inFlight = false;
    }
  };

  const session: NodePostgresBotReplyPinnedSession = Object.freeze({
    async prepare(signal: AbortSignal) {
      return withExclusive(signal, ["opened"], async () => {
        requireControlResult(
          await query(controlStatements.rollback),
          "ROLLBACK",
        );
        requireStatus("I");
        requireControlResult(
          await query(controlStatements.discardAll),
          "DISCARD",
        );
        requireStatus("I");
        const row = requireSelectRow(
          await query(resultConfig(queryStatements.pid, [])),
          resultFields.pid,
        );
        requireStatus("I");
        backendPid = requireBackendPid(row[0]);
        phase = "no-lock";
        return Object.freeze({
          backendPid,
          readyForQuery: "idle" as const,
          sessionReset: "acknowledged" as const,
        });
      });
    },

    async acquire(rawPermitKey: string, signal: AbortSignal) {
      return withExclusive(signal, ["no-lock"], async () => {
        const permitKey = requirePermitKey(rawPermitKey);
        const row = await runCommittedCapability(
          queryStatements.acquire,
          [permitKey],
          resultFields.acquire,
        );
        const outcome = row[0];
        const pid = requireCurrentPid(row[1]);
        if (
          outcome !== "acquired" &&
          outcome !== "busy" &&
          outcome !== "blocked-unresolved" &&
          outcome !== "reconciliation-required"
        ) {
          return fail("invalid-result");
        }
        if (outcome === "acquired") {
          expectedReleaseCount = 1;
          phase = "acquired-lock";
        } else if (outcome === "reconciliation-required") {
          expectedReleaseCount = 2;
          phase = "reconciliation-lock";
        } else {
          expectedReleaseCount = null;
          phase = "no-lock";
        }
        return Object.freeze({
          ...acknowledgement(pid),
          outcome,
        }) as RailwayBotReplyPinnedAcquireResult;
      });
    },

    async consume(rawPermitKey: string, signal: AbortSignal) {
      return withExclusive(signal, ["acquired-lock"], async () => {
        const permitKey = requirePermitKey(rawPermitKey);
        const row = await runCommittedCapability(
          queryStatements.consume,
          [permitKey],
          resultFields.consume,
        );
        const outcome = row[0];
        const reasonCode = row[1];
        const pid = requireCurrentPid(row[2]);
        if (
          (outcome !== "authorized" &&
            outcome !== "denied" &&
            outcome !== "replay-blocked") ||
          (outcome === "authorized" &&
            reasonCode !== "CAPABILITY_RELEASED") ||
          (outcome === "denied" && !isDenialReasonCode(reasonCode)) ||
          (outcome === "replay-blocked" &&
            reasonCode !== "CAPABILITY_ALREADY_RELEASED" &&
            !isDenialReasonCode(reasonCode))
        ) {
          return fail("invalid-result");
        }
        phase = "consumed-lock";
        return Object.freeze({
          ...acknowledgement(pid),
          outcome,
          reasonCode,
        }) as RailwayBotReplyPinnedConsumeResult;
      });
    },

    async prove(rawPermitKey: string, signal: AbortSignal) {
      return withExclusive(signal, ["consumed-lock"], async () => {
        const permitKey = requirePermitKey(rawPermitKey);
        const row = await runCommittedCapability(
          queryStatements.prove,
          [permitKey],
          resultFields.prove,
        );
        if (row[0] !== "held") return fail("invalid-result");
        const storedPid = requireCurrentPid(row[1]);
        const sendBefore = canonicalTimestamp(row[2]);
        const currentPid = requireCurrentPid(row[3]);
        if (storedPid !== currentPid) return fail("physical-client-changed");
        phase = "proved-lock";
        return Object.freeze({
          ...acknowledgement(currentPid),
          outcome: "held" as const,
          sendBefore,
        });
      });
    },

    async persistProviderFact(
      rawPermitKey: string,
      rawFact: RailwayBotReplyPinnedProviderFact,
      signal: AbortSignal,
    ) {
      return withExclusive(signal, ["proved-lock"], async () => {
        const permitKey = requirePermitKey(rawPermitKey);
        const fact = requireProviderFact(rawFact);
        const row = await runCommittedCapability(
          queryStatements.persistProviderFact,
          [permitKey, ...fact.values],
          resultFields.providerFact,
        );
        if (row[0] !== "recorded" || row[1] !== fact.outcomeKind) {
          return fail("invalid-result");
        }
        const pid = requireCurrentPid(row[2]);
        phase = "provider-fact-lock";
        return Object.freeze({
          ...acknowledgement(pid),
          outcome: "recorded" as const,
        });
      });
    },

    async persistProviderUncertainty(
      rawPermitKey: string,
      rawReason: "provider-call-threw" | "provider-call-timed-out",
      signal: AbortSignal,
    ) {
      return withExclusive(signal, ["proved-lock"], async () => {
        const permitKey = requirePermitKey(rawPermitKey);
        const reason = requireProviderUncertaintyReason(rawReason);
        const row = await runCommittedCapability(
          queryStatements.persistProviderUncertainty,
          [permitKey, reason],
          resultFields.providerUncertainty,
        );
        if (row[0] !== "recorded" || row[1] !== "ambiguous") {
          return fail("invalid-result");
        }
        const pid = requireCurrentPid(row[2]);
        phase = "provider-uncertainty-lock";
        return Object.freeze({
          ...acknowledgement(pid),
          outcome: "recorded" as const,
        });
      });
    },

    async finalize(rawPermitKey: string, signal: AbortSignal) {
      return withExclusive(
        signal,
        [
          "provider-fact-lock",
          "provider-uncertainty-lock",
          "reconciliation-lock",
        ],
        async () => {
          const permitKey = requirePermitKey(rawPermitKey);
          const reconciliation = phase === "reconciliation-lock";
          const row = await runCommittedCapability(
            reconciliation
              ? queryStatements.reconcile
              : queryStatements.finalize,
            [permitKey],
            resultFields.finalization,
          );
          const outcome = row[0];
          const state = row[1];
          const providerOutcomeKind = row[2];
          const observationKey = row[3];
          const finalizedAt = row[4];
          const pid = requireCurrentPid(row[5]);
          let result: RailwayBotReplyPinnedFinalizationResult;

          if (outcome === "finalized" || outcome === "replayed") {
            if (
              state !== "completed" ||
              (providerOutcomeKind !== "accepted" &&
                providerOutcomeKind !== "sender-deferred" &&
                providerOutcomeKind !== "pair-deferred" &&
                providerOutcomeKind !== "service-window-rejected") ||
              typeof observationKey !== "string" ||
              !observationKeyPattern.test(observationKey)
            ) {
              return fail("invalid-result");
            }
            result = Object.freeze({
              ...acknowledgement(pid),
              outcome,
              state: "completed",
              providerOutcomeKind,
              observationKey,
              finalizedAt: canonicalTimestamp(finalizedAt),
            });
          } else if (outcome === "manual-reconciliation-required") {
            if (
              (state !== "ambiguous" &&
                state !== "lease-expired-without-outcome") ||
              providerOutcomeKind !== null ||
              observationKey !== null ||
              finalizedAt !== null
            ) {
              return fail("invalid-result");
            }
            result = Object.freeze({
              ...acknowledgement(pid),
              outcome,
              state,
              providerOutcomeKind: null,
              observationKey: null,
              finalizedAt: null,
            });
          } else if (outcome === "pending") {
            if (
              state !== "reserved" ||
              providerOutcomeKind !== null ||
              observationKey !== null ||
              finalizedAt !== null
            ) {
              return fail("invalid-result");
            }
            result = Object.freeze({
              ...acknowledgement(pid),
              outcome,
              state: "reserved",
              providerOutcomeKind: null,
              observationKey: null,
              finalizedAt: null,
            });
          } else if (outcome === "closed") {
            if (
              (state !== "denied" && state !== "unconsumed") ||
              providerOutcomeKind !== null ||
              observationKey !== null ||
              finalizedAt !== null
            ) {
              return fail("invalid-result");
            }
            result = Object.freeze({
              ...acknowledgement(pid),
              outcome,
              state,
              providerOutcomeKind: null,
              observationKey: null,
              finalizedAt: null,
            });
          } else {
            return fail("invalid-result");
          }
          phase = "finalized-lock";
          return result;
        },
      );
    },

    async release(rawPermitKey: string, signal: AbortSignal) {
      return withExclusive(
        signal,
        [
          "consumed-lock",
          "proved-lock",
          "reconciliation-lock",
          "finalized-lock",
        ],
        async () => {
          const permitKey = requirePermitKey(rawPermitKey);
          if (expectedReleaseCount === null) return fail("invalid-phase");
          const releasedCount = expectedReleaseCount;
          const row = await runCommittedCapability(
            queryStatements.release,
            [permitKey],
            resultFields.release,
          );
          const pid = requireCurrentPid(row[2]);
          if (
            row[0] !== "released" ||
            row[1] !== releasedCount
          ) {
            return fail("invalid-result");
          }
          phase = "released";
          expectedReleaseCount = null;
          return Object.freeze({
            ...acknowledgement(pid),
            outcome: "released" as const,
            releasedCount,
          });
        },
      );
    },

    async close(signal: AbortSignal) {
      return withExclusive(signal, ["no-lock", "released"], async () => {
        requireStatus("I");
        const lockRow = requireSelectRow(
          await query(resultConfig(queryStatements.lockProof, [])),
          resultFields.lockProof,
        );
        requireStatus("I");
        if (lockRow[0] !== 0) return fail("invalid-result");
        requireCurrentPid(lockRow[1]);

        requireControlResult(
          await query(controlStatements.rollback),
          "ROLLBACK",
        );
        requireStatus("I");
        requireControlResult(
          await query(controlStatements.discardAll),
          "DISCARD",
        );
        requireStatus("I");
        const pidRow = requireSelectRow(
          await query(resultConfig(queryStatements.pid, [])),
          resultFields.pid,
        );
        requireStatus("I");
        requireCurrentPid(pidRow[0]);

        if (releaseInvoked) return fail("release-failed");
        releaseInvoked = true;
        try {
          // DISCARD ALL invalidates PostgreSQL prepared statements without
          // clearing node-postgres' per-client named-query cache. Destroying
          // this dedicated checkout prevents a later borrower from reusing a
          // client whose driver and server caches no longer agree.
          checkedClient.release(true);
        } catch {
          phase = "destroyed";
          return fail("release-failed");
        }
        phase = "closed";
      });
    },

    async destroy(signal: AbortSignal) {
      if (phase === "closed") {
        requireSignal(signal);
        return;
      }
      await awaitDestroy(signal);
    },
  });

  if (Object.keys(session).sort().join(",") !== [...sessionKeys].sort().join(",")) {
    return fail("invalid-client");
  }
  return session;
}

export function createNodePostgresBotReplyPinnedSessionTransport(
  dependencies: Readonly<{ pool: Pool }>,
): Readonly<NodePostgresBotReplyPinnedSessionTransport> {
  const checkedDependencies = requireExactDataRecord(
    dependencies,
    dependencyKeys,
    "invalid-dependency",
  );
  const pool = requirePool(checkedDependencies.pool);

  return Object.freeze({
    async openPinned(rawSignal: AbortSignal) {
      const signal = requireSignal(rawSignal);
      if (signalIsAborted(signal)) return fail("aborted");

      return new Promise<NodePostgresBotReplyPinnedSession>((resolve, reject) => {
        let settled = false;
        const settleRejected = (
          code: NodePostgresBotReplyPinnedSessionTransportErrorCode,
        ) => {
          if (settled) return;
          settled = true;
          removeAbortListener(signal, onAbort);
          reject(transportError(code));
        };
        const onAbort = () => settleRejected("aborted");
        addAbortListener(signal, onAbort);

        let checkout: Promise<unknown>;
        try {
          checkout = Promise.resolve(pool.connect());
        } catch {
          settleRejected("connection-failed");
          return;
        }

        void checkout.then(
          (rawClient) => {
            if (settled || signalIsAborted(signal)) {
              destroyUnknownClient(rawClient);
              settleRejected("aborted");
              return;
            }
            let client: CheckedClient;
            try {
              client = requireClient(rawClient);
            } catch {
              destroyUnknownClient(rawClient);
              settleRejected("invalid-client");
              return;
            }
            if (settled || signalIsAborted(signal)) {
              destroyUnknownClient(rawClient);
              settleRejected("aborted");
              return;
            }
            let session: NodePostgresBotReplyPinnedSession;
            try {
              session = createSession(client);
            } catch {
              destroyUnknownClient(rawClient);
              settleRejected("invalid-client");
              return;
            }
            settled = true;
            removeAbortListener(signal, onAbort);
            resolve(session);
          },
          () => settleRejected("connection-failed"),
        );
      });
    },
  });
}
