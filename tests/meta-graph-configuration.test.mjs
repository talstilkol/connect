import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  requireMetaGraphConfiguration,
} from "../server/meta/metaGraphConfiguration.ts";

test("requires an explicit versioned Meta Graph API configuration", () => {
  assert.deepEqual(
    requireMetaGraphConfiguration({
      META_GRAPH_API_VERSION: " v21.0 ",
    }),
    { apiVersion: "v21.0" },
  );

  assert.throws(
    () => requireMetaGraphConfiguration({}),
    /META_GRAPH_API_VERSION/,
  );
  assert.throws(
    () =>
      requireMetaGraphConfiguration({
        META_GRAPH_API_VERSION: "latest",
      }),
    /explicit v<major>\.<minor>/,
  );
});

test("keeps the Meta Graph version server-side", async () => {
  const exampleEnvironment = await readFile(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );

  assert.match(exampleEnvironment, /^META_GRAPH_API_VERSION=$/m);
  assert.doesNotMatch(
    exampleEnvironment,
    /NEXT_PUBLIC_META_GRAPH_API_VERSION/,
  );
});
