import { createPostgresMessageTemplateRepository } from "./postgresMessageTemplateRepository.ts";
import { postgresRailwayMessageTemplateDraftMutationSql as receiptSql } from "./postgresRailwayMessageTemplateDraftMutationExecutor.ts";
import { parsePostgresPositiveInteger, requireExactPostgresRow, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresQueryExecutor, PostgresTransaction, PostgresTransactionManager } from "./postgresTransaction.ts";
import { requireTenantPermission } from "../auth/tenantSession.ts";
import type { MetaCredentialVault } from "../meta/metaPorts.ts";
import type { MetaMessageTemplateLister } from "../templates/metaMessageTemplateListAdapter.ts";
import { applyMessageTemplateSyncSnapshots } from "../templates/messageTemplateSyncService.ts";
import { toMessageTemplateView } from "../templates/messageTemplateView.ts";
import { parseRailwayMessageTemplateSyncState } from "../templates/railwayMessageTemplateSyncResult.ts";
import {
  RAILWAY_MESSAGE_TEMPLATE_SYNC_OPERATION,
  isTemplateSyncTimestamp,
  type RailwayMessageTemplateSyncMutationCommand,
  type RailwayMessageTemplateSyncMutationExecutor,
  type RailwayMessageTemplateSyncMutationResult,
} from "./railwayMessageTemplateSyncMutationExecutor.ts";

const bindingColumns = `connection.waba_id AS "wabaId", connection.version,
  envelope.key_version AS "keyVersion", envelope.initialization_vector AS "initializationVector",
  envelope.ciphertext`;
const bindingRead = `SELECT ${bindingColumns} FROM meta_connections AS connection
  JOIN meta_credential_envelopes AS envelope ON envelope.tenant_id = connection.tenant_id
  WHERE connection.tenant_id = $1 AND connection.status = 'connected'`;

export const postgresRailwayMessageTemplateSyncSql = Object.freeze({
  readBinding: bindingRead,
  lockBinding: `${bindingRead} FOR SHARE OF connection, envelope`,
  tenantBarrier: `SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1))`,
  lockTenant: `SELECT id FROM tenants WHERE id = $1
    AND status IN ('trial', 'active', 'payment_failed') FOR SHARE`,
  lockMembership: `SELECT role FROM tenant_memberships WHERE tenant_id = $1
    AND external_user_id = $2 AND status = 'active' FOR SHARE`,
  findReceipt: `SELECT request_digest AS "requestDigest", status, response_json AS "responseJson"
    FROM railway_api_mutation_receipts WHERE tenant_id = $1 AND operation = $2 AND idempotency_key = $3`,
  insertAudit: `INSERT INTO audit_logs (tenant_id, actor_external_user_id, action,
    target_type, target_id, idempotency_key, metadata_json)
    VALUES ($1, $2, $3, 'message_template_sync', $4, $4, $5) RETURNING id`,
});

type Failure = "conflict" | "authorization-changed" | "meta-not-connected" | "unavailable";
class SyncFailure extends Error {
  readonly code: Failure;
  constructor(code: Failure) {
    super("Template synchronization could not complete");
    this.code = code;
  }
}
const failed = (outcome: Failure): RailwayMessageTemplateSyncMutationResult =>
  Object.freeze({ outcome, tenantId: null, state: null });

async function readBinding(queries: PostgresQueryExecutor, tenantId: number, lock = false) {
  const rows = requirePostgresRows(await queries.query(
    lock ? postgresRailwayMessageTemplateSyncSql.lockBinding : postgresRailwayMessageTemplateSyncSql.readBinding,
    [tenantId],
  ), 1);
  if (rows.length !== 1) throw new SyncFailure("meta-not-connected");
  const row = requireExactPostgresRow(rows[0], ["wabaId", "version", "keyVersion", "initializationVector", "ciphertext"]);
  if (typeof row.wabaId !== "string" || !/^[1-9][0-9]{0,63}$/.test(row.wabaId) ||
    row.keyVersion !== "v1" || typeof row.initializationVector !== "string" ||
    !/^[A-Za-z0-9+/]{16}$/.test(row.initializationVector) ||
    typeof row.ciphertext !== "string" || row.ciphertext.length > 12000 || row.ciphertext.length < 24) {
    throw new SyncFailure("unavailable");
  }
  return Object.freeze({ wabaId: row.wabaId, version: parsePostgresPositiveInteger(row.version),
    keyVersion: row.keyVersion, initializationVector: row.initializationVector, ciphertext: row.ciphertext });
}

