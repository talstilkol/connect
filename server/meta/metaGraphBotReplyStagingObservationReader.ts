import {
  createHash,
} from "node:crypto";

import type {
  MetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import {
  createMetaCredentialVault,
  type MetaCredentialEncryptionEnvironment,
  type MetaCredentialVaultOptions,
} from "./metaCredentialVault.ts";
import {
  requireMetaAuthorizationCodeExchangeConfiguration,
  type MetaAuthorizationCodeExchangeEnvironment,
} from "./metaAuthorizationCodeExchangeConfiguration.ts";
import {
  createMetaGraphAssetVerifier,
} from "./metaGraphAssetVerifier.ts";
import {
  createMetaGraphTransport,
  type MetaGraphTransport,
  type MetaGraphTransportOptions,
} from "./metaGraphTransport.ts";
import {
  toSensitiveMetaAccessToken,
  type MetaCredentialVault,
  type SensitiveMetaAccessToken,
} from "./metaPorts.ts";
import type {
  BotReplyStagingAssetFact,
  BotReplyStagingGraphObservationReader,
  BotReplyStagingThroughputFact,
} from "../operations/botReplyStagingObservationSource.ts";
import type {
  BotReplyStagingStepContext,
} from "../operations/botReplyStagingScenarioExecutor.ts";

const readerVersion =
  "connect-meta-graph-bot-reply-staging-observation-reader-v1";
const metaAssetIdPattern = /^[1-9][0-9]{0,63}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const operationKeyPattern =
  /^bot_reply_staging_step_v1_[a-f0-9]{64}$/;
const runKeyPattern = /^bot_reply_staging_run_v1_[a-f0-9]{64}$/;
const auditKeyPattern = /^bot_reply_staging_audit_v1_[a-f0-9]{64}$/;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const artifactDigestPattern = /^sha256:[a-f0-9]{64}$/;

export type MetaGraphBotReplyStagingObservationReaderEnvironment =
  MetaAuthorizationCodeExchangeEnvironment &
    MetaCredentialEncryptionEnvironment;

export interface MetaGraphBotReplyStagingObservationClock {
  now(): Date;
}

export interface MetaGraphBotReplyStagingObservationReaderOptions {
  readonly environment:
    MetaGraphBotReplyStagingObservationReaderEnvironment;
  readonly connections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  readonly credentials: MetaCredentialRepository;
  readonly clock: MetaGraphBotReplyStagingObservationClock;
  readonly transportOptions?: MetaGraphTransportOptions;
  readonly credentialVaultOptions?: MetaCredentialVaultOptions;
}

export type MetaGraphBotReplyStagingObservationErrorCode =
  | "BOT_REPLY_STAGING_GRAPH_CONFIGURATION_INVALID"
  | "BOT_REPLY_STAGING_GRAPH_CONTEXT_INVALID"
  | "BOT_REPLY_STAGING_GRAPH_CONNECTION_UNAVAILABLE"
  | "BOT_REPLY_STAGING_GRAPH_APP_INVALID"
  | "BOT_REPLY_STAGING_GRAPH_ASSET_INVALID"
  | "BOT_REPLY_STAGING_GRAPH_THROUGHPUT_INVALID";

export class MetaGraphBotReplyStagingObservationError extends Error {
  readonly code: MetaGraphBotReplyStagingObservationErrorCode;

  constructor(code: MetaGraphBotReplyStagingObservationErrorCode) {
    super(code);
    this.name = "MetaGraphBotReplyStagingObservationError";
    this.code = code;
  }
}

interface ReaderConfiguration {
  readonly appId: string;
  readonly graphApiVersion: string;
  readonly appAccessToken: SensitiveMetaAccessToken;
}

interface ObservationConnection {
  readonly businessPortfolioId: string;
  readonly wabaId: string;
  readonly phoneNumberId: string;
}

interface ObservationBinding {
  readonly schemaVersion: 1;
  readonly runKey: string;
  readonly operationKey: string;
  readonly targetTenantId: number;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly observedAt: string;
}

function fail(
  code: MetaGraphBotReplyStagingObservationErrorCode,
): never {
  throw new MetaGraphBotReplyStagingObservationError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function canonicalTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString() === value
    ? milliseconds
    : null;
}

function requireOptions(
  options: Readonly<MetaGraphBotReplyStagingObservationReaderOptions>,
): void {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => ![
      "clock",
      "connections",
      "credentialVaultOptions",
      "credentials",
      "environment",
      "transportOptions",
    ].includes(key)) ||
    !options.environment || typeof options.environment !== "object" ||
    typeof options.connections?.findConnectionByTenantId !== "function" ||
    typeof options.credentials?.findByTenantId !== "function" ||
    typeof options.credentials?.store !== "function" ||
    typeof options.clock?.now !== "function"
  ) {
    fail("BOT_REPLY_STAGING_GRAPH_CONFIGURATION_INVALID");
  }
}

