import assert from "node:assert/strict";
import test from "node:test";

import {
  resolvePublicOrigin,
} from "../server/operations/publicOrigin.ts";

test("accepts only a canonical HTTPS production origin", () => {
  assert.equal(
    resolvePublicOrigin({
      APP_PUBLIC_ORIGIN:
        "https://connect.example.com",
      NODE_ENV: "production",
    }),
    "https://connect.example.com",
  );
  assert.equal(
    resolvePublicOrigin({
      APP_PUBLIC_ORIGIN:
        "https://connect.example.com/",
      NODE_ENV: "production",
    }),
    "https://connect.example.com",
  );
});

test("rejects malicious or non-canonical public origins", () => {
  const candidates = [
    "https://user:password@connect.example.com",
    "https://connect.example.com/path",
    "https://connect.example.com?next=evil",
    "https://connect.example.com/#fragment",
    "javascript:alert(1)",
    "http://connect.example.com",
    "not-a-url",
  ];

  for (const APP_PUBLIC_ORIGIN of candidates) {
    assert.equal(
      resolvePublicOrigin({
        APP_PUBLIC_ORIGIN,
        NODE_ENV: "production",
      }),
      null,
    );
  }
});

test("allows HTTP localhost only in development", () => {
  assert.equal(
    resolvePublicOrigin({
      APP_PUBLIC_ORIGIN:
        "http://localhost:3000",
      NODE_ENV: "development",
    }),
    "http://localhost:3000",
  );
  assert.equal(
    resolvePublicOrigin({
      APP_PUBLIC_ORIGIN:
        "http://localhost:3000",
      NODE_ENV: "production",
    }),
    null,
  );
});
