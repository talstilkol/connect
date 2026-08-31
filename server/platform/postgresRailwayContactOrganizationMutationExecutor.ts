import {
  ContactOrganizationTargetNotFoundError,
} from "../../db/contactOrganizationRepository.ts";
import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization.ts";
import {
  createContactOrganizationService,
  parseContactOrganizationAssignment,
  parseContactOrganizationName,
} from "../contacts/contactOrganizationService.ts";
import {
  parseRailwayContactOrganizationSnapshot,
} from "../contacts/railwayContactDirectoryHandler.ts";
import {
  createPostgresContactOrganizationRepository,
} from "./postgresContactOrganizationRepository.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";
import type {
  RailwayContactOrganizationMutationCommand,
  RailwayContactOrganizationMutationExecutor,
  RailwayContactOrganizationMutationOperation,
  RailwayContactOrganizationMutationResult,
} from "./railwayContactOrganizationMutationExecutor.ts";
import {
  railwayContactOrganizationMutationOperations,
} from "./railwayContactOrganizationMutationExecutor.ts";

const requestDigestPattern =
  /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern =
  /^connect_idempotency_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export const postgresRailwayContactOrganizationMutationSql = Object.freeze({
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
    VALUES ($1, $2, $3, $4, $5, $6, $7)
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

function hasExactKeys(
  value: object,
  expectedKeys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return actualKeys.length === expected.length &&
    actualKeys.every((key, index) => key === expected[index]);
}

function isOperation(
  value: unknown,
): value is RailwayContactOrganizationMutationOperation {
  return typeof value === "string" &&
    railwayContactOrganizationMutationOperations.some(
      (operation) => operation === value,
    );
}

function expectedContactIds(
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): readonly number[] {
  return "contactId" in command.payload
    ? Object.freeze([command.payload.contactId])
    : Object.freeze([]);
}

function requireNamePayload(
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): Readonly<{ name: string }> {
  if (!("name" in command.payload)) {
    throw new Error("Railway contact organization command is invalid");
  }

  return command.payload;
}

function requireAssignmentPayload(
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): Readonly<{ contactId: number; groupId: number; assigned: boolean }> {
  if (!("contactId" in command.payload)) {
    throw new Error("Railway contact organization command is invalid");
  }

  return command.payload;
}

function parseStoredSnapshot(
  value: unknown,
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): Readonly<ContactOrganizationSnapshot> {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }

  const snapshot = parseRailwayContactOrganizationSnapshot(
    parsed,
    expectedContactIds(command),
  );

  if (snapshot === null) {
    throw new Error("PostgreSQL returned an invalid organization snapshot");
  }

  return snapshot;
}

function validateCommand(
  command: Readonly<RailwayContactOrganizationMutationCommand>,
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
    throw new Error("Railway contact organization command is invalid");
  }

  if (
    command.operation === "contacts.organization.tag.save" ||
    command.operation === "contacts.organization.list.save"
  ) {
    if (!hasExactKeys(command.payload, ["name"])) {
      throw new Error("Railway contact organization command is invalid");
    }

    const payload = requireNamePayload(command);
    const parsed = parseContactOrganizationName(payload.name);

    if (parsed.name !== payload.name) {
      throw new Error("Railway contact organization command is invalid");
    }
    return;
  }

  if (!hasExactKeys(command.payload, ["assigned", "contactId", "groupId"])) {
    throw new Error("Railway contact organization command is invalid");
  }

  parseContactOrganizationAssignment(command.payload);
}

function targetFor(
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): Readonly<{ type: string; id: string }> {
  const targetsTag =
    command.operation === "contacts.organization.tag.save" ||
    command.operation === "contacts.organization.tag-assignment";

  if ("name" in command.payload) {
    return Object.freeze({
      type: targetsTag
        ? "contact_tag"
        : "contact_list",
      id: command.payload.name.toLowerCase(),
    });
  }

  return Object.freeze({
    type: targetsTag
      ? "contact_tag_assignment"
      : "contact_list_membership",
    id: `${command.payload.contactId}:${command.payload.groupId}`,
  });
}

async function loadExistingReceipt(
  transaction: PostgresTransaction,
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): Promise<RailwayContactOrganizationMutationResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayContactOrganizationMutationSql.lockReceipt,
    [
      command.session.tenantId,
      command.operation,
      command.idempotencyKey,
    ],
  );

  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL mutation receipt is unavailable");
  }

  const receipt = result.rows[0];

  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, organization: null };
  }

  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL mutation receipt is incomplete");
  }

  return Object.freeze({
    outcome: "replayed",
    tenantId: command.session.tenantId,
    organization: parseStoredSnapshot(receipt.responseJson, command),
  });
}

async function executeOrganizationMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): Promise<Readonly<ContactOrganizationSnapshot>> {
  const service = createContactOrganizationService(
    createPostgresContactOrganizationRepository(transaction),
  );

  switch (command.operation) {
    case "contacts.organization.tag.save":
      return service.createTag(
        command.session,
        requireNamePayload(command).name,
      );
    case "contacts.organization.list.save":
      return service.createList(
        command.session,
        requireNamePayload(command).name,
      );
    case "contacts.organization.tag-assignment":
      return service.setTagAssignment(
        command.session,
        requireAssignmentPayload(command),
      );
    case "contacts.organization.list-membership":
      return service.setListMembership(
        command.session,
        requireAssignmentPayload(command),
      );
  }
}

async function commitNewMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): Promise<RailwayContactOrganizationMutationResult> {
  const organization = await executeOrganizationMutation(transaction, command);
  const validatedOrganization = parseRailwayContactOrganizationSnapshot(
    organization,
    expectedContactIds(command),
  );

  if (validatedOrganization === null) {
    throw new Error("PostgreSQL returned an invalid organization snapshot");
  }

  const target = targetFor(command);
  const audit = await transaction.query(
    postgresRailwayContactOrganizationMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      command.operation,
      target.type,
      target.id,
      command.idempotencyKey,
      JSON.stringify({
        requestDigest: command.requestDigest,
        outcome: "saved",
      }),
    ],
  );

  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL audit write failed");
  }

  const completed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayContactOrganizationMutationSql.completeReceipt,
    [
      command.session.tenantId,
      command.operation,
      command.idempotencyKey,
      command.requestDigest,
      JSON.stringify(validatedOrganization),
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
    organization: validatedOrganization,
  });
}

async function executeTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayContactOrganizationMutationCommand>,
): Promise<RailwayContactOrganizationMutationResult> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayContactOrganizationMutationSql.claimReceipt,
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

export function createPostgresRailwayContactOrganizationMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayContactOrganizationMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL transaction manager is invalid");
  }

  const executor: RailwayContactOrganizationMutationExecutor = {
    async execute(command) {
      try {
        validateCommand(command);

        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          (transaction) => executeTransaction(transaction, command),
        );
      } catch (error) {
        return error instanceof ContactOrganizationTargetNotFoundError
          ? { outcome: "not-found", tenantId: null, organization: null }
          : { outcome: "unavailable", tenantId: null, organization: null };
      }
    },
  };

  return Object.freeze(executor);
}
