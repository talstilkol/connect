import { MessageTemplateLockedError } from "../../db/messageTemplateRepository.ts";
import { createMessageTemplateService, parseMessageTemplateDraftInput } from "../templates/messageTemplateService.ts";
import { toMessageTemplateView } from "../templates/messageTemplateView.ts";
import { parseRailwayMessageTemplateDraftView } from "../templates/railwayMessageTemplateDraftResult.ts";
import { createPostgresMessageTemplateRepository } from "./postgresMessageTemplateRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION,
  type RailwayMessageTemplateDraftMutationCommand,
  type RailwayMessageTemplateDraftMutationExecutor,
  type RailwayMessageTemplateDraftMutationResult,
} from "./railwayMessageTemplateDraftMutationExecutor.ts";

const requestDigestPattern = /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayMessageTemplateDraftMutationSql = Object.freeze({
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
    VALUES ($1, $2, $3, 'message_template', $4, $5, $6)
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

function canonicalDraft(value: ReturnType<typeof parseMessageTemplateDraftInput>) {
  return {
    name: value.name,
    category: value.category,
    language: value.language,
    header: value.header,
    body: value.body,
    footer: value.footer,
    variableExamples: { ...value.variableExamples },
    buttonMode: value.buttonMode,
    quickReplies: [...value.quickReplies],
    urlButton: { ...value.urlButton },
    phoneButton: { ...value.phoneButton },
  };
}

function validateCommand(
  command: Readonly<RailwayMessageTemplateDraftMutationCommand>,
) {
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
    command.operation !== RAILWAY_MESSAGE_TEMPLATE_DRAFT_OPERATION ||
    !idempotencyKeyPattern.test(command.idempotencyKey) ||
    !requestDigestPattern.test(command.requestDigest)
  ) {
    throw new Error("Railway message template command is invalid");
  }

  const parsed = parseMessageTemplateDraftInput(command.payload);

  if (
    JSON.stringify(canonicalDraft(parsed)) !==
      JSON.stringify(canonicalDraft(command.payload))
  ) {
    throw new Error("Railway message template command is not canonical");
  }

  return parsed;
}

function parseStoredTemplate(value: unknown) {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }

  const template = parseRailwayMessageTemplateDraftView(parsed);

  if (template === null) {
    throw new Error("PostgreSQL returned an invalid template response");
  }

  return template;
}

async function loadExistingReceipt(
  transaction: PostgresTransaction,
  command: Readonly<RailwayMessageTemplateDraftMutationCommand>,
): Promise<RailwayMessageTemplateDraftMutationResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayMessageTemplateDraftMutationSql.lockReceipt,
    [command.session.tenantId, command.operation, command.idempotencyKey],
  );

  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL mutation receipt is unavailable");
  }

  const receipt = result.rows[0];

  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, template: null };
  }

  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL mutation receipt is incomplete");
  }

  return Object.freeze({
    outcome: "replayed",
    tenantId: command.session.tenantId,
    template: parseStoredTemplate(receipt.responseJson),
  });
}

async function commitNewMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayMessageTemplateDraftMutationCommand>,
  payload: ReturnType<typeof parseMessageTemplateDraftInput>,
): Promise<RailwayMessageTemplateDraftMutationResult> {
  const service = createMessageTemplateService(
    createPostgresMessageTemplateRepository({
      queries: transaction,
      transactions: createInlineTransactionManager(transaction),
    }),
  );
  const saved = await service.saveDraft(command.session, payload);
  const template = parseRailwayMessageTemplateDraftView(
    toMessageTemplateView(saved),
  );

  if (template === null) {
    throw new Error("PostgreSQL returned an invalid template response");
  }

  const audit = await transaction.query(
    postgresRailwayMessageTemplateDraftMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      command.operation,
      template.templateKey,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        category: template.category,
        language: template.language,
        versionedState: "draft",
      }),
    ],
  );

  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL audit write failed");
  }

  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayMessageTemplateDraftMutationSql.completeReceipt,
    [
      command.session.tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      JSON.stringify(template),
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
    template,
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayMessageTemplateDraftMutationCommand>,
  payload: ReturnType<typeof parseMessageTemplateDraftInput>,
): Promise<RailwayMessageTemplateDraftMutationResult> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayMessageTemplateDraftMutationSql.claimReceipt,
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

  return commitNewMutation(transaction, command, payload);
}

export function createPostgresRailwayMessageTemplateDraftMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayMessageTemplateDraftMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL transaction manager is invalid");
  }

  const executor: RailwayMessageTemplateDraftMutationExecutor = {
    async execute(command) {
      try {
        const payload = validateCommand(command);

        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(transaction, command, payload),
        );
      } catch (error) {
        if (error instanceof MessageTemplateLockedError) {
          return { outcome: "not-editable", tenantId: null, template: null };
        }

        return { outcome: "unavailable", tenantId: null, template: null };
      }
    },
  };

  return Object.freeze(executor);
}
