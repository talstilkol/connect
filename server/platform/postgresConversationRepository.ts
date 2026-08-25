import {
  MessageIdentityConflictError,
  normalizeInboundButtonReplyProvenance,
  type ApplyMessageDeliveryStatusInput,
  type ApplyMessageDeliveryStatusResult,
  type ChangeConversationAssignmentResult,
  type ConversationAssignmentState,
  type ConversationReadState,
  type ConversationRepository,
  type InboxConversationListFilter,
  type InboundButtonReplyProvenance,
  type InboundContactIdentity,
  type MarkConversationReadResult,
  type PersistedInboxConversation,
  type RecordInboundMessageInput,
  type RecordInboundMessageResult,
} from "../../db/conversationRepository.ts";
import {
  messageContentKinds,
  messageDirections,
  messageStatuses,
  persistedConversationStatuses,
  type MessageStatus,
  type PersistedMessage,
} from "../../shared/domain/conversation.ts";
import type {
  ConversationStatus,
} from "../../shared/domain/model.ts";
import {
  validateInboundMessage,
} from "../../shared/validation/inboundMessage.ts";
import {
  validatePersistedContact,
} from "../../shared/validation/persistedContact.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const messageKeyPattern = /^message_v1_[0-9a-f]{64}$/;
const botReplyDeliveryKeyPattern =
  /^bot_reply_delivery_v1_[0-9a-f]{64}$/;
