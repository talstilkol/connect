import assert from "node:assert/strict";
import test from "node:test";

import {
  RAILWAY_API_CONTRACT_VERSION,
  VERCEL_OIDC_HEADER,
} from "../server/platform/railwayApiContract.ts";
import {
  createRailwayApiRuntime,
} from "../server/platform/railwayApiRuntime.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
} from "../server/platform/railwayApiMutationExecutor.ts";

const compactJwt = "header.payload.signature";
const idempotencyKey =
  `connect_idempotency_v1_${"b".repeat(64)}`;
const environment = {
  APP_PUBLIC_ORIGIN: "https://connect.example.com",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    "publishable-key-for-runtime-test",
  CLERK_SECRET_KEY: "secret-key-for-runtime-test",
  VERCEL_OIDC_TEAM_SLUG: "connect-team",
  VERCEL_OIDC_PROJECT_NAME: "connect-web",
  VERCEL_OIDC_ENVIRONMENT: "production",
  NODE_ENV: "production",
};

function membership(tenantId, role) {
  return {
    tenantId,
    tenantDisplayName: `workspace-${tenantId}`,
    tenantStatus: "active",
    externalUserId: "verified-user",
    role,
    version: 1,
  };
}

function fixture(selectedRole = "owner") {
  const calls = {
    memberships: 0,
    contacts: [],
    contactOrganizations: [],
    reports: [],
    mutationSubjects: [],
    mutationCommands: [],
    systemAdminMutationSubjects: [],
    systemAdminProfileInputs: [],
    systemAdminSubscriptionInputs: [],
    systemAdminProductionDecisionLists: 0,
    systemAdminProductionDecisionInputs: [],
    systemAdminTenantDirectoryQueries: [],
  };
  const handler = createRailwayApiRuntime({
    environment,
    identityDependencies: {
      vercelOidc: {
        createRemoteKeySet() {
          return async () => {};
        },
        async verifyJwt() {},
      },
      clerk: {
        create() {
          return {
            async authenticateRequest() {
              return {
                isAuthenticated: true,
                toAuth() {
                  return {
                    isAuthenticated: true,
                    tokenType: "session_token",
                    userId: "verified-user",
                  };
                },
              };
            },
          };
        },
      },
    },
    memberships: {
      async findActiveByExternalUserId() {
        calls.memberships += 1;
        return [
          membership(7, "owner"),
          membership(11, selectedRole),
        ];
      },
      async findActiveByTenantId() {
        throw new Error("unused membership method");
      },
    },
    selections: {
      async findByExternalUserId() {
        return { tenantId: 11, version: 2 };
      },
      async save() {
        throw new Error("unused selection method");
      },
    },
    contacts: {
      async list(session, beforeContactId) {
        calls.contacts.push({ session, beforeContactId });
        return {
          contacts: [],
          nextCursor: null,
        };
      },
    },
    contactOrganization: {
      async read(session, contactIds) {
        calls.contactOrganizations.push({ session, contactIds });
        return {
          scopeContactIds: contactIds,
          tags: [],
          lists: [],
          tagAssignments: [],
          listMemberships: [],
        };
      },
    },
    reports: {
      async read(session, input) {
        calls.reports.push({ session, input });
        return {
          period: input,
          snapshot: {
            window: {
              startAt: `${input.startDate}T00:00:00.000Z`,
              endAt: "2026-08-18T00:00:00.000Z",
            },
            generatedAt: "2026-08-17T12:00:00.000Z",
            campaigns: {
              total: 0,
              recipientCount: 0,
              draft: 0,
              scheduled: 0,
              running: 0,
              paused: 0,
              completed: 0,
              cancelled: 0,
              failed: 0,
            },
            messages: {
              total: 0,
              inbound: 0,
              outbound: 0,
              received: 0,
              sent: 0,
              delivered: 0,
              read: 0,
              failed: 0,
            },
            conversations: {
              active: 0,
              unreadCount: 0,
              new: 0,
              botActive: 0,
              waitingForAgent: 0,
              agentActive: 0,
              waitingForContact: 0,
              closed: 0,
            },
            bot: {
              total: 0,
              pending: 0,
              sending: 0,
              accepted: 0,
              rejected: 0,
              ambiguous: 0,
            },
            ai: {
              totalTurns: 0,
              replyPlanned: 0,
              handoff: 0,
            },
            aiUsage: [],
          },
        };
      },
    },
    mutationRateLimit: {
      async consume(subject) {
        calls.mutationSubjects.push(subject);
        return { outcome: "allowed" };
      },
    },
    mutations: {
      async saveContact(command) {
        calls.mutationCommands.push(command);
        return {
          outcome: "committed",
          tenantId: command.session.tenantId,
          contact: {
            id: 31,
            ...command.profile,
            mailingStatus: "subscribed",
            consentStatus: "unknown",
            consentSource: null,
            consentRecordedAt: null,
            consentWithdrawnAt: null,
            version: 1,
          },
        };
      },
    },
    systemAdmin: {
      allowedExternalUserIds: ["verified-user"],
      mutationRateLimit: {
        async consume(subject) {
          calls.systemAdminMutationSubjects.push(subject);
          return { outcome: "allowed" };
        },
      },
      businessProfiles: {
        async update(input) {
          calls.systemAdminProfileInputs.push(input);
          return {
            outcome: "updated",
            profile: {
              tenantId: input.tenantId,
              businessName: input.businessName,
              timezone: input.timezone,
              interfaceLanguage: input.interfaceLanguage,
              version: input.expectedVersion + 1,
              createdAt: "2026-08-01T09:00:00.000Z",
              updatedAt: input.occurredAt,
            },
          };
        },
      },
      subscriptions: {
        async create(input) {
          calls.systemAdminSubscriptionInputs.push({
            operation: "create",
            input,
          });
          return {
            outcome: "created",
            subscription: {
              tenantId: input.tenantId,
              status: input.status,
              startsAt: input.startsAt,
              endsAt: input.endsAt,
              cancelledAt: null,
              version: 1,
              createdAt: input.occurredAt,
              updatedAt: input.occurredAt,
            },
          };
        },
        async extend(input) {
          calls.systemAdminSubscriptionInputs.push({
            operation: "extend",
            input,
          });
          return {
            outcome: "updated",
            subscription: {
              tenantId: input.tenantId,
              status: "active",
              startsAt: "2026-08-01T00:00:00.000Z",
              endsAt: input.newEndsAt,
              cancelledAt: null,
              version: input.expectedVersion + 1,
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: input.occurredAt,
            },
          };
        },
        async changeStatus(input) {
          calls.systemAdminSubscriptionInputs.push({
            operation: "changeStatus",
            input,
          });
          return {
            outcome: "updated",
            subscription: {
              tenantId: input.tenantId,
              status: input.status,
              startsAt: "2026-08-01T00:00:00.000Z",
              endsAt: "2026-10-01T00:00:00.000Z",
              cancelledAt: null,
              version: input.expectedVersion + 1,
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: input.occurredAt,
            },
          };
        },
        async cancel(input) {
          calls.systemAdminSubscriptionInputs.push({
            operation: "cancel",
            input,
          });
          return {
            outcome: "updated",
            subscription: {
              tenantId: input.tenantId,
              status: "cancelled",
              startsAt: "2026-08-01T00:00:00.000Z",
              endsAt: "2026-10-01T00:00:00.000Z",
              cancelledAt: input.occurredAt,
              version: input.expectedVersion + 1,
              createdAt: "2026-08-01T00:00:00.000Z",
              updatedAt: input.occurredAt,
            },
          };
        },
      },
      productionDecisions: {
        async list() {
          calls.systemAdminProductionDecisionLists += 1;
          return [
            {
              checkId: "ai.provider",
              selection: "Provider choice approved",
              rationale:
                "The decision passed product and security review.",
              version: 1,
              lastEventKey:
                `production_decision_event_v1_${"a".repeat(64)}`,
              decidedByExternalUserId: "verified-user",
              decidedAt: "2026-08-20T09:00:00.000Z",
              updatedAt: "2026-08-20T09:00:00.000Z",
            },
          ];
        },
        async save(input) {
          calls.systemAdminProductionDecisionInputs.push(input);
          return {
            outcome: input.expectedVersion === 0 ? "created" : "updated",
            record: {
              checkId: input.checkId,
              selection: input.selection,
              rationale: input.rationale,
              version: input.expectedVersion + 1,
              lastEventKey:
                `production_decision_event_v1_${"b".repeat(64)}`,
              decidedByExternalUserId: input.actorExternalUserId,
              decidedAt: input.occurredAt,
              updatedAt: input.occurredAt,
            },
          };
        },
      },
      tenantDirectory: {
        async listPage(query) {
          calls.systemAdminTenantDirectoryQueries.push(query);
          return {
            tenants: [{
              tenantId: 19,
              displayName: "Connect Support",
              tenantStatus: "active",
              businessProfile: {
                businessName: "Connect Support",
                timezone: "Asia/Jerusalem",
                interfaceLanguage: "he",
                version: 2,
                createdAt: "2026-08-01T09:00:00.000Z",
                updatedAt: "2026-08-20T09:00:00.000Z",
              },
              subscription: {
                status: "active",
                startsAt: "2026-08-01T00:00:00.000Z",
                endsAt: "2026-10-01T00:00:00.000Z",
                cancelledAt: null,
                version: 2,
                createdAt: "2026-08-01T00:00:00.000Z",
                updatedAt: "2026-08-20T09:00:00.000Z",
              },
            }],
            nextCursor: null,
          };
        },
      },
    },
  });

  return { calls, handler };
}

