import type {
  PostgresMutationRateLimitPolicy,
} from "./postgresMutationRateLimitBinding.ts";

export const postgresTenantMutationRateLimitEnvironmentKeys = Object.freeze([
  "TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION",
  "TENANT_MUTATION_RATE_LIMIT_CAPACITY",
  "TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS",
] as const);

export type PostgresTenantMutationRateLimitEnvironmentKey =
  (typeof postgresTenantMutationRateLimitEnvironmentKeys)[number];

export type PostgresTenantMutationRateLimitEnvironment = Partial<
  Record<PostgresTenantMutationRateLimitEnvironmentKey, string | undefined>
>;

export type PostgresTenantMutationRateLimitConfigurationState =
  | Readonly<{
      status: "configured";
      missingKeys: readonly [];
      invalidKeys: readonly [];
      policy: Readonly<PostgresMutationRateLimitPolicy>;
    }>
  | Readonly<{
      status: "disabled" | "incomplete";
      missingKeys: readonly PostgresTenantMutationRateLimitEnvironmentKey[];
      invalidKeys: readonly [];
      policy: null;
    }>
  | Readonly<{
      status: "invalid";
      missingKeys: readonly [];
      invalidKeys: readonly PostgresTenantMutationRateLimitEnvironmentKey[];
      policy: null;
    }>;

const emptyKeys: readonly [] = Object.freeze([]);

function readProcessEnvironment(): PostgresTenantMutationRateLimitEnvironment {
  return {
    TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION:
      process.env.TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION,
    TENANT_MUTATION_RATE_LIMIT_CAPACITY:
      process.env.TENANT_MUTATION_RATE_LIMIT_CAPACITY,
    TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS:
      process.env.TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS,
  };
}

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseBoundedInteger(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  if (!/^[1-9][0-9]*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) &&
    parsed >= minimum &&
    parsed <= maximum
    ? parsed
    : null;
}

export function inspectPostgresTenantMutationRateLimitConfiguration(
  environment: PostgresTenantMutationRateLimitEnvironment =
    readProcessEnvironment(),
): PostgresTenantMutationRateLimitConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: Object.freeze([
        ...postgresTenantMutationRateLimitEnvironmentKeys,
      ]),
      policy: null,
    });
  }

  const missingKeys = postgresTenantMutationRateLimitEnvironmentKeys.filter(
    (key) => !hasValue(environment[key]),
  );

  if (missingKeys.length > 0) {
    return Object.freeze({
      status:
        missingKeys.length ===
        postgresTenantMutationRateLimitEnvironmentKeys.length
          ? "disabled"
          : "incomplete",
      missingKeys: Object.freeze([...missingKeys]),
      invalidKeys: emptyKeys,
      policy: null,
    });
  }

  const policyVersion = parseBoundedInteger(
    environment.TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION!,
    1,
    2_147_483_647,
  );
  const capacity = parseBoundedInteger(
    environment.TENANT_MUTATION_RATE_LIMIT_CAPACITY!,
    1,
    1_000_000,
  );
  const refillPeriodSeconds = parseBoundedInteger(
    environment.TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS!,
    1,
    86_400,
  );
  const invalidKeys: PostgresTenantMutationRateLimitEnvironmentKey[] = [];

  if (policyVersion === null) {
    invalidKeys.push("TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION");
  }
  if (capacity === null) {
    invalidKeys.push("TENANT_MUTATION_RATE_LIMIT_CAPACITY");
  }
  if (refillPeriodSeconds === null) {
    invalidKeys.push("TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS");
  }

  if (invalidKeys.length > 0) {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: Object.freeze(invalidKeys),
      policy: null,
    });
  }

  return Object.freeze({
    status: "configured",
    missingKeys: emptyKeys,
    invalidKeys: emptyKeys,
    policy: Object.freeze({
      policyId: "tenant-mutation",
      policyVersion: policyVersion!,
      capacity: capacity!,
      refillPeriodSeconds: refillPeriodSeconds!,
    }),
  });
}