const statusEventKeyPattern = /^[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

const contactRowKeys = Object.freeze([
  "contactId",
  "phoneNumber",
  "tenantId",
]);
const messageRowKeys = Object.freeze([
  "contentKind",
  "conversationKey",
  "createdAt",
  "direction",
  "lastStatusEventAt",
  "lastStatusEventKey",
  "messageKey",
  "occurredAt",
  "providerMessageId",
  "status",
  "statusUpdatedAt",
  "tenantId",
  "textContent",
  "updatedAt",
]);
const inboxConversationRowKeys = Object.freeze([
  "assignedExternalUserId",
  "contactId",
  "conversationKey",
  "createdAt",
  "firstName",
  "lastMessageAt",
  "lastMessageContentKind",
  "lastMessageDirection",
  "lastMessageKey",
  "lastMessageTextContent",
  "lastName",
  "phoneNumber",
  "status",
  "tenantId",
  "unreadCount",
  "updatedAt",
  "version",
]);
const readStateRowKeys = Object.freeze([
  "conversationKey",
  "tenantId",
  "unreadCount",
  "version",
]);
const assignmentStateRowKeys = Object.freeze([
  "assignedExternalUserId",
  "conversationKey",
  "tenantId",
  "version",
]);
const inboundButtonReplyEventRowKeys = Object.freeze([
  "messageKey",
  "occurredAt",
  "replyToProviderMessageId",
  "selectedBotOptionKey",
  "subjectDeliveryKey",
  "tenantId",
]);

const messageColumns = `
  messages.message_key AS "messageKey",
  messages.conversation_key AS "conversationKey",
  messages.tenant_id AS "tenantId",
  messages.provider_message_id AS "providerMessageId",
  messages.direction,
  messages.content_kind AS "contentKind",
  messages.status,
  messages.text_content AS "textContent",
  messages.occurred_at AS "occurredAt",
  messages.status_updated_at AS "statusUpdatedAt",
  messages.last_status_event_key AS "lastStatusEventKey",
  messages.last_status_event_at AS "lastStatusEventAt",
  messages.created_at AS "createdAt",
  messages.updated_at AS "updatedAt"
`;

const inboxConversationColumns = `
  conversations.conversation_key AS "conversationKey",
  conversations.tenant_id AS "tenantId",
  conversations.contact_id AS "contactId",
  conversations.status,
  conversations.assigned_external_user_id AS "assignedExternalUserId",
  conversations.unread_count AS "unreadCount",
  conversations.last_message_key AS "lastMessageKey",
  conversations.last_message_at AS "lastMessageAt",
  conversations.version,
  conversations.created_at AS "createdAt",
  conversations.updated_at AS "updatedAt",
  contacts.phone_e164 AS "phoneNumber",
  contacts.first_name AS "firstName",
  contacts.last_name AS "lastName",
  latest_message.direction AS "lastMessageDirection",
  latest_message.content_kind AS "lastMessageContentKind",
  latest_message.text_content AS "lastMessageTextContent"
`;

const readStateColumns = `
  conversations.conversation_key AS "conversationKey",
  conversations.tenant_id AS "tenantId",
  conversations.unread_count AS "unreadCount",
  conversations.version
`;

const assignmentStateColumns = `
  conversations.conversation_key AS "conversationKey",
  conversations.tenant_id AS "tenantId",
  conversations.assigned_external_user_id AS "assignedExternalUserId",
  conversations.version
`;

export const postgresConversationSql = Object.freeze({
  resolveInboundContact: `
    INSERT INTO contacts (
      tenant_id,
      phone_e164
    )
    VALUES ($1, $2)
    ON CONFLICT (tenant_id, phone_e164) DO UPDATE SET
      phone_e164 = EXCLUDED.phone_e164
    RETURNING
      id AS "contactId",
      tenant_id AS "tenantId",
      phone_e164 AS "phoneNumber"
  `,
  insertConversation: `
    INSERT INTO conversations (
      conversation_key,
      tenant_id,
      contact_id
    )
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
    RETURNING conversation_key AS "conversationKey"
  `,
  updateConversationForInbound: `
    UPDATE conversations
    SET
      unread_count = unread_count + 1,
      last_message_key = CASE
        WHEN last_message_at IS NULL
          OR last_message_at < $4::timestamptz
          OR (
            last_message_at = $4::timestamptz
            AND (
              last_message_key IS NULL
              OR last_message_key < $3
            )
          )
        THEN $3
        ELSE last_message_key
      END,
      last_message_at = CASE
        WHEN last_message_at IS NULL
          OR last_message_at < $4::timestamptz
          OR (
            last_message_at = $4::timestamptz
            AND (
              last_message_key IS NULL
              OR last_message_key < $3
            )
          )
        THEN $4::timestamptz
        ELSE last_message_at
      END,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND conversation_key = $2
      AND contact_id = $6
      AND NOT EXISTS (
        SELECT 1
        FROM messages
        WHERE messages.tenant_id = $1
          AND messages.provider_message_id = $5
      )
    RETURNING conversation_key AS "conversationKey"
  `,
  insertInboundMessage: `
    INSERT INTO messages (
      message_key,
      conversation_key,
      tenant_id,
      provider_message_id,
      direction,
      content_kind,
      status,
      text_content,
      occurred_at,
      status_updated_at
    )
    SELECT
      $1,
      $2,
      $3,
      $4,
      'inbound',
      $5,
      'received',
      $6,
      $7::timestamptz,
      $7::timestamptz
    FROM conversations
    WHERE conversations.tenant_id = $3
      AND conversations.conversation_key = $2
      AND conversations.contact_id = $8
    ON CONFLICT DO NOTHING
    RETURNING ${messageColumns}
  `,
  insertInboundButtonReplyEvent: `
    INSERT INTO inbound_button_reply_events (
      message_key,
      tenant_id,
      selected_bot_option_key,
      subject_delivery_key,
      occurred_at,
      created_at
    )
    SELECT
      $1,
      $2,
      $3,
      provider_link.delivery_key,
      $5::timestamptz,
      $5::timestamptz
    FROM bot_reply_delivery_provider_links AS provider_link
    WHERE provider_link.tenant_id = $2
      AND provider_link.provider_message_id = $4
    ON CONFLICT (message_key) DO NOTHING
    RETURNING
      message_key AS "messageKey",
      tenant_id AS "tenantId",
      selected_bot_option_key AS "selectedBotOptionKey",
      subject_delivery_key AS "subjectDeliveryKey",
      occurred_at AS "occurredAt",
      $4::text AS "replyToProviderMessageId"
  `,
  findInboundButtonReplyEvent: `
    SELECT
      event.message_key AS "messageKey",
      event.tenant_id AS "tenantId",
      event.selected_bot_option_key AS "selectedBotOptionKey",
      event.subject_delivery_key AS "subjectDeliveryKey",
      event.occurred_at AS "occurredAt",
      provider_link.provider_message_id AS "replyToProviderMessageId"
    FROM inbound_button_reply_events AS event
    INNER JOIN bot_reply_delivery_provider_links AS provider_link
      ON provider_link.tenant_id = event.tenant_id
      AND provider_link.delivery_key = event.subject_delivery_key
    WHERE event.tenant_id = $1
      AND event.message_key = $2
    FOR UPDATE OF event
  `,
  applyDeliveryStatus: `
    UPDATE messages
    SET
      status = $3,
      status_updated_at = $5::timestamptz,
      last_status_event_key = $4,
      last_status_event_at = $5::timestamptz,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND provider_message_id = $2
      AND direction = 'outbound'
      AND last_status_event_key IS DISTINCT FROM $4
      AND (
        last_status_event_at IS NULL
        OR last_status_event_at < $5::timestamptz
        OR (
          last_status_event_at = $5::timestamptz
          AND (
            CASE $3::text
              WHEN 'sent' THEN 1
              WHEN 'delivered' THEN 2
              WHEN 'read' THEN 3
              WHEN 'failed' THEN 4
            END
          ) > (
            CASE status
              WHEN 'sent' THEN 1
              WHEN 'delivered' THEN 2
              WHEN 'read' THEN 3
              WHEN 'failed' THEN 4
            END
          )
        )
      )
    RETURNING ${messageColumns}
  `,
  findMessageByProviderIdForUpdate: `
    SELECT ${messageColumns}
    FROM messages
    WHERE messages.tenant_id = $1
      AND messages.provider_message_id = $2
      AND ($3::text IS NULL OR messages.direction = $3)
    FOR UPDATE
  `,
  listInboxConversations: `
    SELECT ${inboxConversationColumns}
    FROM conversations
    INNER JOIN contacts
      ON contacts.tenant_id = conversations.tenant_id
      AND contacts.id = conversations.contact_id
    LEFT JOIN messages AS latest_message
      ON latest_message.tenant_id = conversations.tenant_id
      AND latest_message.message_key = conversations.last_message_key
    WHERE conversations.tenant_id = $1
      AND (
        $2::text IS NULL
        OR position(lower($2) IN lower(contacts.phone_e164)) > 0
        OR position(lower($2) IN lower(COALESCE(contacts.first_name, ''))) > 0
        OR position(lower($2) IN lower(COALESCE(contacts.last_name, ''))) > 0
        OR position(
          lower($2) IN lower(
            btrim(
              COALESCE(contacts.first_name, '') || ' ' ||
              COALESCE(contacts.last_name, '')
            )
          )
        ) > 0
      )
      AND ($3::text IS NULL OR conversations.status = $3)
      AND (
        $4 = 'all'
        OR (
          $4 = 'unassigned'
          AND conversations.assigned_external_user_id IS NULL
        )
        OR (
          $4 = 'mine'
          AND conversations.assigned_external_user_id = $5
        )
      )
    ORDER BY
      (conversations.last_message_at IS NULL) ASC,
      conversations.last_message_at DESC,
      conversations.conversation_key ASC
    LIMIT $6
  `,
  findInboxConversationByKey: `
    SELECT ${inboxConversationColumns}
    FROM conversations
    INNER JOIN contacts
      ON contacts.tenant_id = conversations.tenant_id
      AND contacts.id = conversations.contact_id
    LEFT JOIN messages AS latest_message
      ON latest_message.tenant_id = conversations.tenant_id
      AND latest_message.message_key = conversations.last_message_key
    WHERE conversations.tenant_id = $1
      AND conversations.conversation_key = $2
    LIMIT 1
  `,
  listConversationMessages: `
    SELECT ${messageColumns}
    FROM messages
    WHERE messages.tenant_id = $1
      AND messages.conversation_key = $2
    ORDER BY messages.occurred_at DESC, messages.message_key DESC
    LIMIT $3
  `,
  markRead: `
    UPDATE conversations
    SET
      unread_count = 0,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND conversation_key = $2
      AND version = $3
      AND unread_count > 0
    RETURNING ${readStateColumns}
  `,
  findReadStateForUpdate: `
    SELECT ${readStateColumns}
    FROM conversations
    WHERE conversations.tenant_id = $1
      AND conversations.conversation_key = $2
    FOR UPDATE
  `,
  assignConversationToSelf: `
    UPDATE conversations
    SET
      assigned_external_user_id = $4,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND conversation_key = $2
      AND version = $3
      AND assigned_external_user_id IS NULL
    RETURNING ${assignmentStateColumns}
  `,
  unassignConversationFromSelf: `
    UPDATE conversations
    SET
      assigned_external_user_id = NULL,
      version = version + 1,
      updated_at = date_trunc('milliseconds', CURRENT_TIMESTAMP)
    WHERE tenant_id = $1
      AND conversation_key = $2
      AND version = $3
      AND assigned_external_user_id = $4
    RETURNING ${assignmentStateColumns}
  `,
  findAssignmentStateForUpdate: `
    SELECT ${assignmentStateColumns}
    FROM conversations
    WHERE conversations.tenant_id = $1
      AND conversations.conversation_key = $2
    FOR UPDATE
  `,
});

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return Number(value);
}

