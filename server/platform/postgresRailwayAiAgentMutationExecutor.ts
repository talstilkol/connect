import {
  AiAgentActivationError,
  AiAgentInputError,
  AiAgentServiceError,
  createAiAgentService,
  parseAiAgentPublishDraftRequest,
  parseAiAgentSaveDraftRequest,
} from "../ai/aiAgentService.ts";
import {
  unavailableAiOperationalReadinessProvider,
  type AiOperationalReadinessProvider,
} from "../ai/aiOperationalReadiness.ts";
import {
  toAiAgentSummaryView,
  toAiAgentVersionView,
} from "../ai/aiAgentView.ts";
import { createPostgresAiAgentRepository } from "./postgresAiAgentRepository.ts";
import { paidAccessTenantBarrier } from "./postgresPaidAccess.ts";
import { createPostgresKnowledgeSourceRepository } from
  "./postgresKnowledgeSourceRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  RAILWAY_AI_AGENT_DRAFT_OPERATION,
  parseRailwayAiAgentMutationState,
  railwayAiAgentMutationOperations,
  type RailwayAiAgentMutationCommand,
  type RailwayAiAgentMutationExecutor,
  type RailwayAiAgentMutationOperation,
  type RailwayAiAgentMutationResult,
  type RailwayAiAgentMutationState,
} from "./railwayAiAgentMutationExecutor.ts";

const requestDigestPattern = /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayAiAgentMutationSql = Object.freeze({
  lockActor: `SELECT m.role FROM tenants t JOIN tenant_memberships m ON m.tenant_id=t.id
    WHERE t.id=$1 AND t.status IN ('trial','active','payment_failed')
      AND m.external_user_id=$2 AND m.status='active' AND m.role=$3 AND m.role IN ('owner','manager')
      AND public.tenant_paid_access_allowed_v1(t.id) FOR SHARE OF t,m`,
  lockSources: `SELECT s.source_key FROM knowledge_sources s JOIN ai_agent_version_sources v
    ON v.tenant_id=s.tenant_id AND v.source_key=s.source_key
    WHERE v.tenant_id=$1 AND v.ai_agent_version_key=$2 ORDER BY s.source_key FOR SHARE OF s`,
  claimReceipt: `
    INSERT INTO railway_api_mutation_receipts (
      tenant_id, operation, idempotency_key, request_digest,
      actor_external_user_id, status
    ) VALUES ($1, $2, $3, $4, $5, 'processing')
    ON CONFLICT (tenant_id, operation, idempotency_key) DO NOTHING
    RETURNING idempotency_key AS "idempotencyKey"
  `,
  lockReceipt: `
    SELECT request_digest AS "requestDigest", status,
      response_json AS "responseJson"
    FROM railway_api_mutation_receipts
    WHERE tenant_id = $1 AND operation = $2 AND idempotency_key = $3
    FOR UPDATE
  `,
  insertAudit: `
    INSERT INTO audit_logs (
      tenant_id, actor_external_user_id, action, target_type,
      target_id, idempotency_key, metadata_json
    ) VALUES ($1, $2, $3, 'ai_agent', $4, $5, $6)
    RETURNING id
  `,
  completeReceipt: `
    UPDATE railway_api_mutation_receipts
    SET status = 'completed', response_json = $5,
      completed_at = CURRENT_TIMESTAMP
    WHERE tenant_id = $1 AND operation = $2 AND idempotency_key = $3
      AND request_digest = $4 AND status = 'processing'
    RETURNING idempotency_key AS "idempotencyKey"
  `,
});

