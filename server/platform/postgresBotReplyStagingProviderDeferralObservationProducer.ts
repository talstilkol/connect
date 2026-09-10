import {
  createHash,
} from "node:crypto";

import type {
  DispatchBotReplyDeliveryResult,
} from "../bot/botReplyDeliveryWorker.ts";
import type {
  BotReplyStagingProviderCase,
} from "../operations/botReplyStagingProviderDriver.ts";
import type {
  BotReplyStagingStepContext,
} from "../operations/botReplyStagingScenarioExecutor.ts";
import {
  postgresBotReplyProviderDeferralVersion,
} from "./postgresBotReplyDeliveryRepository.ts";
import type {
  BotReplyStagingDurableObservationWriteResult,
  BotReplyStagingDurableObservationWriter,
} from "./postgresBotReplyStagingDurableObservationWriter.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

export const postgresBotReplyStagingProviderDeferralObservationProducerVersion =
  "connect-postgres-bot-reply-staging-provider-deferral-observation-producer-v1" as const;

export interface BotReplyStagingProviderDeferralObservationProducerClock {
  now(): Date;
}

export interface BotReplyStagingProviderDeferralObservationProducer {
  isConfigured(): boolean;
  recordDeferral(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<BotReplyStagingDurableObservationWriteResult>;
}

export interface PostgresBotReplyStagingProviderDeferralObservationProducerDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly writer: BotReplyStagingDurableObservationWriter;
  readonly clock: BotReplyStagingProviderDeferralObservationProducerClock;
}

const rowKeys = Object.freeze([
  "attemptedAt",
  "claimVersion",
  "cooldownScope",
  "deferredAt",
  "deliveryKey",
  "eventKey",
  "providerErrorCode",
  "reasonCode",
  "reservationKey",
  "retryAfterSeconds",
  "retryAt",
  "tenantId",
] as const);

const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;
const eventKeyPattern = /^bot_reply_provider_deferral_v1_[a-f0-9]{64}$/;
const reservationKeyPattern = /^whatsapp_rate_reservation_v1_[a-f0-9]{64}$/;

export const postgresBotReplyStagingProviderDeferralObservationProducerSql =
  Object.freeze({
    readCurrentDeferral: `
      SELECT
        event.event_key AS "eventKey",
        event.delivery_key AS "deliveryKey",
        event.tenant_id AS "tenantId",
        event.claim_version AS "claimVersion",
        event.reservation_key AS "reservationKey",
        event.provider_error_code AS "providerErrorCode",
        event.cooldown_scope AS "cooldownScope",
        event.retry_after_seconds AS "retryAfterSeconds",
        event.reason_code AS "reasonCode",
        event.attempted_at AS "attemptedAt",
        event.deferred_at AS "deferredAt",
        event.retry_at AS "retryAt"
      FROM bot_reply_provider_deferral_events AS event
      INNER JOIN bot_reply_deliveries AS delivery
        ON delivery.delivery_key = event.delivery_key
       AND delivery.tenant_id = event.tenant_id
       AND delivery.claim_version = event.claim_version
       AND delivery.status = 'pending'
       AND delivery.attempt_count = 0
       AND delivery.next_attempt_at = event.retry_at
       AND delivery.deferred_at = event.deferred_at
       AND delivery.last_deferral_reason_code = event.reason_code
      INNER JOIN bot_reply_provider_request_claims AS request
        ON request.delivery_key = event.delivery_key
       AND request.tenant_id = event.tenant_id
       AND request.claim_version = event.claim_version
       AND request.reservation_key = event.reservation_key
       AND request.requested_at <= event.attempted_at
      WHERE event.delivery_key = $1
        AND event.tenant_id = $2
      LIMIT 2
    `,
  });

interface ProviderDeferralRow {
  readonly eventKey: string;
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly claimVersion: number;
  readonly reservationKey: string;
  readonly providerErrorCode: 130429 | 131056;
  readonly cooldownScope: "sender" | "pair";
  readonly retryAfterSeconds: number;
  readonly reasonCode:
    | "META_PHONE_THROUGHPUT_LIMITED"
    | "META_PAIR_RATE_LIMITED";
  readonly attemptedAt: string;
  readonly deferredAt: string;
  readonly retryAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requirePattern(value: unknown, pattern: RegExp): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error("PostgreSQL returned invalid provider deferral identity");
  }
  return value;
}

