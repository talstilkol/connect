import {
  createHash,
} from "node:crypto";

import type {
  BotReplyStagingProviderCase,
} from "../operations/botReplyStagingProviderDriver.ts";
import type {
  BotReplyStagingDurableObservationReader,
  BotReplyStagingDuplicateSafetyFact,
  BotReplyStagingKillSwitchFact,
  BotReplyStagingPairLimitFact,
  BotReplyStagingProviderRetryFact,
  BotReplyStagingScenarioFact,
} from "../operations/botReplyStagingObservationSource.ts";
import type {
  BotReplyStagingScenarioContext,
  BotReplyStagingStepContext,
} from "../operations/botReplyStagingScenarioExecutor.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

export const postgresBotReplyStagingDurableObservationReaderVersion =
  "connect-postgres-bot-reply-staging-observation-reader-v1" as const;

const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const operationKeyPattern = /^bot_reply_staging_step_v1_[a-f0-9]{64}$/;
const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const eventKeyPattern = /^bot_reply_staging_observation_v1_[a-f0-9]{64}$/;

type DispatchOutcome =
  | "accepted"
  | "rejected"
  | "deferred"
  | "duplicate";

type FactKind =
  | "scenario"
  | "provider-retry"
  | "pair-limit"
  | "duplicate-safety"
  | "kill-switch";

const rowKeys = Object.freeze([
  "artifactDigest",
  "backoffPolicy",
  "caseName",
  "claimVersion",
  "commitSha",
  "connectionVersion",
  "cooldownScope",
  "deliveryKey",
  "disabledPolicyVersion",
  "dispatchOutcome",
  "eventKey",
  "factKind",
  "firstDispatchOutcome",
  "graphApiVersion",
  "observedAt",
  "operationKey",
  "policyState",
  "policyVersion",
  "providerErrorCode",
  "providerRequestCount",
  "queueDeliveryCount",
  "recipientFingerprint",
  "releaseId",
  "retryAfterSeconds",
  "runKey",
  "scenario",
  "secondDispatchOutcome",
  "subjectDeliveryKey",
  "targetTenantId",
] as const);

const columns = `
  event.event_key AS "eventKey",
  event.run_key AS "runKey",
  event.claim_version AS "claimVersion",
  event.operation_key AS "operationKey",
  event.delivery_key AS "deliveryKey",
  event.subject_delivery_key AS "subjectDeliveryKey",
  event.case_name AS "caseName",
  event.fact_kind AS "factKind",
  event.scenario,
  event.provider_error_code AS "providerErrorCode",
  event.dispatch_outcome AS "dispatchOutcome",
  event.first_dispatch_outcome AS "firstDispatchOutcome",
  event.second_dispatch_outcome AS "secondDispatchOutcome",
  event.retry_after_seconds AS "retryAfterSeconds",
  event.cooldown_scope AS "cooldownScope",
  event.backoff_policy AS "backoffPolicy",
  event.queue_delivery_count AS "queueDeliveryCount",
  event.provider_request_count AS "providerRequestCount",
  event.disabled_policy_version AS "disabledPolicyVersion",
  event.policy_state AS "policyState",
  event.recipient_fingerprint AS "recipientFingerprint",
  event.observed_at AS "observedAt",
  run.tenant_id AS "targetTenantId",
  run.connection_version AS "connectionVersion",
  run.policy_version AS "policyVersion",
  run.release_id AS "releaseId",
  run.commit_sha AS "commitSha",
  run.artifact_digest AS "artifactDigest",
  run.graph_api_version AS "graphApiVersion"
`;

export const postgresBotReplyStagingDurableObservationSql = Object.freeze({
  read: `
    SELECT ${columns}
    FROM bot_reply_staging_observation_events AS event
    INNER JOIN bot_reply_staging_runs AS run
      ON run.run_key = event.run_key
    WHERE event.run_key = $1
      AND event.operation_key = $2
      AND event.fact_kind = $3
    ORDER BY event.event_key
    LIMIT 2
  `,
});

