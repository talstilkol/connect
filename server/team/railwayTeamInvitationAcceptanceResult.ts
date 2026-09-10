import type {
  TeamInvitationAcceptanceActionResult,
} from "../../shared/domain/teamInvitationView.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRailwayTeamInvitationAcceptanceResult(
  value: unknown,
): Extract<
  TeamInvitationAcceptanceActionResult,
  { status: "accepted" | "already-accepted" }
> | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    (value.status !== "accepted" && value.status !== "already-accepted")
  ) {
    return null;
  }

  return Object.freeze({ status: value.status });
}
