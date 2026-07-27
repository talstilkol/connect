import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaEmbeddedSignupAttemptCoordinator,
  launchMetaEmbeddedSignup,
  MetaEmbeddedSignupClientError,
  parseMetaEmbeddedSignupLoginResponse,
  parseMetaEmbeddedSignupMessage,
  subscribeToMetaEmbeddedSignupMessages,
} from "../features/workspace/metaEmbeddedSignupClient.ts";

function metaMessage(payload, origin = "https://business.facebook.com") {
  return {
    origin,
    data: JSON.stringify(payload),
  };
}

test("parses the standard Embedded Signup v4 completion contract", () => {
  const result = parseMetaEmbeddedSignupMessage(
    metaMessage({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: {
        business_id: "101",
        waba_id: "202",
        phone_number_id: "303",
      },
    }),
  );

  assert.deepEqual(result, {
    status: "finished",
    assets: {
      businessPortfolioId: "101",
      wabaId: "202",
      phoneNumberId: "303",
    },
  });
});

test("ignores messages outside the exact HTTPS facebook.com boundary", () => {
  const payload = {
    type: "WA_EMBEDDED_SIGNUP",
    event: "FINISH",
    data: {
      business_id: "101",
      waba_id: "202",
      phone_number_id: "303",
    },
  };

  for (const origin of [
    "https://notfacebook.com",
    "http://business.facebook.com",
    "https://business.facebook.com:8443",
    "not-an-origin",
  ]) {
    assert.deepEqual(
      parseMetaEmbeddedSignupMessage(
        metaMessage(payload, origin),
      ),
      { status: "ignored" },
    );
  }
});

test("rejects malformed, oversized, and non-string Meta messages", () => {
  for (const data of [
    "{",
    "",
    "x".repeat(65_537),
    {
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: {},
    },
  ]) {
    assert.deepEqual(
      parseMetaEmbeddedSignupMessage({
        origin: "https://www.facebook.com",
        data,
      }),
      { status: "invalid" },
    );
  }
});

test("rejects invalid asset identifiers and ignores unrelated trusted messages", () => {
  assert.deepEqual(
    parseMetaEmbeddedSignupMessage(
      metaMessage({
        type: "WA_EMBEDDED_SIGNUP",
        event: "FINISH",
        data: {
          business_id: "101",
          waba_id: "invalid",
          phone_number_id: "303",
        },
      }),
    ),
    { status: "invalid" },
  );

  assert.deepEqual(
    parseMetaEmbeddedSignupMessage(
      metaMessage({
        type: "UNRELATED_EVENT",
        event: "FINISH",
        data: {},
      }),
    ),
    { status: "ignored" },
  );
});

test("maps cancellation and provider errors without exposing message or session data", () => {
  const cancelled = parseMetaEmbeddedSignupMessage(
    metaMessage({
      type: "WA_EMBEDDED_SIGNUP",
      event: "CANCEL",
      data: {
        current_step: "PHONE_NUMBER",
      },
    }),
  );
  const providerError = parseMetaEmbeddedSignupMessage(
    metaMessage({
      type: "WA_EMBEDDED_SIGNUP",
      event: "CANCEL",
      data: {
        error_message: "provider detail must remain private",
        error_code: 1404163,
        session_id: "private-session",
        timestamp: "private-timestamp",
      },
    }),
  );

  assert.deepEqual(cancelled, { status: "cancelled" });
  assert.deepEqual(providerError, {
    status: "reported-error",
    errorCode: "1404163",
  });
  assert.doesNotMatch(
    JSON.stringify(providerError),
    /provider|session|timestamp|private/i,
  );
});

test("fails closed for supported Meta finish variants outside the MVP flow", () => {
  for (const event of [
    "FINISH_ONLY_WABA",
    "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
    "FINISH_OBO_MIGRATION",
    "FINISH_GRANT_ONLY_API_ACCESS",
  ]) {
    assert.deepEqual(
      parseMetaEmbeddedSignupMessage(
        metaMessage({
          type: "WA_EMBEDDED_SIGNUP",
          event,
          data: {},
        }),
      ),
      {
        status: "unsupported-finish",
        event,
      },
    );
  }

  assert.deepEqual(
    parseMetaEmbeddedSignupMessage(
      metaMessage({
        type: "WA_EMBEDDED_SIGNUP",
        event: "FINISH",
        data: {
          business_id: "101",
          waba_id: "202",
          phone_number_id: "303",
          waba_ids: ["202", "404"],
        },
      }),
    ),
    {
      status: "unsupported-finish",
      event: "FINISH",
    },
  );
});

test("parses only a bounded, exact authorization code response", () => {
  assert.deepEqual(
    parseMetaEmbeddedSignupLoginResponse({
      authResponse: {
        code: "authorization-code",
      },
    }),
    {
      status: "authorized",
      authorizationCode: "authorization-code",
    },
  );
  assert.deepEqual(
    parseMetaEmbeddedSignupLoginResponse({
      status: "unknown",
    }),
    { status: "cancelled" },
  );

  for (const response of [
    null,
    { authResponse: null },
    { authResponse: {} },
    { authResponse: { code: " code-with-whitespace " } },
    { authResponse: { code: "x".repeat(4_097) } },
  ]) {
    assert.deepEqual(
      parseMetaEmbeddedSignupLoginResponse(response),
      { status: "invalid" },
    );
  }
});

