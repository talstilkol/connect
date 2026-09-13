import type { TeamDirectoryView } from "../../shared/domain/teamDirectoryView.ts";
import type { TeamMembershipMutationView } from "../../shared/domain/teamMembershipMutationView.ts";

/** Apply one acknowledged change, or an ownership transfer as one unit. */
export function applyTeamMembershipChanges(
  directory: TeamDirectoryView,
  changes: readonly TeamMembershipMutationView[],
): TeamDirectoryView | null {
  if (changes.length < 1 || changes.length > 2 ||
      new Set(changes.map((change) => change.memberKey)).size !== changes.length) return null;
  for (const change of changes) {
    const current = directory.members.find((member) => member.memberKey === change.memberKey);
    if (!current || !["owner", "manager", "agent", "viewer"].includes(change.role) ||
        !["active", "suspended"].includes(change.status) || !Number.isSafeInteger(change.version) || change.version < current.version ||
        (change.version === current.version &&
          (change.role !== current.role || change.status !== current.status))) return null;
  }
  const members = directory.members.map((member) => {
    const change = changes.find((item) => item.memberKey === member.memberKey);
    return change ? { ...member, role: change.role, status: change.status, version: change.version } : member;
  });
  const owners = members.filter((member) => member.role === "owner");
  if (owners.length !== 1 || owners[0].status !== "active") return null;
  return { ...directory, members };
}
