import {
  createHash,
} from "node:crypto";

import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

export const postgresBotReplyStagingDurableObservationWriterVersion =
  "connect-postgres-bot-reply-staging-observation-writer-v1" as const;

type DispatchOutcome = "accepted" | "rejected" | "deferred" | "duplicate";

interface CommonObservationRecord {
  readonly runKey: string;
  readonly claimVersion: number;
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly subjectDeliveryKey: string;
  readonly recipientFingerprint: string;
  readonly observedAt: string;
}

export type BotReplyStagingDurableObservationRecord =
  | (CommonObservationRecord & {
      readonly factKind: "scenario";
      readonly caseName:
        | "text-send"
        | "button-send"
        | "button-reply"
        | "status-sent"
        | "status-delivered"
        | "status-read"
        | "customer-window-expired";
      readonly scenario:
        | "text-send"
        | "button-send"
        | "button-reply"
        | "status-sent"
        | "status-delivered"
        | "status-read"
        | "customer-window-expired";
      readonly providerErrorCode: 131047 | null;
      readonly dispatchOutcome: DispatchOutcome | null;
    })
  | (CommonObservationRecord & {
      readonly factKind: "provider-retry";
      readonly caseName: "provider-retry";
      readonly providerErrorCode: 130429;
      readonly dispatchOutcome: "deferred" | "duplicate";
      readonly retryAfterSeconds: number;
      readonly cooldownScope: "sender";
    })
  | (CommonObservationRecord & {
      readonly factKind: "pair-limit";
      readonly caseName: "pair-limit";
      readonly providerErrorCode: 131056;
      readonly dispatchOutcome: "deferred" | "duplicate";
      readonly cooldownScope: "pair";
      readonly backoffPolicy: "meta-4-power-x";
    })
  | (CommonObservationRecord & {
      readonly factKind: "duplicate-safety";
      readonly caseName: "duplicate-safety";
      readonly firstDispatchOutcome: "accepted" | "duplicate";
      readonly secondDispatchOutcome: "duplicate";
      readonly queueDeliveryCount: number;
      readonly providerRequestCount: 1;
    })
  | (CommonObservationRecord & {
      readonly factKind: "kill-switch";
      readonly caseName: "kill-switch";
      readonly dispatchOutcome: "rejected" | "deferred" | "duplicate";
      readonly disabledPolicyVersion: number;
      readonly policyState: "disabled";
      readonly providerRequestCount: 0;
    });

export interface BotReplyStagingDurableObservationWriteResult {
  readonly outcome: "created" | "unchanged";
  readonly eventKey: string;
}

export interface BotReplyStagingDurableObservationWriter {
  isConfigured(): boolean;
  record(
    input: Readonly<BotReplyStagingDurableObservationRecord>,
  ): Promise<BotReplyStagingDurableObservationWriteResult>;
}

interface CanonicalObservationRow extends CommonObservationRecord {
  readonly eventKey: string;
  readonly caseName: BotReplyStagingDurableObservationRecord["caseName"];
  readonly factKind: BotReplyStagingDurableObservationRecord["factKind"];
  readonly scenario: string | null;
  readonly providerErrorCode: number | null;
  readonly dispatchOutcome: DispatchOutcome | null;
  readonly firstDispatchOutcome: DispatchOutcome | null;
  readonly secondDispatchOutcome: DispatchOutcome | null;
  readonly retryAfterSeconds: number | null;
  readonly cooldownScope: "sender" | "pair" | null;
  readonly backoffPolicy: "meta-4-power-x" | null;
  readonly queueDeliveryCount: number | null;
  readonly providerRequestCount: number | null;
  readonly disabledPolicyVersion: number | null;
  readonly policyState: "disabled" | null;
}

const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const operationKeyPattern = /^bot_reply_staging_step_v1_[a-f0-9]{64}$/;
const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const eventKeyPattern = /^bot_reply_staging_observation_v1_[a-f0-9]{64}$/;

const commonKeys = Object.freeze([
  "caseName",
  "claimVersion",
  "deliveryKey",
  "factKind",
  "observedAt",
  "operationKey",
  "recipientFingerprint",
  "runKey",
  "subjectDeliveryKey",
] as const);

