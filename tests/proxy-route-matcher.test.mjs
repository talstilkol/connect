import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

const proxyUrl = new URL(
  "../proxy.ts",
  import.meta.url,
);

test("runs Clerk middleware on every explicit application surface without path-level authorization", async () => {
  const source = await readFile(
    proxyUrl,
    "utf8",
  );

  for (const matcher of [
    "/workspace/:path*",
    "/admin/:path*",
    "/invite/:path*",
    "/api/:path*",
    "/trpc/:path*",
    "/__clerk/:path*",
  ]) {
    assert.equal(
      source.includes(
        JSON.stringify(matcher),
      ),
      true,
      `missing proxy matcher: ${matcher}`,
    );
  }

  assert.doesNotMatch(
    source,
    /\(\?!_next|\(api\|trpc\)/,
  );
  assert.match(
    source,
    /configuredClerkMiddleware = clerkMiddleware\(\)/,
  );
  assert.doesNotMatch(
    source,
    /createRouteMatcher|auth\.protect/,
  );
});
