import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";
import test from "node:test";

async function readSource(path) {
  return readFile(
    new URL(`../${path}`, import.meta.url),
    "utf8",
  );
}

test("keeps identity and tenant storage fields outside the team UI contract", async () => {
  const [
    viewSource,
    componentSource,
  ] = await Promise.all([
    readSource(
      "shared/domain/teamDirectoryView.ts",
    ),
    readSource(
      "features/team/TeamDirectory.tsx",
    ),
  ]);
  const browserBoundary =
    `${viewSource}\n${componentSource}`;

  assert.match(
    browserBoundary,
    /referenceCode/,
  );
  assert.doesNotMatch(
    browserBoundary,
    /\btenantId\b|\bexternalUserId\b/,
  );
  assert.doesNotMatch(
    browserBoundary,
    /localStorage|sessionStorage|document\.cookie/,
  );
});

test("loads team data only for the authenticated team route", async () => {
  const source = await readSource(
    "app/workspace/[section]/page.tsx",
  );

  assert.match(
    source,
    /section === "team" && authEnabled\s*\?\s*readCurrentTeamDirectory\(\)/,
  );
  assert.match(
    source,
    /initialTeamDirectory=/,
  );
  assert.match(
    source,
    /initialTeamDirectoryStatus=/,
  );
});

test("keeps unsupported team mutations disabled with an accessible explanation", async () => {
  const source = await readSource(
    "features/team/TeamDirectory.tsx",
  );

  assert.match(
    source,
    /team-invitation-unavailable/,
  );
  assert.match(
    source,
    /disabled/,
  );
  assert.match(
    source,
    /role="status"/,
  );
  assert.doesNotMatch(
    source,
    /onClick|onSubmit/,
  );
});