function parseNonnegativeInteger(value: unknown, fieldName: string): number {
  const normalized =
    typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
      ? Number(value)
      : value;

  if (!Number.isSafeInteger(normalized) || Number(normalized) < 0) {
    throw new Error(`PostgreSQL returned an invalid ${fieldName}`);
  }

  return Number(normalized);
}

function requirePattern(
  value: unknown,
  pattern: RegExp,
  fieldName: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
}

function requireConversationKey(value: unknown): string {
  return requirePattern(value, conversationKeyPattern, "conversationKey");
}

function requireMessageKey(value: unknown): string {
  return requirePattern(value, messageKeyPattern, "messageKey");
}

function requireBoundedIdentity(value: unknown, fieldName: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 255 ||
    value.trim() !== value ||
    controlCharacterPattern.test(value)
  ) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
}

function requireCanonicalTimestamp(value: unknown, fieldName: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
}

function requireMessageStatus(value: unknown): Exclude<MessageStatus, "received"> {
  if (
    value !== "sent" &&
    value !== "delivered" &&
    value !== "read" &&
    value !== "failed"
  ) {
    throw new Error("delivery status is invalid");
  }

  return value;
}

function parseNullableTimestamp(value: unknown): string | null {
  return value === null ? null : parsePostgresTimestamp(value);
}

function parseNullableBoundedIdentity(
  value: unknown,
  fieldName: string,
): string | null {
  return value === null ? null : requireBoundedIdentity(value, fieldName);
}

