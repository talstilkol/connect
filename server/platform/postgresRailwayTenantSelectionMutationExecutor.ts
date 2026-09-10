import {
  createPostgresTenantSelectionRepository,
} from "./postgresTenantSelectionRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
  parseRailwayTenantSelectionMutationState,
  type RailwayTenantSelectionMutationCommand,
  type RailwayTenantSelectionMutationExecutor,
  type RailwayTenantSelectionMutationResult,
  type RailwayTenantSelectionMutationState,
} from "./railwayTenantSelectionMutationExecutor.ts";

const requestDigestPattern = /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayTenantSelectionMutationSql = Object.freeze({
  lockEligibleMembership: `
    SELECT membership.tenant_id AS "tenantId"
    FROM tenant_memberships AS membership
    INNER JOIN tenants AS tenant
      ON tenant.id = membership.tenant_id
    WHERE membership.external_user_id = $1
      AND membership.tenant_id = $2
      AND membership.status = 'active'
      AND tenant.status IN ('trial', 'active', 'payment_failed')
    FOR KEY SHARE OF membership, tenant
  `,
  claimReceipt: `
    INSERT INTO railway_api_mutation_receipts (
      tenant_id,
      operation,
      idempotency_key,
      request_digest,
      actor_external_user_id,
      status
    ) VALUES ($1, $2, $3, $4, $5, 'processing')
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
    ) VALUES ($1, $2, $3, 'tenant_selection', ($1::bigint)::text, $4, $5)
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

class TenantSelectionMutationConflictError extends Error {}

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

function requirePositiveInteger(value: unknown): number {
  const normalized =
    typeof value === "string" && /^[1-9][0-9]*$/.test(value)
      ? Number(value)
      : value;
  if (!Number.isSafeInteger(normalized) || Number(normalized) <= 0) {
    throw new Error("PostgreSQL returned an invalid tenant identity");
  }
  return Number(normalized);
}

function validateCommand(
  command: Readonly<RailwayTenantSelectionMutationCommand>,
): void {
  if (
    !command ||
    typeof command !== "object" ||
    command.operation !== RAILWAY_TENANT_SELECTION_SAVE_OPERATION ||
    typeof command.identity?.externalUserId !== "string" ||
    command.identity.externalUserId.length === 0 ||
    command.identity.externalUserId.length > 512 ||
    command.identity.externalUserId.trim() !== command.identity.externalUserId ||
    controlCharacterPattern.test(command.identity.externalUserId) ||
    command.input?.externalUserId !== command.identity.externalUserId ||
    !Number.isSafeInteger(command.input?.tenantId) ||
    command.input.tenantId <= 0 ||
    !Number.isSafeInteger(command.input.expectedVersion) ||
    command.input.expectedVersion < 0 ||
    !idempotencyKeyPattern.test(command.idempotencyKey) ||
    !requestDigestPattern.test(command.requestDigest)
  ) {
    throw new Error("Railway tenant selection command is invalid");
  }
}

function createInlineTransactionManager(
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

function parseStoredState(
  value: unknown,
  command: Readonly<RailwayTenantSelectionMutationCommand>,
): Readonly<RailwayTenantSelectionMutationState> {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid tenant selection replay JSON");
    }
  }
  const state = parseRailwayTenantSelectionMutationState(
    command.input,
    parsed,
  );
  if (state === null) {
    throw new Error("PostgreSQL returned invalid tenant selection state");
  }
  return state;
}

async function requireEligibleMembership(
  transaction: PostgresTransaction,
  command: Readonly<RailwayTenantSelectionMutationCommand>,
): Promise<void> {
  const result = await transaction.query<{ tenantId: unknown }>(
    postgresRailwayTenantSelectionMutationSql.lockEligibleMembership,
    [command.identity.externalUserId, command.input.tenantId],
  );
  if (
    requireRowCount(result, 1) !== 1 ||
    requirePositiveInteger(result.rows[0]?.tenantId) !== command.input.tenantId
  ) {
    throw new Error("PostgreSQL tenant selection membership is unavailable");
  }
}

async function loadExistingReceipt(
  transaction: PostgresTransaction,
  command: Readonly<RailwayTenantSelectionMutationCommand>,
): Promise<Readonly<{
  outcome: "replayed";
  tenantId: number;
  state: Readonly<RailwayTenantSelectionMutationState>;
}>> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayTenantSelectionMutationSql.lockReceipt,
    [
      command.input.tenantId,
      command.operation,
      command.idempotencyKey,
    ],
  );
  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL tenant selection receipt is unavailable");
  }
  const receipt = result.rows[0];
  if (receipt.requestDigest !== command.requestDigest) {
    throw new TenantSelectionMutationConflictError();
  }
  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL tenant selection receipt is incomplete");
  }
  return Object.freeze({
    outcome: "replayed" as const,
    tenantId: command.input.tenantId,
    state: parseStoredState(receipt.responseJson, command),
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayTenantSelectionMutationCommand>,
): Promise<RailwayTenantSelectionMutationResult> {
  await requireEligibleMembership(transaction, command);
  const claimed = await transaction.query<{ idempotencyKey: unknown }>(
    postgresRailwayTenantSelectionMutationSql.claimReceipt,
    [
      command.input.tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      command.identity.externalUserId,
    ],
  );
  if (requireRowCount(claimed, 1) === 0) {
    return loadExistingReceipt(transaction, command);
  }
  if (claimed.rows[0]?.idempotencyKey !== command.idempotencyKey) {
    throw new Error("PostgreSQL returned an invalid tenant selection claim");
  }

  const repository = createPostgresTenantSelectionRepository({
    queries: transaction,
    transactions: createInlineTransactionManager(transaction),
  });
  const saved = await repository.save(command.input);
  if (saved.outcome === "conflict") {
    throw new TenantSelectionMutationConflictError();
  }
  if (saved.outcome === "rejected" || saved.selection === null) {
    throw new Error("PostgreSQL rejected the tenant selection mutation");
  }
  const state = parseRailwayTenantSelectionMutationState(
    command.input,
    {
      repositoryOutcome: saved.outcome,
      selection: saved.selection,
    },
  );
  if (state === null) {
    throw new Error("PostgreSQL returned an invalid tenant selection state");
  }

  const audit = await transaction.query(
    postgresRailwayTenantSelectionMutationSql.insertAudit,
    [
      command.input.tenantId,
      command.identity.externalUserId,
      command.operation,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        expectedVersion: command.input.expectedVersion,
        resultingVersion: state.selection.version,
        repositoryOutcome: state.repositoryOutcome,
      }),
    ],
  );
  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL tenant selection audit write failed");
  }
  const completed = await transaction.query<{ idempotencyKey: unknown }>(
    postgresRailwayTenantSelectionMutationSql.completeReceipt,
    [
      command.input.tenantId,
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
    throw new Error("PostgreSQL tenant selection receipt completion failed");
  }

  return Object.freeze({
    outcome: "committed" as const,
    tenantId: command.input.tenantId,
    state,
  });
}

export function createPostgresRailwayTenantSelectionMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayTenantSelectionMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL tenant selection dependencies are invalid");
  }
  return Object.freeze({
    async execute(command: Readonly<RailwayTenantSelectionMutationCommand>) {
      try {
        validateCommand(command);
        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(transaction, command),
        );
      } catch (error) {
        return error instanceof TenantSelectionMutationConflictError
          ? { outcome: "conflict" as const, tenantId: null, state: null }
          : { outcome: "unavailable" as const, tenantId: null, state: null };
      }
    },
  });
}
