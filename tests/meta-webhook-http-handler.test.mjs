import assert from "node:assert/strict";
import test from "node:test";

import {
  MetaWebhookEnvelopeError,
} from "../server/meta/metaWebhookEnvelope.ts";
import {
  createMetaWebhookHttpHandler,
} from "../server/meta/metaWebhookHttpHandler.ts";
import {
  MetaWebhookIngressError,
} from "../server/meta/metaWebhookIngress.ts";

const verifyToken = "configured-verify-token";
const signatureHeader = `sha256=${"a".repeat(64)}`;

function postRequest(
  body,
  headers = {},
) {
  return new Request("https://connect.invalid/webhooks/meta", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-hub-signature-256": signatureHeader,
      ...headers,
    },
    body,
  });
}

function ingressWith(result = { outcome: "processed" }) {
  const calls = [];

  return {
    calls,
    ingress: {
      async receive(rawPayload, signature) {
        calls.push({ rawPayload, signature });
        return result;
      },
    },
  };
}

test("echoes an accepted Meta verification challenge", async () => {
  const testFixture = ingressWith();
  const handler = createMetaWebhookHttpHandler(
    testFixture.ingress,
    verifyToken,
  );
  const request = new Request(
    "https://connect.invalid/webhooks/meta?hub.mode=subscribe&hub.verify_token=configured-verify-token&hub.challenge=321654",
  );

  const response = await handler.handle(request);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "321654");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("x-content-type-options"),
    "nosniff",
  );
  assert.deepEqual(testFixture.calls, []);
});

test("rejects invalid and duplicate verification parameters", async (context) => {
  const handler = createMetaWebhookHttpHandler(
    ingressWith().ingress,
    verifyToken,
  );
  const urls = [
    "https://connect.invalid/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=321654",
    "https://connect.invalid/webhooks/meta?hub.mode=subscribe&hub.mode=subscribe&hub.verify_token=configured-verify-token&hub.challenge=321654",
    "https://connect.invalid/webhooks/meta?hub.mode=subscribe&hub.verify_token=configured-verify-token",
  ];

  for (const url of urls) {
    await context.test(url, async () => {
      const response = await handler.handle(new Request(url));

      assert.equal(response.status, 403);
      assert.equal(await response.text(), "FORBIDDEN");
    });
  }
});

test("passes exact POST bytes and signature to the webhook ingress", async () => {
  const testFixture = ingressWith();
  const handler = createMetaWebhookHttpHandler(
    testFixture.ingress,
    verifyToken,
  );
  const body =
    '{"object":"whatsapp_business_account","text":"שלום"}';

  const response = await handler.handle(postRequest(body));

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "EVENT_RECEIVED");
  assert.equal(testFixture.calls.length, 1);
  assert.deepEqual(
    [...testFixture.calls[0].rawPayload],
    [...new TextEncoder().encode(body)],
  );
  assert.equal(
    testFixture.calls[0].signature,
    signatureHeader,
  );
});

test("acknowledges an idempotent duplicate without exposing receipt data", async () => {
  const testFixture = ingressWith({
    outcome: "duplicate",
    tenantId: 7,
    receiptId: 31,
    eventKey: "event-key",
  });
  const handler = createMetaWebhookHttpHandler(
    testFixture.ingress,
    verifyToken,
  );

  const response = await handler.handle(postRequest("{}"));
  const responseText = await response.text();

  assert.equal(response.status, 200);
  assert.equal(responseText, "EVENT_RECEIVED");
  assert.doesNotMatch(
    responseText,
    /tenant|receipt|event-key/i,
  );
});