function request(
  operation,
  payload,
  requestKind = "query",
  mutationIdempotencyKey = idempotencyKey,
) {
  return new Request("https://railway.example.com/v1/connect", {
    method: "POST",
    headers: {
      authorization: `Bearer ${compactJwt}`,
      "content-type": "application/json",
      [VERCEL_OIDC_HEADER]: compactJwt,
    },
    body: JSON.stringify({
      contractVersion: RAILWAY_API_CONTRACT_VERSION,
      operation,
      requestKind,
      idempotencyKey:
        requestKind === "mutation"
          ? mutationIdempotencyKey
          : null,
      payload,
    }),
  });
}

test("runs a system-admin profile mutation without resolving tenant membership", async () => {
  const testFixture = fixture("agent");
  const adminPayload = {
    targetTenantId: 19,
    expectedVersion: 2,
    businessName: "Connect Support",
    timezone: "Asia/Jerusalem",
    interfaceLanguage: "he",
  };
  const adminIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "system-admin.business-profile.update",
      adminPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      "system-admin.business-profile.update",
      adminPayload,
      "mutation",
      adminIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.outcome, "updated");
  assert.equal(body.data.profile.businessName, "Connect Support");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminMutationSubjects,
    [
      "verified-user:system-admin.business-profile.update",
    ],
  );
  assert.equal(testFixture.calls.systemAdminProfileInputs.length, 1);
  assert.equal(
    testFixture.calls.systemAdminProfileInputs[0].tenantId,
    19,
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user/,
  );
});

