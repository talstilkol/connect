import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRailwayApiServerIdentity,
} from "../server/platform/railwayApiServerIdentity.ts";

const userSessionToken =
  "userHeader.userPayload.userSignature";
const oidcToken =
  "oidcHeader.oidcPayload.oidcSignature";

function dependencies(overrides = {}) {
  const calls = [];

  return {
    calls,
    value: {
      async readClerkAuth() {
        calls.push("clerk");
        return {
          userId: "system-admin-primary",
          async getToken() {
            calls.push("user-token");
            return userSessionToken;
          },
        };
      },
      async readVercelOidcToken() {
        calls.push("oidc-token");
        return oidcToken;
      },
      ...overrides,
    },
  };
}

test("resolves bounded Clerk and Vercel proofs only for an authenticated request", async () => {
  const fixture = dependencies();
  const result = await resolveRailwayApiServerIdentity(
    fixture.value,
  );

  assert.deepEqual(result, {
    status: "authenticated",
    oidcToken,
    userSessionToken,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(fixture.calls, [
    "clerk",
    "user-token",
    "oidc-token",
  ]);
});

test("does not request either token for a signed-out Clerk request", async () => {
  const fixture = dependencies({
    async readClerkAuth() {
      fixture.calls.push("clerk");
      return {
        userId: null,
        async getToken() {
          fixture.calls.push("unexpected-user-token");
          return userSessionToken;
        },
      };
    },
  });

  assert.deepEqual(
    await resolveRailwayApiServerIdentity(fixture.value),
    {
      status: "unauthenticated",
      oidcToken: null,
      userSessionToken: null,
    },
  );
  assert.deepEqual(fixture.calls, ["clerk"]);
});

test("fails closed and removes tokens when either proof is malformed", async () => {
  const cases = [
    dependencies({
      async readVercelOidcToken() {
        return "not-a-jwt";
      },
    }),
    dependencies({
      async readClerkAuth() {
        return {
          userId: "system-admin-primary",
          async getToken() {
            return null;
          },
        };
      },
    }),
    dependencies({
      async readClerkAuth() {
        return {
          userId: " system-admin-primary",
          async getToken() {
            return userSessionToken;
          },
        };
      },
    }),
  ];

  for (const fixture of cases) {
    const result = await resolveRailwayApiServerIdentity(
      fixture.value,
    );

    assert.deepEqual(result, {
      status: "unavailable",
      oidcToken: null,
      userSessionToken: null,
    });
    assert.doesNotMatch(
      JSON.stringify(result),
      /userHeader|oidcHeader|system-admin-primary/,
    );
  }
});

test("sanitizes Clerk, token and OIDC dependency failures", async () => {
  const cases = [
    dependencies({
      async readClerkAuth() {
        throw new Error("private Clerk failure");
      },
    }),
    dependencies({
      async readVercelOidcToken() {
        throw new Error("private Vercel failure");
      },
    }),
    dependencies({
      async readClerkAuth() {
        return {
          userId: "system-admin-primary",
          async getToken() {
            throw new Error("private session failure");
          },
        };
      },
    }),
  ];

  for (const fixture of cases) {
    const result = await resolveRailwayApiServerIdentity(
      fixture.value,
    );

    assert.deepEqual(result, {
      status: "unavailable",
      oidcToken: null,
      userSessionToken: null,
    });
    assert.doesNotMatch(
      JSON.stringify(result),
      /private|Clerk|Vercel|session/,
    );
  }
});

test("rejects extended identity dependencies", async () => {
  const fixture = dependencies();

  await assert.rejects(
    resolveRailwayApiServerIdentity({
      ...fixture.value,
      externalUserId: "forged-user",
    }),
    /dependencies are invalid/,
  );
});
