import {
  ContactNotFoundError,
  type ContactConsentRepository,
  type RecordContactConsentEventInput,
} from "../../db/contactConsentRepository.ts";
import type {
  PersistedContact,
} from "../../db/contactRepository.ts";
import {
  deriveContactConsentEventKey,
} from "../contacts/contactConsentEventKey.ts";
import {
  requireActorExternalUserId,
  requireCanonicalTimestamp,
} from "../billing/tenantSubscriptionValidation.ts";
import {
  parsePostgresPositiveInteger,
  parsePostgresTimestamp,
  requireExactPostgresRow,
  requirePostgresRows,
} from "./postgresResultValidation.ts";
import {
  createPostgresContactReadRepository,
} from "./postgresContactReadRepository.ts";
import type {
  PostgresParameter,
  PostgresQueryExecutor,
  PostgresTransactionManager,
} from "./postgresTransaction.ts";

const eventKeyPattern = /^contact_consent_v1_[0-9a-f]{64}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const identityRowKeys = Object.freeze(["contactId"]);
const eventRowKeys = Object.freeze([
  "actorExternalUserId",
  "contactId",
  "eventId",
  "eventType",
  "evidenceReference",
  "idempotencyKey",
  "occurredAt",
  "source",
  "tenantId",
]);
const eventColumns = `
  id AS "eventId",
  tenant_id AS "tenantId",
  contact_id AS "contactId",
  event_type AS "eventType",
  source,
  occurred_at AS "occurredAt",
  evidence_reference AS "evidenceReference",
  actor_external_user_id AS "actorExternalUserId",
  idempotency_key AS "idempotencyKey"
`;

export const postgresContactConsentSql = Object.freeze({
  lockContact: `
    SELECT id AS "contactId"
    FROM contacts
    WHERE tenant_id = $1
      AND id = $2
    FOR UPDATE
  `,
  insertEvent: `
    INSERT INTO contact_consent_events (
      tenant_id,
      contact_id,
      event_type,
      source,
      occurred_at,
      evidence_reference,
      actor_external_user_id,
      idempotency_key
    ) VALUES (
      $1, $2, $3, $4, $5::timestamptz,
      $6, $7, $8
    )
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    RETURNING ${eventColumns}
  `,
  findEvent: `
    SELECT ${eventColumns}
    FROM contact_consent_events
    WHERE tenant_id = $1
      AND idempotency_key = $2
    LIMIT 1
  `,
  applyLatestEvent: `
    UPDATE contacts
    SET
      mailing_status = CASE
        WHEN $3 = 'granted' THEN 'subscribed'
        ELSE 'unsubscribed'
      END,
      consent_status = CASE
        WHEN $3 = 'granted' THEN 'granted'
        ELSE 'withdrawn'
      END,
      consent_source = $4,
      consent_recorded_at = CASE
        WHEN $3 = 'granted' THEN $5::timestamptz
        ELSE COALESCE(contacts.consent_recorded_at, $5::timestamptz)
      END,
      consent_withdrawn_at = CASE
        WHEN $3 = 'granted' THEN NULL
        ELSE $5::timestamptz
      END,
      consent_evidence_reference = $6,
      version = contacts.version + 1,
      updated_at = CURRENT_TIMESTAMP(3)
    WHERE contacts.tenant_id = $1
      AND contacts.id = $2
      AND EXISTS (
        SELECT 1
        FROM contact_consent_events AS matching_event
        WHERE matching_event.tenant_id = $1
          AND matching_event.contact_id = $2
          AND matching_event.event_type = $3
          AND matching_event.source = $4
          AND matching_event.occurred_at = $5::timestamptz
          AND matching_event.evidence_reference IS NOT DISTINCT FROM $6
          AND matching_event.actor_external_user_id = $7
          AND matching_event.idempotency_key = $8
          AND NOT EXISTS (
            SELECT 1
            FROM contact_consent_events AS newer_event
            WHERE newer_event.tenant_id = matching_event.tenant_id
              AND newer_event.contact_id = matching_event.contact_id
              AND (
                newer_event.occurred_at > matching_event.occurred_at
                OR (
                  newer_event.occurred_at = matching_event.occurred_at
                  AND newer_event.id > matching_event.id
                )
              )
          )
      )
      AND (
        contacts.mailing_status IS DISTINCT FROM CASE
          WHEN $3 = 'granted' THEN 'subscribed'
          ELSE 'unsubscribed'
        END
        OR contacts.consent_status IS DISTINCT FROM CASE
          WHEN $3 = 'granted' THEN 'granted'
          ELSE 'withdrawn'
        END
        OR contacts.consent_source IS DISTINCT FROM $4
        OR contacts.consent_withdrawn_at IS DISTINCT FROM CASE
          WHEN $3 = 'granted' THEN NULL
          ELSE $5::timestamptz
        END
        OR contacts.consent_evidence_reference IS DISTINCT FROM $6
      )
    RETURNING id AS "contactId"
  `,
});

export interface PostgresContactConsentDependencies {
  readonly transactions: PostgresTransactionManager;
}

