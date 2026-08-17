import assert from "node:assert/strict";
import test from "node:test";

import {
  ContactCursorInputError,
} from "../server/contacts/contactService.ts";
import {
  OperationalReportInputError,
} from "../server/reports/operationalReportService.ts";
import {
  TenantSessionError,
} from "../server/auth/tenantSession.ts";
import {
  createRailwayApiOperationRegistry,
  railwayApiOperationPolicies,
} from "../server/platform/railwayApiOperationRegistry.ts";

const dispatchContext = {
  serviceIdentity: {
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject:
      "owner:connect-team:project:connect-web:environment:production",
  },
  userIdentity: {
    externalUserId: "verified-user",
  },
};

function session(role = "owner") {
  return {
    externalUserId: "verified-user",
    tenantId: 7,
    displayName: "Verified workspace",
    status: "active",
    role,
  };
}

function persistedContact(overrides = {}) {
  return {
    id: 23,
    tenantId: 7,
    phoneNumber: "+972501234567",
    firstName: null,
    lastName: null,
    email: null,
    company: null,
    mailingStatus: "subscribed",
    consentStatus: "granted",
    consentSource: "verified-source",
    consentRecordedAt: "2026-08-17T00:00:00.000Z",
    consentWithdrawnAt: null,
    consentEvidenceReference: "private-evidence",
    version: 4,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

function fixture({
  tenantSession = session(),
  tenantError = null,
  contactError = null,
  reportError = null,
} = {}) {
  const calls = {
    tenantIdentities: [],
    contactInputs: [],
    reportInputs: [],
  };
  const registry = createRailwayApiOperationRegistry({
    tenantSessions: {
      async resolve(identity) {
        calls.tenantIdentities.push(identity);

        if (tenantError) {
          throw tenantError;
        }

        return tenantSession;
      },
    },
    contacts: {
      async list(receivedSession, beforeContactId) {
        calls.contactInputs.push({
          session: receivedSession,
          beforeContactId,
        });

        if (contactError) {
          throw contactError;
        }

        return {
          contacts: [persistedContact()],
          nextCursor: null,
        };
      },
    },
    reports: {
      async read(receivedSession, input) {
        calls.reportInputs.push({
          session: receivedSession,
          input,
        });

        if (reportError) {
          throw reportError;
        }

        return {
          period: input,
          snapshot: {
            campaigns: { total: 0 },
          },
        };
      },
    },
  });

  return { calls, registry };
}

function operation(registry, id) {
  const found = registry.operations.find(
    (candidate) => candidate.id === id,
  );

  assert.ok(found);
  return found;
}

test("publishes one immutable policy for every concrete operation", () => {
  assert.deepEqual(railwayApiOperationPolicies, [
    {
      id: "workspace.context.read",
      requestKind: "query",
      permission: null,
    },
    {
      id: "contacts.list",
      requestKind: "query",
      permission: "contacts.read",
    },
    {
      id: "reports.read",
      requestKind: "query",
      permission: "reports.read",
    },
  ]);
  assert.equal(Object.isFrozen(railwayApiOperationPolicies), true);
  assert.equal(
    railwayApiOperationPolicies.every(Object.isFrozen),
    true,
  );

  const { registry } = fixture();
  assert.deepEqual(
    registry.operations.map(({ id, requestKind }) => ({
      id,
      requestKind,
    })),
    railwayApiOperationPolicies.map(({ id, requestKind }) => ({
      id,
      requestKind,
    })),
  );
  assert.equal(Object.isFrozen(registry.operations), true);
});

test("returns bounded workspace context without internal identity", async () => {
  const { calls, registry } = fixture();
  const result = await operation(
    registry,
    "workspace.context.read",
  ).execute(dispatchContext, {}, {});

  assert.deepEqual(result, {
    displayName: "Verified workspace",
    status: "active",
    role: "owner",
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|verified-user|"7"/,
  );
  assert.deepEqual(calls.tenantIdentities, [
    dispatchContext.userIdentity,
  ]);
});

test("lists contacts through the resolved tenant and safe mapper", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("agent"),
  });
  const result = await operation(
    registry,
    "contacts.list",
  ).execute(
    dispatchContext,
    { beforeContactId: 51 },
    {},
  );

  assert.equal(calls.contactInputs.length, 1);
  assert.equal(calls.contactInputs[0].session.tenantId, 7);
  assert.equal(calls.contactInputs[0].beforeContactId, 51);
  assert.deepEqual(result, {
    contacts: [
      {
        id: 23,
        phoneNumber: "+972501234567",
        firstName: null,
        lastName: null,
        email: null,
        company: null,
        mailingStatus: "subscribed",
        consentStatus: "granted",
        consentSource: "verified-source",
        consentRecordedAt: "2026-08-17T00:00:00.000Z",
        consentWithdrawnAt: null,
        version: 4,
      },
    ],
    nextCursor: null,
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|evidence|createdAt|updatedAt/,
  );
});

test("enforces report permission before calling the report service", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("agent"),
  });

  await assert.rejects(
    operation(registry, "reports.read").execute(
      dispatchContext,
      {
        startDate: "2026-08-01",
        endDate: "2026-08-17",
      },
      {},
    ),
    (error) => error.code === "AUTHORIZATION_DENIED",
  );
  assert.deepEqual(calls.reportInputs, []);
});

