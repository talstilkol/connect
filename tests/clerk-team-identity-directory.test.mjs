import assert from "node:assert/strict";
import test from "node:test";
import { createClerkTeamIdentityDirectory } from "../server/platform/clerkTeamIdentityDirectory.ts";

const config = { clerkPublishableKey: "fixture-public-key", clerkSecretKey: "fixture-secret-key" };
const unavailable = { status: "unavailable", identities: [] };
function user(id, overrides = {}) {
  return {
    id, firstName: "Connect", lastName: "Demo", username: null,
    primaryEmailAddress: { emailAddress: `${id}@example.com`, verification: { status: "verified" } },
    privateMetadata: { mustNotLeaveServer: true },
    ...overrides,
  };
}
function fixture(response) {
  const calls = [];
  const directory = createClerkTeamIdentityDirectory(config, {
    create(received) {
      assert.deepEqual(received, { publishableKey: config.clerkPublishableKey, secretKey: config.clerkSecretKey });
      return { users: { async getUserList(input) {
        calls.push(structuredClone(input));
        if (response instanceof Error) throw response;
        return response;
      } } };
    },
  });
  return { directory, calls };
}

test("queries only the authorized IDs and returns whitelisted profiles in membership order", async () => {
  const f = fixture({ data: [user("member-b"), user("member-a")], totalCount: 2 });
  assert.deepEqual(await f.directory.resolve(["member-a", "member-b"]), {
    status: "ready",
    identities: ["member-a", "member-b"].map((externalUserId) => ({
      externalUserId, displayName: "Connect Demo", primaryEmail: `${externalUserId}@example.com`,
    })),
  });
  assert.deepEqual(f.calls, [{ userId: ["member-a", "member-b"], limit: 2, offset: 0 }]);
});

test("never sends an empty, duplicate, malformed or oversized filter to Clerk", async () => {
  const f = fixture(null);
  assert.deepEqual(await f.directory.resolve([]), { status: "ready", identities: [] });
  for (const ids of [null, "member-a", ["member-a", "member-a"], [" "], [" member-a"], ["a\nb"], ["a".repeat(513)], Array.from({ length: 101 }, (_, index) => `member-${index}`)]) {
    assert.deepEqual(await f.directory.resolve(ids), unavailable);
  }
  assert.equal(f.calls.length, 0);
});

test("supports exactly the bounded 100-member directory in one request", async () => {
  const ids = Array.from({ length: 100 }, (_, index) => `member-${index}`);
  const f = fixture({ data: ids.map((id) => user(id)) });
  assert.equal((await f.directory.resolve(ids)).identities.length, 100);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].limit, 100);
});

test("rejects missing, duplicate, extra and foreign profiles without partial disclosure", async () => {
  for (const data of [[], [user("member-a")], [user("member-a"), user("member-a")], [user("member-a"), user("foreign-user")], [user("member-a"), user("member-b"), user("foreign-user")]]) {
    const f = fixture({ data });
    assert.deepEqual(await f.directory.resolve(["member-a", "member-b"]), unavailable);
    assert.equal(f.calls.length, 1);
  }
});

test("uses a real username or verified primary email when the profile has no name", async () => {
  for (const [overrides, name] of [
    [{ firstName: " טל ", lastName: " כהן " }, "טל כהן"],
    [{ firstName: null, lastName: "", username: "demo-user" }, "demo-user"],
    [{ firstName: null, lastName: null }, "member-a@example.com"],
  ]) {
    const f = fixture({ data: [user("member-a", overrides)] });
    const result = await f.directory.resolve(["member-a"]);
    assert.equal(result.status, "ready");
    assert.equal(result.identities[0].displayName, name);
  }
});

test("rejects unverified primary email, malformed fields and unsafe display text", async () => {
  for (const overrides of [
    { primaryEmailAddress: null },
    { primaryEmailAddress: { emailAddress: "member-a@example.com", verification: { status: "unverified" } } },
    { primaryEmailAddress: { emailAddress: "invalid", verification: { status: "verified" } } },
    { firstName: "unsafe\nname" }, { firstName: 42 }, { firstName: "a".repeat(161) },
    { firstName: "a".repeat(100), lastName: "b".repeat(100) },
  ]) {
    assert.deepEqual(await fixture({ data: [user("member-a", overrides)] }).directory.resolve(["member-a"]), unavailable);
  }
});

test("maps provider outages and invalid responses to the opaque fallback without errors or retries", async () => {
  for (const response of [new Error("private provider credential details"), null, [], { data: null }, { data: [null] }]) {
    const f = fixture(response);
    assert.deepEqual(await f.directory.resolve(["member-a"]), unavailable);
    assert.equal(f.calls.length, 1);
  }
});

test("rejects missing configuration and invalid readers before lookup", () => {
  for (const configuration of [null, {}, { ...config, clerkSecretKey: " " }]) {
    assert.throws(() => createClerkTeamIdentityDirectory(configuration), /configuration/);
  }
  assert.throws(() => createClerkTeamIdentityDirectory(config, { create: () => ({ users: {} }) }), /reader/);
});
