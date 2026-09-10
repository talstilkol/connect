import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import { deriveTenantProvisioningKey } from
  "../onboarding/tenantProvisioningKey.ts";
import { createPostgresBusinessProfileRepository } from
  "./postgresBusinessProfileRepository.ts";
import { createPostgresClerkOrganizationBindingRepository } from
  "./postgresClerkOrganizationBindingRepository.ts";
import { createPostgresTenantProvisioningRepository } from
  "./postgresTenantProvisioningRepository.ts";
import type { TenantId } from "../../shared/domain/model.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
  parseRailwayOnboardingBusinessProfileMutationState,
  type RailwayOnboardingBusinessProfileMutationCommand,
  type RailwayOnboardingBusinessProfileMutationExecutor,
  type RailwayOnboardingBusinessProfileMutationResult,
  type RailwayOnboardingBusinessProfileMutationState,
} from "./railwayOnboardingBusinessProfileMutationExecutor.ts";

const requestDigestPattern = /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[0-9a-f]{64}$/;
const provisioningKeyPattern = /^tenant_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayOnboardingBusinessProfileMutationSql =
  Object.freeze({
    findTenantByProvisioningKey: `
      SELECT id AS "tenantId"
      FROM tenants
      WHERE provisioning_key = $1
      FOR UPDATE
    `,
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
      VALUES ($1, $2, $3, 'business_profile', ($1::bigint)::text, $4, $5)
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

class OnboardingMutationConflictError extends Error {}

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
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error("PostgreSQL returned an invalid tenant identity");
  }
  return Number(value);
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

function validateCommand(
  command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
): void {
  const validation = validatePersistedBusinessProfile(command?.payload);
  if (
    !command ||
    typeof command !== "object" ||
    command.operation !== RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION ||
    typeof command.identity?.externalUserId !== "string" ||
    command.identity.externalUserId.length === 0 ||
    command.identity.externalUserId.length > 255 ||
    command.identity.externalUserId.trim() !== command.identity.externalUserId ||
    controlCharacterPattern.test(command.identity.externalUserId) ||
    typeof command.identity.externalOrganizationId !== "string" ||
    command.identity.externalOrganizationId.length === 0 ||
    command.identity.externalOrganizationId.length > 255 ||
    command.identity.externalOrganizationId.trim() !==
      command.identity.externalOrganizationId ||
    controlCharacterPattern.test(command.identity.externalOrganizationId) ||
    (command.session !== null &&
      (!Number.isSafeInteger(command.session?.tenantId) ||
        command.session.tenantId <= 0 ||
        command.session.externalUserId !== command.identity.externalUserId)) ||
    !idempotencyKeyPattern.test(command.idempotencyKey) ||
    !requestDigestPattern.test(command.requestDigest) ||
    !validation.success ||
    Object.keys(command.payload).sort().join(",") !==
      "businessName,interfaceLanguage,timezone" ||
    JSON.stringify(validation.value) !== JSON.stringify(command.payload)
  ) {
    throw new Error("Railway onboarding business profile command is invalid");
  }
}

async function ensureClerkOrganizationBinding(
  transaction: PostgresTransaction,
  tenantId: number,
  command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
): Promise<void> {
  await createPostgresClerkOrganizationBindingRepository(
    transaction,
  ).ensureBinding({
    tenantId: tenantId as TenantId,
    externalOrganizationId: command.identity.externalOrganizationId!,
  });
}

function parseStoredState(
  value: unknown,
  command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
): RailwayOnboardingBusinessProfileMutationState {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }
  const state = parseRailwayOnboardingBusinessProfileMutationState(
    command.payload,
    parsed,
  );
  if (state === null) {
    throw new Error("PostgreSQL returned an invalid onboarding state");
  }
  return state;
}

async function loadExistingReceipt(
  transaction: PostgresTransaction,
  tenantId: number,
  command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
): Promise<Readonly<{
  outcome: "replayed";
  tenantId: number;
  state: RailwayOnboardingBusinessProfileMutationState;
}>> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayOnboardingBusinessProfileMutationSql.lockReceipt,
    [tenantId, command.operation, command.idempotencyKey],
  );
  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL onboarding receipt is unavailable");
  }
  const receipt = result.rows[0];
  if (receipt.requestDigest !== command.requestDigest) {
    throw new OnboardingMutationConflictError();
  }
  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL onboarding receipt is incomplete");
  }
  return Object.freeze({
    outcome: "replayed" as const,
    tenantId,
    state: parseStoredState(receipt.responseJson, command),
  });
}

async function claimReceipt(
  transaction: PostgresTransaction,
  tenantId: number,
  command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
): Promise<Readonly<{
  outcome: "replayed";
  tenantId: number;
  state: RailwayOnboardingBusinessProfileMutationState;
}> | null> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayOnboardingBusinessProfileMutationSql.claimReceipt,
    [
      tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      command.identity.externalUserId,
    ],
  );
  if (requireRowCount(claimed, 1) === 0) {
    return loadExistingReceipt(transaction, tenantId, command);
  }
  if (claimed.rows[0]?.idempotencyKey !== command.idempotencyKey) {
    throw new Error("PostgreSQL returned an invalid onboarding claim");
  }
  return null;
}

