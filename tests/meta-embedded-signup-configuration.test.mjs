import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  inspectMetaEmbeddedSignupConfiguration,
  metaEmbeddedSignupEnvironmentKeys,
  toMetaEmbeddedSignupView,
} from "../server/meta/metaEmbeddedSignupConfiguration.ts";

test("reports Embedded Signup as disabled when every key is absent", () => {
  const state = inspectMetaEmbeddedSignupConfiguration({});

  assert.equal(state.status, "disabled");
  assert.deepEqual(
    state.missingKeys,
    metaEmbeddedSignupEnvironmentKeys,
  );
  assert.deepEqual(toMetaEmbeddedSignupView(state), {
    status: "configuration-required",
  });
});

test("reports missing and invalid Embedded Signup keys without values", () => {
  const appSecret = "must-not-appear-in-configuration-state";
  const state = inspectMetaEmbeddedSignupConfiguration({
    META_APP_ID: "invalid-app-id",
    META_GRAPH_API_VERSION: "latest",
    META_APP_SECRET: appSecret,
  });

  assert.equal(state.status, "incomplete");
  assert.deepEqual(state.missingKeys, [
    "META_EMBEDDED_SIGNUP_CONFIGURATION_ID",
  ]);
  assert.deepEqual(state.invalidKeys, [
    "META_APP_ID",
    "META_GRAPH_API_VERSION",
  ]);
  assert.doesNotMatch(JSON.stringify(state), new RegExp(appSecret));
  assert.deepEqual(toMetaEmbeddedSignupView(state), {
    status: "configuration-invalid",
  });
});

test("returns only public Embedded Signup configuration", () => {
  const state = inspectMetaEmbeddedSignupConfiguration({
    META_APP_ID: " 123456789 ",
    META_EMBEDDED_SIGNUP_CONFIGURATION_ID: " 987654321 ",
    META_GRAPH_API_VERSION: " v21.0 ",
  });

  assert.deepEqual(state, {
    status: "configured",
    configuration: {
      appId: "123456789",
      configurationId: "987654321",
      apiVersion: "v21.0",
    },
    missingKeys: [],
    invalidKeys: [],
  });
  assert.deepEqual(toMetaEmbeddedSignupView(state), {
    status: "configured",
    appId: "123456789",
    configurationId: "987654321",
    apiVersion: "v21.0",
  });
});

test("declares Embedded Signup configuration as server environment", async () => {
  const exampleEnvironment = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  assert.match(exampleEnvironment, /^META_APP_ID=$/m);
  assert.match(
    exampleEnvironment,
    /^META_EMBEDDED_SIGNUP_CONFIGURATION_ID=$/m,
  );
  assert.doesNotMatch(
    exampleEnvironment,
    /NEXT_PUBLIC_META_(APP|EMBEDDED|GRAPH)/,
  );
});
