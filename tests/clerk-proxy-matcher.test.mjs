import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import nextServerTesting from "next/experimental/testing/server.js";

import { readAuthHref } from "../shared/i18n/auth.ts";
import { publicLandingLocales } from "../shared/i18n/publicLanding.ts";

const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
const configuration = source.match(/export const config = (\{[\s\S]*?\n\});/);
assert.ok(configuration, "proxy must export a static matcher configuration");
const config = runInNewContext(`(${configuration[1]})`, {}, { timeout: 1000 });
const matches = (url) => nextServerTesting.unstable_doesMiddlewareMatch({ config, url });

test("runs Clerk for every supported landing, sign-in, and sign-up route", () => {
  for (const { language, href } of publicLandingLocales) {
    for (const url of [href, readAuthHref(language, "login"), readAuthHref(language, "register")]) {
      assert.equal(matches(url), true, `Clerk must run for ${url}`);
    }
  }
});

test("keeps Clerk on protected resources, API routes, and its frontend proxy", () => {
  for (const url of [
    "/workspace", "/workspace/onboarding", "/workspace/media-tasks",
    "/admin", "/admin/decisions", "/invite",
    "/api", "/trpc", "/__clerk", "/__clerk/v1/client",
  ]) {
    assert.equal(matches(url), true, `Clerk must run for ${url}`);
  }
  const autoProxyIndex = config.matcher.indexOf("/__clerk/:path*");
  assert.equal(config.matcher.filter((entry) => entry === "/__clerk/:path*").length, 1);
  assert.ok(autoProxyIndex > config.matcher.indexOf("/(api|trpc)(.*)"));
  assert.notEqual(config.matcher.indexOf("/(api|trpc)(.*)"), -1);
});

test("runs Clerk when a pending session resumes through a task URL", () => {
  for (const { language } of publicLandingLocales) {
    for (const mode of ["login", "register"]) {
      const route = readAuthHref(language, mode);
      for (const task of ["", "/choose-organization", "/setup-mfa", "/reset-password"]) {
        const url = `${route}/tasks${task}?redirect_url=%2Fworkspace`;
        assert.equal(matches(url), true, `Clerk must resume the pending session at ${url}`);
      }
    }
  }
});

test("skips public static assets without skipping page query strings", () => {
  for (const url of ["/favicon.svg", "/og.png"]) {
    assert.equal(matches(url), false, `Clerk should skip ${url}`);
  }
  assert.equal(matches("/en/login?redirect_url=%2Fworkspace"), true);
});
