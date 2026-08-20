import type {
  PostgresMutationRateLimitPolicy,
  PostgresMutationRateLimitPolicyId,
} from "./postgresMutationRateLimitBinding.ts";

export const postgresTenantMutationRateLimitEnvironmentKeys = Object.freeze([
  "TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION",
  "TENANT_MUTATION_RATE_LIMIT_CAPACITY",
  "TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS",
] as const);

export const postgresSystemAdminMutationRateLimitEnvironmentKeys =
  Object.freeze([
    "SYSTEM_ADMIN_MUTATION_RATE_LIMIT_POLICY_VERSION",
    "SYSTEM_ADMIN_MUTATION_RATE_LIMIT_CAPACITY",
    "SYSTEM_ADMIN_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS",
  ] as const);

export const postgresMetaWebhookRateLimitEnvironmentKeys = Object.freeze([
  "META_WEBHOOK_RATE_LIMIT_POLICY_VERSION",
  "META_WEBHOOK_RATE_LIMIT_CAPACITY",
  "META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS",
] as const);

export type PostgresTenantMutationRateLimitEnvironmentKey =
  (typeof postgresTenantMutationRateLimitEnvironmentKeys)[number];

export type PostgresSystemAdminMutationRateLimitEnvironmentKey =
  (typeof postgresSystemAdminMutationRateLimitEnvironmentKeys)[number];

export type PostgresMetaWebhookRateLimitEnvironmentKey =
  (typeof postgresMetaWebhookRateLimitEnvironmentKeys)[number];

export type PostgresRateLimitEnvironmentKey =
  | PostgresTenantMutationRateLimitEnvironmentKey
  | PostgresSystemAdminMutationRateLimitEnvironmentKey
  | PostgresMetaWebhookRateLimitEnvironmentKey;

export type PostgresRateLimitEnvironment = Partial<
  Record<PostgresRateLimitEnvironmentKey, string | undefined>
>;

export type PostgresTenantMutationRateLimitEnvironment =
  PostgresRateLimitEnvironment;

export type PostgresRateLimitConfigurationState =
  | Readonly<{
      status: "configured";
      missingKeys: readonly [];
      invalidKeys: readonly [];
      policy: Readonly<PostgresMutationRateLimitPolicy>;
    }>
  | Readonly<{
      status: "disabled" | "incomplete";
      missingKeys: readonly PostgresRateLimitEnvironmentKey[];
      invalidKeys: readonly [];
      policy: null;
    }>
  | Readonly<{
      status: "invalid";
      missingKeys: readonly [];
      invalidKeys: readonly PostgresRateLimitEnvironmentKey[];
      policy: null;
    }>;

export type PostgresTenantMutationRateLimitConfigurationState =
  PostgresRateLimitConfigurationState;

interface PostgresRateLimitPolicyDefinition {
  readonly policyId: PostgresMutationRateLimitPolicyId;
  readonly environmentKeys: readonly [
    PostgresRateLimitEnvironmentKey,
    PostgresRateLimitEnvironmentKey,
    PostgresRateLimitEnvironmentKey,
  ];
}

const emptyKeys: readonly [] = Object.freeze([]);

const policyDefinitions = Object.freeze({
  tenantMutation: Object.freeze({
    policyId: "tenant-mutation",
    environmentKeys: postgresTenantMutationRateLimitEnvironmentKeys,
  }),
  systemAdminMutation: Object.freeze({
    policyId: "system-admin-mutation",
    environmentKeys: postgresSystemAdminMutationRateLimitEnvironmentKeys,
  }),
  metaWebhook: Object.freeze({
    policyId: "meta-webhook",
    environmentKeys: postgresMetaWebhookRateLimitEnvironmentKeys,
  }),
} as const satisfies Readonly<
  Record<string, Readonly<PostgresRateLimitPolicyDefinition>>
>);

