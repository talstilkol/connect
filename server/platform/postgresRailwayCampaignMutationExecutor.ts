import {
  CampaignActivationError,
  createCampaignActivationService,
  parseActivateCampaignRequest,
} from "../campaigns/campaignActivationService.ts";
import {
  CampaignSnapshotError,
  createCampaignSnapshotService,
  parseCampaignSnapshotRequest,
} from "../campaigns/campaignSnapshotService.ts";
import {
  toCampaignActivationView,
  toCampaignView,
} from "../campaigns/campaignView.ts";
import { createPostgresBusinessProfileRepository } from "./postgresBusinessProfileRepository.ts";
import { createPostgresCampaignAudienceRepository } from "./postgresCampaignAudienceRepository.ts";
import { createPostgresCampaignDispatchRepository } from "./postgresCampaignDispatchRepository.ts";
import { createPostgresCampaignRepository } from "./postgresCampaignRepository.ts";
import { createPostgresMessageTemplateRepository } from "./postgresMessageTemplateRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION,
  parseRailwayCampaignMutationState,
  railwayCampaignMutationOperations,
  type RailwayCampaignMutationCommand,
  type RailwayCampaignMutationExecutor,
  type RailwayCampaignMutationOperation,
  type RailwayCampaignMutationResult,
  type RailwayCampaignMutationState,
} from "./railwayCampaignMutationExecutor.ts";

const requestDigestPattern = /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

class CampaignDeliveryConfigurationError extends Error {}

export const postgresRailwayCampaignMutationSql = Object.freeze({
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
    VALUES ($1, $2, $3, 'campaign', $4, $5, $6)
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

function isOperation(value: unknown): value is RailwayCampaignMutationOperation {
  return typeof value === "string" &&
    railwayCampaignMutationOperations.some((operation) => operation === value);
}

function validateCommand(
  command: Readonly<RailwayCampaignMutationCommand>,
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
    !requestDigestPattern.test(command.requestDigest)
  ) {
    throw new Error("Railway campaign mutation command is invalid");
  }

  const parsed = command.operation === RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION
    ? parseCampaignSnapshotRequest(command.payload)
    : parseActivateCampaignRequest(command.payload);
  if (
    parsed === null ||
    JSON.stringify(parsed) !== JSON.stringify(command.payload)
  ) {
    throw new Error("Railway campaign mutation payload is not canonical");
  }
}

function parseStoredState(
  value: unknown,
  command: Readonly<RailwayCampaignMutationCommand>,
): RailwayCampaignMutationState {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }
  const state = parseRailwayCampaignMutationState(
    command.operation,
    command.payload,
    parsed,
  );
  if (state === null) {
    throw new Error("PostgreSQL returned an invalid campaign state");
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
  command: Readonly<RailwayCampaignMutationCommand>,
): Promise<RailwayCampaignMutationResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayCampaignMutationSql.lockReceipt,
    [command.session.tenantId, command.operation, command.idempotencyKey],
  );
  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL campaign mutation receipt is unavailable");
  }
  const receipt = result.rows[0];
  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, state: null };
  }
  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL campaign mutation receipt is incomplete");
  }
  return Object.freeze({
    outcome: "replayed" as const,
    tenantId: command.session.tenantId,
    state: parseStoredState(receipt.responseJson, command),
  });
}

async function executeDomainMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayCampaignMutationCommand>,
  deliveryConfigured: () => boolean,
): Promise<RailwayCampaignMutationState> {
  const inlineTransactions = createInlineTransactionManager(transaction);
  if (command.operation === RAILWAY_CAMPAIGN_SNAPSHOT_OPERATION) {
    const campaign = await createCampaignSnapshotService({
      audiences: createPostgresCampaignAudienceRepository(transaction),
      campaigns: createPostgresCampaignRepository({
        queries: transaction,
        transactions: inlineTransactions,
      }),
      templates: createPostgresMessageTemplateRepository({
        queries: transaction,
        transactions: inlineTransactions,
      }),
      businessProfiles: createPostgresBusinessProfileRepository({
        queries: transaction,
        transactions: inlineTransactions,
      }),
    }).save(command.session, command.payload);
    return parseStoredState({
      outcome: "saved",
      campaign: toCampaignView(campaign),
    }, command);
  }

  if (!deliveryConfigured()) {
    throw new CampaignDeliveryConfigurationError();
  }
  const campaign = await createCampaignActivationService(
    createPostgresCampaignDispatchRepository(transaction),
    { now: () => new Date() },
  ).activate(command.session, command.payload);
  return parseStoredState({
    outcome: "activated",
    campaign: toCampaignActivationView(campaign),
  }, command);
}

async function commitNewMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayCampaignMutationCommand>,
  deliveryConfigured: () => boolean,
): Promise<RailwayCampaignMutationResult> {
  const state = await executeDomainMutation(
    transaction,
    command,
    deliveryConfigured,
  );
  const audit = await transaction.query(
    postgresRailwayCampaignMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      command.operation,
      state.campaign.campaignKey,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        outcome: state.outcome,
        resultingCampaignVersion: state.campaign.version,
        resultingCampaignStatus: state.campaign.status,
      }),
    ],
  );
  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL campaign audit write failed");
  }
  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayCampaignMutationSql.completeReceipt,
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
    throw new Error("PostgreSQL campaign mutation completion failed");
  }
  return Object.freeze({
    outcome: "committed" as const,
    tenantId: command.session.tenantId,
    state,
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayCampaignMutationCommand>,
  deliveryConfigured: () => boolean,
): Promise<RailwayCampaignMutationResult> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayCampaignMutationSql.claimReceipt,
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
    throw new Error("PostgreSQL returned an invalid campaign mutation claim");
  }
  return commitNewMutation(transaction, command, deliveryConfigured);
}

function mapSnapshotError(
  error: CampaignSnapshotError,
): RailwayCampaignMutationResult {
  if (error.code === "PROFILE_REQUIRED") {
    return { outcome: "profile-required", tenantId: null, state: null };
  }
  if (
    error.code === "TEMPLATE_NOT_FOUND" ||
    error.code === "TEMPLATE_NOT_APPROVED"
  ) {
    return { outcome: "template-unavailable", tenantId: null, state: null };
  }
  if (error.code === "INVALID_AUDIENCE") {
    return { outcome: "audience-invalid", tenantId: null, state: null };
  }
  return { outcome: "unavailable", tenantId: null, state: null };
}

export function createPostgresRailwayCampaignMutationExecutor(
  transactions: PostgresTransactionManager,
  deliveryConfigured: () => boolean,
): RailwayCampaignMutationExecutor {
  if (
    typeof transactions?.transaction !== "function" ||
    typeof deliveryConfigured !== "function"
  ) {
    throw new Error("PostgreSQL campaign mutation dependencies are invalid");
  }

  const executor: RailwayCampaignMutationExecutor = {
    async execute(command) {
      try {
        validateCommand(command);
        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(
            transaction,
            command,
            deliveryConfigured,
          ),
        );
      } catch (error) {
        if (error instanceof CampaignSnapshotError) {
          return mapSnapshotError(error);
        }
        if (error instanceof CampaignActivationError) {
          return error.code === "TRANSITION_CONFLICT"
            ? { outcome: "state-conflict", tenantId: null, state: null }
            : { outcome: "unavailable", tenantId: null, state: null };
        }
        if (error instanceof CampaignDeliveryConfigurationError) {
          return {
            outcome: "delivery-configuration-required",
            tenantId: null,
            state: null,
          };
        }
        return { outcome: "unavailable", tenantId: null, state: null };
      }
    },
  };
  return Object.freeze(executor);
}
