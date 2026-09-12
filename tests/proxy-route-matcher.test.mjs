import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import nextServerTesting from "next/experimental/testing/server.js";

const proxyUrl = new URL(
  "../proxy.ts",
  import.meta.url,
);

test("runs Clerk middleware on every explicit application surface without path-level authorization", async () => {
  const source = await readFile(
    proxyUrl,
    "utf8",
  );

  const configuration = source.match(
    /export const config = (\{[\s\S]*?\n\});/,
  );
  assert.ok(configuration, "proxy must export a static matcher configuration");
  const config = runInNewContext(`(${configuration[1]})`, {}, { timeout: 1000 });

  for (const url of [
    "/workspace",
    "/workspace/media-tasks",
    "/admin",
    "/admin/decisions",
    "/invite",
    "/api",
    "/trpc",
    "/__clerk/v1/client",
  ]) {
    assert.equal(
      nextServerTesting.unstable_doesMiddlewareMatch({ config, url }),
      true,
      `Clerk middleware must run for ${url}`,
    );
  }

  assert.match(
    source,
    /configuredClerkMiddleware = clerkMiddleware\(\)/,
  );
  assert.doesNotMatch(
    source,
    /createRouteMatcher|auth\.protect/,
  );
});
