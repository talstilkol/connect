import {
  X509Certificate,
} from "node:crypto";

import {
  Pool,
  type PoolConfig,
} from "pg";

export const nodePostgresPoolEnvironmentKeys = Object.freeze([
  "APP_RUNTIME_ENVIRONMENT",
  "DATABASE_URL",
  "POSTGRES_APPLICATION_NAME",
  "POSTGRES_MAX_CONNECTIONS",
  "POSTGRES_CONNECTION_TIMEOUT_MS",
  "POSTGRES_IDLE_TIMEOUT_MS",
  "POSTGRES_STATEMENT_TIMEOUT_MS",
  "POSTGRES_QUERY_TIMEOUT_MS",
  "POSTGRES_LOCK_TIMEOUT_MS",
  "POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS",
  "POSTGRES_MAX_LIFETIME_SECONDS",
  "POSTGRES_TLS_MODE",
] as const);

export type NodePostgresPoolEnvironmentKey =
  (typeof nodePostgresPoolEnvironmentKeys)[number];

export interface NodePostgresPoolEnvironment
  extends Partial<
    Record<NodePostgresPoolEnvironmentKey, string | undefined>
  > {
  readonly POSTGRES_TLS_CA_PEM?: string;
}

type RuntimeEnvironment =
  | "development"
  | "test"
  | "staging"
  | "production";

type PostgresTlsMode = "disabled" | "verify-full";

export interface NodePostgresPoolConfiguration {
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly connectionString: string;
  readonly applicationName: string;
  readonly maximumConnections: number;
  readonly connectionTimeoutMilliseconds: number;
  readonly idleTimeoutMilliseconds: number;
  readonly statementTimeoutMilliseconds: number;
  readonly queryTimeoutMilliseconds: number;
  readonly lockTimeoutMilliseconds: number;
  readonly idleTransactionTimeoutMilliseconds: number;
  readonly maximumLifetimeSeconds: number;
  readonly tlsMode: PostgresTlsMode;
  readonly certificateAuthority: string | null;
}

export type NodePostgresPoolConfigurationState =
  | Readonly<{
      status: "configured";
      missingKeys: readonly [];
      invalidKeys: readonly [];
      configuration: Readonly<NodePostgresPoolConfiguration>;
    }>
  | Readonly<{
      status: "disabled" | "incomplete";
      missingKeys: readonly NodePostgresPoolEnvironmentKey[];
      invalidKeys: readonly [];
      configuration: null;
    }>
  | Readonly<{
      status: "invalid";
      missingKeys: readonly [];
      invalidKeys: readonly (
        | NodePostgresPoolEnvironmentKey
        | "POSTGRES_TLS_CA_PEM"
      )[];
      configuration: null;
    }>;

export interface NodePostgresPoolTelemetry {
  readonly recordIdleClientError: () => void;
}

const EMPTY_KEYS: readonly [] = Object.freeze([]);
const runtimeEnvironments: readonly RuntimeEnvironment[] = Object.freeze([
  "development",
  "test",
  "staging",
  "production",
]);
const tlsModes: readonly PostgresTlsMode[] = Object.freeze([
  "disabled",
  "verify-full",
]);
const safeApplicationNamePattern = /^[A-Za-z0-9._-]{1,64}$/;
const loopbackHostnames = Object.freeze([
  "127.0.0.1",
  "localhost",
  "[::1]",
]);

function readProcessEnvironment(): NodePostgresPoolEnvironment {
  return {
    APP_RUNTIME_ENVIRONMENT:
      process.env.APP_RUNTIME_ENVIRONMENT,
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_APPLICATION_NAME:
      process.env.POSTGRES_APPLICATION_NAME,
    POSTGRES_MAX_CONNECTIONS:
      process.env.POSTGRES_MAX_CONNECTIONS,
    POSTGRES_CONNECTION_TIMEOUT_MS:
      process.env.POSTGRES_CONNECTION_TIMEOUT_MS,
    POSTGRES_IDLE_TIMEOUT_MS:
      process.env.POSTGRES_IDLE_TIMEOUT_MS,
    POSTGRES_STATEMENT_TIMEOUT_MS:
      process.env.POSTGRES_STATEMENT_TIMEOUT_MS,
    POSTGRES_QUERY_TIMEOUT_MS:
      process.env.POSTGRES_QUERY_TIMEOUT_MS,
    POSTGRES_LOCK_TIMEOUT_MS:
      process.env.POSTGRES_LOCK_TIMEOUT_MS,
    POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS:
      process.env.POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS,
    POSTGRES_MAX_LIFETIME_SECONDS:
      process.env.POSTGRES_MAX_LIFETIME_SECONDS,
    POSTGRES_TLS_MODE: process.env.POSTGRES_TLS_MODE,
    POSTGRES_TLS_CA_PEM:
      process.env.POSTGRES_TLS_CA_PEM,
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
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) &&
    parsed >= minimum &&
    parsed <= maximum
    ? parsed
    : null;
}

