import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const viteConfiguration = await readFile(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);

test("limits the Clerk ESM compatibility adapter to development", () => {
  assert.match(
    viteConfiguration,
    /name: "connect:clerk-safe-node-apis-dev-interop"/,
  );
  assert.match(viteConfiguration, /apply: "serve"/);
  assert.match(viteConfiguration, /enforce: "pre"/);
  assert.match(
    viteConfiguration,
    /source !== CLERK_SAFE_NODE_APIS_IMPORT/,
  );
  assert.match(
    viteConfiguration,
    /includes\(CLERK_ESM_PATH_FRAGMENT\)/,
  );
  assert.match(
    viteConfiguration,
    /import \{[\s\S]+\} from "node:fs";/,
  );
  assert.match(
    viteConfiguration,
    /import \* as path from "node:path";/,
  );
});

test("keeps Clerk client and RSC boundaries out of dependency pre-bundling", () => {
  assert.match(
    viteConfiguration,
    /RSC_DEPENDENCY_OPTIMIZATION_EXCLUSIONS = \[[\s\S]+"@clerk\/nextjs",[\s\S]+"next\/link"/,
  );
  assert.match(
    viteConfiguration,
    /environments:\s*\{[\s\S]+client:[\s\S]+rsc:[\s\S]+ssr:/,
  );
});
