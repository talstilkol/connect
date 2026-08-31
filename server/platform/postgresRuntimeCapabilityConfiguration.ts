import { isIP } from "node:net";

export const postgresRuntimeCapabilities = Object.freeze([
  "api",
  "worker",
  "verifier",
  "migration",
] as const);

export type PostgresRuntimeCapability =
  (typeof postgresRuntimeCapabilities)[number];

export const postgresRuntimeCapabilityUrlKeys = Object.freeze({
  api: "POSTGRES_API_URL",
  worker: "POSTGRES_WORKER_URL",
  verifier: "POSTGRES_VERIFIER_URL",
  migration: "POSTGRES_MIGRATION_URL",
} as const);

export const postgresRuntimeCapabilityLoginRoles = Object.freeze({
  api: "connect_api_runtime",
  worker: "connect_worker_runtime",
  verifier: "connect_verifier_runtime",
  migration: "connect_migrator_login",
} as const);

export const postgresMigrationOwnerRole =
  "connect_migration_owner" as const;

export const postgresRuntimeCapabilityEnvironmentKeys = Object.freeze([
  "APP_RUNTIME_ENVIRONMENT",
  "DATABASE_URL",
  "POSTGRES_API_URL",
  "POSTGRES_WORKER_URL",
  "POSTGRES_VERIFIER_URL",
  "POSTGRES_MIGRATION_URL",
  "POSTGRES_OWNER_URL",
] as const);

export type PostgresRuntimeCapabilityUrlKey =
  (typeof postgresRuntimeCapabilityUrlKeys)[PostgresRuntimeCapability];

export type PostgresRuntimeCapabilityEnvironmentKey =
  (typeof postgresRuntimeCapabilityEnvironmentKeys)[number];

export type PostgresRuntimeCapabilityEnvironment = Partial<
  Record<PostgresRuntimeCapabilityEnvironmentKey, string | undefined>
>;

type RuntimeEnvironment =
  | "development"
  | "test"
  | "staging"
  | "production";

export interface PostgresRuntimeCapabilityConfiguration {
  readonly capability: PostgresRuntimeCapability;
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly urlEnvironmentKey: PostgresRuntimeCapabilityUrlKey;
  readonly loginRole: string;
}

type PostgresRuntimeCapabilityInvalidKey =
  | PostgresRuntimeCapabilityEnvironmentKey
  | "POSTGRES_RUNTIME_CAPABILITY";

export type PostgresRuntimeCapabilityConfigurationState =
  | Readonly<{
      status: "configured";
      missingKeys: readonly [];
      invalidKeys: readonly [];
      configuration: Readonly<PostgresRuntimeCapabilityConfiguration>;
    }>
  | Readonly<{
      status: "disabled" | "incomplete";
      missingKeys: readonly PostgresRuntimeCapabilityEnvironmentKey[];
      invalidKeys: readonly [];
      configuration: null;
    }>
  | Readonly<{
      status: "invalid";
      missingKeys: readonly [];
      invalidKeys: readonly PostgresRuntimeCapabilityInvalidKey[];
      configuration: null;
    }>;

const emptyKeys: readonly [] = Object.freeze([]);
const runtimeEnvironments: readonly RuntimeEnvironment[] = Object.freeze([
  "development",
  "test",
  "staging",
  "production",
]);
const privateRailwayHostnamePattern =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*railway\.internal$/;
const railwayTcpProxyHostnamePattern =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+proxy\.rlwy\.net$/;
const databaseNamePattern = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$/;

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function frozenKeys<TKey extends string>(keys: readonly TKey[]) {
  return Object.freeze([...keys]);
}

function isCapability(value: unknown): value is PostgresRuntimeCapability {
  return typeof value === "string" &&
    postgresRuntimeCapabilities.includes(value as PostgresRuntimeCapability);
}

function isLocalOnlyHostname(hostname: string): boolean {
  const normalized = hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^\[|\]$/g, "");

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }

  const addressFamily = isIP(normalized);
  if (addressFamily === 4) {
    const octets = normalized.split(".").map(Number);
    return octets[0] === 127 || octets.every((octet) => octet === 0);
  }
  if (addressFamily === 6) {
    return normalized === "::" || normalized === "::1" ||
      /^::(?:ffff:)?7f[0-9a-f]{2}:/u.test(normalized);
  }

  return false;
}

