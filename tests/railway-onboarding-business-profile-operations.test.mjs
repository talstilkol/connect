import assert from "node:assert/strict";
import test from "node:test";

import { TenantSessionError } from
  "../server/auth/tenantSession.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
  deriveRailwayApiMutationRequestDigest,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayOnboardingBusinessProfileOperations,
} from "../server/platform/railwayOnboardingBusinessProfileOperations.ts";

const identity = Object.freeze({
  externalUserId: "verified-user",
  externalOrganizationId: "org_verified",
});
const context = Object.freeze({
  userIdentity: identity,
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject:
      "owner:connect-team:project:connect-web:environment:production",
  }),
});
const payload = Object.freeze({
  businessName: "Connect",
  timezone: "Asia/Jerusalem",
  interfaceLanguage: "he",
});

function session(role = "owner") {
  return Object.freeze({
    tenantId: 7,
    externalUserId: identity.externalUserId,
    displayName: "Connect",
    status: "active",
    role,
  });
}

function fixture(options = {}) {
  const calls = {
    sessions: 0,
    profileTenantIds: [],
    rateLimitSubjects: [],
    mutationCommands: [],
  };
  const dependencies = {
    tenantSessions: {
      async resolve() {
        calls.sessions += 1;
        if (options.noMembership) {
          throw new TenantSessionError(
            "TENANT_MEMBERSHIP_REQUIRED",
            "missing",
          );
        }
        return options.session ?? session();
      },
      async resolveOptional() {
        calls.sessions += 1;
        if (options.sessionError) throw options.sessionError;
        return options.noMembership ? null : options.session ?? session();
      },
    },
    businessProfiles: {
      async findByTenantId(tenantId) {
        calls.profileTenantIds.push(tenantId);
        return options.storedProfile ?? {
          tenantId,
          businessName: "Connect",
          timezone: "Asia/Jerusalem",
          interfaceLanguage: "he",
          version: 2,
          createdAt: "2026-08-21T08:00:00.000Z",
          updatedAt: "2026-08-21T09:00:00.000Z",
        };
      },
    },
    mutationRateLimit: {
      async consume(subject) {
        calls.rateLimitSubjects.push(subject);
        if (options.rateLimitError) throw options.rateLimitError;
        return options.rateLimitOutcome ?? { outcome: "allowed" };
      },
    },
    mutations: {
      async execute(command) {
        calls.mutationCommands.push(command);
        return options.mutationResult ?? {
          outcome: "committed",
          tenantId: command.session?.tenantId ?? 19,
          state: {
            createdTenant: command.session === null,
            profile: { ...command.payload, version: 1 },
          },
        };
      },
    },
  };
  const operations = createRailwayOnboardingBusinessProfileOperations(
    dependencies,
  );
  return {
    calls,
    read: operations.find((operation) =>
      operation.id === "onboarding.business-profile.read"
    ),
    save: operations.find((operation) =>
      operation.id === "onboarding.business-profile.save"
    ),
  };
}

function readRequest() {
  return Object.freeze({
    contractVersion: "connect.railway-api.v1",
    operation: "onboarding.business-profile.read",
    requestKind: "query",
    idempotencyKey: null,
    payload: Object.freeze({}),
  });
}

async function saveRequest(value = payload) {
  return Object.freeze({
    contractVersion: "connect.railway-api.v1",
    operation: "onboarding.business-profile.save",
    requestKind: "mutation",
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(
      "onboarding.business-profile.save",
      value,
    ),
    payload: value,
  });
}

test("reads a bounded profile and returns null before tenant provisioning", async () => {
  const existing = fixture();
  assert.deepEqual(
    await existing.read.execute(context, {}, readRequest()),
    {
      profile: {
        businessName: "Connect",
        timezone: "Asia/Jerusalem",
        interfaceLanguage: "he",
        version: 2,
      },
    },
  );
  assert.deepEqual(existing.calls.profileTenantIds, [7]);

  const initial = fixture({ noMembership: true });
  assert.deepEqual(
    await initial.read.execute(context, {}, readRequest()),
    { profile: null },
  );
  assert.equal(initial.calls.profileTenantIds.length, 0);
});