interface ParsedEvent {
  readonly eventId: number;
  readonly tenantId: number;
  readonly contactId: number;
  readonly eventType: "granted" | "unsubscribed";
  readonly source: string;
  readonly occurredAt: string;
  readonly evidenceReference: string | null;
  readonly actorExternalUserId: string;
  readonly idempotencyKey: string;
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${fieldName} is invalid`);
  }
  return Number(value);
}

function requireBoundedText(
  value: unknown,
  fieldName: string,
  maximumLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value !== value.trim() ||
    controlCharacterPattern.test(value)
  ) {
    throw new Error(`${fieldName} is invalid`);
  }
  return value;
}

function requireEvidenceReference(value: unknown): string | null {
  return value === null
    ? null
    : requireBoundedText(value, "evidenceReference", 2_048);
}

function requireEventType(value: unknown): "granted" | "unsubscribed" {
  if (value !== "granted" && value !== "unsubscribed") {
    throw new Error("eventType is invalid");
  }
  return value;
}

function parseEvent(value: unknown): Readonly<ParsedEvent> {
  const row = requireExactPostgresRow(value, eventRowKeys);
  if (
    typeof row.idempotencyKey !== "string" ||
    !eventKeyPattern.test(row.idempotencyKey)
  ) {
    throw new Error("PostgreSQL returned an invalid consent event key");
  }
  return Object.freeze({
    eventId: parsePostgresPositiveInteger(row.eventId),
    tenantId: parsePostgresPositiveInteger(row.tenantId),
    contactId: parsePostgresPositiveInteger(row.contactId),
    eventType: requireEventType(row.eventType),
    source: requireBoundedText(row.source, "PostgreSQL consent source", 256),
    occurredAt: parsePostgresTimestamp(row.occurredAt),
    evidenceReference: requireEvidenceReference(row.evidenceReference),
    actorExternalUserId: requireActorExternalUserId(
      requireBoundedText(
        row.actorExternalUserId,
        "PostgreSQL consent actor",
        255,
      ),
    ),
    idempotencyKey: row.idempotencyKey,
  });
}

function eventMatchesInput(
  event: Readonly<ParsedEvent>,
  input: Readonly<RecordContactConsentEventInput>,
): boolean {
  return event.tenantId === input.tenantId &&
    event.contactId === input.contactId &&
    event.eventType === input.eventType &&
    event.source === input.source &&
    event.occurredAt === input.occurredAt &&
    event.evidenceReference === input.evidenceReference &&
    event.actorExternalUserId === input.actorExternalUserId &&
    event.idempotencyKey === input.idempotencyKey;
}

async function loadRows(
  queries: PostgresQueryExecutor,
  sql: string,
  parameters: readonly PostgresParameter[],
  maximum: number,
): Promise<readonly unknown[]> {
  return requirePostgresRows(
    await queries.query<unknown>(sql, parameters),
    maximum,
  );
}

function requireContactIdentity(value: unknown, contactId: number): void {
  const row = requireExactPostgresRow(value, identityRowKeys);
  if (parsePostgresPositiveInteger(row.contactId) !== contactId) {
    throw new Error("PostgreSQL returned a cross-tenant consent identity");
  }
}

async function validateInput(
  input: RecordContactConsentEventInput,
): Promise<Readonly<RecordContactConsentEventInput>> {
  const normalized = Object.freeze({
    tenantId: requirePositiveInteger(input?.tenantId, "tenantId"),
    contactId: requirePositiveInteger(input?.contactId, "contactId"),
    eventType: requireEventType(input?.eventType),
    source: requireBoundedText(input?.source, "source", 256),
    occurredAt: requireCanonicalTimestamp(input?.occurredAt),
    evidenceReference: requireEvidenceReference(input?.evidenceReference),
    actorExternalUserId: requireActorExternalUserId(
      input?.actorExternalUserId,
    ),
    idempotencyKey: typeof input?.idempotencyKey === "string"
      ? input.idempotencyKey
      : "",
  });
  const expectedKey = await deriveContactConsentEventKey(normalized);
  if (
    !eventKeyPattern.test(normalized.idempotencyKey) ||
    normalized.idempotencyKey !== expectedKey
  ) {
    throw new Error("idempotencyKey is invalid");
  }
  return normalized;
}

export function createPostgresContactConsentRepository(
  dependencies: Readonly<PostgresContactConsentDependencies>,
): ContactConsentRepository {
  if (typeof dependencies?.transactions?.transaction !== "function") {
    throw new Error("PostgreSQL contact consent dependencies are invalid");
  }
  return Object.freeze({
    async recordEvent(
      rawInput: RecordContactConsentEventInput,
    ): Promise<PersistedContact> {
      const input = await validateInput(rawInput);
      return dependencies.transactions.transaction(
        { isolationLevel: "read-committed" },
        async (transaction) => {
          const locked = await loadRows(
            transaction,
            postgresContactConsentSql.lockContact,
            [input.tenantId, input.contactId],
            1,
          );
          if (locked.length === 0) throw new ContactNotFoundError();
          requireContactIdentity(locked[0], input.contactId);

          const parameters = [
            input.tenantId,
            input.contactId,
            input.eventType,
            input.source,
            input.occurredAt,
            input.evidenceReference,
            input.actorExternalUserId,
            input.idempotencyKey,
          ] as const;
          const inserted = await loadRows(
            transaction,
            postgresContactConsentSql.insertEvent,
            parameters,
            1,
          );
          if (inserted.length === 1 && !eventMatchesInput(
            parseEvent(inserted[0]),
            input,
          )) {
            throw new Error("PostgreSQL returned a mismatched consent event");
          }
          const stored = await loadRows(
            transaction,
            postgresContactConsentSql.findEvent,
            [input.tenantId, input.idempotencyKey],
            1,
          );
          if (
            stored.length !== 1 ||
            !eventMatchesInput(parseEvent(stored[0]), input)
          ) {
            throw new Error("Consent event idempotency key conflict");
          }

          const applied = await loadRows(
            transaction,
            postgresContactConsentSql.applyLatestEvent,
            parameters,
            1,
          );
          if (applied.length === 1) {
            requireContactIdentity(applied[0], input.contactId);
          }
          const contact = await createPostgresContactReadRepository(
            transaction,
          ).findByTenantAndId(input.tenantId, input.contactId);
          if (contact === null) {
            throw new Error("PostgreSQL did not return the consent contact");
          }
          return contact;
        },
      );
    },
  });
}
