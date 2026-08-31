import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import {
  PostgresDataMigrationError,
} from "../server/platform/postgresDataMigrationProtocol.ts";
import {
  POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS,
  POSTGRES_WHATSAPP_DELIVERY_POLICY_EXPECTED_TRIGGER_INVENTORY,
  createPostgresWhatsappDeliveryPolicyDataMigrationPlan,
  createPostgresWhatsappDeliveryPolicyDataSnapshot,
  executePostgresWhatsappDeliveryPolicyDataMigration,
} from "../server/platform/postgresWhatsappDeliveryPolicyDataMigration.ts";
import {
  createNodePostgresTransactionManager,
} from "../server/platform/nodePostgresAdapter.ts";
import {
  readD1WhatsappDeliveryPolicySnapshot,
} from "./read-d1-whatsapp-delivery-policy-snapshot.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const databaseName =
  "connect_whatsapp_delivery_policy_data_migration_rehearsal";
const environmentKey =
  "CONNECT_POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_MIGRATION_REHEARSAL_URL";
const evidenceHmacKey = Buffer.alloc(32, 101).toString("base64");
const actor = "user_whatsapp_policy_owner";
const evidenceDigest = "3".repeat(64);
const values = Object.freeze({
  base: "2026-08-20T08:00:00.000Z",
  checked: "2026-08-20T09:00:00.000Z",
  recorded: "2026-08-20T09:30:00.000Z",
  firstReserved: "2026-08-20T10:00:00.000Z",
  firstPair: "2026-08-20T10:00:06.000Z",
  firstExpires: "2026-08-20T10:05:00.000Z",
  firstSettled: "2026-08-20T10:01:00.000Z",
  firstBlocked: "2026-08-20T10:01:30.000Z",
  secondReserved: "2026-08-20T10:02:00.000Z",
  secondPair: "2026-08-20T10:02:06.000Z",
  secondExpires: "2026-08-20T10:07:00.000Z",
  secondSettled: "2026-08-20T10:03:00.000Z",
  advanced: "2026-08-20T10:04:00.000Z",
  buttonSource: "2026-08-20T09:45:00.000Z",
  buttonReserved: "2026-08-20T10:05:00.000Z",
  buttonPair: "2026-08-20T10:05:06.000Z",
  buttonExpires: "2026-08-20T10:10:00.000Z",
  buttonAccepted: "2026-08-20T10:05:30.000Z",
  buttonSettled: "2026-08-20T10:06:00.000Z",
  buttonInbound: "2026-08-20T10:06:30.000Z",
  windowOpened: "2026-08-20T08:15:00.000Z",
  windowExpires: "2026-08-21T08:15:00.000Z",
  windowAttempted: "2026-08-20T10:07:00.000Z",
  windowPair: "2026-08-20T10:07:06.000Z",
  windowReservationExpires: "2026-08-20T10:12:00.000Z",
  windowRejected: "2026-08-20T10:07:00.001Z",
  expires: "2026-08-21T09:00:00.000Z",
});

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function opaque(prefix, character) {
  return `${prefix}${character.repeat(64)}`;
}

const keys = Object.freeze({
  portfolio: opaque("whatsapp_portfolio_v1_", "a"),
  senderOne: opaque("whatsapp_sender_v1_", "b"),
  recipientOne: opaque("whatsapp_recipient_v1_", "c"),
  reservationOne: opaque("whatsapp_rate_reservation_v1_", "d"),
  senderTwo: opaque("whatsapp_sender_v1_", "e"),
  recipientTwo: opaque("whatsapp_recipient_v1_", "f"),
  reservationTwo: opaque("whatsapp_rate_reservation_v1_", "1"),
  delivery: opaque("campaign_delivery_v1_", "2"),
  campaign: opaque("campaign_v1_", "5"),
  template: opaque("template_v1_", "6"),
  submission: opaque("template_submission_v1_", "7"),
  audience: "8".repeat(64),
  personalization: "9".repeat(64),
  deliveredEvent: "4".repeat(64),
  readEvent: "5".repeat(64),
  botConversation: opaque("conversation_v1_", "a"),
  botFlow: opaque("bot_flow_v1_", "b"),
  botFlowVersion: opaque("bot_flow_version_v1_", "c"),
  buttonSourceMessage: opaque("message_v1_", "d"),
  buttonInboundMessage: opaque("message_v1_", "e"),
  windowInboundMessage: opaque("message_v1_", "f"),
  buttonDelivery: opaque("bot_reply_delivery_v1_", "6"),
  windowDelivery: opaque("bot_reply_delivery_v1_", "7"),
  buttonOption: opaque("bot_option_v1_", "8"),
  buttonReservation: opaque("whatsapp_rate_reservation_v1_", "9"),
  buttonSender: opaque("whatsapp_sender_v1_", "a"),
  buttonRecipient: opaque("whatsapp_recipient_v1_", "b"),
  buttonStatusEvent: "a".repeat(64),
  windowReservation: opaque("whatsapp_rate_reservation_v1_", "c"),
  windowSender: opaque("whatsapp_sender_v1_", "d"),
  windowRecipient: opaque("whatsapp_recipient_v1_", "e"),
  windowRejection: opaque("bot_reply_window_rejection_v1_", "f"),
  crossTenantConversation: opaque("conversation_v1_", "0"),
  crossTenantMessage: opaque("message_v1_", "0"),
  crossTenantCampaignMessage: opaque("message_v1_", "1"),
  campaignProviderCollisionMessage: opaque("message_v1_", "2"),
});

function botBlockKey(character) {
  return opaque("bot_block_v1_", character);
}

function botDefinition() {
  return {
    name: "מענה מדיניות WhatsApp",
    entryBlockKey: botBlockKey("1"),
    blocks: [
      {
        blockKey: botBlockKey("1"),
        type: "trigger",
        nextBlockKey: botBlockKey("2"),
      },
      {
        blockKey: botBlockKey("2"),
        type: "text",
        text: "מענה מאומת",
        nextBlockKey: botBlockKey("3"),
      },
      { blockKey: botBlockKey("3"), type: "end" },
    ],
  };
}

function buttonReply() {
  return {
    kind: "buttons",
    text: "בחרו מחלקה",
    options: [{ optionKey: keys.buttonOption, label: "שירות" }],
  };
}

function fail(code) {
  throw new Error(`POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_${code}`);
}

export function requireLocalWhatsappDeliveryPolicyDataMigrationUrl(value) {
  if (typeof value !== "string") fail("URL_INVALID");
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("URL_INVALID");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.pathname !== `/${databaseName}` || url.password !== "" ||
    url.search !== "" || url.hash !== ""
  ) {
    fail("URL_INVALID");
  }
  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail("URL_INVALID");
  }
  return url.toString();
}

