import {
  createClerkClient,
} from "@clerk/backend";

import type {
  RailwayApiIdentityConfiguration,
} from "./railwayApiIdentityConfiguration.ts";
import type {
  TeamInvitationAcceptanceIdentityResolver,
} from "../team/teamInvitationAcceptanceIdentityResolver.ts";
import {
  requireTeamInvitationEmail,
} from "../team/teamInvitationValidation.ts";
import {
  requireTeamExternalUserId,
} from "../team/teamMembershipValidation.ts";

interface ClerkUserReader {
  readonly users: Readonly<{
    getUser(userId: string): Promise<unknown>;
  }>;
}

export interface ClerkUserReaderFactory {
  create(configuration: Readonly<{
    publishableKey: string;
    secretKey: string;
  }>): ClerkUserReader;
}

const defaultFactory: Readonly<ClerkUserReaderFactory> = Object.freeze({
  create(configuration: Readonly<{
    publishableKey: string;
    secretKey: string;
  }>) {
    return createClerkClient(configuration);
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createClerkRailwayTeamInvitationIdentityResolver(
  configuration: Readonly<RailwayApiIdentityConfiguration>,
  factory: Readonly<ClerkUserReaderFactory> = defaultFactory,
): TeamInvitationAcceptanceIdentityResolver {
  if (
    typeof factory?.create !== "function" ||
    typeof configuration?.clerkPublishableKey !== "string" ||
    configuration.clerkPublishableKey.length === 0 ||
    typeof configuration.clerkSecretKey !== "string" ||
    configuration.clerkSecretKey.length === 0
  ) {
    throw new Error("Clerk invitation identity resolver is unavailable");
  }

  const client = factory.create({
    publishableKey: configuration.clerkPublishableKey,
    secretKey: configuration.clerkSecretKey,
  });

  if (typeof client?.users?.getUser !== "function") {
    throw new Error("Clerk invitation identity resolver is unavailable");
  }

  return Object.freeze({
    async resolve(externalUserId: unknown) {
      let normalizedExternalUserId: string;

      try {
        normalizedExternalUserId = requireTeamExternalUserId(externalUserId);
      } catch {
        return Object.freeze({ status: "rejected" as const });
      }

      let user: unknown;

      try {
        user = await client.users.getUser(normalizedExternalUserId);
      } catch {
        return Object.freeze({ status: "unavailable" as const });
      }

      if (!isRecord(user) || user.id !== normalizedExternalUserId) {
        return Object.freeze({ status: "rejected" as const });
      }

      const primaryEmail = user.primaryEmailAddress;

      if (
        !isRecord(primaryEmail) ||
        !isRecord(primaryEmail.verification) ||
        primaryEmail.verification.status !== "verified"
      ) {
        return Object.freeze({ status: "rejected" as const });
      }

      try {
        return Object.freeze({
          status: "verified" as const,
          verifiedEmail: requireTeamInvitationEmail(primaryEmail.emailAddress),
        });
      } catch {
        return Object.freeze({ status: "rejected" as const });
      }
    },
  });
}
