import { paidAccessTenantBarrier, paidAccessTenantSql } from "./postgresPaidAccess.ts";
import type { AiResponseGenerationResult, AiUsageRecord } from "../../shared/domain/aiRuntime.ts";
import { validateAiAgentDefinition } from "../../shared/validation/aiAgentDefinition.ts";
import { deriveAiAgentVersionKey } from "../ai/aiAgentKey.ts";
import type { AiGenerationBinding, AiGenerationClaim, AiGenerationJournal, AiGenerationObservation } from "../ai/aiGenerationJournal.ts";
import { isRecord, validInteger } from "../ai/openAiResponsesConfiguration.ts";
import { parsePostgresNonnegativeInteger, parsePostgresPositiveInteger, requirePostgresRows } from "./postgresResultValidation.ts";
import { postgresAiGenerationSql as sql } from "./postgresAiGenerationSql.ts";
import type { PostgresParameter, PostgresQueryExecutor, PostgresTransactionManager } from "./postgresTransaction.ts";

const digestPattern = /^[a-f0-9]{64}$/;
const periodPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;
const failure = () => new Error("AI generation journal validation failed");

function bindingSnapshot(input: AiGenerationBinding): AiGenerationBinding {
  if (!input || !validInteger(input.tenantId, 1, Number.MAX_SAFE_INTEGER) ||
    !/^ai_provider_request_v1_[a-f0-9]{64}$/.test(input.requestKey) ||
    !/^ai_agent_version_v1_[a-f0-9]{64}$/.test(input.aiAgentVersionKey) ||
    !digestPattern.test(input.inputDigest) || !digestPattern.test(input.policyDigest)) throw failure();
  return Object.freeze({ ...input });
}

function usageSnapshot(input: unknown): AiUsageRecord {
  if (!isRecord(input) || !validInteger(input.inputTokens, 0, 10_000_000) ||
    !validInteger(input.outputTokens, 1, 16_384) || !validInteger(input.costMinorUnits, 0, Number.MAX_SAFE_INTEGER) ||
    input.currency !== "USD") throw failure();
  return { inputTokens: input.inputTokens, outputTokens: input.outputTokens, costMinorUnits: input.costMinorUnits, currency: "USD" };
}

function resultSnapshot(input: unknown): AiResponseGenerationResult {
  if (!isRecord(input)) throw failure();
  const usage = input.usage === undefined ? undefined : usageSnapshot(input.usage);
  if (input.outcome === "generated") {
    if (!usage || typeof input.text !== "string" || input.text.trim().length === 0 || input.text.length > 4096 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.text) ||
      !Array.isArray(input.groundedPassageKeys) || input.groundedPassageKeys.length < 1 || input.groundedPassageKeys.length > 20 ||
      input.groundedPassageKeys.some((key) => typeof key !== "string" || !/^knowledge_passage_v1_[a-f0-9]{64}$/.test(key)) ||
      new Set(input.groundedPassageKeys).size !== input.groundedPassageKeys.length) throw failure();
    return { outcome: "generated", text: input.text, groundedPassageKeys: [...input.groundedPassageKeys], usage };
  }
  if (input.outcome !== "policy-violation" && input.outcome !== "unavailable") throw failure();
  return usage ? { outcome: input.outcome, usage } : { outcome: input.outcome };
}

async function one(tx: PostgresQueryExecutor, statement: string, parameters: readonly PostgresParameter[]) {
  const rows = requirePostgresRows(await tx.query<Record<string, unknown>>(statement, parameters), 1);
  return rows[0] ?? null;
}

function observeRow(row: Record<string, unknown> | null, binding: AiGenerationBinding): AiGenerationObservation {
  if (!row) return { status: "missing" };
  if (parsePostgresPositiveInteger(row.tenantId) !== binding.tenantId || row.requestKey !== binding.requestKey ||
    row.aiAgentVersionKey !== binding.aiAgentVersionKey || row.inputDigest !== binding.inputDigest) throw failure();
  if (row.status === "claimed" && row.result === null && typeof row.expired === "boolean") return { status: "claimed", expired: row.expired };
  if (row.status !== "settled" && row.status !== "uncertain") throw failure();
  return { status: row.status, result: resultSnapshot(row.result) };
}

async function budget(tx: PostgresQueryExecutor, tenantId: number, agentKey: string, period: string): Promise<bigint> {
  const row = await one(tx, sql.budget, [tenantId, agentKey, period]);
  if (!row || typeof row.total !== "string" || !/^\d+$/.test(row.total)) throw failure();
  return BigInt(row.total);
}