const rowKeys = Object.freeze([
  "backoffPolicy",
  "caseName",
  "claimVersion",
  "cooldownScope",
  "deliveryKey",
  "disabledPolicyVersion",
  "dispatchOutcome",
  "eventKey",
  "factKind",
  "firstDispatchOutcome",
  "observedAt",
  "operationKey",
  "policyState",
  "providerErrorCode",
  "providerRequestCount",
  "queueDeliveryCount",
  "recipientFingerprint",
  "retryAfterSeconds",
  "runKey",
  "scenario",
  "secondDispatchOutcome",
  "subjectDeliveryKey",
] as const);

const columns = `
  event_key AS "eventKey",
  run_key AS "runKey",
  claim_version AS "claimVersion",
  operation_key AS "operationKey",
  delivery_key AS "deliveryKey",
  subject_delivery_key AS "subjectDeliveryKey",
  case_name AS "caseName",
  fact_kind AS "factKind",
  scenario,
  provider_error_code AS "providerErrorCode",
  dispatch_outcome AS "dispatchOutcome",
  first_dispatch_outcome AS "firstDispatchOutcome",
  second_dispatch_outcome AS "secondDispatchOutcome",
  retry_after_seconds AS "retryAfterSeconds",
  cooldown_scope AS "cooldownScope",
  backoff_policy AS "backoffPolicy",
  queue_delivery_count AS "queueDeliveryCount",
  provider_request_count AS "providerRequestCount",
  disabled_policy_version AS "disabledPolicyVersion",
  policy_state AS "policyState",
  recipient_fingerprint AS "recipientFingerprint",
  observed_at AS "observedAt"
`;

export const postgresBotReplyStagingDurableObservationWriterSql =
  Object.freeze({
    insert: `
      INSERT INTO bot_reply_staging_observation_events (
        event_key,
        run_key,
        claim_version,
        operation_key,
        delivery_key,
        subject_delivery_key,
        case_name,
        fact_kind,
        scenario,
        provider_error_code,
        dispatch_outcome,
        first_dispatch_outcome,
        second_dispatch_outcome,
        retry_after_seconds,
        cooldown_scope,
        backoff_policy,
        queue_delivery_count,
        provider_request_count,
        disabled_policy_version,
        policy_state,
        recipient_fingerprint,
        observed_at,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22::timestamptz,
        $22::timestamptz
      )
      ON CONFLICT DO NOTHING
      RETURNING event_key AS "eventKey"
    `,
    readForUpdate: `
      SELECT ${columns}
      FROM bot_reply_staging_observation_events
      WHERE run_key = $1
        AND operation_key = $2
      LIMIT 2
      FOR UPDATE
    `,
  });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: unknown,
  additionalKeys: readonly string[],
): boolean {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...commonKeys, ...additionalKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function requirePattern(value: unknown, pattern: RegExp): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error("Bot reply staging observation identity is invalid");
  }
  return value;
}

function positiveInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error("Bot reply staging observation integer is invalid");
  }
  return Number(value);
}

function parseOptionalInteger(value: unknown): number | null {
  if (value === null) return null;
  const normalized = typeof value === "string" && /^[1-9][0-9]*$/.test(value)
    ? Number(value)
    : value;
  return positiveInteger(normalized);
}

function parseRequestCount(value: unknown): number | null {
  if (value === null) return null;
  const normalized = typeof value === "string" && /^(?:0|[1-9][0-9]*)$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error("Bot reply staging provider request count is invalid");
  }
  return Number(normalized);
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error("PostgreSQL returned invalid staging observation text");
  }
  return value;
}

function parseDispatchOutcome(value: unknown): DispatchOutcome | null {
  if (value === null) return null;
  return requireDispatch(value, [
    "accepted",
    "rejected",
    "deferred",
    "duplicate",
  ]);
}

function timestamp(value: unknown): string {
  if (typeof value !== "string" || value.length > 40) {
    throw new Error("Bot reply staging observation timestamp is invalid");
  }
  const milliseconds = Date.parse(value);
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== value
  ) {
    throw new Error("Bot reply staging observation timestamp is invalid");
  }
  return value;
}