test("runs a system-admin subscription mutation without resolving tenant membership", async () => {
  const testFixture = fixture("agent");
  const operationId = "system-admin.subscription.cancel";
  const adminPayload = {
    targetTenantId: 19,
    expectedVersion: 2,
  };
  const adminIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      adminPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      operationId,
      adminPayload,
      "mutation",
      adminIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.outcome, "updated");
  assert.equal(body.data.subscription.status, "cancelled");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminMutationSubjects,
    [`verified-user:${operationId}`],
  );
  assert.equal(testFixture.calls.systemAdminSubscriptionInputs.length, 1);
  assert.equal(
    testFixture.calls.systemAdminSubscriptionInputs[0].input.tenantId,
    19,
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user/,
  );
});

test("lists system-admin production decisions without tenant membership or mutation quota", async () => {
  const testFixture = fixture("agent");
  const response = await testFixture.handler.handle(
    request(
      "system-admin.production-decisions.list",
      {},
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.records.length, 1);
  assert.equal(body.data.records[0].checkId, "ai.provider");
  assert.equal(testFixture.calls.memberships, 0);
  assert.equal(testFixture.calls.systemAdminProductionDecisionLists, 1);
  assert.deepEqual(testFixture.calls.systemAdminMutationSubjects, []);
  assert.doesNotMatch(
    JSON.stringify(body),
    /externalUserId|lastEventKey|verified-user/,
  );
});

test("lists the system-admin tenant directory without tenant membership or mutation quota", async () => {
  const testFixture = fixture("agent");
  const payload = {
    afterTenantId: null,
    search: "connect",
    tenantStatus: "active",
    subscription: "with-subscription",
  };
  const response = await testFixture.handler.handle(
    request(
      "system-admin.tenant-directory.list",
      payload,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.directory.tenants.length, 1);
  assert.equal(
    body.data.directory.tenants[0].targetTenantId,
    19,
  );
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminTenantDirectoryQueries,
    [payload],
  );
  assert.deepEqual(testFixture.calls.systemAdminMutationSubjects, []);
  assert.doesNotMatch(
    JSON.stringify(body),
    /"tenantId"|externalUserId|verified-user/,
  );
});

test("saves a system-admin production decision through the isolated mutation boundary", async () => {
  const testFixture = fixture("agent");
  const operationId = "system-admin.production-decisions.save";
  const adminPayload = {
    checkId: "ai.provider",
    expectedVersion: 0,
    selection: "Provider choice approved",
    rationale:
      "The decision passed product and security review.",
  };
  const adminIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      operationId,
      adminPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      operationId,
      adminPayload,
      "mutation",
      adminIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.outcome, "created");
  assert.equal(body.data.record.version, 1);
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(
    testFixture.calls.systemAdminMutationSubjects,
    [`verified-user:${operationId}`],
  );
  assert.equal(testFixture.calls.systemAdminProductionDecisionInputs.length, 1);
  assert.equal(
    testFixture.calls.systemAdminProductionDecisionInputs[0]
      .actorExternalUserId,
    "verified-user",
  );
  assert.doesNotMatch(
    JSON.stringify(body),
    /externalUserId|lastEventKey|verified-user/,
  );
});

