import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectRailwayApiIdentityConfiguration,
} from "../server/platform/railwayApiIdentityConfiguration.ts";
import {
  createVercelOidcVerifier,
} from "../server/platform/vercelOidcVerifier.ts";

const compactJwt = "header.payload.signature";

function configuration() {
  const state = inspectRailwayApiIdentityConfiguration({
    APP_PUBLIC_ORIGIN: "https://connect.example.com",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      "publishable-key-for-contract-test",
    CLERK_SECRET_KEY: "secret-key-for-contract-test",
    VERCEL_OIDC_TEAM_SLUG: "connect-team",
    VERCEL_OIDC_PROJECT_NAME: "connect-web",
    VERCEL_OIDC_ENVIRONMENT: "production",
    NODE_ENV: "production",
  });

  assert.equal(state.status, "configured");
  return state.configuration;
}

function verifierFixture(verifyJwt = async () => {}) {
  const calls = {
    jwksUrls: [],
    verifications: [],
  };
  const keySet = async () => {
    throw new Error("The test key set must not be invoked directly");
  };
  const dependencies = {
    createRemoteKeySet(url) {
      calls.jwksUrls.push(url.toString());
      return keySet;
    },
    async verifyJwt(token, receivedKeySet, options) {
      calls.verifications.push({
        token,
        keySet: receivedKeySet,
        options,
      });
      await verifyJwt(token, receivedKeySet, options);
    },
  };

  return {
    calls,
    verifier: createVercelOidcVerifier(
      configuration(),
      dependencies,
    ),
    expectedIdentity: configuration().expectedServiceIdentity,
    keySet,
  };
}

test("verifies issuer, audience and subject before returning identity", async () => {
  const fixture = verifierFixture();

  const identity = await fixture.verifier.verify(
    compactJwt,
    fixture.expectedIdentity,
  );

  assert.deepEqual(fixture.calls.jwksUrls, [
    "https://oidc.vercel.com/connect-team/.well-known/jwks",
  ]);
  assert.equal(fixture.calls.verifications.length, 1);
  assert.equal(
    fixture.calls.verifications[0].token,
    compactJwt,
  );
  assert.equal(
    fixture.calls.verifications[0].keySet,
    fixture.keySet,
  );
  assert.deepEqual(fixture.calls.verifications[0].options, {
    issuer: "https://oidc.vercel.com/connect-team",
    audience: "https://vercel.com/connect-team",
    subject:
      "owner:connect-team:project:connect-web:environment:production",
  });
  assert.deepEqual(identity, {
    provider: "vercel",
    teamSlug: "connect-team",
    projectName: "connect-web",
    environment: "production",
    subject:
      "owner:connect-team:project:connect-web:environment:production",
  });
  assert.equal(Object.isFrozen(identity), true);
});

test("maps token and claim failures to unauthenticated", async () => {
  const invalidCodes = [
    "ERR_JOSE_ALG_NOT_ALLOWED",
    "ERR_JOSE_NOT_SUPPORTED",
    "ERR_JWS_INVALID",
    "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
    "ERR_JWT_CLAIM_VALIDATION_FAILED",
    "ERR_JWT_EXPIRED",
    "ERR_JWT_INVALID",
    "ERR_JWKS_NO_MATCHING_KEY",
  ];

  for (const code of invalidCodes) {
    const fixture = verifierFixture(async () => {
      throw Object.assign(new Error("untrusted token detail"), {
        code,
      });
    });

    assert.equal(
      await fixture.verifier.verify(
        compactJwt,
        fixture.expectedIdentity,
      ),
      null,
    );
  }
});

test("surfaces JWKS and network failures as dependency outages", async () => {
  for (const dependencyError of [
    Object.assign(new Error("remote JWKS is invalid"), {
      code: "ERR_JWKS_INVALID",
    }),
    Object.assign(new Error("remote JWKS timed out"), {
      code: "ERR_JWKS_TIMEOUT",
    }),
    new TypeError("network failed"),
  ]) {
    const fixture = verifierFixture(async () => {
      throw dependencyError;
    });

    await assert.rejects(
      fixture.verifier.verify(
        compactJwt,
        fixture.expectedIdentity,
      ),
      (error) => {
        assert.equal(
          error.message,
          "Vercel OIDC verification dependency is unavailable",
        );
        assert.doesNotMatch(error.message, /JWKS|network|token/i);
        return true;
      },
    );
  }
});

test("rejects a handler identity that differs from trusted configuration", async () => {
  const fixture = verifierFixture();

  await assert.rejects(
    fixture.verifier.verify(compactJwt, {
      ...fixture.expectedIdentity,
      environment: "preview",
    }),
    /expected identity is inconsistent/,
  );
  assert.equal(fixture.calls.verifications.length, 0);
});

test("rejects a configurable JWKS origin or altered trust claims", () => {
  const trusted = configuration();
  const dependency = {
    createRemoteKeySet() {
      return async () => {};
    },
    async verifyJwt() {},
  };
  const candidates = [
    {
      ...trusted,
      jwksUrl: "https://attacker.example/.well-known/jwks",
    },
    {
      ...trusted,
      issuer: "https://oidc.vercel.com/other-team",
    },
    {
      ...trusted,
      audience: "https://vercel.com/other-team",
    },
    {
      ...trusted,
      subject:
        "owner:connect-team:project:other:environment:production",
    },
  ];

  for (const candidate of candidates) {
    assert.throws(
      () => createVercelOidcVerifier(candidate, dependency),
      /configuration is invalid/,
    );
  }
});
