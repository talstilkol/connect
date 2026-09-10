import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  deriveRailwayApiDeterministicIdempotencyKey,
  deriveRailwayApiMutationRequestDigest,
} from "../server/platform/railwayApiMutationExecutor.ts";
import {
  createRailwayTenantSelectionOperations,
} from "../server/platform/railwayTenantSelectionOperations.ts";

const identity = Object.freeze({ externalUserId: "verified-user" });
const context = Object.freeze({
  userIdentity: identity,
  serviceIdentity: Object.freeze({
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject: "owner:connect-team:project:connect-web:environment:production",
  }),
});

function selectionKey(tenantId) {
  return `tenant_selection_option_v1_${createHash("sha256")
    .update(JSON.stringify({
      purpose: "tenant-selection-option",
      externalUserId: identity.externalUserId,
      tenantId,
    }))
    .digest("hex")}`;
}

function membership(tenantId, role = "owner") {
  return {
    tenantId,
    tenantDisplayName: `workspace-${tenantId}`,
    tenantStatus: "active",
    externalUserId: identity.externalUserId,
    role,
    version: 1,
  };
}

function fixture(options = {}) {
  const calls = {
    memberships: 0,
    selections: 0,
    rateLimitSubjects: [],
    mutations: [],
  };
  const operations = createRailwayTenantSelectionOperations({
    memberships: {
      async findActiveByExternalUserId() {
        calls.memberships += 1;
        return options.memberships ?? [membership(7), membership(11, "manager")];
      },
      async findActiveByTenantId() {
        throw new Error("unused membership method");
      },
    },
    selections: {
      async findByExternalUserId() {
        calls.selections += 1;
        return options.selection ?? null;
      },
    },
    mutationRateLimit: {
      async consume(subject) {
        calls.rateLimitSubjects.push(subject);
        return options.rateLimitOutcome ?? { outcome: "allowed" };
      },
    },
    mutations: {
      async execute(command) {
        calls.mutations.push(command);
        return options.mutationResult ?? {
          outcome: "committed",
          tenantId: command.input.tenantId,
          state: {
            repositoryOutcome: "saved",
            selection: {
              tenantId: command.input.tenantId,
              version: command.input.expectedVersion + 1,
            },
          },
        };
      },
    },
  });
  return {
    calls,
    read: operations.find(({ id }) =>
      id === "tenant-selection.directory.read"
    ),
    save: operations.find(({ id }) => id === "tenant-selection.save"),
  };
}

function readRequest() {
  return Object.freeze({
    contractVersion: "connect.railway-api.v1",
    operation: "tenant-selection.directory.read",
    requestKind: "query",
    idempotencyKey: null,
    payload: Object.freeze({}),
  });
}

async function saveRequest(payload) {
  return Object.freeze({
    contractVersion: "connect.railway-api.v1",
    operation: "tenant-selection.save",
    requestKind: "mutation",
    idempotencyKey: await deriveRailwayApiDeterministicIdempotencyKey(
      "tenant-selection.save",
      payload,
    ),
    payload,
  });
}

test("returns an opaque bounded tenant directory without tenant identities", async () => {
  const testFixture = fixture();
  const result = await testFixture.read.execute(context, {}, readRequest());
  assert.deepEqual(result, {
    directory: {
      version: 0,
      selectionRequired: true,
      options: [
        {
          selectionKey: selectionKey(7),
          displayName: "workspace-7",
          role: "owner",
          selected: false,
        },
        {
          selectionKey: selectionKey(11),
          displayName: "workspace-11",
          role: "manager",
          selected: false,
        },
      ],
    },
  });
  assert.doesNotMatch(JSON.stringify(result), /tenantId|externalUserId/);
});

test("selects through identity quota and one atomic mutation command", async () => {
  const payload = Object.freeze({
    selectionKey: selectionKey(11),
    expectedVersion: 0,
  });
  const testFixture = fixture();
  const result = await testFixture.save.execute(
    context,
    payload,
    await saveRequest(payload),
  );

  assert.deepEqual(result, { version: 1, unchanged: false, replayed: false });
  assert.deepEqual(testFixture.calls.rateLimitSubjects, [
    "verified-user:tenant-selection.save",
  ]);
  assert.equal(testFixture.calls.mutations.length, 1);
  assert.deepEqual(testFixture.calls.mutations[0].input, {
    externalUserId: "verified-user",
    tenantId: 11,
    expectedVersion: 0,
  });
  assert.equal(
    testFixture.calls.mutations[0].requestDigest,
    await deriveRailwayApiMutationRequestDigest(
      "tenant-selection.save",
      payload,
    ),
  );
});

test("marks an exact receipt replay as unchanged", async () => {
  const payload = Object.freeze({
    selectionKey: selectionKey(7),
    expectedVersion: 0,
  });
  const testFixture = fixture({
    mutationResult: {
      outcome: "replayed",
      tenantId: 7,
      state: {
        repositoryOutcome: "saved",
        selection: { tenantId: 7, version: 1 },
      },
    },
  });
  assert.deepEqual(
    await testFixture.save.execute(context, payload, await saveRequest(payload)),
    { version: 1, unchanged: true, replayed: true },
  );
});

test("rejects forged selection keys before mutation and limits before membership read", async () => {
  const invalid = fixture();
  const forgedPayload = Object.freeze({
    selectionKey: `tenant_selection_option_v1_${"f".repeat(64)}`,
    expectedVersion: 0,
  });
  await assert.rejects(
    invalid.save.execute(
      context,
      forgedPayload,
      await saveRequest(forgedPayload),
    ),
    (error) => error?.code === "INVALID_REQUEST",
  );
  assert.equal(invalid.calls.mutations.length, 0);

  const limited = fixture({ rateLimitOutcome: { outcome: "limited" } });
  const validPayload = Object.freeze({
    selectionKey: selectionKey(7),
    expectedVersion: 0,
  });
  await assert.rejects(
    limited.save.execute(
      context,
      validPayload,
      await saveRequest(validPayload),
    ),
    (error) => error?.code === "RATE_LIMITED",
  );
  assert.equal(limited.calls.memberships, 0);
  assert.equal(limited.calls.mutations.length, 0);
});

test("maps executor conflicts and malformed state without exposing internals", async () => {
  const payload = Object.freeze({
    selectionKey: selectionKey(7),
    expectedVersion: 0,
  });
  const conflict = fixture({
    mutationResult: { outcome: "conflict", tenantId: null, state: null },
  });
  await assert.rejects(
    conflict.save.execute(context, payload, await saveRequest(payload)),
    (error) => error?.code === "CONFLICT",
  );

  const malformed = fixture({
    mutationResult: {
      outcome: "committed",
      tenantId: 7,
      state: {
        repositoryOutcome: "saved",
        selection: { tenantId: 7, version: 9 },
      },
    },
  });
  await assert.rejects(
    malformed.save.execute(context, payload, await saveRequest(payload)),
    (error) => error?.code === "DEPENDENCY_UNAVAILABLE",
  );
});
