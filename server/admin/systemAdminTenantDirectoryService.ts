import type {
  SystemAdminTenantDirectoryRepository,
} from "../../db/systemAdminTenantDirectoryRepository.ts";
import type {
  SystemAdminTenantDirectoryPage,
  SystemAdminTenantDirectoryQuery,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import {
  SYSTEM_ADMIN_SUBSCRIPTION_FILTERS,
  SYSTEM_ADMIN_TENANT_STATUS_FILTERS,
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

const tenantStatusFilters = new Set<string>(
  SYSTEM_ADMIN_TENANT_STATUS_FILTERS,
);

const subscriptionFilters = new Set<string>(
  SYSTEM_ADMIN_SUBSCRIPTION_FILTERS,
);

export function normalizeSystemAdminTenantDirectoryInput(
  input: unknown,
): SystemAdminTenantDirectoryQuery {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !==
      Object.prototype
  ) {
    return inputError();
  }

  const keys = Object.keys(input).sort();

  if (
    keys.length !== 4 ||
    keys[0] !== "afterTenantId" ||
    keys[1] !== "search" ||
    keys[2] !== "subscription" ||
    keys[3] !== "tenantStatus"
  ) {
    return inputError();
  }

  const {
    afterTenantId,
    search,
    subscription,
    tenantStatus,
  } = (
    input as {
      afterTenantId?: unknown;
      search?: unknown;
      subscription?: unknown;
      tenantStatus?: unknown;
    }
  );

  if (
    typeof search !== "string" ||
    search.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(search) ||
    typeof tenantStatus !== "string" ||
    !tenantStatusFilters.has(tenantStatus) ||
    typeof subscription !== "string" ||
    !subscriptionFilters.has(subscription)
  ) {
    return inputError();
  }

  let parsedCursor: number | null;

  if (afterTenantId === null) {
    parsedCursor = null;
  } else {
    if (
      typeof afterTenantId !== "number"
    ) {
      return inputError();
    }

    try {
      parsedCursor = requirePositiveTenantId(
        afterTenantId,
      );
    } catch {
      return inputError();
    }
  }

  return {
    afterTenantId: parsedCursor,
    search: search
      .trim()
      .toLocaleLowerCase("he-IL"),
    tenantStatus:
      tenantStatus as SystemAdminTenantDirectoryQuery["tenantStatus"],
    subscription:
      subscription as SystemAdminTenantDirectoryQuery["subscription"],
  };
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
        normalizeSystemAdminTenantDirectoryInput(input),
      );
    },
  };
}
