import assert from "node:assert/strict";
import test from "node:test";

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
