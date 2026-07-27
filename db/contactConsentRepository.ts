import type {
  ContactConsentEventType,
} from "../shared/validation/contactConsent";
import {
  createContactRepository,
  type PersistedContact,
} from "./contactRepository.ts";
import type { D1DatabaseBinding } from "./d1";

const INSERT_EVENT_SQL = `
  INSERT INTO contact_consent_events (
    tenant_id,
    contact_id,
    event_type,
    source,
    occurred_at,
    evidence_reference,
    actor_external_user_id,
    idempotency_key
  )
  SELECT ?1, contacts.id, ?3, ?4, ?5, ?6, ?7, ?8
  FROM contacts
  WHERE contacts.tenant_id = ?1
    AND contacts.id = ?2
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
`;

const APPLY_LATEST_EVENT_SQL = `
  UPDATE contacts
  SET
    mailing_status = CASE
      WHEN ?3 = 'granted' THEN 'subscribed'
      ELSE 'unsubscribed'
    END,
    consent_status = CASE
      WHEN ?3 = 'granted' THEN 'granted'
      ELSE 'withdrawn'
    END,
    consent_source = ?4,
    consent_recorded_at = CASE
      WHEN ?3 = 'granted' THEN ?5
      ELSE coalesce(contacts.consent_recorded_at, ?5)
    END,
    consent_withdrawn_at = CASE
      WHEN ?3 = 'granted' THEN NULL
      ELSE ?5
    END,
    consent_evidence_reference = ?6,
    version = contacts.version + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE contacts.tenant_id = ?1
    AND contacts.id = ?2
    AND EXISTS (
      SELECT 1
      FROM contact_consent_events AS matching_event
      WHERE matching_event.tenant_id = ?1
        AND matching_event.contact_id = ?2
        AND matching_event.event_type = ?3
        AND matching_event.source = ?4
        AND matching_event.occurred_at = ?5
        AND matching_event.evidence_reference IS ?6
        AND matching_event.actor_external_user_id IS ?7
        AND matching_event.idempotency_key = ?8
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
      contacts.mailing_status IS NOT CASE
        WHEN ?3 = 'granted' THEN 'subscribed'
        ELSE 'unsubscribed'
      END
      OR contacts.consent_status IS NOT CASE
        WHEN ?3 = 'granted' THEN 'granted'
        ELSE 'withdrawn'
      END
      OR contacts.consent_source IS NOT ?4
      OR contacts.consent_withdrawn_at IS NOT CASE
        WHEN ?3 = 'granted' THEN NULL
        ELSE ?5
      END
      OR contacts.consent_evidence_reference IS NOT ?6
    )
`;

const SELECT_EVENT_BY_KEY_SQL = `
  SELECT
    tenant_id AS tenantId,
    contact_id AS contactId,
    event_type AS eventType,
    source,
    occurred_at AS occurredAt,
    evidence_reference AS evidenceReference,
    actor_external_user_id AS actorExternalUserId,
    idempotency_key AS idempotencyKey
  FROM contact_consent_events
  WHERE tenant_id = ?1
    AND idempotency_key = ?2
  LIMIT 1
`;

interface ConsentEventRow {
  tenantId: number;
  contactId: number;
  eventType: string;
  source: string;
  occurredAt: string;
  evidenceReference: string | null;
  actorExternalUserId: string | null;
  idempotencyKey: string;
}

export interface RecordContactConsentEventInput {
  tenantId: number;
  contactId: number;
  eventType: ContactConsentEventType;
  source: string;
  occurredAt: string;
  evidenceReference: string | null;
  actorExternalUserId: string;
  idempotencyKey: string;
}

export interface ContactConsentRepository {
  recordEvent(
    input: RecordContactConsentEventInput,
  ): Promise<PersistedContact>;
}

export class ContactNotFoundError extends Error {
  constructor() {
    super("Contact does not exist in the tenant");
    this.name = "ContactNotFoundError";
  }
}

function eventMatchesInput(
  event: ConsentEventRow,
  input: RecordContactConsentEventInput,
): boolean {
  return (
    event.tenantId === input.tenantId &&
    event.contactId === input.contactId &&
    event.eventType === input.eventType &&
    event.source === input.source &&
    event.occurredAt === input.occurredAt &&
    event.evidenceReference === input.evidenceReference &&
    event.actorExternalUserId === input.actorExternalUserId &&
    event.idempotencyKey === input.idempotencyKey
  );
}

export function createContactConsentRepository(
  database: D1DatabaseBinding,
): ContactConsentRepository {
  const contacts = createContactRepository(database);

  return {
    async recordEvent(input) {
      const statements = [
        database
          .prepare(INSERT_EVENT_SQL)
          .bind(
            input.tenantId,
            input.contactId,
            input.eventType,
            input.source,
            input.occurredAt,
            input.evidenceReference,
            input.actorExternalUserId,
            input.idempotencyKey,
          ),
        database
          .prepare(APPLY_LATEST_EVENT_SQL)
          .bind(
            input.tenantId,
            input.contactId,
            input.eventType,
            input.source,
            input.occurredAt,
            input.evidenceReference,
            input.actorExternalUserId,
            input.idempotencyKey,
          ),
      ];
      const results = await database.batch(statements);
      const failedResult = results.find((result) => !result.success);

      if (results.length !== 2 || failedResult) {
        throw new Error(
          failedResult?.error ?? "D1 consent event write failed",
        );
      }

      const event = await database
        .prepare(SELECT_EVENT_BY_KEY_SQL)
        .bind(input.tenantId, input.idempotencyKey)
        .first<ConsentEventRow>();

      if (!event) {
        throw new ContactNotFoundError();
      }

      if (!eventMatchesInput(event, input)) {
        throw new Error("Consent event idempotency key conflict");
      }

      const contact = await contacts.findByTenantAndId(
        input.tenantId,
        input.contactId,
      );

      if (!contact) {
        throw new Error("D1 did not return the consent contact");
      }

      return contact;
    },
  };
}