function validCertificateAuthority(value: string): boolean {
  if (
    value.length < 64 ||
    value.length > 65_536 ||
    !value.startsWith("-----BEGIN CERTIFICATE-----") ||
    !value.trimEnd().endsWith("-----END CERTIFICATE-----")
  ) {
    return false;
  }

  try {
    new X509Certificate(value);
    return true;
  } catch {
    return false;
  }
}

function inspectConnectionString(
  value: string,
  runtimeEnvironment: RuntimeEnvironment,
): boolean {
  if (value.length > 8_192) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const databaseName = url.pathname.slice(1);
  const port = Number(url.port);
  const remoteRequired =
    runtimeEnvironment === "staging" ||
    runtimeEnvironment === "production";

  return (
    ["postgres:", "postgresql:"].includes(url.protocol) &&
    url.username.length > 0 &&
    url.username.length <= 1_024 &&
    url.password.length <= 4_096 &&
    url.hostname.length > 0 &&
    url.hostname.length <= 255 &&
    Number.isSafeInteger(port) &&
    port >= 1 &&
    port <= 65_535 &&
    databaseName.length > 0 &&
    databaseName.length <= 128 &&
    !databaseName.includes("/") &&
    url.search === "" &&
    url.hash === "" &&
    (!remoteRequired || !loopbackHostnames.includes(url.hostname))
  );
}

function frozenKeys<TKey extends string>(keys: readonly TKey[]) {
  return Object.freeze([...keys]);
}

