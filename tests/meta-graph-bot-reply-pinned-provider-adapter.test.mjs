import assert from "node:assert/strict";
import test from "node:test";

import * as adapterModule from
  "../server/meta/metaGraphBotReplyPinnedProviderAdapter.ts";

const {
  createMetaGraphBotReplyPinnedProviderAdapter,
  MetaGraphBotReplyPinnedProviderAdapterError,
  metaGraphBotReplyPinnedProviderAdapterStatus,
} = adapterModule;

const clockInstant = "2026-08-26T12:00:00.000Z";
const validSendBefore = "2026-08-26T12:00:15.000Z";
const firstOptionKey = `bot_option_v1_${"a".repeat(64)}`;
const secondOptionKey = `bot_option_v1_${"b".repeat(64)}`;

function acceptedResponse(overrides = {}) {
  return new Response(JSON.stringify({
    contacts: [{ input: "972501234567", wa_id: "972501234567" }],
    messages: [{ id: "wamid.accepted-fixture", status: "accepted" }],
    messaging_product: "whatsapp",
    ...overrides,
  }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function graphErrorResponse(code, options = {}) {
  return new Response(JSON.stringify({
    error: {
      code,
      error_data: { details: "must not escape the adapter" },
      fbtrace_id: "trace-fixture",
      message: "must not escape the adapter",
      type: "OAuthException",
    },
  }), {
    headers: options.headers,
    status: options.status ?? 400,
  });
}

function validFixture(overrides = {}) {
  const fetchCalls = [];
  const clockCalls = [];
  const clock = overrides.clock ?? {
    now() {
      clockCalls.push("now");
      return new Date(clockInstant);
    },
  };
  const fetchImplementation = overrides.fetchImplementation ??
    (async (url, init) => {
      fetchCalls.push({ init, url });
      return acceptedResponse();
    });
  const input = {
    accessToken: "meta-access-token-fixture",
    apiVersion: "v25.0",
    clock,
    fetchImplementation,
    pairFailureExponent: 0,
    phoneNumberId: "123456789",
    recipientPhoneNumber: "+972501234567",
    reply: {
      kind: "text",
      text: "תשובת שירות",
    },
    ...overrides,
  };
  return { clockCalls, fetchCalls, input };
}

function invocation(sendBefore = validSendBefore) {
  return {
    automaticRetryPolicy: "forbidden",
    sendBefore,
  };
}

function assertErrorCode(error, code) {
  assert.equal(
    error instanceof MetaGraphBotReplyPinnedProviderAdapterError,
    true,
  );
  assert.equal(error.code, code);
  assert.equal(
    error.message,
    `Meta pinned provider adapter failed: ${code}`,
  );
  assert.equal(Object.hasOwn(error, "cause"), false);
  return true;
}

function assertConstructionError(action, code) {
  assert.throws(action, (error) => assertErrorCode(error, code));
}

async function assertSendError(action, code) {
  await assert.rejects(action, (error) => assertErrorCode(error, code));
}

test("exports only the dormant reviewed adapter surface", () => {
  assert.deepEqual(Object.keys(adapterModule).sort(), [
    "MetaGraphBotReplyPinnedProviderAdapterError",
    "createMetaGraphBotReplyPinnedProviderAdapter",
    "metaGraphBotReplyPinnedProviderAdapterStatus",
  ]);
  assert.deepEqual(metaGraphBotReplyPinnedProviderAdapterStatus, {
    activationAllowed: false,
    adapterStatus: "dormant",
    automaticRetryPolicy: "forbidden",
    graphApiVersion: "v25.0",
    providerBindingStatus: "unproven",
    runtimeImporters: 0,
  });
  assert.equal(
    Object.isFrozen(metaGraphBotReplyPinnedProviderAdapterStatus),
    true,
  );
});

test("binds a text request without construction I/O and sends once", async () => {
  const fixture = validFixture();
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);

  assert.deepEqual(fixture.clockCalls, []);
  assert.deepEqual(fixture.fetchCalls, []);
  assert.equal(Object.isFrozen(adapter), true);
  assert.deepEqual(Object.keys(adapter), ["sendOnce"]);

  const controller = new AbortController();
  const result = await adapter.sendOnce(
    invocation(),
    controller.signal,
  );

  assert.deepEqual(result, {
    outcome: "accepted",
    providerMessageId: "wamid.accepted-fixture",
  });
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(fixture.clockCalls, ["now"]);
  assert.equal(fixture.fetchCalls.length, 1);
  const [{ init, url }] = fixture.fetchCalls;
  assert.equal(
    url,
    "https://graph.facebook.com/v25.0/123456789/messages",
  );
  assert.equal(init.method, "POST");
  assert.equal(init.redirect, "error");
  assert.equal(init.cache, "no-store");
  assert.equal(init.credentials, "omit");
  assert.equal(init.referrerPolicy, "no-referrer");
  assert.equal(init.signal, controller.signal);
  assert.deepEqual(init.headers, {
    accept: "application/json",
    authorization: "Bearer meta-access-token-fixture",
    "content-type": "application/json",
  });
  assert.equal(Object.isFrozen(init), true);
  assert.equal(Object.isFrozen(init.headers), true);
  assert.deepEqual(JSON.parse(init.body), {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    text: {
      body: "תשובת שירות",
      preview_url: false,
    },
    to: "972501234567",
    type: "text",
  });
  assert.equal(init.body.includes("meta-access-token-fixture"), false);

  await assertSendError(
    () => adapter.sendOnce(invocation(), new AbortController().signal),
    "provider-binding-already-used",
  );
  assert.equal(fixture.fetchCalls.length, 1);
});

test("creates the canonical buttons payload from a defensive snapshot", async () => {
  const firstOption = {
    label: "אישור",
    optionKey: firstOptionKey,
  };
  const secondOption = {
    label: "נציג",
    optionKey: secondOptionKey,
  };
  const reply = {
    kind: "buttons",
    options: [firstOption, secondOption],
    text: "איך להמשיך?",
  };
  const fixture = validFixture({ reply });
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);

  firstOption.label = "שונה לאחר הבנייה";
  secondOption.optionKey = firstOptionKey;
  reply.text = "שונה לאחר הבנייה";
  fixture.input.accessToken = "changed-after-construction";
  fixture.input.phoneNumberId = "987654321";
  fixture.input.recipientPhoneNumber = "+972509999999";
  fixture.input.clock.now = () => new Date("2030-01-01T00:00:00.000Z");

  await adapter.sendOnce(invocation(), new AbortController().signal);
  assert.equal(fixture.fetchCalls.length, 1);
  const [{ init, url }] = fixture.fetchCalls;
  assert.equal(
    url,
    "https://graph.facebook.com/v25.0/123456789/messages",
  );
  assert.equal(
    init.headers.authorization,
    "Bearer meta-access-token-fixture",
  );
  assert.deepEqual(JSON.parse(init.body), {
    interactive: {
      action: {
        buttons: [
          {
            reply: { id: firstOptionKey, title: "אישור" },
            type: "reply",
          },
          {
            reply: { id: secondOptionKey, title: "נציג" },
            type: "reply",
          },
        ],
      },
      body: { text: "איך להמשיך?" },
      type: "button",
    },
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "972501234567",
    type: "interactive",
  });
});

test("rejects version, identity, token, exponent and reply violations", () => {
  const cases = [
    { apiVersion: "v24.0" },
    { accessToken: " token-with-whitespace " },
    { pairFailureExponent: -1 },
    { pairFailureExponent: 9 },
    { pairFailureExponent: 0.5 },
    { phoneNumberId: "0123" },
    { recipientPhoneNumber: "0501234567" },
    { reply: { kind: "text", text: "" } },
    { reply: { kind: "text", text: "x", extra: true } },
    { reply: { kind: "buttons", options: [], text: "בחר" } },
    {
      reply: {
        kind: "buttons",
        options: [
          { label: "אותו דבר", optionKey: firstOptionKey },
          { label: "אותו דבר", optionKey: secondOptionKey },
        ],
        text: "בחר",
      },
    },
    {
      reply: {
        kind: "buttons",
        options: [{
          extra: true,
          label: "אישור",
          optionKey: firstOptionKey,
        }],
        text: "בחר",
      },
    },
  ];

  for (const overrides of cases) {
    const fixture = validFixture(overrides);
    assertConstructionError(
      () => createMetaGraphBotReplyPinnedProviderAdapter(fixture.input),
      "invalid-bound-request",
    );
    assert.deepEqual(fixture.fetchCalls, []);
    assert.deepEqual(fixture.clockCalls, []);
  }
});

test("rejects proxy, accessor, symbol, prototype, missing and extra input", () => {
  const fixtures = [];
  const proxied = validFixture();
  fixtures.push({
    expected: "invalid-dependencies",
    fixture: proxied,
    input: new Proxy(proxied.input, {}),
  });

  const accessor = validFixture();
  let accessorReads = 0;
  Object.defineProperty(accessor.input, "reply", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return { kind: "text", text: "אסור לקרוא" };
    },
  });
  fixtures.push({
    expected: "invalid-dependencies",
    fixture: accessor,
    input: accessor.input,
  });

  const symbol = validFixture();
  Object.defineProperty(symbol.input, Symbol("unexpected"), {
    enumerable: true,
    value: true,
  });
  fixtures.push({
    expected: "invalid-dependencies",
    fixture: symbol,
    input: symbol.input,
  });

  const extra = validFixture();
  extra.input.extra = true;
  fixtures.push({
    expected: "invalid-dependencies",
    fixture: extra,
    input: extra.input,
  });

  const missing = validFixture();
  delete missing.input.reply;
  fixtures.push({
    expected: "invalid-dependencies",
    fixture: missing,
    input: missing.input,
  });

  const prototype = validFixture();
  fixtures.push({
    expected: "invalid-dependencies",
    fixture: prototype,
    input: Object.assign(Object.create({ inherited: true }), prototype.input),
  });

  const nestedProxy = validFixture({
    reply: new Proxy({ kind: "text", text: "תשובה" }, {}),
  });
  fixtures.push({
    expected: "invalid-bound-request",
    fixture: nestedProxy,
    input: nestedProxy.input,
  });

  for (const item of fixtures) {
    assertConstructionError(
      () => createMetaGraphBotReplyPinnedProviderAdapter(item.input),
      item.expected,
    );
    assert.deepEqual(item.fixture.fetchCalls, []);
    assert.deepEqual(item.fixture.clockCalls, []);
  }
  assert.equal(accessorReads, 0);
});

