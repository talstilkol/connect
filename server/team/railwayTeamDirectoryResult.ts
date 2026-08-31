import type {
  TeamDirectoryView,
  TeamMemberView,
} from "../../shared/domain/teamDirectoryView.ts";

const roles = Object.freeze(["owner", "manager", "agent", "viewer"] as const);
const memberKeyPattern = /^team_member_v1_[a-f0-9]{64}$/;
const referenceCodePattern = /^[A-F0-9]{12}$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function validDisplayName(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 160 &&
    value === value.trim() &&
    !controlCharacterPattern.test(value);
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 320 &&
    value === value.trim() &&
    !controlCharacterPattern.test(value) &&
    !/\s/.test(value) &&
    /^[^@]+@[^@]+$/.test(value);
}

function parseMember(
  value: unknown,
  identityStatus: TeamDirectoryView["identityStatus"],
): Readonly<TeamMemberView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "currentUser",
      "displayName",
      "memberKey",
      "primaryEmail",
      "referenceCode",
      "role",
      "version",
    ]) ||
    typeof value.memberKey !== "string" ||
    !memberKeyPattern.test(value.memberKey) ||
    typeof value.referenceCode !== "string" ||
    !referenceCodePattern.test(value.referenceCode) ||
    value.referenceCode !== value.memberKey.slice(-12).toUpperCase() ||
    !roles.some((role) => role === value.role) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) <= 0 ||
    typeof value.currentUser !== "boolean" ||
    (identityStatus === "unavailable" &&
      (value.displayName !== null || value.primaryEmail !== null)) ||
    (identityStatus === "ready" &&
      (!validDisplayName(value.displayName) || !validEmail(value.primaryEmail)))
  ) {
    return null;
  }

  return Object.freeze({
    memberKey: value.memberKey,
    referenceCode: value.referenceCode,
    displayName: value.displayName as string | null,
    primaryEmail: value.primaryEmail as string | null,
    role: value.role as TeamMemberView["role"],
    version: Number(value.version),
    currentUser: value.currentUser,
  });
}

export function parseRailwayTeamDirectory(
  value: unknown,
): Readonly<TeamDirectoryView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["identityStatus", "members"]) ||
    (value.identityStatus !== "ready" &&
      value.identityStatus !== "unavailable") ||
    !Array.isArray(value.members) ||
    value.members.length < 1 ||
    value.members.length > 100
  ) {
    return null;
  }
  const identityStatus = value.identityStatus;
  const members = value.members.map((member) =>
    parseMember(member, identityStatus),
  );
  if (
    members.some((member) => member === null) ||
    new Set(members.map((member) => member?.memberKey)).size !== members.length ||
    new Set(members.map((member) => member?.referenceCode)).size !==
      members.length ||
    members.filter((member) => member?.currentUser).length !== 1
  ) {
    return null;
  }

  return Object.freeze({
    identityStatus,
    members: Object.freeze(members as readonly Readonly<TeamMemberView>[]),
  });
}
