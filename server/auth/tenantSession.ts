import {
  hasPermission,
  type Permission,
  type TenantContext,
  type UserId,
} from "../../shared/domain/model.ts";
import type {
  ActiveTenantMembership,
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository";

export type TenantSessionErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "TENANT_MEMBERSHIP_REQUIRED"
  | "TENANT_SELECTION_REQUIRED"
  | "PERMISSION_DENIED";

export class TenantSessionError extends Error {
  readonly code: TenantSessionErrorCode;

  constructor(
    code: TenantSessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TenantSessionError";
    this.code = code;
  }
}

export interface AuthenticatedIdentity {
  externalUserId: UserId;
}

export interface TenantSession extends TenantContext {
  externalUserId: UserId;
}

export function resolveTenantSessionFromMemberships(
  identity: AuthenticatedIdentity | null,
  memberships: readonly ActiveTenantMembership[],
): TenantSession {
  if (!identity) {
    throw new TenantSessionError(
      "AUTHENTICATION_REQUIRED",
      "An authenticated identity is required",
    );
  }

  if (memberships.length === 0) {
    throw new TenantSessionError(
      "TENANT_MEMBERSHIP_REQUIRED",
      "The authenticated user has no active tenant membership",
    );
  }

  if (memberships.length > 1) {
    throw new TenantSessionError(
      "TENANT_SELECTION_REQUIRED",
      "The authenticated user must select one tenant",
    );
  }

  return toTenantSession(memberships[0]);
}

function toTenantSession(
  membership: ActiveTenantMembership,
): TenantSession {
  return {
    externalUserId: membership.externalUserId,
    tenantId: membership.tenantId,
    displayName: membership.tenantDisplayName,
    status: membership.tenantStatus,
    role: membership.role,
  };
}

export async function resolveTenantSession(
  identity: AuthenticatedIdentity | null,
  repository: TenantMembershipRepository,
): Promise<TenantSession> {
  if (!identity) {
    return resolveTenantSessionFromMemberships(identity, []);
  }

  const memberships = await repository.findActiveByExternalUserId(
    identity.externalUserId,
  );

  return resolveTenantSessionFromMemberships(identity, memberships);
}

export function requireTenantPermission(
  session: TenantSession,
  permission: Permission,
): void {
  if (!hasPermission(session.role, permission)) {
    throw new TenantSessionError(
      "PERMISSION_DENIED",
      `The ${session.role} role does not grant ${permission}`,
    );
  }
}