function readProcessEnvironment(): PostgresRateLimitEnvironment {
  return {
    TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION:
      process.env.TENANT_MUTATION_RATE_LIMIT_POLICY_VERSION,
    TENANT_MUTATION_RATE_LIMIT_CAPACITY:
      process.env.TENANT_MUTATION_RATE_LIMIT_CAPACITY,
    TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS:
      process.env.TENANT_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS,
    SYSTEM_ADMIN_MUTATION_RATE_LIMIT_POLICY_VERSION:
      process.env.SYSTEM_ADMIN_MUTATION_RATE_LIMIT_POLICY_VERSION,
    SYSTEM_ADMIN_MUTATION_RATE_LIMIT_CAPACITY:
      process.env.SYSTEM_ADMIN_MUTATION_RATE_LIMIT_CAPACITY,
    SYSTEM_ADMIN_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS:
      process.env.SYSTEM_ADMIN_MUTATION_RATE_LIMIT_REFILL_PERIOD_SECONDS,
    META_WEBHOOK_RATE_LIMIT_POLICY_VERSION:
      process.env.META_WEBHOOK_RATE_LIMIT_POLICY_VERSION,
    META_WEBHOOK_RATE_LIMIT_CAPACITY:
      process.env.META_WEBHOOK_RATE_LIMIT_CAPACITY,
    META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS:
      process.env.META_WEBHOOK_RATE_LIMIT_REFILL_PERIOD_SECONDS,
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

function inspectConfiguration(
  definition: Readonly<PostgresRateLimitPolicyDefinition>,
  environment: PostgresRateLimitEnvironment,
): PostgresRateLimitConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: Object.freeze([...definition.environmentKeys]),
      policy: null,
    });
  }

  const missingKeys = definition.environmentKeys.filter(
    (key) => !hasValue(environment[key]),
  );

  if (missingKeys.length > 0) {
    return Object.freeze({
      status:
        missingKeys.length === definition.environmentKeys.length
          ? "disabled"
          : "incomplete",
      missingKeys: Object.freeze([...missingKeys]),
      invalidKeys: emptyKeys,
      policy: null,
    });
  }

  const [versionKey, capacityKey, refillKey] = definition.environmentKeys;
  const policyVersion = parseBoundedInteger(
    environment[versionKey]!,
    1,
    2_147_483_647,
  );
  const capacity = parseBoundedInteger(
    environment[capacityKey]!,
    1,
    1_000_000,
  );
  const refillPeriodSeconds = parseBoundedInteger(
    environment[refillKey]!,
    1,
    86_400,
  );
  const invalidKeys: PostgresRateLimitEnvironmentKey[] = [];

  if (policyVersion === null) {
    invalidKeys.push(versionKey);
  }
  if (capacity === null) {
    invalidKeys.push(capacityKey);
  }
  if (refillPeriodSeconds === null) {
    invalidKeys.push(refillKey);
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
      policyId: definition.policyId,
      policyVersion: policyVersion!,
      capacity: capacity!,
      refillPeriodSeconds: refillPeriodSeconds!,
    }),
  });
}

export function inspectPostgresTenantMutationRateLimitConfiguration(
  environment: PostgresRateLimitEnvironment = readProcessEnvironment(),
): PostgresRateLimitConfigurationState {
  return inspectConfiguration(policyDefinitions.tenantMutation, environment);
}

export function inspectPostgresSystemAdminMutationRateLimitConfiguration(
  environment: PostgresRateLimitEnvironment = readProcessEnvironment(),
): PostgresRateLimitConfigurationState {
  return inspectConfiguration(
    policyDefinitions.systemAdminMutation,
    environment,
  );
}

export function inspectPostgresMetaWebhookRateLimitConfiguration(
  environment: PostgresRateLimitEnvironment = readProcessEnvironment(),
): PostgresRateLimitConfigurationState {
  return inspectConfiguration(policyDefinitions.metaWebhook, environment);
}