interface ObservationRow {
  readonly eventKey: string;
  readonly runKey: string;
  readonly claimVersion: number;
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly subjectDeliveryKey: string;
  readonly caseName: BotReplyStagingProviderCase["caseName"];
  readonly factKind: FactKind;
  readonly scenario: BotReplyStagingScenarioContext["scenario"] | null;
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
  readonly recipientFingerprint: string;
  readonly observedAt: string;
  readonly targetTenantId: number;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
}

function requirePattern(value: unknown, pattern: RegExp): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error("PostgreSQL returned invalid staging observation identity");
  }
  return value;
}

function optionalInteger(value: unknown): number | null {
  return value === null ? null : parsePostgresPositiveInteger(value);
}

function optionalProviderError(value: unknown): number | null {
  if (value === null) return null;
  const normalized = typeof value === "string" && /^[1-9][0-9]*$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(normalized) || Number(normalized) < 1) {
    throw new Error("PostgreSQL returned invalid staging provider error");
  }
  return Number(normalized);
}

function dispatchOutcome(value: unknown): DispatchOutcome | null {
  if (value === null) return null;
  if (
    value !== "accepted" && value !== "rejected" && value !== "deferred" &&
    value !== "duplicate"
  ) {
    throw new Error("PostgreSQL returned invalid staging dispatch outcome");
  }
  return value;
}

function caseName(value: unknown): BotReplyStagingProviderCase["caseName"] {
  if (
    value !== "text-send" && value !== "button-send" &&
    value !== "button-reply" && value !== "status-sent" &&
    value !== "status-delivered" && value !== "status-read" &&
    value !== "customer-window-expired" && value !== "provider-retry" &&
    value !== "pair-limit" && value !== "duplicate-safety" &&
    value !== "kill-switch"
  ) {
    throw new Error("PostgreSQL returned invalid staging case");
  }
  return value;
}

function factKind(value: unknown): FactKind {
  if (
    value !== "scenario" && value !== "provider-retry" &&
    value !== "pair-limit" && value !== "duplicate-safety" &&
    value !== "kill-switch"
  ) {
    throw new Error("PostgreSQL returned invalid staging fact kind");
  }
  return value;
}

function scenario(
  value: unknown,
): BotReplyStagingScenarioContext["scenario"] | null {
  if (value === null) return null;
  if (
    value !== "text-send" && value !== "button-send" &&
    value !== "button-reply" && value !== "status-sent" &&
    value !== "status-delivered" && value !== "status-read" &&
    value !== "customer-window-expired"
  ) {
    throw new Error("PostgreSQL returned invalid staging scenario");
  }
  return value;
}

function exactNullable<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  if (value === null) return null;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error("PostgreSQL returned invalid staging observation value");
  }
  return value as T;
}

