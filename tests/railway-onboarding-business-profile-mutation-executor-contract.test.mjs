import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRailwayOnboardingBusinessProfileMutationState,
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
} from
  "../server/platform/railwayOnboardingBusinessProfileMutationExecutor.ts";
import {
  RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION as CONTRACT_OPERATION,
} from
  "../server/platform/railwayOnboardingBusinessProfileOperationContract.ts";

const payload = Object.freeze({
  businessName: "Connect",
  timezone: "Asia/Jerusalem",
  interfaceLanguage: "he",
});

function matchingState() {
  return {
    createdTenant: true,
    profile: {
      ...payload,
      version: 1,
    },
  };
}

test("binds the mutation executor to the canonical save operation", () => {
  assert.equal(
    RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
    "onboarding.business-profile.save",
  );
  assert.equal(
    RAILWAY_ONBOARDING_BUSINESS_PROFILE_SAVE_OPERATION,
    CONTRACT_OPERATION,
  );
});

test("accepts only a matching bounded mutation state", () => {
  assert.deepEqual(
    parseRailwayOnboardingBusinessProfileMutationState(
      payload,
      matchingState(),
    ),
    matchingState(),
  );

  for (const state of [
    {
      ...matchingState(),
      profile: { ...matchingState().profile, businessName: "Other" },
    },
    {
      ...matchingState(),
      profile: { ...matchingState().profile, timezone: "UTC" },
    },
    {
      ...matchingState(),
      profile: { ...matchingState().profile, interfaceLanguage: "en" },
    },
  ]) {
    assert.equal(
      parseRailwayOnboardingBusinessProfileMutationState(payload, state),
      null,
    );
  }
});

test("rejects malformed, extended, and identity-bearing state", () => {
  for (const state of [
    null,
    { ...matchingState(), createdTenant: "true" },
    { ...matchingState(), tenantId: 7 },
    {
      ...matchingState(),
      profile: { ...matchingState().profile, tenantId: 7 },
    },
    {
      ...matchingState(),
      profile: { ...matchingState().profile, version: 0 },
    },
  ]) {
    assert.equal(
      parseRailwayOnboardingBusinessProfileMutationState(payload, state),
      null,
    );
  }
});

test("does not execute hostile state accessors", () => {
  let getterCalls = 0;
  const state = matchingState();
  Object.defineProperty(state, "profile", {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error("sensitive-state-detail");
    },
  });

  assert.equal(
    parseRailwayOnboardingBusinessProfileMutationState(payload, state),
    null,
  );
  assert.equal(getterCalls, 0);

  const target = matchingState();
  const trapped = new Proxy(target, {
    ownKeys() {
      throw new Error("sensitive-proxy-detail");
    },
  });
  assert.equal(
    parseRailwayOnboardingBusinessProfileMutationState(payload, trapped),
    null,
  );
});

test("rejects malformed and extended payload shapes without throwing", () => {
  const inherited = Object.create(payload);
  const customPrototype = Object.assign(
    Object.create({ source: "inherited" }),
    payload,
  );
  const hidden = { ...payload };
  Object.defineProperty(hidden, "tenantId", {
    enumerable: false,
    value: 7,
  });
  const symbol = { ...payload };
  symbol[Symbol("tenant")] = 7;

  for (const invalidPayload of [
    null,
    [],
    inherited,
    customPrototype,
    { ...payload, tenantId: 7 },
    hidden,
    symbol,
  ]) {
    assert.equal(
      parseRailwayOnboardingBusinessProfileMutationState(
        invalidPayload,
        matchingState(),
      ),
      null,
    );
  }
});

test("does not execute hostile payload accessors", () => {
  let getterCalls = 0;
  const accessorPayload = { ...payload };
  Object.defineProperty(accessorPayload, "businessName", {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error("sensitive-payload-detail");
    },
  });

  assert.equal(
    parseRailwayOnboardingBusinessProfileMutationState(
      accessorPayload,
      matchingState(),
    ),
    null,
  );
  assert.equal(getterCalls, 0);
});

test("fails closed for trapped and revoked payload proxies", () => {
  for (const trap of [
    "getPrototypeOf",
    "ownKeys",
    "getOwnPropertyDescriptor",
  ]) {
    const trapped = new Proxy(
      { ...payload },
      {
        [trap]() {
          throw new Error(`sensitive-${trap}-detail`);
        },
      },
    );
    assert.equal(
      parseRailwayOnboardingBusinessProfileMutationState(
        trapped,
        matchingState(),
      ),
      null,
    );
  }

  const revocable = Proxy.revocable({ ...payload }, {});
  revocable.revoke();
  assert.equal(
    parseRailwayOnboardingBusinessProfileMutationState(
      revocable.proxy,
      matchingState(),
    ),
    null,
  );
});

test("snapshots payload data without invoking changing property reads", () => {
  let reads = 0;
  const changingPayload = new Proxy(
    { ...payload },
    {
      get(target, key, receiver) {
        reads += 1;
        return key === "businessName"
          ? `Changed-${reads}`
          : Reflect.get(target, key, receiver);
      },
    },
  );

  assert.deepEqual(
    parseRailwayOnboardingBusinessProfileMutationState(
      changingPayload,
      matchingState(),
    ),
    matchingState(),
  );
  assert.equal(reads, 0);
});

test("returns a frozen snapshot detached from later state mutation", () => {
  const state = matchingState();
  const parsed = parseRailwayOnboardingBusinessProfileMutationState(
    payload,
    state,
  );
  assert.notEqual(parsed, null);

  state.createdTenant = false;
  state.profile.businessName = "Changed";
  state.profile.version = 2;

  assert.deepEqual(parsed, matchingState());
  assert.equal(Object.isFrozen(parsed), true);
  assert.equal(Object.isFrozen(parsed.profile), true);
});
