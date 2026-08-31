import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRailwayBusinessProfileSaveView,
  parseRailwayBusinessProfileView,
} from "../server/onboarding/railwayBusinessProfileResult.ts";

function profile(overrides = {}) {
  return {
    businessName: "Connect",
    interfaceLanguage: "he",
    timezone: "Asia/Jerusalem",
    version: 1,
    ...overrides,
  };
}

test("parses only canonical bounded business profile results", () => {
  const parsed = parseRailwayBusinessProfileView(profile());
  assert.deepEqual(parsed, profile());
  assert.ok(Object.isFrozen(parsed));

  const saved = parseRailwayBusinessProfileSaveView({
    createdTenant: true,
    profile: profile({ version: 2 }),
  });
  assert.deepEqual(saved, {
    createdTenant: true,
    profile: profile({ version: 2 }),
  });
  assert.ok(Object.isFrozen(saved));
  assert.ok(Object.isFrozen(saved.profile));
});

test("rejects malformed, non-canonical and extended results", () => {
  for (const input of [
    profile({ version: 0 }),
    profile({ version: 1.5 }),
    profile({ businessName: " Connect" }),
    profile({ timezone: "unknown/unavailable" }),
    profile({ interfaceLanguage: "fr" }),
    profile({ tenantId: "must-not-cross-boundary" }),
    [],
    null,
  ]) {
    assert.equal(parseRailwayBusinessProfileView(input), null);
  }

  for (const input of [
    { createdTenant: "true", profile: profile() },
    { createdTenant: true, profile: profile(), internalId: "blocked" },
    { createdTenant: true, profile: null },
  ]) {
    assert.equal(parseRailwayBusinessProfileSaveView(input), null);
  }
});

test("rejects accessors and exotic records without invoking getters", () => {
  let getterCalls = 0;
  const accessor = profile();
  Object.defineProperty(accessor, "businessName", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "Connect";
    },
  });
  const nestedAccessor = {
    createdTenant: true,
    profile: profile(),
  };
  Object.defineProperty(nestedAccessor, "createdTenant", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return true;
    },
  });
  const symbolBearing = profile();
  symbolBearing[Symbol("internal")] = "must-not-cross-boundary";
  const nonEnumerable = profile();
  Object.defineProperty(nonEnumerable, "businessName", {
    enumerable: false,
    value: "Connect",
  });
  const inherited = profile();
  delete inherited.businessName;
  Object.setPrototypeOf(inherited, { businessName: "Connect" });

  assert.equal(parseRailwayBusinessProfileView(accessor), null);
  assert.equal(parseRailwayBusinessProfileSaveView(nestedAccessor), null);
  assert.equal(parseRailwayBusinessProfileView(symbolBearing), null);
  assert.equal(parseRailwayBusinessProfileView(nonEnumerable), null);
  assert.equal(parseRailwayBusinessProfileView(inherited), null);
  assert.equal(getterCalls, 0);
});

test("fails closed for hostile, nested and revoked proxies", () => {
  const ownKeysTrap = new Proxy(profile(), {
    ownKeys() {
      throw new Error("must-not-escape");
    },
  });
  const descriptorTrap = new Proxy(profile(), {
    getOwnPropertyDescriptor() {
      throw new Error("must-not-escape");
    },
  });
  const prototypeTrap = new Proxy(profile(), {
    getPrototypeOf() {
      throw new Error("must-not-escape");
    },
  });
  const revokedObject = Proxy.revocable(profile(), {});
  revokedObject.revoke();
  const revokedArray = Proxy.revocable([], {});
  revokedArray.revoke();
  const revokedProfile = Proxy.revocable(profile(), {});
  revokedProfile.revoke();

  for (const input of [
    ownKeysTrap,
    descriptorTrap,
    prototypeTrap,
    revokedObject.proxy,
    revokedArray.proxy,
  ]) {
    assert.doesNotThrow(() => parseRailwayBusinessProfileView(input));
    assert.equal(parseRailwayBusinessProfileView(input), null);
  }
  assert.doesNotThrow(() =>
    parseRailwayBusinessProfileSaveView({
      createdTenant: true,
      profile: revokedProfile.proxy,
    })
  );
  assert.equal(
    parseRailwayBusinessProfileSaveView({
      createdTenant: true,
      profile: revokedProfile.proxy,
    }),
    null,
  );
});

test("rejects accessors when Object.prototype is polluted", () => {
  let getterCalls = 0;
  const input = profile();
  Object.defineProperty(input, "businessName", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "must-not-be-read";
    },
  });
  const previousDescriptor = Object.getOwnPropertyDescriptor(
    Object.prototype,
    "value",
  );

  try {
    Object.defineProperty(Object.prototype, "value", {
      configurable: true,
      value: "Connect",
    });
    assert.equal(parseRailwayBusinessProfileView(input), null);
    assert.equal(getterCalls, 0);
  } finally {
    if (previousDescriptor === undefined) {
      delete Object.prototype.value;
    } else {
      Object.defineProperty(
        Object.prototype,
        "value",
        previousDescriptor,
      );
    }
  }
});
