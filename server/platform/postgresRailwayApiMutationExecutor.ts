import type {
  ContactRecord,
} from "../../shared/domain/contactRecord.ts";
import {
  validatePersistedContact,
  type PersistedContactProfile,
} from "../../shared/validation/persistedContact.ts";
import type {
  RailwayApiContactSaveCommand,
  RailwayApiContactSaveResult,
  RailwayApiMutationExecutor,
} from "./railwayApiMutationExecutor.ts";
import type {
  PostgresQueryResult,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const OPERATION_ID = "contacts.save";
const REQUEST_DIGEST_PATTERN =
  /^railway_mutation_request_v1_[0-9a-f]{64}$/;
const IDEMPOTENCY_KEY_PATTERN =
  /^connect_idempotency_v1_[0-9a-f]{64}$/;

export const postgresRailwayMutationSql = Object.freeze({
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
  upsertContact: `
    INSERT INTO contacts (
      tenant_id,
      phone_e164,
      first_name,
      last_name,
      email,
      company
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (tenant_id, phone_e164) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      company = EXCLUDED.company,
      version = contacts.version + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE contacts.first_name IS DISTINCT FROM EXCLUDED.first_name
      OR contacts.last_name IS DISTINCT FROM EXCLUDED.last_name
      OR contacts.email IS DISTINCT FROM EXCLUDED.email
      OR contacts.company IS DISTINCT FROM EXCLUDED.company
    RETURNING
      id,
      tenant_id AS "tenantId",
      phone_e164 AS "phoneNumber",
      first_name AS "firstName",
      last_name AS "lastName",
      email,
      company,
      mailing_status AS "mailingStatus",
      consent_status AS "consentStatus",
      consent_source AS "consentSource",
      consent_recorded_at AS "consentRecordedAt",
      consent_withdrawn_at AS "consentWithdrawnAt",
      version
  `,
  selectContact: `
    SELECT
      id,
      tenant_id AS "tenantId",
      phone_e164 AS "phoneNumber",
      first_name AS "firstName",
      last_name AS "lastName",
      email,
      company,
      mailing_status AS "mailingStatus",
      consent_status AS "consentStatus",
      consent_source AS "consentSource",
      consent_recorded_at AS "consentRecordedAt",
      consent_withdrawn_at AS "consentWithdrawnAt",
      version
    FROM contacts
    WHERE tenant_id = $1
      AND phone_e164 = $2
    LIMIT 1
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
    VALUES ($1, $2, $3, 'contact', $4, $5, $6)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
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

function parsePositiveInteger(value: unknown): number {
  const normalized =
    typeof value === "string" && /^[1-9][0-9]*$/.test(value)
      ? Number(value)
      : value;

  if (!Number.isSafeInteger(normalized) || Number(normalized) <= 0) {
    throw new Error("PostgreSQL returned an invalid integer");
  }

  return Number(normalized);
}

function parseOptionalText(value: unknown): string | null {
  if (value === null || typeof value === "string") {
    return value;
  }

  throw new Error("PostgreSQL returned invalid contact text");
}

function parseMailingStatus(
  value: unknown,
): ContactRecord["mailingStatus"] {
  if (value === "subscribed" || value === "unsubscribed") {
    return value;
  }

  throw new Error("PostgreSQL returned an invalid mailing status");
}

function parseConsentStatus(
  value: unknown,
): ContactRecord["consentStatus"] {
  if (
    value === "unknown" ||
    value === "granted" ||
    value === "withdrawn"
  ) {
    return value;
  }

  throw new Error("PostgreSQL returned an invalid consent status");
}

const contactRecordKeys = [
  "id",
  "phoneNumber",
  "firstName",
  "lastName",
  "email",
  "company",
  "mailingStatus",
  "consentStatus",
  "consentSource",
  "consentRecordedAt",
  "consentWithdrawnAt",
  "version",
] as const;

function parseContactRecord(
  value: unknown,
  profile: Readonly<PersistedContactProfile>,
): ContactRecord {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, contactRecordKeys)
  ) {
    throw new Error("PostgreSQL returned an invalid contact");
  }

  const validation = validatePersistedContact(value);

  if (!validation.success) {
    throw new Error("PostgreSQL returned an invalid contact profile");
  }

  const contact: ContactRecord = {
    id: parsePositiveInteger(value.id),
    ...validation.value,
    mailingStatus: parseMailingStatus(value.mailingStatus),
    consentStatus: parseConsentStatus(value.consentStatus),
    consentSource: parseOptionalText(value.consentSource),
    consentRecordedAt: parseOptionalText(value.consentRecordedAt),
    consentWithdrawnAt: parseOptionalText(
      value.consentWithdrawnAt,
    ),
    version: parsePositiveInteger(value.version),
  };

  if (
    contact.phoneNumber !== profile.phoneNumber ||
    contact.firstName !== profile.firstName ||
    contact.lastName !== profile.lastName ||
    contact.email !== profile.email ||
    contact.company !== profile.company
  ) {
    throw new Error("PostgreSQL returned a mismatched contact");
  }

  return Object.freeze(contact);
}

function parseDatabaseContact(
  value: unknown,
  command: Readonly<RailwayApiContactSaveCommand>,
): ContactRecord {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["tenantId", ...contactRecordKeys]) ||
    parsePositiveInteger(value.tenantId) !== command.session.tenantId
  ) {
    throw new Error("PostgreSQL returned a mismatched contact");
  }

  const contactValue = Object.fromEntries(
    contactRecordKeys.map((key) => [key, value[key]]),
  );

  return parseContactRecord(contactValue, command.profile);
}

function parseStoredResponse(
  value: unknown,
  command: Readonly<RailwayApiContactSaveCommand>,
): ContactRecord {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error("PostgreSQL returned invalid replay JSON");
    }
  }

  return parseContactRecord(parsed, command.profile);
}

function validateCommand(
  command: Readonly<RailwayApiContactSaveCommand>,
): void {
  const validation = validatePersistedContact(command.profile);

  if (
    !Number.isSafeInteger(command.session.tenantId) ||
    command.session.tenantId <= 0 ||
    typeof command.session.externalUserId !== "string" ||
    command.session.externalUserId.length === 0 ||
    command.session.externalUserId.length > 512 ||
    command.session.externalUserId.trim() !==
      command.session.externalUserId ||
    /[\u0000-\u001f\u007f]/.test(
      command.session.externalUserId,
    ) ||
    !IDEMPOTENCY_KEY_PATTERN.test(command.idempotencyKey) ||
    !REQUEST_DIGEST_PATTERN.test(command.requestDigest) ||
    !validation.success ||
    validation.value.phoneNumber !== command.profile.phoneNumber ||
    validation.value.firstName !== command.profile.firstName ||
    validation.value.lastName !== command.profile.lastName ||
    validation.value.email !== command.profile.email ||
    validation.value.company !== command.profile.company
  ) {
    throw new Error("Railway contact mutation command is invalid");
  }
}

async function loadExistingReceipt(
  transaction: PostgresTransaction,
  command: Readonly<RailwayApiContactSaveCommand>,
): Promise<RailwayApiContactSaveResult> {
  const result = await transaction.query<MutationReceiptRow>(
    postgresRailwayMutationSql.lockReceipt,
    [
      command.session.tenantId,
      OPERATION_ID,
      command.idempotencyKey,
    ],
  );

  if (requireRowCount(result, 1) !== 1) {
    throw new Error("PostgreSQL mutation receipt is unavailable");
  }

  const receipt = result.rows[0];

  if (receipt.requestDigest !== command.requestDigest) {
    return { outcome: "conflict", tenantId: null, contact: null };
  }

  if (receipt.status !== "completed") {
    throw new Error("PostgreSQL mutation receipt is incomplete");
  }

  return {
    outcome: "replayed",
    tenantId: command.session.tenantId,
    contact: parseStoredResponse(receipt.responseJson, command),
  };
}

async function saveNewContactMutation(
  transaction: PostgresTransaction,
  command: Readonly<RailwayApiContactSaveCommand>,
): Promise<RailwayApiContactSaveResult> {
  const contactParameters = [
    command.session.tenantId,
    command.profile.phoneNumber,
    command.profile.firstName,
    command.profile.lastName,
    command.profile.email,
    command.profile.company,
  ] as const;
  const upsert = await transaction.query<Record<string, unknown>>(
    postgresRailwayMutationSql.upsertContact,
    contactParameters,
  );
  const upsertedCount = requireRowCount(upsert, 1);
  let contactRow: unknown;

  if (upsertedCount === 1) {
    contactRow = upsert.rows[0];
  } else {
    const selected = await transaction.query<Record<string, unknown>>(
      postgresRailwayMutationSql.selectContact,
      [command.session.tenantId, command.profile.phoneNumber],
    );

    if (requireRowCount(selected, 1) !== 1) {
      throw new Error("PostgreSQL contact is unavailable");
    }

    contactRow = selected.rows[0];
  }

  const contact = parseDatabaseContact(contactRow, command);
  const auditMetadata = JSON.stringify({
    requestDigest: command.requestDigest,
    outcome: "saved",
  });
  const audit = await transaction.query(
    postgresRailwayMutationSql.insertAudit,
    [
      command.session.tenantId,
      command.session.externalUserId,
      OPERATION_ID,
      String(contact.id),
      command.idempotencyKey,
      auditMetadata,
    ],
  );

  if (requireRowCount(audit, 1) !== 1) {
    throw new Error("PostgreSQL audit write failed");
  }

  const completed = await transaction.query(
    postgresRailwayMutationSql.completeReceipt,
    [
      command.session.tenantId,
      OPERATION_ID,
      command.idempotencyKey,
      command.requestDigest,
      JSON.stringify(contact),
    ],
  );

  if (requireRowCount(completed, 1) !== 1) {
    throw new Error("PostgreSQL mutation completion failed");
  }

  return {
    outcome: "committed",
    tenantId: command.session.tenantId,
    contact,
  };
}

async function executeContactSaveTransaction(
  transaction: PostgresTransaction,
  command: Readonly<RailwayApiContactSaveCommand>,
): Promise<RailwayApiContactSaveResult> {
  const claimed = await transaction.query<{ idempotencyKey: string }>(
    postgresRailwayMutationSql.claimReceipt,
    [
      command.session.tenantId,
      OPERATION_ID,
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

  return saveNewContactMutation(transaction, command);
}

export function createPostgresRailwayApiMutationExecutor(
  transactions: PostgresTransactionManager,
): RailwayApiMutationExecutor {
  if (typeof transactions?.transaction !== "function") {
    throw new Error("PostgreSQL transaction manager is invalid");
  }

  const executor: RailwayApiMutationExecutor = {
    async saveContact(command) {
      try {
        validateCommand(command);

        return await transactions.transaction(
          { isolationLevel: "read-committed" },
          async (transaction) =>
            executeContactSaveTransaction(transaction, command),
        );
      } catch {
        return {
          outcome: "unavailable",
          tenantId: null,
          contact: null,
        };
      }
    },
  };

  return Object.freeze(executor);
}
