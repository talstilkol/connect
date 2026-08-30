import type {
  BotReplyStagingProviderCase,
} from "../operations/botReplyStagingProviderDriver.ts";
import type {
  BotReplyStagingScenarioContext,
} from "../operations/botReplyStagingScenarioExecutor.ts";
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

export const postgresBotReplyStagingWebhookObservationProducerVersion =
  "connect-postgres-bot-reply-staging-webhook-observation-producer-v1" as const;

type WebhookScenario = "status-sent" | "status-delivered" | "status-read";
type ProviderStatus = "sent" | "delivered" | "read";

export interface BotReplyStagingWebhookObservationProducerClock {
  now(): Date;
}

export interface BotReplyStagingWebhookObservationProducer {
  isConfigured(): boolean;
  recordStatus(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<BotReplyStagingDurableObservationWriteResult>;
}

export interface PostgresBotReplyStagingWebhookObservationProducerDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly writer: BotReplyStagingDurableObservationWriter;
  readonly clock: BotReplyStagingWebhookObservationProducerClock;
}

const rowKeys = Object.freeze([
  "acceptedAt",
  "deliveryKey",
  "lastStatusEventAt",
  "lastStatusEventKey",
  "providerStatus",
  "tenantId",
  "updatedAt",
] as const);

const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;
const statusEventKeyPattern = /^[a-f0-9]{64}$/;

export const postgresBotReplyStagingWebhookObservationProducerSql =
  Object.freeze({
    readStatus: `
      SELECT
        link.delivery_key AS "deliveryKey",
        link.tenant_id AS "tenantId",
        link.provider_status AS "providerStatus",
        link.last_status_event_key AS "lastStatusEventKey",
        link.last_status_event_at AS "lastStatusEventAt",
        link.accepted_at AS "acceptedAt",
        link.updated_at AS "updatedAt"
      FROM bot_reply_delivery_provider_links AS link
      INNER JOIN bot_reply_deliveries AS delivery
        ON delivery.delivery_key = link.delivery_key
       AND delivery.tenant_id = link.tenant_id
       AND delivery.provider_message_id = link.provider_message_id
       AND delivery.accepted_at = link.accepted_at
      INNER JOIN bot_reply_provider_request_claims AS request
        ON request.delivery_key = link.delivery_key
       AND request.tenant_id = link.tenant_id
       AND request.claim_version = delivery.claim_version
       AND request.reservation_key = link.reservation_key
       AND request.requested_at <= link.accepted_at
      WHERE link.delivery_key = $1
        AND link.tenant_id = $2
      LIMIT 2
    `,
  });

interface StatusRow {
  readonly deliveryKey: string;
  readonly tenantId: number;
  readonly providerStatus: ProviderStatus;
  readonly lastStatusEventKey: string;
  readonly lastStatusEventAt: string;
  readonly acceptedAt: string;
  readonly updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requirePattern(value: unknown, pattern: RegExp): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error("PostgreSQL returned invalid Bot reply webhook identity");
  }
  return value;
}

function providerStatus(value: unknown): ProviderStatus {
  if (value !== "sent" && value !== "delivered" && value !== "read") {
    throw new Error("PostgreSQL returned invalid Bot reply webhook status");
  }
  return value;
}

function parseRow(value: unknown): Readonly<StatusRow> {
  const row = requireExactPostgresRow(value, rowKeys);
  const parsed = Object.freeze({
    deliveryKey: requirePattern(row.deliveryKey, deliveryKeyPattern),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    providerStatus: providerStatus(row.providerStatus),
    lastStatusEventKey: requirePattern(
      row.lastStatusEventKey,
      statusEventKeyPattern,
    ),
    lastStatusEventAt: parsePostgresTimestamp(row.lastStatusEventAt),
    acceptedAt: parsePostgresTimestamp(row.acceptedAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
  });
  if (Date.parse(parsed.acceptedAt) > Date.parse(parsed.updatedAt)) {
    throw new Error("PostgreSQL returned inconsistent Bot reply webhook time");
  }
  return parsed;
}

function expectedStatus(scenario: unknown): ProviderStatus {
  if (scenario === "status-sent") return "sent";
  if (scenario === "status-delivered") return "delivered";
  if (scenario === "status-read") return "read";
  throw new Error("Bot reply staging scenario is not webhook-backed");
}

function nowMilliseconds(
  clock: Readonly<BotReplyStagingWebhookObservationProducerClock>,
): number {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    throw new Error("Bot reply staging webhook observation clock is unavailable");
  }
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error("Bot reply staging webhook observation clock is invalid");
  }
  return value.getTime();
}