function requireConfiguration(
  environment:
    Readonly<MetaGraphBotReplyStagingObservationReaderEnvironment>,
): ReaderConfiguration {
  try {
    const configuration =
      requireMetaAuthorizationCodeExchangeConfiguration(environment);

    if (!graphApiVersionPattern.test(configuration.apiVersion)) {
      fail("BOT_REPLY_STAGING_GRAPH_CONFIGURATION_INVALID");
    }

    return Object.freeze({
      appId: configuration.appId,
      graphApiVersion: configuration.apiVersion,
      appAccessToken: toSensitiveMetaAccessToken(
        `${configuration.appId}|${configuration.appSecret}`,
      ),
    });
  } catch (error) {
    if (error instanceof MetaGraphBotReplyStagingObservationError) {
      throw error;
    }
    fail("BOT_REPLY_STAGING_GRAPH_CONFIGURATION_INVALID");
  }
}

function requireContext(
  context: Readonly<BotReplyStagingStepContext>,
  configuration: Readonly<ReaderConfiguration>,
): void {
  const requestedAt = canonicalTimestamp(context?.run?.requestedAt);
  const leaseExpiresAt = canonicalTimestamp(context?.claim?.leaseExpiresAt);

  if (
    !context || typeof context !== "object" ||
    !context.run || typeof context.run !== "object" ||
    !context.claim || typeof context.claim !== "object" ||
    typeof context.operationKey !== "string" ||
    !operationKeyPattern.test(context.operationKey) ||
    typeof context.run.runKey !== "string" ||
    !runKeyPattern.test(context.run.runKey) ||
    !isPositiveInteger(context.run.targetTenantId) ||
    !isPositiveInteger(context.run.expectedConnectionVersion) ||
    !isPositiveInteger(context.run.expectedPolicyVersion) ||
    typeof context.run.releaseId !== "string" ||
    !releaseIdPattern.test(context.run.releaseId) ||
    typeof context.run.commitSha !== "string" ||
    !commitShaPattern.test(context.run.commitSha) ||
    typeof context.run.artifactDigest !== "string" ||
    !artifactDigestPattern.test(context.run.artifactDigest) ||
    context.run.graphApiVersion !== configuration.graphApiVersion ||
    requestedAt === null || leaseExpiresAt === null ||
    leaseExpiresAt <= requestedAt ||
    context.claim.runKey !== context.run.runKey ||
    typeof context.claim.auditKey !== "string" ||
    !auditKeyPattern.test(context.claim.auditKey) ||
    !isPositiveInteger(context.claim.claimVersion)
  ) {
    fail("BOT_REPLY_STAGING_GRAPH_CONTEXT_INVALID");
  }
}

function requireMetaAssetId(value: unknown): string {
  if (typeof value !== "string") {
    fail("BOT_REPLY_STAGING_GRAPH_CONNECTION_UNAVAILABLE");
  }
  const normalized = value.trim();
  if (!metaAssetIdPattern.test(normalized) || normalized !== value) {
    fail("BOT_REPLY_STAGING_GRAPH_CONNECTION_UNAVAILABLE");
  }
  return normalized;
}

