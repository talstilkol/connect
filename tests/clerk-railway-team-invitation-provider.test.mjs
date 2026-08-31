import assert from "node:assert/strict";
import test from "node:test";

import {
  createClerkRailwayTeamInvitationProvider,
  createClerkRailwayTeamInvitationProviderFactory,
} from "../server/platform/clerkRailwayTeamInvitationProvider.ts";
import {
  createProviderRequestTelemetryScope,
} from "../server/operations/providerRequestTelemetry.ts";
import {
  observeTeamInvitationDispatchProcessor,
} from "../server/operations/teamInvitationDeliveryTelemetry.ts";

const requestKey = `team_invitation_delivery_v1_${"a".repeat(64)}`;
const configuration = Object.freeze({
  appPublicOrigin: "https://connect.example.com",
  clerkPublishableKey: "publishable-key",
  clerkSecretKey: "secret-key",
  expectedServiceIdentity: Object.freeze({
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
  }),
  issuer: "https://oidc.vercel.com/connect-team",
  audience: "https://vercel.com/connect-team",
  subject: "owner:connect-team:project:connect-web:environment:production",
  jwksUrl: "https://oidc.vercel.com/connect-team/.well-known/jwks",
});
const command = Object.freeze({
  requestKey,
  tenantId: 7,
  inviterExternalUserId: "user_manager",
  email: "member@example.com",
  role: "manager",
  requestedAt: "2026-08-21T08:00:00.000Z",
  expiresAt: "2026-08-24T08:00:00.000Z",
});

function invitation(overrides = {}) {
  return {
    id: "orginv_existing",
    organizationId: "org_connect",
    emailAddress: "member@example.com",
    role: "org:member",
    status: "pending",
    privateMetadata: {
      connectContract: "team-invitation-v1",
      connectRequestKey: requestKey,
      connectTenantId: 7,
    },
    ...overrides,
  };
}

function fixture({
  pages = [{ data: [], totalCount: 0 }],
  created = invitation(),
  createError = null,
  listError = null,
  binding = { tenantId: 7, externalOrganizationId: "org_connect" },
  rateLimitOutcome = "allowed",
  telemetry,
} = {}) {
  const calls = [];
  const remainingPages = [...pages];
  const provider = createClerkRailwayTeamInvitationProvider(
    configuration,
    {
      async findByTenantId(tenantId) {
        calls.push(["binding", tenantId]);
        return binding;
      },
    },
    {
      async consume(subject) {
        calls.push(["rate-limit", subject]);
        return { outcome: rateLimitOutcome };
      },
    },
    {
      create(receivedConfiguration) {
        calls.push(["client", receivedConfiguration]);
        return {
          organizations: {
            async getOrganizationInvitationList(input) {
              calls.push(["list", input]);
              if (listError) throw listError;
              const page = remainingPages.shift();
              if (!page) throw new Error("unexpected list call");
              return page;
            },
            async createOrganizationInvitation(input) {
              calls.push(["create-invitation", input]);
              if (createError) throw createError;
              return created;
            },
          },
        };
      },
    },
    telemetry,
  );
  return { calls, provider };
}

test("creates one 72-hour Clerk Organization invitation with private reconciliation metadata", async () => {
  const testFixture = fixture();

  assert.equal(testFixture.provider.isConfigured(), true);
  assert.deepEqual(await testFixture.provider.invite(command), {
    status: "submitted",
  });
  assert.deepEqual(testFixture.calls, [
    ["client", {
      publishableKey: "publishable-key",
      secretKey: "secret-key",
    }],
    ["binding", 7],
    ["list", {
      organizationId: "org_connect",
      status: ["pending", "accepted", "revoked", "expired"],
      limit: 100,
      offset: 0,
    }],
    ["rate-limit", "clerk-organization-invitation:create"],
    ["binding", 7],
    ["create-invitation", {
      organizationId: "org_connect",
      emailAddress: "member@example.com",
      role: "org:member",
      expiresInDays: 3,
      inviterUserId: "user_manager",
      privateMetadata: {
        connectContract: "team-invitation-v1",
        connectRequestKey: requestKey,
        connectTenantId: 7,
      },
      redirectUrl: "https://connect.example.com",
    }],
  ]);
});

