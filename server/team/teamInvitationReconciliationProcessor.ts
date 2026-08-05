import type {
  TeamInvitationDeliveryRepository,
} from "../../db/teamInvitationDeliveryRepository.ts";
import type {
  TeamInvitationProvider,
  TeamInvitationProviderLookupResult,
} from "./teamInvitationProvider.ts";
import {
  requireTeamInvitationDeliveryKey,
} from "./teamInvitationValidation.ts";
import {
  requireTeamTenantId,
  requireTeamTimestamp,
} from "./teamMembershipValidation.ts";

export type TeamInvitationReconciliationOutcome =
  | "resolved-submitted"
  | "resolved-blocked"
  | "deferred"
  | "duplicate"
  | "not-found";

export interface TeamInvitationReconciliationResult {
  outcome:
    TeamInvitationReconciliationOutcome;
}

export class TeamInvitationReconciliationError
  extends Error {
  constructor() {
    super(
      "The team invitation reconciliation could not be completed",
    );
    this.name =
      "TeamInvitationReconciliationError";
  }
}

type Clock = () => string;

function parseLookupResult(
  value: unknown,
): TeamInvitationProviderLookupResult | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  if (
    Object.keys(record).length !== 1 ||
    (
      record.status !== "submitted" &&
      record.status !== "not-found" &&
      record.status !== "unavailable"
    )
  ) {
    return null;
  }

  return {
    status: record.status,
  };
}

export function createTeamInvitationReconciliationProcessor(
  deliveries:
    TeamInvitationDeliveryRepository,
  provider:
    Pick<TeamInvitationProvider, "lookup">,
  clock: Clock = () =>
    new Date().toISOString(),
) {
  function timestamp(): string {
    try {
      return requireTeamTimestamp(
        clock(),
      );
    } catch {
      throw new TeamInvitationReconciliationError();
    }
  }

  return {
    async process(
      tenantIdInput: unknown,
      deliveryKeyInput: unknown,
    ): Promise<TeamInvitationReconciliationResult> {
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
        throw new TeamInvitationReconciliationError();
      }

      let delivery;

      try {
        delivery =
          await deliveries.find(
            tenantId,
            deliveryKey,
          );
      } catch {
        throw new TeamInvitationReconciliationError();
      }

      if (delivery === null) {
        return {
          outcome: "not-found",
        };
      }

      if (
        delivery.status !== "ambiguous"
      ) {
        return {
          outcome: "duplicate",
        };
      }

      let lookupResult:
        TeamInvitationProviderLookupResult | null;

      try {
        lookupResult =
          parseLookupResult(
            await provider.lookup({
              requestKey: deliveryKey,
              tenantId,
            }),
          );
      } catch {
        return {
          outcome: "deferred",
        };
      }

      if (
        lookupResult === null ||
        lookupResult.status ===
          "unavailable"
      ) {
        return {
          outcome: "deferred",
        };
      }

      try {
        if (
          lookupResult.status ===
          "submitted"
        ) {
          await deliveries
            .reconcileSubmitted(
              tenantId,
              deliveryKey,
              timestamp(),
            );

          return {
            outcome:
              "resolved-submitted",
          };
        }

        await deliveries
          .reconcileBlocked(
            tenantId,
            deliveryKey,
            "PROVIDER_CONFIRMED_NOT_SUBMITTED",
            timestamp(),
          );

        return {
          outcome: "resolved-blocked",
        };
      } catch {
        throw new TeamInvitationReconciliationError();
      }
    },
  };
}