async function readConnection(
  connections: MetaGraphBotReplyStagingObservationReaderOptions[
    "connections"
  ],
  context: Readonly<BotReplyStagingStepContext>,
): Promise<ObservationConnection> {
  let connection: Awaited<
    ReturnType<
      MetaGraphBotReplyStagingObservationReaderOptions[
        "connections"
      ]["findConnectionByTenantId"]
    >
  >;
  try {
    connection = await connections.findConnectionByTenantId(
      context.run.targetTenantId,
    );
  } catch {
    fail("BOT_REPLY_STAGING_GRAPH_CONNECTION_UNAVAILABLE");
  }

  if (
    !connection ||
    connection.tenantId !== context.run.targetTenantId ||
    connection.version !== context.run.expectedConnectionVersion ||
    connection.status !== "connected"
  ) {
    fail("BOT_REPLY_STAGING_GRAPH_CONNECTION_UNAVAILABLE");
  }

  return Object.freeze({
    businessPortfolioId: requireMetaAssetId(
      connection.businessPortfolioId,
    ),
    wabaId: requireMetaAssetId(connection.wabaId),
    phoneNumberId: requireMetaAssetId(connection.phoneNumberId),
  });
}

function requireObservedAt(
  clock: Readonly<MetaGraphBotReplyStagingObservationClock>,
  context: Readonly<BotReplyStagingStepContext>,
): string {
  let now: Date;
  try {
    now = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_GRAPH_CONTEXT_INVALID");
  }
  const milliseconds = now instanceof Date ? now.getTime() : Number.NaN;
  const requestedAt = Date.parse(context.run.requestedAt);
  const leaseExpiresAt = Date.parse(context.claim.leaseExpiresAt);
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < requestedAt ||
    milliseconds > leaseExpiresAt
  ) {
    fail("BOT_REPLY_STAGING_GRAPH_CONTEXT_INVALID");
  }
  return new Date(milliseconds).toISOString();
}

function binding(
  context: Readonly<BotReplyStagingStepContext>,
  observedAt: string,
): ObservationBinding {
  return {
    schemaVersion: 1,
    runKey: context.run.runKey,
    operationKey: context.operationKey,
    targetTenantId: context.run.targetTenantId,
    connectionVersion: context.run.expectedConnectionVersion,
    policyVersion: context.run.expectedPolicyVersion,
    releaseId: context.run.releaseId,
    commitSha: context.run.commitSha,
    artifactDigest: context.run.artifactDigest,
    graphApiVersion: context.run.graphApiVersion,
    observedAt,
  };
}

function recordDigest(
  domain: "assets" | "throughput",
  observationBinding: Readonly<ObservationBinding>,
  details: readonly (string | number | boolean)[],
): string {
  const digest = createHash("sha256")
    .update(readerVersion)
    .update("\0")
    .update(domain);
  const values: readonly (string | number | boolean)[] = [
    observationBinding.runKey,
    observationBinding.operationKey,
    observationBinding.targetTenantId,
    observationBinding.connectionVersion,
    observationBinding.policyVersion,
    observationBinding.releaseId,
    observationBinding.commitSha,
    observationBinding.artifactDigest,
    observationBinding.graphApiVersion,
    observationBinding.observedAt,
    ...details,
  ];
  for (const value of values) {
    digest.update("\0").update(String(value));
  }
  return `sha256:${digest.digest("hex")}`;
}

async function inspectApp(
  transport: Readonly<MetaGraphTransport>,
  configuration: Readonly<ReaderConfiguration>,
  accessToken: SensitiveMetaAccessToken,
): Promise<void> {
  let response: unknown;
  try {
    response = await transport.requestJson<unknown>({
      method: "GET",
      pathSegments: ["debug_token"],
      accessToken: configuration.appAccessToken,
      query: { input_token: accessToken },
    });
  } catch {
    fail("BOT_REPLY_STAGING_GRAPH_APP_INVALID");
  }
  if (
    !isRecord(response) || !isRecord(response.data) ||
    response.data.app_id !== configuration.appId ||
    response.data.is_valid !== true
  ) {
    fail("BOT_REPLY_STAGING_GRAPH_APP_INVALID");
  }
}

function requireThroughput(
  response: unknown,
  expectedPhoneNumberId: string,
): Readonly<{
  level: "STANDARD" | "HIGH";
  isOnBizApp: boolean;
  messagesPerSecond: 20 | 80 | 1_000;
}> {
  if (
    !isRecord(response) || response.id !== expectedPhoneNumberId ||
    !isRecord(response.throughput) ||
    (response.throughput.level !== "STANDARD" &&
      response.throughput.level !== "HIGH") ||
    typeof response.is_on_biz_app !== "boolean" ||
    response.platform_type !== "CLOUD_API"
  ) {
    fail("BOT_REPLY_STAGING_GRAPH_THROUGHPUT_INVALID");
  }
  const level = response.throughput.level;
  const isOnBizApp = response.is_on_biz_app;
  if (isOnBizApp && level !== "STANDARD") {
    fail("BOT_REPLY_STAGING_GRAPH_THROUGHPUT_INVALID");
  }
  return Object.freeze({
    level,
    isOnBizApp,
    messagesPerSecond: isOnBizApp
      ? 20
      : level === "STANDARD"
      ? 80
      : 1_000,
  });
}

