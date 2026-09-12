import test from "node:test";
import assert from "node:assert/strict";
import { applyTeamMembershipChanges } from "../features/team/teamMembershipState.ts";
import { owner, agent, teamDirectoryFixture as directory } from "./fixtures/team-memberships.mjs";

test("role updates retain the acknowledged revision for the next mutation", () => {
  const result = applyTeamMembershipChanges(directory(), [{ ...agent, role: "manager", version: 2 }]);
  assert.equal(result.members[1].role, "manager");
  assert.equal(result.members[1].version, 2);
  assert.deepEqual(result.members[0], owner);
});
test("suspension retains a member so access can be restored", () => {
  const suspended = applyTeamMembershipChanges(directory(), [{ ...agent, status: "suspended", version: 2 }]);
  assert.equal(suspended.members.length, 2);
  const restored = applyTeamMembershipChanges(suspended, [{ ...agent, status: "active", version: 3 }]);
  assert.equal(restored.members[1].status, "active");
});
test("owner transfer applies both memberships together and removes old owner controls", () => {
  const result = applyTeamMembershipChanges(directory(), [
    { ...owner, role: "manager", version: 3 },
    { ...agent, role: "owner", version: 2 },
  ]);
  assert.equal(result.members.find((member) => member.currentUser).role, "manager");
  assert.equal(result.members.filter((member) => member.role === "owner").length, 1);
  assert.equal(applyTeamMembershipChanges(directory(), [{ ...agent, role: "owner", version: 2 }]), null);
});
test("late, contradictory, foreign and duplicate acknowledgements require a refresh", () => {
  for (const changes of [
    [{ ...owner, version: 1 }],
    [{ ...agent, role: "viewer" }],
    [{ ...agent, memberKey: "foreign", version: 2 }],
    [{ ...agent, version: 2 }, { ...agent, version: 2 }],
    [{ ...owner, status: "suspended", version: 3 }],
  ]) assert.equal(applyTeamMembershipChanges(directory(), changes), null);
});
