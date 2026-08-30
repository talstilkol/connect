export const railwayBullMqEnvironmentKeys = Object.freeze([
  "APP_RUNTIME_ENVIRONMENT",
  "REDIS_URL",
  "BULLMQ_COMPLETED_RETENTION_SECONDS",
  "BULLMQ_COMPLETED_RETENTION_COUNT",
  "BULLMQ_FAILED_RETENTION_SECONDS",
  "BULLMQ_FAILED_RETENTION_COUNT",
  "BULLMQ_DLQ_RETENTION_SECONDS",
  "BULLMQ_DLQ_CLEAN_BATCH_SIZE",
] as const);

export type RailwayBullMqEnvironmentKey =
  (typeof railwayBullMqEnvironmentKeys)[number];

export type RailwayBullMqEnvironment = Partial<
  Record<RailwayBullMqEnvironmentKey, string | undefined>
>;

type RuntimeEnvironment =
  | "development"
  | "test"
  | "staging"
  | "production";

export interface RailwayBullMqRetentionConfiguration {
  readonly completedSeconds: number;
  readonly completedCount: number;
  readonly failedSeconds: number;
  readonly failedCount: number;
  readonly deadLetterSeconds: number;
  readonly deadLetterCleanBatchSize: number;
}

export interface RailwayBullMqConnectionConfiguration {
  readonly url: string;
  readonly family: 0;
  readonly connectTimeout: 5_000;
  readonly keepAlive: 10_000;
  readonly noDelay: true;
}

export interface RailwayBullMqConfiguration {
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly prefix: string;
  readonly connection: RailwayBullMqConnectionConfiguration;
  readonly retention: RailwayBullMqRetentionConfiguration;
}

export type RailwayBullMqConfigurationState =
  | Readonly<{
      status: "configured";
      missingKeys: readonly [];
      invalidKeys: readonly [];
      configuration: Readonly<RailwayBullMqConfiguration>;
    }>
  | Readonly<{
      status: "disabled" | "incomplete";
      missingKeys: readonly RailwayBullMqEnvironmentKey[];
      invalidKeys: readonly [];
      configuration: null;
    }>
  | Readonly<{
      status: "invalid";
      missingKeys: readonly [];
      invalidKeys: readonly RailwayBullMqEnvironmentKey[];
      configuration: null;
    }>;

const EMPTY_KEYS: readonly [] = Object.freeze([]);
const runtimeEnvironments: readonly RuntimeEnvironment[] = Object.freeze([
  "development",
  "test",
  "staging",
  "production",
]);
const loopbackHostnames = Object.freeze([
  "127.0.0.1",
  "localhost",
  "[::1]",
]);
const privateRailwayHostnamePattern =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*railway\.internal$/;