function requireDispatch(
  value: unknown,
  allowed: readonly DispatchOutcome[],
): DispatchOutcome {
  if (!allowed.includes(value as DispatchOutcome)) {
    throw new Error("Bot reply staging dispatch outcome is invalid");
  }
  return value as DispatchOutcome;
}

function baseRow(
  input: Readonly<BotReplyStagingDurableObservationRecord>,
): Omit<CanonicalObservationRow, "eventKey"> {
  return {
    runKey: requirePattern(input.runKey, runKeyPattern),
    claimVersion: positiveInteger(input.claimVersion),
    operationKey: requirePattern(input.operationKey, operationKeyPattern),
    deliveryKey: requirePattern(input.deliveryKey, deliveryKeyPattern),
    subjectDeliveryKey: requirePattern(
      input.subjectDeliveryKey,
      deliveryKeyPattern,
    ),
    caseName: input.caseName,
    factKind: input.factKind,
    scenario: null,
    providerErrorCode: null,
    dispatchOutcome: null,
    firstDispatchOutcome: null,
    secondDispatchOutcome: null,
    retryAfterSeconds: null,
    cooldownScope: null,
    backoffPolicy: null,
    queueDeliveryCount: null,
    providerRequestCount: null,
    disabledPolicyVersion: null,
    policyState: null,
    recipientFingerprint: requirePattern(
      input.recipientFingerprint,
      fingerprintPattern,
    ),
    observedAt: timestamp(input.observedAt),
  };
}

function normalizeScenario(
  input: Extract<BotReplyStagingDurableObservationRecord, { factKind: "scenario" }>,
): Omit<CanonicalObservationRow, "eventKey"> {
  if (
    !hasExactKeys(input, [
      "dispatchOutcome",
      "providerErrorCode",
      "scenario",
    ]) || input.caseName !== input.scenario
  ) {
    throw new Error("Bot reply staging scenario observation is invalid");
  }
  const row = baseRow(input);
  if (input.scenario === "text-send" || input.scenario === "button-send") {
    if (
      input.providerErrorCode !== null ||
      input.deliveryKey !== input.subjectDeliveryKey
    ) {
      throw new Error("Bot reply staging scenario observation is invalid");
    }
    return {
      ...row,
      scenario: input.scenario,
      dispatchOutcome: requireDispatch(input.dispatchOutcome, [
        "accepted",
        "duplicate",
      ]),
    };
  }
  if (
    input.scenario === "button-reply" || input.scenario === "status-sent" ||
    input.scenario === "status-delivered" || input.scenario === "status-read"
  ) {
    if (
      input.providerErrorCode !== null || input.dispatchOutcome !== null ||
      input.deliveryKey === input.subjectDeliveryKey
    ) {
      throw new Error("Bot reply staging scenario observation is invalid");
    }
    return { ...row, scenario: input.scenario };
  }
  if (
    input.providerErrorCode !== 131047 ||
    input.deliveryKey !== input.subjectDeliveryKey
  ) {
    throw new Error("Bot reply staging scenario observation is invalid");
  }
  return {
    ...row,
    scenario: input.scenario,
    providerErrorCode: 131047,
    dispatchOutcome: requireDispatch(input.dispatchOutcome, [
      "rejected",
      "duplicate",
    ]),
  };
}