function validConnectionString(
  value: string,
  capability: PostgresRuntimeCapability,
  runtimeEnvironment: RuntimeEnvironment,
): boolean {
  if (value.length > 8_192) return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const port = Number(url.port);
  const databaseName = url.pathname.slice(1);
  const productionLike =
    runtimeEnvironment === "staging" ||
    runtimeEnvironment === "production";
  const isLocalOnly = isLocalOnlyHostname(url.hostname);
  const isPrivateRailway = privateRailwayHostnamePattern.test(url.hostname);
  const isRailwayTcpProxy =
    railwayTcpProxyHostnamePattern.test(url.hostname);
  const hostAllowed = productionLike
    ? capability === "migration"
      ? !isLocalOnly && (isPrivateRailway || isRailwayTcpProxy)
      : isPrivateRailway
    : isLocalOnly;

  return (
    (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
    url.username === postgresRuntimeCapabilityLoginRoles[capability] &&
    (!productionLike || url.password.length > 0) &&
    url.password.length <= 4_096 &&
    url.hostname.length > 0 &&
    url.hostname.length <= 255 &&
    Number.isSafeInteger(port) &&
    port >= 1 &&
    port <= 65_535 &&
    databaseNamePattern.test(databaseName) &&
    url.search === "" &&
    url.hash === "" &&
    hostAllowed
  );
}

function invalidState(
  invalidKeys: readonly PostgresRuntimeCapabilityInvalidKey[],
): PostgresRuntimeCapabilityConfigurationState {
  return Object.freeze({
    status: "invalid" as const,
    missingKeys: emptyKeys,
    invalidKeys: frozenKeys(Array.from(new Set(invalidKeys))),
    configuration: null,
  });
}

function snapshotEnvironment(
  environment: Readonly<PostgresRuntimeCapabilityEnvironment>,
): Readonly<PostgresRuntimeCapabilityEnvironment> | null {
  if (!environment || typeof environment !== "object") return null;

  try {
    const prototype = Object.getPrototypeOf(environment);
    if (prototype !== Object.prototype && prototype !== null) return null;
    if (Object.getOwnPropertySymbols(environment).length > 0) return null;

    const ownPropertyNames = Object.getOwnPropertyNames(environment);
    const unknownKey = ownPropertyNames.some(
      (key) => !postgresRuntimeCapabilityEnvironmentKeys.includes(
        key as PostgresRuntimeCapabilityEnvironmentKey,
      ),
    );
    if (unknownKey) return null;

    const snapshot: PostgresRuntimeCapabilityEnvironment = {};
    for (const key of ownPropertyNames) {
      const descriptor = Object.getOwnPropertyDescriptor(environment, key);
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return null;
      }
      const value = descriptor.value;
      if (value !== undefined && typeof value !== "string") return null;
      if (value !== undefined) {
        snapshot[key as PostgresRuntimeCapabilityEnvironmentKey] = value;
      }
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

export function inspectPostgresRuntimeCapabilityConfiguration(
  capabilityInput: unknown,
  environment: Readonly<PostgresRuntimeCapabilityEnvironment>,
): PostgresRuntimeCapabilityConfigurationState {
  if (!isCapability(capabilityInput)) {
    return invalidState(["POSTGRES_RUNTIME_CAPABILITY"]);
  }
  const capability = capabilityInput;
  const checkedEnvironment = snapshotEnvironment(environment);
  if (checkedEnvironment === null) {
    return invalidState(postgresRuntimeCapabilityEnvironmentKeys);
  }

  const urlEnvironmentKey =
    postgresRuntimeCapabilityUrlKeys[capability];
  const forbiddenUrlKeys = Object.values(
    postgresRuntimeCapabilityUrlKeys,
  ).filter((key) => key !== urlEnvironmentKey);
  const leakedKeys: PostgresRuntimeCapabilityEnvironmentKey[] = [];

  if (hasValue(checkedEnvironment.DATABASE_URL)) {
    leakedKeys.push("DATABASE_URL");
  }
  if (hasValue(checkedEnvironment.POSTGRES_OWNER_URL)) {
    leakedKeys.push("POSTGRES_OWNER_URL");
  }
  for (const key of forbiddenUrlKeys) {
    if (hasValue(checkedEnvironment[key])) leakedKeys.push(key);
  }
  if (leakedKeys.length > 0) return invalidState(leakedKeys);

  const hasAnyConfiguration = postgresRuntimeCapabilityEnvironmentKeys.some(
    (key) => hasValue(checkedEnvironment[key]),
  );
  if (!hasAnyConfiguration) {
    return Object.freeze({
      status: "disabled" as const,
      missingKeys: frozenKeys([
        "APP_RUNTIME_ENVIRONMENT",
        urlEnvironmentKey,
      ]),
      invalidKeys: emptyKeys,
      configuration: null,
    });
  }

  const requiredKeys = Object.freeze([
    "APP_RUNTIME_ENVIRONMENT",
    urlEnvironmentKey,
  ] as const);
  const missingKeys = requiredKeys.filter(
    (key) => !hasValue(checkedEnvironment[key]),
  );
  if (missingKeys.length > 0) {
    return Object.freeze({
      status: "incomplete" as const,
      missingKeys: frozenKeys(missingKeys),
      invalidKeys: emptyKeys,
      configuration: null,
    });
  }

  const runtimeEnvironment =
    checkedEnvironment.APP_RUNTIME_ENVIRONMENT! as RuntimeEnvironment;
  const connectionString = checkedEnvironment[urlEnvironmentKey]!;
  const invalidKeys: PostgresRuntimeCapabilityEnvironmentKey[] = [];

  if (!runtimeEnvironments.includes(runtimeEnvironment)) {
    invalidKeys.push("APP_RUNTIME_ENVIRONMENT");
  } else if (!validConnectionString(
    connectionString,
    capability,
    runtimeEnvironment,
  )) {
    invalidKeys.push(urlEnvironmentKey);
  }

  if (invalidKeys.length > 0) return invalidState(invalidKeys);

  return Object.freeze({
    status: "configured" as const,
    missingKeys: emptyKeys,
    invalidKeys: emptyKeys,
      configuration: Object.freeze({
        capability,
        runtimeEnvironment,
        urlEnvironmentKey,
        loginRole: postgresRuntimeCapabilityLoginRoles[capability],
      }),
  });
}
