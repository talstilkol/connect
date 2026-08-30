import {
  ConversationServiceError,
  createConversationService,
} from "../conversations/conversationService.ts";
import {
  toConversationAssignmentStateView,
  toConversationReadStateView,
} from "../conversations/conversationView.ts";
import { createPostgresConversationRepository } from "./postgresConversationRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  parseRailwayConversationMutationState,
  railwayConversationMutationOperations,
  type RailwayConversationMutationCommand,
  type RailwayConversationMutationExecutor,
  type RailwayConversationMutationOperation,
  type RailwayConversationMutationResult,
  type RailwayConversationMutationState,
} from "./railwayConversationMutationExecutor.ts";

const requestDigestPattern =
  /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern =
  /^connect_idempotency_v1_[0-9a-f]{64}$/;
const conversationKeyPattern =
  /^conversation_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayConversationMutationSql = Object.freeze({
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
    VALUES ($1, $2, $3, 'conversation', $4, $5, $6)
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

function hasExactKeys(
  value: object,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return actualKeys.length === expected.length &&
    actualKeys.every((key, index) => key === expected[index]);
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

function isOperation(
  value: unknown,
): value is RailwayConversationMutationOperation {
  return typeof value === "string" &&
    railwayConversationMutationOperations.some(
      (operation) => operation === value,
    );
}

function validateCommand(
  command: Readonly<RailwayConversationMutationCommand>,
): void {
  if (
    !command ||
    typeof command !== "object" ||
    !Number.isSafeInteger(command.session?.tenantId) ||
    command.session.tenantId <= 0 ||
    typeof command.session.externalUserId !== "string" ||
    command.session.externalUserId.length === 0 ||
    command.session.externalUserId.length > 512 ||
    command.session.externalUserId.trim() !== command.session.externalUserId ||
    controlCharacterPattern.test(command.session.externalUserId) ||
    !isOperation(command.operation) ||
    !idempotencyKeyPattern.test(command.idempotencyKey) ||
    !requestDigestPattern.test(command.requestDigest) ||
    typeof command.payload !== "object" ||
    command.payload === null ||
    Array.isArray(command.payload) ||
    !conversationKeyPattern.test(command.payload.conversationKey) ||
    !Number.isSafeInteger(command.payload.expectedVersion) ||
    command.payload.expectedVersion <= 0
  ) {
    throw new Error("Railway conversation mutation command is invalid");
  }

  if (command.operation === "conversations.mark-read") {
    if (!hasExactKeys(command.payload, [
      "conversationKey",
      "expectedVersion",
    ])) {
      throw new Error("Railway conversation mutation command is invalid");
    }
    return;
  }

  if (
    !hasExactKeys(command.payload, [
      "action",
      "conversationKey",
      "expectedVersion",
    ]) ||
    !("action" in command.payload) ||
    (command.payload.action !== "assign-self" &&
      command.payload.action !== "unassign-self")
  ) {
    throw new Error("Railway conversation mutation command is invalid");
  }
}

function parseStoredState(
  value: unknown,
  command: Readonly<RailwayConversationMutationCommand>,
): RailwayConversationMutationState {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }

  const state = parseRailwayConversationMutationState(
    command.operation,
    command.payload.conversationKey,
    parsed,
  );

  if (state === null) {
    throw new Error("PostgreSQL returned an invalid conversation state");
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
  command: Readonly<RailwayConversationMutationCommand>,
): Promise<RailwayConversationMutationResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayConversationMutationSql.lockReceipt,
    [command.session.tenantId, command.operation, command.idempotencyKey],
  );

  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL mutation receipt is unavailable");
  }

  const receipt = result.rows[0];
  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, state: null };
  }
  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL mutation receipt is incomplete");
  }

  return Object.freeze({
    outcome: "replayed",
    tenantId: command.session.tenantId,
    state: parseStoredState(receipt.responseJson, command),
  });
}

async function executeDomainMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayConversationMutationCommand>,
): Promise<RailwayConversationMutationState> {
  const service = createConversationService(
    createPostgresConversationRepository({
      queries: transaction,
      transactions: createInlineTransactionManager(transaction),
    }),
  );

  if (command.operation === "conversations.mark-read") {
    return toConversationReadStateView(
      await service.markRead(command.session, command.payload),
    );
  }

  return toConversationAssignmentStateView(
    await service.changeAssignment(command.session, command.payload),
    command.session.externalUserId,
  );
}

async function commitNewMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayConversationMutationCommand>,
): Promise<RailwayConversationMutationResult> {
  const state = await executeDomainMutation(transaction, command);
  const validatedState = parseStoredState(state, command);
  const audit = await transaction.query(
    postgresRailwayConversationMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      command.operation,
      command.payload.conversationKey,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        expectedVersion: command.payload.expectedVersion,
        resultingVersion: validatedState.version,
        ...("action" in command.payload
          ? { action: command.payload.action }
          : {}),
      }),
    ],
  );

  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL audit write failed");
  }

  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayConversationMutationSql.completeReceipt,
    [
      command.session.tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      JSON.stringify(validatedState),
    ],
  );

  if (
    requireRowCount(completed, 1) !== 1 ||
    completed.rows[0]?.idempotencyKey !== command.idempotencyKey
  ) {
    throw new Error("PostgreSQL mutation completion failed");
  }

  return Object.freeze({
    outcome: "committed",
    tenantId: command.session.tenantId,
    state: validatedState,
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayConversationMutationCommand>,
): Promise<RailwayConversationMutationResult> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayConversationMutationSql.claimReceipt,
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
    throw new Error("PostgreSQL returned an invalid mutation claim");
  }

  return commitNewMutation(transaction, command);
}

export function createPostgresRailwayConversationMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayConversationMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL transaction manager is invalid");
  }

  const executor: RailwayConversationMutationExecutor = {
    async execute(command) {
      try {
        validateCommand(command);
        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(transaction, command),
        );
      } catch (error) {
        if (error instanceof ConversationServiceError) {
          if (error.code === "NOT_FOUND") {
            return { outcome: "not-found", tenantId: null, state: null };
          }
          if (
            error.code === "STATE_CONFLICT" ||
            error.code === "ASSIGNMENT_CONFLICT"
          ) {
            return { outcome: "conflict", tenantId: null, state: null };
          }
        }

        return { outcome: "unavailable", tenantId: null, state: null };
      }
    },
  };

  return Object.freeze(executor);
}
