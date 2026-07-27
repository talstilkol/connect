import {
  messageContentKinds,
  messageDirections,
  messageStatuses,
  persistedConversationStatuses,
  type MessageContentKind,
  type MessageDirection,
  type MessageStatus,
  type PersistedMessage,
  type PersistedConversation,
  type ValidatedInboundMessage,
} from "../shared/domain/conversation.ts";
import type {
  ConversationStatus,
} from "../shared/domain/model.ts";
import {
  validateInboundMessage,
} from "../shared/validation/inboundMessage.ts";
import {
  validatePersistedContact,
} from "../shared/validation/persistedContact.ts";
import type {
  D1DatabaseBinding,
  D1Result,
} from "./d1.ts";

const MESSAGE_COLUMNS_SQL = `
  message_key AS messageKey,
  conversation_key AS conversationKey,
  tenant_id AS tenantId,
  provider_message_id AS providerMessageId,
  direction,
  content_kind AS contentKind,
  status,
  text_content AS textContent,
  occurred_at AS occurredAt,
  status_updated_at AS statusUpdatedAt,
  last_status_event_key AS lastStatusEventKey,
  last_status_event_at AS lastStatusEventAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

const INBOX_CONVERSATION_COLUMNS_SQL = `
  conversations.conversation_key AS conversationKey,
  conversations.tenant_id AS tenantId,
  conversations.contact_id AS contactId,
  conversations.status,
  conversations.assigned_external_user_id AS assignedExternalUserId,
  conversations.unread_count AS unreadCount,
  conversations.last_message_key AS lastMessageKey,
  conversations.last_message_at AS lastMessageAt,
  conversations.version,
  conversations.created_at AS createdAt,
  conversations.updated_at AS updatedAt,
  contacts.phone_e164 AS phoneNumber,
  contacts.first_name AS firstName,
  contacts.last_name AS lastName,
  latest_message.direction AS lastMessageDirection,
  latest_message.content_kind AS lastMessageContentKind,
  latest_message.text_content AS lastMessageTextContent
`;

const LIST_INBOX_CONVERSATIONS_SQL = `
  SELECT
    ${INBOX_CONVERSATION_COLUMNS_SQL}
  FROM conversations
  INNER JOIN contacts
    ON contacts.tenant_id = conversations.tenant_id
    AND contacts.id = conversations.contact_id
  LEFT JOIN messages AS latest_message
    ON latest_message.tenant_id = conversations.tenant_id
    AND latest_message.message_key =
      conversations.last_message_key
  WHERE conversations.tenant_id = ?1
    AND (
      ?2 IS NULL
      OR instr(
        lower(contacts.phone_e164),
        lower(?2)
      ) > 0
      OR instr(
        lower(COALESCE(contacts.first_name, '')),
        lower(?2)
      ) > 0
      OR instr(
        lower(COALESCE(contacts.last_name, '')),
        lower(?2)
      ) > 0
      OR instr(
        lower(
          trim(
            COALESCE(contacts.first_name, '') || ' ' ||
            COALESCE(contacts.last_name, '')
          )
        ),
        lower(?2)
      ) > 0
    )
    AND (?3 IS NULL OR conversations.status = ?3)
    AND (
      ?4 = 'all'
      OR (
        ?4 = 'unassigned'
        AND conversations.assigned_external_user_id IS NULL
      )
      OR (
        ?4 = 'mine'
        AND conversations.assigned_external_user_id = ?5
      )
    )
  ORDER BY
    conversations.last_message_at IS NULL ASC,
    conversations.last_message_at DESC,
    conversations.conversation_key ASC
  LIMIT ?6
`;

const SELECT_INBOX_CONVERSATION_SQL = `
  SELECT
    ${INBOX_CONVERSATION_COLUMNS_SQL}
  FROM conversations
  INNER JOIN contacts
    ON contacts.tenant_id = conversations.tenant_id
    AND contacts.id = conversations.contact_id
  LEFT JOIN messages AS latest_message
    ON latest_message.tenant_id = conversations.tenant_id
    AND latest_message.message_key =
      conversations.last_message_key
  WHERE conversations.tenant_id = ?1
    AND conversations.conversation_key = ?2
  LIMIT 1