function parseRow(value: unknown): Readonly<ObservationRow> {
  const row = requireExactPostgresRow(value, rowKeys);
  return Object.freeze({
    eventKey: requirePattern(row.eventKey, eventKeyPattern),
    runKey: requirePattern(row.runKey, runKeyPattern),
    claimVersion: parsePostgresPositiveInteger(row.claimVersion),
    operationKey: requirePattern(row.operationKey, operationKeyPattern),
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern),
    subjectDeliveryKey: requirePattern(
      row.subjectDeliveryKey,
      deliveryKeyPattern,
    ),
    caseName: caseName(row.caseName),
    factKind: factKind(row.factKind),
    scenario: scenario(row.scenario),
    providerErrorCode: optionalProviderError(row.providerErrorCode),
    dispatchOutcome: dispatchOutcome(row.dispatchOutcome),
    firstDispatchOutcome: dispatchOutcome(row.firstDispatchOutcome),
    secondDispatchOutcome: dispatchOutcome(row.secondDispatchOutcome),
    retryAfterSeconds: optionalInteger(row.retryAfterSeconds),
    cooldownScope: exactNullable(row.cooldownScope, ["sender", "pair"]),
    backoffPolicy: exactNullable(row.backoffPolicy, ["meta-4-power-x"]),
    queueDeliveryCount: optionalInteger(row.queueDeliveryCount),
    providerRequestCount: row.providerRequestCount === null
      ? null
      : (() => {
          const normalized = typeof row.providerRequestCount === "string" &&
              /^(?:0|[1-9][0-9]*)$/.test(row.providerRequestCount)
            ? Number(row.providerRequestCount)
            : row.providerRequestCount;
          if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
            throw new Error("PostgreSQL returned invalid provider request count");
          }
          return Number(normalized);
        })(),
    disabledPolicyVersion: optionalInteger(row.disabledPolicyVersion),
    policyState: exactNullable(row.policyState, ["disabled"]),
    recipientFingerprint: requirePattern(
      row.recipientFingerprint,
      fingerprintPattern,
    ),
    observedAt: parsePostgresTimestamp(row.observedAt),
    targetTenantId: parsePostgresPositiveInteger(row.targetTenantId),
    connectionVersion: parsePostgresPositiveInteger(row.connectionVersion),
    policyVersion: parsePostgresPositiveInteger(row.policyVersion),
    releaseId: requirePattern(row.releaseId, releaseIdPattern),
    commitSha: requirePattern(row.commitSha, commitShaPattern),
    artifactDigest: requirePattern(row.artifactDigest, fingerprintPattern),
    graphApiVersion: requirePattern(row.graphApiVersion, graphApiVersionPattern),
  });
}

function recordDigest(row: Readonly<ObservationRow>): string {
  return `sha256:${createHash("sha256")
    .update(postgresBotReplyStagingDurableObservationReaderVersion)
    .update("\0")
    .update(JSON.stringify(row))
    .digest("hex")}`;
}

function requireBinding(
  row: Readonly<ObservationRow>,
  context: Readonly<BotReplyStagingStepContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  expectedKind: FactKind,
): void {
  if (
    row.factKind !== expectedKind || row.runKey !== context.run.runKey ||
    row.claimVersion !== context.claim.claimVersion ||
    row.operationKey !== context.operationKey ||
    row.deliveryKey !== context.deliveryKey ||
    row.subjectDeliveryKey !== allocatedCase.subjectDeliveryKey ||
    row.caseName !== allocatedCase.caseName ||
    row.recipientFingerprint !== allocatedCase.recipientFingerprint ||
    row.targetTenantId !== context.run.targetTenantId ||
    row.connectionVersion !== context.run.expectedConnectionVersion ||
    row.policyVersion !== context.run.expectedPolicyVersion ||
    row.releaseId !== context.run.releaseId ||
    row.commitSha !== context.run.commitSha ||
    row.artifactDigest !== context.run.artifactDigest ||
    row.graphApiVersion !== context.run.graphApiVersion ||
    allocatedCase.runKey !== context.run.runKey ||
    allocatedCase.operationKey !== context.operationKey ||
    allocatedCase.claimVersion !== context.claim.claimVersion ||
    allocatedCase.leaseExpiresAt !== context.claim.leaseExpiresAt
  ) {
    throw new Error("PostgreSQL returned cross-scope staging observation");
  }
}

function baseFact(
  row: Readonly<ObservationRow>,
) {
  return {
    schemaVersion: 1 as const,
    source: "durable-postgres" as const,
    runKey: row.runKey,
    operationKey: row.operationKey,
    targetTenantId: row.targetTenantId,
    connectionVersion: row.connectionVersion,
    policyVersion: row.policyVersion,
    releaseId: row.releaseId,
    commitSha: row.commitSha,
    artifactDigest: row.artifactDigest,
    graphApiVersion: row.graphApiVersion,
    observedAt: row.observedAt,
    recordDigest: recordDigest(row),
    caseName: row.caseName,
    deliveryKey: row.deliveryKey,
    subjectDeliveryKey: row.subjectDeliveryKey,
    recipientFingerprint: row.recipientFingerprint,
  };
}

