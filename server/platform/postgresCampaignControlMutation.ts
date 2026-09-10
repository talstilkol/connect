import { canControlCampaign, type CampaignControlRequest } from "../../shared/domain/campaignControl.ts";
import { requireTenantPermission, type TenantSession } from "../auth/tenantSession.ts";
import { toCampaignView } from "../campaigns/campaignView.ts";
import { createPostgresCampaignRepository } from "./postgresCampaignRepository.ts";
import { requireExactPostgresRow, requirePostgresRows, parsePostgresPositiveInteger } from "./postgresResultValidation.ts";
import type { PostgresTransaction } from "./postgresTransaction.ts";

export class CampaignControlConflict extends Error {}

export const postgresCampaignControlSql = Object.freeze({
  tenantBarrier: `SELECT pg_advisory_xact_lock(public.derive_bot_reply_staging_tenant_barrier_key_v1($1))`,
  lockTenant: `SELECT id FROM tenants WHERE id = $1
    AND status IN ('trial', 'active', 'payment_failed') FOR SHARE`,
  lockMembership: `SELECT role FROM tenant_memberships WHERE tenant_id = $1
    AND external_user_id = $2 AND status = 'active' FOR SHARE`,
  lockCampaign: `SELECT status, version FROM campaigns
    WHERE tenant_id = $1 AND campaign_key = $2 FOR UPDATE`,
  control: `UPDATE campaigns SET
    status = CASE WHEN $4 = 'pause' THEN 'paused'
      WHEN $4 = 'cancel' THEN 'cancelled'
      WHEN started_at IS NULL THEN 'scheduled' ELSE 'running' END,
    version = version + 1, updated_at = date_trunc('milliseconds', statement_timestamp()),
    completed_at = CASE WHEN $4 = 'cancel' THEN date_trunc('milliseconds', statement_timestamp()) ELSE completed_at END
    WHERE tenant_id = $1 AND campaign_key = $2 AND version = $3
    RETURNING campaign_key AS "campaignKey"`,
  cancelUnsent: `UPDATE campaign_recipients SET status = 'cancelled', updated_at = date_trunc('milliseconds', statement_timestamp())
    WHERE tenant_id = $1 AND campaign_key = $2 AND status IN ('pending', 'queued')`,
});

/** Runs before receipt claim/replay and holds authorization until commit. */
export async function lockCampaignControlAuthorization(transaction: PostgresTransaction, session: Readonly<TenantSession>): Promise<void> {
  requireTenantPermission(session, "campaigns.write");
  await transaction.query(postgresCampaignControlSql.tenantBarrier, [session.tenantId]);
  const tenants = requirePostgresRows(await transaction.query(postgresCampaignControlSql.lockTenant, [session.tenantId]), 1);
  const memberships = requirePostgresRows(await transaction.query(postgresCampaignControlSql.lockMembership,
    [session.tenantId, session.externalUserId]), 1);
  if (tenants.length !== 1 || parsePostgresPositiveInteger(requireExactPostgresRow(tenants[0], ["id"]).id) !== session.tenantId ||
      memberships.length !== 1 || requireExactPostgresRow(memberships[0], ["role"]).role !== session.role) {
    throw new Error("Campaign control authorization changed");
  }
}

export async function controlPostgresCampaign(transaction: PostgresTransaction, session: Readonly<TenantSession>,
  input: Readonly<CampaignControlRequest>) {
  const parameters = [session.tenantId, input.campaignKey];
  // The send claim locks this same campaign row before touching a recipient.
  const rows = requirePostgresRows(await transaction.query(postgresCampaignControlSql.lockCampaign, parameters), 1);
  if (rows.length !== 1) throw new CampaignControlConflict();
  const row = requireExactPostgresRow(rows[0], ["status", "version"]);
  if (parsePostgresPositiveInteger(row.version) !== input.expectedVersion ||
      typeof row.status !== "string" ||
      !canControlCampaign(row.status as Parameters<typeof canControlCampaign>[0], input.action)) {
    throw new CampaignControlConflict();
  }
  const changed = requirePostgresRows(await transaction.query(postgresCampaignControlSql.control,
    [...parameters, input.expectedVersion, input.action]), 1);
  if (changed.length !== 1 || requireExactPostgresRow(changed[0], ["campaignKey"]).campaignKey !== input.campaignKey) {
    throw new CampaignControlConflict();
  }
  if (input.action === "cancel") await transaction.query(postgresCampaignControlSql.cancelUnsent, parameters);
  const campaign = await createPostgresCampaignRepository({ queries: transaction,
    transactions: { transaction: (_options, execute) => execute(transaction) },
  }).findByKey(session.tenantId, input.campaignKey);
  if (campaign === null) throw new Error("Controlled campaign is unavailable");
  return Object.freeze({ outcome: "controlled" as const, campaign: toCampaignView(campaign) });
}
