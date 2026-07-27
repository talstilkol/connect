"use server";

import {
  createTenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import {
  createTenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import {
  requireRuntimeDatabase,
} from "../../db/runtimeDatabase.ts";
import {
  enforceCurrentTenantMutationRateLimit,
  TenantMutationRateLimitError,
} from "../security/tenantMutationRateLimit.ts";
import {
  inspectClerkConfiguration,
} from "./clerkConfiguration.ts";
import {
  readClerkIdentity,
} from "./clerkIdentity.ts";
import {
  TenantSelectionConflictError,
  TenantSelectionInputError,
  createTenantSelectionService,
  type TenantSelectionDirectory,
  type TenantSelectionInputIssue,
} from "./tenantSelectionService.ts";
import {
  TenantSessionError,
} from "./tenantSession.ts";

type TenantSelectionActionFailure =
  | {
      status:
        "configuration-required";
    }
  | {
      status: "unauthenticated";
    }
  | {
      status:
        "onboarding-required";
    }
  | {
      status:
        "selection-required";
    }
  | {
      status: "conflict";
    }
  | {
      status: "rate-limited";
    }
  | {
      status:
        "temporarily-unavailable";
    }
  | {
      status: "server-error";
    };

export type LoadTenantSelectionActionResult =
  | {
      status: "ready";
      directory:
        TenantSelectionDirectory;
    }
  | TenantSelectionActionFailure;

export type SelectTenantActionResult =
  | {
      status: "selected";
      version: number;
      unchanged: boolean;
    }
  | {
      status: "validation-error";
      issue:
        TenantSelectionInputIssue;
    }
  | TenantSelectionActionFailure;

async function createSelectionContext() {
  const identity =
    await readClerkIdentity();

  if (!identity) {
    return null;
  }

  const database =
    await requireRuntimeDatabase();

  return {
    identity,
    service:
      createTenantSelectionService({
        memberships:
          createTenantMembershipRepository(
            database,
          ),
        selections:
          createTenantSelectionRepository(
            database,
          ),
      }),
  };
}

function mapTenantSessionFailure(
  error: TenantSessionError,
): TenantSelectionActionFailure {
  if (
    error.code ===
      "AUTHENTICATION_REQUIRED"
  ) {
    return {
      status: "unauthenticated",
    };
  }

  if (
    error.code ===
      "TENANT_MEMBERSHIP_REQUIRED"
  ) {
    return {
      status:
        "onboarding-required",
    };
  }

  return {
    status: "selection-required",
  };
}

export async function loadTenantSelectionAction():
Promise<LoadTenantSelectionActionResult> {
  if (
    inspectClerkConfiguration()
      .status !== "configured"
  ) {
    return {
      status:
        "configuration-required",
    };
  }

  try {
    const context =
      await createSelectionContext();

    if (!context) {
      return {
        status: "unauthenticated",
      };
    }

    return {
      status: "ready",
      directory:
        await context.service.list(
          context.identity,
        ),
    };
  } catch (error) {
    if (
      error instanceof
      TenantSessionError
    ) {
      return mapTenantSessionFailure(
        error,
      );
    }

    return {
      status: "server-error",
    };
  }
}

export async function selectTenantAction(
  input: unknown,
): Promise<SelectTenantActionResult> {
  if (
    inspectClerkConfiguration()
      .status !== "configured"
  ) {
    return {
      status:
        "configuration-required",
    };
  }

  try {
    const context =
      await createSelectionContext();

    if (!context) {
      return {
        status: "unauthenticated",
      };
    }

    await enforceCurrentTenantMutationRateLimit(
      context.identity.externalUserId,
    );
    const result =
      await context.service.select(
        context.identity,
        input,
      );

    return {
      status: "selected",
      version: result.version,
      unchanged:
        result.outcome ===
        "unchanged",
    };
  } catch (error) {
    if (
      error instanceof
      TenantSelectionInputError
    ) {
      return {
        status: "validation-error",
        issue: error.issue,
      };
    }

    if (
      error instanceof
      TenantSelectionConflictError
    ) {
      return {
        status: "conflict",
      };
    }

    if (
      error instanceof
      TenantSessionError
    ) {
      return mapTenantSessionFailure(
        error,
      );
    }

    if (
      error instanceof
      TenantMutationRateLimitError
    ) {
      return {
        status:
          error.code ===
          "RATE_LIMITED"
            ? "rate-limited"
            : "temporarily-unavailable",
      };
    }

    return {
      status: "server-error",
    };
  }
}