function hasValidScenarioShape(row: Readonly<ObservationRow>): boolean {
  if (row.scenario === "text-send" || row.scenario === "button-send") {
    return row.providerErrorCode === null &&
      (row.dispatchOutcome === "accepted" ||
        row.dispatchOutcome === "duplicate") &&
      row.deliveryKey === row.subjectDeliveryKey;
  }
  if (
    row.scenario === "button-reply" || row.scenario === "status-sent" ||
    row.scenario === "status-delivered" || row.scenario === "status-read"
  ) {
    return row.providerErrorCode === null && row.dispatchOutcome === null &&
      row.deliveryKey !== row.subjectDeliveryKey;
  }
  return row.scenario === "customer-window-expired" &&
    row.providerErrorCode === 131047 &&
    (row.dispatchOutcome === "rejected" ||
      row.dispatchOutcome === "duplicate") &&
    row.deliveryKey === row.subjectDeliveryKey;
}

async function readOne(
  query: PostgresQueryExecutor,
  context: Readonly<BotReplyStagingStepContext>,
  kind: FactKind,
): Promise<Readonly<ObservationRow>> {
  const rows = requirePostgresRows(
    await query.query<unknown>(
      postgresBotReplyStagingDurableObservationSql.read,
      [context.run.runKey, context.operationKey, kind],
    ),
    2,
  );
  if (rows.length !== 1) {
    throw new Error("PostgreSQL staging observation is unavailable");
  }
  return parseRow(rows[0]);
}

