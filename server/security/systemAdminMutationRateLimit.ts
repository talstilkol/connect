import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  createRateLimitGuard,
  RateLimitConfigurationError,
  RateLimitUnavailableError,
  type RateLimitBinding,
} from "./rateLimit.ts";

export type SystemAdminMutationRateLimitErrorCode =
  | "RATE_LIMITED"
  | "RATE_LIMIT_UNAVAILABLE";

export class SystemAdminMutationRateLimitError extends Error {
  readonly code:
    SystemAdminMutationRateLimitErrorCode;

  constructor(
    code:
      SystemAdminMutationRateLimitErrorCode,
  ) {
    super(
      "System administrator mutation is temporarily unavailable",
    );
    this.name =
      "SystemAdminMutationRateLimitError";
    this.code = code;
  }
}

export async function enforceSystemAdminMutationRateLimit(
  externalUserId: UserId,
  binding: RateLimitBinding | undefined,
): Promise<void> {
  try {
    const decision = await createRateLimitGuard(
      binding,
      "system-admin-mutation",
    ).consume(externalUserId);

    if (decision.outcome === "limited") {
      throw new SystemAdminMutationRateLimitError(
        "RATE_LIMITED",
      );
    }
  } catch (error) {
    if (
      error instanceof
      SystemAdminMutationRateLimitError
    ) {
      throw error;
    }

    if (
      error instanceof
        RateLimitConfigurationError ||
      error instanceof
        RateLimitUnavailableError
    ) {
      throw new SystemAdminMutationRateLimitError(
        "RATE_LIMIT_UNAVAILABLE",
      );
    }

    throw new SystemAdminMutationRateLimitError(
      "RATE_LIMIT_UNAVAILABLE",
    );
  }
}

export async function enforceCurrentSystemAdminMutationRateLimit(
  externalUserId: UserId,
): Promise<void> {
  const { env } = await import(
    "cloudflare:workers"
  );

  await enforceSystemAdminMutationRateLimit(
    externalUserId,
    env.SYSTEM_ADMIN_MUTATION_RATE_LIMITER,
  );
}