test("rejects invalid invocation records and consumes the one-shot binding", async () => {
  const invalidInvocations = [];
  invalidInvocations.push({
    automaticRetryPolicy: "allowed",
    sendBefore: validSendBefore,
  });
  invalidInvocations.push({
    automaticRetryPolicy: "forbidden",
    extra: true,
    sendBefore: validSendBefore,
  });
  const withSymbol = invocation();
  withSymbol[Symbol("unexpected")] = true;
  invalidInvocations.push(withSymbol);
  const withAccessor = invocation();
  let accessorReads = 0;
  Object.defineProperty(withAccessor, "sendBefore", {
    enumerable: true,
    get() {
      accessorReads += 1;
      return validSendBefore;
    },
  });
  invalidInvocations.push(withAccessor);
  invalidInvocations.push(new Proxy(invocation(), {}));

  for (const invalid of invalidInvocations) {
    const fixture = validFixture();
    const adapter = createMetaGraphBotReplyPinnedProviderAdapter(
      fixture.input,
    );
    await assertSendError(
      () => adapter.sendOnce(invalid, new AbortController().signal),
      "invalid-invocation",
    );
    await assertSendError(
      () => adapter.sendOnce(invocation(), new AbortController().signal),
      "provider-binding-already-used",
    );
    assert.equal(fixture.fetchCalls.length, 0);
  }
  assert.equal(accessorReads, 0);
});