function policyKey({ expectedPolicyVersion, deliveryState }) {
  return `whatsapp_delivery_policy_event_v1_${digest(JSON.stringify({
    namespace: "whatsapp_delivery_policy_event_v1",
    tenantId: 1,
    connectionVersion: 1,
    expectedPolicyVersion,
    deliveryState,
    portfolioCapacity: {
      kind: "bounded",
      maximumUniqueRecipients: 250,
    },
    phoneThroughput: {
      maximumMessagesPerSecond: 80,
      maximumOutboundMessagesPerSecond: 64,
    },
    reservationDurationSeconds: 300,
    metaGraphApiVersion: "v23.0",
    evidenceDigest,
    evidenceCheckedAt: values.checked,
    evidenceExpiresAt: values.expires,
    actorExternalUserId: actor,
  }))}`;
}

const enabledPolicyKey = policyKey({
  expectedPolicyVersion: 0,
  deliveryState: "enabled",
});
const disabledPolicyKey = policyKey({
  expectedPolicyVersion: 1,
  deliveryState: "disabled",
});
const gapPolicyKey = policyKey({
  expectedPolicyVersion: 3,
  deliveryState: "enabled",
});

async function migrationFiles(directory) {
  return (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name)).sort();
}

async function applyD1Migrations(database) {
  const directory = join(projectRoot, "drizzle");
  const files = await migrationFiles(directory);
  for (const fileName of files) {
    database.exec((await readFile(join(directory, fileName), "utf8"))
      .replaceAll("--> statement-breakpoint", ""));
  }
  return files.length;
}

async function applyPostgresMigrations(pool) {
  const existing = await pool.query(
    `SELECT count(*)::integer AS count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  if (existing.rows[0]?.count !== 0) fail("DATABASE_NOT_EMPTY");
  const directory = join(projectRoot, "postgres", "migrations");
  const files = await migrationFiles(directory);
  for (const fileName of files) {
    await pool.query(await readFile(join(directory, fileName), "utf8"));
  }
  return files.length;
}

function insertD1Policy(database, {
  eventKey,
  policyVersion,
  deliveryState,
  recordedAt,
}) {
  database.prepare(
    `INSERT INTO whatsapp_campaign_delivery_policy_events (
       event_key, tenant_id, connection_version, policy_version,
       delivery_state, portfolio_limit_kind, portfolio_limit_value,
       reservation_duration_seconds, meta_graph_api_version,
       evidence_digest, evidence_checked_at, evidence_expires_at,
       actor_external_user_id, recorded_at, created_at,
       phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second
     ) VALUES (?, 1, 1, ?, ?, 'bounded', 250, 300, 'v23.0',
       ?, ?, ?, ?, ?, ?, 80, 64)`,
  ).run(eventKey, policyVersion, deliveryState, evidenceDigest,
    values.checked, values.expires, actor, recordedAt, recordedAt);
}

function insertD1Reservation(database, {
  reservationKey,
  senderKey,
  recipientKey,
  reservedAt,
  pairUntil,
  expiresAt,
  reservationClass = "business-initiated",
  templateCategory = "UTILITY",
}) {
  database.prepare(
    `INSERT INTO whatsapp_rate_limit_reservations (
       reservation_key, tenant_id, portfolio_key, sender_key, recipient_key,
       portfolio_limit_kind, portfolio_limit_value, reserved_at,
       pair_reserved_until, reservation_expires_at, created_at,
       policy_event_key, phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second, reservation_class,
       template_category
     ) VALUES (?, 1, ?, ?, ?, 'bounded', 250, ?, ?, ?, ?, ?, 80, 64,
       ?, ?)`,
  ).run(reservationKey, keys.portfolio, senderKey, recipientKey, reservedAt,
    pairUntil, expiresAt, reservedAt, enabledPolicyKey, reservationClass,
    templateCategory);
}

function insertD1BotDelivery(database, {
  deliveryKey,
  inboundMessageKey,
  replyIndex,
  reply,
  createdAt,
}) {
  database.prepare(
    `INSERT INTO bot_reply_deliveries (
       delivery_key, tenant_id, conversation_key, inbound_message_key,
       bot_flow_key, bot_flow_version_key, reply_index,
       recipient_phone_e164, reply_json, status, attempt_count,
       provider_message_id, last_error_code, accepted_at, created_at,
       updated_at, sender_phone_number_id, claim_version,
       next_attempt_at, deferred_at, last_deferral_reason_code
     ) VALUES (?, 1, ?, ?, ?, ?, ?, '+972501234567', ?, 'pending', 0,
       NULL, NULL, NULL, ?, ?, 'phone-live', 0, NULL, NULL, NULL)`,
  ).run(
    deliveryKey,
    keys.botConversation,
    inboundMessageKey,
    keys.botFlow,
    keys.botFlowVersion,
    replyIndex,
    JSON.stringify(reply),
    createdAt,
    createdAt,
  );
}

function seedD1BotDependencies(database) {
  database.prepare(
    `INSERT INTO conversations (
       conversation_key, tenant_id, contact_id, status, unread_count,
       version, created_at, updated_at
     ) VALUES (?, 1, 1, 'bot_active', 2, 1, ?, ?)`,
  ).run(keys.botConversation, values.windowOpened, values.buttonSource);
  database.prepare(
    `INSERT INTO bot_flows (
       bot_flow_key, tenant_id, name, status, latest_version_key,
       latest_version_number, active_version_key, version, created_at,
       updated_at
     ) VALUES (?, 1, 'מענה מדיניות WhatsApp', 'active', ?, 1, ?, 2, ?, ?)`,
  ).run(
    keys.botFlow,
    keys.botFlowVersion,
    keys.botFlowVersion,
    values.base,
    values.buttonSource,
  );
  database.prepare(
    `INSERT INTO bot_flow_versions (
       bot_flow_version_key, bot_flow_key, tenant_id, version_number,
       status, definition_json, published_at, created_at
     ) VALUES (?, ?, 1, 1, 'published', ?, ?, ?)`,
  ).run(
    keys.botFlowVersion,
    keys.botFlow,
    JSON.stringify(botDefinition()),
    values.buttonSource,
    values.base,
  );
  const message = database.prepare(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, created_at, updated_at
     ) VALUES (?, ?, 1, ?, 'inbound', 'text', 'received', ?, ?, ?, ?, ?)`,
  );
  message.run(
    keys.buttonSourceMessage,
    keys.botConversation,
    "wamid.bot-button-source",
    "בחירת שירות",
    values.buttonSource,
    values.buttonSource,
    values.buttonSource,
    values.buttonSource,
  );
  message.run(
    keys.windowInboundMessage,
    keys.botConversation,
    "wamid.bot-window-source",
    "בדיקת חלון שירות",
    values.windowOpened,
    values.windowOpened,
    values.windowOpened,
    values.windowOpened,
  );
  insertD1BotDelivery(database, {
    deliveryKey: keys.buttonDelivery,
    inboundMessageKey: keys.buttonSourceMessage,
    replyIndex: 1,
    reply: buttonReply(),
    createdAt: values.buttonSource,
  });
  insertD1BotDelivery(database, {
    deliveryKey: keys.windowDelivery,
    inboundMessageKey: keys.windowInboundMessage,
    replyIndex: 2,
    reply: { kind: "text", text: "בדיקת חלון השירות" },
    createdAt: values.windowOpened,
  });
}