function parseInboundContact(value: unknown): InboundContactIdentity {
  const row = requireExactPostgresRow(value, contactRowKeys);
  const validation = validatePersistedContact({
    phoneNumber: row.phoneNumber,
  });

  if (!validation.success) {
    throw new Error("PostgreSQL returned an invalid inbound contact");
  }

  return Object.freeze({
    contactId: parsePostgresPositiveInteger(row.contactId),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    phoneNumber: validation.value.phoneNumber,
  });
}

function parseMessage(value: unknown): PersistedMessage {
  const row = requireExactPostgresRow(value, messageRowKeys);
  const direction = messageDirections.find((candidate) => candidate === row.direction);
  const contentKind = messageContentKinds.find(
    (candidate) => candidate === row.contentKind,
  );
  const status = messageStatuses.find((candidate) => candidate === row.status);
  const textContent = row.textContent;
  const textIsValid =
    contentKind === "text"
      ? typeof textContent === "string" &&
        textContent.trim().length > 0 &&
        textContent.length <= 16_384
      : textContent === null;
  const occurredAt = parsePostgresTimestamp(row.occurredAt);
  const statusUpdatedAt = parsePostgresTimestamp(row.statusUpdatedAt);
  const lastStatusEventKey = row.lastStatusEventKey === null
    ? null
    : requirePattern(
        row.lastStatusEventKey,
        statusEventKeyPattern,
        "PostgreSQL status event key",
      );
  const lastStatusEventAt = parseNullableTimestamp(row.lastStatusEventAt);
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);

  if (
    !direction ||
    !contentKind ||
    !status ||
    !textIsValid ||
    (direction === "inbound" && status !== "received") ||
    (direction === "outbound" && status === "received") ||
    (lastStatusEventKey === null) !== (lastStatusEventAt === null) ||
    statusUpdatedAt < occurredAt ||
    (lastStatusEventAt !== null && lastStatusEventAt < occurredAt) ||
    updatedAt < createdAt
  ) {
    throw new Error("PostgreSQL returned an invalid message");
  }

  return Object.freeze({
    messageKey: requireMessageKey(row.messageKey),
    conversationKey: requireConversationKey(row.conversationKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    providerMessageId: requireBoundedIdentity(
      row.providerMessageId,
      "PostgreSQL provider message ID",
    ),
    direction,
    contentKind,
    status,
    textContent: textContent as string | null,
    occurredAt,
    statusUpdatedAt,
    lastStatusEventKey,
    lastStatusEventAt,
    createdAt,
    updatedAt,
  });
}

interface ParsedInboundButtonReplyEvent {
  messageKey: string;
  tenantId: number;
  selectedBotOptionKey: string;
  subjectDeliveryKey: string;
  occurredAt: string;
  replyToProviderMessageId: string;
}