test("enforces the local deadline and abort state before fetch", async () => {
  const cases = [
    {
      controller: new AbortController(),
      sendBefore: clockInstant,
    },
    {
      controller: new AbortController(),
      sendBefore: "2026-08-26T12:00:15.001Z",
    },
  ];
  const abortedController = new AbortController();
  abortedController.abort("test-only-abort");
  cases.push({ controller: abortedController, sendBefore: validSendBefore });

  for (const item of cases) {
    const fixture = validFixture();
    const adapter = createMetaGraphBotReplyPinnedProviderAdapter(
      fixture.input,
    );
    await assertSendError(
      () => adapter.sendOnce(
        invocation(item.sendBefore),
        item.controller.signal,
      ),
      "provider-boundary-expired",
    );
    assert.equal(fixture.fetchCalls.length, 0);
    assert.deepEqual(fixture.clockCalls, ["now"]);
  }

  let poisonedDateMethodReads = 0;
  const clockValue = new Date(clockInstant);
  Object.defineProperty(clockValue, "getTime", {
    get() {
      poisonedDateMethodReads += 1;
      throw new Error("the adapter must use the native Date brand method");
    },
  });
  const fixture = validFixture({
    clock: {
      now() {
        fixture.clockCalls.push("now");
        return clockValue;
      },
    },
  });
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);
  await adapter.sendOnce(invocation(), new AbortController().signal);
  assert.equal(poisonedDateMethodReads, 0);
  assert.equal(fixture.fetchCalls.length, 1);
});

