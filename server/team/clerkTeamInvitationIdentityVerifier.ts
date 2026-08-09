import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  enforceCurrentTenantMutationRateLimit,
} from "../security/tenantMutationRateLimit.ts";
import type {
  TeamInvitationIdentityVerifier,
} from "./teamInvitationAcceptanceService.ts";
import {
  requireTeamInvitationEmail,
} from "./teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
} from "./teamMembershipValidation.ts";

const currentClerkSessionProof =
  Object.freeze({
    kind:
      "current-clerk-session-v1",
  });

interface ClerkIdentityDependencies {
  readCurrentUser():
    Promise<unknown>;
  authorize(
    externalUserId: UserId,
  ): Promise<void>;
}

export interface ClerkTeamInvitationIdentityContext {
  identityVerifier:
    TeamInvitationIdentityVerifier;
  proof: unknown;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function defaultDependencies():
ClerkIdentityDependencies {
  return {
    async readCurrentUser() {
      const {
        currentUser,
      } = await import(
        "@clerk/nextjs/server"
      );

      return currentUser();
    },
    authorize: (externalUserId) =>
      enforceCurrentTenantMutationRateLimit(
        externalUserId,
      ),
  };
}

export function createClerkTeamInvitationIdentityContext(
  dependencies:
    ClerkIdentityDependencies =
      defaultDependencies(),
): ClerkTeamInvitationIdentityContext {
  return {
    proof:
      currentClerkSessionProof,
    identityVerifier: {
      async verify(proof) {
        if (
          proof !==
          currentClerkSessionProof
        ) {
          return {
            status: "rejected",
          };
        }

        let user;

        try {
          user =
            await dependencies
              .readCurrentUser();
        } catch {
          return {
            status: "unavailable",
          };
        }

        if (user === null) {
          return {
            status: "unauthenticated",
          };
        }

        if (!isRecord(user)) {
          return {
            status: "rejected",
          };
        }

        const primaryEmail =
          user.primaryEmailAddress;

        if (
          !isRecord(primaryEmail) ||
          !isRecord(
            primaryEmail
              .verification,
          ) ||
          primaryEmail
            .verification
            .status !== "verified"
        ) {
          return {
            status: "rejected",
          };
        }

        let externalUserId:
          UserId;
        let verifiedEmail:
          string;

        try {
          externalUserId =
            requireTeamExternalUserId(
              user.id,
            );
          verifiedEmail =
            requireTeamInvitationEmail(
              primaryEmail
                .emailAddress,
            );
          await dependencies
            .authorize(
              externalUserId,
            );
        } catch {
          return {
            status: "unavailable",
          };
        }

        return {
          status: "verified",
          externalUserId,
          verifiedEmail,
        };
      },
    },
  };
}
