import type { UserId } from "../../shared/domain/model.ts";
import {
  inspectSystemAdminConfiguration,
} from "../auth/systemAdminConfiguration.ts";

export const railwayBotReplyStagingApiEnvironmentKeys = Object.freeze([
  "APP_RUNTIME_ENVIRONMENT",
  "BOT_REPLY_STAGING_ENABLED",
  "BOT_REPLY_STAGING_TENANT_ID",
  "BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID",
  "BOT_REPLY_STAGING_LEASE_DURATION_SECONDS",
  "BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS",
  "CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS",
] as const);

export type RailwayBotReplyStagingApiEnvironmentKey =
  (typeof railwayBotReplyStagingApiEnvironmentKeys)[number];

export type RailwayBotReplyStagingApiEnvironment = Partial<
  Record<RailwayBotReplyStagingApiEnvironmentKey, string | undefined>
>;

export interface RailwayBotReplyStagingApiConfiguration {
  readonly stagingTenantId: number;
  readonly talExternalUserId: UserId;
  readonly leaseDurationSeconds: number;
  readonly pollIntervalMilliseconds: number;
}

export type RailwayBotReplyStagingApiConfigurationState =
  | Readonly<{
      status: "configured";
      missingKeys: readonly [];
      invalidKeys: readonly [];
      configuration: Readonly<RailwayBotReplyStagingApiConfiguration>;
    }>
  | Readonly<{
      status: "disabled";
      missingKeys: readonly [];
      invalidKeys: readonly [];
      configuration: null;
    }>
  | Readonly<{
      status: "incomplete";
      missingKeys: readonly RailwayBotReplyStagingApiEnvironmentKey[];
      invalidKeys: readonly [];
      configuration: null;
    }>
  | Readonly<{
      status: "invalid";
      missingKeys: readonly [];
      invalidKeys: readonly RailwayBotReplyStagingApiEnvironmentKey[];
      configuration: null;
    }>;

const emptyKeys: readonly [] = Object.freeze([]);
const positiveIntegerPattern = /^[1-9][0-9]*$/;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

function frozenKeys(
  keys: readonly RailwayBotReplyStagingApiEnvironmentKey[],
) {
  return Object.freeze([...keys]);
}

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function boundedInteger(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  if (!positiveIntegerPattern.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function validExternalUserId(value: string): value is UserId {
  return value.length >= 1 && value.length <= 255 && value.trim() === value &&
    !controlCharacterPattern.test(value);
}

export function inspectRailwayBotReplyStagingApiConfiguration(
  environment: Readonly<RailwayBotReplyStagingApiEnvironment>,
): RailwayBotReplyStagingApiConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: frozenKeys(railwayBotReplyStagingApiEnvironmentKeys),
      configuration: null,
    });
  }

  const unknownKey = Object.keys(environment).some(
    (key) => !railwayBotReplyStagingApiEnvironmentKeys.includes(
      key as RailwayBotReplyStagingApiEnvironmentKey,
    ),
  );
  if (unknownKey) {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: frozenKeys(railwayBotReplyStagingApiEnvironmentKeys),
      configuration: null,
    });
  }

  const optIn = environment.BOT_REPLY_STAGING_ENABLED;
  if (optIn === undefined || optIn === "" || optIn === "false") {
    return Object.freeze({
      status: "disabled",
      missingKeys: emptyKeys,
      invalidKeys: emptyKeys,
      configuration: null,
    });
  }
  if (optIn !== "true") {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: frozenKeys(["BOT_REPLY_STAGING_ENABLED"]),
      configuration: null,
    });
  }

  const requiredKeys = railwayBotReplyStagingApiEnvironmentKeys.filter(
    (key) => key !== "BOT_REPLY_STAGING_ENABLED",
  );
  const missingKeys = requiredKeys.filter(
    (key) => !hasValue(environment[key]),
  );
  if (missingKeys.length > 0) {
    return Object.freeze({
      status: "incomplete",
      missingKeys: frozenKeys(missingKeys),
      invalidKeys: emptyKeys,
      configuration: null,
    });
  }

  const stagingTenantId = boundedInteger(
    environment.BOT_REPLY_STAGING_TENANT_ID!,
    1,
    2_147_483_647,
  );
  const leaseDurationSeconds = boundedInteger(
    environment.BOT_REPLY_STAGING_LEASE_DURATION_SECONDS!,
    60,
    3_600,
  );
  const pollIntervalMilliseconds = boundedInteger(
    environment.BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS!,
    50,
    5_000,
  );
  const talExternalUserId =
    environment.BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID!;
  const systemAdmins = inspectSystemAdminConfiguration({
    CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS:
      environment.CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS,
  });
  const invalidKeys: RailwayBotReplyStagingApiEnvironmentKey[] = [];

  if (environment.APP_RUNTIME_ENVIRONMENT !== "staging") {
    invalidKeys.push("APP_RUNTIME_ENVIRONMENT");
  }
  if (stagingTenantId === null) {
    invalidKeys.push("BOT_REPLY_STAGING_TENANT_ID");
  }
  if (!validExternalUserId(talExternalUserId)) {
    invalidKeys.push("BOT_REPLY_STAGING_TAL_EXTERNAL_USER_ID");
  }
  if (leaseDurationSeconds === null) {
    invalidKeys.push("BOT_REPLY_STAGING_LEASE_DURATION_SECONDS");
  }
  if (pollIntervalMilliseconds === null) {
    invalidKeys.push("BOT_REPLY_STAGING_POLL_INTERVAL_MILLISECONDS");
  }
  if (
    systemAdmins.status !== "configured" ||
    !systemAdmins.externalUserIds.includes(talExternalUserId as UserId)
  ) {
    invalidKeys.push("CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS");
  }

  if (invalidKeys.length > 0) {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: frozenKeys(invalidKeys),
      configuration: null,
    });
  }

  return Object.freeze({
    status: "configured",
    missingKeys: emptyKeys,
    invalidKeys: emptyKeys,
    configuration: Object.freeze({
      stagingTenantId: stagingTenantId!,
      talExternalUserId: talExternalUserId as UserId,
      leaseDurationSeconds: leaseDurationSeconds!,
      pollIntervalMilliseconds: pollIntervalMilliseconds!,
    }),
  });
}