function seedD1BotEvidence(database) {
  database.prepare(
    `UPDATE bot_reply_deliveries
     SET status = 'sending', attempt_count = 1,
         claim_version = claim_version + 1, updated_at = ?
     WHERE delivery_key = ? AND status = 'pending'`,
  ).run(values.buttonReserved, keys.buttonDelivery);
  insertD1Reservation(database, {
    reservationKey: keys.buttonReservation,
    senderKey: keys.buttonSender,
    recipientKey: keys.buttonRecipient,
    reservedAt: values.buttonReserved,
    pairUntil: values.buttonPair,
    expiresAt: values.buttonExpires,
    reservationClass: "service-reply",
    templateCategory: null,
  });
  database.prepare(
    `INSERT INTO bot_reply_delivery_provider_links (
       delivery_key, tenant_id, provider_message_id, reservation_key,
       provider_status, accepted_at, created_at, updated_at
     ) VALUES (?, 1, 'wamid.bot-button-outbound', ?, 'accepted', ?, ?, ?)`,
  ).run(
    keys.buttonDelivery,
    keys.buttonReservation,
    values.buttonAccepted,
    values.buttonAccepted,
    values.buttonAccepted,
  );
  database.prepare(
    `UPDATE bot_reply_delivery_provider_links
     SET provider_status = 'delivered', last_status_event_key = ?,
         last_status_event_at = ?, terminal_outcome = 'delivered',
         terminal_settled_at = ?, updated_at = ?
     WHERE delivery_key = ?`,
  ).run(
    keys.buttonStatusEvent,
    values.buttonSettled,
    values.buttonSettled,
    values.buttonSettled,
    keys.buttonDelivery,
  );
  database.prepare(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, created_at, updated_at
     ) VALUES (?, ?, 1, 'wamid.bot-button-inbound', 'inbound',
       'interactive', 'received', NULL, ?, ?, ?, ?)`,
  ).run(
    keys.buttonInboundMessage,
    keys.botConversation,
    values.buttonInbound,
    values.buttonInbound,
    values.buttonInbound,
    values.buttonInbound,
  );
  database.prepare(
    `INSERT INTO inbound_button_reply_events (
       message_key, tenant_id, selected_bot_option_key,
       subject_delivery_key, occurred_at, created_at
     ) VALUES (?, 1, ?, ?, ?, ?)`,
  ).run(
    keys.buttonInboundMessage,
    keys.buttonOption,
    keys.buttonDelivery,
    values.buttonInbound,
    values.buttonInbound,
  );

  database.prepare(
    `UPDATE bot_reply_deliveries
     SET status = 'sending', attempt_count = 1,
         claim_version = claim_version + 1, updated_at = ?
     WHERE delivery_key = ? AND status = 'pending'`,
  ).run(values.windowAttempted, keys.windowDelivery);
  insertD1Reservation(database, {
    reservationKey: keys.windowReservation,
    senderKey: keys.windowSender,
    recipientKey: keys.windowRecipient,
    reservedAt: values.windowAttempted,
    pairUntil: values.windowPair,
    expiresAt: values.windowReservationExpires,
    reservationClass: "service-reply",
    templateCategory: null,
  });
  database.prepare(
    `INSERT INTO whatsapp_rate_limit_settlements (
       reservation_key, outcome, settled_at, created_at
     ) VALUES (?, 'provider-failed', ?, ?)`,
  ).run(
    keys.windowReservation,
    values.windowAttempted,
    values.windowAttempted,
  );
  database.prepare(
    `UPDATE bot_reply_deliveries
     SET status = 'rejected', last_error_code = 'META_SERVICE_WINDOW_CLOSED',
         updated_at = ?
     WHERE delivery_key = ? AND status = 'sending'`,
  ).run(values.windowRejected, keys.windowDelivery);
  database.prepare(
    `INSERT INTO bot_reply_service_window_rejection_events (
       event_key, delivery_key, tenant_id, claim_version, reservation_key,
       provider_error_code, reason_code, service_window_opened_at,
       service_window_expires_at, attempted_at, rejected_at, created_at
     ) VALUES (?, ?, 1, 1, ?, 131047, 'META_SERVICE_WINDOW_CLOSED',
       ?, ?, ?, ?, ?)`,
  ).run(
    keys.windowRejection,
    keys.windowDelivery,
    keys.windowReservation,
    values.windowOpened,
    values.windowExpires,
    values.windowAttempted,
    values.windowRejected,
    values.windowRejected,
  );
}

function seedD1(database) {
  database.prepare(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES (1, 'Connect Delivery', 'active', ?, ?, 'whatsapp-delivery')`,
  ).run(values.base, values.base);
  database.prepare(
    `INSERT INTO meta_connections (
       tenant_id, business_portfolio_id, waba_id, phone_number_id, status,
       webhook_subscribed_at, connected_at, version, created_at, updated_at
     ) VALUES (1, 'portfolio-live', 'waba-live', 'phone-live', 'connected',
       ?, ?, 1, ?, ?)`,
  ).run(values.base, values.base, values.base, values.base);
  database.prepare(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, first_name, mailing_status,
       consent_status, consent_source, consent_recorded_at,
       version, created_at, updated_at
     ) VALUES (1, 1, '+972501234567', 'Delivery', 'subscribed',
       'granted', 'explicit-form', ?, 1, ?, ?)`,
  ).run(values.base, values.base, values.base);
  seedD1BotDependencies(database);
  database.prepare(
    `INSERT INTO message_templates (
       template_key, tenant_id, meta_template_id, name, language, category,
       status, definition_json, submission_key, submission_started_at,
       last_status_event_key, last_status_event_at, version,
       submitted_at, reviewed_at, created_at, updated_at
     ) VALUES (?, 1, '123456', 'delivery_update', 'he', 'UTILITY',
       'approved', '{}', ?, ?, ?, ?, 2, ?, ?, ?, ?)`,
  ).run(keys.template, keys.submission, values.base, "6".repeat(64),
    values.base, values.base, values.base, values.base, values.base);
  database.prepare(
    `INSERT INTO campaigns (
       campaign_key, tenant_id, name, status, delivery_mode, scheduled_at,
       timezone, template_key, template_snapshot_json, audience_snapshot_key,
       recipient_count, version, activated_at, started_at,
       created_at, updated_at
     ) VALUES (?, 1, 'Delivery proof', 'running', 'immediate', NULL,
       'Asia/Jerusalem', ?, '{}', ?, 1, 2, ?, ?, ?, ?)`,
  ).run(keys.campaign, keys.template, keys.audience, values.base, values.base,
    values.base, values.secondReserved);
  database.prepare(
    `INSERT INTO campaign_recipients (
       campaign_key, tenant_id, contact_id, contact_version, phone_e164,
       personalization_json, personalization_key, delivery_key, status,
       attempt_count, queued_at, created_at, updated_at
     ) VALUES (?, 1, 1, 1, '+972501234567', '{}', ?, ?, 'sending',
       1, ?, ?, ?)`,
  ).run(keys.campaign, keys.personalization, keys.delivery,
    values.secondReserved, values.base, values.secondReserved);

  insertD1Policy(database, {
    eventKey: enabledPolicyKey,
    policyVersion: 1,
    deliveryState: "enabled",
    recordedAt: values.recorded,
  });
  insertD1Reservation(database, {
    reservationKey: keys.reservationOne,
    senderKey: keys.senderOne,
    recipientKey: keys.recipientOne,
    reservedAt: values.firstReserved,
    pairUntil: values.firstPair,
    expiresAt: values.firstExpires,
  });
  database.prepare(
    `INSERT INTO whatsapp_rate_limit_settlements (
       reservation_key, outcome, settled_at, created_at
     ) VALUES (?, 'provider-failed', ?, ?)`,
  ).run(keys.reservationOne, values.firstSettled, values.firstSettled);
  database.prepare(
    `INSERT INTO whatsapp_provider_cooldown_events (
       reservation_key, scope, provider_error_code,
       observed_at, blocked_until, created_at
     ) VALUES (?, 'pair', 131056, ?, ?, ?)`,
  ).run(keys.reservationOne, values.firstSettled, values.firstBlocked,
    values.firstSettled);

  insertD1Reservation(database, {
    reservationKey: keys.reservationTwo,
    senderKey: keys.senderTwo,
    recipientKey: keys.recipientTwo,
    reservedAt: values.secondReserved,
    pairUntil: values.secondPair,
    expiresAt: values.secondExpires,
  });
  database.prepare(
    `INSERT INTO campaign_delivery_provider_links (
       delivery_key, tenant_id, provider_message_id, reservation_key,
       provider_status, accepted_at, created_at, updated_at
     ) VALUES (?, 1, 'wamid.delivery-proof', ?, 'accepted', ?, ?, ?)`,
  ).run(keys.delivery, keys.reservationTwo, values.secondReserved,
    values.secondReserved, values.secondReserved);
  database.prepare(
    `UPDATE campaign_delivery_provider_links SET
       provider_status = 'delivered', last_status_event_key = ?,
       last_status_event_at = ?, terminal_outcome = 'delivered',
       terminal_settled_at = ?, updated_at = ?
     WHERE delivery_key = ?`,
  ).run(keys.deliveredEvent, values.secondSettled, values.secondSettled,
    values.secondSettled, keys.delivery);
  seedD1BotEvidence(database);
}

async function seedPostgresBotDependencies(pool) {
  await pool.query(
    `INSERT INTO conversations (
       conversation_key, tenant_id, contact_id, status, unread_count,
       version, created_at, updated_at
     ) VALUES ($1, 1, 1, 'bot_active', 3, 1, $2, $3)`,
    [keys.botConversation, values.windowOpened, values.buttonInbound],
  );
  await pool.query(
    `INSERT INTO bot_flows (
       bot_flow_key, tenant_id, name, status, latest_version_key,
       latest_version_number, active_version_key, version, created_at,
       updated_at
     ) VALUES ($1, 1, 'מענה מדיניות WhatsApp', 'active', $2, 1, $2, 2,
       $3, $4)`,
    [keys.botFlow, keys.botFlowVersion, values.base, values.buttonSource],
  );
  await pool.query(
    `INSERT INTO bot_flow_versions (
       bot_flow_version_key, bot_flow_key, tenant_id, version_number,
       status, definition_json, published_at, created_at
     ) VALUES ($1, $2, 1, 1, 'published', $3::jsonb, $4, $5)`,
    [keys.botFlowVersion, keys.botFlow, JSON.stringify(botDefinition()),
      values.buttonSource, values.base],
  );
  await pool.query(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, created_at, updated_at
     ) VALUES
       ($1, $4, 1, 'wamid.bot-button-source', 'inbound', 'text',
        'received', 'בחירת שירות', $5, $5, $5, $5),
       ($2, $4, 1, 'wamid.bot-window-source', 'inbound', 'text',
        'received', 'בדיקת חלון שירות', $6, $6, $6, $6),
       ($3, $4, 1, 'wamid.bot-button-inbound', 'inbound', 'interactive',
        'received', NULL, $7, $7, $7, $7)`,
    [keys.buttonSourceMessage, keys.windowInboundMessage,
      keys.buttonInboundMessage, keys.botConversation, values.buttonSource,
      values.windowOpened, values.buttonInbound],
  );
  const insertDelivery = async ({ deliveryKey, inboundMessageKey,
    replyIndex, reply, createdAt }) => {
    await pool.query(
      `INSERT INTO bot_reply_deliveries (
         delivery_key, tenant_id, conversation_key, inbound_message_key,
         bot_flow_key, bot_flow_version_key, reply_index,
         recipient_phone_e164, reply_json, status, attempt_count,
         provider_message_id, last_error_code, accepted_at, created_at,
         updated_at, sender_phone_number_id, claim_version,
         next_attempt_at, deferred_at, last_deferral_reason_code
       ) VALUES ($1, 1, $2, $3, $4, $5, $6, '+972501234567', $7::jsonb,
         'pending', 0, NULL, NULL, NULL, $8, $8, 'phone-live', 0,
         NULL, NULL, NULL)`,
      [deliveryKey, keys.botConversation, inboundMessageKey, keys.botFlow,
        keys.botFlowVersion, replyIndex, JSON.stringify(reply), createdAt],
    );
  };
  await insertDelivery({
    deliveryKey: keys.buttonDelivery,
    inboundMessageKey: keys.buttonSourceMessage,
    replyIndex: 1,
    reply: buttonReply(),
    createdAt: values.buttonSource,
  });
  await insertDelivery({
    deliveryKey: keys.windowDelivery,
    inboundMessageKey: keys.windowInboundMessage,
    replyIndex: 2,
    reply: { kind: "text", text: "בדיקת חלון השירות" },
    createdAt: values.windowOpened,
  });
  await pool.query(
    `UPDATE bot_reply_deliveries
     SET status = 'sending', attempt_count = 1,
         claim_version = claim_version + 1, updated_at = $1
     WHERE delivery_key = $2 AND status = 'pending'`,
    [values.buttonReserved, keys.buttonDelivery],
  );
  await pool.query(
    `UPDATE bot_reply_deliveries
     SET status = 'accepted', provider_message_id = 'wamid.bot-button-outbound',
         accepted_at = $1, updated_at = $1
     WHERE delivery_key = $2 AND status = 'sending'`,
    [values.buttonAccepted, keys.buttonDelivery],
  );
  await pool.query(
    `UPDATE bot_reply_deliveries
     SET status = 'sending', attempt_count = 1,
         claim_version = claim_version + 1, updated_at = $1
     WHERE delivery_key = $2 AND status = 'pending'`,
    [values.windowAttempted, keys.windowDelivery],
  );
  await pool.query(
    `UPDATE bot_reply_deliveries
     SET status = 'rejected', last_error_code = 'META_SERVICE_WINDOW_CLOSED',
         updated_at = $1
     WHERE delivery_key = $2 AND status = 'sending'`,
    [values.windowRejected, keys.windowDelivery],
  );
  await pool.query(
    `INSERT INTO conversations (
       conversation_key, tenant_id, contact_id, status, unread_count,
       version, created_at, updated_at
     ) VALUES ($1, 2, 2, 'bot_active', 1, 1, $2, $2)`,
    [keys.crossTenantConversation, values.base],
  );
  await pool.query(
    `INSERT INTO messages (
       message_key, conversation_key, tenant_id, provider_message_id,
       direction, content_kind, status, text_content, occurred_at,
       status_updated_at, created_at, updated_at
     ) VALUES
       ($1, $2, 2, 'wamid.bot-button-outbound', 'inbound', 'text',
        'received', 'מזהה בוט זהה בטננט אחר', $4, $4, $4, $4),
       ($3, $2, 2, 'wamid.delivery-proof', 'inbound', 'text',
        'received', 'מזהה קמפיין זהה בטננט אחר', $4, $4, $4, $4)`,
    [
      keys.crossTenantMessage,
      keys.crossTenantConversation,
      keys.crossTenantCampaignMessage,
      values.base,
    ],
  );
}

