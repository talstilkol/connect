import {
  MessageTemplateTransitionError,
} from "../../db/messageTemplateRepository.ts";
import {
  deriveMessageTemplateSubmissionEventKey,
} from "../templates/messageTemplateSubmissionOutbox.ts";
import {
  deriveMessageTemplateSubmissionKey,
} from "../templates/messageTemplateSubmissionKey.ts";
import {
  createMessageTemplateSubmissionQueueMessage,
  parseMessageTemplateSubmissionQueueMessage,
} from "../templates/messageTemplateSubmissionQueueMessage.ts";
import {
  createPostgresMessageTemplateRepository,
} from "./postgresMessageTemplateRepository.ts";
import {
  postgresMessageTemplateSubmissionOutboxSql,
} from "./postgresMessageTemplateSubmissionOutboxRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
  type RailwayMessageTemplateSubmissionMutationCommand,
  type RailwayMessageTemplateSubmissionMutationExecutor,
  type RailwayMessageTemplateSubmissionMutationResult,
} from "./railwayMessageTemplateSubmissionMutationExecutor.ts";

const requestDigestPattern = /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[0-9a-f]{64}$/;
const templateKeyPattern = /^template_v1_[0-9a-f]{64}$/;
const graphVersionPattern = /^v[1-9][0-9]*\.[0-9]+$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayMessageTemplateSubmissionMutationSql =
  Object.freeze({
    claimReceipt: `
      INSERT INTO railway_api_mutation_receipts (
        tenant_id,
        operation,
        idempotency_key,
        request_digest,
        actor_external_user_id,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'processing')
      ON CONFLICT (tenant_id, operation, idempotency_key)
        DO NOTHING
      RETURNING idempotency_key AS "idempotencyKey"
    `,
    lockReceipt: `
      SELECT
        request_digest AS "requestDigest",
        status,
        response_json AS "responseJson"
      FROM railway_api_mutation_receipts
      WHERE tenant_id = $1
        AND operation = $2
        AND idempotency_key = $3
      FOR UPDATE
    `,
    lockMetaConnection: `
      SELECT
        version,
        waba_id AS "wabaId",
        status
      FROM meta_connections
      WHERE tenant_id = $1
      FOR SHARE
    `,
    insertOutbox: `
      INSERT INTO message_template_submission_outbox (
        submission_key,
        tenant_id,
        template_key,
        template_version,
        meta_connection_version,
        waba_id,
        graph_api_version,
        request_operation,
        request_idempotency_key,
        status,
        state_version,
        attempt_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 1, 0)
      RETURNING submission_key AS "submissionKey"
    `,
    insertAudit: `
      INSERT INTO audit_logs (
        tenant_id,
        actor_external_user_id,
        action,
        target_type,
        target_id,
        idempotency_key,
        metadata_json
      )
      VALUES ($1, $2, $3, 'message_template_submission', $4, $5, $6)
      RETURNING id
    `,
    completeReceipt: `
      UPDATE railway_api_mutation_receipts
      SET
        status = 'completed',
        response_json = $5,
        completed_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1
        AND operation = $2
        AND idempotency_key = $3
        AND request_digest = $4
        AND status = 'processing'
      RETURNING idempotency_key AS "idempotencyKey"
    `,
  });

interface MutationReceiptRow {
  readonly requestDigest: unknown;
  readonly status: unknown;
  readonly responseJson: unknown;
}

type StagingFailureCode = "not-found" | "not-editable" | "meta-not-connected";

class StagingFailure extends Error {
  readonly code: StagingFailureCode;

  constructor(code: StagingFailureCode) {
    super("Message template submission could not be staged");
    this.name = "StagingFailure";
    this.code = code;
  }
}

function requireRowCount(
  result: Readonly<PostgresQueryResult<unknown>>,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(result.rowCount) || result.rowCount < 0 ||
    result.rowCount > maximum || !Array.isArray(result.rows) ||
    result.rows.length !== result.rowCount
  ) {
    throw new Error("PostgreSQL returned an invalid result");
  }

  return result.rowCount;
}

function inlineTransactions(
  transaction: PostgresTransaction,
): PostgresTransactionManager {
  return Object.freeze({
    transaction<TResult>(
      _options: Readonly<{ isolationLevel: "read-committed" | "repeatable-read" }>,
      execute: (current: PostgresTransaction) => Promise<TResult>,
    ) {
      return execute(transaction);
    },
  });
}