function normalize(
  rawInput: Readonly<BotReplyStagingDurableObservationRecord>,
): Readonly<CanonicalObservationRow> {
  if (!isRecord(rawInput)) {
    throw new Error("Bot reply staging observation input is invalid");
  }
  let row: Omit<CanonicalObservationRow, "eventKey">;
  if (rawInput.factKind === "scenario") {
    row = normalizeScenario(rawInput);
  } else if (rawInput.factKind === "provider-retry") {
    if (
      !hasExactKeys(rawInput, [
        "cooldownScope",
        "dispatchOutcome",
        "providerErrorCode",
        "retryAfterSeconds",
      ]) || rawInput.caseName !== "provider-retry" ||
      rawInput.providerErrorCode !== 130429 ||
      rawInput.cooldownScope !== "sender" ||
      rawInput.deliveryKey !== rawInput.subjectDeliveryKey
    ) {
      throw new Error("Bot reply staging retry observation is invalid");
    }
    const retryAfterSeconds = positiveInteger(rawInput.retryAfterSeconds);
    if (retryAfterSeconds > 86_400) {
      throw new Error("Bot reply staging retry observation is invalid");
    }
    row = {
      ...baseRow(rawInput),
      providerErrorCode: 130429,
      dispatchOutcome: requireDispatch(rawInput.dispatchOutcome, [
        "deferred",
        "duplicate",
      ]),
      retryAfterSeconds,
      cooldownScope: "sender",
    };
  } else if (rawInput.factKind === "pair-limit") {
    if (
      !hasExactKeys(rawInput, [
        "backoffPolicy",
        "cooldownScope",
        "dispatchOutcome",
        "providerErrorCode",
      ]) || rawInput.caseName !== "pair-limit" ||
      rawInput.providerErrorCode !== 131056 ||
      rawInput.cooldownScope !== "pair" ||
      rawInput.backoffPolicy !== "meta-4-power-x" ||
      rawInput.deliveryKey !== rawInput.subjectDeliveryKey
    ) {
      throw new Error("Bot reply staging pair observation is invalid");
    }
    row = {
      ...baseRow(rawInput),
      providerErrorCode: 131056,
      dispatchOutcome: requireDispatch(rawInput.dispatchOutcome, [
        "deferred",
        "duplicate",
      ]),
      cooldownScope: "pair",
      backoffPolicy: "meta-4-power-x",
    };
  } else if (rawInput.factKind === "duplicate-safety") {
    if (
      !hasExactKeys(rawInput, [
        "firstDispatchOutcome",
        "providerRequestCount",
        "queueDeliveryCount",
        "secondDispatchOutcome",
      ]) || rawInput.caseName !== "duplicate-safety" ||
      rawInput.providerRequestCount !== 1 ||
      rawInput.secondDispatchOutcome !== "duplicate" ||
      rawInput.deliveryKey !== rawInput.subjectDeliveryKey
    ) {
      throw new Error("Bot reply staging duplicate observation is invalid");
    }
    const firstDispatchOutcome = requireDispatch(
      rawInput.firstDispatchOutcome,
      ["accepted", "duplicate"],
    );
    const queueDeliveryCount = positiveInteger(rawInput.queueDeliveryCount);
    if (queueDeliveryCount < 2 || queueDeliveryCount > 100) {
      throw new Error("Bot reply staging duplicate observation is invalid");
    }
    row = {
      ...baseRow(rawInput),
      firstDispatchOutcome,
      secondDispatchOutcome: "duplicate",
      queueDeliveryCount,
      providerRequestCount: 1,
    };
  } else if (rawInput.factKind === "kill-switch") {
    if (
      !hasExactKeys(rawInput, [
        "disabledPolicyVersion",
        "dispatchOutcome",
        "policyState",
        "providerRequestCount",
      ]) || rawInput.caseName !== "kill-switch" ||
      rawInput.policyState !== "disabled" ||
      rawInput.providerRequestCount !== 0 ||
      rawInput.deliveryKey !== rawInput.subjectDeliveryKey
    ) {
      throw new Error("Bot reply staging kill switch observation is invalid");
    }
    row = {
      ...baseRow(rawInput),
      dispatchOutcome: requireDispatch(rawInput.dispatchOutcome, [
        "rejected",
        "deferred",
        "duplicate",
      ]),
      disabledPolicyVersion: positiveInteger(rawInput.disabledPolicyVersion),
      policyState: "disabled",
      providerRequestCount: 0,
    };
  } else {
    throw new Error("Bot reply staging observation kind is invalid");
  }

  const eventDigest = createHash("sha256")
    .update(postgresBotReplyStagingDurableObservationWriterVersion)
    .update("\0")
    .update(JSON.stringify(row))
    .digest("hex");
  return Object.freeze({
    eventKey: `bot_reply_staging_observation_v1_${eventDigest}`,
    ...row,
  });
}