async function seedPostgresDependencies(database, pool) {
  await pool.query(
    `INSERT INTO tenants (
       id, display_name, status, created_at, updated_at, provisioning_key
     ) VALUES
       (1, 'Connect Delivery', 'active', $1, $1, 'whatsapp-delivery'),
       (2, 'Cross-tenant proof', 'active', $1, $1,
        'whatsapp-delivery-cross-tenant')`,
    [values.base],
  );
  await pool.query(
    `INSERT INTO meta_connections (
       tenant_id, business_portfolio_id, waba_id, phone_number_id, status,
       webhook_subscribed_at, connected_at, version, created_at, updated_at
     ) VALUES (1, 'portfolio-live', 'waba-live', 'phone-live', 'connected',
       $1, $1, 1, $1, $1)`,
    [values.base],
  );
  await pool.query(
    `INSERT INTO contacts (
       id, tenant_id, phone_e164, first_name, mailing_status,
       consent_status, consent_source, consent_recorded_at,
       version, created_at, updated_at
     ) VALUES
       (1, 1, '+972501234567', 'Delivery', 'subscribed',
        'granted', 'explicit-form', $1, 1, $1, $1),
       (2, 2, '+972509999999', 'Cross tenant', 'unsubscribed',
        'unknown', NULL, NULL, 1, $1, $1)`,
    [values.base],
  );
  await seedPostgresBotDependencies(pool);
  await pool.query(
    `INSERT INTO message_templates (
       template_key, tenant_id, meta_template_id, name, language, category,
       status, definition_json, submission_key, submission_started_at,
       last_status_event_key, last_status_event_at, version,
       submitted_at, reviewed_at, created_at, updated_at
     ) VALUES ($1, 1, '123456', 'delivery_update', 'he', 'UTILITY',
       'approved', '{}'::jsonb, $2, $3, $4, $3, 2, $3, $3, $3, $3)`,
    [keys.template, keys.submission, values.base, "6".repeat(64)],
  );
  await pool.query(
    `INSERT INTO campaigns (
       campaign_key, tenant_id, name, status, delivery_mode, scheduled_at,
       timezone, template_key, template_snapshot_json, audience_snapshot_key,
       recipient_count, version, activated_at, started_at,
       created_at, updated_at
     ) VALUES ($1, 1, 'Delivery proof', 'running', 'immediate', NULL,
       'Asia/Jerusalem', $2, '{}'::jsonb, $3, 1, 2, $4, $4, $4, $5)`,
    [keys.campaign, keys.template, keys.audience, values.base,
      values.secondReserved],
  );
  await pool.query(
    `INSERT INTO campaign_recipients (
       campaign_key, tenant_id, contact_id, contact_version, phone_e164,
       personalization_json, personalization_key, delivery_key, status,
       attempt_count, queued_at, accepted_at, created_at, updated_at
     ) VALUES ($1, 1, 1, 1, '+972501234567', '{}'::jsonb, $2, $3,
       'delivered', 1, $4, $4, $5, $6)`,
    [keys.campaign, keys.personalization, keys.delivery,
      values.secondReserved, values.base, values.secondSettled],
  );
  const audits = database.prepare(
    `SELECT id, tenant_id, actor_external_user_id, action, target_type,
       target_id, idempotency_key, metadata_json, created_at
     FROM audit_logs ORDER BY id`,
  ).all();
  for (const audit of audits) {
    await pool.query(
      `INSERT INTO audit_logs (
         id, tenant_id, actor_external_user_id, action, target_type,
         target_id, idempotency_key, metadata_json, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
      [audit.id, audit.tenant_id, audit.actor_external_user_id, audit.action,
        audit.target_type, audit.target_id, audit.idempotency_key,
        audit.metadata_json, audit.created_at],
    );
  }
  await pool.query(
    `SELECT setval(
       pg_get_serial_sequence('public.audit_logs', 'id'),
       COALESCE(max(id), 1), count(*) > 0
     ) FROM audit_logs`,
  );
}

async function captureOutcome(operation) {
  try {
    await operation();
    return Object.freeze({ outcome: "accepted", errorMessage: null });
  } catch (error) {
    return Object.freeze({
      outcome: "rejected",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

async function compareOutcome(observations, name, d1Operation,
  postgresOperation, expected, expectedErrorMessage = null) {
  const [d1Result, postgresResult] = await Promise.all([
    captureOutcome(d1Operation),
    captureOutcome(postgresOperation),
  ]);
  assert.equal(postgresResult.outcome, d1Result.outcome, `${name} diverged`);
  assert.equal(
    d1Result.outcome,
    expected,
    `${name} outcome was not ${expected}`,
  );
  if (expectedErrorMessage !== null) {
    assert.equal(d1Result.errorMessage, expectedErrorMessage);
    assert.equal(postgresResult.errorMessage, expectedErrorMessage);
  }
  observations.push(Object.freeze({ name, outcome: expected }));
}

async function runSemanticParityScenarios(database, pool) {
  const observations = [];
  await compareOutcome(observations, "advance-provider-to-read", () => {
    database.prepare(
      `UPDATE campaign_delivery_provider_links SET provider_status = 'read',
       last_status_event_key = ?, last_status_event_at = ?, updated_at = ?
       WHERE delivery_key = ?`,
    ).run(keys.readEvent, values.advanced, values.advanced, keys.delivery);
  }, () => pool.query(
    `UPDATE campaign_delivery_provider_links SET provider_status = 'read',
     last_status_event_key = $1, last_status_event_at = $2, updated_at = $2
     WHERE delivery_key = $3`,
    [keys.readEvent, values.advanced, keys.delivery],
  ), "accepted");

  await compareOutcome(observations, "disable-policy", () => {
    insertD1Policy(database, {
      eventKey: disabledPolicyKey,
      policyVersion: 2,
      deliveryState: "disabled",
      recordedAt: values.advanced,
    });
  }, () => pool.query(
    `INSERT INTO whatsapp_campaign_delivery_policy_events (
       event_key, tenant_id, connection_version, policy_version,
       delivery_state, portfolio_limit_kind, portfolio_limit_value,
       reservation_duration_seconds, meta_graph_api_version,
       evidence_digest, evidence_checked_at, evidence_expires_at,
       actor_external_user_id, recorded_at, created_at,
       phone_throughput_messages_per_second,
       maximum_outbound_messages_per_second
     ) VALUES ($1, 1, 1, 2, 'disabled', 'bounded', 250, 300, 'v23.0',
       $2, $3, $4, $5, $6, $6, 80, 64)`,
    [disabledPolicyKey, evidenceDigest, values.checked, values.expires,
      actor, values.advanced],
  ), "accepted");

  const rejected = [
    ["mutate-reservation",
      () => database.prepare(
        "UPDATE whatsapp_rate_limit_reservations SET tenant_id = 2 WHERE reservation_key = ?",
      ).run(keys.reservationOne),
      () => pool.query(
        "UPDATE whatsapp_rate_limit_reservations SET tenant_id = 2 WHERE reservation_key = $1",
        [keys.reservationOne],
      )],
    ["delete-settlement",
      () => database.prepare(
        "DELETE FROM whatsapp_rate_limit_settlements WHERE reservation_key = ?",
      ).run(keys.reservationOne),
      () => pool.query(
        "DELETE FROM whatsapp_rate_limit_settlements WHERE reservation_key = $1",
        [keys.reservationOne],
      )],
    ["shorten-cooldown",
      () => database.prepare(
        "UPDATE whatsapp_provider_cooldown_state SET blocked_until = ? WHERE reservation_key = ?",
      ).run(values.firstSettled, keys.reservationOne),
      () => pool.query(
        "UPDATE whatsapp_provider_cooldown_state SET blocked_until = $1 WHERE reservation_key = $2",
        [values.firstSettled, keys.reservationOne],
      )],
    ["mutate-provider-identity",
      () => database.prepare(
        "UPDATE campaign_delivery_provider_links SET provider_message_id = 'changed' WHERE delivery_key = ?",
      ).run(keys.delivery),
      () => pool.query(
        "UPDATE campaign_delivery_provider_links SET provider_message_id = 'changed' WHERE delivery_key = $1",
        [keys.delivery],
      )],
    ["delete-provider-link",
      () => database.prepare(
        "DELETE FROM campaign_delivery_provider_links WHERE delivery_key = ?",
      ).run(keys.delivery),
      () => pool.query(
        "DELETE FROM campaign_delivery_provider_links WHERE delivery_key = $1",
        [keys.delivery],
      )],
    ["campaign-provider-message-collision",
      () => database.prepare(
        `INSERT INTO messages (
           message_key, conversation_key, tenant_id, provider_message_id,
           direction, content_kind, status, text_content, occurred_at,
           status_updated_at, created_at, updated_at
         ) VALUES (?, ?, 1, 'wamid.delivery-proof', 'inbound', 'text',
           'received', 'התנגשות הוכחת קמפיין', ?, ?, ?, ?)`,
      ).run(
        keys.campaignProviderCollisionMessage,
        keys.botConversation,
        values.advanced,
        values.advanced,
        values.advanced,
        values.advanced,
      ),
      () => pool.query(
        `INSERT INTO messages (
           message_key, conversation_key, tenant_id, provider_message_id,
           direction, content_kind, status, text_content, occurred_at,
           status_updated_at, created_at, updated_at
         ) VALUES ($1, $2, 1, 'wamid.delivery-proof', 'inbound', 'text',
           'received', 'התנגשות הוכחת קמפיין', $3, $3, $3, $3)`,
        [
          keys.campaignProviderCollisionMessage,
          keys.botConversation,
          values.advanced,
        ],
      ),
      "Provider message already belongs to a campaign delivery"],
    ["policy-version-gap",
      () => database.prepare(
        `INSERT INTO whatsapp_campaign_delivery_policy_events (
           event_key, tenant_id, connection_version, policy_version,
           delivery_state, portfolio_limit_kind, portfolio_limit_value,
           reservation_duration_seconds, meta_graph_api_version,
           evidence_digest, evidence_checked_at, evidence_expires_at,
           actor_external_user_id, recorded_at, created_at,
           phone_throughput_messages_per_second,
           maximum_outbound_messages_per_second
         ) VALUES (?, 1, 1, 4, 'enabled', 'bounded', 250, 300, 'v23.0',
           ?, ?, ?, ?, ?, ?, 80, 64)`,
      ).run(gapPolicyKey, evidenceDigest, values.checked, values.expires,
        actor, values.advanced, values.advanced),
      () => pool.query(
        `INSERT INTO whatsapp_campaign_delivery_policy_events (
           event_key, tenant_id, connection_version, policy_version,
           delivery_state, portfolio_limit_kind, portfolio_limit_value,
           reservation_duration_seconds, meta_graph_api_version,
           evidence_digest, evidence_checked_at, evidence_expires_at,
           actor_external_user_id, recorded_at, created_at,
           phone_throughput_messages_per_second,
           maximum_outbound_messages_per_second
         ) VALUES ($1, 1, 1, 4, 'enabled', 'bounded', 250, 300, 'v23.0',
           $2, $3, $4, $5, $6, $6, 80, 64)`,
        [gapPolicyKey, evidenceDigest, values.checked, values.expires,
          actor, values.advanced],
      )],
    ["reservation-after-kill-switch",
      () => insertD1Reservation(database, {
        reservationKey: opaque("whatsapp_rate_reservation_v1_", "a"),
        senderKey: opaque("whatsapp_sender_v1_", "a"),
        recipientKey: opaque("whatsapp_recipient_v1_", "a"),
        reservedAt: values.advanced,
        pairUntil: "2026-08-20T10:04:06.000Z",
        expiresAt: "2026-08-20T10:09:00.000Z",
      }),
      () => pool.query(
        `INSERT INTO whatsapp_rate_limit_reservations (
           reservation_key, tenant_id, portfolio_key, sender_key,
           recipient_key, template_category, portfolio_limit_kind,
           portfolio_limit_value, reserved_at, pair_reserved_until,
           reservation_expires_at, created_at, policy_event_key,
           phone_throughput_messages_per_second,
           maximum_outbound_messages_per_second, reservation_class
         ) VALUES ($1, 1, $2, $3, $4, 'UTILITY', 'bounded', 250,
           $5, $6, $7, $5, $8, 80, 64, 'business-initiated')`,
        [opaque("whatsapp_rate_reservation_v1_", "a"), keys.portfolio,
          opaque("whatsapp_sender_v1_", "a"),
          opaque("whatsapp_recipient_v1_", "a"), values.advanced,
          "2026-08-20T10:04:06.000Z", "2026-08-20T10:09:00.000Z",
          enabledPolicyKey],
      ),
      "WhatsApp reservation lacks current throughput evidence"],
  ];
  for (const [name, d1Operation, postgresOperation,
    expectedErrorMessage] of rejected) {
    await compareOutcome(
      observations,
      name,
      d1Operation,
      postgresOperation,
      "rejected",
      expectedErrorMessage,
    );
  }
  return observations;
}

function readD1State(database) {
  return readD1WhatsappDeliveryPolicySnapshot(database).tables;
}

async function readPostgresState(pool) {
  return Object.fromEntries(await Promise.all(
    POSTGRES_WHATSAPP_DELIVERY_POLICY_DATA_TABLE_CONTRACTS.map(
      async (table) => {
        const result = await pool.query(
          `SELECT ${table.columns.map(({ name }) => name).join(", ")}
           FROM ${table.name}
           ORDER BY ${table.orderBy.join(", ")}`,
        );
        return [table.name, result.rows];
      },
    ),
  ));
}

async function requirePostgresTriggerInventory(pool) {
  const expected = POSTGRES_WHATSAPP_DELIVERY_POLICY_EXPECTED_TRIGGER_INVENTORY
    .map(({ tableName, triggerName }) => ({
      tableName,
      triggerName,
      enabled: "O",
    }))
    .sort((left, right) => (
      left.tableName.localeCompare(right.tableName) ||
      left.triggerName.localeCompare(right.triggerName)
    ));
  const relationNames = Array.from(new Set(
    expected.map(({ tableName }) => tableName),
  )).sort();
  const result = await pool.query(
    `SELECT
       relation.relname::text AS "tableName",
       trigger.tgname::text AS "triggerName",
       trigger.tgenabled::text AS enabled
     FROM pg_catalog.pg_trigger AS trigger
     INNER JOIN pg_catalog.pg_class AS relation
       ON relation.oid = trigger.tgrelid
     INNER JOIN pg_catalog.pg_namespace AS namespace
       ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = current_schema()
       AND NOT trigger.tgisinternal
       AND relation.relname = ANY($1::text[])
     ORDER BY relation.relname, trigger.tgname`,
    [relationNames],
  );
  assert.deepEqual(result.rows, expected);
  assert.equal(result.rowCount, 47);
  return result.rowCount;
}

async function requireDisabledTriggerPreflightRejection(pool, plan) {
  const tableName = "whatsapp_rate_limit_reservations";
  const triggerName = "whatsapp_rate_reservations_insert_guard";
  await pool.query(
    `ALTER TABLE ${tableName} DISABLE TRIGGER ${triggerName}`,
  );
  try {
    const disabled = await pool.query(
      `SELECT trigger.tgenabled::text AS enabled
       FROM pg_catalog.pg_trigger AS trigger
       INNER JOIN pg_catalog.pg_class AS relation
         ON relation.oid = trigger.tgrelid
       WHERE relation.relname = $1 AND trigger.tgname = $2`,
      [tableName, triggerName],
    );
    assert.deepEqual(disabled.rows, [{ enabled: "D" }]);
    await assert.rejects(
      executePostgresWhatsappDeliveryPolicyDataMigration({
        plan,
        transactions: createNodePostgresTransactionManager(pool),
        evidenceHmacKey,
        now: "2026-08-20T11:05:00.000Z",
      }),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "target-verification-failed",
    );
    const target = await readPostgresState(pool);
    assert.equal(Object.values(target).flat().length, 0);
  } finally {
    await pool.query(
      `ALTER TABLE ${tableName} ENABLE TRIGGER ${triggerName}`,
    );
  }
}

function requireD1BotPolicyEvidence(database) {
  const provider = database.prepare(
    `SELECT
       link.provider_status AS providerStatus,
       link.terminal_outcome AS terminalOutcome,
       reservation.reservation_class AS reservationClass,
       settlement.outcome AS settlementOutcome,
       delivery.status AS deliveryStatus,
       delivery.provider_message_id AS providerMessageId,
       delivery.accepted_at AS acceptedAt
     FROM bot_reply_delivery_provider_links AS link
     INNER JOIN bot_reply_deliveries AS delivery
       ON delivery.delivery_key = link.delivery_key
       AND delivery.tenant_id = link.tenant_id
     INNER JOIN whatsapp_rate_limit_reservations AS reservation
       ON reservation.reservation_key = link.reservation_key
     INNER JOIN whatsapp_rate_limit_settlements AS settlement
       ON settlement.reservation_key = link.reservation_key
     WHERE link.delivery_key = ?`,
  ).get(keys.buttonDelivery);
  assert.deepEqual({ ...provider }, {
    providerStatus: "delivered",
    terminalOutcome: "delivered",
    reservationClass: "service-reply",
    settlementOutcome: "delivered",
    deliveryStatus: "accepted",
    providerMessageId: "wamid.bot-button-outbound",
    acceptedAt: values.buttonAccepted,
  });

  const button = database.prepare(
    `SELECT
       event.selected_bot_option_key AS selectedOptionKey,
       inbound.content_kind AS contentKind,
       delivery.status AS deliveryStatus,
       json_extract(delivery.reply_json, '$.kind') AS replyKind
     FROM inbound_button_reply_events AS event
     INNER JOIN messages AS inbound
       ON inbound.message_key = event.message_key
       AND inbound.tenant_id = event.tenant_id
     INNER JOIN bot_reply_deliveries AS delivery
       ON delivery.delivery_key = event.subject_delivery_key
       AND delivery.tenant_id = event.tenant_id
     WHERE event.message_key = ?`,
  ).get(keys.buttonInboundMessage);
  assert.deepEqual({ ...button }, {
    selectedOptionKey: keys.buttonOption,
    contentKind: "interactive",
    deliveryStatus: "accepted",
    replyKind: "buttons",
  });

  const rejection = database.prepare(
    `SELECT
       event.provider_error_code AS providerErrorCode,
       event.reason_code AS reasonCode,
       event.claim_version AS claimVersion,
       delivery.status AS deliveryStatus,
       reservation.reservation_class AS reservationClass,
       settlement.outcome AS settlementOutcome,
       event.service_window_opened_at AS serviceWindowOpenedAt,
       event.attempted_at AS attemptedAt,
       event.rejected_at AS rejectedAt
     FROM bot_reply_service_window_rejection_events AS event
     INNER JOIN bot_reply_deliveries AS delivery
       ON delivery.delivery_key = event.delivery_key
       AND delivery.tenant_id = event.tenant_id
     INNER JOIN whatsapp_rate_limit_reservations AS reservation
       ON reservation.reservation_key = event.reservation_key
     INNER JOIN whatsapp_rate_limit_settlements AS settlement
       ON settlement.reservation_key = event.reservation_key
     WHERE event.event_key = ?`,
  ).get(keys.windowRejection);
  assert.deepEqual({ ...rejection }, {
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    claimVersion: 1,
    deliveryStatus: "rejected",
    reservationClass: "service-reply",
    settlementOutcome: "provider-failed",
    serviceWindowOpenedAt: values.windowOpened,
    attemptedAt: values.windowAttempted,
    rejectedAt: values.windowRejected,
  });
}

async function requirePostgresBotPolicyEvidence(pool) {
  const providerResult = await pool.query(
    `SELECT
       link.provider_status AS "providerStatus",
       link.terminal_outcome AS "terminalOutcome",
       reservation.reservation_class AS "reservationClass",
       settlement.outcome AS "settlementOutcome",
       delivery.status AS "deliveryStatus",
       delivery.provider_message_id AS "providerMessageId",
       delivery.accepted_at AS "acceptedAt"
     FROM bot_reply_delivery_provider_links AS link
     INNER JOIN bot_reply_deliveries AS delivery
       ON delivery.delivery_key = link.delivery_key
       AND delivery.tenant_id = link.tenant_id
     INNER JOIN whatsapp_rate_limit_reservations AS reservation
       ON reservation.reservation_key = link.reservation_key
     INNER JOIN whatsapp_rate_limit_settlements AS settlement
       ON settlement.reservation_key = link.reservation_key
     WHERE link.delivery_key = $1`,
    [keys.buttonDelivery],
  );
  assert.deepEqual({
    ...providerResult.rows[0],
    acceptedAt: providerResult.rows[0]?.acceptedAt.toISOString(),
  }, {
    providerStatus: "delivered",
    terminalOutcome: "delivered",
    reservationClass: "service-reply",
    settlementOutcome: "delivered",
    deliveryStatus: "accepted",
    providerMessageId: "wamid.bot-button-outbound",
    acceptedAt: values.buttonAccepted,
  });
  const crossTenantProviderId = await pool.query(
    `SELECT
       provider_message_id AS "providerMessageId",
       tenant_id::integer AS "tenantId"
     FROM messages
     WHERE provider_message_id IN (
       'wamid.bot-button-outbound',
       'wamid.delivery-proof'
     )
     ORDER BY provider_message_id, tenant_id`,
  );
  assert.deepEqual(crossTenantProviderId.rows, [{
    providerMessageId: "wamid.bot-button-outbound",
    tenantId: 2,
  }, {
    providerMessageId: "wamid.delivery-proof",
    tenantId: 2,
  }]);

  const buttonResult = await pool.query(
    `SELECT
       event.selected_bot_option_key AS "selectedOptionKey",
       inbound.content_kind AS "contentKind",
       delivery.status AS "deliveryStatus",
       delivery.reply_json ->> 'kind' AS "replyKind"
     FROM inbound_button_reply_events AS event
     INNER JOIN messages AS inbound
       ON inbound.message_key = event.message_key
       AND inbound.tenant_id = event.tenant_id
     INNER JOIN bot_reply_deliveries AS delivery
       ON delivery.delivery_key = event.subject_delivery_key
       AND delivery.tenant_id = event.tenant_id
     WHERE event.message_key = $1`,
    [keys.buttonInboundMessage],
  );
  assert.deepEqual(buttonResult.rows[0], {
    selectedOptionKey: keys.buttonOption,
    contentKind: "interactive",
    deliveryStatus: "accepted",
    replyKind: "buttons",
  });

  const rejectionResult = await pool.query(
    `SELECT
       event.provider_error_code::integer AS "providerErrorCode",
       event.reason_code AS "reasonCode",
       event.claim_version::integer AS "claimVersion",
       delivery.status AS "deliveryStatus",
       reservation.reservation_class AS "reservationClass",
       settlement.outcome AS "settlementOutcome",
       event.service_window_opened_at AS "serviceWindowOpenedAt",
       event.attempted_at AS "attemptedAt",
       event.rejected_at AS "rejectedAt"
     FROM bot_reply_service_window_rejection_events AS event
     INNER JOIN bot_reply_deliveries AS delivery
       ON delivery.delivery_key = event.delivery_key
       AND delivery.tenant_id = event.tenant_id
     INNER JOIN whatsapp_rate_limit_reservations AS reservation
       ON reservation.reservation_key = event.reservation_key
     INNER JOIN whatsapp_rate_limit_settlements AS settlement
       ON settlement.reservation_key = event.reservation_key
     WHERE event.event_key = $1`,
    [keys.windowRejection],
  );
  const rejection = rejectionResult.rows[0];
  assert.deepEqual({
    ...rejection,
    serviceWindowOpenedAt: rejection?.serviceWindowOpenedAt.toISOString(),
    attemptedAt: rejection?.attemptedAt.toISOString(),
    rejectedAt: rejection?.rejectedAt.toISOString(),
  }, {
    providerErrorCode: 131047,
    reasonCode: "META_SERVICE_WINDOW_CLOSED",
    claimVersion: 1,
    deliveryStatus: "rejected",
    reservationClass: "service-reply",
    settlementOutcome: "provider-failed",
    serviceWindowOpenedAt: values.windowOpened,
    attemptedAt: values.windowAttempted,
    rejectedAt: values.windowRejected,
  });
}

function comparableSnapshot(tables) {
  return JSON.parse(JSON.stringify(
    createPostgresWhatsappDeliveryPolicyDataSnapshot(tables).tables,
  ));
}

async function main() {
  const url = requireLocalWhatsappDeliveryPolicyDataMigrationUrl(
    process.env[environmentKey],
  );
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  try {
    const d1MigrationCount = await applyD1Migrations(database);
    const postgresMigrationCount = await applyPostgresMigrations(pool);
    seedD1(database);
    requireD1BotPolicyEvidence(database);
    await seedPostgresDependencies(database, pool);
    const snapshot = readD1WhatsappDeliveryPolicySnapshot(database);
    const plan = createPostgresWhatsappDeliveryPolicyDataMigrationPlan({
      snapshot,
      createdAt: "2026-08-20T11:00:00.000Z",
      expiresAt: "2026-08-20T11:15:00.000Z",
      evidenceHmacKey,
    });
    const triggerCountBefore = await requirePostgresTriggerInventory(pool);
    await requireDisabledTriggerPreflightRejection(pool, plan);
    assert.equal(
      await requirePostgresTriggerInventory(pool),
      triggerCountBefore,
    );
    const evidence = await executePostgresWhatsappDeliveryPolicyDataMigration({
      plan,
      transactions: createNodePostgresTransactionManager(pool),
      evidenceHmacKey,
      now: "2026-08-20T11:05:00.000Z",
    });
    const triggerCountAfter = await requirePostgresTriggerInventory(pool);
    assert.equal(triggerCountAfter, triggerCountBefore);
    await requirePostgresBotPolicyEvidence(pool);
    assert.equal(evidence.tableCount, 11);
    assert.equal(evidence.totalRowCount, 21);
    await assert.rejects(
      executePostgresWhatsappDeliveryPolicyDataMigration({
        plan,
        transactions: createNodePostgresTransactionManager(pool),
        evidenceHmacKey,
        now: "2026-08-20T11:05:00.000Z",
      }),
      (error) => error instanceof PostgresDataMigrationError &&
        error.code === "target-not-empty",
    );
    const observations = await runSemanticParityScenarios(database, pool);
    assert.equal(observations.length, 10);
    assert.deepEqual(
      comparableSnapshot(await readPostgresState(pool)),
      comparableSnapshot(readD1State(database)),
    );
    console.log(
      `PostgreSQL WhatsApp delivery-policy data rehearsal: PASS (${d1MigrationCount} D1 migrations, ${postgresMigrationCount} PostgreSQL migrations, 11 tables, 21 rows, replay rejected, disabled-trigger preflight rejected, reservation class explicit, 47 expected triggers inventoried and restored, bot provider/button/window evidence verified in D1 and PostgreSQL, delivery evidence private, ${observations.length} parity scenarios)`,
    );
  } finally {
    database.close();
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    const code = error instanceof PostgresDataMigrationError
      ? error.code
      : "REHEARSAL_FAILED";
    console.error(`PostgreSQL WhatsApp delivery-policy data rehearsal: FAIL (${code})`);
    process.exitCode = 1;
  });
}