test("requires the exact native AbortSignal and returns only bounded errors", async () => {
  const invalidSignals = [
    {},
    new Proxy(new AbortController().signal, {}),
    Object.create(AbortSignal.prototype),
  ];

  for (const signal of invalidSignals) {
    const fixture = validFixture();
    const adapter = createMetaGraphBotReplyPinnedProviderAdapter(
      fixture.input,
    );
    await assertSendError(
      () => adapter.sendOnce(invocation(), signal),
      "invalid-invocation",
    );
    assert.equal(fixture.fetchCalls.length, 0);
  }
});

test("rejects post-construction Web API global spoofing", async () => {
  const originalGlobals = {
    Headers: globalThis.Headers,
    ReadableStream: globalThis.ReadableStream,
    Response: globalThis.Response,
  };
  const bytes = new TextEncoder().encode(JSON.stringify({
    messages: [{ id: "wamid.spoofed" }],
    messaging_product: "whatsapp",
  }));
  const fixture = validFixture({
    async fetchImplementation() {
      class SpoofHeaders {}
      SpoofHeaders.prototype.get = function get() {
        return null;
      };
      class SpoofReadableStream {}
      SpoofReadableStream.prototype.getReader = function getReader() {
        let completed = false;
        return {
          async cancel() {},
          async read() {
            if (completed) return { done: true };
            completed = true;
            return { done: false, value: bytes };
          },
        };
      };
      class SpoofResponse {}
      Object.defineProperties(SpoofResponse.prototype, {
        body: {
          configurable: true,
          get() {
            return new SpoofReadableStream();
          },
        },
        headers: {
          configurable: true,
          get() {
            return new SpoofHeaders();
          },
        },
        status: {
          configurable: true,
          get() {
            return 200;
          },
        },
      });
      globalThis.Headers = SpoofHeaders;
      globalThis.ReadableStream = SpoofReadableStream;
      globalThis.Response = SpoofResponse;
      return new SpoofResponse();
    },
  });
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);
  let thrown;
  try {
    await adapter.sendOnce(invocation(), new AbortController().signal);
  } catch (error) {
    thrown = error;
  } finally {
    globalThis.Headers = originalGlobals.Headers;
    globalThis.ReadableStream = originalGlobals.ReadableStream;
    globalThis.Response = originalGlobals.Response;
  }

  assertErrorCode(thrown, "provider-outcome-unknown");
});