export function createPostgresAiGenerationJournal(
  dependencies: Readonly<{ queries: PostgresQueryExecutor; transactions: PostgresTransactionManager }>,
): AiGenerationJournal {
  if (typeof dependencies?.queries?.query !== "function" || typeof dependencies?.transactions?.transaction !== "function") throw failure();
  return Object.freeze({
    async observe(input: AiGenerationBinding) {
      const binding = bindingSnapshot(input);
      return observeRow(await one(dependencies.queries, sql.observe, [binding.tenantId, binding.requestKey]), binding);
    },
    async admit(input: AiGenerationBinding) {
      const binding = bindingSnapshot(input);
      return dependencies.transactions.transaction({ isolationLevel: "read-committed" }, async tx => {
        await tx.query(paidAccessTenantBarrier, [binding.tenantId]);
        if (!await one(tx, paidAccessTenantSql, [binding.tenantId])) return false;
        const agent = await one(tx, sql.lockAgent, [binding.tenantId, binding.aiAgentVersionKey]);
        return !!agent && agent.status === "active" && agent.versionStatus === "published" && agent.activeVersionKey === binding.aiAgentVersionKey;
      });
    },
    async claim(input: AiGenerationClaim) {
      const binding = bindingSnapshot(input?.binding);
      const request = structuredClone(input.request);
      const { countedInputTokens, reservedMinorUnits, timeoutMs } = input;
      if (!request || request.tenantId !== binding.tenantId || request.requestKey !== binding.requestKey ||
        request.aiAgentVersionKey !== binding.aiAgentVersionKey || !Array.isArray(request.passages) ||
        request.passages.length === 0 || request.passages.length > 20 ||
        !validInteger(countedInputTokens, 1, 1_000_000) || !validInteger(reservedMinorUnits, 1, Number.MAX_SAFE_INTEGER) ||
        !validInteger(timeoutMs, 1000, 60_000)) throw failure();
      return dependencies.transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tx.query(paidAccessTenantBarrier, [binding.tenantId]);
        if (!await one(tx, paidAccessTenantSql, [binding.tenantId])) return { status: "denied" as const };
        const agent = await one(tx, sql.lockAgent, [binding.tenantId, binding.aiAgentVersionKey]);
        if (!agent) return { status: "denied" as const };
        const existing = observeRow(await one(tx, sql.observe, [binding.tenantId, binding.requestKey]), binding);
        if (existing.status !== "missing") return existing;
        const definition = validateAiAgentDefinition(agent.definition);
        if (!definition.success || typeof agent.aiAgentKey !== "string" || typeof agent.currentPeriod !== "string" ||
          !periodPattern.test(agent.currentPeriod) || agent.status !== "active" || agent.versionStatus !== "published" ||
          agent.activeVersionKey !== binding.aiAgentVersionKey) return { status: "denied" as const };
        const policy = definition.value;
        if (policy.billingCurrency !== "USD" || policy.responseMode !== "agent-approval" || policy.systemPrompt !== request.systemPrompt ||
          request.passages.some((passage) => !policy.knowledgeSourceKeys.includes(passage.sourceKey)) ||
          await deriveAiAgentVersionKey(binding.tenantId, agent.aiAgentKey, parsePostgresPositiveInteger(agent.versionNumber), policy) !== binding.aiAgentVersionKey) return { status: "denied" as const };
        const authorization = await one(tx, sql.authorization, [binding.tenantId, binding.requestKey]);
        if (!authorization || authorization.aiAgentKey !== agent.aiAgentKey || authorization.periodStart !== agent.currentPeriod ||
          authorization.currency !== "USD" || parsePostgresPositiveInteger(authorization.monthlyLimitMinorUnits) !== policy.monthlyCostLimitMinorUnits) return { status: "denied" as const };
        // A pre-journal usage row means this request already incurred a charge;
        // it may not acquire its first dispatch claim during an upgrade.
        if (await one(tx, sql.usage, [binding.tenantId, binding.requestKey])) return { status: "denied" as const };
        const blocked = await one(tx, sql.blocked, [binding.tenantId, agent.aiAgentKey, agent.currentPeriod]);
        if (!blocked || typeof blocked.blocked !== "boolean") throw failure();
        if (blocked.blocked || await budget(tx, binding.tenantId, agent.aiAgentKey, agent.currentPeriod) + BigInt(reservedMinorUnits) >
          BigInt(policy.monthlyCostLimitMinorUnits)) return { status: "denied" as const };
        const inserted = await one(tx, sql.insert, [binding.tenantId, binding.requestKey, agent.aiAgentKey, binding.aiAgentVersionKey,
          binding.inputDigest, binding.policyDigest, agent.currentPeriod, countedInputTokens, reservedMinorUnits, timeoutMs]);
        if (observeRow(inserted, binding).status !== "claimed") throw failure();
        return { status: "acquired" as const };
      });
    },
    async settle(input: AiGenerationBinding, generated: AiResponseGenerationResult) {
      const binding = bindingSnapshot(input);
      const captured = resultSnapshot(generated);
      return dependencies.transactions.transaction({ isolationLevel: "read-committed" }, async (tx) => {
        await tx.query(paidAccessTenantBarrier, [binding.tenantId]);
        // All claims and settlements share the agent lock, including version
        // changes. Incurred usage is recorded even if the agent was disabled.
        const agent = await one(tx, sql.lockAgent, [binding.tenantId, binding.aiAgentVersionKey]);
        if (!agent || typeof agent.aiAgentKey !== "string") throw failure();
        const row = await one(tx, sql.observe, [binding.tenantId, binding.requestKey]);
        const observation = observeRow(row, binding);
        if (observation.status === "missing" || !row || row.policyDigest !== binding.policyDigest) throw failure();
        if (row.reconciled === true || observation.status === "uncertain" && captured.usage) {
          // Preserve actual late usage after an operator decision. Contradictory
          // evidence re-blocks future generation until a fresh reviewed decision.
          if (captured.usage) await tx.query(sql.lateUsage, [binding.tenantId, binding.requestKey,
            captured.usage.inputTokens, captured.usage.outputTokens, captured.usage.costMinorUnits]);
          return { outcome: "unavailable" as const };
        }
        if (observation.status !== "claimed") return observation.result;
        if (row.aiAgentKey !== agent.aiAgentKey || typeof row.periodStart !== "string" || !periodPattern.test(row.periodStart)) throw failure();
        const reservation = parsePostgresPositiveInteger(row.reservedMinorUnits);
        const counted = parsePostgresPositiveInteger(row.countedInputTokens);
        const usage = captured.usage;
        const uncertain = !usage || usage.inputTokens > counted || usage.costMinorUnits > reservation;
        const result: AiResponseGenerationResult = uncertain ?
          (usage ? { outcome: "unavailable", usage } : { outcome: "unavailable" }) : captured;
        if (usage) {
          const authorization = await one(tx, sql.authorization, [binding.tenantId, binding.requestKey]);
          if (!authorization || authorization.currency !== "USD" || authorization.aiAgentKey !== agent.aiAgentKey ||
            authorization.periodStart !== row.periodStart) throw failure();
          const limit = parsePostgresPositiveInteger(authorization.monthlyLimitMinorUnits);
          const existing = await one(tx, sql.usage, [binding.tenantId, binding.requestKey]);
          if (existing) {
            if (existing.aiAgentKey !== agent.aiAgentKey || existing.periodStart !== row.periodStart || existing.currency !== "USD" ||
              parsePostgresNonnegativeInteger(existing.inputTokens) !== usage.inputTokens ||
              parsePostgresPositiveInteger(existing.outputTokens) !== usage.outputTokens ||
              parsePostgresNonnegativeInteger(existing.costMinorUnits) !== usage.costMinorUnits) throw failure();
          } else {
            const total = await budget(tx, binding.tenantId, agent.aiAgentKey, row.periodStart);
            const withinLimit = total - BigInt(reservation) + BigInt(usage.costMinorUnits) <= BigInt(limit);
            if (!await one(tx, sql.insertUsage, [binding.requestKey, binding.tenantId, agent.aiAgentKey, row.periodStart,
              usage.inputTokens, usage.outputTokens, usage.costMinorUnits, withinLimit])) throw failure();
          }
        }
        const persisted = observeRow(await one(tx, sql.settle, [binding.tenantId, binding.requestKey,
          uncertain ? "uncertain" : "settled", JSON.stringify(result)]), binding);
        if (persisted.status !== "settled" && persisted.status !== "uncertain") throw failure();
        return persisted.result;
      });
    },
  });
}