async function lockAuthorization(transaction: PostgresTransaction, command: RailwayMessageTemplateSyncMutationCommand) {
  const { session } = command;
  await transaction.query(postgresRailwayMessageTemplateSyncSql.tenantBarrier, [session.tenantId]);
  const tenants = requirePostgresRows(await transaction.query(postgresRailwayMessageTemplateSyncSql.lockTenant, [session.tenantId]), 1);
  if (tenants.length !== 1 || parsePostgresPositiveInteger(requireExactPostgresRow(tenants[0], ["id"]).id) !== session.tenantId) {
    throw new SyncFailure("authorization-changed");
  }
  const memberships = requirePostgresRows(await transaction.query(postgresRailwayMessageTemplateSyncSql.lockMembership,
    [session.tenantId, session.externalUserId]), 1);
  if (memberships.length !== 1) throw new SyncFailure("authorization-changed");
  const membership = requireExactPostgresRow(memberships[0], ["role"]);
  if (membership.role !== session.role) throw new SyncFailure("authorization-changed");
  requireTenantPermission(session, "templates.write");
}

function parseReceipt(rowInput: unknown, command: RailwayMessageTemplateSyncMutationCommand) {
  const row = requireExactPostgresRow(rowInput, ["requestDigest", "status", "responseJson"]);
  if (row.requestDigest !== command.requestDigest) throw new SyncFailure("conflict");
  if (row.status !== "completed") throw new SyncFailure("unavailable");
  const state = parseRailwayMessageTemplateSyncState(typeof row.responseJson === "string"
    ? JSON.parse(row.responseJson) : row.responseJson);
  if (state === null) throw new SyncFailure("unavailable");
  return Object.freeze({ outcome: "replayed" as const, tenantId: command.session.tenantId, state });
}

function validateCommand(command: RailwayMessageTemplateSyncMutationCommand): void {
  requireTenantPermission(command.session, "templates.write");
  if (!Number.isSafeInteger(command.session.tenantId) || command.session.tenantId <= 0 ||
    typeof command.session.externalUserId !== "string" || !command.session.externalUserId.trim() ||
    command.session.externalUserId !== command.session.externalUserId.trim() ||
    command.session.externalUserId.length > 512 || /[\u0000-\u001f\u007f]/.test(command.session.externalUserId) ||
    command.operation !== RAILWAY_MESSAGE_TEMPLATE_SYNC_OPERATION ||
    !/^connect_idempotency_v1_[0-9a-f]{64}$/.test(command.idempotencyKey) ||
    !/^railway_mutation_request_v1_[0-9a-f]{64}$/.test(command.requestDigest) ||
    !command.payload || Object.keys(command.payload).join(",") !== "requestedAt" ||
    !isTemplateSyncTimestamp(command.payload.requestedAt)) throw new SyncFailure("unavailable");
}

