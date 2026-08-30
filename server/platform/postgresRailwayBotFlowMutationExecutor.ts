import {
  validateBotFlowDefinition,
} from "../../shared/validation/botFlowDefinition.ts";
import {
  BotFlowInputError,
  BotFlowServiceError,
  createBotFlowService,
} from "../bot/botFlowService.ts";
import {
  toBotFlowSummaryView,
  toBotFlowVersionView,
} from "../bot/botFlowView.ts";
import { createPostgresBotFlowRepository } from "./postgresBotFlowRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  RAILWAY_BOT_FLOW_DRAFT_OPERATION,
  RAILWAY_BOT_FLOW_PUBLISH_OPERATION,
  parseRailwayBotFlowMutationState,
  railwayBotFlowMutationOperations,
  type RailwayBotFlowMutationCommand,
  type RailwayBotFlowMutationExecutor,
  type RailwayBotFlowMutationOperation,
  type RailwayBotFlowMutationResult,
  type RailwayBotFlowMutationState,
} from "./railwayBotFlowMutationExecutor.ts";

const requestDigestPattern =
  /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern =
  /^connect_idempotency_v1_[0-9a-f]{64}$/;
const botFlowKeyPattern = /^bot_flow_v1_[0-9a-f]{64}$/;
const botFlowVersionKeyPattern =
  /^bot_flow_version_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayBotFlowMutationSql = Object.freeze({
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
    VALUES ($1, $2, $3, 'bot_flow', $4, $5, $6)
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

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
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

function isOperation(value: unknown): value is RailwayBotFlowMutationOperation {
  return typeof value === "string" &&
    railwayBotFlowMutationOperations.some((operation) => operation === value);
}

function validateCommand(
  command: Readonly<RailwayBotFlowMutationCommand>,
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
    Array.isArray(command.payload)
  ) {
    throw new Error("Railway bot flow mutation command is invalid");
  }

  if (command.operation === RAILWAY_BOT_FLOW_DRAFT_OPERATION) {
    if (
      !hasExactKeys(command.payload, [
        "definition",
        "expectedFlowVersion",
      ]) ||
      !("definition" in command.payload) ||
      (command.payload.expectedFlowVersion !== null &&
        (!Number.isSafeInteger(command.payload.expectedFlowVersion) ||
          Number(command.payload.expectedFlowVersion) <= 0))
    ) {
      throw new Error("Railway bot flow mutation command is invalid");
    }
    const validation = validateBotFlowDefinition(command.payload.definition);
    if (
      !validation.success ||
      JSON.stringify(validation.value) !==
        JSON.stringify(command.payload.definition)
    ) {
      throw new Error("Railway bot flow definition is not canonical");
    }
    return;
  }

  if (command.operation !== RAILWAY_BOT_FLOW_PUBLISH_OPERATION) {
    throw new Error("Railway bot flow mutation command is invalid");
  }

  if (
    !hasExactKeys(command.payload, [
      "botFlowKey",
      "botFlowVersionKey",
      "expectedFlowVersion",
    ]) ||
    !("botFlowKey" in command.payload) ||
    !botFlowKeyPattern.test(command.payload.botFlowKey) ||
    !botFlowVersionKeyPattern.test(command.payload.botFlowVersionKey) ||
    !Number.isSafeInteger(command.payload.expectedFlowVersion) ||
    command.payload.expectedFlowVersion <= 0
  ) {
    throw new Error("Railway bot flow mutation command is invalid");
  }
}

function parseStoredState(
  value: unknown,
  command: Readonly<RailwayBotFlowMutationCommand>,
): RailwayBotFlowMutationState {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }

  const state = parseRailwayBotFlowMutationState(
    command.operation,
    command.payload,
    parsed,
  );
  if (state === null) {
    throw new Error("PostgreSQL returned an invalid bot flow state");
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
  command: Readonly<RailwayBotFlowMutationCommand>,
): Promise<RailwayBotFlowMutationResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayBotFlowMutationSql.lockReceipt,
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
    outcome: "replayed" as const,
    tenantId: command.session.tenantId,
    state: parseStoredState(receipt.responseJson, command),
  });
}

async function executeDomainMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayBotFlowMutationCommand>,
): Promise<RailwayBotFlowMutationState> {
  const service = createBotFlowService(
    createPostgresBotFlowRepository({
      queries: transaction,
      transactions: createInlineTransactionManager(transaction),
    }),
  );

  if (command.operation === RAILWAY_BOT_FLOW_DRAFT_OPERATION) {
    const result = await service.saveDraft(command.session, command.payload);
    return parseStoredState({
      outcome: result.outcome,
      flow: toBotFlowSummaryView(result.flow),
      draftVersion: toBotFlowVersionView(result.draftVersion),
    }, command);
  }

  const result = await service.publishDraft(command.session, command.payload);
  return parseStoredState({
    outcome: result.outcome,
    flow: toBotFlowSummaryView(result.flow),
    publishedVersion: toBotFlowVersionView(result.publishedVersion),
  }, command);
}

async function commitNewMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayBotFlowMutationCommand>,
): Promise<RailwayBotFlowMutationResult> {
  const state = await executeDomainMutation(transaction, command);
  const version = "draftVersion" in state
    ? state.draftVersion
    : state.publishedVersion;
  const audit = await transaction.query(
    postgresRailwayBotFlowMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      command.operation,
      state.flow.botFlowKey,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        outcome: state.outcome,
        resultingFlowVersion: state.flow.version,
        resultingVersionKey: version.botFlowVersionKey,
        resultingVersionNumber: version.versionNumber,
      }),
    ],
  );
  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL audit write failed");
  }

  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayBotFlowMutationSql.completeReceipt,
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
    throw new Error("PostgreSQL mutation completion failed");
  }

  return Object.freeze({
    outcome: "committed" as const,
    tenantId: command.session.tenantId,
    state,
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayBotFlowMutationCommand>,
): Promise<RailwayBotFlowMutationResult> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayBotFlowMutationSql.claimReceipt,
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

export function createPostgresRailwayBotFlowMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayBotFlowMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL transaction manager is invalid");
  }

  const executor: RailwayBotFlowMutationExecutor = {
    async execute(command) {
      try {
        validateCommand(command);
        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(transaction, command),
        );
      } catch (error) {
        if (error instanceof BotFlowServiceError) {
          if (error.code === "NOT_FOUND") {
            return { outcome: "not-found", tenantId: null, state: null };
          }
          if (error.code === "STATE_CONFLICT") {
            return { outcome: "conflict", tenantId: null, state: null };
          }
          if (error.code === "INVALID_STATE") {
            return { outcome: "invalid-state", tenantId: null, state: null };
          }
        }
        if (error instanceof BotFlowInputError) {
          return { outcome: "invalid-state", tenantId: null, state: null };
        }
        return { outcome: "unavailable", tenantId: null, state: null };
      }
    },
  };

  return Object.freeze(executor);
}