export function inspectNodePostgresPoolConfiguration(
  environment: NodePostgresPoolEnvironment =
    readProcessEnvironment(),
): NodePostgresPoolConfigurationState {
  const missingKeys = nodePostgresPoolEnvironmentKeys.filter(
    (key) => !hasValue(environment[key]),
  );

  if (missingKeys.length > 0) {
    return Object.freeze({
      status:
        missingKeys.length === nodePostgresPoolEnvironmentKeys.length
          ? "disabled"
          : "incomplete",
      missingKeys: frozenKeys(missingKeys),
      invalidKeys: EMPTY_KEYS,
      configuration: null,
    });
  }

  const runtimeEnvironment =
    environment.APP_RUNTIME_ENVIRONMENT! as RuntimeEnvironment;
  const tlsMode = environment.POSTGRES_TLS_MODE! as PostgresTlsMode;
  const invalidKeys: (
    | NodePostgresPoolEnvironmentKey
    | "POSTGRES_TLS_CA_PEM"
  )[] = [];

  if (!runtimeEnvironments.includes(runtimeEnvironment)) {
    invalidKeys.push("APP_RUNTIME_ENVIRONMENT");
  }
  if (!tlsModes.includes(tlsMode)) {
    invalidKeys.push("POSTGRES_TLS_MODE");
  }
  if (
    runtimeEnvironments.includes(runtimeEnvironment) &&
    !inspectConnectionString(
      environment.DATABASE_URL!,
      runtimeEnvironment,
    )
  ) {
    invalidKeys.push("DATABASE_URL");
  }
  if (
    !safeApplicationNamePattern.test(
      environment.POSTGRES_APPLICATION_NAME!,
    )
  ) {
    invalidKeys.push("POSTGRES_APPLICATION_NAME");
  }

  const maximumConnections = parseBoundedInteger(
    environment.POSTGRES_MAX_CONNECTIONS!,
    1,
    100,
  );
  const connectionTimeoutMilliseconds = parseBoundedInteger(
    environment.POSTGRES_CONNECTION_TIMEOUT_MS!,
    250,
    60_000,
  );
  const idleTimeoutMilliseconds = parseBoundedInteger(
    environment.POSTGRES_IDLE_TIMEOUT_MS!,
    1_000,
    600_000,
  );
  const statementTimeoutMilliseconds = parseBoundedInteger(
    environment.POSTGRES_STATEMENT_TIMEOUT_MS!,
    100,
    120_000,
  );
  const queryTimeoutMilliseconds = parseBoundedInteger(
    environment.POSTGRES_QUERY_TIMEOUT_MS!,
    100,
    120_000,
  );
  const lockTimeoutMilliseconds = parseBoundedInteger(
    environment.POSTGRES_LOCK_TIMEOUT_MS!,
    100,
    30_000,
  );
  const idleTransactionTimeoutMilliseconds = parseBoundedInteger(
    environment.POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS!,
    1_000,
    120_000,
  );
  const maximumLifetimeSeconds = parseBoundedInteger(
    environment.POSTGRES_MAX_LIFETIME_SECONDS!,
    60,
    86_400,
  );
  const numericValues = Object.freeze([
    ["POSTGRES_MAX_CONNECTIONS", maximumConnections],
    ["POSTGRES_CONNECTION_TIMEOUT_MS", connectionTimeoutMilliseconds],
    ["POSTGRES_IDLE_TIMEOUT_MS", idleTimeoutMilliseconds],
    ["POSTGRES_STATEMENT_TIMEOUT_MS", statementTimeoutMilliseconds],
    ["POSTGRES_QUERY_TIMEOUT_MS", queryTimeoutMilliseconds],
    ["POSTGRES_LOCK_TIMEOUT_MS", lockTimeoutMilliseconds],
    [
      "POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS",
      idleTransactionTimeoutMilliseconds,
    ],
    ["POSTGRES_MAX_LIFETIME_SECONDS", maximumLifetimeSeconds],
  ] as const);

  for (const [key, parsed] of numericValues) {
    if (parsed === null) {
      invalidKeys.push(key);
    }
  }

  if (
    (runtimeEnvironment === "staging" ||
      runtimeEnvironment === "production") &&
    tlsMode !== "verify-full"
  ) {
    invalidKeys.push("POSTGRES_TLS_MODE");
  }

  const certificateAuthority = hasValue(
    environment.POSTGRES_TLS_CA_PEM,
  )
    ? environment.POSTGRES_TLS_CA_PEM
    : null;
  if (
    certificateAuthority !== null &&
    !validCertificateAuthority(certificateAuthority)
  ) {
    invalidKeys.push("POSTGRES_TLS_CA_PEM");
  }
  if (certificateAuthority !== null && tlsMode === "disabled") {
    invalidKeys.push("POSTGRES_TLS_CA_PEM");
  }

  if (invalidKeys.length > 0) {
    return Object.freeze({
      status: "invalid",
      missingKeys: EMPTY_KEYS,
      invalidKeys: frozenKeys(Array.from(new Set(invalidKeys))),
      configuration: null,
    });
  }

  return Object.freeze({
    status: "configured",
    missingKeys: EMPTY_KEYS,
    invalidKeys: EMPTY_KEYS,
    configuration: Object.freeze({
      runtimeEnvironment,
      connectionString: environment.DATABASE_URL!,
      applicationName: environment.POSTGRES_APPLICATION_NAME!,
      maximumConnections: maximumConnections!,
      connectionTimeoutMilliseconds: connectionTimeoutMilliseconds!,
      idleTimeoutMilliseconds: idleTimeoutMilliseconds!,
      statementTimeoutMilliseconds: statementTimeoutMilliseconds!,
      queryTimeoutMilliseconds: queryTimeoutMilliseconds!,
      lockTimeoutMilliseconds: lockTimeoutMilliseconds!,
      idleTransactionTimeoutMilliseconds:
        idleTransactionTimeoutMilliseconds!,
      maximumLifetimeSeconds: maximumLifetimeSeconds!,
      tlsMode,
      certificateAuthority,
    }),
  });
}

function buildPoolConfig(
  configuration: Readonly<NodePostgresPoolConfiguration>,
): PoolConfig {
  return {
    connectionString: configuration.connectionString,
    application_name: configuration.applicationName,
    max: configuration.maximumConnections,
    min: 0,
    connectionTimeoutMillis:
      configuration.connectionTimeoutMilliseconds,
    idleTimeoutMillis: configuration.idleTimeoutMilliseconds,
    statement_timeout: configuration.statementTimeoutMilliseconds,
    query_timeout: configuration.queryTimeoutMilliseconds,
    lock_timeout: configuration.lockTimeoutMilliseconds,
    idle_in_transaction_session_timeout:
      configuration.idleTransactionTimeoutMilliseconds,
    maxLifetimeSeconds: configuration.maximumLifetimeSeconds,
    allowExitOnIdle: false,
    ssl:
      configuration.tlsMode === "verify-full"
        ? {
            rejectUnauthorized: true,
            ...(configuration.certificateAuthority === null
              ? {}
              : { ca: configuration.certificateAuthority }),
          }
        : false,
  };
}

