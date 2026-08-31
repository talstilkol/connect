import assert from "node:assert/strict";
import test from "node:test";

import {
  ContactNotFoundError,
} from "../db/contactConsentRepository.ts";
import {
  deriveContactConsentEventKey,
} from "../server/contacts/contactConsentEventKey.ts";
import {
  createPostgresContactConsentRepository,
  postgresContactConsentSql,
} from "../server/platform/postgresContactConsentRepository.ts";
import {
  postgresContactReadSql,
} from "../server/platform/postgresContactReadRepository.ts";

const occurredAt = "2026-08-20T09:34:56.000Z";
const actorExternalUserId = "external-user-id";

async function consentInput(overrides = {}) {
  const identity = {
    tenantId: 7,
    contactId: 23,
    eventType: "granted",
    source: "whatsapp-opt-in",
    occurredAt,
    evidenceReference: "evidence-reference",
    actorExternalUserId,
    ...overrides,
  };
  return {
    ...identity,
    idempotencyKey: await deriveContactConsentEventKey(identity),
  };
}

function eventRow(input, overrides = {}) {
  return {
    eventId: "11",
    tenantId: String(input.tenantId),
    contactId: String(input.contactId),
    eventType: input.eventType,
    source: input.source,
    occurredAt: new Date(input.occurredAt),
    evidenceReference: input.evidenceReference,
    actorExternalUserId: input.actorExternalUserId,
    idempotencyKey: input.idempotencyKey,
    ...overrides,
  };
}

function contactRow(overrides = {}) {
  return {
    id: "23",
    tenantId: "7",
    phoneNumber: "+972501234567",
    firstName: "Tal",
    lastName: null,
    email: null,
    company: "Connect",
    mailingStatus: "subscribed",
    consentStatus: "granted",
    consentSource: "whatsapp-opt-in",
    consentRecordedAt: new Date(occurredAt),
    consentWithdrawnAt: null,
    consentEvidenceReference: "evidence-reference",
    version: "2",
    createdAt: new Date("2026-08-19T08:00:00.000Z"),
    updatedAt: new Date("2026-08-20T09:35:00.000Z"),
    ...overrides,
  };
}

function result(rows) {
  return { rows, rowCount: rows.length };
}

function fixture(transactionResults) {
  const pending = [...transactionResults];
  const calls = [];
  const repository = createPostgresContactConsentRepository({
    transactions: {
      async transaction(options, execute) {
        assert.deepEqual(options, { isolationLevel: "read-committed" });
        return execute({
          async query(sql, parameters) {
            calls.push({ sql, parameters });
            const next = pending.shift();
            if (next === undefined) throw new Error("Unexpected query");
            return next;
          },
        });
      },
    },
  });
  return {
    repository,
    calls,
    assertConsumed() {
      assert.equal(pending.length, 0);
    },
  };
}

test("records and projects the latest consent event in one locked transaction", async () => {
  const input = await consentInput();
  const database = fixture([
    result([{ contactId: "23" }]),
    result([eventRow(input)]),
    result([eventRow(input)]),
    result([{ contactId: "23" }]),
    result([contactRow()]),
  ]);
  const contact = await database.repository.recordEvent(input);

  assert.equal(contact.consentStatus, "granted");
  assert.equal(contact.version, 2);
  assert.deepEqual(database.calls.map(({ sql }) => sql), [
    postgresContactConsentSql.lockContact,
    postgresContactConsentSql.insertEvent,
    postgresContactConsentSql.findEvent,
    postgresContactConsentSql.applyLatestEvent,
    postgresContactReadSql.findByTenantAndId,
  ]);
  assert.match(
    postgresContactConsentSql.applyLatestEvent,
    /NOT EXISTS \([\s\S]*newer_event\.occurred_at > matching_event\.occurred_at/,
  );
  database.assertConsumed();
});

test("keeps an exact event retry idempotent without requiring a second projection", async () => {
  const input = await consentInput();
  const database = fixture([
    result([{ contactId: "23" }]),
    result([]),
    result([eventRow(input)]),
    result([]),
    result([contactRow()]),
  ]);
  const contact = await database.repository.recordEvent(input);

  assert.equal(contact.version, 2);
  assert.equal(database.calls[1].sql, postgresContactConsentSql.insertEvent);
  database.assertConsumed();
});

test("rejects a missing contact and a forged deterministic identity before mutation", async () => {
  const input = await consentInput();
  const missing = fixture([result([])]);
  await assert.rejects(
    missing.repository.recordEvent(input),
    (error) => error instanceof ContactNotFoundError,
  );

  const invalid = fixture([]);
  await assert.rejects(
    invalid.repository.recordEvent({
      ...input,
      idempotencyKey: `contact_consent_v1_${"0".repeat(64)}`,
    }),
    /idempotencyKey is invalid/,
  );
  assert.equal(invalid.calls.length, 0);
});

test("fails closed for conflicting evidence, cross-tenant rows, and dependencies", async () => {
  const input = await consentInput();
  const conflict = fixture([
    result([{ contactId: "23" }]),
    result([]),
    result([eventRow(input, { source: "different-source" })]),
  ]);
  await assert.rejects(
    conflict.repository.recordEvent(input),
    /idempotency key conflict/,
  );

  const crossTenant = fixture([
    result([{ contactId: "24" }]),
  ]);
  await assert.rejects(
    crossTenant.repository.recordEvent(input),
    /cross-tenant consent identity/,
  );

  assert.throws(
    () => createPostgresContactConsentRepository({}),
    /dependencies are invalid/,
  );
});