test("links Clerk lookup and creation requests to one invitation parent", async () => {
  const events = [];
  const timestamps = [
    "2026-08-21T10:00:00.000Z",
    "2026-08-21T10:00:00.010Z",
    "2026-08-21T10:00:00.020Z",
    "2026-08-21T10:00:00.030Z",
    "2026-08-21T10:00:00.040Z",
    "2026-08-21T10:00:00.050Z",
  ].map((value) => new Date(value));
  const telemetryClock = {
    now() {
      const value = timestamps.shift();
      if (value === undefined) throw new Error("test clock exhausted");
      return value;
    },
  };
  const scope = createProviderRequestTelemetryScope();
  const testFixture = fixture({
    telemetry: { scope, clock: telemetryClock },
  });
  const observed = observeTeamInvitationDispatchProcessor(
    {
      async process() {
        const result = await testFixture.provider.invite(command);
        assert.equal(result.status, "submitted");
        return { outcome: "submitted" };
      },
    },
    {
      async record(event) {
        events.push(event);
        return { outcome: "recorded" };
      },
    },
    telemetryClock,
    scope,
  );

  assert.deepEqual(await observed.process(7, requestKey), {
    outcome: "submitted",
  });
  assert.equal(events.length, 1);
  assert.deepEqual(
    events[0].providerRequests.map((request) => [
      request.provider,
      request.operation,
      request.outcome,
      request.durationMilliseconds,
    ]),
    [
      ["clerk", "organization-invitation.list", "completed", 10],
      ["clerk", "organization-invitation.create", "completed", 10],
    ],
  );
  assert.doesNotMatch(
    JSON.stringify(events),
    /tenant|email|organizationId|requestKey|token|payload|url/i,
  );
});

test("recovers an existing invitation by deterministic metadata before creating", async () => {
  const testFixture = fixture({
    pages: [{ data: [invitation()], totalCount: 1 }],
  });

  assert.deepEqual(await testFixture.provider.lookup({ requestKey, tenantId: 7 }), {
    status: "submitted",
  });
  assert.equal(
    testFixture.calls.some(([kind]) => kind === "create-invitation"),
    false,
  );
  assert.equal(
    testFixture.calls.some(([kind]) => kind === "rate-limit"),
    false,
  );
});

test("treats a recovered invitation as already pending without consuming creation quota", async () => {
  const testFixture = fixture({
    pages: [{ data: [invitation({ status: "accepted" })], totalCount: 1 }],
  });

  assert.deepEqual(await testFixture.provider.invite(command), {
    status: "already-pending",
  });
  assert.equal(
    testFixture.calls.some(([kind]) => kind === "rate-limit"),
    false,
  );
});

test("fails closed for a missing binding, invalid 72-hour contract, or exhausted creation quota", async () => {
  const missingBinding = fixture({ binding: null });
  assert.deepEqual(await missingBinding.provider.invite(command), {
    status: "unavailable",
  });
  assert.equal(
    missingBinding.calls.some(([kind]) => kind === "list"),
    false,
  );

  const invalidExpiry = fixture();
  assert.deepEqual(
    await invalidExpiry.provider.invite({
      ...command,
      expiresAt: "2026-08-24T07:59:59.999Z",
    }),
    { status: "unavailable" },
  );
  assert.equal(
    invalidExpiry.calls.some(([kind]) => kind === "binding"),
    false,
  );

  const limited = fixture({ rateLimitOutcome: "limited" });
  assert.deepEqual(await limited.provider.invite(command), {
    status: "unavailable",
  });
  assert.equal(
    limited.calls.some(([kind]) => kind === "create-invitation"),
    false,
  );
});

test("never reports not-found when reconciliation pagination is incomplete", async () => {
  const unrelated = Array.from({ length: 100 }, (_, index) =>
    invitation({
      id: `orginv_${index}`,
      emailAddress: `member-${index}@example.com`,
      privateMetadata: {},
    }),
  );
  const testFixture = fixture({
    pages: Array.from({ length: 5 }, () => ({
      data: unrelated,
      totalCount: 501,
    })),
  });

  assert.deepEqual(await testFixture.provider.lookup({ requestKey, tenantId: 7 }), {
    status: "unavailable",
  });
  assert.equal(
    testFixture.calls.filter(([kind]) => kind === "list").length,
    5,
  );
});

test("maps tampered metadata and malformed list evidence to unavailable", async () => {
  const tampered = fixture({
    pages: [{
      data: [invitation({
        privateMetadata: {
          connectContract: "team-invitation-v1",
          connectRequestKey: requestKey,
          connectTenantId: 8,
        },
      })],
      totalCount: 1,
    }],
  });
  assert.deepEqual(await tampered.provider.lookup({ requestKey, tenantId: 7 }), {
    status: "unavailable",
  });

  const malformed = fixture({ pages: [{ data: [], totalCount: "0" }] });
  assert.deepEqual(await malformed.provider.lookup({ requestKey, tenantId: 7 }), {
    status: "unavailable",
  });
});

