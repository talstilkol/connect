import assert from "node:assert/strict";
import {
  Readable,
} from "node:stream";
import test from "node:test";

import {
  createRailwayNodeHttpServer,
  createRailwayNodeRequestDispatcher,
  createRailwayNodeWebRequest,
} from "../server/platform/railwayNodeHttpServer.ts";

function runtime(readinessStatus = "ready") {
  const calls = [];
  return {
    calls,
    value: {
      handler: {
        async handle(request) {
          calls.push(request);
          return new Response(JSON.stringify({ outcome: "ok" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      },
      readiness: {
        async check() {
          return { status: readinessStatus };
        },
      },
    },
  };
}

test("routes exact liveness, readiness, API, and not-found paths", async () => {
  const fixture = runtime();
  const dispatch = createRailwayNodeRequestDispatcher(fixture.value);

  const live = await dispatch(
    new Request("http://127.0.0.1/health/live"),
  );
  const ready = await dispatch(
    new Request("http://127.0.0.1/health/ready"),
  );
  const api = await dispatch(
    new Request("http://127.0.0.1/v1/connect", {
      method: "POST",
      body: "{}",
    }),
  );
  const missing = await dispatch(
    new Request("http://127.0.0.1/health/live?extended=true"),
  );

  assert.equal(live.status, 200);
  assert.deepEqual(await live.json(), { status: "live" });
  assert.equal(ready.status, 200);
  assert.deepEqual(await ready.json(), { status: "ready" });
  assert.equal(api.status, 200);
  assert.equal(fixture.calls.length, 1);
  assert.equal(missing.status, 404);
  assert.equal(live.headers.get("cache-control"), "no-store");
});

test("fails readiness closed without leaking dependency errors", async () => {
  const fixture = runtime("unavailable");
  const response = await createRailwayNodeRequestDispatcher(
    fixture.value,
  )(new Request("http://127.0.0.1/health/ready"));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "unavailable" });
  assert.equal(fixture.calls.length, 0);
});

test("routes Meta webhook queries only to a configured bounded handler", async () => {
  const unavailableFixture = runtime();
  const unavailable = await createRailwayNodeRequestDispatcher(
    unavailableFixture.value,
  )(
    new Request(
      "http://127.0.0.1/webhooks/meta?hub.mode=subscribe",
    ),
  );

  assert.equal(unavailable.status, 503);
  assert.equal(await unavailable.text(), "WEBHOOK_UNAVAILABLE");
  assert.equal(unavailable.headers.get("cache-control"), "no-store");

  const configuredFixture = runtime();
  const webhookCalls = [];
  configuredFixture.value.metaWebhookHandler = {
    async handle(request) {
      webhookCalls.push(request.url);
      return new Response("24680", { status: 200 });
    },
  };
  const configured = await createRailwayNodeRequestDispatcher(
    configuredFixture.value,
  )(
    new Request(
      "http://127.0.0.1/webhooks/meta?hub.mode=subscribe&hub.challenge=24680",
    ),
  );

  assert.equal(configured.status, 200);
  assert.equal(await configured.text(), "24680");
  assert.deepEqual(webhookCalls, [
    "http://127.0.0.1/webhooks/meta?hub.mode=subscribe&hub.challenge=24680",
  ]);
  assert.equal(configuredFixture.calls.length, 0);
});

test("adapts one bounded origin-form Node request without trusting Host", async () => {
  const incoming = Readable.from([Buffer.from('{"value":1}')]);
  incoming.method = "POST";
  incoming.url = "/v1/connect";
  incoming.headers = {
    host: "attacker.example.com",
    "content-type": "application/json",
  };

  const request = createRailwayNodeWebRequest(incoming);

  assert.equal(request.url, "http://127.0.0.1/v1/connect");
  assert.equal(request.headers.get("host"), "attacker.example.com");
  assert.equal(await request.text(), '{"value":1}');
});

test("rejects absolute, protocol-relative, fragmented, and oversized targets", () => {
  const invalidTargets = [
    "https://attacker.example.com/v1/connect",
    "//attacker.example.com/v1/connect",
    "/v1/connect#fragment",
    `/${"a".repeat(2_048)}`,
  ];

  for (const target of invalidTargets) {
    const incoming = Readable.from([]);
    incoming.method = "POST";
    incoming.url = target;
    incoming.headers = {};
    assert.throws(
      () => createRailwayNodeWebRequest(incoming),
      /request target is invalid/,
    );
  }
});

test("owns deterministic listen and idempotent close lifecycle", async () => {
  const events = new Map();
  const calls = [];
  const fakeServer = {
    maxHeadersCount: null,
    maxRequestsPerSocket: null,
    once(name, callback) {
      events.set(name, callback);
      return this;
    },
    off(name) {
      events.delete(name);
      return this;
    },
    listen(port, host) {
      calls.push(["listen", port, host]);
      events.get("listening")();
      return this;
    },
    close(callback) {
      calls.push(["close"]);
      callback();
      return this;
    },
    closeIdleConnections() {
      calls.push(["close-idle"]);
    },
  };
  const server = createRailwayNodeHttpServer(
    { port: 3001, runtime: runtime().value },
    {
      createServer(options, listener) {
        calls.push(["create", options, typeof listener]);
        return fakeServer;
      },
    },
  );

  await server.start();
  await server.start();
  await server.close();
  await server.close();
  await assert.rejects(
    server.start(),
    /server is closed/,
  );

  assert.deepEqual(calls.map(([name]) => name), [
    "create",
    "listen",
    "close",
    "close-idle",
  ]);
  assert.deepEqual(calls[1], ["listen", 3001, "0.0.0.0"]);
  assert.equal(fakeServer.maxHeadersCount, 64);
  assert.equal(fakeServer.maxRequestsPerSocket, 100);
});
