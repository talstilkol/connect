import {
  hasPermission,
  type Permission,
  type TenantContext,
  type TenantId,
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

const tenantSessionStatuses =
  Object.freeze([
    "trial",
    "active",
    "payment_failed",
  ] as const);

function canCreateTenantSession(
  membership: ActiveTenantMembership,
  identity: AuthenticatedIdentity,
): boolean {
  return (
    membership.externalUserId ===
      identity.externalUserId &&
    tenantSessionStatuses.includes(
      membership.tenantStatus as
        (typeof tenantSessionStatuses)[number],
    )
  );
}

function isValidSelectedTenantId(
  value: TenantId,
): boolean {
  return (
    Number.isSafeInteger(value) &&
    value > 0
  );
}

export function resolveTenantSessionFromMemberships(
  identity: AuthenticatedIdentity | null,
  memberships: readonly ActiveTenantMembership[],
  selectedTenantId?: TenantId,
): TenantSession {
  if (!identity) {
    throw new TenantSessionError(
      "AUTHENTICATION_REQUIRED",
      "An authenticated identity is required",
    );
  }

  const eligibleMemberships =
    memberships.filter((membership) =>
      canCreateTenantSession(
        membership,
        identity,
      ),
    );

  if (eligibleMemberships.length === 0) {
    throw new TenantSessionError(
      "TENANT_MEMBERSHIP_REQUIRED",
      "The authenticated user has no eligible tenant membership",
    );
  }

  if (selectedTenantId !== undefined) {
    if (
      !isValidSelectedTenantId(
        selectedTenantId,
      )
    ) {
      throw new TenantSessionError(
        "TENANT_SELECTION_REQUIRED",
        "The selected tenant is invalid",
      );
    }

    const selectedMembership =
      eligibleMemberships.find(
        (membership) =>
          membership.tenantId ===
          selectedTenantId,
      );

    if (!selectedMembership) {
      throw new TenantSessionError(
        "TENANT_SELECTION_REQUIRED",
        "The selected tenant is not available to the authenticated user",
      );
    }

    return toTenantSession(
      selectedMembership,
    );
  }

  if (eligibleMemberships.length > 1) {
    throw new TenantSessionError(
      "TENANT_SELECTION_REQUIRED",
      "The authenticated user must select one tenant",
    );
  }

  return toTenantSession(
    eligibleMemberships[0],
  );
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
  selectedTenantId?: TenantId,
): Promise<TenantSession> {
  if (!identity) {
    return resolveTenantSessionFromMemberships(
      identity,
      [],
      selectedTenantId,
    );
  }

  const memberships = await repository.findActiveByExternalUserId(
    identity.externalUserId,
  );

  return resolveTenantSessionFromMemberships(
    identity,
    memberships,
    selectedTenantId,
  );
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