function isOperation(value: unknown): value is RailwayAiAgentMutationOperation {
  return typeof value === "string" &&
    railwayAiAgentMutationOperations.some((operation) => operation === value);
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

function validateCommand(command: Readonly<RailwayAiAgentMutationCommand>) {
  if (
    !command || typeof command !== "object" ||
    !Number.isSafeInteger(command.session?.tenantId) || command.session.tenantId <= 0 ||
    typeof command.session.externalUserId !== "string" ||
    command.session.externalUserId.trim() !== command.session.externalUserId ||
    command.session.externalUserId.length === 0 ||
    command.session.externalUserId.length > 512 ||
    controlCharacterPattern.test(command.session.externalUserId) ||
    !isOperation(command.operation) ||
    !idempotencyKeyPattern.test(command.idempotencyKey) ||
    !requestDigestPattern.test(command.requestDigest)
  ) {
    throw new Error("Railway AI agent mutation command is invalid");
  }
  if (command.operation === RAILWAY_AI_AGENT_DRAFT_OPERATION) {
    const parsed = parseAiAgentSaveDraftRequest(command.payload);
    if (JSON.stringify(parsed) !== JSON.stringify(command.payload)) {
      throw new Error("Railway AI agent draft is not canonical");
    }
    return;
  }
  const parsed = parseAiAgentPublishDraftRequest(command.payload);
  if (parsed === null || JSON.stringify(parsed) !== JSON.stringify(command.payload)) {
    throw new Error("Railway AI agent publication is invalid");
  }
}

function inlineManager(
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
  command: Readonly<RailwayAiAgentMutationCommand>,
): RailwayAiAgentMutationState {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }
  const state = parseRailwayAiAgentMutationState(
    command.operation,
    command.payload,
    parsed,
  );
  if (state === null) throw new Error("PostgreSQL returned invalid AI agent state");
  return state;
}

async function loadReceipt(
  transaction: PostgresTransaction,
  command: Readonly<RailwayAiAgentMutationCommand>,
): Promise<RailwayAiAgentMutationResult> {
  const result = await transaction.query<Record<string, unknown>>(
    postgresRailwayAiAgentMutationSql.lockReceipt,
    [command.session.tenantId, command.operation, command.idempotencyKey],
  );
  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL AI agent receipt is unavailable");
  }
  const receipt = result.rows[0];
  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, state: null };
  }
  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL AI agent receipt is incomplete");
  }
  return Object.freeze({
    outcome: "replayed" as const,
    tenantId: command.session.tenantId,
    state: parseStoredState(receipt.responseJson, command),
  });
}