test("leaves an ambiguous create outcome to the dispatch processor", async () => {
  const testFixture = fixture({ createError: new Error("private Clerk failure") });
  await assert.rejects(testFixture.provider.invite(command));
});

test("returns only a bounded Clerk Retry-After deferral and never invents a fallback", async () => {
  const validRateLimit = {
    clerkError: true,
    status: 429,
    retryAfter: 3_600,
  };
  assert.deepEqual(
    await fixture({
      createError: validRateLimit,
    }).provider.invite(command),
    {
      status: "deferred",
      retryAfterSeconds: 3_600,
    },
  );

  for (const retryAfter of [
    undefined,
    0,
    86_401,
    "3600",
  ]) {
    assert.deepEqual(
      await fixture({
        createError: {
          clerkError: true,
          status: 429,
          retryAfter,
        },
      }).provider.invite(command),
      { status: "unavailable" },
    );
  }

  assert.deepEqual(
    await fixture({
      listError: validRateLimit,
    }).provider.invite(command),
    {
      status: "deferred",
      retryAfterSeconds: 3_600,
    },
  );
  assert.deepEqual(
    await fixture({
      listError: validRateLimit,
    }).provider.lookup({
      requestKey,
      tenantId: 7,
    }),
    { status: "unavailable" },
  );
});

test("reconciles a lost create response by the deterministic private metadata", async () => {
  const testFixture = fixture({
    pages: [
      { data: [], totalCount: 0 },
      { data: [invitation()], totalCount: 1 },
    ],
    createError: new Error("response lost after provider acceptance"),
  });

  await assert.rejects(testFixture.provider.invite(command));
  assert.deepEqual(
    await testFixture.provider.lookup({ requestKey, tenantId: 7 }),
    { status: "submitted" },
  );
  assert.equal(
    testFixture.calls.filter(([kind]) => kind === "create-invitation").length,
    1,
  );
});

test("rejects creation evidence that does not match the requested identity", async () => {
  const testFixture = fixture({
    created: invitation({ emailAddress: "different@example.com" }),
  });
  await assert.rejects(
    testFixture.provider.invite(command),
    /creation evidence is invalid/,
  );
});

test("builds the provider from the shared PostgreSQL foundation and consumes the dedicated policy", async () => {
  const receivedPolicies = [];
  const receivedKeys = [];
  const createProvider = createClerkRailwayTeamInvitationProviderFactory(
    configuration,
    {
      policyId: "clerk-organization-invitation",
      policyVersion: 1,
      capacity: 125,
      refillPeriodSeconds: 3_600,
    },
    {
      create() {
        return {
          organizations: {
            async getOrganizationInvitationList() {
              return { data: [], totalCount: 0 };
            },
            async createOrganizationInvitation() {
              return invitation();
            },
          },
        };
      },
    },
  );
  const provider = createProvider({
    identityOrganizations: {
      async findByTenantId(tenantId) {
        return { tenantId, externalOrganizationId: "org_connect" };
      },
    },
    createMutationRateLimitBinding(policy) {
      receivedPolicies.push(policy);
      return {
        async limit({ key }) {
          receivedKeys.push(key);
          return { success: true };
        },
      };
    },
    providerRequestTelemetry: createProviderRequestTelemetryScope(),
    telemetryClock: {
      now() {
        return new Date("2026-08-21T10:00:00.000Z");
      },
    },
  });

  assert.deepEqual(await provider.invite(command), { status: "submitted" });
  assert.deepEqual(receivedPolicies, [{
    policyId: "clerk-organization-invitation",
    policyVersion: 1,
    capacity: 125,
    refillPeriodSeconds: 3_600,
  }]);
  assert.equal(receivedKeys.length, 1);
  assert.match(receivedKeys[0], /^rate_limit_v1_[a-f0-9]{64}$/);
});

test("rejects a Clerk invitation factory policy that could exceed the official endpoint budget", () => {
  for (const policy of [
    {
      policyId: "tenant-mutation",
      policyVersion: 1,
      capacity: 125,
      refillPeriodSeconds: 3_600,
    },
    {
      policyId: "clerk-organization-invitation",
      policyVersion: 1,
      capacity: 126,
      refillPeriodSeconds: 3_600,
    },
    {
      policyId: "clerk-organization-invitation",
      policyVersion: 1,
      capacity: 125,
      refillPeriodSeconds: 3_599,
    },
  ]) {
    assert.throws(
      () => createClerkRailwayTeamInvitationProviderFactory(
        configuration,
        policy,
      ),
      /rate-limit policy is invalid/,
    );
  }
});