`;

const LIST_CONVERSATION_MESSAGES_SQL = `
  SELECT
    ${MESSAGE_COLUMNS_SQL}
  FROM messages
  WHERE tenant_id = ?1
    AND conversation_key = ?2
  ORDER BY occurred_at DESC, message_key DESC
  LIMIT ?3
`;

const MARK_CONVERSATION_READ_SQL = `
  UPDATE conversations
  SET
    unread_count = 0,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND conversation_key = ?2
    AND version = ?3
    AND unread_count > 0
  RETURNING
    conversation_key AS conversationKey,
    tenant_id AS tenantId,
    unread_count AS unreadCount,
    version
`;

const SELECT_CONVERSATION_READ_STATE_SQL = `
  SELECT
    conversation_key AS conversationKey,
    tenant_id AS tenantId,
    unread_count AS unreadCount,
    version
  FROM conversations
  WHERE tenant_id = ?1
    AND conversation_key = ?2
  LIMIT 1
`;

const ASSIGN_CONVERSATION_TO_SELF_SQL = `
  UPDATE conversations
  SET
    assigned_external_user_id = ?4,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND conversation_key = ?2
    AND version = ?3
    AND assigned_external_user_id IS NULL
  RETURNING
    conversation_key AS conversationKey,
    tenant_id AS tenantId,
    assigned_external_user_id AS assignedExternalUserId,
    version
`;

const UNASSIGN_CONVERSATION_FROM_SELF_SQL = `
  UPDATE conversations
  SET
    assigned_external_user_id = NULL,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND conversation_key = ?2
    AND version = ?3
    AND assigned_external_user_id = ?4
  RETURNING
    conversation_key AS conversationKey,
    tenant_id AS tenantId,
    assigned_external_user_id AS assignedExternalUserId,
    version
`;

const SELECT_CONVERSATION_ASSIGNMENT_STATE_SQL = `
  SELECT
    conversation_key AS conversationKey,
    tenant_id AS tenantId,
    assigned_external_user_id AS assignedExternalUserId,
    version
  FROM conversations
  WHERE tenant_id = ?1
    AND conversation_key = ?2
  LIMIT 1
`;

const RESOLVE_INBOUND_CONTACT_SQL = `
  INSERT INTO contacts (
    tenant_id,
    phone_e164
  )
  VALUES (?1, ?2)
  ON CONFLICT (tenant_id, phone_e164) DO UPDATE SET
    phone_e164 = excluded.phone_e164
  RETURNING
    id AS contactId,
    tenant_id AS tenantId,
    phone_e164 AS phoneNumber
`;

const INSERT_CONVERSATION_SQL = `
  INSERT INTO conversations (
    conversation_key,
    tenant_id,
    contact_id
  )
  VALUES (?1, ?2, ?3)
  ON CONFLICT (tenant_id, contact_id) DO NOTHING
`;

const UPDATE_CONVERSATION_FOR_INBOUND_SQL = `
  UPDATE conversations
  SET
    unread_count = unread_count + 1,
    last_message_key = CASE
      WHEN last_message_at IS NULL
        OR last_message_at < ?4
        OR (
          last_message_at = ?4
          AND (
            last_message_key IS NULL
            OR last_message_key < ?3
          )
        )
      THEN ?3
      ELSE last_message_key
    END,
    last_message_at = CASE
      WHEN last_message_at IS NULL
        OR last_message_at < ?4
        OR (
          last_message_at = ?4
          AND (
            last_message_key IS NULL
            OR last_message_key < ?3
          )
        )
      THEN ?4
      ELSE last_message_at
    END,
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND conversation_key = ?2
    AND NOT EXISTS (
      SELECT 1
      FROM messages
      WHERE messages.tenant_id = ?1
        AND messages.provider_message_id = ?5
    )
`;

const INSERT_INBOUND_MESSAGE_SQL = `
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
  VALUES (
    ?1,
    ?2,
    ?3,
    ?4,
    'inbound',
    ?5,
    'received',
    ?6,
    ?7,
    ?7
  )
  ON CONFLICT (tenant_id, provider_message_id) DO NOTHING
  RETURNING
    ${MESSAGE_COLUMNS_SQL}
