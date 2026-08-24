import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveVercelOpaqueTraceContext,
} from "../server/platform/currentVercelOpaqueTraceContext.ts";

const encodedKey =
  "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY";

test("requires the opaque trace key and Vercel request identity in hosted environments", async () => {
  await assert.rejects(
    () => resolveVercelOpaqueTraceContext(
      { VERCEL_ENV: "production" },
      { readRequestId: async () => "fra1::request-1" },
    ),
    /configuration is required/,
  );
  await assert.rejects(
    () => resolveVercelOpaqueTraceContext(
      {
        VERCEL_ENV: "preview",
        CONNECT_TRACE_CONTEXT_HMAC_KEY: encodedKey,
      },
      { readRequestId: async () => null },
    ),
    /request identity is required/,
  );
});

test("derives hosted context but keeps local development optional", async () => {
  const hosted = await resolveVercelOpaqueTraceContext(
    {
      VERCEL_ENV: "production",
      CONNECT_TRACE_CONTEXT_HMAC_KEY: encodedKey,
    },
    { readRequestId: async () => "fra1::iad1::request-000001" },
  );
  assert.match(
    hosted.traceparent,
    /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
  );
  assert.equal(
    await resolveVercelOpaqueTraceContext(
      { VERCEL_ENV: "development" },
      { readRequestId: async () => null },
    ),
    null,
  );
  assert.equal(
    await resolveVercelOpaqueTraceContext(
      {},
      { readRequestId: async () => null },
    ),
    null,
  );
});

test("contains request header failures and rejects malformed inputs", async () => {
  await assert.rejects(
    () => resolveVercelOpaqueTraceContext(
      {
        VERCEL_ENV: "production",
        CONNECT_TRACE_CONTEXT_HMAC_KEY: encodedKey,
      },
      {
        async readRequestId() {
          throw new Error("private request state");
        },
      },
    ),
    (error) =>
      /request identity is unavailable/.test(error.message) &&
      !/private/.test(error.message),
  );
  await assert.rejects(
    () => resolveVercelOpaqueTraceContext(
      {
        VERCEL_ENV: "production",
        CONNECT_TRACE_CONTEXT_HMAC_KEY: encodedKey,
      },
      { readRequestId: async () => "browser supplied value" },
    ),
    /trace input is invalid/,
  );
});