function parseRow(value: unknown): Readonly<ProviderDeferralRow> {
  const row = requireExactPostgresRow(value, rowKeys);
  const providerErrorCode = parsePostgresPositiveInteger(row.providerErrorCode);
  const cooldownScope = row.cooldownScope;
  const reasonCode = row.reasonCode;
  const senderIsExact = providerErrorCode === 130429 &&
    cooldownScope === "sender" &&
    reasonCode === "META_PHONE_THROUGHPUT_LIMITED";
  const pairIsExact = providerErrorCode === 131056 &&
    cooldownScope === "pair" &&
    reasonCode === "META_PAIR_RATE_LIMITED";

  if (!senderIsExact && !pairIsExact) {
    throw new Error("PostgreSQL returned invalid provider deferral mapping");
  }

  const parsed = Object.freeze({
    eventKey: requirePattern(row.eventKey, eventKeyPattern),
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    claimVersion: parsePostgresPositiveInteger(row.claimVersion),
    reservationKey: requirePattern(row.reservationKey, reservationKeyPattern),
    providerErrorCode,
    cooldownScope,
    retryAfterSeconds: parsePostgresPositiveInteger(row.retryAfterSeconds),
    reasonCode,
    attemptedAt: parsePostgresTimestamp(row.attemptedAt),
    deferredAt: parsePostgresTimestamp(row.deferredAt),
    retryAt: parsePostgresTimestamp(row.retryAt),
  }) as Readonly<ProviderDeferralRow>;

  const attemptedAt = Date.parse(parsed.attemptedAt);
  const deferredAt = Date.parse(parsed.deferredAt);
  const retryAt = Date.parse(parsed.retryAt);
  if (
    parsed.retryAfterSeconds > 86_400 ||
    deferredAt < attemptedAt ||
    retryAt <= deferredAt ||
    retryAt - attemptedAt !== parsed.retryAfterSeconds * 1_000
  ) {
    throw new Error("PostgreSQL returned inconsistent provider deferral time");
  }

  const identity = Object.freeze({
    deliveryKey: parsed.deliveryKey,
    tenantId: parsed.tenantId,
    claimVersion: parsed.claimVersion,
    reservationKey: parsed.reservationKey,
    providerErrorCode: parsed.providerErrorCode,
    cooldownScope: parsed.cooldownScope,
    retryAfterSeconds: parsed.retryAfterSeconds,
    reasonCode: parsed.reasonCode,
    attemptedAt: parsed.attemptedAt,
    deferredAt: parsed.deferredAt,
    retryAt: parsed.retryAt,
  });
  const expectedEventKey = `bot_reply_provider_deferral_v1_${
    createHash("sha256")
      .update(postgresBotReplyProviderDeferralVersion)
      .update("\0")
      .update(JSON.stringify(identity))
      .digest("hex")
  }`;
  if (parsed.eventKey !== expectedEventKey) {
    throw new Error("PostgreSQL returned mismatched provider deferral digest");
  }
  return parsed;
}

function nowMilliseconds(
  clock: Readonly<BotReplyStagingProviderDeferralObservationProducerClock>,
): number {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    throw new Error("Provider deferral observation clock is unavailable");
  }
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("Provider deferral observation clock is invalid");
  }
  return value.getTime();
}

