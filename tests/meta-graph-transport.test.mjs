import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaGraphTransport,
  MetaGraphError,
} from "../server/meta/metaGraphTransport.ts";
import {
  toSensitiveMetaAccessToken,
} from "../server/meta/metaPorts.ts";

const accessToken = toSensitiveMetaAccessToken(
  "transport-fixture-access-token",
);

test("sends Meta credentials only in the authorization header", async () => {
  const calls = [];
  const transport = createMetaGraphTransport(
    { apiVersion: "v21.0" },
    {
      async fetchImplementation(url, init) {
        calls.push({ url, init });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  );

  const result = await transport.requestJson({
    method: "POST",
    pathSegments: ["waba-fixture", "subscribed_apps"],
    accessToken,
    query: { override_callback_uri: "enabled" },
  });

  assert.deepEqual(result, { success: true });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url.toString(),
    "https://graph.facebook.com/v21.0/waba-fixture/subscribed_apps?override_callback_uri=enabled",
  );
  assert.equal(
    calls[0].init.headers.authorization,
    "Bearer transport-fixture-access-token",
  );
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.referrerPolicy, "no-referrer");
  assert.equal(
    calls[0].url.searchParams.has("access_token"),
    false,
  );
});

test("sends a bounded POST body as JSON without moving credentials into it", async () => {
  const calls = [];
  const transport = createMetaGraphTransport(
    { apiVersion: "v21.0" },
    {
      async fetchImplementation(url, init) {
        calls.push({ url, init });
        return new Response(
          JSON.stringify({
            id: "123456789",
            status: "PENDING",
            category: "UTILITY",
          }),
          { status: 200 },
        );
      },
    },
  );

  await transport.requestJson({
    method: "POST",
    pathSegments: ["123456789", "message_templates"],
    accessToken,
    jsonBody: {
      name: "service_update",
      language: "he",
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "עדכון שירות",
        },
      ],
    },
  });

  assert.equal(
    calls[0].init.headers["content-type"],
    "application/json",
  );
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    name: "service_update",
    language: "he",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "עדכון שירות",
      },
    ],
  });
  assert.doesNotMatch(
    calls[0].init.body,
    /transport-fixture-access-token/,
  );
});

test("rejects invalid, credential-bearing, and oversized JSON bodies before network access", async () => {
  let fetchCalls = 0;
  const transport = createMetaGraphTransport(
    { apiVersion: "v21.0" },
    {
      maxRequestBytes: 32,
      async fetchImplementation() {
        fetchCalls += 1;
        return new Response("{}");
      },
    },
  );

  await assert.rejects(
    transport.requestJson({
      method: "GET",
      pathSegments: ["123456789"],
      accessToken,
      jsonBody: {},
    }),
    (error) =>
      error instanceof MetaGraphError &&
      error.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    transport.requestJson({
      method: "POST",
      pathSegments: ["123456789"],
      accessToken,
      jsonBody: {
        nested: {
          access_token: "must-not-be-sent",
        },
      },
    }),
    (error) =>
      error instanceof MetaGraphError &&
      error.code === "INVALID_REQUEST",
  );
  await assert.rejects(
    transport.requestJson({
      method: "POST",
      pathSegments: ["123456789"],
      accessToken,
      jsonBody: {
        body: "x".repeat(64),
      },
    }),
    (error) =>
      error instanceof MetaGraphError &&
      error.code === "INVALID_REQUEST",
  );
  assert.equal(fetchCalls, 0);
});

test("rejects an access token query parameter before network access", async () => {
  let fetchCalls = 0;
  const transport = createMetaGraphTransport(
    { apiVersion: "v21.0" },
    {
      async fetchImplementation() {
        fetchCalls += 1;
        return new Response("{}");
      },
    },
  );

  await assert.rejects(
    transport.requestJson({
      method: "GET",
      pathSegments: ["waba-fixture"],
      accessToken,
      query: {
        access_token: "must-not-be-sent",
      },
    }),
    (error) =>
      error instanceof MetaGraphError &&
      error.code === "INVALID_REQUEST",
  );
  assert.equal(fetchCalls, 0);
});

test("sanitizes Meta API errors while retaining safe numeric codes", async () => {
  const responseSecret = "response-secret-must-not-leak";
  const transport = createMetaGraphTransport(
    { apiVersion: "v21.0" },
    {
      async fetchImplementation() {
        return new Response(
          JSON.stringify({
            error: {
              message: responseSecret,
              code: 190,
              error_subcode: 463,
            },
          }),
          {
            status: 401,
            headers: { "content-type": "application/json" },
          },
        );
      },
    },
  );

  await assert.rejects(
    transport.requestJson({
      method: "GET",
      pathSegments: ["waba-fixture"],
      accessToken,
    }),
    (error) => {
      assert.equal(error instanceof MetaGraphError, true);
      assert.equal(error.code, "API_ERROR");
      assert.equal(error.httpStatus, 401);
      assert.equal(error.graphCode, 190);
      assert.equal(error.graphSubcode, 463);
      assert.doesNotMatch(error.message, new RegExp(responseSecret));
      assert.doesNotMatch(
        JSON.stringify(error),
        /response-secret-must-not-leak|transport-fixture-access-token/,
      );
      return true;
    },
  );
});

test("rejects invalid and oversized Meta responses", async (context) => {
  await context.test("invalid JSON", async () => {
    const transport = createMetaGraphTransport(
      { apiVersion: "v21.0" },
      {
        async fetchImplementation() {
          return new Response("not-json", { status: 200 });
        },
      },
    );

    await assert.rejects(
      transport.requestJson({
        method: "GET",
        pathSegments: ["waba-fixture"],
        accessToken,
      }),
      (error) =>
        error instanceof MetaGraphError &&
        error.code === "INVALID_RESPONSE",
    );
  });

  await context.test("oversized body", async () => {
    const transport = createMetaGraphTransport(
      { apiVersion: "v21.0" },
      {
        maxResponseBytes: 8,
        async fetchImplementation() {
          return new Response('{"success":true}', {
            status: 200,
            headers: { "content-length": "16" },
          });
        },
      },
    );

    await assert.rejects(
      transport.requestJson({
        method: "GET",
        pathSegments: ["waba-fixture"],
        accessToken,
      }),
      (error) =>
        error instanceof MetaGraphError &&
        error.code === "INVALID_RESPONSE",
    );
  });
});

test("distinguishes deterministic timeout and network failures", async (context) => {
  await context.test("timeout", async () => {
    const transport = createMetaGraphTransport(
      { apiVersion: "v21.0" },
      {
        requestTimeoutMs: 1,
        fetchImplementation(_url, init) {
          return new Promise((_resolve, reject) => {
            init.signal.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            );
          });
        },
      },
    );

    await assert.rejects(
      transport.requestJson({
        method: "GET",
        pathSegments: ["waba-fixture"],
        accessToken,
      }),
      (error) =>
        error instanceof MetaGraphError &&
        error.code === "TIMEOUT",
    );
  });

  await context.test("network error", async () => {
    const transport = createMetaGraphTransport(
      { apiVersion: "v21.0" },
      {
        async fetchImplementation() {
          throw new Error("network fixture failure");
        },
      },
    );

    await assert.rejects(
      transport.requestJson({
        method: "GET",
        pathSegments: ["waba-fixture"],
        accessToken,
      }),
      (error) =>
        error instanceof MetaGraphError &&
        error.code === "NETWORK_ERROR",
    );
  });
});
