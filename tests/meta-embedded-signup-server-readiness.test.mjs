import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  inspectMetaEmbeddedSignupServerReadiness,
} from "../server/meta/metaEmbeddedSignupServerReadiness.ts";

const encryptionKey = Buffer.from(
  Array.from({ length: 32 }, (_, index) => index + 1),
).toString("base64");

const clientConfiguration = {
  META_APP_ID: "123456789",
  META_EMBEDDED_SIGNUP_CONFIGURATION_ID: "987654321",
  META_GRAPH_API_VERSION: "v21.0",
};

test("keeps a fully absent Embedded Signup server disabled", () => {
  assert.deepEqual(
    inspectMetaEmbeddedSignupServerReadiness({}),
    { status: "disabled" },
  );
});

test("requires the exchange secret and credential key before server execution", () => {
  assert.deepEqual(
    inspectMetaEmbeddedSignupServerReadiness(
      clientConfiguration,
    ),
    { status: "incomplete" },
  );
  assert.deepEqual(
    inspectMetaEmbeddedSignupServerReadiness({
      ...clientConfiguration,
      META_APP_SECRET: "configured-app-secret",
    }),
    { status: "incomplete" },
  );
  assert.deepEqual(
    inspectMetaEmbeddedSignupServerReadiness({
      ...clientConfiguration,
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    }),
    { status: "incomplete" },
  );
});

test("accepts only the complete server-side Embedded Signup configuration", () => {
  assert.deepEqual(
    inspectMetaEmbeddedSignupServerReadiness({
      ...clientConfiguration,
      META_APP_SECRET: "configured-app-secret",
      META_CREDENTIAL_ENCRYPTION_KEY_V1: encryptionKey,
    }),
    { status: "configured" },
  );
});

test("does not expose invalid secret values in readiness state", () => {
  const appSecret = "private-app-secret";
  const encryptionSecret = "private-invalid-key";
  const readiness =
    inspectMetaEmbeddedSignupServerReadiness({
      ...clientConfiguration,
      META_APP_SECRET: appSecret,
      META_CREDENTIAL_ENCRYPTION_KEY_V1:
        encryptionSecret,
    });

  assert.deepEqual(readiness, { status: "incomplete" });
  assert.doesNotMatch(
    JSON.stringify(readiness),
    new RegExp(`${appSecret}|${encryptionSecret}`),
  );
});

test("declares the credential key only as a server environment value", async () => {
  const exampleEnvironment = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  assert.match(
    exampleEnvironment,
    /^META_CREDENTIAL_ENCRYPTION_KEY_V1=$/m,
  );
  assert.doesNotMatch(
    exampleEnvironment,
    /NEXT_PUBLIC_META_CREDENTIAL/,
  );
});
