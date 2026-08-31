import type {
  TeamInvitationProvider,
  TeamInvitationProviderResult,
} from "./teamInvitationProvider.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveTeamInvitationRequestKey,
} from "./teamInvitationKey.ts";
import {
  requireTeamInvitationEmail,
  requireTeamInvitationRole,
} from "./teamInvitationValidation.ts";
import {
  requireTeamTimestamp,
} from "./teamMembershipValidation.ts";

export type TeamInvitationErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_FAILED";

export class TeamInvitationError
  extends Error {
  readonly code:
    TeamInvitationErrorCode;

  constructor(
    code: TeamInvitationErrorCode,
  ) {
    super(
      "The team invitation could not be completed",
    );
    this.name = "TeamInvitationError";
    this.code = code;
  }
}

export class TeamInvitationInputError
  extends Error {
  constructor() {
    super(
      "The team invitation input is invalid",
    );
    this.name =
      "TeamInvitationInputError";
  }
}

type Clock = () => string;

interface TeamInvitationService {
  invite(
    session: TenantSession,
    input: unknown,
  ): Promise<
    Exclude<
      TeamInvitationProviderResult,
      | { status: "unavailable" }
      | { status: "deferred" }
    >
  >;
}

function parseInput(
  input: unknown,
) {
  try {
    if (
      typeof input !== "object" ||
      input === null ||
      Array.isArray(input)
    ) {
      throw new Error(
        "invitation input is not an object",
      );
    }

    const record =
      input as Record<
        string,
        unknown
      >;
    const keys =
      Object.keys(record).sort();

    if (
      keys.length !== 2 ||
      keys[0] !== "email" ||
      keys[1] !== "role"
    ) {
      throw new Error(
        "invitation input shape is invalid",
      );
    }

    return {
      email:
        requireTeamInvitationEmail(
          record.email,
        ),
      role:
        requireTeamInvitationRole(
          record.role,
        ),
    };
  } catch {
    throw new TeamInvitationInputError();
  }
}

function parseProviderResult(
  value: unknown,
): TeamInvitationProviderResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new TeamInvitationError(
      "PROVIDER_FAILED",
    );
  }

  const record =
    value as Record<string, unknown>;

  const statusOnly =
    Object.keys(record).length === 1 &&
    (
      record.status === "submitted" ||
      record.status ===
        "already-pending" ||
      record.status === "unavailable"
    );
  const deferred =
    Object.keys(record).sort().join(",") ===
      "retryAfterSeconds,status" &&
    record.status === "deferred" &&
    Number.isSafeInteger(
      record.retryAfterSeconds,
    ) &&
    Number(record.retryAfterSeconds) >= 1 &&
    Number(record.retryAfterSeconds) <= 86_400;

  if (!statusOnly && !deferred) {
    throw new TeamInvitationError(
      "PROVIDER_FAILED",
    );
  }

  return deferred
    ? {
        status: "deferred",
        retryAfterSeconds:
          Number(
            record.retryAfterSeconds,
          ),
      }
    : {
        status: record.status as
          | "submitted"
          | "already-pending"
          | "unavailable",
      };
}

export function createTeamInvitationService(
  provider:
    TeamInvitationProvider,
  clock: Clock = () =>
    new Date().toISOString(),
): TeamInvitationService {
  return {
    async invite(
      session,
      input,
    ) {
      requireTenantPermission(
        session,
        "team.manage",
      );
      const parsed =
        parseInput(input);
      let requestedAt: string;

      try {
        requestedAt =
          requireTeamTimestamp(
            clock(),
          );
      } catch {
        throw new TeamInvitationError(
          "PROVIDER_FAILED",
        );
      }

      const requestKey =
        await deriveTeamInvitationRequestKey(
          {
            tenantId:
              session.tenantId,
            email: parsed.email,
          },
        );
      let rawResult: unknown;

      try {
        rawResult =
          await provider.invite({
            requestKey,
            tenantId:
              session.tenantId,
            inviterExternalUserId:
              session.externalUserId,
            email: parsed.email,
            role: parsed.role,
            requestedAt,
          });
      } catch {
        throw new TeamInvitationError(
          "PROVIDER_FAILED",
        );
      }

      const result =
        parseProviderResult(
          rawResult,
        );

      if (
        result.status ===
          "unavailable" ||
        result.status ===
          "deferred"
      ) {
        throw new TeamInvitationError(
          "PROVIDER_UNAVAILABLE",
        );
      }

      return result;
    },
  };
}
