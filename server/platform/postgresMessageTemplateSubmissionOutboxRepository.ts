import type {
  ClaimMessageTemplateSubmissionResult,
  MessageTemplateSubmissionCandidateRepository,
  MessageTemplateSubmissionOutboxRepository,
} from "../../db/messageTemplateSubmissionOutboxRepository.ts";
import {
  MessageTemplateTransitionError,
} from "../../db/messageTemplateRepository.ts";
import {
  deriveMessageTemplateSubmissionEventKey,
  MESSAGE_TEMPLATE_RECONCILIATION_WORKER_ACTOR,
  MESSAGE_TEMPLATE_SUBMISSION_WORKER_ACTOR,
  parseMessageTemplateSubmissionOutbox,
  type MessageTemplateSubmissionEvent,
  type MessageTemplateSubmissionEventType,
  type MessageTemplateSubmissionOutboxRecord,
  type MessageTemplateSubmissionOutboxStatus,
} from "../templates/messageTemplateSubmissionOutbox.ts";
import { createPostgresMessageTemplateRepository } from "./postgresMessageTemplateRepository.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransaction,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const submissionKeyPattern = /^template_submission_v1_[0-9a-f]{64}$/;
const graphVersionPattern = /^v[1-9][0-9]*\.[0-9]+$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;
const metaTemplateIdPattern = /^[1-9][0-9]{0,254}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const outboxRowKeys = Object.freeze([
  "attemptCount",
  "claimedAt",
  "createdAt",
  "graphApiVersion",
  "lastErrorCode",
  "metaConnectionVersion",
  "metaTemplateId",
  "requestIdempotencyKey",
  "requestOperation",
  "settledAt",
  "stateVersion",
  "status",
  "submissionKey",
  "templateKey",
  "templateVersion",
  "tenantId",
  "updatedAt",
  "wabaId",
]);
const contextRowKeys = Object.freeze([
  ...outboxRowKeys,
  "currentConnectionStatus",
  "currentConnectionVersion",
  "currentTemplateStatus",
  "currentTemplateSubmissionKey",
  "currentWabaId",
]);
const outboxColumns = `
  outbox.submission_key AS "submissionKey",
  outbox.tenant_id AS "tenantId",
  outbox.template_key AS "templateKey",
  outbox.template_version AS "templateVersion",
  outbox.meta_connection_version AS "metaConnectionVersion",
  outbox.waba_id AS "wabaId",
  outbox.graph_api_version AS "graphApiVersion",
  outbox.request_operation AS "requestOperation",
  outbox.request_idempotency_key AS "requestIdempotencyKey",
  outbox.status,
  outbox.state_version AS "stateVersion",
  outbox.attempt_count AS "attemptCount",
  outbox.last_error_code AS "lastErrorCode",
  outbox.meta_template_id AS "metaTemplateId",
  outbox.claimed_at AS "claimedAt",
  outbox.settled_at AS "settledAt",
  outbox.created_at AS "createdAt",
  outbox.updated_at AS "updatedAt"
`;

