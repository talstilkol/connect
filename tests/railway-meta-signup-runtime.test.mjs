import assert from "node:assert/strict";
import test from "node:test";
import { createRailwayMetaSignupRuntime } from "../server/platform/railwayMetaSignupRuntime.ts";

const environment = {
  META_APP_ID: "100001", META_EMBEDDED_SIGNUP_CONFIGURATION_ID: "500005", META_GRAPH_API_VERSION: "v23.0",
  META_APP_SECRET: "protected-meta-app-secret",
  META_CREDENTIAL_ENCRYPTION_KEY_V1: Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1)).toString("base64"),
};
const dependencies = {
  connections: {}, credentials: {}, attempts: {}, environment,
  webhookEnvironment: { META_APP_SECRET: environment.META_APP_SECRET },
};

test("exposes public signup configuration only when all server prerequisites are configured", () => {
  assert.deepEqual(createRailwayMetaSignupRuntime(dependencies).readConfiguration(), {
    status: "configured", appId: "100001", configurationId: "500005", apiVersion: "v23.0",
  });
  for (const overrides of [
    { environment: {} }, { webhookEnvironment: null },
  ]) assert.deepEqual(createRailwayMetaSignupRuntime({ ...dependencies, ...overrides }).readConfiguration(), { status: "configuration-required" });
  for (const key of ["META_APP_SECRET", "META_CREDENTIAL_ENCRYPTION_KEY_V1", "META_EMBEDDED_SIGNUP_CONFIGURATION_ID"]) {
    assert.deepEqual(createRailwayMetaSignupRuntime({ ...dependencies, environment: { ...environment, [key]: "" } }).readConfiguration(), { status: "configuration-invalid" });
  }
});

test("rejects different signup and webhook app secrets without including either value", () => {
  assert.throws(() => createRailwayMetaSignupRuntime({ ...dependencies,
    webhookEnvironment: { META_APP_SECRET: "other-protected-secret" },
  }), (error) => {
    assert.match(error.message, /signup and webhook configuration do not match/);
    assert.doesNotMatch(error.message, /protected|other-protected/);
    return true;
  });
});

test('Business App capability is advertised only for the explicit server controlled-pilot mode', async () => {
  const {createRailwayMetaSignupApiRuntime}=await import('../server/platform/railwayMetaSignupRuntime.ts');
  for (const mode of [undefined,'','true','controlled-pilot ','production']) {
    const runtime=createRailwayMetaSignupApiRuntime({...dependencies,requests:{},environment:{...environment,META_COEXISTENCE_ONBOARDING_MODE:mode}});
    assert.equal(runtime.readConfiguration().businessAppEnabled,undefined);
    assert.equal((await runtime.begin({tenantId:7,externalUserId:'owner',role:'owner'},'business-app')).status,'configuration-required');
  }
  const enabled=createRailwayMetaSignupApiRuntime({...dependencies,requests:{},environment:{...environment,META_COEXISTENCE_ONBOARDING_MODE:'controlled-pilot'}});
  assert.equal(enabled.readConfiguration().businessAppEnabled,true);
  const missing=createRailwayMetaSignupApiRuntime({...dependencies,requests:{},webhookEnvironment:null,environment:{...environment,META_COEXISTENCE_ONBOARDING_MODE:'controlled-pilot'}});
  assert.equal(missing.readConfiguration().businessAppEnabled,undefined);
});