test("uses module-evaluation intrinsics after prototype mutation", async () => {
  const response = acceptedResponse({
    messages: [{ id: "wamid.captured-intrinsics" }],
  });
  const fixture = validFixture({
    async fetchImplementation(url, init) {
      fixture.fetchCalls.push({ init, url });
      return response;
    },
  });
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);
  const controller = new AbortController();
  const targets = [
    [Reflect, "apply"],
    [Date, "parse"],
    [Date.prototype, "getTime"],
    [Date.prototype, "toISOString"],
    [AbortSignal.prototype, "aborted"],
    [Response.prototype, "status"],
    [Response.prototype, "headers"],
    [Response.prototype, "body"],
    [Headers.prototype, "get"],
    [ReadableStream.prototype, "getReader"],
    [ReadableStreamDefaultReader.prototype, "read"],
    [ReadableStreamDefaultReader.prototype, "cancel"],
    [TextEncoder.prototype, "encode"],
    [TextDecoder.prototype, "decode"],
    [JSON, "parse"],
  ];
  const descriptors = targets.map(([target, key]) => [
    target,
    key,
    Object.getOwnPropertyDescriptor(target, key),
  ]);
  const poisonedMethod = function poisonedMethod() {
    throw new Error("post-construction intrinsic mutation");
  };
  let result;
  let thrown;

  try {
    for (const [target, key] of targets) {
      const current = Object.getOwnPropertyDescriptor(target, key);
      Object.defineProperty(
        target,
        key,
        current && "get" in current
          ? {
            ...current,
            get: key === "aborted" ? () => false : poisonedMethod,
          }
          : {
            ...current,
            value: poisonedMethod,
          },
      );
    }
    result = await adapter.sendOnce(invocation(), controller.signal);
  } catch (error) {
    thrown = error;
  } finally {
    for (const [target, key, descriptor] of descriptors) {
      Object.defineProperty(target, key, descriptor);
    }
  }

  assert.equal(thrown, undefined);
  assert.deepEqual(result, {
    outcome: "accepted",
    providerMessageId: "wamid.captured-intrinsics",
  });
  assert.equal(fixture.fetchCalls.length, 1);
  assert.equal(fixture.fetchCalls[0].init.signal, controller.signal);
});

test("uses the native typed-array byte length instead of an own spoof", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({
    messages: [{ id: "wamid.must-not-be-accepted" }],
    messaging_product: "whatsapp",
    padding: "x".repeat(65_536),
  }));
  Object.defineProperty(bytes, "byteLength", {
    configurable: true,
    get() {
      return 1;
    },
  });
  const fixture = validFixture({
    async fetchImplementation() {
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }), { status: 200 });
    },
  });
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);

  await assertSendError(
    () => adapter.sendOnce(invocation(), new AbortController().signal),
    "provider-outcome-unknown",
  );
});

test("maps only exact Meta acceptance and keeps response extras bounded", async () => {
  const fixture = validFixture({
    async fetchImplementation(url, init) {
      fixture.fetchCalls.push({ init, url });
      return acceptedResponse({
        documented_extra: "ignored",
        messages: [{ id: "wamid.exact-acceptance", extra: "ignored" }],
      });
    },
  });
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);

  const result = await adapter.sendOnce(
    invocation(),
    new AbortController().signal,
  );
  assert.deepEqual(result, {
    outcome: "accepted",
    providerMessageId: "wamid.exact-acceptance",
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "outcome",
    "providerMessageId",
  ]);
});