test("rejects unsupported methods and media before ingress access", async (context) => {
  const testFixture = ingressWith();
  const handler = createMetaWebhookHttpHandler(
    testFixture.ingress,
    verifyToken,
  );
  const cases = [
    {
      request: new Request(
        "https://connect.invalid/webhooks/meta",
        { method: "PUT" },
      ),
      status: 405,
      body: "METHOD_NOT_ALLOWED",
    },
    {
      request: postRequest("{}", {
        "content-type": "text/plain",
      }),
      status: 415,
      body: "UNSUPPORTED_MEDIA_TYPE",
    },
    {
      request: postRequest("{}", {
        "content-encoding": "gzip",
      }),
      status: 415,
      body: "UNSUPPORTED_CONTENT_ENCODING",
    },
    {
      request: postRequest("{}", {
        "x-hub-signature-256": "",
      }),
      status: 401,
      body: "INVALID_SIGNATURE",
    },
  ];

  for (const fixture of cases) {
    await context.test(fixture.body, async () => {
      const response = await handler.handle(fixture.request);

      assert.equal(response.status, fixture.status);
      assert.equal(await response.text(), fixture.body);
    });
  }

  assert.deepEqual(testFixture.calls, []);
});

test("enforces declared and actual webhook body limits", async (context) => {
  const testFixture = ingressWith();
  const handler = createMetaWebhookHttpHandler(
    testFixture.ingress,
    verifyToken,
    { maximumBodyBytes: 8 },
  );
  const cases = [
    {
      request: postRequest("{}", {
        "content-length": "9",
      }),
      status: 413,
      body: "PAYLOAD_TOO_LARGE",
    },
    {
      request: postRequest("123456789"),
      status: 413,
      body: "PAYLOAD_TOO_LARGE",
    },
    {
      request: postRequest("", {
        "content-length": "invalid",
      }),
      status: 400,
      body: "INVALID_CONTENT_LENGTH",
    },
    {
      request: postRequest(""),
      status: 400,
      body: "INVALID_BODY",
    },
  ];

  for (const fixture of cases) {
    await context.test(fixture.body, async () => {
      const response = await handler.handle(fixture.request);

      assert.equal(response.status, fixture.status);
      assert.equal(await response.text(), fixture.body);
    });
  }

  assert.deepEqual(testFixture.calls, []);
});

test("maps ingress failures to bounded HTTP responses", async (context) => {
  const cases = [
    {
      error: new MetaWebhookEnvelopeError(
        "INVALID_JSON",
        "private malformed payload detail",
      ),
      status: 400,
      body: "INVALID_EVENT",
    },
    {
      error: new MetaWebhookIngressError(
        "INVALID_SIGNATURE",
        "private signature detail",
      ),
      status: 401,
      body: "INVALID_SIGNATURE",
    },
    {
      error: new MetaWebhookIngressError(
        "CONNECTION_NOT_FOUND",
        "private WABA detail",
      ),
      status: 404,
      body: "CONNECTION_NOT_FOUND",
    },
    {
      error: new MetaWebhookIngressError(
        "PROCESSING_FAILED",
        "private processor detail",
      ),
      status: 503,
      body: "RETRY_LATER",
    },
    {
      error: new Error("private unexpected detail"),
      status: 500,
      body: "SERVER_ERROR",
    },
  ];

  for (const fixture of cases) {
    await context.test(fixture.body, async () => {
      const handler = createMetaWebhookHttpHandler(
        {
          async receive() {
            throw fixture.error;
          },
        },
        verifyToken,
      );
      const response = await handler.handle(postRequest("{}"));
      const responseText = await response.text();

      assert.equal(response.status, fixture.status);
      assert.equal(responseText, fixture.body);
      assert.doesNotMatch(responseText, /private/i);
    });
  }
});

test("fails closed when HTTP handler configuration is invalid", () => {
  assert.throws(
    () =>
      createMetaWebhookHttpHandler(
        ingressWith().ingress,
        "",
      ),
    /META_WEBHOOK_VERIFY_TOKEN/,
  );
  assert.throws(
    () =>
      createMetaWebhookHttpHandler(
        ingressWith().ingress,
        verifyToken,
        { maximumBodyBytes: 0 },
      ),
    /maximumBodyBytes/,
  );
});