function parseInboundButtonReplyEvent(
  value: unknown,
): ParsedInboundButtonReplyEvent {
  const row = requireExactPostgresRow(
    value,
    inboundButtonReplyEventRowKeys,
  );

  return Object.freeze({
    messageKey: requireMessageKey(row.messageKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    selectedBotOptionKey: requirePattern(
      row.selectedBotOptionKey,
      /^bot_option_v1_[0-9a-f]{64}$/,
      "PostgreSQL selected Bot option key",
    ),
    subjectDeliveryKey: requirePattern(
      row.subjectDeliveryKey,
      botReplyDeliveryKeyPattern,
      "PostgreSQL subject Bot delivery key",
    ),
    occurredAt: parsePostgresTimestamp(row.occurredAt),
    replyToProviderMessageId: requireBoundedIdentity(
      row.replyToProviderMessageId,
      "PostgreSQL reply-to provider message ID",
    ),
  });
}

function isSameInboundButtonReplyProvenance(
  stored: ParsedInboundButtonReplyEvent | null,
  input: RecordInboundMessageInput,
  provenance: InboundButtonReplyProvenance | null,
): boolean {
  return provenance === null
    ? stored === null
    : stored !== null &&
        stored.messageKey === input.messageKey &&
        stored.tenantId === input.tenantId &&
        stored.selectedBotOptionKey ===
          provenance.selectedBotOptionKey &&
        stored.replyToProviderMessageId ===
          provenance.replyToProviderMessageId &&
        stored.occurredAt === input.occurredAt;
}

function parseConversationReadState(
  value: unknown,
  tenantId: number,
  conversationKey: string,
): ConversationReadState {
  const row = requireExactPostgresRow(value, readStateRowKeys);
  const parsed = {
    conversationKey: requireConversationKey(row.conversationKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    unreadCount: parseNonnegativeInteger(row.unreadCount, "unread count"),
    version: parsePostgresPositiveInteger(row.version),
  };

  if (parsed.tenantId !== tenantId || parsed.conversationKey !== conversationKey) {
    throw new Error("PostgreSQL returned an invalid conversation read scope");
  }

  return Object.freeze({
    conversationKey: parsed.conversationKey,
    unreadCount: parsed.unreadCount,
    version: parsed.version,
  });
}

function parseConversationAssignmentState(
  value: unknown,
  tenantId: number,
  conversationKey: string,
): ConversationAssignmentState {
  const row = requireExactPostgresRow(value, assignmentStateRowKeys);
  const parsed = {
    conversationKey: requireConversationKey(row.conversationKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    assignedExternalUserId: parseNullableBoundedIdentity(
      row.assignedExternalUserId,
      "PostgreSQL conversation assignee",
    ),
    version: parsePostgresPositiveInteger(row.version),
  };

  if (parsed.tenantId !== tenantId || parsed.conversationKey !== conversationKey) {
    throw new Error("PostgreSQL returned an invalid conversation assignment scope");
  }

  return Object.freeze({
    conversationKey: parsed.conversationKey,
    assignedExternalUserId: parsed.assignedExternalUserId,
    version: parsed.version,
  });
}

function parseInboxConversation(value: unknown): PersistedInboxConversation {
  const row = requireExactPostgresRow(value, inboxConversationRowKeys);
  const status = persistedConversationStatuses.find(
    (candidate) => candidate === row.status,
  );
  const contact = validatePersistedContact({
    phoneNumber: row.phoneNumber,
    firstName: row.firstName,
    lastName: row.lastName,
  });
  const lastMessageKey = row.lastMessageKey === null
    ? null
    : requireMessageKey(row.lastMessageKey);
  const lastMessageAt = parseNullableTimestamp(row.lastMessageAt);
  const lastMessageDirection = messageDirections.find(
    (candidate) => candidate === row.lastMessageDirection,
  );
  const lastMessageContentKind = messageContentKinds.find(
    (candidate) => candidate === row.lastMessageContentKind,
  );
  const lastMessageTextContent = row.lastMessageTextContent;
  const hasLastMessage = lastMessageKey !== null && lastMessageAt !== null;
  const lastMessageTextIsValid =
    lastMessageContentKind === "text"
      ? typeof lastMessageTextContent === "string" &&
        lastMessageTextContent.trim().length > 0 &&
        lastMessageTextContent.length <= 16_384
      : lastMessageTextContent === null;
  const createdAt = parsePostgresTimestamp(row.createdAt);
  const updatedAt = parsePostgresTimestamp(row.updatedAt);

  if (
    !status ||
    !contact.success ||
    (lastMessageKey === null) !== (lastMessageAt === null) ||
    (hasLastMessage &&
      (!lastMessageDirection ||
        !lastMessageContentKind ||
        !lastMessageTextIsValid)) ||
    (!hasLastMessage &&
      (row.lastMessageDirection !== null ||
        row.lastMessageContentKind !== null ||
        row.lastMessageTextContent !== null)) ||
    updatedAt < createdAt
  ) {
    throw new Error("PostgreSQL returned an invalid inbox conversation");
  }

  return Object.freeze({
    conversationKey: requireConversationKey(row.conversationKey),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    contactId: parsePostgresPositiveInteger(row.contactId),
    status,
    assignedExternalUserId: parseNullableBoundedIdentity(
      row.assignedExternalUserId,
      "PostgreSQL conversation assignee",
    ),
    unreadCount: parseNonnegativeInteger(row.unreadCount, "unread count"),
    lastMessageKey,
    lastMessageAt,
    version: parsePostgresPositiveInteger(row.version),
    createdAt,
    updatedAt,
    contact: Object.freeze({
      phoneNumber: contact.value.phoneNumber,
      firstName: contact.value.firstName,
      lastName: contact.value.lastName,
    }),
    lastMessage:
      hasLastMessage && lastMessageDirection && lastMessageContentKind
        ? Object.freeze({
            direction: lastMessageDirection,
            contentKind: lastMessageContentKind,
            textContent: lastMessageTextContent as string | null,
          })
        : null,
  });
}

function requireFilter(value: unknown): InboxConversationListFilter {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("conversation list filter is invalid");
  }

  const filter = value as Record<string, unknown>;
  const keys = Object.keys(filter).sort();
  if (
    JSON.stringify(keys) !== JSON.stringify([
      "assignment",
      "currentExternalUserId",
      "searchTerm",
      "status",
    ])
  ) {
    throw new Error("conversation list filter is invalid");
  }

  const searchTerm = filter.searchTerm;
  const status = filter.status;
  const assignment = filter.assignment;
  const currentExternalUserId = filter.currentExternalUserId;
  if (
    (searchTerm !== null &&
      (typeof searchTerm !== "string" ||
        searchTerm.length === 0 ||
        searchTerm.length > 80 ||
        searchTerm.trim() !== searchTerm ||
        controlCharacterPattern.test(searchTerm))) ||
    (status !== null &&
      !persistedConversationStatuses.some((candidate) => candidate === status)) ||
    (assignment !== "all" &&
      assignment !== "unassigned" &&
      assignment !== "mine") ||
    (currentExternalUserId !== null && typeof currentExternalUserId !== "string") ||
    (assignment === "mine" && currentExternalUserId === null)
  ) {
    throw new Error("conversation list filter is invalid");
  }

  const checkedExternalUserId = currentExternalUserId === null
    ? null
    : requireBoundedIdentity(currentExternalUserId, "currentExternalUserId");

  return Object.freeze({
    searchTerm: searchTerm as string | null,
    status: status as ConversationStatus | null,
    assignment,
    currentExternalUserId: checkedExternalUserId,
  });
}

function isSameInboundIdentity(
  stored: PersistedMessage,
  input: RecordInboundMessageInput,
): boolean {
  return (
    stored.messageKey === input.messageKey &&
    stored.conversationKey === input.conversationKey &&
    stored.tenantId === input.tenantId &&
    stored.providerMessageId === input.providerMessageId &&
    stored.direction === "inbound" &&
    stored.contentKind === input.contentKind &&
    stored.status === "received" &&
    stored.textContent === input.textContent &&
    stored.occurredAt === input.occurredAt
  );
}

function requireDeliveryMessageScope(
  message: PersistedMessage,
  input: ApplyMessageDeliveryStatusInput,
  expectedEvent: boolean,
): PersistedMessage {
  if (
    message.tenantId !== input.tenantId ||
    message.providerMessageId !== input.providerMessageId ||
    message.direction !== "outbound" ||
    (expectedEvent &&
      (message.status !== input.status ||
        message.lastStatusEventKey !== input.statusEventKey ||
        message.lastStatusEventAt !== input.statusEventAt))
  ) {
    throw new Error("PostgreSQL returned a delivery message outside the scope");
  }

  return message;
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly Record<string, unknown>[]> {
  const result = await queries.query<Record<string, unknown>>(sql, parameters);
  return requirePostgresRows(result, maximum);
}

async function loadOne(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
): Promise<Record<string, unknown> | null> {
  const rows = await loadRows(queries, sql, parameters, 1);
  return rows.length === 0 ? null : rows[0];
}

function requireReturnedConversationKey(
  rows: readonly Record<string, unknown>[],
  expected: string,
): void {
  for (const value of rows) {
    const row = requireExactPostgresRow(value, ["conversationKey"]);
    if (requireConversationKey(row.conversationKey) !== expected) {
      throw new Error("PostgreSQL returned a mismatched conversation key");
    }
  }
}

export interface PostgresConversationRepositoryDependencies {
  readonly queries: PostgresQueryExecutor;
  readonly transactions: PostgresTransactionManager;
}

export function createPostgresConversationRepository(
  dependencies: Readonly<PostgresConversationRepositoryDependencies>,
): ConversationRepository {
  if (
    typeof dependencies?.queries?.query !== "function" ||
    typeof dependencies?.transactions?.transaction !== "function"
  ) {
    throw new Error("PostgreSQL conversation repository dependencies are invalid");
  }

  const listFilteredByTenant: ConversationRepository["listFilteredByTenant"] =
    async (tenantIdInput, filterInput, limitInput) => {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const filter = requireFilter(filterInput);
      const limit = requirePositiveInteger(limitInput, "limit");
      if (limit > 100) {
        throw new Error("limit must not exceed 100");
      }

      const rows = await loadRows(
        dependencies.queries,
        postgresConversationSql.listInboxConversations,
        [
          tenantId,
          filter.searchTerm,
          filter.status,
          filter.assignment,
          filter.currentExternalUserId,
          limit,
        ],
        limit,
      );
      return Object.freeze(rows.map((row) => {
        const conversation = parseInboxConversation(row);
        if (conversation.tenantId !== tenantId) {
          throw new Error("PostgreSQL returned a conversation outside the tenant");
        }
        return conversation;
      }));
    };

  const repository: ConversationRepository = {
    async resolveInboundContact(tenantIdInput, phoneNumberInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const validation = validatePersistedContact({
        phoneNumber: phoneNumberInput,
      });
      if (!validation.success) {
        throw new Error("phoneNumber is invalid");
      }

      const row = await loadOne(
        dependencies.queries,
        postgresConversationSql.resolveInboundContact,
        [tenantId, validation.value.phoneNumber],
      );
      if (row === null) {
        throw new Error("PostgreSQL did not resolve the inbound contact");
      }

      const contact = parseInboundContact(row);
      if (
        contact.tenantId !== tenantId ||
        contact.phoneNumber !== validation.value.phoneNumber
      ) {
        throw new Error("PostgreSQL returned an invalid inbound contact scope");
      }
      return contact;
    },

    async recordInboundMessage(input) {
      const tenantId = requirePositiveInteger(input?.tenantId, "tenantId");
      const conversationKey = requireConversationKey(input?.conversationKey);
      const messageKey = requireMessageKey(input?.messageKey);
      const validation = validateInboundMessage(input);
      if (!validation.success) {
        throw new Error("inbound message is invalid");
      }
      const buttonReplyProvenance =
        normalizeInboundButtonReplyProvenance(input);
      const normalized: RecordInboundMessageInput = {
        tenantId,
        conversationKey,
        messageKey,
        ...validation.value,
      };

      return dependencies.transactions.transaction<RecordInboundMessageResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const conversationRows = await loadRows(
            transaction,
            postgresConversationSql.insertConversation,
            [conversationKey, tenantId, validation.value.contactId],
            1,
          );
          requireReturnedConversationKey(conversationRows, conversationKey);

          const updatedRows = await loadRows(
            transaction,
            postgresConversationSql.updateConversationForInbound,
            [
              tenantId,
              conversationKey,
              messageKey,
              validation.value.occurredAt,
              validation.value.providerMessageId,
              validation.value.contactId,
            ],
            1,
          );
          requireReturnedConversationKey(updatedRows, conversationKey);

          const insertedRow = await loadOne(
            transaction,
            postgresConversationSql.insertInboundMessage,
            [
              messageKey,
              conversationKey,
              tenantId,
              validation.value.providerMessageId,
              validation.value.contentKind,
              validation.value.textContent,
              validation.value.occurredAt,
              validation.value.contactId,
            ],
          );

          let buttonReplyEvent: ParsedInboundButtonReplyEvent | null = null;
          if (buttonReplyProvenance !== null) {
            const eventRow = await loadOne(
              transaction,
              postgresConversationSql.insertInboundButtonReplyEvent,
              [
                messageKey,
                tenantId,
                buttonReplyProvenance.selectedBotOptionKey,
                buttonReplyProvenance.replyToProviderMessageId,
                validation.value.occurredAt,
              ],
            );
            if (eventRow !== null) {
              buttonReplyEvent =
                parseInboundButtonReplyEvent(eventRow);
            }
          }

          if (
            buttonReplyProvenance !== null &&
            buttonReplyEvent === null
          ) {
            const eventRow = await loadOne(
              transaction,
              postgresConversationSql.findInboundButtonReplyEvent,
              [tenantId, messageKey],
            );
            buttonReplyEvent = eventRow === null
              ? null
              : parseInboundButtonReplyEvent(eventRow);
          }

          if (
            insertedRow === null &&
            buttonReplyProvenance === null
          ) {
            const eventRow = await loadOne(
              transaction,
              postgresConversationSql.findInboundButtonReplyEvent,
              [tenantId, messageKey],
            );
            buttonReplyEvent = eventRow === null
              ? null
              : parseInboundButtonReplyEvent(eventRow);
          }

          if (
            !isSameInboundButtonReplyProvenance(
              buttonReplyEvent,
              normalized,
              buttonReplyProvenance,
            )
          ) {
            throw new MessageIdentityConflictError();
          }

          if (insertedRow !== null) {
            const message = parseMessage(insertedRow);
            if (!isSameInboundIdentity(message, normalized)) {
              throw new Error("PostgreSQL returned a mismatched inbound message");
            }
            return Object.freeze({ outcome: "created" as const, message });
          }

          const existingRow = await loadOne(
            transaction,
            postgresConversationSql.findMessageByProviderIdForUpdate,
            [tenantId, validation.value.providerMessageId, "inbound"],
          );
          if (existingRow === null) {
            throw new Error("PostgreSQL did not return the stored inbound message");
          }
          const existing = parseMessage(existingRow);
          if (!isSameInboundIdentity(existing, normalized)) {
            throw new MessageIdentityConflictError();
          }
          return Object.freeze({ outcome: "duplicate" as const, message: existing });
        },
      );
    },

    async applyDeliveryStatus(input) {
      const normalized: ApplyMessageDeliveryStatusInput = {
        tenantId: requirePositiveInteger(input?.tenantId, "tenantId"),
        providerMessageId: requireBoundedIdentity(
          input?.providerMessageId,
          "providerMessageId",
        ),
        status: requireMessageStatus(input?.status),
        statusEventKey: requirePattern(
          input?.statusEventKey,
          statusEventKeyPattern,
          "statusEventKey",
        ),
        statusEventAt: requireCanonicalTimestamp(
          input?.statusEventAt,
          "statusEventAt",
        ),
      };

      return dependencies.transactions.transaction<ApplyMessageDeliveryStatusResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const appliedRow = await loadOne(
            transaction,
            postgresConversationSql.applyDeliveryStatus,
            [
              normalized.tenantId,
              normalized.providerMessageId,
              normalized.status,
              normalized.statusEventKey,
              normalized.statusEventAt,
            ],
          );
          if (appliedRow !== null) {
            const message = requireDeliveryMessageScope(
              parseMessage(appliedRow),
              normalized,
              true,
            );
            return Object.freeze({
              outcome: "applied" as const,
              message,
            });
          }

          const existingRow = await loadOne(
            transaction,
            postgresConversationSql.findMessageByProviderIdForUpdate,
            [normalized.tenantId, normalized.providerMessageId, "outbound"],
          );
          if (existingRow === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          const existing = requireDeliveryMessageScope(
            parseMessage(existingRow),
            normalized,
            false,
          );
          return Object.freeze({
            outcome:
              existing.lastStatusEventKey === normalized.statusEventKey
                ? "duplicate" as const
                : "stale" as const,
            message: existing,
          });
        },
      );
    },

    listByTenant(tenantId, limit) {
      return listFilteredByTenant(
        tenantId,
        {
          searchTerm: null,
          status: null,
          assignment: "all",
          currentExternalUserId: null,
        },
        limit,
      );
    },

    listFilteredByTenant,

    async findByKey(tenantIdInput, conversationKeyInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const conversationKey = requireConversationKey(conversationKeyInput);
      const row = await loadOne(
        dependencies.queries,
        postgresConversationSql.findInboxConversationByKey,
        [tenantId, conversationKey],
      );
      if (row === null) {
        return null;
      }
      const conversation = parseInboxConversation(row);
      if (
        conversation.tenantId !== tenantId ||
        conversation.conversationKey !== conversationKey
      ) {
        throw new Error("PostgreSQL returned a conversation outside the scope");
      }
      return conversation;
    },

    async listMessagesByConversation(tenantIdInput, keyInput, limitInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const conversationKey = requireConversationKey(keyInput);
      const limit = requirePositiveInteger(limitInput, "limit");
      if (limit > 200) {
        throw new Error("limit must not exceed 200");
      }
      const rows = await loadRows(
        dependencies.queries,
        postgresConversationSql.listConversationMessages,
        [tenantId, conversationKey, limit],
        limit,
      );
      return Object.freeze(rows.map((row) => {
        const message = parseMessage(row);
        if (
          message.tenantId !== tenantId ||
          message.conversationKey !== conversationKey
        ) {
          throw new Error("PostgreSQL returned a message outside the scope");
        }
        return message;
      }).reverse());
    },

    async markRead(tenantIdInput, keyInput, versionInput) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const conversationKey = requireConversationKey(keyInput);
      const expectedVersion = requirePositiveInteger(
        versionInput,
        "expectedVersion",
      );

      return dependencies.transactions.transaction<MarkConversationReadResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const updatedRow = await loadOne(
            transaction,
            postgresConversationSql.markRead,
            [tenantId, conversationKey, expectedVersion],
          );
          if (updatedRow !== null) {
            return Object.freeze({
              outcome: "updated" as const,
              state: parseConversationReadState(
                updatedRow,
                tenantId,
                conversationKey,
              ),
            });
          }

          const currentRow = await loadOne(
            transaction,
            postgresConversationSql.findReadStateForUpdate,
            [tenantId, conversationKey],
          );
          if (currentRow === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          const current = parseConversationReadState(
            currentRow,
            tenantId,
            conversationKey,
          );
          if (current.version !== expectedVersion) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          return Object.freeze({ outcome: "unchanged" as const, state: current });
        },
      );
    },

    async changeAssignment(
      tenantIdInput,
      keyInput,
      versionInput,
      externalUserIdInput,
      actionInput,
    ) {
      const tenantId = requirePositiveInteger(tenantIdInput, "tenantId");
      const conversationKey = requireConversationKey(keyInput);
      const expectedVersion = requirePositiveInteger(
        versionInput,
        "expectedVersion",
      );
      const externalUserId = requireBoundedIdentity(
        externalUserIdInput,
        "externalUserId",
      );
      if (actionInput !== "assign-self" && actionInput !== "unassign-self") {
        throw new Error("assignment action is invalid");
      }

      return dependencies.transactions.transaction<ChangeConversationAssignmentResult>(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const updatedRow = await loadOne(
            transaction,
            actionInput === "assign-self"
              ? postgresConversationSql.assignConversationToSelf
              : postgresConversationSql.unassignConversationFromSelf,
            [tenantId, conversationKey, expectedVersion, externalUserId],
          );
          if (updatedRow !== null) {
            return Object.freeze({
              outcome: "updated" as const,
              state: parseConversationAssignmentState(
                updatedRow,
                tenantId,
                conversationKey,
              ),
            });
          }

          const currentRow = await loadOne(
            transaction,
            postgresConversationSql.findAssignmentStateForUpdate,
            [tenantId, conversationKey],
          );
          if (currentRow === null) {
            return Object.freeze({ outcome: "not-found" as const });
          }
          const current = parseConversationAssignmentState(
            currentRow,
            tenantId,
            conversationKey,
          );
          if (current.version !== expectedVersion) {
            return Object.freeze({ outcome: "conflict" as const });
          }
          const expectedNoOp =
            (actionInput === "assign-self" &&
              current.assignedExternalUserId === externalUserId) ||
            (actionInput === "unassign-self" &&
              current.assignedExternalUserId === null);
          if (!expectedNoOp) {
            return Object.freeze({ outcome: "locked" as const });
          }
          return Object.freeze({ outcome: "unchanged" as const, state: current });
        },
      );
    },
  };

  return Object.freeze(repository);
}