test("maps 130429 only with an actual canonical numeric Retry-After", async () => {
  const fixture = validFixture({
    async fetchImplementation(url, init) {
      fixture.fetchCalls.push({ init, url });
      return graphErrorResponse(130_429, {
        headers: { "retry-after": "17" },
      });
    },
  });
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);
  const result = await adapter.sendOnce(
    invocation(),
    new AbortController().signal,
  );

  assert.deepEqual(result, {
    outcome: "sender-deferred",
    providerErrorCode: 130_429,
    retryAfterSeconds: 17,
  });
  assert.equal(Object.isFrozen(result), true);

  for (const retryAfter of [null, "0", "00017", "86401", "1.5", "17, 18"]) {
    let calls = 0;
    const invalid = validFixture({
      async fetchImplementation() {
        calls += 1;
        return graphErrorResponse(130_429, {
          headers: retryAfter === null
            ? undefined
            : { "retry-after": retryAfter },
        });
      },
    });
    const invalidAdapter = createMetaGraphBotReplyPinnedProviderAdapter(
      invalid.input,
    );
    await assertSendError(
      () => invalidAdapter.sendOnce(
        invocation(),
        new AbortController().signal,
      ),
      "provider-outcome-unknown",
    );
    assert.equal(calls, 1);
  }
});

test("maps 131056 from only the durable pair exponent", async () => {
  for (const [pairFailureExponent, expectedSeconds] of [
    [0, 1],
    [3, 64],
    [8, 65_536],
  ]) {
    let calls = 0;
    const fixture = validFixture({
      pairFailureExponent,
      async fetchImplementation() {
        calls += 1;
        return graphErrorResponse(131_056, {
          headers: { "retry-after": "7" },
        });
      },
    });
    const adapter = createMetaGraphBotReplyPinnedProviderAdapter(
      fixture.input,
    );
    const result = await adapter.sendOnce(
      invocation(),
      new AbortController().signal,
    );
    assert.deepEqual(result, {
      outcome: "pair-deferred",
      providerErrorCode: 131_056,
      retryAfterSeconds: expectedSeconds,
    });
    assert.equal(calls, 1);
  }
});

test("maps 131047 as a terminal service-window fact", async () => {
  let calls = 0;
  const fixture = validFixture({
    async fetchImplementation() {
      calls += 1;
      return graphErrorResponse(131_047);
    },
  });
  const adapter = createMetaGraphBotReplyPinnedProviderAdapter(fixture.input);
  const result = await adapter.sendOnce(
    invocation(),
    new AbortController().signal,
  );

  assert.deepEqual(result, {
    outcome: "service-window-rejected",
    providerErrorCode: 131_047,
  });
  assert.equal(calls, 1);
});

test("keeps network, HTTP, malformed and oversized outcomes unknown", async () => {
  const cases = [
    async () => {
      throw new Error("network detail must not escape");
    },
    async () => new Response(JSON.stringify({ error: { code: 131_047 } }), {
      status: 503,
    }),
    async () => new Response("{", { status: 200 }),
    async () => acceptedResponse({
      messages: [{ id: "not-a-wamid" }],
    }),
    async () => new Response("x".repeat(65_537), { status: 500 }),
    async () => Object.create(Response.prototype),
  ];

  for (const fetchImplementation of cases) {
    let calls = 0;
    const fixture = validFixture({
      async fetchImplementation(...arguments_) {
        calls += 1;
        return fetchImplementation(...arguments_);
      },
    });
    const adapter = createMetaGraphBotReplyPinnedProviderAdapter(
      fixture.input,
    );
    await assertSendError(
      () => adapter.sendOnce(
        invocation(),
        new AbortController().signal,
      ),
      "provider-outcome-unknown",
    );
    assert.equal(calls, 1);
    await assertSendError(
      () => adapter.sendOnce(
        invocation(),
        new AbortController().signal,
      ),
      "provider-binding-already-used",
    );
    assert.equal(calls, 1);
  }
});
