import type {
  BotReplyStagingServiceWindowSource,
} from "../operations/botReplyStagingProviderCaseInventory.ts";
import {
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresQueryExecutor,
} from "./postgresTransaction.ts";

const messageKeyPattern = /^message_v1_[a-f0-9]{64}$/;
const serviceWindowDurationMilliseconds = 24 * 60 * 60 * 1_000;
const rowKeys = Object.freeze([
  "serviceWindowOpenedAt",
  "serviceWindowExpiresAt",
] as const);

export const postgresBotReplyStagingServiceWindowSql = Object.freeze({
  read: `
    SELECT
      messages.occurred_at AS "serviceWindowOpenedAt",
      messages.occurred_at + INTERVAL '24 hours'
        AS "serviceWindowExpiresAt"
    FROM messages
    WHERE messages.tenant_id = $1
      AND messages.message_key = $2
      AND messages.direction = 'inbound'
    LIMIT 1
  `,
});

function requirePositiveInteger(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new Error("Bot reply staging tenant is invalid");
  }
  return Number(value);
}

function requireMessageKey(value: unknown): string {
  if (typeof value !== "string" || !messageKeyPattern.test(value)) {
    throw new Error("Bot reply staging inbound message is invalid");
  }
  return value;
}

export function createPostgresBotReplyStagingServiceWindowSource(
  queries: PostgresQueryExecutor,
): Readonly<BotReplyStagingServiceWindowSource> {
  if (typeof queries?.query !== "function") {
    throw new Error(
      "PostgreSQL bot reply staging service window source is invalid",
    );
  }

  return Object.freeze({
    isConfigured() {
      return true;
    },

    async read(rawInput: Readonly<{
      targetTenantId: number;
      inboundMessageKey: string;
    }>) {
      const tenantId = requirePositiveInteger(rawInput?.targetTenantId);
      const inboundMessageKey = requireMessageKey(
        rawInput?.inboundMessageKey,
      );
      const rows = requirePostgresRows(
        await queries.query<unknown>(
          postgresBotReplyStagingServiceWindowSql.read,
          [tenantId, inboundMessageKey],
        ),
        1,
      );
      if (rows.length !== 1) {
        throw new Error(
          "PostgreSQL bot reply staging service window is unavailable",
        );
      }
      const row = requireExactPostgresRow(rows[0], rowKeys);
      const serviceWindowOpenedAt = parsePostgresTimestamp(
        row.serviceWindowOpenedAt,
      );
      const serviceWindowExpiresAt = parsePostgresTimestamp(
        row.serviceWindowExpiresAt,
      );
      if (
        Date.parse(serviceWindowExpiresAt) -
          Date.parse(serviceWindowOpenedAt) !==
            serviceWindowDurationMilliseconds
      ) {
        throw new Error(
          "PostgreSQL bot reply staging service window is invalid",
        );
      }
      return Object.freeze({
        source: "durable-postgres" as const,
        serviceWindowOpenedAt,
        serviceWindowExpiresAt,
      });
    },
  });
}
