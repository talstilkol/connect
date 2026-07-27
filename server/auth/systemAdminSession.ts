import type {
  UserId,
} from "../../shared/domain/model.ts";
import type {
  AuthenticatedIdentity,
} from "./tenantSession.ts";

export type SystemAdminSessionErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "SYSTEM_ADMIN_REQUIRED";

export class SystemAdminSessionError extends Error {
  readonly code: SystemAdminSessionErrorCode;

  constructor(
    code: SystemAdminSessionErrorCode,
  ) {
    super("System administrator access is required");
    this.name = "SystemAdminSessionError";
    this.code = code;
  }
}

export interface SystemAdminSession {
  externalUserId: UserId;
}

export function resolveSystemAdminSession(
  identity: AuthenticatedIdentity | null,
  allowedExternalUserIds:
    readonly UserId[],
): SystemAdminSession {
  if (!identity) {
    throw new SystemAdminSessionError(
      "AUTHENTICATION_REQUIRED",
    );
  }

  if (
    !allowedExternalUserIds.includes(
      identity.externalUserId,
    )
  ) {
    throw new SystemAdminSessionError(
      "SYSTEM_ADMIN_REQUIRED",
    );
  }

  return {
    externalUserId:
      identity.externalUserId,
  };
}
