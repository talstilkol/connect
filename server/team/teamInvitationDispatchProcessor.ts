import type {
  TeamInvitationDeliveryRepository,
} from "../../db/teamInvitationDeliveryRepository.ts";
import type {
  TeamInvitationProvider,
  TeamInvitationProviderResult,
} from "./teamInvitationProvider.ts";
import {
  requireTeamInvitationDeliveryKey,
} from "./teamInvitationValidation.ts";
import {
  requireTeamTenantId,
  requireTeamTimestamp,
} from "./teamMembershipValidation.ts";

export type TeamInvitationDispatchOutcome =
  | "submitted"
  | "blocked"
  | "ambiguous"
  | "duplicate"
  | "cancelled"
  | "not-found";

export type TeamInvitationDispatchResult =
  | {
      outcome:
        TeamInvitationDispatchOutcome;
    }
  | {
      outcome: "deferred";
      retryAfterSeconds: number;
    };

export class TeamInvitationDispatchError
  extends Error {
  constructor() {
    super(
      "The team invitation dispatch could not be completed",
    );
    this.name =
      "TeamInvitationDispatchError";
  }
}

type Clock = () => string;

function parseProviderResult(
  value: unknown,
): TeamInvitationProviderResult | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
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
    return null;
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

export function createTeamInvitationDispatchProcessor(
  deliveries:
    TeamInvitationDeliveryRepository,
  provider:
    TeamInvitationProvider,
  clock: Clock = () =>
    new Date().toISOString(),
) {
  function timestamp(): string {
    try {
      return requireTeamTimestamp(
        clock(),
      );
    } catch {
      throw new TeamInvitationDispatchError();
    }
  }

  async function markAmbiguous(
    tenantId: number,
    deliveryKey: string,
  ): Promise<TeamInvitationDispatchResult> {
    try {
      await deliveries.markAmbiguous(
        tenantId,
        deliveryKey,
        "PROVIDER_OUTCOME_UNKNOWN",
        timestamp(),
      );

      return {
        outcome: "ambiguous",
      };
    } catch {
      throw new TeamInvitationDispatchError();
    }
  }

  return {
    async process(
      tenantIdInput: unknown,
      deliveryKeyInput: unknown,
    ): Promise<TeamInvitationDispatchResult> {
      let tenantId: number;
      let deliveryKey: string;

      try {
        tenantId =
          requireTeamTenantId(
            tenantIdInput,
          );
        deliveryKey =
          requireTeamInvitationDeliveryKey(
            deliveryKeyInput,
          );
      } catch {
        throw new TeamInvitationDispatchError();
      }

      let claimed:
        Awaited<
          ReturnType<
            TeamInvitationDeliveryRepository["claim"]
          >
        >;

      try {
        claimed =
          await deliveries.claim(
            tenantId,
            deliveryKey,
            timestamp(),
          );
      } catch {
        throw new TeamInvitationDispatchError();
      }

      if (
        claimed.outcome ===
          "not-found" ||
        claimed.outcome ===
          "cancelled"
      ) {
        return {
          outcome:
            claimed.outcome,
        };
      }

      if (
        claimed.outcome ===
        "duplicate"
      ) {
        return {
          outcome: "duplicate",
        };
      }

      if (
        claimed.outcome ===
        "deferred"
      ) {
        return {
          outcome: "deferred",
          retryAfterSeconds:
            claimed.retryAfterSeconds,
        };
      }

      if (
        claimed.outcome ===
        "uncertain"
      ) {
        return markAmbiguous(
          tenantId,
          deliveryKey,
        );
      }

      if (
        claimed.outcome !==
        "claimed"
      ) {
        throw new TeamInvitationDispatchError();
      }

      let providerResult:
        TeamInvitationProviderResult | null;

      try {
        providerResult =
          parseProviderResult(
            await provider.invite({
              requestKey:
                deliveryKey,
              tenantId,
              inviterExternalUserId:
                claimed.prepared
                  .invitedByExternalUserId,
              email:
                claimed.prepared
                  .normalizedEmail,
              role:
                claimed.prepared.role,
              requestedAt:
                claimed.prepared
                  .requestedAt,
              expiresAt:
                claimed.prepared
                  .expiresAt,
            }),
          );
      } catch {
        return markAmbiguous(
          tenantId,
          deliveryKey,
        );
      }

      if (providerResult === null) {
        return markAmbiguous(
          tenantId,
          deliveryKey,
        );
      }

      if (
        providerResult.status ===
        "unavailable"
      ) {
        try {
          await deliveries.markBlocked(
            tenantId,
            deliveryKey,
            "PROVIDER_UNAVAILABLE",
            timestamp(),
          );

          return {
            outcome: "blocked",
          };
        } catch {
          throw new TeamInvitationDispatchError();
        }
      }

      if (
        providerResult.status ===
        "deferred"
      ) {
        try {
          const occurredAt =
            timestamp();
          const retryAfterAt =
            new Date(
              Date.parse(
                occurredAt,
              ) +
                providerResult
                  .retryAfterSeconds *
                  1_000,
            ).toISOString();

          await deliveries.defer(
            tenantId,
            deliveryKey,
            occurredAt,
            retryAfterAt,
          );

          return {
            outcome: "deferred",
            retryAfterSeconds:
              providerResult
                .retryAfterSeconds,
          };
        } catch {
          throw new TeamInvitationDispatchError();
        }
      }

      try {
        await deliveries.markSubmitted(
          tenantId,
          deliveryKey,
          timestamp(),
        );

        return {
          outcome: "submitted",
        };
      } catch {
        throw new TeamInvitationDispatchError();
      }
    },
  };
}