function requirePoolConfiguration(
  value: Readonly<NodePostgresPoolConfiguration>,
): Readonly<NodePostgresPoolConfiguration> {
  const expectedKeys = Object.freeze([
    "runtimeEnvironment",
    "connectionString",
    "applicationName",
    "maximumConnections",
    "connectionTimeoutMilliseconds",
    "idleTimeoutMilliseconds",
    "statementTimeoutMilliseconds",
    "queryTimeoutMilliseconds",
    "lockTimeoutMilliseconds",
    "idleTransactionTimeoutMilliseconds",
    "maximumLifetimeSeconds",
    "tlsMode",
    "certificateAuthority",
  ]);
  if (
    !value ||
    typeof value !== "object" ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...expectedKeys].sort()) ||
    typeof value.runtimeEnvironment !== "string" ||
    typeof value.connectionString !== "string" ||
    typeof value.applicationName !== "string" ||
    typeof value.maximumConnections !== "number" ||
    typeof value.connectionTimeoutMilliseconds !== "number" ||
    typeof value.idleTimeoutMilliseconds !== "number" ||
    typeof value.statementTimeoutMilliseconds !== "number" ||
    typeof value.queryTimeoutMilliseconds !== "number" ||
    typeof value.lockTimeoutMilliseconds !== "number" ||
    typeof value.idleTransactionTimeoutMilliseconds !== "number" ||
    typeof value.maximumLifetimeSeconds !== "number" ||
    typeof value.tlsMode !== "string" ||
    (value.certificateAuthority !== null &&
      typeof value.certificateAuthority !== "string")
  ) {
    throw new Error("NODE_POSTGRES_POOL_CONFIGURATION_INVALID");
  }

  const state = inspectNodePostgresPoolConfiguration({
    APP_RUNTIME_ENVIRONMENT: value.runtimeEnvironment,
    DATABASE_URL: value.connectionString,
    POSTGRES_APPLICATION_NAME: value.applicationName,
    POSTGRES_MAX_CONNECTIONS: String(value.maximumConnections),
    POSTGRES_CONNECTION_TIMEOUT_MS: String(
      value.connectionTimeoutMilliseconds,
    ),
    POSTGRES_IDLE_TIMEOUT_MS: String(value.idleTimeoutMilliseconds),
    POSTGRES_STATEMENT_TIMEOUT_MS: String(
      value.statementTimeoutMilliseconds,
    ),
    POSTGRES_QUERY_TIMEOUT_MS: String(value.queryTimeoutMilliseconds),
    POSTGRES_LOCK_TIMEOUT_MS: String(value.lockTimeoutMilliseconds),
    POSTGRES_IDLE_TRANSACTION_TIMEOUT_MS: String(
      value.idleTransactionTimeoutMilliseconds,
    ),
    POSTGRES_MAX_LIFETIME_SECONDS: String(
      value.maximumLifetimeSeconds,
    ),
    POSTGRES_TLS_MODE: value.tlsMode,
    POSTGRES_TLS_CA_PEM: value.certificateAuthority ?? undefined,
  });

  if (state.status !== "configured") {
    throw new Error("NODE_POSTGRES_POOL_CONFIGURATION_INVALID");
  }

  return state.configuration;
}

export function createNodePostgresPool(
  configuration: Readonly<NodePostgresPoolConfiguration>,
  telemetry: Readonly<NodePostgresPoolTelemetry>,
): Pool {
  if (
    !telemetry ||
    typeof telemetry.recordIdleClientError !== "function"
  ) {
    throw new Error("NODE_POSTGRES_POOL_TELEMETRY_INVALID");
  }

  const checkedConfiguration = requirePoolConfiguration(configuration);
  const pool = new Pool(buildPoolConfig(checkedConfiguration));
  pool.on("error", () => {
    telemetry.recordIdleClientError();
  });
  return pool;
}