export const postgresMessageTemplateSubmissionOutboxSql = Object.freeze({
  find: `
    SELECT ${outboxColumns}
    FROM message_template_submission_outbox AS outbox
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
    LIMIT 1
  `,
  listPendingBefore: `
    SELECT ${outboxColumns}
    FROM message_template_submission_outbox AS outbox
    WHERE outbox.status = 'pending'
      AND outbox.created_at <= $1::timestamptz
    ORDER BY outbox.created_at ASC, outbox.submission_key ASC
    LIMIT $2
  `,
  listAmbiguousBefore: `
    SELECT ${outboxColumns}
    FROM message_template_submission_outbox AS outbox
    WHERE outbox.status = 'ambiguous'
      AND outbox.updated_at <= $1::timestamptz
    ORDER BY outbox.updated_at ASC, outbox.submission_key ASC
    LIMIT $2
  `,
  lockContext: `
    SELECT
      ${outboxColumns},
      connection.version AS "currentConnectionVersion",
      connection.waba_id AS "currentWabaId",
      connection.status AS "currentConnectionStatus",
      template.status AS "currentTemplateStatus",
      template.submission_key AS "currentTemplateSubmissionKey"
    FROM message_template_submission_outbox AS outbox
    INNER JOIN meta_connections AS connection
      ON connection.tenant_id = outbox.tenant_id
    INNER JOIN message_templates AS template
      ON template.tenant_id = outbox.tenant_id
      AND template.template_key = outbox.template_key
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
    FOR UPDATE OF outbox, connection, template
  `,
  claim: `
    UPDATE message_template_submission_outbox AS outbox
    SET
      status = 'submitting',
      state_version = 2,
      attempt_count = 1,
      claimed_at = $3::timestamptz,
      updated_at = $3::timestamptz
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
      AND outbox.status = 'pending'
      AND outbox.state_version = 1
    RETURNING ${outboxColumns}
  `,
  block: `
    UPDATE message_template_submission_outbox AS outbox
    SET
      status = 'blocked',
      state_version = 2,
      last_error_code = $3,
      settled_at = $4::timestamptz,
      updated_at = $4::timestamptz
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
      AND outbox.status = 'pending'
      AND outbox.state_version = 1
    RETURNING ${outboxColumns}
  `,
  submit: `
    UPDATE message_template_submission_outbox AS outbox
    SET
      status = 'submitted',
      state_version = 3,
      meta_template_id = $3,
      settled_at = $4::timestamptz,
      updated_at = $4::timestamptz
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
      AND outbox.status = 'submitting'
      AND outbox.state_version = 2
    RETURNING ${outboxColumns}
  `,
  reject: `
    UPDATE message_template_submission_outbox AS outbox
    SET
      status = 'rejected',
      state_version = 3,
      last_error_code = $3,
      settled_at = $4::timestamptz,
      updated_at = $4::timestamptz
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
      AND outbox.status = 'submitting'
      AND outbox.state_version = 2
    RETURNING ${outboxColumns}
  `,
  markAmbiguous: `
    UPDATE message_template_submission_outbox AS outbox
    SET
      status = 'ambiguous',
      state_version = 3,
      last_error_code = $3,
      updated_at = $4::timestamptz
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
      AND outbox.status = 'submitting'
      AND outbox.state_version = 2
    RETURNING ${outboxColumns}
  `,
  reconcileSubmitted: `
    UPDATE message_template_submission_outbox AS outbox
    SET
      status = 'submitted',
      state_version = 4,
      last_error_code = NULL,
      meta_template_id = $3,
      settled_at = $4::timestamptz,
      updated_at = $4::timestamptz
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
      AND outbox.status = 'ambiguous'
      AND outbox.state_version = 3
    RETURNING ${outboxColumns}
  `,
  reconcileRejected: `
    UPDATE message_template_submission_outbox AS outbox
    SET
      status = 'rejected',
      state_version = 4,
      last_error_code = $3,
      settled_at = $4::timestamptz,
      updated_at = $4::timestamptz
    WHERE outbox.tenant_id = $1
      AND outbox.submission_key = $2
      AND outbox.status = 'ambiguous'
      AND outbox.state_version = 3
    RETURNING ${outboxColumns}
  `,
  insertEvent: `
    INSERT INTO message_template_submission_events (
      event_key,
      submission_key,
      tenant_id,
      template_key,
      event_type,
      from_status,
      to_status,
      from_version,
      to_version,
      actor_kind,
      actor_external_user_id,
      causation_key,
      error_code,
      meta_template_id,
      occurred_at,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
      $14, $15::timestamptz, $15::timestamptz
    )
    RETURNING event_key AS "eventKey"
  `,
});

interface LockedContext {
  readonly outbox: Readonly<MessageTemplateSubmissionOutboxRecord>;
  readonly currentConnectionVersion: number;
  readonly currentWabaId: string;
  readonly currentConnectionStatus: string;
  readonly currentTemplateStatus: string;
  readonly currentTemplateSubmissionKey: string | null;
}

