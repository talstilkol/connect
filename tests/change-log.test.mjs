import assert from "node:assert/strict";
import test from "node:test";

import {
  readFile,
} from "node:fs/promises";
import {
  buildChangeLog,
  createCurrentChangeLog,
  parseCommitHistory,
} from "../scripts/create-change-log.mjs";
import {
  readCommittedReleaseManifest,
} from "../scripts/create-release-manifest.mjs";
import {
  inspectReleaseArtifacts,
} from "../scripts/verify-release-artifacts.mjs";

test("builds a deterministic change log from the real repository history", () => {
  const first =
    createCurrentChangeLog();
  const second =
    createCurrentChangeLog();

  assert.equal(first, second);
  assert.match(
    first,
    /^# Connect Change Log\n/,
  );
  assert.match(
    first,
    /ci: add release evidence and migration gates/,
  );
  assert.doesNotMatch(
    first,
    /Generated at|Date:|Math\.random/,
  );
});

test("excludes synthetic merge commits from the repository history", async () => {
  const source = await readFile(
    new URL(
      "../scripts/create-change-log.mjs",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /"log",\s*"--no-merges",\s*"--reverse",/,
  );
});

test("rejects malformed history instead of inventing release notes", () => {
  assert.throws(
    () => parseCommitHistory(""),
    /CHANGE_LOG_HISTORY_REQUIRED/,
  );
  assert.throws(
    () =>
      parseCommitHistory(
        "invalid\tunstructured subject",
      ),
    /CHANGE_LOG_HISTORY_INVALID/,
  );
  assert.throws(
    () => buildChangeLog([]),
    /CHANGE_LOG_COMMITS_REQUIRED/,
  );
});

test("accepts the committed database change category", () => {
  const commits = parseCommitHistory(
    "add7651b1045ecbde86862959d7a9c2cc90210f8\tdb: complete PostgreSQL migration evidence schema",
  );

  assert.equal(commits[0].type, "db");
  assert.match(
    buildChangeLog(commits),
    /## Database\n\n- db: complete PostgreSQL migration evidence schema/,
  );
});

test("preserves valid legacy subjects without rewriting public history", () => {
  const commits = parseCommitHistory(
    "4aab362fe162f421eabf3f379a3f4018f7adf516\tAdd Discovery Cutoff v2 toolchain",
  );

  assert.equal(commits[0].type, "other");
  assert.match(
    buildChangeLog(commits),
    /## Other committed changes\n\n- Add Discovery Cutoff v2 toolchain/,
  );
});

test("accepts only release artifacts matching the committed source", async () => {
  const expectedManifest =
    await readCommittedReleaseManifest();
  const expectedChangeLog =
    createCurrentChangeLog();
  const exact =
    inspectReleaseArtifacts({
      expectedManifest,
      actualManifestText:
        JSON.stringify(
          expectedManifest,
        ),
      expectedChangeLog,
      actualChangeLog:
        expectedChangeLog,
    });
  const stale =
    inspectReleaseArtifacts({
      expectedManifest,
      actualManifestText:
        JSON.stringify(
          expectedManifest,
        ),
      expectedChangeLog,
      actualChangeLog:
        `${expectedChangeLog}\n`,
    });

  assert.deepEqual(exact, {
    status: "passed",
    findings: [],
  });
  assert.deepEqual(stale, {
    status: "failed",
    findings: [
      {
        code: "CHANGE_LOG_STALE",
      },
    ],
  });
});
