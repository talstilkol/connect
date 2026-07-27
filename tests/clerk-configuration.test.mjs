import assert from "node:assert/strict";
import test from "node:test";

import {
  hasClerkServerConfiguration,
  inspectClerkConfiguration,
} from "../server/auth/clerkConfiguration.ts";

test("reports Clerk as disabled when both required keys are absent", () => {
  const configuration = inspectClerkConfiguration({});

  assert.equal(configuration.status, "disabled");
  assert.deepEqual(configuration.missingKeys, [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
  ]);
  assert.equal(hasClerkServerConfiguration({}), false);
});

test("reports an incomplete Clerk configuration without exposing values", () => {
  const configuration = inspectClerkConfiguration({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "publishable-key-for-test",
  });

  assert.equal(configuration.status, "incomplete");
  assert.deepEqual(configuration.missingKeys, ["CLERK_SECRET_KEY"]);
});

test("accepts a complete non-blank Clerk configuration", () => {
  const environment = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "publishable-key-for-test",
    CLERK_SECRET_KEY: "secret-key-for-test",
  };

  assert.equal(inspectClerkConfiguration(environment).status, "configured");
  assert.equal(hasClerkServerConfiguration(environment), true);
});