async function executeDomain(
  transaction: PostgresTransaction,
  command: Readonly<RailwayAiAgentMutationCommand>,
  operationalReadiness: AiOperationalReadinessProvider,
): Promise<RailwayAiAgentMutationState> {
  const transactions = inlineManager(transaction);
  const service = createAiAgentService({
    agents: createPostgresAiAgentRepository({ queries: transaction, transactions }),
    knowledgeSources: createPostgresKnowledgeSourceRepository({
      queries: transaction,
      transactions,
    }),
    operationalReadiness,
  });
  if (command.operation === RAILWAY_AI_AGENT_DRAFT_OPERATION) {
    const result = await service.saveDraft(command.session, command.payload);
    return parseStoredState({
      outcome: result.outcome,
      agent: toAiAgentSummaryView(result.agent),
      draftVersion: toAiAgentVersionView(result.draftVersion),
    }, command);
  }
  const result = await service.publishDraft(command.session, command.payload);
  // Recheck after any wait on the agent/version locks. Worker health may have
  // expired while this transaction was waiting; rollback includes publication.
  const final = await operationalReadiness.readForTenant(command.session.tenantId, result.publishedVersion.definition);
  const issues = [
    ...(!final.providerReady ? ["provider-required" as const] : []),
    ...(!final.billingPolicyApproved ? ["billing-policy-required" as const] : []),
    ...(!final.handoffPolicyApproved ? ["handoff-policy-required" as const] : []),
    ...(!final.auditSinkReady ? ["audit-sink-required" as const] : []),
  ];
  if (issues.length > 0) throw new AiAgentActivationError(issues);
  return parseStoredState({
    outcome: result.outcome,
    agent: toAiAgentSummaryView(result.agent),
    publishedVersion: toAiAgentVersionView(result.publishedVersion),
  }, command);
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayAiAgentMutationCommand>,
  operationalReadiness: AiOperationalReadinessProvider,
): Promise<RailwayAiAgentMutationResult> {
  await transaction.query(paidAccessTenantBarrier, [command.session.tenantId]);
  const actor = await transaction.query(postgresRailwayAiAgentMutationSql.lockActor,
    [command.session.tenantId, command.session.externalUserId, command.session.role]);
  if (requireRowCount(actor, 1) !== 1) throw new Error("AI mutation authorization is unavailable");
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayAiAgentMutationSql.claimReceipt,
    [
      command.session.tenantId, command.operation, command.idempotencyKey,
      command.requestDigest, command.session.externalUserId,
    ],
  );
  const count = requireRowCount(claimed, 1);
  if (count === 0) return loadReceipt(transaction, command);
  if (claimed.rows[0]?.idempotencyKey !== command.idempotencyKey) {
    throw new Error("PostgreSQL returned an invalid AI agent claim");
  }
  if (command.operation !== RAILWAY_AI_AGENT_DRAFT_OPERATION) {
    await transaction.query(postgresRailwayAiAgentMutationSql.lockSources,
      [command.session.tenantId, parseAiAgentPublishDraftRequest(command.payload)!.aiAgentVersionKey]);
  }
  const state = await executeDomain(transaction, command, operationalReadiness);
  const version = "draftVersion" in state
    ? state.draftVersion
    : state.publishedVersion;
  const audit = await transaction.query(
    postgresRailwayAiAgentMutationSql.insertAudit,
    [
      command.session.tenantId, command.session.externalUserId,
      command.operation, state.agent.aiAgentKey, command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        outcome: state.outcome,
        resultingAgentVersion: state.agent.version,
        resultingVersionKey: version.aiAgentVersionKey,
        resultingVersionNumber: version.versionNumber,
      }),
    ],
  );
  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL AI agent audit failed");
  }
  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayAiAgentMutationSql.completeReceipt,
    [
      command.session.tenantId, command.operation, command.idempotencyKey,
      command.requestDigest, JSON.stringify(state),
    ],
  );
  if (
    requireRowCount(completed, 1) !== 1 ||
    completed.rows[0]?.idempotencyKey !== command.idempotencyKey
  ) {
    throw new Error("PostgreSQL AI agent receipt completion failed");
  }
  return Object.freeze({
    outcome: "committed" as const,
    tenantId: command.session.tenantId,
    state,
  });
}

export function createPostgresRailwayAiAgentMutationExecutor(
  transactions: PostgresTransactionManager,
  operationalReadiness: AiOperationalReadinessProvider | ((transaction: PostgresTransaction) => AiOperationalReadinessProvider) =
    unavailableAiOperationalReadinessProvider,
): RailwayAiAgentMutationExecutor {
  if (
    typeof transactions?.transaction !== "function" ||
    (typeof operationalReadiness !== "function" && typeof operationalReadiness?.readForTenant !== "function")
  ) {
    throw new Error("PostgreSQL AI agent mutation dependencies are invalid");
  }
  return Object.freeze({
    async execute(command: Readonly<RailwayAiAgentMutationCommand>) {
      try {
        validateCommand(command);
        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) =>
            executeTransaction(transaction, command, typeof operationalReadiness === "function" ? operationalReadiness(transaction) : operationalReadiness),
        );
      } catch (error) {
        if (error instanceof AiAgentActivationError) {
          return Object.freeze({
            outcome: "activation-blocked" as const,
            tenantId: null,
            state: null,
            issues: Object.freeze([...error.issues]),
          });
        }
        if (error instanceof AiAgentServiceError) {
          if (error.code === "NOT_FOUND") {
            return { outcome: "not-found" as const, tenantId: null, state: null };
          }
          if (error.code === "STATE_CONFLICT") {
            return { outcome: "conflict" as const, tenantId: null, state: null };
          }
          if (error.code === "INVALID_STATE") {
            return { outcome: "invalid-state" as const, tenantId: null, state: null };
          }
        }
        if (error instanceof AiAgentInputError) {
          return { outcome: "unavailable" as const, tenantId: null, state: null };
        }
        return { outcome: "unavailable" as const, tenantId: null, state: null };
      }
    },
  });
}
