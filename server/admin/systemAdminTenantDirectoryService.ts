import type {
  SystemAdminTenantDirectoryRepository,
} from "../../db/systemAdminTenantDirectoryRepository.ts";
import type {
  SystemAdminTenantDirectoryPage,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import type {
  SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import {
  requirePositiveTenantId,
} from "../billing/tenantSubscriptionValidation.ts";

export class SystemAdminTenantDirectoryInputError extends Error {
  constructor() {
    super(
      "System admin tenant directory input is invalid",
    );
    this.name =
      "SystemAdminTenantDirectoryInputError";
  }
}

export interface SystemAdminTenantDirectoryService {
  list(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<SystemAdminTenantDirectoryPage>;
}

function inputError(): never {
  throw new SystemAdminTenantDirectoryInputError();
}

function parseCursorInput(
  input: unknown,
): number | null {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !==
      Object.prototype
  ) {
    return inputError();
  }

  const keys = Object.keys(input);

  if (
    keys.length !== 1 ||
    keys[0] !== "afterTenantId"
  ) {
    return inputError();
  }

  const afterTenantId = (
    input as {
      afterTenantId?: unknown;
    }
  ).afterTenantId;

  if (afterTenantId === null) {
    return null;
  }

  if (
    typeof afterTenantId !== "number"
  ) {
    return inputError();
  }

  try {
    return requirePositiveTenantId(
      afterTenantId,
    );
  } catch {
    return inputError();
  }
}

export function createSystemAdminTenantDirectoryService(
  repository:
    SystemAdminTenantDirectoryRepository,
): SystemAdminTenantDirectoryService {
  return {
    async list(session, input) {
      if (
        typeof session !== "object" ||
        session === null ||
        typeof session.externalUserId !==
          "string" ||
        session.externalUserId.length ===
          0 ||
        session.externalUserId.trim() !==
          session.externalUserId
      ) {
        throw new Error(
          "System admin session is invalid",
        );
      }

      return repository.listPage(
        parseCursorInput(input),
      );
    },
  };
}
