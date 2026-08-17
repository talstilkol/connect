import type {
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import type {
  TenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import {
  resolveTenantSessionFromMemberships,
  type AuthenticatedIdentity,
  type TenantSession,
} from "../auth/tenantSession.ts";

export interface RailwayTenantSessionResolver {
  resolve(
    identity: Readonly<AuthenticatedIdentity>,
  ): Promise<Readonly<TenantSession>>;
}

export interface RailwayTenantSessionResolverDependencies {
  readonly memberships: TenantMembershipRepository;
  readonly selections: TenantSelectionRepository;
}

export function createRailwayTenantSessionResolver(
  dependencies: Readonly<RailwayTenantSessionResolverDependencies>,
): RailwayTenantSessionResolver {
  if (
    typeof dependencies.memberships?.findActiveByExternalUserId !==
      "function" ||
    typeof dependencies.selections?.findByExternalUserId !==
      "function"
  ) {
    throw new Error(
      "Railway tenant session dependencies are invalid",
    );
  }

  return {
    async resolve(identity) {
      const memberships =
        await dependencies.memberships.findActiveByExternalUserId(
          identity.externalUserId,
        );
      const selection =
        memberships.length > 1
          ? await dependencies.selections.findByExternalUserId(
              identity.externalUserId,
            )
          : null;

      return Object.freeze(
        resolveTenantSessionFromMemberships(
          identity,
          memberships,
          selection?.tenantId,
        ),
      );
    },
  };
}