function requireTimestamp(value: unknown): string {
  if (
    typeof value !== "string" || !timestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value
  ) {
    throw new Error("Message template submission clock is invalid");
  }

  return value;
}

function validateCommand(
  command: Readonly<RailwayMessageTemplateSubmissionMutationCommand>,
) {
  if (
    !command || typeof command !== "object" ||
    !Number.isSafeInteger(command.session?.tenantId) ||
    command.session.tenantId <= 0 ||
    typeof command.session.externalUserId !== "string" ||
    command.session.externalUserId.length === 0 ||
    command.session.externalUserId.length > 512 ||
    command.session.externalUserId.trim() !== command.session.externalUserId ||
    controlCharacterPattern.test(command.session.externalUserId) ||
    command.operation !== RAILWAY_MESSAGE_TEMPLATE_SUBMISSION_OPERATION ||
    !idempotencyKeyPattern.test(command.idempotencyKey) ||
    !requestDigestPattern.test(command.requestDigest) ||
    !command.payload || typeof command.payload !== "object" ||
    Object.keys(command.payload).length !== 1 ||
    !templateKeyPattern.test(command.payload.templateKey)
  ) {
    throw new Error("Railway message template submission command is invalid");
  }

  return command.payload.templateKey;
}

function parseReplay(value: unknown) {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }

  const message = parseMessageTemplateSubmissionQueueMessage(parsed);
  if (message === null) {
    throw new Error("PostgreSQL returned an invalid submission replay");
  }

  return message;
}

async function loadReplay(
  transaction: PostgresTransaction,
  command: Readonly<RailwayMessageTemplateSubmissionMutationCommand>,
): Promise<RailwayMessageTemplateSubmissionMutationResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayMessageTemplateSubmissionMutationSql.lockReceipt,
    [command.session.tenantId, command.operation, command.idempotencyKey],
  );

  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL mutation receipt is unavailable");
  }

  const receipt = result.rows[0];
  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, queueMessage: null };
  }
  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL mutation receipt is incomplete");
  }

  const queueMessage = parseReplay(receipt.responseJson);
  if (queueMessage.tenantId !== command.session.tenantId) {
    throw new Error("PostgreSQL returned a cross-tenant submission replay");
  }

  return Object.freeze({
    outcome: "replayed" as const,
    tenantId: command.session.tenantId,
    queueMessage,
  });
}

async function loadConnection(
  transaction: PostgresTransaction,
  tenantId: number,
) {
  const result = await transaction.query<{
    version: unknown;
    wabaId: unknown;
    status: unknown;
  }>(postgresRailwayMessageTemplateSubmissionMutationSql.lockMetaConnection, [tenantId]);

  if (requireRowCount(result, 1) !== 1) {
    throw new StagingFailure("meta-not-connected");
  }

  const row = result.rows[0];
  const version = typeof row.version === "string" && /^[1-9][0-9]*$/.test(row.version)
    ? Number(row.version)
    : row.version;

  if (
    !Number.isSafeInteger(version) || Number(version) <= 0 ||
    typeof row.wabaId !== "string" || !/^[1-9][0-9]{0,63}$/.test(row.wabaId) ||
    row.status !== "connected"
  ) {
    throw new StagingFailure("meta-not-connected");
  }

  return Object.freeze({ version: Number(version), wabaId: row.wabaId });
}

