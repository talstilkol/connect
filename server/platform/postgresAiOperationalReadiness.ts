import type { AiOperationalReadinessProvider } from "../ai/aiOperationalReadiness.ts";
import type { ValidatedAiAgentDefinition } from "../../shared/domain/aiAgent.ts";
import { inspectOpenAiResponsesConfiguration, type OpenAiResponsesEnvironment } from "../ai/openAiResponsesConfiguration.ts";
import { workerSchedulerOwnerKeyPattern } from "../../shared/domain/workerScheduler.ts";
import type { PostgresQueryExecutor } from "./postgresTransaction.ts";

export function createPostgresAiWorkerHealth(queries: PostgresQueryExecutor) {
  return Object.freeze({
    async report(ownerKey: string, environment: OpenAiResponsesEnvironment, deliveryAndHandoffConfigured: boolean) {
      if (!workerSchedulerOwnerKeyPattern.test(ownerKey)) throw new Error("AI worker identity is invalid");
      const inspected = inspectOpenAiResponsesConfiguration(environment);
      const ready = inspected.status === "configured" && deliveryAndHandoffConfigured;
      await queries.query(`INSERT INTO ai_runtime_worker_health(owner_key,ready,rate_card_valid_until)
        VALUES($1,$2,$3::timestamptz) ON CONFLICT(owner_key) DO UPDATE
        SET ready=EXCLUDED.ready,rate_card_valid_until=EXCLUDED.rate_card_valid_until,observed_at=clock_timestamp()`,
      [ownerKey, ready, ready && inspected.status === "configured" ? inspected.configuration.rateCard.validUntil : null]);
    },
    async clear(ownerKey: string) {
      if (!workerSchedulerOwnerKeyPattern.test(ownerKey)) throw new Error("AI worker identity is invalid");
      await queries.query("DELETE FROM ai_runtime_worker_health WHERE owner_key=$1", [ownerKey]);
    },
  });
}

export function createPostgresAiOperationalReadiness(queries: PostgresQueryExecutor): AiOperationalReadinessProvider {
  return Object.freeze({
    async readForTenant(tenantId: number, definition: ValidatedAiAgentDefinition) {
      if (!Number.isSafeInteger(tenantId) || tenantId < 1) throw new Error("AI readiness tenant is invalid");
      // In a publication transaction these row locks last through publication,
      // receipt and audit. On a details read this is only a current observation.
      const tenant = await queries.query("SELECT id FROM tenants WHERE id=$1 AND status IN ('trial','active','payment_failed') FOR SHARE", [tenantId]);
      const staff = await queries.query("SELECT external_user_id FROM tenant_memberships WHERE tenant_id=$1 AND status='active' AND role IN ('owner','manager') ORDER BY external_user_id FOR SHARE", [tenantId]);
      const facts = await queries.query<{ worker_ready: boolean; paid: boolean; audit_ready: boolean }>(`SELECT
        public.ai_runtime_workers_ready_v1() AS worker_ready,
        public.tenant_paid_access_allowed_v1($1) AS paid,
        has_table_privilege(current_user,'public.ai_runtime_audit_events','INSERT') AND
        has_table_privilege(current_user,'public.audit_logs','INSERT') AS audit_ready`, [tenantId]);
      const row = facts.rows[0];
      if (!row || facts.rowCount !== 1 || [row.worker_ready,row.paid,row.audit_ready].some(value => typeof value !== "boolean")) throw new Error("AI readiness is unavailable");
      return Object.freeze({
        providerReady: tenant.rowCount === 1 && row.worker_ready,
        billingPolicyApproved: tenant.rowCount === 1 && row.paid && definition?.billingCurrency === "USD" && Number.isSafeInteger(definition.monthlyCostLimitMinorUnits) && Number(definition.monthlyCostLimitMinorUnits) > 0,
        handoffPolicyApproved: tenant.rowCount === 1 && staff.rowCount > 0 && definition?.responseMode === "agent-approval" && definition.handoffMessage.trim().length > 0,
        auditSinkReady: row.audit_ready,
      });
    },
  });
}
