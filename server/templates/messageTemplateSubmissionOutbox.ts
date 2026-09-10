import { sha256Hex } from "../meta/metaWebhookSecurity.ts";

export const MESSAGE_TEMPLATE_SUBMISSION_OPERATION =
  "templates.submit" as const;
export const MESSAGE_TEMPLATE_SUBMISSION_WORKER_ACTOR =
  "meta-template-provider-worker-v1" as const;
export const MESSAGE_TEMPLATE_RECONCILIATION_WORKER_ACTOR =
  "meta-template-reconciliation-worker-v1" as const;

export const messageTemplateSubmissionOutboxStatuses = Object.freeze([
  "pending",
  "submitting",
  "submitted",
  "rejected",
  "blocked",
  "ambiguous",
] as const);

export type MessageTemplateSubmissionOutboxStatus =
  (typeof messageTemplateSubmissionOutboxStatuses)[number];

export const messageTemplateSubmissionEventTypes = Object.freeze([
  "staged",
  "claimed",
  "submitted",
  "rejected",
  "blocked",
  "ambiguous",
  "reconciled-submitted",
  "reconciled-rejected",
] as const);

export type MessageTemplateSubmissionEventType =
  (typeof messageTemplateSubmissionEventTypes)[number];

export interface MessageTemplateSubmissionOutboxRecord {
  readonly submissionKey: string;
  readonly tenantId: number;
  readonly templateKey: string;
  readonly templateVersion: number;
  readonly metaConnectionVersion: number;
  readonly wabaId: string;
  readonly graphApiVersion: string;
  readonly requestOperation: typeof MESSAGE_TEMPLATE_SUBMISSION_OPERATION;
  readonly requestIdempotencyKey: string;
  readonly status: MessageTemplateSubmissionOutboxStatus;
  readonly stateVersion: number;
  readonly attemptCount: number;
  readonly lastErrorCode: string | null;
  readonly metaTemplateId: string | null;
  readonly claimedAt: string | null;
  readonly settledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MessageTemplateSubmissionEvent {
  readonly eventKey: string;
  readonly submissionKey: string;
  readonly tenantId: number;
  readonly templateKey: string;
  readonly eventType: MessageTemplateSubmissionEventType;
  readonly fromStatus: MessageTemplateSubmissionOutboxStatus | null;
  readonly toStatus: MessageTemplateSubmissionOutboxStatus;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly actorKind: "user" | "system";
  readonly actorExternalUserId: string;
  readonly causationKey: string;
  readonly errorCode: string | null;
  readonly metaTemplateId: string | null;
  readonly occurredAt: string;
}

const outboxKeys = Object.freeze([
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
const submissionKeyPattern = /^template_submission_v1_[0-9a-f]{64}$/;
const templateKeyPattern = /^template_v1_[0-9a-f]{64}$/;
const idempotencyKeyPattern = /^connect_idempotency_v1_[0-9a-f]{64}$/;
const eventKeyPattern = /^template_submission_event_v1_[0-9a-f]{64}$/;
const errorCodePattern = /^[A-Z0-9_]{1,100}$/;
const metaIdPattern = /^[1-9][0-9]{0,254}$/;
const wabaIdPattern = /^[1-9][0-9]{0,63}$/;
const graphVersionPattern = /^v[1-9][0-9]*\.[0-9]+$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();

  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function positiveInteger(value: unknown): number | null {
  const normalized = typeof value === "string" && /^[1-9][0-9]*$/.test(value)
    ? Number(value)
    : value;

  return Number.isSafeInteger(normalized) && Number(normalized) > 0
    ? Number(normalized)
    : null;
}

function boundedInteger(value: unknown, minimum: number, maximum: number) {
  const normalized = typeof value === "string" && /^(?:0|[1-9][0-9]*)$/.test(value)
    ? Number(value)
    : value;

  return Number.isSafeInteger(normalized) &&
      Number(normalized) >= minimum &&
      Number(normalized) <= maximum
    ? Number(normalized)
    : null;
}

function canonicalTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !timestampPattern.test(value)) {
    return null;
  }

  const milliseconds = Date.parse(value);

  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value
    ? value
    : null;
}

function optionalPattern(
  value: unknown,
  pattern: RegExp,
): string | null | undefined {
  if (value === null) {
    return null;
  }

  return typeof value === "string" && pattern.test(value) ? value : undefined;
}

function isStatus(value: unknown): value is MessageTemplateSubmissionOutboxStatus {
  return messageTemplateSubmissionOutboxStatuses.some(
    (status) => status === value,
  );
}

function lifecycleConsistent(
  record: Readonly<MessageTemplateSubmissionOutboxRecord>,
): boolean {
  const created = Date.parse(record.createdAt);
  const updated = Date.parse(record.updatedAt);
  const claimed = record.claimedAt === null ? null : Date.parse(record.claimedAt);
  const settled = record.settledAt === null ? null : Date.parse(record.settledAt);
  const timestampsConsistent = updated >= created &&
    (claimed === null || claimed >= created) &&
    (settled === null || settled >= created);

  if (!timestampsConsistent) {
    return false;
  }

  if (record.status === "pending") {
    return record.stateVersion === 1 && record.attemptCount === 0 &&
      record.lastErrorCode === null && record.metaTemplateId === null &&
      record.claimedAt === null && record.settledAt === null;
  }

  if (record.status === "submitting") {
    return record.stateVersion === 2 && record.attemptCount === 1 &&
      record.lastErrorCode === null && record.metaTemplateId === null &&
      record.claimedAt !== null && record.settledAt === null;
  }

  if (record.status === "submitted") {
    return (record.stateVersion === 3 || record.stateVersion === 4) &&
      record.attemptCount === 1 && record.lastErrorCode === null &&
      record.metaTemplateId !== null && record.claimedAt !== null &&
      record.settledAt !== null;
  }

  if (record.status === "rejected") {
    return (record.stateVersion === 3 || record.stateVersion === 4) &&
      record.attemptCount === 1 && record.lastErrorCode !== null &&
      record.metaTemplateId === null && record.claimedAt !== null &&
      record.settledAt !== null;
  }

  if (record.status === "ambiguous") {
    return record.stateVersion === 3 && record.attemptCount === 1 &&
      record.lastErrorCode !== null && record.metaTemplateId === null &&
      record.claimedAt !== null && record.settledAt === null;
  }

  return record.stateVersion === 2 && record.attemptCount === 0 &&
    record.lastErrorCode !== null && record.metaTemplateId === null &&
    record.claimedAt === null && record.settledAt !== null;
}

export function parseMessageTemplateSubmissionOutbox(
  value: unknown,
): Readonly<MessageTemplateSubmissionOutboxRecord> | null {
  if (!isRecord(value) || !hasExactKeys(value, outboxKeys)) {
    return null;
  }

  const tenantId = positiveInteger(value.tenantId);
  const templateVersion = positiveInteger(value.templateVersion);
  const metaConnectionVersion = positiveInteger(value.metaConnectionVersion);
  const stateVersion = positiveInteger(value.stateVersion);
  const attemptCount = boundedInteger(value.attemptCount, 0, 1);
  const lastErrorCode = optionalPattern(value.lastErrorCode, errorCodePattern);
  const metaTemplateId = optionalPattern(value.metaTemplateId, metaIdPattern);
  const claimedAt = value.claimedAt === null
    ? null
    : canonicalTimestamp(value.claimedAt);
  const settledAt = value.settledAt === null
    ? null
    : canonicalTimestamp(value.settledAt);
  const createdAt = canonicalTimestamp(value.createdAt);
  const updatedAt = canonicalTimestamp(value.updatedAt);

  if (
    tenantId === null || templateVersion === null ||
    metaConnectionVersion === null || stateVersion === null ||
    attemptCount === null || lastErrorCode === undefined ||
    metaTemplateId === undefined || claimedAt === null && value.claimedAt !== null ||
    settledAt === null && value.settledAt !== null || createdAt === null ||
    updatedAt === null || typeof value.submissionKey !== "string" ||
    !submissionKeyPattern.test(value.submissionKey) ||
    typeof value.templateKey !== "string" ||
    !templateKeyPattern.test(value.templateKey) ||
    typeof value.wabaId !== "string" || !wabaIdPattern.test(value.wabaId) ||
    typeof value.graphApiVersion !== "string" ||
    value.graphApiVersion.length > 20 ||
    !graphVersionPattern.test(value.graphApiVersion) ||
    value.requestOperation !== MESSAGE_TEMPLATE_SUBMISSION_OPERATION ||
    typeof value.requestIdempotencyKey !== "string" ||
    !idempotencyKeyPattern.test(value.requestIdempotencyKey) ||
    !isStatus(value.status)
  ) {
    return null;
  }

  const record: MessageTemplateSubmissionOutboxRecord = {
    submissionKey: value.submissionKey,
    tenantId,
    templateKey: value.templateKey,
    templateVersion,
    metaConnectionVersion,
    wabaId: value.wabaId,
    graphApiVersion: value.graphApiVersion,
    requestOperation: MESSAGE_TEMPLATE_SUBMISSION_OPERATION,
    requestIdempotencyKey: value.requestIdempotencyKey,
    status: value.status,
    stateVersion,
    attemptCount,
    lastErrorCode,
    metaTemplateId,
    claimedAt,
    settledAt,
    createdAt,
    updatedAt,
  };

  return lifecycleConsistent(record) ? Object.freeze(record) : null;
}

function validActor(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 512 &&
    value.trim() === value && !controlCharacterPattern.test(value);
}

function eventShapeConsistent(
  event: Omit<MessageTemplateSubmissionEvent, "eventKey">,
): boolean {
  const versionValid = event.eventType === "staged"
    ? event.fromVersion === 0 && event.toVersion === 1
    : event.fromVersion >= 1 && event.toVersion === event.fromVersion + 1;
  const transition = `${event.fromStatus ?? "null"}->${event.toStatus}`;
  const expectedTransition: Record<MessageTemplateSubmissionEventType, string> = {
    staged: "null->pending",
    claimed: "pending->submitting",
    submitted: "submitting->submitted",
    rejected: "submitting->rejected",
    blocked: "pending->blocked",
    ambiguous: "submitting->ambiguous",
    "reconciled-submitted": "ambiguous->submitted",
    "reconciled-rejected": "ambiguous->rejected",
  };
  const actorValid = event.eventType === "staged"
    ? event.actorKind === "user" && idempotencyKeyPattern.test(event.causationKey)
    : event.actorKind === "system" && event.causationKey === event.submissionKey;
  const evidenceValid = event.toStatus === "submitted"
    ? event.errorCode === null && event.metaTemplateId !== null
    : event.toStatus === "rejected" || event.toStatus === "blocked" ||
        event.toStatus === "ambiguous"
      ? event.errorCode !== null && event.metaTemplateId === null
      : event.errorCode === null && event.metaTemplateId === null;

  return versionValid && transition === expectedTransition[event.eventType] &&
    actorValid && evidenceValid;
}

export async function deriveMessageTemplateSubmissionEventKey(
  input: Omit<MessageTemplateSubmissionEvent, "eventKey">,
): Promise<string> {
  if (
    !submissionKeyPattern.test(input.submissionKey) ||
    positiveInteger(input.tenantId) === null ||
    !templateKeyPattern.test(input.templateKey) ||
    !messageTemplateSubmissionEventTypes.some((type) => type === input.eventType) ||
    (input.fromStatus !== null && !isStatus(input.fromStatus)) ||
    !isStatus(input.toStatus) || !validActor(input.actorExternalUserId) ||
    optionalPattern(input.errorCode, errorCodePattern) === undefined ||
    optionalPattern(input.metaTemplateId, metaIdPattern) === undefined ||
    canonicalTimestamp(input.occurredAt) === null ||
    !eventShapeConsistent(input)
  ) {
    throw new Error("Message template submission event is invalid");
  }

  const digest = await sha256Hex(
    new TextEncoder().encode(JSON.stringify({
      namespace: "template_submission_event_v1",
      submissionKey: input.submissionKey,
      tenantId: input.tenantId,
      templateKey: input.templateKey,
      eventType: input.eventType,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      fromVersion: input.fromVersion,
      toVersion: input.toVersion,
      actorKind: input.actorKind,
      actorExternalUserId: input.actorExternalUserId,
      causationKey: input.causationKey,
      errorCode: input.errorCode,
      metaTemplateId: input.metaTemplateId,
      occurredAt: input.occurredAt,
    })),
  );

  const eventKey = `template_submission_event_v1_${digest}`;

  if (!eventKeyPattern.test(eventKey)) {
    throw new Error("Message template submission event identity is invalid");
  }

  return eventKey;
}
