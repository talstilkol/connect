import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaAuthorizationCodeExchanger,
  MetaAuthorizationCodeExchangeError,
} from "../server/meta/metaAuthorizationCodeExchanger.ts";

const configuration = {
  appId: "123456789",
  appSecret: "fixture-app-secret",
  apiVersion: "v21.0",
};

test("exchanges a code through the fixed Meta OAuth endpoint", async () => {
  const calls = [];
  const exchanger = createMetaAuthorizationCodeExchanger(
    configuration,
    {
      async fetchImplementation(url, init) {
        calls.push({ url, init });
        return new Response(
          JSON.stringify({
            access_token: "fixture-business-access-token",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    },
  );

  const accessToken = await exchanger.exchangeAuthorizationCode(
    "fixture-authorization-code",
  );

  assert.equal(accessToken, "fixture-business-access-token");
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url.origin,
    "https://graph.facebook.com",
  );
  assert.equal(
    calls[0].url.pathname,
    "/v21.0/oauth/access_token",
  );
  assert.equal(
    calls[0].url.searchParams.get("client_id"),
    "123456789",
  );
  assert.equal(
    calls[0].url.searchParams.get("client_secret"),
    "fixture-app-secret",
  );
  assert.equal(
    calls[0].url.searchParams.get("code"),
    "fixture-authorization-code",
  );
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.referrerPolicy, "no-referrer");
});

test("rejects an invalid code before network access", async () => {
  let fetchCalls = 0;
  const exchanger = createMetaAuthorizationCodeExchanger(
    configuration,
    {
      async fetchImplementation() {
        fetchCalls += 1;
        return new Response("{}");
      },
    },
  );

  await assert.rejects(
    exchanger.exchangeAuthorizationCode(" "),
    (error) =>
      error instanceof MetaAuthorizationCodeExchangeError &&
      error.code === "INVALID_REQUEST",
  );
  assert.equal(fetchCalls, 0);
});

test("rejects invalid configuration before network access", () => {
  const appSecret = "configuration-secret-must-not-leak";

  assert.throws(
    () =>
      createMetaAuthorizationCodeExchanger({
        appId: "123456789",
        appSecret,
        apiVersion: "latest",
      }),
    (error) => {
      assert.match(error.message, /META_GRAPH_API_VERSION/);
      assert.doesNotMatch(error.message, new RegExp(appSecret));
      return true;
    },
  );
});

test("sanitizes rejected exchanges and keeps only safe numeric codes", async () => {
  const authorizationCode = "code-that-must-not-leak";
  const responseSecret = "response-that-must-not-leak";
  const exchanger = createMetaAuthorizationCodeExchanger(
    configuration,
    {
      async fetchImplementation() {
        return new Response(
          JSON.stringify({
            error: {
              message: responseSecret,
              code: 100,
              error_subcode: 36008,
            },
          }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        );
      },
    },
  );

  await assert.rejects(
    exchanger.exchangeAuthorizationCode(authorizationCode),
    (error) => {
      assert.equal(
        error instanceof MetaAuthorizationCodeExchangeError,
        true,
      );
      assert.equal(error.code, "EXCHANGE_REJECTED");
      assert.equal(error.httpStatus, 400);
      assert.equal(error.graphCode, 100);
      assert.equal(error.graphSubcode, 36008);
      assert.doesNotMatch(
        JSON.stringify(error),
        new RegExp(
          [
            authorizationCode,
            configuration.appSecret,
            responseSecret,
          ].join("|"),
        ),
      );
      return true;
    },
  );
});

test("rejects invalid and oversized Meta code exchange responses", async (context) => {
  await context.test("missing access token", async () => {
    const exchanger = createMetaAuthorizationCodeExchanger(
      configuration,
      {
        async fetchImplementation() {
          return new Response(JSON.stringify({ token_type: "bearer" }), {
            status: 200,
          });
        },
      },
    );

    await assert.rejects(
      exchanger.exchangeAuthorizationCode("fixture-code"),
      (error) =>
        error instanceof MetaAuthorizationCodeExchangeError &&
        error.code === "INVALID_RESPONSE",
    );
  });

  await context.test("invalid JSON", async () => {
    const exchanger = createMetaAuthorizationCodeExchanger(
      configuration,
      {
        async fetchImplementation() {
          return new Response("not-json", { status: 200 });
        },
      },
    );

    await assert.rejects(
      exchanger.exchangeAuthorizationCode("fixture-code"),
      (error) =>
        error instanceof MetaAuthorizationCodeExchangeError &&
        error.code === "INVALID_RESPONSE",
    );
  });

  await context.test("oversized body", async () => {
    const exchanger = createMetaAuthorizationCodeExchanger(
      configuration,
      {
        maxResponseBytes: 8,
        async fetchImplementation() {
          return new Response('{"access_token":"too-large"}', {
            status: 200,
            headers: { "content-length": "28" },
          });
        },
      },
    );

    await assert.rejects(
      exchanger.exchangeAuthorizationCode("fixture-code"),
      (error) =>
        error instanceof MetaAuthorizationCodeExchangeError &&
        error.code === "INVALID_RESPONSE",
    );
  });
});

test("distinguishes deterministic timeout and network failures", async (context) => {
  await context.test("timeout", async () => {
    const exchanger = createMetaAuthorizationCodeExchanger(
      configuration,
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
      exchanger.exchangeAuthorizationCode("fixture-code"),
      (error) =>
        error instanceof MetaAuthorizationCodeExchangeError &&
        error.code === "TIMEOUT",
    );
  });

  await context.test("response body timeout", async () => {
    const exchanger = createMetaAuthorizationCodeExchanger(
      configuration,
      {
        requestTimeoutMs: 1,
        async fetchImplementation(_url, init) {
          const body = new ReadableStream({
            start(controller) {
              init.signal.addEventListener(
                "abort",
                () => controller.error(new Error("aborted")),
                { once: true },
              );
            },
          });

          return new Response(body, { status: 200 });
        },
      },
    );

    await assert.rejects(
      exchanger.exchangeAuthorizationCode("fixture-code"),
      (error) =>
        error instanceof MetaAuthorizationCodeExchangeError &&
        error.code === "TIMEOUT",
    );
  });

  await context.test("network error", async () => {
    const exchanger = createMetaAuthorizationCodeExchanger(
      configuration,
      {
        async fetchImplementation() {
          throw new Error("fixture network failure");
        },
      },
    );

    await assert.rejects(
      exchanger.exchangeAuthorizationCode("fixture-code"),
      (error) =>
        error instanceof MetaAuthorizationCodeExchangeError &&
        error.code === "NETWORK_ERROR",
    );
  });
});
