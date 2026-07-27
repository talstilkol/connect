import assert from "node:assert/strict";
import test from "node:test";

import {
  requireMetaAuthorizationCodeExchangeConfiguration,
} from "../server/meta/metaAuthorizationCodeExchangeConfiguration.ts";

test("requires the complete server-side Meta code exchange configuration", () => {
  assert.throws(
    () =>
      requireMetaAuthorizationCodeExchangeConfiguration({}),
    /META_APP_ID/,
  );
  assert.throws(
    () =>
      requireMetaAuthorizationCodeExchangeConfiguration({
        META_APP_ID: "123456789",
      }),
    /META_APP_SECRET/,
  );
  assert.throws(
    () =>
      requireMetaAuthorizationCodeExchangeConfiguration({
        META_APP_ID: "123456789",
        META_APP_SECRET: "fixture-app-secret",
      }),
    /META_GRAPH_API_VERSION/,
  );
});

test("rejects malformed values without exposing the app secret", () => {
  const appSecret = "secret-that-must-not-appear";

  assert.throws(
    () =>
      requireMetaAuthorizationCodeExchangeConfiguration({
        META_APP_ID: "not-a-meta-id",
        META_APP_SECRET: appSecret,
        META_GRAPH_API_VERSION: "v21.0",
      }),
    (error) => {
      assert.doesNotMatch(error.message, new RegExp(appSecret));
      return true;
    },
  );

  assert.throws(
    () =>
      requireMetaAuthorizationCodeExchangeConfiguration({
        META_APP_ID: "123456789",
        META_APP_SECRET: appSecret,
        META_GRAPH_API_VERSION: "latest",
      }),
    (error) => {
      assert.doesNotMatch(error.message, new RegExp(appSecret));
      return true;
    },
  );
});

test("returns normalized public identifiers and the unchanged server secret", () => {
  const configuration =
    requireMetaAuthorizationCodeExchangeConfiguration({
      META_APP_ID: " 123456789 ",
      META_APP_SECRET: "fixture-app-secret",
      META_GRAPH_API_VERSION: " v21.0 ",
    });

  assert.deepEqual(configuration, {
    appId: "123456789",
    appSecret: "fixture-app-secret",
    apiVersion: "v21.0",
  });
});