test("launches FB.login with the exact Embedded Signup v4 options", () => {
  const loginCalls = [];
  const results = [];
  const sdk = {
    init() {},
    login(callback, options) {
      loginCalls.push(options);
      callback({
        authResponse: {
          code: "authorization-code",
        },
      });
    },
  };

  launchMetaEmbeddedSignup(
    sdk,
    "909",
    (result) => results.push(result),
  );

  assert.deepEqual(loginCalls, [
    {
      config_id: "909",
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
      },
    },
  ]);
  assert.deepEqual(results, [
    {
      status: "authorized",
      authorizationCode: "authorization-code",
    },
  ]);
});

test("rejects invalid launch configuration and sanitized SDK failures", () => {
  const sdk = {
    init() {},
    login() {
      throw new Error("private provider failure");
    },
  };

  assert.throws(
    () =>
      launchMetaEmbeddedSignup(
        sdk,
        "invalid-configuration",
        () => {},
      ),
    (error) =>
      error instanceof MetaEmbeddedSignupClientError &&
      error.code === "INVALID_CONFIGURATION",
  );

  assert.throws(
    () =>
      launchMetaEmbeddedSignup(sdk, "909", () => {}),
    (error) => {
      assert.equal(
        error instanceof MetaEmbeddedSignupClientError,
        true,
      );
      assert.equal(error.code, "LAUNCH_FAILED");
      assert.doesNotMatch(
        JSON.stringify(error),
        /private|provider failure/i,
      );
      return true;
    },
  );
});

test("subscribes to trusted messages and removes the listener exactly once", () => {
  const listeners = new Set();
  const target = {
    addEventListener(type, listener) {
      assert.equal(type, "message");
      listeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, "message");
      listeners.delete(listener);
    },
  };
  const results = [];
  const unsubscribe = subscribeToMetaEmbeddedSignupMessages(
    target,
    (result) => results.push(result),
  );

  assert.equal(listeners.size, 1);
  const listener = [...listeners][0];
  listener({
    origin: "https://notfacebook.com",
    data: "{}",
  });
  listener(
    metaMessage({
      type: "WA_EMBEDDED_SIGNUP",
      event: "CANCEL",
      data: {
        current_step: "PHONE_NUMBER",
      },
    }),
  );

  assert.deepEqual(results, [{ status: "cancelled" }]);

  unsubscribe();
  assert.equal(listeners.size, 0);
});

test("coordinates authorization and assets in either arrival order exactly once", () => {
  for (const loginFirst of [true, false]) {
    const results = [];
    const coordinator =
      createMetaEmbeddedSignupAttemptCoordinator(
        (result) => results.push(result),
      );
    const loginResult = {
      status: "authorized",
      authorizationCode: "authorization-code",
    };
    const messageResult = {
      status: "finished",
      assets: {
        businessPortfolioId: "101",
        wabaId: "202",
        phoneNumberId: "303",
      },
    };

    if (loginFirst) {
      coordinator.acceptLoginResult(loginResult);
      coordinator.acceptMessageResult(messageResult);
    } else {
      coordinator.acceptMessageResult(messageResult);
      coordinator.acceptLoginResult(loginResult);
    }

    coordinator.acceptLoginResult(loginResult);
    coordinator.acceptMessageResult(messageResult);

    assert.equal(coordinator.isSettled(), true);
    assert.deepEqual(results, [
      {
        status: "ready",
        input: {
          authorizationCode: "authorization-code",
          businessPortfolioId: "101",
          wabaId: "202",
          phoneNumberId: "303",
        },
      },
    ]);
  }
});

test("maps cancellation and unsupported flows before server submission", () => {
  const cases = [
    {
      apply(coordinator) {
        coordinator.acceptLoginResult({
          status: "cancelled",
        });
      },
      expected: "client-cancelled",
    },
    {
      apply(coordinator) {
        coordinator.acceptMessageResult({
          status: "cancelled",
        });
      },
      expected: "client-cancelled",
    },
    {
      apply(coordinator) {
        coordinator.acceptMessageResult({
          status: "unsupported-finish",
          event: "FINISH_ONLY_WABA",
        });
      },
      expected: "unsupported-flow",
    },
    {
      apply(coordinator) {
        coordinator.acceptMessageResult({
          status: "reported-error",
          errorCode: "1404163",
        });
      },
      expected: "client-error",
    },
  ];

  for (const fixture of cases) {
    const results = [];
    const coordinator =
      createMetaEmbeddedSignupAttemptCoordinator(
        (result) => results.push(result),
      );

    fixture.apply(coordinator);

    assert.deepEqual(results, [
      { status: fixture.expected },
    ]);
  }
});

test("expires an incomplete attempt and ignores every late result", () => {
  const results = [];
  const coordinator =
    createMetaEmbeddedSignupAttemptCoordinator(
      (result) => results.push(result),
    );

  coordinator.acceptLoginResult({
    status: "authorized",
    authorizationCode: "authorization-code",
  });
  coordinator.expire();
  coordinator.acceptMessageResult({
    status: "finished",
    assets: {
      businessPortfolioId: "101",
      wabaId: "202",
      phoneNumberId: "303",
    },
  });

  assert.equal(coordinator.isSettled(), true);
  assert.deepEqual(results, [
    { status: "client-error" },
  ]);
});
