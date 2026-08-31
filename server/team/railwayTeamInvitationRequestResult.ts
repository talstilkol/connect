import type {
  TeamInvitationActionResult,
} from "../../shared/domain/teamInvitationView.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseRailwayTeamInvitationRequestResult(
  value: unknown,
): Extract<
  TeamInvitationActionResult,
  { status: "queued" | "already-pending" }
> | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    (value.status !== "queued" && value.status !== "already-pending")
  ) {
    return null;
  }

  return Object.freeze({ status: value.status });
}
