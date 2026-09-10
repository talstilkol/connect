import type {
  TeamMembershipActionResult,
  TeamMembershipMutationView,
  TeamOwnerTransferActionResult,
} from "../../shared/domain/teamMembershipMutationView.ts";
import {
  requireTeamMemberKey,
  requireTeamMembershipStatus,
  requireTeamMembershipVersion,
  requireTeamRole,
} from "./teamMembershipValidation.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function parseOutcome(value: unknown): "updated" | "unchanged" | null {
  return value === "updated" || value === "unchanged" ? value : null;
}

function parseMembership(value: unknown): TeamMembershipMutationView | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["memberKey", "role", "status", "version"])
  ) {
    return null;
  }
  try {
    return Object.freeze({
      memberKey: requireTeamMemberKey(value.memberKey),
      role: requireTeamRole(value.role),
      status: requireTeamMembershipStatus(value.status),
      version: requireTeamMembershipVersion(value.version),
    });
  } catch {
    return null;
  }
}

export function parseRailwayTeamMembershipResult(
  value: unknown,
): Extract<TeamMembershipActionResult, { status: "saved" }> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["membership", "outcome"])
  ) {
    return null;
  }
  const outcome = parseOutcome(value.outcome);
  const membership = parseMembership(value.membership);
  return outcome === null || membership === null
    ? null
    : Object.freeze({ status: "saved" as const, outcome, membership });
}

export function parseRailwayTeamOwnerTransferResult(
  value: unknown,
): Extract<TeamOwnerTransferActionResult, { status: "saved" }> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["formerOwner", "newOwner", "outcome"])
  ) {
    return null;
  }
  const outcome = parseOutcome(value.outcome);
  const formerOwner = parseMembership(value.formerOwner);
  const newOwner = parseMembership(value.newOwner);
  if (
    outcome === null ||
    formerOwner === null ||
    newOwner === null ||
    formerOwner.memberKey === newOwner.memberKey ||
    formerOwner.role === "owner" ||
    newOwner.role !== "owner"
  ) {
    return null;
  }
  return Object.freeze({
    status: "saved" as const,
    outcome,
    formerOwner,
    newOwner,
  });
}