test("validates operation payload before tenant or service access", async () => {
  const invalidCases = [
    ["workspace.context.read", { extra: true }],
    ["contacts.list", {}],
    ["contacts.list", { beforeContactId: 0 }],
    ["contacts.list", { beforeContactId: "51" }],
    [
      "reports.read",
      { startDate: "2026-08-01", endDate: "invalid" },
    ],
    [
      "reports.read",
      { startDate: "2026-02-30", endDate: "2026-03-01" },
    ],
    [
      "reports.read",
      { startDate: "2025-01-01", endDate: "2026-08-17" },
    ],
    [
      "reports.read",
      {
        startDate: "2026-08-01",
        endDate: "2026-08-17",
        tenantId: 7,
      },
    ],
  ];

  for (const [id, payload] of invalidCases) {
    const { calls, registry } = fixture();

    await assert.rejects(
      operation(registry, id).execute(
        dispatchContext,
        payload,
        {},
      ),
      (error) => error.code === "INVALID_REQUEST",
    );
    assert.deepEqual(calls.tenantIdentities, []);
    assert.deepEqual(calls.contactInputs, []);
    assert.deepEqual(calls.reportInputs, []);
  }
});

test("maps tenant and service validation failures to bounded codes", async () => {
  const denied = fixture({
    tenantError: new TenantSessionError(
      "TENANT_SELECTION_REQUIRED",
      "private tenant selection detail",
    ),
  });
  const badCursor = fixture({
    contactError: new ContactCursorInputError(),
  });
  const badPeriod = fixture({
    reportError: new OperationalReportInputError(),
  });

  await assert.rejects(
    operation(
      denied.registry,
      "workspace.context.read",
    ).execute(dispatchContext, {}, {}),
    (error) =>
      error.code === "AUTHORIZATION_DENIED" &&
      !error.message.includes("private"),
  );
  await assert.rejects(
    operation(badCursor.registry, "contacts.list").execute(
      dispatchContext,
      { beforeContactId: null },
      {},
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    operation(badPeriod.registry, "reports.read").execute(
      dispatchContext,
      {
        startDate: "2026-08-01",
        endDate: "2026-08-17",
      },
      {},
    ),
    (error) => error.code === "INVALID_REQUEST",
  );
});

test("rejects missing operation dependencies", () => {
  assert.throws(
    () =>
      createRailwayApiOperationRegistry({
        tenantSessions: {},
        contacts: {},
        reports: {},
      }),
    /operation dependencies are invalid/,
  );
});
