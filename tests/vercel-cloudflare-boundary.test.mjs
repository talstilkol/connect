import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import nextConfiguration from "../next.config.ts";
import {
  env,
} from "../server/platform/vercelUnavailableCloudflareEnvironment.ts";

test("replaces the Cloudflare virtual environment in the Vercel build", () => {
  const plugins = [];
  const captures = [];

  class NormalModuleReplacementPlugin {
    constructor(pattern, replacement) {
      captures.push({ pattern, replacement });
    }
  }

  const result = nextConfiguration.webpack(
    { plugins },
    {
      webpack: { NormalModuleReplacementPlugin },
    },
  );

  assert.equal(result.plugins, plugins);
  assert.equal(plugins.length, 1);
  assert.equal(captures.length, 1);
  assert.equal(captures[0].pattern.source, "^cloudflare:workers$");
  assert.match(
    captures[0].replacement,
    /server\/platform\/vercelUnavailableCloudflareEnvironment\.ts$/,
  );
});

test("keeps every Cloudflare binding unavailable on Vercel", () => {
  assert.equal(Object.isFrozen(env), true);
  assert.deepEqual(Object.keys(env), []);
  assert.equal("DB" in env, false);
  assert.equal("R2" in env, false);
  assert.equal("META_ACCESS_TOKEN" in env, false);
});

test("exposes a deterministic Vercel build without a remote font dependency", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const layoutSource = readFileSync(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );
  const tokensSource = readFileSync(
    new URL("../styles/tokens.css", import.meta.url),
    "utf8",
  );

  assert.equal(packageJson.scripts["build:vercel"], "next build --webpack");
  assert.match(
    packageJson.scripts.test,
    /npm run build && npm run build:vercel && node --test/,
  );
  assert.doesNotMatch(layoutSource, /next\/font|fonts\.googleapis\.com/);
  assert.match(tokensSource, /--font-geist-sans:/);
  assert.match(tokensSource, /--font-geist-mono:/);
});