`;

const APPLY_DELIVERY_STATUS_SQL = `
  UPDATE messages
  SET
    status = ?3,
    status_updated_at = ?5,
    last_status_event_key = ?4,
    last_status_event_at = ?5,
    updated_at = CURRENT_TIMESTAMP
  WHERE tenant_id = ?1
    AND provider_message_id = ?2
    AND direction = 'outbound'
    AND last_status_event_key IS NOT ?4
    AND (
      last_status_event_at IS NULL
      OR last_status_event_at < ?5
      OR (
        last_status_event_at = ?5
        AND (
          CASE ?3
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
  RETURNING
    ${MESSAGE_COLUMNS_SQL}
`;

const SELECT_MESSAGE_BY_PROVIDER_ID_SQL = `
  SELECT
    ${MESSAGE_COLUMNS_SQL}
  FROM messages
  WHERE tenant_id = ?1
    AND provider_message_id = ?2
    AND (?3 IS NULL OR direction = ?3)
  LIMIT 1
`;

interface InboundContactRow {
  contactId: number;
  tenantId: number;
  phoneNumber: string;
}

interface MessageRow {
  messageKey: string;
  conversationKey: string;
  tenantId: number;
  providerMessageId: string;
  direction: string;
  contentKind: string;
  status: string;
  textContent: string | null;
  occurredAt: string;
  statusUpdatedAt: string;
  lastStatusEventKey: string | null;
  lastStatusEventAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InboxConversationRow {
  conversationKey: string;
  tenantId: number;
  contactId: number;
  status: string;
  assignedExternalUserId: string | null;
  unreadCount: number;
  lastMessageKey: string | null;
  lastMessageAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  lastMessageDirection: string | null;
  lastMessageContentKind: string | null;
  lastMessageTextContent: string | null;
}

interface ConversationReadStateRow {
  conversationKey: string;
  tenantId: number;
  unreadCount: number;
  version: number;
}

interface ConversationAssignmentStateRow {
  conversationKey: string;
  tenantId: number;
  assignedExternalUserId: string | null;
  version: number;
}

export interface InboundContactIdentity {
  contactId: number;
  tenantId: number;
  phoneNumber: string;
}

export interface RecordInboundMessageInput
  extends ValidatedInboundMessage {
  tenantId: number;
  conversationKey: string;
  messageKey: string;
}

export type RecordInboundMessageResult = {
  outcome: "created" | "duplicate";
  message: PersistedMessage;
};

export interface ApplyMessageDeliveryStatusInput {
  tenantId: number;
  providerMessageId: string;
  status: Exclude<MessageStatus, "received">;
  statusEventKey: string;
  statusEventAt: string;
}

export type ApplyMessageDeliveryStatusResult =
  | {
      outcome: "applied" | "duplicate" | "stale";
      message: PersistedMessage;
    }
  | {
      outcome: "not-found";
    };

export interface InboxConversationContact {
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
}

export interface InboxConversationLastMessage {
  direction: MessageDirection;
  contentKind: MessageContentKind;
  textContent: string | null;
}

export interface PersistedInboxConversation
  extends PersistedConversation {
  contact: InboxConversationContact;
  lastMessage: InboxConversationLastMessage | null;
}

export interface ConversationReadState {
  conversationKey: string;
  unreadCount: number;
  version: number;
}

export type MarkConversationReadResult =
  | {
      outcome: "updated" | "unchanged";
      state: ConversationReadState;
    }
  | {
      outcome: "not-found" | "conflict";
    };

export interface InboxConversationListFilter {
  searchTerm: string | null;
  status: ConversationStatus | null;
  assignment: "all" | "unassigned" | "mine";
  currentExternalUserId: string | null;
}

export interface ConversationAssignmentState {
  conversationKey: string;
  assignedExternalUserId: string | null;
  version: number;
}

export type ChangeConversationAssignmentResult =
  | {
      outcome: "updated" | "unchanged";
      state: ConversationAssignmentState;
    }
  | {
      outcome: "not-found" | "conflict" | "locked";
    };

export interface ConversationRepository {
  resolveInboundContact(
    tenantId: number,
    phoneNumber: string,
  ): Promise<InboundContactIdentity>;
  recordInboundMessage(
    input: RecordInboundMessageInput,
  ): Promise<RecordInboundMessageResult>;
  applyDeliveryStatus(
    input: ApplyMessageDeliveryStatusInput,
  ): Promise<ApplyMessageDeliveryStatusResult>;
  listByTenant(
    tenantId: number,
    limit: number,
  ): Promise<readonly PersistedInboxConversation[]>;
  listFilteredByTenant(
    tenantId: number,
    filter: InboxConversationListFilter,
    limit: number,
  ): Promise<readonly PersistedInboxConversation[]>;
  findByKey(
    tenantId: number,
    conversationKey: string,
  ): Promise<PersistedInboxConversation | null>;
  listMessagesByConversation(
    tenantId: number,
    conversationKey: string,
    limit: number,
  ): Promise<readonly PersistedMessage[]>;
  markRead(
    tenantId: number,
    conversationKey: string,
    expectedVersion: number,
  ): Promise<MarkConversationReadResult>;
  changeAssignment(
    tenantId: number,
    conversationKey: string,
    expectedVersion: number,
    externalUserId: string,
    action: "assign-self" | "unassign-self",
  ): Promise<ChangeConversationAssignmentResult>;
}

export class MessageIdentityConflictError extends Error {
  readonly code = "IDENTITY_CONFLICT";

  constructor() {
    super("Provider message identity conflicts with stored data");
    this.name = "MessageIdentityConflictError";
  }
}

function assertPositiveInteger(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function assertLimit(
  value: number,
  maximum: number,
): void {
  assertPositiveInteger(value, "limit");

  if (value > maximum) {
    throw new Error(`limit must not exceed ${maximum}`);
  }
}

function assertConversationKey(value: string): void {
  if (!/^conversation_v1_[0-9a-f]{64}$/.test(value)) {
    throw new Error("conversationKey is invalid");
  }
}

function assertMessageKey(value: string): void {
  if (!/^message_v1_[0-9a-f]{64}$/.test(value)) {
    throw new Error("messageKey is invalid");
  }
}

function assertProviderMessageId(value: string): void {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    value.length > 255
  ) {
    throw new Error("providerMessageId is invalid");
  }
}

function assertExternalUserId(value: string): void {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    value.length > 255
  ) {
    throw new Error("externalUserId is invalid");
  }
}

function assertInboxConversationListFilter(
  filter: InboxConversationListFilter,
): void {
  if (
    (filter.searchTerm !== null &&
      (typeof filter.searchTerm !== "string" ||
        filter.searchTerm.trim() !==
          filter.searchTerm ||
        filter.searchTerm.length === 0 ||
        filter.searchTerm.length > 80 ||
        /[\u0000-\u001f\u007f]/.test(
          filter.searchTerm,
        ))) ||
    (filter.status !== null &&
      !persistedConversationStatuses.includes(
        filter.status,
      )) ||
    (filter.assignment !== "all" &&
      filter.assignment !== "unassigned" &&
      filter.assignment !== "mine") ||
    (filter.assignment === "mine" &&
      filter.currentExternalUserId === null)
  ) {
    throw new Error("conversation list filter is invalid");
  }

  if (filter.currentExternalUserId !== null) {
    assertExternalUserId(
      filter.currentExternalUserId,
    );
  }
}

function assertCanonicalTimestamp(
  value: string,
  fieldName: string,
): void {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(Date.parse(value)).toISOString() !== value
  ) {
    throw new Error(`${fieldName} is invalid`);
  }
}

function assertStatusEventKey(value: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) {
    throw new Error("statusEventKey is invalid");
  }
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    )
  ) {
    return false;
  }

  const timestamp = Date.parse(value);

  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}

function parseInboundContactRow(
  row: InboundContactRow,
): InboundContactIdentity {
  const validation = validatePersistedContact({
    phoneNumber: row.phoneNumber,
  });

  if (
    !Number.isSafeInteger(row.contactId) ||
    row.contactId <= 0 ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !validation.success
  ) {
    throw new Error("D1 returned an invalid inbound contact");
  }

  return {
    contactId: row.contactId,
    tenantId: row.tenantId,
    phoneNumber: validation.value.phoneNumber,
  };
}

function parseMessageRow(row: MessageRow): PersistedMessage {
  const direction = messageDirections.find(
    (candidate) => candidate === row.direction,
  );
  const contentKind = messageContentKinds.find(
    (candidate) => candidate === row.contentKind,
  );
  const status = messageStatuses.find(
    (candidate) => candidate === row.status,
  );
  const textContentIsValid =
    contentKind === "text"
      ? typeof row.textContent === "string" &&
        row.textContent.trim().length > 0 &&
        row.textContent.length <= 16_384
      : row.textContent === null;

  if (
    !/^message_v1_[0-9a-f]{64}$/.test(row.messageKey) ||
    !/^conversation_v1_[0-9a-f]{64}$/.test(
      row.conversationKey,
    ) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !isNonBlankString(row.providerMessageId) ||
    row.providerMessageId.length > 255 ||
    !direction ||
    !contentKind ||
    !status ||
    !textContentIsValid ||
    !isCanonicalTimestamp(row.occurredAt) ||
    !isCanonicalTimestamp(row.statusUpdatedAt) ||
    (row.lastStatusEventKey !== null &&
      !/^[0-9a-f]{64}$/.test(row.lastStatusEventKey)) ||
    (row.lastStatusEventAt !== null &&
      !isCanonicalTimestamp(row.lastStatusEventAt)) ||
    ((row.lastStatusEventKey === null) !==
      (row.lastStatusEventAt === null)) ||
    !isNonBlankString(row.createdAt) ||
    !isNonBlankString(row.updatedAt) ||
    (direction === "inbound" && status !== "received") ||
    (direction === "outbound" && status === "received")
  ) {
    throw new Error("D1 returned an invalid message");
  }

  return {
    ...row,
    direction,
    contentKind,
    status,
  };
}

function parseConversationReadState(
  row: ConversationReadStateRow,
  tenantId: number,
  conversationKey: string,
): ConversationReadState {
  if (
    !/^conversation_v1_[0-9a-f]{64}$/.test(
      row.conversationKey,
    ) ||
    row.conversationKey !== conversationKey ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId !== tenantId ||
    !Number.isSafeInteger(row.unreadCount) ||
    row.unreadCount < 0 ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0
  ) {
    throw new Error(
      "D1 returned an invalid conversation read state",
    );
  }

  return {
    conversationKey: row.conversationKey,
    unreadCount: row.unreadCount,
    version: row.version,
  };
}

function parseConversationAssignmentState(
  row: ConversationAssignmentStateRow,
  tenantId: number,
  conversationKey: string,
): ConversationAssignmentState {
  if (
    row.conversationKey !== conversationKey ||
    !/^conversation_v1_[0-9a-f]{64}$/.test(
      row.conversationKey,
    ) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId !== tenantId ||
    (row.assignedExternalUserId !== null &&
      (!isNonBlankString(
        row.assignedExternalUserId,
      ) ||
        row.assignedExternalUserId.length > 255)) ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0
  ) {
    throw new Error(
      "D1 returned an invalid conversation assignment state",
    );
  }

  return {
    conversationKey: row.conversationKey,
    assignedExternalUserId:
      row.assignedExternalUserId,
    version: row.version,
  };
}

function parseInboxConversationRow(
  row: InboxConversationRow,
): PersistedInboxConversation {
  const status = persistedConversationStatuses.find(
    (candidate) => candidate === row.status,
  );
  const contactValidation = validatePersistedContact({
    phoneNumber: row.phoneNumber,
    firstName: row.firstName,
    lastName: row.lastName,
  });
  const lastMessageDirection = messageDirections.find(
    (candidate) =>
      candidate === row.lastMessageDirection,
  );
  const lastMessageContentKind = messageContentKinds.find(
    (candidate) =>
      candidate === row.lastMessageContentKind,
  );
  const hasLastMessage =
    row.lastMessageKey !== null &&
    row.lastMessageAt !== null;
  const lastMessageContentIsValid =
    lastMessageContentKind === "text"
      ? isNonBlankString(row.lastMessageTextContent) &&
        row.lastMessageTextContent.length <= 16_384
      : row.lastMessageTextContent === null;

  if (
    !/^conversation_v1_[0-9a-f]{64}$/.test(
      row.conversationKey,
    ) ||
    !Number.isSafeInteger(row.tenantId) ||
    row.tenantId <= 0 ||
    !Number.isSafeInteger(row.contactId) ||
    row.contactId <= 0 ||
    !status ||
    (row.assignedExternalUserId !== null &&
      (!isNonBlankString(
        row.assignedExternalUserId,
      ) ||
        row.assignedExternalUserId.length > 255)) ||
    !Number.isSafeInteger(row.unreadCount) ||
    row.unreadCount < 0 ||
    ((row.lastMessageKey === null) !==
      (row.lastMessageAt === null)) ||
    (row.lastMessageKey !== null &&
      !/^message_v1_[0-9a-f]{64}$/.test(
        row.lastMessageKey,
      )) ||
    (row.lastMessageAt !== null &&
      !isCanonicalTimestamp(row.lastMessageAt)) ||
    !Number.isSafeInteger(row.version) ||
    row.version <= 0 ||
    !isNonBlankString(row.createdAt) ||
    !isNonBlankString(row.updatedAt) ||
    !contactValidation.success ||
    (hasLastMessage &&
      (!lastMessageDirection ||
        !lastMessageContentKind ||
        !lastMessageContentIsValid)) ||
    (!hasLastMessage &&
      (row.lastMessageDirection !== null ||
        row.lastMessageContentKind !== null ||
        row.lastMessageTextContent !== null))
  ) {
    throw new Error(
      "D1 returned an invalid inbox conversation",
    );
  }

  return {
    conversationKey: row.conversationKey,
    tenantId: row.tenantId,
    contactId: row.contactId,
    status,
    assignedExternalUserId:
      row.assignedExternalUserId,
    unreadCount: row.unreadCount,
    lastMessageKey: row.lastMessageKey,
    lastMessageAt: row.lastMessageAt,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    contact: {
      phoneNumber:
        contactValidation.value.phoneNumber,
      firstName: contactValidation.value.firstName,
      lastName: contactValidation.value.lastName,
    },
    lastMessage:
      hasLastMessage &&
      lastMessageDirection &&
      lastMessageContentKind
        ? {
            direction: lastMessageDirection,
            contentKind: lastMessageContentKind,
            textContent: row.lastMessageTextContent,
          }
        : null,
  };
}

function assertBatchSucceeded(
  results: readonly D1Result<MessageRow>[],
  expectedLength: number,
): void {
  if (
    results.length !== expectedLength ||
    results.some((result) => !result.success)
  ) {
    const failedResult = results.find(
      (result) => !result.success,
    );

    throw new Error(
      failedResult?.error ??
        "D1 conversation batch failed",
    );
  }
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

export function createConversationRepository(
  database: D1DatabaseBinding,
): ConversationRepository {
  const findByProviderMessageId = async (
    tenantId: number,
    providerMessageId: string,
    direction: "inbound" | "outbound" | null,
  ): Promise<PersistedMessage | null> => {
    const row = await database
      .prepare(SELECT_MESSAGE_BY_PROVIDER_ID_SQL)
      .bind(tenantId, providerMessageId, direction)
      .first<MessageRow>();

    return row ? parseMessageRow(row) : null;
  };

  const listFilteredByTenant: ConversationRepository["listFilteredByTenant"] =
    async (tenantId, filter, limit) => {
      assertPositiveInteger(tenantId, "tenantId");
      assertInboxConversationListFilter(filter);
      assertLimit(limit, 100);

      const result = await database
        .prepare(LIST_INBOX_CONVERSATIONS_SQL)
        .bind(
          tenantId,
          filter.searchTerm,
          filter.status,
          filter.assignment,
          filter.currentExternalUserId,
          limit,
        )
        .all<InboxConversationRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 inbox conversation list read failed",
        );
      }

      return (result.results ?? []).map((row) => {
        const conversation =
          parseInboxConversationRow(row);

        if (conversation.tenantId !== tenantId) {
          throw new Error(
            "D1 returned a conversation outside the requested tenant",
          );
        }

        return conversation;
      });
    };

  return {
    async resolveInboundContact(tenantId, phoneNumber) {
      assertPositiveInteger(tenantId, "tenantId");
      const validation = validatePersistedContact({
        phoneNumber,
      });

      if (!validation.success) {
        throw new Error("phoneNumber is invalid");
      }

      const row = await database
        .prepare(RESOLVE_INBOUND_CONTACT_SQL)
        .bind(tenantId, validation.value.phoneNumber)
        .first<InboundContactRow>();

      if (!row) {
        throw new Error(
          "D1 did not resolve the inbound contact",
        );
      }

      const contact = parseInboundContactRow(row);

      if (
        contact.tenantId !== tenantId ||
        contact.phoneNumber !==
          validation.value.phoneNumber
      ) {
        throw new Error(
          "D1 returned an invalid inbound contact scope",
        );
      }

      return contact;
    },

    async recordInboundMessage(input) {
      assertPositiveInteger(input.tenantId, "tenantId");
      assertConversationKey(input.conversationKey);
      assertMessageKey(input.messageKey);

      const validation = validateInboundMessage(input);

      if (!validation.success) {
        throw new Error("inbound message is invalid");
      }

      const results = await database.batch<MessageRow>([
        database
          .prepare(INSERT_CONVERSATION_SQL)
          .bind(
            input.conversationKey,
            input.tenantId,
            validation.value.contactId,
          ),
        database
          .prepare(UPDATE_CONVERSATION_FOR_INBOUND_SQL)
          .bind(
            input.tenantId,
            input.conversationKey,
            input.messageKey,
            validation.value.occurredAt,
            validation.value.providerMessageId,
          ),
        database
          .prepare(INSERT_INBOUND_MESSAGE_SQL)
          .bind(
            input.messageKey,
            input.conversationKey,
            input.tenantId,
            validation.value.providerMessageId,
            validation.value.contentKind,
            validation.value.textContent,
            validation.value.occurredAt,
          ),
      ]);

      assertBatchSucceeded(results, 3);

      const insertedRow = results[2].results?.[0];

      if (insertedRow) {
        return {
          outcome: "created",
          message: parseMessageRow(insertedRow),
        };
      }

      const existing = await findByProviderMessageId(
        input.tenantId,
        validation.value.providerMessageId,
        "inbound",
      );

      if (!existing) {
        throw new Error(
          "D1 did not return the stored inbound message",
        );
      }

      if (
        !isSameInboundIdentity(existing, {
          ...input,
          ...validation.value,
        })
      ) {
        throw new MessageIdentityConflictError();
      }

      return {
        outcome: "duplicate",
        message: existing,
      };
    },

    async applyDeliveryStatus(input) {
      assertPositiveInteger(input.tenantId, "tenantId");
      assertProviderMessageId(input.providerMessageId);
      if (
        input.status !== "sent" &&
        input.status !== "delivered" &&
        input.status !== "read" &&
        input.status !== "failed"
      ) {
        throw new Error("delivery status is invalid");
      }
      assertStatusEventKey(input.statusEventKey);
      assertCanonicalTimestamp(
        input.statusEventAt,
        "statusEventAt",
      );

      const appliedRow = await database
        .prepare(APPLY_DELIVERY_STATUS_SQL)
        .bind(
          input.tenantId,
          input.providerMessageId,
          input.status,
          input.statusEventKey,
          input.statusEventAt,
        )
        .first<MessageRow>();

      if (appliedRow) {
        return {
          outcome: "applied",
          message: parseMessageRow(appliedRow),
        };
      }

      const existing = await findByProviderMessageId(
        input.tenantId,
        input.providerMessageId,
        "outbound",
      );

      if (!existing) {
        return { outcome: "not-found" };
      }

      if (
        existing.lastStatusEventKey ===
        input.statusEventKey
      ) {
        return {
          outcome: "duplicate",
          message: existing,
        };
      }

      return {
        outcome: "stale",
        message: existing,
      };
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

    async findByKey(tenantId, conversationKey) {
      assertPositiveInteger(tenantId, "tenantId");
      assertConversationKey(conversationKey);

      const row = await database
        .prepare(SELECT_INBOX_CONVERSATION_SQL)
        .bind(tenantId, conversationKey)
        .first<InboxConversationRow>();

      if (!row) {
        return null;
      }

      const conversation =
        parseInboxConversationRow(row);

      if (
        conversation.tenantId !== tenantId ||
        conversation.conversationKey !==
          conversationKey
      ) {
        throw new Error(
          "D1 returned a conversation outside the requested scope",
        );
      }

      return conversation;
    },

    async listMessagesByConversation(
      tenantId,
      conversationKey,
      limit,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertConversationKey(conversationKey);
      assertLimit(limit, 200);

      const result = await database
        .prepare(LIST_CONVERSATION_MESSAGES_SQL)
        .bind(tenantId, conversationKey, limit)
        .all<MessageRow>();

      if (!result.success) {
        throw new Error(
          result.error ??
            "D1 conversation message list read failed",
        );
      }

      return (result.results ?? [])
        .map((row) => {
          const message = parseMessageRow(row);

          if (
            message.tenantId !== tenantId ||
            message.conversationKey !==
              conversationKey
          ) {
            throw new Error(
              "D1 returned a message outside the requested scope",
            );
          }

          return message;
        })
        .reverse();
    },

    async markRead(
      tenantId,
      conversationKey,
      expectedVersion,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertConversationKey(conversationKey);
      assertPositiveInteger(
        expectedVersion,
        "expectedVersion",
      );

      const updatedRow = await database
        .prepare(MARK_CONVERSATION_READ_SQL)
        .bind(
          tenantId,
          conversationKey,
          expectedVersion,
        )
        .first<ConversationReadStateRow>();

      if (updatedRow) {
        return {
          outcome: "updated",
          state: parseConversationReadState(
            updatedRow,
            tenantId,
            conversationKey,
          ),
        };
      }

      const currentRow = await database
        .prepare(
          SELECT_CONVERSATION_READ_STATE_SQL,
        )
        .bind(tenantId, conversationKey)
        .first<ConversationReadStateRow>();

      if (!currentRow) {
        return { outcome: "not-found" };
      }

      const current =
        parseConversationReadState(
          currentRow,
          tenantId,
          conversationKey,
        );

      if (current.version !== expectedVersion) {
        return { outcome: "conflict" };
      }

      return {
        outcome: "unchanged",
        state: current,
      };
    },

    async changeAssignment(
      tenantId,
      conversationKey,
      expectedVersion,
      externalUserId,
      action,
    ) {
      assertPositiveInteger(tenantId, "tenantId");
      assertConversationKey(conversationKey);
      assertPositiveInteger(
        expectedVersion,
        "expectedVersion",
      );
      assertExternalUserId(externalUserId);

      if (
        action !== "assign-self" &&
        action !== "unassign-self"
      ) {
        throw new Error(
          "assignment action is invalid",
        );
      }

      const updatedRow = await database
        .prepare(
          action === "assign-self"
            ? ASSIGN_CONVERSATION_TO_SELF_SQL
            : UNASSIGN_CONVERSATION_FROM_SELF_SQL,
        )
        .bind(
          tenantId,
          conversationKey,
          expectedVersion,
          externalUserId,
        )
        .first<ConversationAssignmentStateRow>();

      if (updatedRow) {
        return {
          outcome: "updated",
          state: parseConversationAssignmentState(
            updatedRow,
            tenantId,
            conversationKey,
          ),
        };
      }

      const currentRow = await database
        .prepare(
          SELECT_CONVERSATION_ASSIGNMENT_STATE_SQL,
        )
        .bind(tenantId, conversationKey)
        .first<ConversationAssignmentStateRow>();

      if (!currentRow) {
        return { outcome: "not-found" };
      }

      const current =
        parseConversationAssignmentState(
          currentRow,
          tenantId,
          conversationKey,
        );

      if (current.version !== expectedVersion) {
        return { outcome: "conflict" };
      }

      const isExpectedNoOp =
        (action === "assign-self" &&
          current.assignedExternalUserId ===
            externalUserId) ||
        (action === "unassign-self" &&
          current.assignedExternalUserId === null);

      if (!isExpectedNoOp) {
        return { outcome: "locked" };
      }

      return {
        outcome: "unchanged",
        state: current,
      };
    },
  };
}