function parseRow(value: unknown): Readonly<CanonicalObservationRow> {
  const row = requireExactPostgresRow(value, rowKeys);
  const parsed = Object.freeze({
    eventKey: requirePattern(row.eventKey, eventKeyPattern),
    runKey: requirePattern(row.runKey, runKeyPattern),
    claimVersion: parsePostgresPositiveInteger(row.claimVersion),
    operationKey: requirePattern(row.operationKey, operationKeyPattern),
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern),
    subjectDeliveryKey: requirePattern(row.subjectDeliveryKey, deliveryKeyPattern),
    caseName: nullableString(row.caseName),
    factKind: nullableString(row.factKind),
    scenario: nullableString(row.scenario),
    providerErrorCode: parseOptionalInteger(row.providerErrorCode),
    dispatchOutcome: parseDispatchOutcome(row.dispatchOutcome),
    firstDispatchOutcome: parseDispatchOutcome(row.firstDispatchOutcome),
    secondDispatchOutcome: parseDispatchOutcome(row.secondDispatchOutcome),
    retryAfterSeconds: parseOptionalInteger(row.retryAfterSeconds),
    cooldownScope: nullableString(row.cooldownScope),
    backoffPolicy: nullableString(row.backoffPolicy),
    queueDeliveryCount: parseOptionalInteger(row.queueDeliveryCount),
    providerRequestCount: parseRequestCount(row.providerRequestCount),
    disabledPolicyVersion: parseOptionalInteger(row.disabledPolicyVersion),
    policyState: nullableString(row.policyState),
    recipientFingerprint: requirePattern(
      row.recipientFingerprint,
      fingerprintPattern,
    ),
    observedAt: parsePostgresTimestamp(row.observedAt),
  });
  return parsed as Readonly<CanonicalObservationRow>;
}

function parameters(
  row: Readonly<CanonicalObservationRow>,
): readonly PostgresParameter[] {
  return [
    row.eventKey,
    row.runKey,
    row.claimVersion,
    row.operationKey,
    row.deliveryKey,
    row.subjectDeliveryKey,
    row.caseName,
    row.factKind,
    row.scenario,
    row.providerErrorCode,
    row.dispatchOutcome,
    row.firstDispatchOutcome,
    row.secondDispatchOutcome,
    row.retryAfterSeconds,
    row.cooldownScope,
    row.backoffPolicy,
    row.queueDeliveryCount,
    row.providerRequestCount,
    row.disabledPolicyVersion,
    row.policyState,
    row.recipientFingerprint,
    row.observedAt,
  ];
}

async function loadExisting(
  transaction: PostgresQueryExecutor,
  row: Readonly<CanonicalObservationRow>,
): Promise<Readonly<CanonicalObservationRow>> {
  const rows = requirePostgresRows(
    await transaction.query<unknown>(
      postgresBotReplyStagingDurableObservationWriterSql.readForUpdate,
      [row.runKey, row.operationKey],
    ),
    2,
  );
  if (rows.length !== 1) {
    throw new Error("PostgreSQL staging observation was not persisted");
  }
  const stored = parseRow(rows[0]);
  if (JSON.stringify(stored) !== JSON.stringify(row)) {
    throw new Error("PostgreSQL returned conflicting staging observation");
  }
  return stored;
}

export function createPostgresBotReplyStagingDurableObservationWriter(
  transactions: PostgresTransactionManager,
): Readonly<BotReplyStagingDurableObservationWriter> {
  if (typeof transactions?.transaction !== "function") {
    throw new Error(
      "PostgreSQL Bot reply staging observation writer dependency is invalid",
    );
  }
  return Object.freeze({
    isConfigured() {
      return true;
    },
    async record(
      rawInput: Readonly<BotReplyStagingDurableObservationRecord>,
    ) {
      const row = normalize(rawInput);
      return transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const inserted = requirePostgresRows(
            await transaction.query<unknown>(
              postgresBotReplyStagingDurableObservationWriterSql.insert,
              parameters(row),
            ),
            1,
          );
          const stored = await loadExisting(transaction, row);
          return Object.freeze({
            outcome: inserted.length === 1 ? "created" as const : "unchanged" as const,
            eventKey: stored.eventKey,
          });
        },
      );
    },
  });
}
