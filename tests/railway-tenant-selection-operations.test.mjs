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
import { selectTenantWithOrganization } from "../features/workspace/tenantOrganizationSelection.ts";
import { createRailwayTenantSessionResolver } from "../server/platform/railwayTenantSessionResolver.ts";

const identity = Object.freeze({ externalUserId: "verified-user", externalOrganizationId: "org_verified" });
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
    identityOrganizations: {
      async findByTenantId(tenantId) {
        if (options.binding !== undefined) return options.binding;
        return { tenantId, externalOrganizationId: tenantId === 7 ? "org_verified" : "org_other" };
      },
    },
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
        if (options.stateful) options.selection = { tenantId: command.input.tenantId, version: command.input.expectedVersion + 1 };
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

test("switches Clerk after saving and recovers an interrupted activation with the current directory version", async () => {
  const options = { stateful: true, selection: { tenantId: 7, version: 2 } };
  const testFixture = fixture(options);
  let currentIdentity = identity;
  const input = { selectionKey: selectionKey(11), expectedVersion: 2 };
  const select = async (payload) => {
    const result = await testFixture.save.execute(
      { ...context, userIdentity: currentIdentity }, payload, await saveRequest(payload),
    );
    return { status: "selected", ...result };
  };
  const resolver = createRailwayTenantSessionResolver({
    memberships: { async findActiveByExternalUserId() { return [membership(7), membership(11)]; } },
    selections: { async findByExternalUserId() { return options.selection; } },
    identityOrganizations: { async findByTenantId(tenantId) {
      return { tenantId, externalOrganizationId: tenantId === 7 ? "org_verified" : "org_other" };
    } },
  });
  const first = await selectTenantWithOrganization(input, {
    select,
    async activate(organizationId) {
      assert.equal(options.selection.tenantId, 11);
      assert.equal(organizationId, "org_other");
      throw new Error("Clerk unavailable");
    },
  });
  assert.equal(first.status, "temporarily-unavailable");
  await assert.rejects(resolver.resolve(currentIdentity), /organization binding/);
  const { directory } = await testFixture.read.execute(context, {}, readRequest());
  assert.equal(directory.version, 3);
  assert.equal(directory.selectionRequired, true);
  assert.equal(directory.options.some((option) => option.selected), false);

  const retried = await selectTenantWithOrganization({ ...input, expectedVersion: directory.version }, {
    select,
    async activate(organizationId) {
      currentIdentity = { ...identity, externalOrganizationId: organizationId };
    },
  });
  assert.equal(retried.status, "selected");
  assert.equal((await resolver.resolve(currentIdentity)).tenantId, 11);
  const readback = await testFixture.read.execute({ ...context, userIdentity: currentIdentity }, {}, readRequest());
  assert.equal(readback.directory.selectionRequired, false);
  assert.equal(readback.directory.options.find((option) => option.selected).selectionKey, selectionKey(11));
});

test("offers organization recovery even when there is only one membership", async () => {
  const testFixture = fixture({ memberships: [membership(11)] });
  const { directory } = await testFixture.read.execute(context, {}, readRequest());
  assert.equal(directory.selectionRequired, true);
  assert.equal(directory.options.length, 1);
  assert.equal(directory.options[0].selected, false);
});

test("rejects missing or mismatched organization binding before committing a selection", async () => {
  for (const binding of [null, { tenantId: 7, externalOrganizationId: "org_verified" },
    { tenantId: 11, externalOrganizationId: " " }]) {
    const testFixture = fixture({ binding });
    const payload = { selectionKey: selectionKey(11), expectedVersion: 0 };
    await assert.rejects(testFixture.save.execute(context, payload, await saveRequest(payload)),
      (error) => error.code === "DEPENDENCY_UNAVAILABLE");
    assert.equal(testFixture.calls.mutations.length, 0);
  }
});

test("does not activate Clerk after a failed selection and waits for activation before reporting success", async () => {
  const input = { selectionKey: selectionKey(11), expectedVersion: 0 };
  const failure = await selectTenantWithOrganization(input, {
    async select() { return { status: "conflict" }; },
    async activate() { assert.fail("Must not activate after a failed save"); },
  });
  assert.equal(failure.status, "conflict");
  let finish;
  const activation = new Promise((resolve) => { finish = resolve; });
  let completed = false;
  const pending = selectTenantWithOrganization(input, {
    async select() { return { status: "selected", organizationId: "org_other", version: 1, unchanged: false }; },
    async activate(organizationId) { assert.equal(organizationId, "org_other"); await activation; },
  }).then((result) => { completed = true; return result; });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(completed, false);
  finish();
  assert.equal((await pending).status, "selected");
});

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

  assert.deepEqual(result, { organizationId: "org_other", version: 1, unchanged: false, replayed: false });
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
    { organizationId: "org_verified", version: 1, unchanged: true, replayed: true },
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