function readProcessEnvironment(): RailwayBullMqEnvironment {
  return {
    APP_RUNTIME_ENVIRONMENT: process.env.APP_RUNTIME_ENVIRONMENT,
    REDIS_URL: process.env.REDIS_URL,
    BULLMQ_COMPLETED_RETENTION_SECONDS:
      process.env.BULLMQ_COMPLETED_RETENTION_SECONDS,
    BULLMQ_COMPLETED_RETENTION_COUNT:
      process.env.BULLMQ_COMPLETED_RETENTION_COUNT,
    BULLMQ_FAILED_RETENTION_SECONDS:
      process.env.BULLMQ_FAILED_RETENTION_SECONDS,
    BULLMQ_FAILED_RETENTION_COUNT:
      process.env.BULLMQ_FAILED_RETENTION_COUNT,
    BULLMQ_DLQ_RETENTION_SECONDS:
      process.env.BULLMQ_DLQ_RETENTION_SECONDS,
    BULLMQ_DLQ_CLEAN_BATCH_SIZE:
      process.env.BULLMQ_DLQ_CLEAN_BATCH_SIZE,
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
      parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function validRedisUrl(
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

  const port = Number(url.port);
  const isLoopback = loopbackHostnames.includes(url.hostname);
  const isPrivateRailway = privateRailwayHostnamePattern.test(url.hostname);
  const productionLike =
    runtimeEnvironment === "staging" ||
    runtimeEnvironment === "production";

  return (
    url.protocol === "redis:" &&
    url.hostname.length > 0 &&
    url.hostname.length <= 255 &&
    Number.isSafeInteger(port) &&
    port >= 1 &&
    port <= 65_535 &&
    url.username.length <= 1_024 &&
    url.password.length <= 4_096 &&
    (url.pathname === "" || url.pathname === "/" || url.pathname === "/0") &&
    url.search === "" &&
    url.hash === "" &&
    (productionLike ? isPrivateRailway : isLoopback || isPrivateRailway) &&
    (!productionLike || (url.username.length > 0 && url.password.length > 0))
  );
}

function frozenKeys<TKey extends string>(keys: readonly TKey[]) {
  return Object.freeze([...keys]);
}

export function inspectRailwayBullMqConfiguration(
  environment: RailwayBullMqEnvironment = readProcessEnvironment(),
): RailwayBullMqConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({
      status: "invalid",
      missingKeys: EMPTY_KEYS,
      invalidKeys: frozenKeys(railwayBullMqEnvironmentKeys),
      configuration: null,
    });
  }

  const unknownKeys = Object.keys(environment).filter(
    (key) => !railwayBullMqEnvironmentKeys.includes(
      key as RailwayBullMqEnvironmentKey,
    ),
  );
  if (unknownKeys.length > 0) {
    return Object.freeze({
      status: "invalid",
      missingKeys: EMPTY_KEYS,
      invalidKeys: frozenKeys(railwayBullMqEnvironmentKeys),
      configuration: null,
    });
  }

  const missingKeys = railwayBullMqEnvironmentKeys.filter(
    (key) => !hasValue(environment[key]),
  );
  if (missingKeys.length > 0) {
    return Object.freeze({
      status:
        missingKeys.length === railwayBullMqEnvironmentKeys.length
          ? "disabled"
          : "incomplete",
      missingKeys: frozenKeys(missingKeys),
      invalidKeys: EMPTY_KEYS,
      configuration: null,
    });
  }

  const runtimeEnvironment =
    environment.APP_RUNTIME_ENVIRONMENT! as RuntimeEnvironment;
  const completedSeconds = parseBoundedInteger(
    environment.BULLMQ_COMPLETED_RETENTION_SECONDS!,
    60,
    7 * 24 * 60 * 60,
  );
  const completedCount = parseBoundedInteger(
    environment.BULLMQ_COMPLETED_RETENTION_COUNT!,
    1,
    1_000_000,
  );
  const failedSeconds = parseBoundedInteger(
    environment.BULLMQ_FAILED_RETENTION_SECONDS!,
    60 * 60,
    30 * 24 * 60 * 60,
  );
  const failedCount = parseBoundedInteger(
    environment.BULLMQ_FAILED_RETENTION_COUNT!,
    1,
    1_000_000,
  );
  const deadLetterSeconds = parseBoundedInteger(
    environment.BULLMQ_DLQ_RETENTION_SECONDS!,
    24 * 60 * 60,
    90 * 24 * 60 * 60,
  );
  const deadLetterCleanBatchSize = parseBoundedInteger(
    environment.BULLMQ_DLQ_CLEAN_BATCH_SIZE!,
    1,
    10_000,
  );
  const invalidKeys: RailwayBullMqEnvironmentKey[] = [];

  if (!runtimeEnvironments.includes(runtimeEnvironment)) {
    invalidKeys.push("APP_RUNTIME_ENVIRONMENT");
  } else if (!validRedisUrl(environment.REDIS_URL!, runtimeEnvironment)) {
    invalidKeys.push("REDIS_URL");
  }
  if (completedSeconds === null) {
    invalidKeys.push("BULLMQ_COMPLETED_RETENTION_SECONDS");
  }
  if (completedCount === null) {
    invalidKeys.push("BULLMQ_COMPLETED_RETENTION_COUNT");
  }
  if (failedSeconds === null) {
    invalidKeys.push("BULLMQ_FAILED_RETENTION_SECONDS");
  }
  if (failedCount === null) {
    invalidKeys.push("BULLMQ_FAILED_RETENTION_COUNT");
  }
  if (deadLetterSeconds === null) {
    invalidKeys.push("BULLMQ_DLQ_RETENTION_SECONDS");
  }
  if (deadLetterCleanBatchSize === null) {
    invalidKeys.push("BULLMQ_DLQ_CLEAN_BATCH_SIZE");
  }
  if (
    completedSeconds !== null && failedSeconds !== null &&
    completedSeconds > failedSeconds
  ) {
    invalidKeys.push("BULLMQ_FAILED_RETENTION_SECONDS");
  }
  if (
    failedSeconds !== null && deadLetterSeconds !== null &&
    failedSeconds > deadLetterSeconds
  ) {
    invalidKeys.push("BULLMQ_DLQ_RETENTION_SECONDS");
  }

  if (invalidKeys.length > 0) {
    return Object.freeze({
      status: "invalid",
      missingKeys: EMPTY_KEYS,
      invalidKeys: frozenKeys([...new Set(invalidKeys)]),
      configuration: null,
    });
  }

  return Object.freeze({
    status: "configured",
    missingKeys: EMPTY_KEYS,
    invalidKeys: EMPTY_KEYS,
    configuration: Object.freeze({
      runtimeEnvironment,
      prefix: `connect-${runtimeEnvironment}-v1`,
      connection: Object.freeze({
        url: environment.REDIS_URL!,
        family: 0 as const,
        connectTimeout: 5_000 as const,
        keepAlive: 10_000 as const,
        noDelay: true as const,
      }),
      retention: Object.freeze({
        completedSeconds: completedSeconds!,
        completedCount: completedCount!,
        failedSeconds: failedSeconds!,
        failedCount: failedCount!,
        deadLetterSeconds: deadLetterSeconds!,
        deadLetterCleanBatchSize: deadLetterCleanBatchSize!,
      }),
    }),
  });
}
