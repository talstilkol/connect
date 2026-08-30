import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("registers a deterministic local Redis crash and load rehearsal", async () => {
  const packageJson = JSON.parse(await readFile(
    new URL("../package.json", import.meta.url),
    "utf8",
  ));
  const source = await readFile(
    new URL("../scripts/rehearse-local-redis-resilience.mjs", import.meta.url),
    "utf8",
  );

  assert.equal(
    packageJson.scripts["rehearse:redis-resilience:local"],
    "node scripts/rehearse-local-redis-resilience.mjs",
  );
  assert.match(source, /"--appendonly", "yes"/);
  assert.match(source, /"--appendfsync", "everysec"/);
  assert.match(source, /"--maxmemory-policy", "noeviction"/);
  assert.match(source, /stopRedis\(redisProcess, "SIGKILL"\)/);
  assert.match(source, /const loadJobCount = 500/);
  assert.match(source, /verifyPublisherFailsDuringOutage/);
  assert.match(source, /recoverDurableJob/);
  assert.doesNotMatch(source, /Math\.random|randomUUID/);
  assert.doesNotMatch(source, /REDIS_URL=|password|Bearer /);
});