export function createMetaGraphBotReplyStagingObservationReader(
  options: Readonly<MetaGraphBotReplyStagingObservationReaderOptions>,
): BotReplyStagingGraphObservationReader {
  requireOptions(options);
  const configuration = requireConfiguration(options.environment);
  const transport = createMetaGraphTransport(
    { apiVersion: configuration.graphApiVersion },
    options.transportOptions,
  );
  const assetVerifier = createMetaGraphAssetVerifier(transport);
  const credentialVault: MetaCredentialVault = createMetaCredentialVault(
    options.credentials,
    options.environment,
    options.credentialVaultOptions,
  );

  return Object.freeze({
    isConfigured() {
      return true;
    },

    async readAssets(
      context: Readonly<BotReplyStagingStepContext>,
    ): Promise<BotReplyStagingAssetFact> {
      requireContext(context, configuration);
      const connection = await readConnection(options.connections, context);
      await credentialVault.withAccessToken(
        context.run.targetTenantId,
        async (accessToken) => {
          await inspectApp(
            transport,
            configuration,
            accessToken,
          );
          let verified;
          try {
            verified = await assetVerifier.verifyAssets({
              accessToken,
              businessPortfolioId: connection.businessPortfolioId,
              wabaId: connection.wabaId,
              phoneNumberId: connection.phoneNumberId,
            });
          } catch {
            fail("BOT_REPLY_STAGING_GRAPH_ASSET_INVALID");
          }
          if (
            verified.businessPortfolioId !==
              connection.businessPortfolioId ||
            verified.wabaId !== connection.wabaId ||
            verified.phoneNumberId !== connection.phoneNumberId
          ) {
            fail("BOT_REPLY_STAGING_GRAPH_CONNECTION_UNAVAILABLE");
          }
        },
      );
      const observedAt = requireObservedAt(options.clock, context);
      const observationBinding = binding(context, observedAt);
      return Object.freeze({
        ...observationBinding,
        source: "meta-graph-api",
        appId: configuration.appId,
        businessPortfolioId: connection.businessPortfolioId,
        wabaId: connection.wabaId,
        phoneNumberId: connection.phoneNumberId,
        recordDigest: recordDigest("assets", observationBinding, [
          configuration.appId,
          connection.businessPortfolioId,
          connection.wabaId,
          connection.phoneNumberId,
        ]),
      });
    },

    async readThroughput(
      context: Readonly<BotReplyStagingStepContext>,
    ): Promise<BotReplyStagingThroughputFact> {
      requireContext(context, configuration);
      const connection = await readConnection(options.connections, context);
      const throughput = await credentialVault.withAccessToken(
        context.run.targetTenantId,
        async (accessToken) => {
          let response: unknown;
          try {
            response = await transport.requestJson<unknown>({
              method: "GET",
              pathSegments: [connection.phoneNumberId],
              accessToken,
              query: {
                fields: "id,throughput,is_on_biz_app,platform_type",
              },
            });
          } catch {
            fail("BOT_REPLY_STAGING_GRAPH_THROUGHPUT_INVALID");
          }
          return requireThroughput(
            response,
            connection.phoneNumberId,
          );
        },
      );
      const observedAt = requireObservedAt(options.clock, context);
      const observationBinding = binding(context, observedAt);
      return Object.freeze({
        ...observationBinding,
        source: "meta-graph-api",
        phoneNumberId: connection.phoneNumberId,
        messagesPerSecond: throughput.messagesPerSecond,
        recordDigest: recordDigest("throughput", observationBinding, [
          connection.phoneNumberId,
          throughput.level,
          throughput.isOnBizApp,
          throughput.messagesPerSecond,
        ]),
      });
    },
  });
}
