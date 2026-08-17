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
const idempotencyKey =
  `connect_idempotency_v1_${"a".repeat(64)}`;
const contactProfile = {
  phoneNumber: "+972501234567",
  firstName: "Tal",
  lastName: null,
  email: null,
  company: "Connect",
};

function mutationRequest(payload = contactProfile) {
  return {
    contractVersion: "connect.railway-api.v1",
    operation: "contacts.save",
    requestKind: "mutation",
    idempotencyKey,
    payload,
  };
}

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
  rateLimitDecision = { outcome: "allowed" },
  rateLimitError = null,
  mutationOutcome = "committed",
  mutationError = null,
  mutationResult = undefined,
} = {}) {
  const calls = {
    tenantIdentities: [],
    contactInputs: [],
    reportInputs: [],
    rateLimitSubjects: [],
    mutationCommands: [],
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
    mutationRateLimit: {
      async consume(subject) {
        calls.rateLimitSubjects.push(subject);

        if (rateLimitError) {
          throw rateLimitError;
        }

        return rateLimitDecision;
      },
    },
    mutations: {
      async saveContact(command) {
        calls.mutationCommands.push(command);

        if (mutationError) {
          throw mutationError;
        }

        if (mutationResult !== undefined) {
          return mutationResult;
        }

        if (
          mutationOutcome === "conflict" ||
          mutationOutcome === "unavailable"
        ) {
          return {
            outcome: mutationOutcome,
            contact: null,
          };
        }

        return {
          outcome: mutationOutcome,
          contact: persistedContact({
            phoneNumber: command.profile.phoneNumber,
            firstName: command.profile.firstName,
            lastName: command.profile.lastName,
            email: command.profile.email,
            company: command.profile.company,
          }),
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
      mutationSafety: null,
    },
    {
      id: "contacts.list",
      requestKind: "query",
      permission: "contacts.read",
      mutationSafety: null,
    },
    {
      id: "contacts.save",
      requestKind: "mutation",
      permission: "contacts.write",
      mutationSafety: {
        rateLimit: "tenant-mutation",
        idempotency: "atomic-request-digest-replay",
        audit: "atomic-immutable-event",
        transaction: "required",
      },
    },
    {
      id: "reports.read",
      requestKind: "query",
      permission: "reports.read",
      mutationSafety: null,
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

test("saves a contact through rate limit and transactional mutation boundaries", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("manager"),
  });
  const result = await operation(
    registry,
    "contacts.save",
  ).execute(
    dispatchContext,
    contactProfile,
    mutationRequest(),
  );

  assert.deepEqual(calls.rateLimitSubjects, [
    "7:verified-user:contacts.save",
  ]);
  assert.equal(calls.mutationCommands.length, 1);
  assert.deepEqual(calls.mutationCommands[0].profile, contactProfile);
  assert.equal(
    calls.mutationCommands[0].idempotencyKey,
    idempotencyKey,
  );
  assert.match(
    calls.mutationCommands[0].requestDigest,
    /^railway_mutation_request_v1_[0-9a-f]{64}$/,
  );
  assert.equal(calls.mutationCommands[0].session.tenantId, 7);
  assert.deepEqual(result, {
    replayed: false,
    contact: {
      id: 23,
      phoneNumber: "+972501234567",
      firstName: "Tal",
      lastName: null,
      email: null,
      company: "Connect",
      mailingStatus: "subscribed",
      consentStatus: "granted",
      consentSource: "verified-source",
      consentRecordedAt: "2026-08-17T00:00:00.000Z",
      consentWithdrawnAt: null,
      version: 4,
    },
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|evidence|createdAt|updatedAt/,
  );
});

test("marks an identical completed contact mutation as replayed", async () => {
  const { registry } = fixture({
    mutationOutcome: "replayed",
  });
  const result = await operation(
    registry,
    "contacts.save",
  ).execute(
    dispatchContext,
    contactProfile,
    mutationRequest(),
  );

  assert.equal(result.replayed, true);
});

test("denies contact mutation before rate limit or persistence", async () => {
  const { calls, registry } = fixture({
    tenantSession: session("agent"),
  });

  await assert.rejects(
    operation(registry, "contacts.save").execute(
      dispatchContext,
      contactProfile,
      mutationRequest(),
    ),
    (error) => error.code === "AUTHORIZATION_DENIED",
  );
  assert.deepEqual(calls.rateLimitSubjects, []);
  assert.deepEqual(calls.mutationCommands, []);
});

test("fails closed when mutation rate limiting denies or is unavailable", async () => {
  const limited = fixture({
    rateLimitDecision: { outcome: "limited" },
  });
  const unavailable = fixture({
    rateLimitError: new Error("private limiter detail"),
  });
  const malformed = fixture({
    rateLimitDecision: { outcome: "unknown" },
  });

  await assert.rejects(
    operation(limited.registry, "contacts.save").execute(
      dispatchContext,
      contactProfile,
      mutationRequest(),
    ),
    (error) => error.code === "RATE_LIMITED",
  );
  await assert.rejects(
    operation(unavailable.registry, "contacts.save").execute(
      dispatchContext,
      contactProfile,
      mutationRequest(),
    ),
    (error) => error.code === "DEPENDENCY_UNAVAILABLE",
  );
  await assert.rejects(
    operation(malformed.registry, "contacts.save").execute(
      dispatchContext,
      contactProfile,
      mutationRequest(),
    ),
    (error) => error.code === "DEPENDENCY_UNAVAILABLE",
  );
  assert.deepEqual(limited.calls.mutationCommands, []);
  assert.deepEqual(unavailable.calls.mutationCommands, []);
  assert.deepEqual(malformed.calls.mutationCommands, []);
});

test("maps mutation idempotency conflict and storage outage to bounded codes", async () => {
  const conflict = fixture({ mutationOutcome: "conflict" });
  const unavailable = fixture({ mutationOutcome: "unavailable" });

  await assert.rejects(
    operation(conflict.registry, "contacts.save").execute(
      dispatchContext,
      contactProfile,
      mutationRequest(),
    ),
    (error) => error.code === "CONFLICT",
  );
  await assert.rejects(
    operation(unavailable.registry, "contacts.save").execute(
      dispatchContext,
      contactProfile,
      mutationRequest(),
    ),
    (error) => error.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("rejects thrown, malformed, and cross-tenant mutation results", async () => {
  const thrown = fixture({
    mutationError: new Error("private database error"),
  });
  const malformed = fixture({
    mutationResult: {
      outcome: "unexpected",
      contact: persistedContact(),
    },
  });
  const crossTenant = fixture({
    mutationResult: {
      outcome: "committed",
      contact: persistedContact({
        tenantId: 11,
        firstName: "Tal",
        company: "Connect",
      }),
    },
  });

  for (const testFixture of [thrown, malformed, crossTenant]) {
    await assert.rejects(
      operation(testFixture.registry, "contacts.save").execute(
        dispatchContext,
        contactProfile,
        mutationRequest(),
      ),
      (error) =>
        error.code === "DEPENDENCY_UNAVAILABLE" &&
        !error.message.includes("private"),
    );
  }
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
      "contacts.save",
      {
        phoneNumber: "+972501234567",
        firstName: null,
        lastName: null,
        email: 17,
        company: null,
      },
    ],
    [
      "contacts.save",
      {
        ...contactProfile,
        phoneNumber: "0501234567",
      },
    ],
    [
      "contacts.save",
      {
        ...contactProfile,
        tenantId: 7,
      },
    ],
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
        id === "contacts.save"
          ? mutationRequest(payload)
          : {},
      ),
      (error) => error.code === "INVALID_REQUEST",
    );
    assert.deepEqual(calls.tenantIdentities, []);
    assert.deepEqual(calls.contactInputs, []);
    assert.deepEqual(calls.reportInputs, []);
    assert.deepEqual(calls.rateLimitSubjects, []);
    assert.deepEqual(calls.mutationCommands, []);
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
