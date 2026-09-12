import { hasPermission, type TenantRole } from "../../shared/domain/model.ts";
import { ManualReplyError, postgresManualReplySql as shared } from "./postgresManualReplyRepository.ts";
import { postgresAiReplyDeliverySql as sql } from "./postgresAiReplyDeliverySql.ts";
import { parsePostgresPositiveInteger as integer, parsePostgresTimestamp as timestamp, requirePostgresRows } from "./postgresResultValidation.ts";
import type { PostgresParameter, PostgresQueryExecutor } from "./postgresTransaction.ts";

export type AiDeliveryRow = Record<string, unknown>;
export async function aiDeliveryOne(q: PostgresQueryExecutor, statement: string, parameters: readonly PostgresParameter[]): Promise<AiDeliveryRow | null> {
  return requirePostgresRows(await q.query<AiDeliveryRow>(statement, parameters), 1)[0] ?? null;
}
export function aiDeliveryText(row: AiDeliveryRow, key: string): string {
  if (typeof row[key] !== "string" || row[key].length === 0) throw new Error("AI delivery database text is invalid");
  return row[key];
}
const one = aiDeliveryOne, text = aiDeliveryText;
export interface AiDeliveryBinding {
  readonly actor: string; readonly role: string; readonly conversationVersion: number;
  readonly contactId: number; readonly contactVersion: number; readonly recipientPhoneNumber: string;
  readonly businessPortfolioId: string; readonly wabaId: string; readonly phoneNumberId: string;
  readonly connectionVersion: number; readonly credentialRevision: number; readonly envelopeDigest: string;
  readonly policyEventKey: string; readonly serviceWindowExpiresAt: string;
}

/** The tenant barrier is taken before this function. Approval precedes conversation locks, matching approval mutation order. */
export async function requireAiDeliveryAuthority(tx: PostgresQueryExecutor, identity: AiDeliveryRow): Promise<AiDeliveryBinding> {
  const tenant = integer(identity.tenant_id);
  if (!await one(tx, shared.tenant, [tenant])) throw new ManualReplyError("AUTHORIZATION_DENIED");
  const o = await one(tx, sql.approval, [tenant, text(identity, "outbox_key")]);
  if (!o || o.approved !== true || o.generated !== true || o.status !== "ready-for-delivery" ||
    o.response_mode !== "agent-approval" || integer(o.version) !== integer(identity.approval_version) ||
    o.conversation_key !== identity.conversation_key) throw new ManualReplyError("AUTHORIZATION_DENIED");
  const actor = text(o, "decided_by_external_user_id");
  const member = await one(tx, shared.membership, [tenant, actor]);
  if (!member || !hasPermission(member.role as TenantRole, "conversations.reply")) throw new ManualReplyError("AUTHORIZATION_DENIED");
  const agent = await one(tx, sql.agent, [tenant, text(o, "ai_agent_key"), text(o, "ai_agent_version_key")]);
  if (!agent || agent.status !== "active" || agent.active_version_key !== o.ai_agent_version_key || agent.version_status !== "published" ||
    !agent.definition_json || typeof agent.definition_json !== "object" ||
    (agent.definition_json as Record<string, unknown>).responseMode !== "agent-approval") throw new ManualReplyError("AUTHORIZATION_DENIED");
  const conversation = await one(tx, sql.conversation, [tenant, text(identity, "conversation_key")]);
  if (!conversation || !["new", "bot_active"].includes(String(conversation.status)) || conversation.assigned_external_user_id !== null ||
    conversation.last_message_key !== o.inbound_message_key) throw new ManualReplyError("CONFLICT");
  const contactId = integer(conversation.contact_id);
  const contact = await one(tx, shared.contact, [tenant, contactId]);
  if (!contact || contact.consent_status === "withdrawn") throw new ManualReplyError("CONTACT_BLOCKED");
  if (contact.phone_e164 !== o.recipient_phone_e164) throw new ManualReplyError("CONFLICT");
  const window = await one(tx, sql.window, [tenant, text(o, "conversation_key"), text(o, "inbound_message_key")]);
  const now = await one(tx, shared.time, []);
  if (!window || !now || timestamp(window.expires_at) <= timestamp(now.now)) throw new ManualReplyError("SERVICE_WINDOW_CLOSED");
  const sourceRows = requirePostgresRows(await tx.query<AiDeliveryRow>(sql.sources, [tenant, text(o, "request_key")]), 20);
  const generation = await one(tx, sql.generation, [tenant, text(o, "request_key")]);
  const expectedPassages = (generation?.result_json as Record<string, unknown> | undefined)?.groundedPassageKeys;
  const expectedSources = o.grounded_source_keys_json;
  if (!Array.isArray(expectedPassages) || expectedPassages.length === 0 || !Array.isArray(expectedSources) ||
    JSON.stringify([...expectedPassages].sort()) !== JSON.stringify(sourceRows.map((r) => r.passage_key).sort()) ||
    JSON.stringify([...expectedSources].sort()) !== JSON.stringify([...new Set(sourceRows.map((r) => r.source_key))].sort())) {
    throw new ManualReplyError("AUTHORIZATION_DENIED");
  }
  if (await one(tx, sql.competing, [tenant, text(identity, "conversation_key"), text(identity, "delivery_key")])) throw new ManualReplyError("DELIVERY_UNAVAILABLE");
  const connection = await one(tx, shared.connection, [tenant]);
  const credential = await one(tx, shared.credential, [tenant]);
  if (!connection || !credential) throw new ManualReplyError("DELIVERY_UNAVAILABLE");
  const policy = await one(tx, shared.policy, [tenant, integer(connection.version)]);
  if (!policy) throw new ManualReplyError("DELIVERY_UNAVAILABLE");
  return { actor, role: text(member, "role"), conversationVersion: integer(conversation.version), contactId, contactVersion: integer(contact.version),
    recipientPhoneNumber: text(contact, "phone_e164"), businessPortfolioId: text(connection, "business_portfolio_id"),
    wabaId: text(connection, "waba_id"), phoneNumberId: text(connection, "phone_number_id"), connectionVersion: integer(connection.version),
    credentialRevision: integer(credential.credential_revision), envelopeDigest: text(credential, "envelope_digest"),
    policyEventKey: text(policy, "event_key"), serviceWindowExpiresAt: timestamp(window.expires_at) };
}
