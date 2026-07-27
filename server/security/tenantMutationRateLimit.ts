import type {
  UserId,
} from "../../shared/domain/model.ts";
import {
  createRateLimitGuard,
  RateLimitConfigurationError,
  RateLimitUnavailableError,
  type RateLimitBinding,
} from "./rateLimit.ts";

export type TenantMutationRateLimitErrorCode =
  | "RATE_LIMITED"
  | "RATE_LIMIT_UNAVAILABLE";

export class TenantMutationRateLimitError extends Error {
  readonly code: TenantMutationRateLimitErrorCode;

  constructor(
    code: TenantMutationRateLimitErrorCode,
  ) {
    super("Tenant mutation is temporarily unavailable");
    this.name = "TenantMutationRateLimitError";
    this.code = code;
  }
}

export async function enforceTenantMutationRateLimit(
  externalUserId: UserId,
  binding: RateLimitBinding | undefined,
): Promise<void> {
  try {
    const decision = await createRateLimitGuard(
      binding,
      "tenant-mutation",
    ).consume(externalUserId);

    if (decision.outcome === "limited") {
      throw new TenantMutationRateLimitError(
        "RATE_LIMITED",
      );
    }
  } catch (error) {
    if (
      error instanceof
      TenantMutationRateLimitError
    ) {
      throw error;
    }

    if (
      error instanceof
        RateLimitConfigurationError ||
      error instanceof
        RateLimitUnavailableError
    ) {
      throw new TenantMutationRateLimitError(
        "RATE_LIMIT_UNAVAILABLE",
      );
    }

    throw new TenantMutationRateLimitError(
      "RATE_LIMIT_UNAVAILABLE",
    );
  }
}

export async function enforceCurrentTenantMutationRateLimit(
  externalUserId: UserId,
): Promise<void> {
  const { env } = await import(
    "cloudflare:workers"
  );

  await enforceTenantMutationRateLimit(
    externalUserId,
    env.TENANT_MUTATION_RATE_LIMITER,
  );
}
