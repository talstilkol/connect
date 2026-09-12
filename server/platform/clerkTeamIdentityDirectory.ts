import { createClerkClient } from "@clerk/backend";
import type { TeamIdentityDirectory, TeamIdentityDisplay } from "../team/teamIdentityDirectory.ts";
import { requireTeamExternalUserId } from "../team/teamMembershipValidation.ts";
import { requireTeamInvitationEmail } from "../team/teamInvitationValidation.ts";
import type { RailwayApiIdentityConfiguration } from "./railwayApiIdentityConfiguration.ts";

interface ClerkTeamUserReader {
  readonly users: Readonly<{
    getUserList(input: { userId: string[]; limit: number; offset: number }): Promise<unknown>;
  }>;
}

export interface ClerkTeamUserReaderFactory {
  create(configuration: Readonly<{ publishableKey: string; secretKey: string }>): ClerkTeamUserReader;
}

const defaultFactory: ClerkTeamUserReaderFactory = {
  create: (configuration) => createClerkClient(configuration),
};
const unavailable = Object.freeze({ status: "unavailable" as const, identities: [] as const });
const maximumMembers = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function profileText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" || value.length > 160 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("Clerk team profile is invalid");
  }
  return value.trim();
}

function identityFromUser(value: unknown): TeamIdentityDisplay {
  if (!isRecord(value)) throw new Error("Clerk team profile is invalid");
  const externalUserId = requireTeamExternalUserId(value.id);
  const primary = value.primaryEmailAddress;
  if (!isRecord(primary) || !isRecord(primary.verification) || primary.verification.status !== "verified") {
    throw new Error("Clerk team primary email is unavailable");
  }
  const primaryEmail = requireTeamInvitationEmail(primary.emailAddress);
  const name = [profileText(value.firstName), profileText(value.lastName)].filter(Boolean).join(" ");
  const displayName = name || profileText(value.username) || primaryEmail;
  if (displayName.length > 160) throw new Error("Clerk team display name is invalid");
  return Object.freeze({ externalUserId, displayName, primaryEmail });
}

/** Profile enrichment only. The caller must first authorize the tenant membership list. */
export function createClerkTeamIdentityDirectory(
  configuration: Readonly<RailwayApiIdentityConfiguration>,
  factory: Readonly<ClerkTeamUserReaderFactory> = defaultFactory,
): TeamIdentityDirectory {
  if (typeof configuration?.clerkPublishableKey !== "string" || !configuration.clerkPublishableKey.trim() ||
      typeof configuration.clerkSecretKey !== "string" || !configuration.clerkSecretKey.trim() ||
      typeof factory?.create !== "function") {
    throw new Error("Clerk team identity configuration is unavailable");
  }
  const client = factory.create({
    publishableKey: configuration.clerkPublishableKey,
    secretKey: configuration.clerkSecretKey,
  });
  if (typeof client?.users?.getUserList !== "function") {
    throw new Error("Clerk team identity reader is unavailable");
  }
  return Object.freeze({
    async resolve(externalUserIds: readonly string[]) {
      try {
        if (!Array.isArray(externalUserIds) || externalUserIds.length > maximumMembers) return unavailable;
        const ids = externalUserIds.map(requireTeamExternalUserId);
        const requested = new Set(ids);
        if (requested.size !== ids.length) return unavailable;
        // An empty filter would list the entire Clerk instance; never send it.
        if (ids.length === 0) return Object.freeze({ status: "ready" as const, identities: [] });
        const result = await client.users.getUserList({ userId: [...ids], limit: ids.length, offset: 0 });
        if (!isRecord(result) || !Array.isArray(result.data) || result.data.length !== ids.length) return unavailable;
        const identities = result.data.map(identityFromUser);
        const received = new Map(identities.map((identity) => [identity.externalUserId, identity]));
        if (received.size !== requested.size || identities.some((identity) => !requested.has(identity.externalUserId))) {
          return unavailable;
        }
        // Preserve the authorized directory order, regardless of the provider's sort order.
        return Object.freeze({ status: "ready" as const, identities: ids.map((id) => received.get(id)!) });
      } catch {
        // Provider details, credentials and partial/foreign profiles never cross the boundary.
        return unavailable;
      }
    },
  });
}
