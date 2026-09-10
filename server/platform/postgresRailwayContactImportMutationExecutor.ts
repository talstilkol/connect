import {
  ContactImportJobConflictError,
  ContactImportJobNotFoundError,
  createContactImportService,
  parseContactImportChunkInput,
  parseStartContactImportInput,
  type ProcessContactImportChunkRequest,
  type StartContactImportRequest,
} from "../contacts/contactImportService.ts";
import { toContactRecord } from "../contacts/contactRecordMapper.ts";
import {
  parseRailwayContactImportResponse,
  type RailwayContactImportResponse,
} from "../contacts/railwayContactImportResult.ts";
import {
  createPostgresContactImportRepository,
  postgresContactImportSql,
} from "./postgresContactImportRepository.ts";
import {
  createPostgresContactReadRepository,
} from "./postgresContactReadRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import {
  railwayContactImportMutationOperations,
  type RailwayContactImportMutationCommand,
  type RailwayContactImportMutationExecutor,
  type RailwayContactImportMutationOperation,
  type RailwayContactImportMutationResult,
} from "./railwayContactImportMutationExecutor.ts";

const requestDigestPattern =
  /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern =
  /^connect_idempotency_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayContactImportMutationSql = Object.freeze({
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
    VALUES ($1, $2, $3, 'contact_import_job', $4, $5, $6)
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

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();

  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function isOperation(
  value: unknown,
): value is RailwayContactImportMutationOperation {
  return typeof value === "string" &&
    railwayContactImportMutationOperations.some(
      (operation) => operation === value,
    );
}

function requirePayload(
  command: Readonly<RailwayContactImportMutationCommand>,
): Readonly<StartContactImportRequest | ProcessContactImportChunkRequest> {
  if (
    typeof command.payload !== "object" ||
    command.payload === null ||
    Array.isArray(command.payload)
  ) {
    throw new Error("Railway contact import command is invalid");
  }

  if (command.operation === "contacts.import.start") {
    const startPayload = command.payload as Readonly<Record<string, unknown>>;

    if (
      !hasExactKeys(startPayload, [
        "fileName",
        "mapping",
        "sourceDigest",
        "totalRows",
      ]) ||
      typeof startPayload.mapping !== "object" ||
      startPayload.mapping === null ||
      Array.isArray(startPayload.mapping) ||
      !hasExactKeys(startPayload.mapping, [
        "company",
        "email",
        "firstName",
        "lastName",
        "phoneNumber",
      ])
    ) {
      throw new Error("Railway contact import command is invalid");
    }

    return parseStartContactImportInput(startPayload);
  }

  if (!hasExactKeys(command.payload, ["jobId", "rows"])) {
    throw new Error("Railway contact import command is invalid");
  }

  return parseContactImportChunkInput(command.payload);
}

function validateCommand(
  command: Readonly<RailwayContactImportMutationCommand>,
): Readonly<StartContactImportRequest | ProcessContactImportChunkRequest> {
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
    throw new Error("Railway contact import command is invalid");
  }

  return requirePayload(command);
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

function parseStoredResponse(value: unknown): Readonly<RailwayContactImportResponse> {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }

  const response = parseRailwayContactImportResponse(parsed);

  if (response === null) {
    throw new Error("PostgreSQL returned an invalid import response");
  }

  return response;
}

async function loadExistingReceipt(
  transaction: PostgresTransaction,
  command: Readonly<RailwayContactImportMutationCommand>,
): Promise<RailwayContactImportMutationResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayContactImportMutationSql.lockReceipt,
    [command.session.tenantId, command.operation, command.idempotencyKey],
  );

  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL mutation receipt is unavailable");
  }

  const receipt = result.rows[0];

  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, result: null };
  }

  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL mutation receipt is incomplete");
  }

  return Object.freeze({
    outcome: "replayed",
    tenantId: command.session.tenantId,
    result: parseStoredResponse(receipt.responseJson),
  });
}

async function executeImport(
  transaction: PostgresTransaction,
  command: Readonly<RailwayContactImportMutationCommand>,
  payload: Readonly<StartContactImportRequest | ProcessContactImportChunkRequest>,
): Promise<Readonly<RailwayContactImportResponse>> {
  if (command.operation === "contacts.import.chunk") {
    const jobId = (payload as ProcessContactImportChunkRequest).jobId;
    const locked = await transaction.query(
      postgresContactImportSql.lockJobById,
      [command.session.tenantId, jobId],
    );

    if (requireRowCount(locked, 1) === 0) {
      throw new ContactImportJobNotFoundError();
    }
  }

  const service = createContactImportService({
    contacts: createPostgresContactReadRepository(transaction),
    imports: createPostgresContactImportRepository({
      queries: transaction,
      transactions: createInlineTransactionManager(transaction),
    }),
  });

  const rawResponse = command.operation === "contacts.import.start"
    ? {
        job: await service.start(command.session, payload),
        contacts: [],
      }
    : await service.processChunk(command.session, payload);
  const response = parseRailwayContactImportResponse({
    job: rawResponse.job,
    contacts: rawResponse.contacts.map(toContactRecord),
  });

  if (response === null) {
    throw new Error("PostgreSQL returned an invalid import response");
  }

  return response;
}

async function commitNewMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayContactImportMutationCommand>,
  payload: Readonly<StartContactImportRequest | ProcessContactImportChunkRequest>,
): Promise<RailwayContactImportMutationResult> {
  const result = await executeImport(transaction, command, payload);
  const audit = await transaction.query(
    postgresRailwayContactImportMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      command.operation,
      String(result.job.id),
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        processedRows: result.job.processedRows,
        status: result.job.status,
      }),
    ],
  );

  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL audit write failed");
  }

  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayContactImportMutationSql.completeReceipt,
    [
      command.session.tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      JSON.stringify(result),
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
    result,
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayContactImportMutationCommand>,
  payload: Readonly<StartContactImportRequest | ProcessContactImportChunkRequest>,
): Promise<RailwayContactImportMutationResult> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayContactImportMutationSql.claimReceipt,
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

export function createPostgresRailwayContactImportMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayContactImportMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL transaction manager is invalid");
  }

  const executor: RailwayContactImportMutationExecutor = {
    async execute(command) {
      try {
        const payload = validateCommand(command);

        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(transaction, command, payload),
        );
      } catch (error) {
        if (error instanceof ContactImportJobNotFoundError) {
          return Object.freeze({
            outcome: "not-found",
            tenantId: null,
            result: null,
          });
        }

        if (error instanceof ContactImportJobConflictError) {
          return Object.freeze({
            outcome: "conflict",
            tenantId: null,
            result: null,
          });
        }

        return Object.freeze({
          outcome: "unavailable",
          tenantId: null,
          result: null,
        });
      }
    },
  };

  return Object.freeze(executor);
}
