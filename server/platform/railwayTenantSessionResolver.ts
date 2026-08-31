import type {
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import type {
  TenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import type {
  ClerkOrganizationBindingRepository,
} from "../../db/clerkOrganizationBindingRepository.ts";
import {
  resolveTenantSessionFromMemberships,
  type AuthenticatedIdentity,
  type TenantSession,
} from "../auth/tenantSession.ts";

const controlCharacterPattern = /[\u0000-\u001f\u007f]/u;

export interface RailwayTenantSessionResolver {
  resolve(
    identity: Readonly<AuthenticatedIdentity>,
  ): Promise<Readonly<TenantSession>>;
  resolveOptional(
    identity: Readonly<AuthenticatedIdentity>,
  ): Promise<Readonly<TenantSession> | null>;
}

export interface RailwayTenantSessionResolverDependencies {
  readonly memberships: TenantMembershipRepository;
  readonly selections: TenantSelectionRepository;
  readonly identityOrganizations: Pick<
    ClerkOrganizationBindingRepository,
    "findByTenantId"
  >;
}

export function createRailwayTenantSessionResolver(
  dependencies: Readonly<RailwayTenantSessionResolverDependencies>,
): RailwayTenantSessionResolver {
  if (
    typeof dependencies.memberships?.findActiveByExternalUserId !==
      "function" ||
    typeof dependencies.selections?.findByExternalUserId !==
      "function" ||
    typeof dependencies.identityOrganizations?.findByTenantId !==
      "function"
  ) {
    throw new Error(
      "Railway tenant session dependencies are invalid",
    );
  }

  async function resolveFromStoredMemberships(
    identity: Readonly<AuthenticatedIdentity>,
    memberships: Awaited<
      ReturnType<
        TenantMembershipRepository["findActiveByExternalUserId"]
      >
    >,
    externalOrganizationId: string,
  ): Promise<Readonly<TenantSession>> {
    const selection =
      memberships.length > 1
        ? await dependencies.selections.findByExternalUserId(
            identity.externalUserId,
          )
        : null;

    const session = resolveTenantSessionFromMemberships(
      identity,
      memberships,
      selection?.tenantId,
    );
    const binding = await dependencies.identityOrganizations.findByTenantId(
      session.tenantId,
    );
    if (
      binding === null ||
      binding.tenantId !== session.tenantId ||
      binding.externalOrganizationId !== externalOrganizationId
    ) {
      throw new Error("Railway Clerk organization binding is unavailable");
    }
    return Object.freeze(session);
  }

  function requireExternalOrganizationId(
    identity: Readonly<AuthenticatedIdentity>,
  ): string {
    const externalOrganizationId = identity.externalOrganizationId;
    if (
      typeof externalOrganizationId !== "string" ||
      externalOrganizationId.length === 0 ||
      externalOrganizationId.length > 255 ||
      externalOrganizationId.trim() !== externalOrganizationId ||
      controlCharacterPattern.test(externalOrganizationId)
    ) {
      throw new Error("Railway Clerk organization identity is unavailable");
    }
    return externalOrganizationId;
  }

  return Object.freeze({
    async resolve(identity: Readonly<AuthenticatedIdentity>) {
      const externalOrganizationId = requireExternalOrganizationId(identity);
      const memberships =
        await dependencies.memberships.findActiveByExternalUserId(
          identity.externalUserId,
        );
      return resolveFromStoredMemberships(
        identity,
        memberships,
        externalOrganizationId,
      );
    },
    async resolveOptional(identity: Readonly<AuthenticatedIdentity>) {
      const externalOrganizationId = requireExternalOrganizationId(identity);
      const memberships =
        await dependencies.memberships.findActiveByExternalUserId(
          identity.externalUserId,
        );
      if (memberships.length === 0) {
        return null;
      }
      return resolveFromStoredMemberships(
        identity,
        memberships,
        externalOrganizationId,
      );
    },
  });
}