function requireBinding(
  context: Readonly<BotReplyStagingStepContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  row: Readonly<ProviderDeferralRow>,
  clock: Readonly<BotReplyStagingProviderDeferralObservationProducerClock>,
): void {
  const providerRetry = allocatedCase?.caseName === "provider-retry" &&
    row.providerErrorCode === 130429 && row.cooldownScope === "sender";
  const pairLimit = allocatedCase?.caseName === "pair-limit" &&
    row.providerErrorCode === 131056 && row.cooldownScope === "pair";
  if (
    !isRecord(context) || !isRecord(context.run) || !isRecord(context.claim) ||
    !isRecord(allocatedCase) || !isRecord(dispatch) ||
    (dispatch.outcome !== "deferred" && dispatch.outcome !== "duplicate") ||
    (!providerRetry && !pairLimit) ||
    allocatedCase.source !== "durable-postgres" ||
    allocatedCase.executionMode !== "dispatch" ||
    allocatedCase.runKey !== context.run.runKey ||
    allocatedCase.operationKey !== context.operationKey ||
    allocatedCase.deliveryKey !== context.deliveryKey ||
    allocatedCase.subjectDeliveryKey !== context.deliveryKey ||
    allocatedCase.targetTenantId !== context.run.targetTenantId ||
    allocatedCase.connectionVersion !== context.run.expectedConnectionVersion ||
    allocatedCase.policyVersion !== context.run.expectedPolicyVersion ||
    allocatedCase.recipientFingerprint !== context.run.recipientFingerprint ||
    allocatedCase.claimVersion !== context.claim.claimVersion ||
    allocatedCase.leaseExpiresAt !== context.claim.leaseExpiresAt ||
    row.deliveryKey !== context.deliveryKey ||
    row.tenantId !== context.run.targetTenantId ||
    (dispatch.outcome === "deferred" && dispatch.retryAt !== row.retryAt)
  ) {
    throw new Error("Provider deferral observation scope is invalid");
  }
  const now = nowMilliseconds(clock);
  const attemptedAt = Date.parse(row.attemptedAt);
  const deferredAt = Date.parse(row.deferredAt);
  if (
    attemptedAt < Date.parse(context.run.requestedAt) ||
    deferredAt > now ||
    deferredAt > Date.parse(context.claim.leaseExpiresAt) ||
    now >= Date.parse(row.retryAt)
  ) {
    throw new Error("Provider deferral observation is not current");
  }
}

function configured(
  dependencies: Readonly<
    PostgresBotReplyStagingProviderDeferralObservationProducerDependencies
  >,
): boolean {
  try {
    return typeof dependencies.queries.query === "function" &&
      dependencies.writer.isConfigured() === true &&
      typeof dependencies.clock.now === "function";
  } catch {
    return false;
  }
}

export function createPostgresBotReplyStagingProviderDeferralObservationProducer(
  dependencies: Readonly<
    PostgresBotReplyStagingProviderDeferralObservationProducerDependencies
  >,
): Readonly<BotReplyStagingProviderDeferralObservationProducer> {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "clock,queries,writer" ||
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.writer?.isConfigured !== "function" ||
    typeof dependencies.writer?.record !== "function" ||
    typeof dependencies.clock?.now !== "function"
  ) {
    throw new Error("Provider deferral producer dependency is invalid");
  }

  return Object.freeze({
    isConfigured() {
      return configured(dependencies);
    },
    async recordDeferral(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      dispatch: Readonly<DispatchBotReplyDeliveryResult>,
    ): Promise<BotReplyStagingDurableObservationWriteResult> {
      if (!configured(dependencies)) {
        throw new Error("Provider deferral producer is unavailable");
      }
      const rows = requirePostgresRows(
        await dependencies.queries.query<unknown>(
          postgresBotReplyStagingProviderDeferralObservationProducerSql
            .readCurrentDeferral,
          [allocatedCase?.subjectDeliveryKey, context?.run?.targetTenantId],
        ),
        2,
      );
      if (rows.length !== 1) {
        throw new Error("Provider deferral observation is unavailable");
      }
      const row = parseRow(rows[0]);
      requireBinding(context, allocatedCase, dispatch, row, dependencies.clock);
      const dispatchOutcome = dispatch.outcome;
      if (dispatchOutcome !== "deferred" && dispatchOutcome !== "duplicate") {
        throw new Error("Provider deferral dispatch outcome is invalid");
      }
      const common = {
        runKey: context.run.runKey,
        claimVersion: context.claim.claimVersion,
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        subjectDeliveryKey: allocatedCase.subjectDeliveryKey,
        recipientFingerprint: context.run.recipientFingerprint,
        observedAt: row.attemptedAt,
      } as const;
      if (row.providerErrorCode === 130429) {
        return dependencies.writer.record({
          ...common,
          factKind: "provider-retry",
          caseName: "provider-retry",
          providerErrorCode: 130429,
          dispatchOutcome,
          retryAfterSeconds: row.retryAfterSeconds,
          cooldownScope: "sender",
        });
      }
      return dependencies.writer.record({
        ...common,
        factKind: "pair-limit",
        caseName: "pair-limit",
        providerErrorCode: 131056,
        dispatchOutcome,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
      });
    },
  });
}