async function stage(
  transaction: PostgresTransaction,
  command: Readonly<RailwayMessageTemplateSubmissionMutationCommand>,
  templateKey: string,
  graphApiVersion: string,
  occurredAt: string,
): Promise<RailwayMessageTemplateSubmissionMutationResult> {
  const connection = await loadConnection(transaction, command.session.tenantId);
  const templates = createPostgresMessageTemplateRepository({
    queries: transaction,
    transactions: inlineTransactions(transaction),
  });
  const draft = await templates.findByKey(command.session.tenantId, templateKey);

  if (draft === null) {
    throw new StagingFailure("not-found");
  }
  if (draft.status !== "draft") {
    throw new StagingFailure("not-editable");
  }

  const submissionKey = await deriveMessageTemplateSubmissionKey(draft);
  const claimedTemplate = await templates.claimSubmission(
    command.session.tenantId,
    templateKey,
    draft.version,
    submissionKey,
  );
  const inserted = await transaction.query<{ submissionKey: string }>(
    postgresRailwayMessageTemplateSubmissionMutationSql.insertOutbox,
    [
      submissionKey,
      command.session.tenantId,
      templateKey,
      claimedTemplate.version,
      connection.version,
      connection.wabaId,
      graphApiVersion,
      command.operation,
      command.idempotencyKey,
    ],
  );

  if (
    requireRowCount(inserted, 1) !== 1 ||
    inserted.rows[0]?.submissionKey !== submissionKey
  ) {
    throw new Error("PostgreSQL submission outbox write failed");
  }

  const event = {
    submissionKey,
    tenantId: command.session.tenantId,
    templateKey,
    eventType: "staged" as const,
    fromStatus: null,
    toStatus: "pending" as const,
    fromVersion: 0,
    toVersion: 1,
    actorKind: "user" as const,
    actorExternalUserId: command.session.externalUserId,
    causationKey: command.idempotencyKey,
    errorCode: null,
    metaTemplateId: null,
    occurredAt,
  };
  const eventKey = await deriveMessageTemplateSubmissionEventKey(event);
  const eventResult = await transaction.query<{ eventKey: string }>(
    postgresMessageTemplateSubmissionOutboxSql.insertEvent,
    [
      eventKey,
      submissionKey,
      command.session.tenantId,
      templateKey,
      event.eventType,
      event.fromStatus,
      event.toStatus,
      event.fromVersion,
      event.toVersion,
      event.actorKind,
      event.actorExternalUserId,
      event.causationKey,
      event.errorCode,
      event.metaTemplateId,
      event.occurredAt,
    ],
  );

  if (
    requireRowCount(eventResult, 1) !== 1 ||
    eventResult.rows[0]?.eventKey !== eventKey
  ) {
    throw new Error("PostgreSQL submission event write failed");
  }

  const queueMessage = createMessageTemplateSubmissionQueueMessage(
    command.session.tenantId,
    submissionKey,
  );
  const audit = await transaction.query(
    postgresRailwayMessageTemplateSubmissionMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      command.operation,
      submissionKey,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        templateKey,
        templateVersion: claimedTemplate.version,
        metaConnectionVersion: connection.version,
        graphApiVersion,
        lifecycle: "pending",
      }),
    ],
  );

  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL audit write failed");
  }

  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayMessageTemplateSubmissionMutationSql.completeReceipt,
    [
      command.session.tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      JSON.stringify(queueMessage),
    ],
  );

  if (
    requireRowCount(completed, 1) !== 1 ||
    completed.rows[0]?.idempotencyKey !== command.idempotencyKey
  ) {
    throw new Error("PostgreSQL mutation completion failed");
  }

  return Object.freeze({
    outcome: "committed" as const,
    tenantId: command.session.tenantId,
    queueMessage,
  });
}

export function createPostgresRailwayMessageTemplateSubmissionMutationExecutor(
  transactions: PostgresTransactionManager,
  graphApiVersion: string,
  clock: () => string = () => new Date().toISOString(),
): RailwayMessageTemplateSubmissionMutationExecutor {
  if (
    typeof transactions?.transaction !== "function" ||
    typeof graphApiVersion !== "string" || !graphVersionPattern.test(graphApiVersion) ||
    typeof clock !== "function"
  ) {
    throw new Error("PostgreSQL template submission executor options are invalid");
  }

  const executor: RailwayMessageTemplateSubmissionMutationExecutor = {
    async execute(command) {
      try {
        const templateKey = validateCommand(command);
        const occurredAt = requireTimestamp(clock());

        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          async (transaction) => {
            const claimed = await transaction.query<{ idempotencyKey: string }>(
              postgresRailwayMessageTemplateSubmissionMutationSql.claimReceipt,
              [
                command.session.tenantId,
                command.operation,
                command.idempotencyKey,
                command.requestDigest,
                command.session.externalUserId,
              ],
            );
            const count = requireRowCount(claimed, 1);

            if (count === 0) {
              return loadReplay(transaction, command);
            }
            if (claimed.rows[0]?.idempotencyKey !== command.idempotencyKey) {
              throw new Error("PostgreSQL returned an invalid mutation claim");
            }

            return stage(
              transaction,
              command,
              templateKey,
              graphApiVersion,
              occurredAt,
            );
          },
        );
      } catch (error) {
        if (error instanceof StagingFailure) {
          return Object.freeze({
            outcome: error.code,
            tenantId: null,
            queueMessage: null,
          });
        }
        if (error instanceof MessageTemplateTransitionError) {
          return { outcome: "not-editable", tenantId: null, queueMessage: null };
        }

        return { outcome: "unavailable", tenantId: null, queueMessage: null };
      }
    },
  };

  return Object.freeze(executor);
}