function requireBinding(
  context: Readonly<BotReplyStagingScenarioContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  row: Readonly<StatusRow>,
  clock: Readonly<BotReplyStagingWebhookObservationProducerClock>,
): WebhookScenario {
  const status = expectedStatus(context?.scenario);
  if (
    !isRecord(context) || !isRecord(context.run) || !isRecord(context.claim) ||
    !isRecord(allocatedCase) ||
    allocatedCase.source !== "durable-postgres" ||
    allocatedCase.executionMode !== "observe-only" ||
    allocatedCase.caseName !== context.scenario ||
    allocatedCase.runKey !== context.run.runKey ||
    allocatedCase.operationKey !== context.operationKey ||
    allocatedCase.deliveryKey !== context.deliveryKey ||
    allocatedCase.subjectDeliveryKey === context.deliveryKey ||
    allocatedCase.targetTenantId !== context.run.targetTenantId ||
    allocatedCase.connectionVersion !== context.run.expectedConnectionVersion ||
    allocatedCase.policyVersion !== context.run.expectedPolicyVersion ||
    allocatedCase.recipientFingerprint !== context.run.recipientFingerprint ||
    allocatedCase.claimVersion !== context.claim.claimVersion ||
    allocatedCase.leaseExpiresAt !== context.claim.leaseExpiresAt ||
    row.deliveryKey !== allocatedCase.subjectDeliveryKey ||
    row.tenantId !== context.run.targetTenantId ||
    row.providerStatus !== status
  ) {
    throw new Error("Bot reply staging webhook observation scope is invalid");
  }
  const observedAt = Date.parse(row.updatedAt);
  if (
    observedAt < Date.parse(context.run.requestedAt) ||
    observedAt > Date.parse(context.claim.leaseExpiresAt) ||
    observedAt > nowMilliseconds(clock)
  ) {
    throw new Error("Bot reply staging webhook observation is not current");
  }
  return context.scenario as WebhookScenario;
}

function configured(
  dependencies: Readonly<
    PostgresBotReplyStagingWebhookObservationProducerDependencies
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

export function createPostgresBotReplyStagingWebhookObservationProducer(
  dependencies: Readonly<
    PostgresBotReplyStagingWebhookObservationProducerDependencies
  >,
): Readonly<BotReplyStagingWebhookObservationProducer> {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "clock,queries,writer" ||
    typeof dependencies.queries?.query !== "function" ||
    typeof dependencies.writer?.isConfigured !== "function" ||
    typeof dependencies.writer?.record !== "function" ||
    typeof dependencies.clock?.now !== "function"
  ) {
    throw new Error("Bot reply staging webhook producer dependency is invalid");
  }

  return Object.freeze({
    isConfigured() {
      return configured(dependencies);
    },
    async recordStatus(
      context: Readonly<BotReplyStagingScenarioContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
    ): Promise<BotReplyStagingDurableObservationWriteResult> {
      if (!configured(dependencies)) {
        throw new Error("Bot reply staging webhook producer is unavailable");
      }
      const rows = requirePostgresRows(
        await dependencies.queries.query<unknown>(
          postgresBotReplyStagingWebhookObservationProducerSql.readStatus,
          [allocatedCase?.subjectDeliveryKey, context?.run?.targetTenantId],
        ),
        2,
      );
      if (rows.length !== 1) {
        throw new Error("Bot reply staging webhook observation is unavailable");
      }
      const row = parseRow(rows[0]);
      const scenario = requireBinding(
        context,
        allocatedCase,
        row,
        dependencies.clock,
      );
      return dependencies.writer.record({
        runKey: context.run.runKey,
        claimVersion: context.claim.claimVersion,
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        subjectDeliveryKey: allocatedCase.subjectDeliveryKey,
        recipientFingerprint: context.run.recipientFingerprint,
        observedAt: row.updatedAt,
        factKind: "scenario",
        caseName: scenario,
        scenario,
        providerErrorCode: null,
        dispatchOutcome: null,
      });
    },
  });
}
