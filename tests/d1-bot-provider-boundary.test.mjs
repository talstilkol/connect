import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL("../worker/index.ts", import.meta.url);

test("keeps the legacy D1 bot path provider-unavailable", async () => {
  const source = await readFile(workerUrl, "utf8");

  assert.match(
    source,
    /createBotReplyDeliveryRepository\(\s*env\.DB,?\s*\),\s*createUnavailableBotReplyProcessor\(\)/,
  );
  assert.doesNotMatch(
    source,
    /metaBotReply(?:Adapter|Processor|Runtime)|createMetaGraphBotReply|railwayBotReplyRuntime/,
  );
});