function requireTenantId(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error("Message template submission tenant is invalid");
  }

  return Number(value);
}

function requireSubmissionKey(value: unknown): string {
  if (typeof value !== "string" || !submissionKeyPattern.test(value)) {
    throw new Error("Message template submission key is invalid");
  }

  return value;
}

function requireGraphApiVersion(value: unknown): string {
  if (
    typeof value !== "string" || value.length > 20 ||
    !graphVersionPattern.test(value)
  ) {
    throw new Error("Message template Graph API version is invalid");
  }

  return value;
}

function requireErrorCode(value: unknown): string {
  if (typeof value !== "string" || !errorCodePattern.test(value)) {
    throw new Error("Message template submission error code is invalid");
  }

  return value;
}

function requireMetaTemplateId(value: unknown): string {
  if (typeof value !== "string" || !metaTemplateIdPattern.test(value)) {
    throw new Error("Meta template ID is invalid");
  }

  return value;
}

function requireTimestamp(value: unknown): string {
  if (
    typeof value !== "string" || !timestampPattern.test(value) ||
    !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value
  ) {
    throw new Error("Message template submission timestamp is invalid");
  }

  return value;
}

function requireCandidateLimit(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 100) {
    throw new Error("Message template candidate limit is invalid");
  }

  return Number(value);
}

function nullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function parseOutboxRow(value: unknown) {
  const row = requireExactPostgresRow(value, outboxRowKeys);
  const parsed = parseMessageTemplateSubmissionOutbox({
    ...row,
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    templateVersion: parsePostgresPositiveInteger(row.templateVersion),
    metaConnectionVersion: parsePostgresPositiveInteger(
      row.metaConnectionVersion,
    ),
    stateVersion: parsePostgresPositiveInteger(row.stateVersion),
    attemptCount: typeof row.attemptCount === "string"
      ? Number(row.attemptCount)
      : row.attemptCount,
    claimedAt: nullableTimestamp(row.claimedAt),
    settledAt: nullableTimestamp(row.settledAt),
    createdAt: parsePostgresTimestamp(row.createdAt),
    updatedAt: parsePostgresTimestamp(row.updatedAt),
  });

  if (parsed === null) {
    throw new Error("PostgreSQL returned an invalid template submission outbox");
  }

  return parsed;
}

function parseContext(value: unknown): LockedContext {
  const row = requireExactPostgresRow(value, contextRowKeys);
  const outbox = parseOutboxRow(
    Object.fromEntries(outboxRowKeys.map((key) => [key, row[key]])),
  );

  if (
    typeof row.currentWabaId !== "string" ||
    !/^[1-9][0-9]{0,63}$/.test(row.currentWabaId) ||
    typeof row.currentConnectionStatus !== "string" ||
    typeof row.currentTemplateStatus !== "string" ||
    (row.currentTemplateSubmissionKey !== null &&
      (typeof row.currentTemplateSubmissionKey !== "string" ||
        !submissionKeyPattern.test(row.currentTemplateSubmissionKey)))
  ) {
    throw new Error("PostgreSQL returned invalid submission context");
  }

  return Object.freeze({
    outbox,
    currentConnectionVersion: parsePostgresPositiveInteger(
      row.currentConnectionVersion,
    ),
    currentWabaId: row.currentWabaId,
    currentConnectionStatus: row.currentConnectionStatus,
    currentTemplateStatus: row.currentTemplateStatus,
    currentTemplateSubmissionKey: row.currentTemplateSubmissionKey,
  });
}