test("runs a selected-tenant contact query through the complete boundary", async () => {
  const testFixture = fixture("agent");
  const response = await testFixture.handler.handle(
    request("contacts.list", { beforeContactId: null }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "ok",
    data: {
      contacts: [],
      nextCursor: null,
      organization: {
        scopeContactIds: [],
        tags: [],
        lists: [],
        tagAssignments: [],
        listMemberships: [],
      },
    },
  });
  assert.equal(testFixture.calls.memberships, 1);
  assert.equal(testFixture.calls.contacts.length, 1);
  assert.equal(testFixture.calls.contactOrganizations.length, 1);
  assert.equal(testFixture.calls.contacts[0].session.tenantId, 11);
  assert.equal(
    testFixture.calls.contacts[0].session.externalUserId,
    "verified-user",
  );
});

test("returns only bounded workspace context through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const response = await testFixture.handler.handle(
    request("workspace.context.read", {}),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    displayName: "workspace-11",
    status: "active",
    role: "manager",
  });
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|verified-user/,
  );
});

test("runs a tenant-scoped contact mutation through every security boundary", async () => {
  const testFixture = fixture("manager");
  const contactPayload = {
    phoneNumber: "+972501234567",
    firstName: "Tal",
    lastName: null,
    email: null,
    company: "Connect",
    submissionOccurredAt: "2026-08-20T20:00:00.000Z",
  };
  const contactIdempotencyKey =
    await deriveRailwayApiDeterministicIdempotencyKey(
      "contacts.save",
      contactPayload,
    );
  const response = await testFixture.handler.handle(
    request(
      "contacts.save",
      contactPayload,
      "mutation",
      contactIdempotencyKey,
    ),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.replayed, false);
  assert.equal(body.data.contact.id, 31);
  assert.equal(body.data.contact.phoneNumber, "+972501234567");
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|createdAt|updatedAt/,
  );
  assert.deepEqual(testFixture.calls.mutationSubjects, [
    "11:verified-user:contacts.save",
  ]);
  assert.equal(testFixture.calls.mutationCommands.length, 1);
  assert.equal(
    testFixture.calls.mutationCommands[0].idempotencyKey,
    contactIdempotencyKey,
  );
  assert.match(
    testFixture.calls.mutationCommands[0].requestDigest,
    /^railway_mutation_request_v1_[0-9a-f]{64}$/,
  );
});

test("returns permission denied before an agent reaches reports", async () => {
  const testFixture = fixture("agent");
  const response = await testFixture.handler.handle(
    request("reports.read", {
      startDate: "2026-08-01",
      endDate: "2026-08-17",
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    contractVersion: RAILWAY_API_CONTRACT_VERSION,
    outcome: "error",
    code: "PERMISSION_DENIED",
  });
  assert.deepEqual(testFixture.calls.reports, []);
});

test("returns a bounded PostgreSQL operational report through the complete boundary", async () => {
  const testFixture = fixture("manager");
  const input = {
    startDate: "2026-08-01",
    endDate: "2026-08-17",
  };
  const response = await testFixture.handler.handle(
    request("reports.read", input),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data.period, input);
  assert.equal(body.data.generatedAt, "2026-08-17T12:00:00.000Z");
  assert.equal(body.data.messages.total, 0);
  assert.equal(testFixture.calls.memberships, 1);
  assert.equal(testFixture.calls.reports.length, 1);
  assert.deepEqual(testFixture.calls.reports[0].input, input);
  assert.doesNotMatch(
    JSON.stringify(body),
    /tenantId|externalUserId|startAt|endAt|verified-user/,
  );
});

test("rejects invalid operation payload before tenant lookup", async () => {
  const testFixture = fixture();
  const response = await testFixture.handler.handle(
    request("contacts.list", {
      beforeContactId: null,
      tenantId: 11,
    }),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_REQUEST");
  assert.equal(testFixture.calls.memberships, 0);
  assert.deepEqual(testFixture.calls.contacts, []);
});
