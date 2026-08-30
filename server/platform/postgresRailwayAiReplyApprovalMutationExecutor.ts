import {
  AiReplyApprovalServiceError,
  createAiReplyApprovalService,
  parseAiReplyApprovalDecisionRequest,
} from "../ai/aiReplyApprovalService.ts";
import { toAiReplyApprovalDecisionView } from
  "../ai/aiReplyApprovalView.ts";
import { createPostgresAiReplyOutboxRepository } from
  "./postgresAiReplyOutboxRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION,
  parseRailwayAiReplyApprovalMutationState,
  type RailwayAiReplyApprovalMutationCommand,
  type RailwayAiReplyApprovalMutationExecutor,
  type RailwayAiReplyApprovalMutationResult,
  type RailwayAiReplyApprovalMutationState,
} from "./railwayAiReplyApprovalMutationExecutor.ts";

const requestDigestPattern = /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayAiReplyApprovalMutationSql = Object.freeze({
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
    VALUES ($1, $2, $3, 'ai_reply_approval', $4, $5, $6)
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
  requestDigest: unknown;
  status: unknown;
  responseJson: unknown;
}

function requireRowCount(
  result: Readonly<PostgresQueryResult<unknown>>,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(result.rowCount) ||
    result.rowCount < 0 ||
    result.rowCount > maximum ||
    !Array.isArray(result.rows) ||
    result.rows.length !== result.rowCount
  ) {
    throw new Error("PostgreSQL returned an invalid result");
  }
  return result.rowCount;
}

function validateCommand(
  command: Readonly<RailwayAiReplyApprovalMutationCommand>,
): void {
  if (
    !command ||
    typeof command !== "object" ||
    !Number.isSafeInteger(command.session?.tenantId) ||
    command.session.tenantId <= 0 ||
    typeof command.session.externalUserId !== "string" ||
    command.session.externalUserId.length === 0 ||
    command.session.externalUserId.length > 255 ||
    command.session.externalUserId.trim() !== command.session.externalUserId ||
    controlCharacterPattern.test(command.session.externalUserId) ||
    command.operation !== RAILWAY_AI_REPLY_APPROVAL_DECIDE_OPERATION ||
    !idempotencyKeyPattern.test(command.idempotencyKey) ||
    !requestDigestPattern.test(command.requestDigest)
  ) {
    throw new Error("Railway AI reply approval command is invalid");
  }
  const parsed = parseAiReplyApprovalDecisionRequest(command.payload);
  if (parsed === null || JSON.stringify(parsed) !== JSON.stringify(command.payload)) {
    throw new Error("Railway AI reply approval payload is not canonical");
  }
}

function parseStoredState(
  value: unknown,
  command: Readonly<RailwayAiReplyApprovalMutationCommand>,
): RailwayAiReplyApprovalMutationState {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }
  const state = parseRailwayAiReplyApprovalMutationState(
    command.payload,
    parsed,
  );
  if (state === null) {
    throw new Error("PostgreSQL returned an invalid AI reply approval state");
  }
  return state;
}

function createInlineTransactionManager(
  transaction: PostgresTransaction,
): PostgresTransactionManager {
  return Object.freeze({
    transaction<TResult>(
      _options: Readonly<{
        isolationLevel: "read-committed" | "repeatable-read";
      }>,
      execute: (current: PostgresTransaction) => Promise<TResult>,
    ) {
      return execute(transaction);
    },
  });
}

async function loadExistingReceipt(
  transaction: PostgresTransaction,
  command: Readonly<RailwayAiReplyApprovalMutationCommand>,
): Promise<RailwayAiReplyApprovalMutationResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayAiReplyApprovalMutationSql.lockReceipt,
    [command.session.tenantId, command.operation, command.idempotencyKey],
  );
  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL AI reply approval receipt is unavailable");
  }
  const receipt = result.rows[0];
  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, state: null };
  }
  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL AI reply approval receipt is incomplete");
  }
  return Object.freeze({
    outcome: "replayed" as const,
    tenantId: command.session.tenantId,
    state: parseStoredState(receipt.responseJson, command),
  });
}

async function commitNewMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayAiReplyApprovalMutationCommand>,
): Promise<RailwayAiReplyApprovalMutationResult> {
  const inlineTransactions = createInlineTransactionManager(transaction);
  const result = await createAiReplyApprovalService(
    createPostgresAiReplyOutboxRepository({
      queries: transaction,
      transactions: inlineTransactions,
    }),
  ).decide(command.session, command.payload);
  const state = parseStoredState({
    outcome: result.outcome,
    approval: toAiReplyApprovalDecisionView(result.item),
  }, command);
  const audit = await transaction.query(
    postgresRailwayAiReplyApprovalMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      command.operation,
      state.approval.outboxKey,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        decision: command.payload.decision,
        outcome: state.outcome,
        resultingStatus: state.approval.status,
        resultingVersion: state.approval.version,
      }),
    ],
  );
  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL AI reply approval audit write failed");
  }
  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayAiReplyApprovalMutationSql.completeReceipt,
    [
      command.session.tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      JSON.stringify(state),
    ],
  );
  if (
    requireRowCount(completed, 1) !== 1 ||
    completed.rows[0]?.idempotencyKey !== command.idempotencyKey
  ) {
    throw new Error("PostgreSQL AI reply approval completion failed");
  }
  return Object.freeze({
    outcome: "committed" as const,
    tenantId: command.session.tenantId,
    state,
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayAiReplyApprovalMutationCommand>,
): Promise<RailwayAiReplyApprovalMutationResult> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayAiReplyApprovalMutationSql.claimReceipt,
    [
      command.session.tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      command.session.externalUserId,
    ],
  );
  const claimedCount = requireRowCount(claimed, 1);
  if (claimedCount === 0) {
    return loadExistingReceipt(transaction, command);
  }
  if (claimed.rows[0]?.idempotencyKey !== command.idempotencyKey) {
    throw new Error("PostgreSQL returned an invalid AI reply approval claim");
  }
  return commitNewMutation(transaction, command);
}

function mapServiceError(
  error: AiReplyApprovalServiceError,
): RailwayAiReplyApprovalMutationResult {
  if (error.code === "NOT_FOUND") {
    return { outcome: "not-found", tenantId: null, state: null };
  }
  if (error.code === "STATE_CONFLICT") {
    return { outcome: "state-conflict", tenantId: null, state: null };
  }
  if (error.code === "INVALID_STATE") {
    return { outcome: "invalid-state", tenantId: null, state: null };
  }
  return { outcome: "unavailable", tenantId: null, state: null };
}

export function createPostgresRailwayAiReplyApprovalMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayAiReplyApprovalMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL AI reply approval dependencies are invalid");
  }
  const executor: RailwayAiReplyApprovalMutationExecutor = {
    async execute(command) {
      try {
        validateCommand(command);
        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(transaction, command),
        );
      } catch (error) {
        return error instanceof AiReplyApprovalServiceError
          ? mapServiceError(error)
          : { outcome: "unavailable", tenantId: null, state: null };
      }
    },
  };
  return Object.freeze(executor);
}