export function createPostgresRailwayMessageTemplateSyncMutationExecutor(dependencies: Readonly<{
  queries: PostgresQueryExecutor;
  transactions: PostgresTransactionManager;
  lister: MetaMessageTemplateLister;
  credentialVault: Pick<MetaCredentialVault, "withAccessToken">;
  clock?: () => string;
}>): RailwayMessageTemplateSyncMutationExecutor {
  if (typeof dependencies.queries?.query !== "function" || typeof dependencies.transactions?.transaction !== "function" ||
    typeof dependencies.lister?.list !== "function" || typeof dependencies.credentialVault?.withAccessToken !== "function" ||
    (dependencies.clock !== undefined && typeof dependencies.clock !== "function")) throw new Error("Invalid template sync dependencies");
  const clock = dependencies.clock ?? (() => new Date().toISOString());
  return Object.freeze({
    async execute(command: RailwayMessageTemplateSyncMutationCommand): Promise<RailwayMessageTemplateSyncMutationResult> {
      try {
        validateCommand(command);
        const receiptParameters = [command.session.tenantId, command.operation, command.idempotencyKey];
        // A durable replay needs no provider access. Recheck authorization even on replay.
        const existing = requirePostgresRows(await dependencies.queries.query(postgresRailwayMessageTemplateSyncSql.findReceipt, receiptParameters), 1);
        if (existing.length === 1) {
          return await dependencies.transactions.transaction({ isolationLevel: "read-committed" }, async (transaction) => {
            await lockAuthorization(transaction, command);
            return parseReceipt(existing[0], command);
          });
        }
        const binding = await readBinding(dependencies.queries, command.session.tenantId);
        // Bound the observation to the start, so slow GETs cannot supersede a newer observation.
        const observedAt = clock();
        if (!isTemplateSyncTimestamp(observedAt)) throw new SyncFailure("unavailable");
        const snapshots = await dependencies.credentialVault.withAccessToken(command.session.tenantId, async (accessToken) => {
          const current = await readBinding(dependencies.queries, command.session.tenantId);
          if (JSON.stringify(current) !== JSON.stringify(binding)) throw new SyncFailure("authorization-changed");
          return dependencies.lister.list({ wabaId: binding.wabaId, accessToken });
        });
        if (!Array.isArray(snapshots) || snapshots.length > 2000) throw new SyncFailure("unavailable");
        // The adapter validates every snapshot; stable lock ordering avoids opposing batch order.
        const ordered = [...snapshots].sort((a, b) =>
          a.name < b.name ? -1 : a.name > b.name ? 1 : a.language < b.language ? -1 : a.language > b.language ? 1 : 0);
        return await dependencies.transactions.transaction({ isolationLevel: "read-committed" }, async (transaction) => {
          await lockAuthorization(transaction, command);
          const current = await readBinding(transaction, command.session.tenantId, true);
          if (JSON.stringify(current) !== JSON.stringify(binding)) throw new SyncFailure("authorization-changed");
          const claimed = requirePostgresRows(await transaction.query(receiptSql.claimReceipt,
            [...receiptParameters, command.requestDigest, command.session.externalUserId]), 1);
          if (claimed.length === 0) {
            const receipt = requirePostgresRows(await transaction.query(receiptSql.lockReceipt, receiptParameters), 1);
            if (receipt.length !== 1) throw new SyncFailure("unavailable");
            return parseReceipt(receipt[0], command);
          }
          if (requireExactPostgresRow(claimed[0], ["idempotencyKey"]).idempotencyKey !== command.idempotencyKey) throw new SyncFailure("unavailable");
          const templates = createPostgresMessageTemplateRepository({ queries: transaction,
            transactions: { transaction: (_options, execute) => execute(transaction) } });
          const result = await applyMessageTemplateSyncSnapshots(templates, command.session.tenantId, binding.wabaId, ordered, observedAt);
          const state = parseRailwayMessageTemplateSyncState({ summary: result.summary, templates: result.templates.map(toMessageTemplateView) });
          if (state === null) throw new SyncFailure("unavailable");
          const audit = requirePostgresRows(await transaction.query(postgresRailwayMessageTemplateSyncSql.insertAudit,
            [command.session.tenantId, command.session.externalUserId, command.operation, command.idempotencyKey,
              JSON.stringify({ requestDigest: command.requestDigest, connectionVersion: binding.version, summary: state.summary })]), 1);
          if (audit.length !== 1) throw new SyncFailure("unavailable");
          parsePostgresPositiveInteger(requireExactPostgresRow(audit[0], ["id"]).id);
          const completed = requirePostgresRows(await transaction.query(receiptSql.completeReceipt,
            [...receiptParameters, command.requestDigest, JSON.stringify(state)]), 1);
          if (completed.length !== 1 || requireExactPostgresRow(completed[0], ["idempotencyKey"]).idempotencyKey !== command.idempotencyKey) throw new SyncFailure("unavailable");
          return Object.freeze({ outcome: "committed" as const, tenantId: command.session.tenantId, state });
        });
      } catch (error) {
        return failed(error instanceof SyncFailure ? error.code : "unavailable");
      }
    },
  });
}