export function createPostgresBotReplyStagingDurableObservationReader(
  dependencies: Readonly<{ query: PostgresQueryExecutor }>,
): Readonly<BotReplyStagingDurableObservationReader> {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).join(",") !== "query" ||
    typeof dependencies.query?.query !== "function"
  ) {
    throw new Error(
      "PostgreSQL Bot reply staging observation dependencies are invalid",
    );
  }

  return Object.freeze({
    isConfigured() {
      return true;
    },

    async readScenario(
      context: Readonly<BotReplyStagingScenarioContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
    ): Promise<BotReplyStagingScenarioFact> {
      const row = await readOne(dependencies.query, context, "scenario");
      requireBinding(row, context, allocatedCase, "scenario");
      if (
        row.scenario !== context.scenario ||
        row.providerErrorCode !== context.expectedProviderErrorCode ||
        !hasValidScenarioShape(row) ||
        row.firstDispatchOutcome !== null || row.secondDispatchOutcome !== null ||
        row.retryAfterSeconds !== null || row.cooldownScope !== null ||
        row.backoffPolicy !== null || row.queueDeliveryCount !== null ||
        row.providerRequestCount !== null || row.disabledPolicyVersion !== null ||
        row.policyState !== null
      ) {
        throw new Error("PostgreSQL returned invalid scenario observation");
      }
      return Object.freeze({
        ...baseFact(row),
        scenario: row.scenario,
        providerErrorCode: row.providerErrorCode,
        dispatchOutcome: row.dispatchOutcome,
      }) as BotReplyStagingScenarioFact;
    },

    async readProviderRetry(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
    ): Promise<BotReplyStagingProviderRetryFact> {
      const row = await readOne(dependencies.query, context, "provider-retry");
      requireBinding(row, context, allocatedCase, "provider-retry");
      if (
        row.providerErrorCode !== 130429 || row.retryAfterSeconds === null ||
        row.retryAfterSeconds > 86_400 || row.scenario !== null ||
        row.cooldownScope !== "sender" ||
        row.deliveryKey !== row.subjectDeliveryKey ||
        row.firstDispatchOutcome !== null || row.secondDispatchOutcome !== null ||
        row.backoffPolicy !== null || row.queueDeliveryCount !== null ||
        row.providerRequestCount !== null || row.disabledPolicyVersion !== null ||
        row.policyState !== null ||
        (row.dispatchOutcome !== "deferred" && row.dispatchOutcome !== "duplicate")
      ) {
        throw new Error("PostgreSQL returned invalid provider retry observation");
      }
      return Object.freeze({
        ...baseFact(row),
        providerErrorCode: 130429 as const,
        retryAfterSeconds: row.retryAfterSeconds,
        cooldownScope: "sender" as const,
        dispatchOutcome: row.dispatchOutcome,
      });
    },

    async readPairLimit(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
    ): Promise<BotReplyStagingPairLimitFact> {
      const row = await readOne(dependencies.query, context, "pair-limit");
      requireBinding(row, context, allocatedCase, "pair-limit");
      if (
        row.providerErrorCode !== 131056 || row.cooldownScope !== "pair" ||
        row.backoffPolicy !== "meta-4-power-x" ||
        row.scenario !== null || row.deliveryKey !== row.subjectDeliveryKey ||
        row.firstDispatchOutcome !== null || row.secondDispatchOutcome !== null ||
        row.retryAfterSeconds !== null || row.queueDeliveryCount !== null ||
        row.providerRequestCount !== null || row.disabledPolicyVersion !== null ||
        row.policyState !== null ||
        (row.dispatchOutcome !== "deferred" && row.dispatchOutcome !== "duplicate")
      ) {
        throw new Error("PostgreSQL returned invalid pair limit observation");
      }
      return Object.freeze({
        ...baseFact(row),
        providerErrorCode: 131056 as const,
        cooldownScope: "pair" as const,
        backoffPolicy: "meta-4-power-x" as const,
        dispatchOutcome: row.dispatchOutcome,
      });
    },

    async readDuplicateSafety(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
    ): Promise<BotReplyStagingDuplicateSafetyFact> {
      const row = await readOne(dependencies.query, context, "duplicate-safety");
      requireBinding(row, context, allocatedCase, "duplicate-safety");
      if (
        row.queueDeliveryCount === null || row.providerRequestCount !== 1 ||
        row.queueDeliveryCount < 2 || row.queueDeliveryCount > 100 ||
        row.scenario !== null || row.providerErrorCode !== null ||
        row.dispatchOutcome !== null ||
        row.deliveryKey !== row.subjectDeliveryKey ||
        row.retryAfterSeconds !== null || row.cooldownScope !== null ||
        row.backoffPolicy !== null || row.disabledPolicyVersion !== null ||
        row.policyState !== null ||
        (row.firstDispatchOutcome !== "accepted" &&
          row.firstDispatchOutcome !== "duplicate") ||
        row.secondDispatchOutcome !== "duplicate"
      ) {
        throw new Error("PostgreSQL returned invalid duplicate observation");
      }
      return Object.freeze({
        ...baseFact(row),
        queueDeliveryCount: row.queueDeliveryCount,
        providerRequestCount: 1 as const,
        dispatchOutcomes: Object.freeze([
          row.firstDispatchOutcome,
          "duplicate" as const,
        ] as const),
      });
    },

    async readKillSwitch(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
    ): Promise<BotReplyStagingKillSwitchFact> {
      const row = await readOne(dependencies.query, context, "kill-switch");
      requireBinding(row, context, allocatedCase, "kill-switch");
      const disabledPolicyVersion = row.disabledPolicyVersion;
      if (
        disabledPolicyVersion !== context.run.expectedPolicyVersion + 1 ||
        row.policyState !== "disabled" || row.providerRequestCount !== 0 ||
        row.scenario !== null || row.providerErrorCode !== null ||
        row.deliveryKey !== row.subjectDeliveryKey ||
        row.firstDispatchOutcome !== null || row.secondDispatchOutcome !== null ||
        row.retryAfterSeconds !== null || row.cooldownScope !== null ||
        row.backoffPolicy !== null || row.queueDeliveryCount !== null ||
        (row.dispatchOutcome !== "rejected" &&
          row.dispatchOutcome !== "deferred" &&
          row.dispatchOutcome !== "duplicate")
      ) {
        throw new Error("PostgreSQL returned invalid kill switch observation");
      }
      return Object.freeze({
        ...baseFact(row),
        disabledPolicyVersion,
        policyState: "disabled" as const,
        providerRequestCount: 0 as const,
        dispatchOutcome: row.dispatchOutcome,
      });
    },
  });
}
