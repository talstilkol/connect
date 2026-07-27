import assert from "node:assert/strict";
import test from "node:test";

import {
  ContactConsentInputError,
  ContactCursorInputError,
  ContactInputError,
  createContactService,
} from "../server/contacts/contactService.ts";

function session(role = "owner") {
  return {
    externalUserId: "external-user-id",
    tenantId: 7,
    displayName: "tenant-name",
    status: "active",
    role,
  };
}

function fixture() {
  const state = {
    profiles: [],
    events: [],
    listResults: [],
  };
  const persistedContact = {
    id: 23,
    tenantId: 7,
    phoneNumber: "+972501234567",
    firstName: null,
    lastName: null,
    email: null,
    company: null,
    mailingStatus: "unsubscribed",
    consentStatus: "unknown",
    consentSource: null,
    consentRecordedAt: null,
    consentWithdrawnAt: null,
    consentEvidenceReference: null,
    version: 1,
    createdAt: "created-at",
    updatedAt: "updated-at",
  };
  state.listResults = [persistedContact];

  return {
    state,
    persistedContact,
    service: createContactService({
      contacts: {
        async listPageByTenant(tenantId, beforeContactId, limit) {
          state.listInput = { tenantId, beforeContactId, limit };
          return state.listResults;
        },
        async listByTenant() {
          throw new Error("cursor service must use listPageByTenant");
        },
        async saveProfile(input) {
          state.profiles.push(input);
          return persistedContact;
        },
        async findByTenantAndPhone() {
          return persistedContact;
        },
        async findByTenantAndId() {
          return persistedContact;
        },
      },
      consentEvents: {
        async recordEvent(input) {
          state.events.push(input);
          return persistedContact;
        },
      },
    }),
  };
}

test("derives contact tenant scope from the server session", async () => {
  const testFixture = fixture();

  await testFixture.service.saveProfile(session(), {
    phoneNumber: "  +972501234567 ",
    firstName: " ",
  });

  assert.deepEqual(testFixture.state.profiles, [
    {
      tenantId: 7,
      phoneNumber: "+972501234567",
      firstName: null,
      lastName: null,
      email: null,
      company: null,
    },
  ]);
});

test("lists contacts through the tenant session read permission", async () => {
  const testFixture = fixture();

  const page = await testFixture.service.list(session("agent"));

  assert.deepEqual(testFixture.state.listInput, {
    tenantId: 7,
    beforeContactId: null,
    limit: 51,
  });
  assert.deepEqual(page, {
    contacts: [testFixture.persistedContact],
    nextCursor: null,
  });
});

test("returns a stable next cursor and validates it before repository access", async () => {
  const testFixture = fixture();
  testFixture.state.listResults = Array.from(
    { length: 51 },
    (_, index) => ({
      ...testFixture.persistedContact,
      id: 100 - index,
    }),
  );

  const page = await testFixture.service.list(session("agent"), 101);

  assert.equal(page.contacts.length, 50);
  assert.equal(page.nextCursor, 51);
  assert.deepEqual(testFixture.state.listInput, {
    tenantId: 7,
    beforeContactId: 101,
    limit: 51,
  });

  const invalidFixture = fixture();
  await assert.rejects(
    invalidFixture.service.list(session("agent"), "101"),
    (error) => error instanceof ContactCursorInputError,
  );
  assert.equal(invalidFixture.state.listInput, undefined);
});

test("records a deterministic normalized unsubscribe event", async () => {
  const firstFixture = fixture();
  const secondFixture = fixture();
  const transition = {
    source: "  contact-request ",
    occurredAt: "2026-07-25T12:34:56+03:00",
    evidenceReference: " ",
  };

  await firstFixture.service.unsubscribe(session(), 23, transition);
  await secondFixture.service.unsubscribe(session(), 23, transition);

  const firstEvent = firstFixture.state.events[0];
  const secondEvent = secondFixture.state.events[0];

  assert.equal(firstEvent.eventType, "unsubscribed");
  assert.equal(firstEvent.source, "contact-request");
  assert.equal(firstEvent.occurredAt, "2026-07-25T09:34:56.000Z");
  assert.equal(firstEvent.evidenceReference, null);
  assert.match(
    firstEvent.idempotencyKey,
    /^contact_consent_v1_[0-9a-f]{64}$/,
  );
  assert.equal(firstEvent.idempotencyKey, secondEvent.idempotencyKey);
});

test("rejects contact and consent input before repository access", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.saveProfile(session(), {
      phoneNumber: "0501234567",
    }),
    (error) => error instanceof ContactInputError,
  );
  await assert.rejects(
    testFixture.service.grantConsent(session(), 23, {
      source: "",
      occurredAt: "not-a-date",
    }),
    (error) => error instanceof ContactConsentInputError,
  );

  assert.deepEqual(testFixture.state.profiles, []);
  assert.deepEqual(testFixture.state.events, []);
});

test("rejects contact writes from a read-only role", async () => {
  const testFixture = fixture();

  await assert.rejects(
    testFixture.service.saveProfile(session("viewer"), {
      phoneNumber: "+972501234567",
    }),
    (error) => error.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    testFixture.service.unsubscribe(session("viewer"), 23, {
      source: "contact-request",
      occurredAt: "2026-07-25T09:34:56.000Z",
    }),
    (error) => error.code === "PERMISSION_DENIED",
  );
});
