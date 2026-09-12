import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
// Rendered acceptance tests exercise the configuration-required UI. Explicit
// empty values take precedence over .env.local in both build tools; never
// disable authentication in the normal build or deployment commands.
const environment = {
  ...process.env,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
  CLERK_SECRET_KEY: "",
  WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
};
const tests = readdirSync(resolve(projectRoot, "tests"))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => `tests/${name}`);

for (const [name, argumentsList] of [
  ["vinext", ["node_modules/vinext/dist/cli.js", "build"]],
  ["next", ["node_modules/next/dist/bin/next", "build", "--webpack"]],
  ["tests", ["--test", ...tests]],
]) {
  const result = spawnSync(process.execPath, argumentsList, {
    cwd: projectRoot,
    env: environment,
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    console.error(`Local test suite: FAIL (${name})`);
    process.exit(1);
  }
}