async function findProvisionedTenantId(
  transaction: PostgresTransaction,
  provisioningKey: string,
): Promise<number | null> {
  if (!provisioningKeyPattern.test(provisioningKey)) {
    throw new Error("Onboarding provisioning identity is invalid");
  }
  const result = await transaction.query<{ tenantId: unknown }>(
    postgresRailwayOnboardingBusinessProfileMutationSql
      .findTenantByProvisioningKey,
    [provisioningKey],
  );
  return requireRowCount(result, 1) === 0
    ? null
    : requirePositiveInteger(result.rows[0]?.tenantId);
}

async function persistProfile(
  transaction: PostgresTransaction,
  command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
): Promise<
  | Readonly<{
      outcome: "new";
      tenantId: number;
      state: RailwayOnboardingBusinessProfileMutationState;
    }>
  | Readonly<{
      outcome: "replayed";
      tenantId: number;
      state: RailwayOnboardingBusinessProfileMutationState;
    }>
> {
  const inlineTransactions = createInlineTransactionManager(transaction);
  if (command.session === null) {
    const provisioningKey = await deriveTenantProvisioningKey(
      command.identity.externalUserId,
    );
    const existingTenantId = await findProvisionedTenantId(
      transaction,
      provisioningKey,
    );
    if (existingTenantId !== null) {
      await ensureClerkOrganizationBinding(
        transaction,
        existingTenantId,
        command,
      );
      const replay = await claimReceipt(
        transaction,
        existingTenantId,
        command,
      );
      if (replay !== null) {
        return Object.freeze({
          outcome: "replayed" as const,
          tenantId: replay.tenantId,
          state: replay.state,
        });
      }
    }
    const workspace = await createPostgresTenantProvisioningRepository({
      queries: transaction,
      transactions: inlineTransactions,
    }).provisionOwnerWorkspace({
      provisioningKey,
      externalUserId: command.identity.externalUserId,
      ...command.payload,
    });
    await ensureClerkOrganizationBinding(
      transaction,
      workspace.tenantId,
      command,
    );
    if (existingTenantId === null) {
      const replay = await claimReceipt(
        transaction,
        workspace.tenantId,
        command,
      );
      if (replay !== null) {
        return Object.freeze({
          outcome: "replayed" as const,
          tenantId: replay.tenantId,
          state: replay.state,
        });
      }
    }
    return Object.freeze({
      outcome: "new" as const,
      tenantId: workspace.tenantId,
      state: Object.freeze({
        createdTenant: true,
        profile: Object.freeze({
          businessName: workspace.businessName,
          timezone: workspace.timezone,
          interfaceLanguage: workspace.interfaceLanguage,
          version: workspace.profileVersion,
        }),
      }),
    });
  }

  await ensureClerkOrganizationBinding(
    transaction,
    command.session.tenantId,
    command,
  );
  const replay = await claimReceipt(
    transaction,
    command.session.tenantId,
    command,
  );
  if (replay !== null) {
    return Object.freeze({
      outcome: "replayed" as const,
      tenantId: replay.tenantId,
      state: replay.state,
    });
  }
  const profiles = createPostgresBusinessProfileRepository({
    queries: transaction,
    transactions: inlineTransactions,
  });
  await profiles.save({
    tenantId: command.session.tenantId,
    ...command.payload,
  });
  const profile = await profiles.findByTenantId(command.session.tenantId);
  if (profile === null) {
    throw new Error("PostgreSQL did not return the onboarding profile");
  }
  return Object.freeze({
    outcome: "new" as const,
    tenantId: command.session.tenantId,
    state: Object.freeze({
      createdTenant: false,
      profile: Object.freeze({
        businessName: profile.businessName,
        timezone: profile.timezone,
        interfaceLanguage: profile.interfaceLanguage,
        version: profile.version,
      }),
    }),
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
): Promise<RailwayOnboardingBusinessProfileMutationResult> {
  const persisted = await persistProfile(transaction, command);
  if (persisted.outcome === "replayed") {
    return Object.freeze({
      outcome: "replayed" as const,
      tenantId: persisted.tenantId,
      state: persisted.state,
    });
  }
  const state = parseRailwayOnboardingBusinessProfileMutationState(
    command.payload,
    persisted.state,
  );
  if (state === null) {
    throw new Error("PostgreSQL returned invalid onboarding state");
  }
  const audit = await transaction.query(
    postgresRailwayOnboardingBusinessProfileMutationSql.insertAudit,
    [
      persisted.tenantId,
      command.identity.externalUserId,
      command.operation,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        createdTenant: state.createdTenant,
        clerkOrganizationBound: true,
        resultingVersion: state.profile.version,
      }),
    ],
  );
  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL onboarding audit write failed");
  }
  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayOnboardingBusinessProfileMutationSql.completeReceipt,
    [
      persisted.tenantId,
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
    throw new Error("PostgreSQL onboarding receipt completion failed");
  }
  return Object.freeze({
    outcome: "committed" as const,
    tenantId: persisted.tenantId,
    state,
  });
}

export function createPostgresRailwayOnboardingBusinessProfileMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayOnboardingBusinessProfileMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL onboarding dependencies are invalid");
  }
  const executor: RailwayOnboardingBusinessProfileMutationExecutor = {
    async execute(
      command: Readonly<RailwayOnboardingBusinessProfileMutationCommand>,
    ): Promise<RailwayOnboardingBusinessProfileMutationResult> {
      try {
        validateCommand(command);
        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(transaction, command),
        );
      } catch (error) {
        return error instanceof OnboardingMutationConflictError
          ? { outcome: "conflict" as const, tenantId: null, state: null }
          : { outcome: "unavailable" as const, tenantId: null, state: null };
      }
    },
  };
  return Object.freeze(executor);
}
