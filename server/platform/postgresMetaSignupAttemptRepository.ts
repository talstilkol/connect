import { claimMetaSignupLaunch, finishMetaSignupLaunch, lockMetaSignupLaunchTenant } from './postgresMetaSignupLaunchRepository.ts';
import { isMetaSignupLaunchId } from '../meta/metaSignupLaunch.ts';
import { enqueueMetaCoexistenceSyncJob } from './postgresMetaCoexistenceSyncJobRepository.ts';
import { requireTenantPermission } from "../auth/tenantSession.ts";
import {
  META_SIGNUP_COMPLETE_OPERATION,
  parseMetaSignupAttemptResult,
  type MetaSignupAttemptCommand,
  type MetaSignupAttemptRepository,
} from "../meta/metaSignupAttempt.ts";
import type { PostgresQueryResult, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";

export const postgresMetaSignupAttemptSql = Object.freeze({
  claim: `INSERT INTO railway_api_mutation_receipts
    (tenant_id, operation, idempotency_key, request_digest, actor_external_user_id, status)
    VALUES ($1, $2, $3, $4, $5, 'processing')
    ON CONFLICT (tenant_id, operation, idempotency_key) DO NOTHING
    RETURNING idempotency_key AS "claimKey"`,
  read: `SELECT request_digest AS "requestDigest", actor_external_user_id AS "actor", status,
      response_json AS "responseJson"
    FROM railway_api_mutation_receipts
    WHERE tenant_id = $1 AND operation = $2 AND idempotency_key = $3 FOR UPDATE`,
  complete: `UPDATE railway_api_mutation_receipts SET status = 'completed', response_json = $6,
      completed_at = CURRENT_TIMESTAMP
    WHERE tenant_id = $1 AND operation = $2 AND idempotency_key = $3
      AND request_digest = $4 AND actor_external_user_id = $5 AND status = 'processing'
    RETURNING idempotency_key AS "claimKey"`,
  audit: `INSERT INTO audit_logs
    (tenant_id, actor_external_user_id, action, target_type, target_id, idempotency_key, metadata_json)
    VALUES ($1, $2, $3, 'meta_signup_attempt', $4, $4, $5) RETURNING id`,
});

function count(result: Readonly<PostgresQueryResult<unknown>>): number {
  if (!Number.isSafeInteger(result.rowCount) || result.rowCount < 0 || result.rowCount > 1 ||
    !Array.isArray(result.rows) || result.rows.length !== result.rowCount) {
    throw new Error("Meta signup attempt persistence is unavailable");
  }
  return result.rowCount;
}

function parameters(command: MetaSignupAttemptCommand) {
  requireTenantPermission(command.session, "workspace.manage");
  if (command.synchronizeBusinessApp !== undefined &&
    (command.synchronizeBusinessApp !== true || command.launchId === undefined)) {
    throw new Error('Meta signup synchronization scope is invalid');
  }
  if ((command.launchId !== undefined || command.launchConfigurationKey !== undefined) &&
    (!isMetaSignupLaunchId(command.launchId) || typeof command.launchConfigurationKey !== 'string' || !/^[0-9a-f]{64}$/.test(command.launchConfigurationKey))) {
    throw new Error('Meta signup launch scope is invalid');
  }
  if (!Number.isSafeInteger(command.session.tenantId) || command.session.tenantId <= 0 ||
    !/^connect_idempotency_v1_[0-9a-f]{64}$/.test(command.claimKey) ||
    !/^railway_mutation_request_v1_[0-9a-f]{64}$/.test(command.requestDigest) ||
    typeof command.session.externalUserId !== "string" || command.session.externalUserId.trim() !== command.session.externalUserId ||
    command.session.externalUserId.length < 1 || command.session.externalUserId.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(command.session.externalUserId)) {
    throw new Error("Meta signup attempt scope is invalid");
  }
  return [command.session.tenantId, META_SIGNUP_COMPLETE_OPERATION, command.claimKey,
    command.requestDigest, command.session.externalUserId] as const;
}

async function audit(transaction: PostgresTransaction, command: MetaSignupAttemptCommand,
  phase: "started" | "finished", metadata: object): Promise<void> {
  const result = await transaction.query(postgresMetaSignupAttemptSql.audit, [
    command.session.tenantId, command.session.externalUserId, `meta.embedded-signup.${phase}`,
    command.claimKey, JSON.stringify(metadata),
  ]);
  if (count(result) !== 1) throw new Error("Meta signup attempt audit is unavailable");
}

export function createPostgresMetaSignupAttemptRepository(
  transactions: PostgresTransactionManager,
): MetaSignupAttemptRepository {
  return {
    async claim(command) {
      const values = parameters(command);
      return transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        let baselineConnectionVersion: number | null | undefined;
        if (command.launchId !== undefined) {
          await lockMetaSignupLaunchTenant(tx, command.session);
          const existing = await tx.query(postgresMetaSignupAttemptSql.read, values.slice(0, 3));
          if (count(existing) === 0) baselineConnectionVersion = await claimMetaSignupLaunch(tx, command);
        }
        const claimed = await tx.query<{ claimKey: string }>(postgresMetaSignupAttemptSql.claim, values);
        if (count(claimed) === 1) {
          if (claimed.rows[0].claimKey !== command.claimKey) throw new Error("Meta signup claim is invalid");
          await audit(tx, command, "started", { requestDigest: command.requestDigest });
          return { outcome: "claimed" as const, ...(command.launchId === undefined ? {} : { baselineConnectionVersion }) };
        }
        const stored = await tx.query<{ requestDigest: string; actor: string; status: string; responseJson: unknown }>(
          postgresMetaSignupAttemptSql.read, values.slice(0, 3),
        );
        if (count(stored) !== 1) throw new Error("Meta signup receipt is unavailable");
        const row = stored.rows[0];
        if (row.requestDigest !== command.requestDigest || row.actor !== command.session.externalUserId) {
          return { outcome: "conflict" as const };
        }
        if (row.status === "processing" && row.responseJson === null) return { outcome: "in-progress" as const };
        const result = parseMetaSignupAttemptResult(row.responseJson);
        if (row.status !== "completed" || result === null) throw new Error("Meta signup receipt is invalid");
        return { outcome: "completed" as const, result };
      });
    },
    async complete(command, input) {
      const values = parameters(command);
      const result = parseMetaSignupAttemptResult(input);
      if (result === null) throw new Error("Meta signup result is invalid");
      await transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        const completed = await tx.query<{ claimKey: string }>(postgresMetaSignupAttemptSql.complete, [
          ...values, JSON.stringify(result),
        ]);
        if (count(completed) !== 1 || completed.rows[0].claimKey !== command.claimKey) {
          throw new Error("Meta signup attempt completion is unavailable");
        }
        if (command.launchId !== undefined) await finishMetaSignupLaunch(tx, command);
        if (command.synchronizeBusinessApp && result.status === 'connected') {
          await enqueueMetaCoexistenceSyncJob(tx, command);
        }
        await audit(tx, command, "finished", result);
      });
    },
  };
}
