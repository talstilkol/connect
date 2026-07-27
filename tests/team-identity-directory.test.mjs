import assert from "node:assert/strict";
import test from "node:test";

import {
  createUnavailableTeamIdentityDirectory,
} from "../server/team/teamIdentityDirectory.ts";

test("keeps identity display unavailable without inventing profiles", async () => {
  const directory =
    createUnavailableTeamIdentityDirectory();
  const result =
    await directory.resolve([
      "current-user",
      "other-user",
    ]);

  assert.deepEqual(result, {
    status: "unavailable",
    identities: [],
  });
});