function inlineTransactions(
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

async function loadContext(
  transaction: PostgresTransaction,
  tenantId: number,
  submissionKey: string,
): Promise<LockedContext | null> {
  const result = await transaction.query<Record<string, unknown>>(
    postgresMessageTemplateSubmissionOutboxSql.lockContext,
    [tenantId, submissionKey],
  );
  const rows = requirePostgresRows(result, 1);

  return rows.length === 0 ? null : parseContext(rows[0]);
}

async function updateOne(
  transaction: PostgresTransaction,
  sql: string,
  parameters: readonly PostgresParameter[],
) {
  const result = await transaction.query<Record<string, unknown>>(
    sql,
    parameters,
  );
  const rows = requirePostgresRows(result, 1);

  if (rows.length !== 1) {
    throw new MessageTemplateTransitionError();
  }

  return parseOutboxRow(rows[0]);
}

async function appendEvent(
  transaction: PostgresTransaction,
  outbox: Readonly<MessageTemplateSubmissionOutboxRecord>,
  input: Readonly<{
    eventType: MessageTemplateSubmissionEventType;
    fromStatus: MessageTemplateSubmissionOutboxStatus | null;
    fromVersion: number;
    actorExternalUserId: string;
    errorCode: string | null;
    metaTemplateId: string | null;
    occurredAt: string;
  }>,
) {
  const eventInput: Omit<MessageTemplateSubmissionEvent, "eventKey"> = {
    submissionKey: outbox.submissionKey,
    tenantId: outbox.tenantId,
    templateKey: outbox.templateKey,
    eventType: input.eventType,
    fromStatus: input.fromStatus,
    toStatus: outbox.status,
    fromVersion: input.fromVersion,
    toVersion: outbox.stateVersion,
    actorKind: "system",
    actorExternalUserId: input.actorExternalUserId,
    causationKey: outbox.submissionKey,
    errorCode: input.errorCode,
    metaTemplateId: input.metaTemplateId,
    occurredAt: input.occurredAt,
  };
  const eventKey = await deriveMessageTemplateSubmissionEventKey(eventInput);
  const result = await transaction.query<{ eventKey: string }>(
    postgresMessageTemplateSubmissionOutboxSql.insertEvent,
    [
      eventKey,
      eventInput.submissionKey,
      eventInput.tenantId,
      eventInput.templateKey,
      eventInput.eventType,
      eventInput.fromStatus,
      eventInput.toStatus,
      eventInput.fromVersion,
      eventInput.toVersion,
      eventInput.actorKind,
      eventInput.actorExternalUserId,
      eventInput.causationKey,
      eventInput.errorCode,
      eventInput.metaTemplateId,
      eventInput.occurredAt,
    ],
  );
  const rows = requirePostgresRows(result, 1);

  if (rows.length !== 1 || rows[0]?.eventKey !== eventKey) {
    throw new Error("PostgreSQL template submission event was not confirmed");
  }
}

function templateRepository(transaction: PostgresTransaction) {
  return createPostgresMessageTemplateRepository({
    queries: transaction,
    transactions: inlineTransactions(transaction),
  });
}

async function releaseTemplateIfClaimed(
  transaction: PostgresTransaction,
  context: LockedContext,
  errorCode: string,
) {
  if (
    context.currentTemplateStatus === "submitting" &&
    context.currentTemplateSubmissionKey === context.outbox.submissionKey
  ) {
    await templateRepository(transaction).releaseSubmission(
      context.outbox.tenantId,
      context.outbox.templateKey,
      context.outbox.submissionKey,
      errorCode,
    );
  }
}

async function blockPending(
  transaction: PostgresTransaction,
  context: LockedContext,
  errorCode: string,
  occurredAt: string,
) {
  const blocked = await updateOne(
    transaction,
    postgresMessageTemplateSubmissionOutboxSql.block,
    [context.outbox.tenantId, context.outbox.submissionKey, errorCode, occurredAt],
  );
  await releaseTemplateIfClaimed(transaction, context, errorCode);
  await appendEvent(transaction, blocked, {
    eventType: "blocked",
    fromStatus: "pending",
    fromVersion: 1,
    actorExternalUserId: MESSAGE_TEMPLATE_SUBMISSION_WORKER_ACTOR,
    errorCode,
    metaTemplateId: null,
    occurredAt,
  });

  return blocked;
}

function claimBlocker(
  context: LockedContext,
  graphApiVersion: string,
): string | null {
  if (
    context.currentTemplateStatus !== "submitting" ||
    context.currentTemplateSubmissionKey !== context.outbox.submissionKey
  ) {
    return "TEMPLATE_STATE_CHANGED";
  }

  if (
    context.currentConnectionStatus !== "connected" ||
    context.currentConnectionVersion !== context.outbox.metaConnectionVersion ||
    context.currentWabaId !== context.outbox.wabaId
  ) {
    return "META_CONNECTION_CHANGED";
  }

  return graphApiVersion === context.outbox.graphApiVersion
    ? null
    : "GRAPH_API_VERSION_CHANGED";
}

async function claimInTransaction(
  transaction: PostgresTransaction,
  tenantId: number,
  submissionKey: string,
  graphApiVersion: string,
  occurredAt: string,
): Promise<ClaimMessageTemplateSubmissionResult> {
  const context = await loadContext(transaction, tenantId, submissionKey);

  if (context === null) {
    return Object.freeze({ outcome: "not-found" });
  }

  if (context.outbox.status === "pending") {
    const blocker = claimBlocker(context, graphApiVersion);

    if (blocker !== null) {
      return Object.freeze({
        outcome: "blocked",
        outbox: await blockPending(transaction, context, blocker, occurredAt),
      });
    }

    const claimed = await updateOne(
      transaction,
      postgresMessageTemplateSubmissionOutboxSql.claim,
      [tenantId, submissionKey, occurredAt],
    );
    await appendEvent(transaction, claimed, {
      eventType: "claimed",
      fromStatus: "pending",
      fromVersion: 1,
      actorExternalUserId: MESSAGE_TEMPLATE_SUBMISSION_WORKER_ACTOR,
      errorCode: null,
      metaTemplateId: null,
      occurredAt,
    });
    const template = await templateRepository(transaction).findByKey(
      tenantId,
      claimed.templateKey,
    );

    if (
      template === null || template.status !== "submitting" ||
      template.submissionKey !== submissionKey
    ) {
      throw new Error("PostgreSQL returned invalid prepared template state");
    }

    return Object.freeze({
      outcome: "claimed",
      prepared: Object.freeze({ outbox: claimed, template }),
    });
  }

  if (context.outbox.status === "submitting") {
    const ambiguous = await updateOne(
      transaction,
      postgresMessageTemplateSubmissionOutboxSql.markAmbiguous,
      [tenantId, submissionKey, "PROVIDER_OUTCOME_UNKNOWN", occurredAt],
    );
    await appendEvent(transaction, ambiguous, {
      eventType: "ambiguous",
      fromStatus: "submitting",
      fromVersion: 2,
      actorExternalUserId: MESSAGE_TEMPLATE_SUBMISSION_WORKER_ACTOR,
      errorCode: "PROVIDER_OUTCOME_UNKNOWN",
      metaTemplateId: null,
      occurredAt,
    });

    return Object.freeze({ outcome: "ambiguous", outbox: ambiguous });
  }

  return Object.freeze({ outcome: "duplicate", outbox: context.outbox });
}

type SettlementKind =
  | "submitted"
  | "rejected"
  | "ambiguous"
  | "reconciled-submitted"
  | "reconciled-rejected";

async function settleInTransaction(
  transaction: PostgresTransaction,
  tenantId: number,
  submissionKey: string,
  kind: SettlementKind,
  evidence: string,
  occurredAt: string,
) {
  const context = await loadContext(transaction, tenantId, submissionKey);

  if (context === null) {
    throw new MessageTemplateTransitionError();
  }

  const isSubmitted = kind === "submitted" || kind === "reconciled-submitted";
  const isReconciliation = kind.startsWith("reconciled-");
  const metaTemplateId = isSubmitted ? evidence : null;
  const errorCode = isSubmitted ? null : evidence;
  const fromStatus = isReconciliation ? "ambiguous" : "submitting";
  const fromVersion = isReconciliation ? 3 : 2;
  const sql = kind === "submitted"
    ? postgresMessageTemplateSubmissionOutboxSql.submit
    : kind === "rejected"
      ? postgresMessageTemplateSubmissionOutboxSql.reject
      : kind === "ambiguous"
        ? postgresMessageTemplateSubmissionOutboxSql.markAmbiguous
        : kind === "reconciled-submitted"
          ? postgresMessageTemplateSubmissionOutboxSql.reconcileSubmitted
          : postgresMessageTemplateSubmissionOutboxSql.reconcileRejected;
  const settled = await updateOne(
    transaction,
    sql,
    [tenantId, submissionKey, evidence, occurredAt],
  );

  if (isSubmitted) {
    await templateRepository(transaction).completeSubmission(
      tenantId,
      settled.templateKey,
      submissionKey,
      evidence,
    );
  } else if (kind !== "ambiguous") {
    await templateRepository(transaction).releaseSubmission(
      tenantId,
      settled.templateKey,
      submissionKey,
      evidence,
    );
  }

  await appendEvent(transaction, settled, {
    eventType: kind,
    fromStatus,
    fromVersion,
    actorExternalUserId: isReconciliation
      ? MESSAGE_TEMPLATE_RECONCILIATION_WORKER_ACTOR
      : MESSAGE_TEMPLATE_SUBMISSION_WORKER_ACTOR,
    errorCode,
    metaTemplateId,
    occurredAt,
  });

  return settled;
}

export interface PostgresMessageTemplateSubmissionOutboxDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

export function createPostgresMessageTemplateSubmissionOutboxRepository(
  dependencies: Readonly<PostgresMessageTemplateSubmissionOutboxDependencies>,
): MessageTemplateSubmissionOutboxRepository &
  MessageTemplateSubmissionCandidateRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL template submission dependencies are invalid");
  }

  const transact = <TResult>(
    execute: (transaction: PostgresTransaction) => Promise<TResult>,
  ) => dependencies.transactions.transaction(
    { isolationLevel: "repeatable-read" },
    execute,
  );

  const listCandidates = async (
    sql: string,
    expectedStatus: "pending" | "ambiguous",
    cutoffAtInput: unknown,
    limitInput: unknown,
  ) => {
    const cutoffAt = requireTimestamp(cutoffAtInput);
    const limit = requireCandidateLimit(limitInput);
    const result = await dependencies.queries.query<Record<string, unknown>>(
      sql,
      [cutoffAt, limit],
    );
    const rows = requirePostgresRows(result, limit);
    const cutoffMilliseconds = Date.parse(cutoffAt);
    const candidates = rows.map(parseOutboxRow);

    for (const candidate of candidates) {
      const candidateTimestamp = expectedStatus === "pending"
        ? candidate.createdAt
        : candidate.updatedAt;

      if (
        candidate.status !== expectedStatus ||
        Date.parse(candidateTimestamp) > cutoffMilliseconds
      ) {
        throw new Error("PostgreSQL returned an invalid submission candidate");
      }
    }

    return Object.freeze(candidates);
  };

  const repository: MessageTemplateSubmissionOutboxRepository &
    MessageTemplateSubmissionCandidateRepository = {
    async find(tenantIdInput, submissionKeyInput) {
      const tenantId = requireTenantId(tenantIdInput);
      const submissionKey = requireSubmissionKey(submissionKeyInput);
      const result = await dependencies.queries.query<Record<string, unknown>>(
        postgresMessageTemplateSubmissionOutboxSql.find,
        [tenantId, submissionKey],
      );
      const rows = requirePostgresRows(result, 1);
      const outbox = rows.length === 0 ? null : parseOutboxRow(rows[0]);

      if (
        outbox !== null &&
        (outbox.tenantId !== tenantId || outbox.submissionKey !== submissionKey)
      ) {
        throw new Error("PostgreSQL returned cross-scope template submission");
      }

      return outbox;
    },

    listPendingBefore(cutoffAtInput, limitInput) {
      return listCandidates(
        postgresMessageTemplateSubmissionOutboxSql.listPendingBefore,
        "pending",
        cutoffAtInput,
        limitInput,
      );
    },

    listAmbiguousBefore(cutoffAtInput, limitInput) {
      return listCandidates(
        postgresMessageTemplateSubmissionOutboxSql.listAmbiguousBefore,
        "ambiguous",
        cutoffAtInput,
        limitInput,
      );
    },

    claim(tenantIdInput, submissionKeyInput, graphApiVersionInput, occurredAtInput) {
      const tenantId = requireTenantId(tenantIdInput);
      const submissionKey = requireSubmissionKey(submissionKeyInput);
      const graphApiVersion = requireGraphApiVersion(graphApiVersionInput);
      const occurredAt = requireTimestamp(occurredAtInput);

      return transact((transaction) => claimInTransaction(
        transaction,
        tenantId,
        submissionKey,
        graphApiVersion,
        occurredAt,
      ));
    },

    markSubmitted(tenantIdInput, submissionKeyInput, metaTemplateIdInput, occurredAtInput) {
      const tenantId = requireTenantId(tenantIdInput);
      const submissionKey = requireSubmissionKey(submissionKeyInput);
      const metaTemplateId = requireMetaTemplateId(metaTemplateIdInput);
      const occurredAt = requireTimestamp(occurredAtInput);

      return transact((transaction) => settleInTransaction(
        transaction,
        tenantId,
        submissionKey,
        "submitted",
        metaTemplateId,
        occurredAt,
      ));
    },

    markRejected(tenantIdInput, submissionKeyInput, errorCodeInput, occurredAtInput) {
      const tenantId = requireTenantId(tenantIdInput);
      const submissionKey = requireSubmissionKey(submissionKeyInput);
      const errorCode = requireErrorCode(errorCodeInput);
      const occurredAt = requireTimestamp(occurredAtInput);

      return transact((transaction) => settleInTransaction(
        transaction,
        tenantId,
        submissionKey,
        "rejected",
        errorCode,
        occurredAt,
      ));
    },

    markAmbiguous(tenantIdInput, submissionKeyInput, errorCodeInput, occurredAtInput) {
      const tenantId = requireTenantId(tenantIdInput);
      const submissionKey = requireSubmissionKey(submissionKeyInput);
      const errorCode = requireErrorCode(errorCodeInput);
      const occurredAt = requireTimestamp(occurredAtInput);

      return transact((transaction) => settleInTransaction(
        transaction,
        tenantId,
        submissionKey,
        "ambiguous",
        errorCode,
        occurredAt,
      ));
    },

    reconcileSubmitted(
      tenantIdInput,
      submissionKeyInput,
      metaTemplateIdInput,
      occurredAtInput,
    ) {
      const tenantId = requireTenantId(tenantIdInput);
      const submissionKey = requireSubmissionKey(submissionKeyInput);
      const metaTemplateId = requireMetaTemplateId(metaTemplateIdInput);
      const occurredAt = requireTimestamp(occurredAtInput);

      return transact((transaction) => settleInTransaction(
        transaction,
        tenantId,
        submissionKey,
        "reconciled-submitted",
        metaTemplateId,
        occurredAt,
      ));
    },

    reconcileRejected(tenantIdInput, submissionKeyInput, errorCodeInput, occurredAtInput) {
      const tenantId = requireTenantId(tenantIdInput);
      const submissionKey = requireSubmissionKey(submissionKeyInput);
      const errorCode = requireErrorCode(errorCodeInput);
      const occurredAt = requireTimestamp(occurredAtInput);

      return transact((transaction) => settleInTransaction(
        transaction,
        tenantId,
        submissionKey,
        "reconciled-rejected",
        errorCode,
        occurredAt,
      ));
    },
  };

  return Object.freeze(repository);
}