test("saves an initial profile with identity-scoped quota and null session", async () => {
  const testFixture = fixture({ noMembership: true });
  const request = await saveRequest();
  const result = await testFixture.save.execute(context, payload, request);

  assert.deepEqual(result, {
    replayed: false,
    createdTenant: true,
    profile: { ...payload, version: 1 },
  });
  assert.deepEqual(testFixture.calls.rateLimitSubjects, [
    "verified-user:onboarding.business-profile.save",
  ]);
  assert.equal(testFixture.calls.mutationCommands.length, 1);
  assert.equal(testFixture.calls.mutationCommands[0].session, null);
  assert.equal(
    testFixture.calls.mutationCommands[0].requestDigest,
    await deriveRailwayApiMutationRequestDigest(
      "onboarding.business-profile.save",
      payload,
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /tenantId|externalUserId|requestDigest|idempotencyKey/,
  );
});

test("blocks a non-owner and rate-limits before resolving tenant state", async () => {
  const unauthorized = fixture({ session: session("manager") });
  await assert.rejects(
    unauthorized.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "PERMISSION_DENIED",
  );
  assert.equal(unauthorized.calls.rateLimitSubjects.length, 1);
  assert.equal(unauthorized.calls.mutationCommands.length, 0);

  const limited = fixture({ rateLimitOutcome: { outcome: "limited" } });
  await assert.rejects(
    limited.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "RATE_LIMITED",
  );
  assert.equal(limited.calls.sessions, 0);
  assert.equal(limited.calls.mutationCommands.length, 0);
});

test("fails closed when the rate-limit dependency fails or returns an unknown outcome", async () => {
  const unavailable = fixture({
    rateLimitError: new Error("private rate-limit backend failure"),
  });
  await assert.rejects(
    unavailable.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
  assert.equal(unavailable.calls.sessions, 0);
  assert.equal(unavailable.calls.mutationCommands.length, 0);

  const malformed = fixture({
    rateLimitOutcome: {
      get outcome() {
        throw new Error("private rate-limit result failure");
      },
    },
  });
  await assert.rejects(
    malformed.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE" &&
      !String(error.message).includes("private"),
  );
  assert.equal(malformed.calls.sessions, 0);
  assert.equal(malformed.calls.mutationCommands.length, 0);

  const unknown = fixture({
    rateLimitOutcome: { outcome: "unexpected" },
  });
  await assert.rejects(
    unknown.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
  assert.equal(unknown.calls.sessions, 0);
  assert.equal(unknown.calls.mutationCommands.length, 0);
});

test("does not provision when an existing membership is ineligible", async () => {
  const blocked = fixture({
    sessionError: new TenantSessionError(
      "TENANT_MEMBERSHIP_REQUIRED",
      "existing membership is not eligible",
    ),
  });

  await assert.rejects(
    blocked.read.execute(context, {}, readRequest()),
    (error) => error?.code === "PERMISSION_DENIED",
  );
  await assert.rejects(
    blocked.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "PERMISSION_DENIED",
  );
  assert.equal(blocked.calls.mutationCommands.length, 0);
});

test("rejects extended payloads and mismatched deterministic keys", async () => {
  const testFixture = fixture();
  const extended = { ...payload, tenantReference: "forged" };
  await assert.rejects(
    testFixture.save.execute(
      context,
      extended,
      await saveRequest(extended),
    ),
    (error) => error?.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    testFixture.save.execute(context, payload, {
      ...await saveRequest(),
      idempotencyKey: `connect_idempotency_v1_${"f".repeat(64)}`,
    }),
    (error) => error?.code === "INVALID_REQUEST",
  );
  assert.equal(testFixture.calls.rateLimitSubjects.length, 0);
});

test("maps mutation conflicts and invalid bounded states", async () => {
  const conflict = fixture({
    mutationResult: { outcome: "conflict", tenantId: null, state: null },
  });
  await assert.rejects(
    conflict.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "CONFLICT",
  );

  const malformed = fixture({
    mutationResult: {
      outcome: "committed",
      tenantId: 7,
      state: {
        createdTenant: false,
        profile: { ...payload, version: 0 },
      },
    },
  });
  await assert.rejects(
    malformed.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("rejects unknown mutation outcomes and cross-tenant results", async () => {
  const unknown = fixture({
    mutationResult: {
      outcome: "unexpected",
      tenantId: 7,
      state: {
        createdTenant: false,
        profile: { ...payload, version: 1 },
      },
    },
  });
  await assert.rejects(
    unknown.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );

  const crossTenant = fixture({
    mutationResult: {
      outcome: "committed",
      tenantId: 8,
      state: {
        createdTenant: false,
        profile: { ...payload, version: 1 },
      },
    },
  });
  await assert.rejects(
    crossTenant.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("snapshots mutation results without invoking accessors", async () => {
  let outcomeReads = 0;
  const changingOutcome = {};
  Object.defineProperties(changingOutcome, {
    outcome: {
      enumerable: true,
      get() {
        outcomeReads += 1;
        return outcomeReads < 3 ? "unexpected" : "replayed";
      },
    },
    tenantId: { enumerable: true, value: 7 },
    state: {
      enumerable: true,
      value: {
        createdTenant: true,
        profile: { ...payload, version: 1 },
      },
    },
  });
  const accessor = fixture({ mutationResult: changingOutcome });
  await assert.rejects(
    accessor.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
  assert.equal(outcomeReads, 0);

  const inherited = fixture({
    mutationResult: Object.create({
      outcome: "committed",
      tenantId: 7,
      state: {
        createdTenant: false,
        profile: { ...payload, version: 1 },
      },
    }),
  });
  await assert.rejects(
    inherited.save.execute(context, payload, await saveRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("rejects expanded, hidden, symbol, and trapped mutation results", async () => {
  const validResult = {
    outcome: "committed",
    tenantId: 7,
    state: {
      createdTenant: false,
      profile: { ...payload, version: 1 },
    },
  };
  const candidates = [
    { ...validResult, extra: "forged" },
    Object.defineProperty({ ...validResult }, "hidden", {
      value: "forged",
    }),
    Object.assign({ ...validResult }, { [Symbol("forged")]: true }),
    new Proxy(validResult, {
      ownKeys() {
        throw new Error("private proxy trap");
      },
    }),
  ];
  const revoked = Proxy.revocable(validResult, {});
  revoked.revoke();
  candidates.push(revoked.proxy);

  for (const mutationResult of candidates) {
    const testFixture = fixture({ mutationResult });
    await assert.rejects(
      testFixture.save.execute(context, payload, await saveRequest()),
      (error) => error?.code === "DEPENDENCY_UNAVAILABLE" &&
        !String(error.message).includes("private"),
    );
  }
});

test("requires committed createdTenant state to match tenant provisioning", async () => {
  const existingSessionMismatch = fixture({
    mutationResult: {
      outcome: "committed",
      tenantId: 7,
      state: {
        createdTenant: true,
        profile: { ...payload, version: 1 },
      },
    },
  });
  await assert.rejects(
    existingSessionMismatch.save.execute(
      context,
      payload,
      await saveRequest(),
    ),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );

  const missingSessionMismatch = fixture({
    noMembership: true,
    mutationResult: {
      outcome: "committed",
      tenantId: 19,
      state: {
        createdTenant: false,
        profile: { ...payload, version: 1 },
      },
    },
  });
  await assert.rejects(
    missingSessionMismatch.save.execute(
      context,
      payload,
      await saveRequest(),
    ),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
});

test("accepts a historical tenant-creation replay after the session appears", async () => {
  const replay = fixture({
    mutationResult: {
      outcome: "replayed",
      tenantId: 7,
      state: {
        createdTenant: true,
        profile: { ...payload, version: 1 },
      },
    },
  });

  assert.deepEqual(
    await replay.save.execute(context, payload, await saveRequest()),
    {
      replayed: true,
      createdTenant: true,
      profile: { ...payload, version: 1 },
    },
  );
});

test("maps session and profile repository failures without leaking details", async () => {
  const sessionFailure = fixture({
    sessionError: new Error("private session failure"),
  });
  await assert.rejects(
    sessionFailure.read.execute(context, {}, readRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE" &&
      !String(error.message).includes("private"),
  );

  const repositoryFailure = fixture({
    storedProfile: Object.freeze({
      get tenantId() {
        throw new Error("private repository failure");
      },
    }),
  });
  await assert.rejects(
    repositoryFailure.read.execute(context, {}, readRequest()),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE" &&
      !String(error.message).includes("private"),
  );
});
