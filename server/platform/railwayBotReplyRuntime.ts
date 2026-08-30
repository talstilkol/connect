import type {
  BotReplyDeliveryRepository,
} from "../../db/botReplyDeliveryRepository.ts";
import type {
  MetaCredentialRepository,
} from "../../db/metaCredentialRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  WhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import type {
  WhatsappRateLimitRepository,
} from "../../db/whatsappRateLimitRepository.ts";
import {
  createBotReplyAdmission,
} from "../bot/botReplyAdmission.ts";
import {
  createBotReplyDeliveryWorker,
  createBotReplyDueDeliveryRunner,
  type BotReplyDeliveryWorkerClock,
} from "../bot/botReplyDeliveryWorker.ts";
import {
  createMetaBotReplyRuntime,
} from "../bot/metaBotReplyRuntime.ts";
import {
  createCampaignDeliveryRateLimitPolicySource,
} from "../campaigns/d1CampaignDeliveryRateLimitPolicySource.ts";
import {
  createWhatsappRateLimitKeyDeriver,
  type WhatsappRateLimitKeyEnvironment,
} from "../campaigns/whatsappRateLimitKeyDeriver.ts";
import {
  createMetaCredentialVault,
  type MetaCredentialEncryptionEnvironment,
  type MetaCredentialVaultOptions,
} from "../meta/metaCredentialVault.ts";
import type {
  MetaAuthorizationCodeExchangeEnvironment,
} from "../meta/metaAuthorizationCodeExchangeConfiguration.ts";
import type {
  RailwayBotReplyStagingSecurityObservationEnvironment,
} from "./railwayBotReplyStagingSecurityObservationReader.ts";
import type {
  MetaGraphEnvironment,
} from "../meta/metaGraphConfiguration.ts";
import type {
  MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import {
  observeBotReplyProcessor,
} from "../operations/botReplyDeliveryTelemetry.ts";
import type {
  OperationalTelemetrySink,
} from "../operations/operationalTelemetry.ts";
import {
  createProviderRequestTelemetryScope,
} from "../operations/providerRequestTelemetry.ts";

export type RailwayBotReplyEnvironment =
  MetaCredentialEncryptionEnvironment &
    MetaGraphEnvironment &
    MetaAuthorizationCodeExchangeEnvironment &
    RailwayBotReplyStagingSecurityObservationEnvironment &
    WhatsappRateLimitKeyEnvironment;

export interface RailwayBotReplyRuntimeOptions {
  readonly environment: RailwayBotReplyEnvironment;
  readonly deliveries: BotReplyDeliveryRepository;
  readonly metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  readonly credentials: MetaCredentialRepository;
  readonly deliveryPolicies:
    WhatsappCampaignDeliveryPolicyRepository;
  readonly rateLimits: Pick<
    WhatsappRateLimitRepository,
    | "reserveServiceReply"
    | "settle"
    | "applyProviderCooldown"
  >;
  readonly clock: BotReplyDeliveryWorkerClock;
  readonly telemetrySink: OperationalTelemetrySink;
  readonly transportOptions?: MetaGraphTransportOptions;
  readonly credentialVaultOptions?: MetaCredentialVaultOptions;
  readonly batchSize?: number;
}

const optionKeys = Object.freeze([
  "batchSize",
  "clock",
  "credentials",
  "credentialVaultOptions",
  "deliveries",
  "deliveryPolicies",
  "environment",
  "metaConnections",
  "rateLimits",
  "telemetrySink",
  "transportOptions",
]);

function requireOptions(
  options: Readonly<RailwayBotReplyRuntimeOptions>,
): number {
  const batchSize = options.batchSize ?? 100;

  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some(
      (key) => !optionKeys.includes(key),
    ) ||
    !options.environment ||
    typeof options.environment !== "object" ||
    typeof options.deliveries?.stage !== "function" ||
    typeof options.deliveries?.claim !== "function" ||
    typeof options.deliveries?.defer !== "function" ||
    typeof options.deliveries?.claimProviderRequest !== "function" ||
    typeof options.deliveries?.listDueDeferrals !== "function" ||
    typeof options.deliveries?.markAccepted !== "function" ||
    typeof options.deliveries?.markRejected !== "function" ||
    typeof options.deliveries?.markAmbiguous !== "function" ||
    typeof options.metaConnections
      ?.findConnectionByTenantId !== "function" ||
    typeof options.credentials?.findByTenantId !== "function" ||
    typeof options.credentials?.store !== "function" ||
    typeof options.deliveryPolicies
      ?.findCurrentEnabledPolicy !== "function" ||
    typeof options.rateLimits?.reserveServiceReply !== "function" ||
    typeof options.rateLimits?.settle !== "function" ||
    typeof options.rateLimits?.applyProviderCooldown !== "function" ||
    typeof options.clock?.now !== "function" ||
    typeof options.telemetrySink?.record !== "function" ||
    !Number.isSafeInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 100
  ) {
    throw new Error("Railway bot reply runtime options are invalid");
  }

  return batchSize;
}

export function createRailwayBotReplyRuntime(
  options: Readonly<RailwayBotReplyRuntimeOptions>,
) {
  const batchSize = requireOptions(options);
  const credentialVault = createMetaCredentialVault(
    options.credentials,
    options.environment,
    options.credentialVaultOptions,
  );
  const admission = createBotReplyAdmission(
    options.rateLimits,
    createWhatsappRateLimitKeyDeriver(
      options.environment,
    ),
    createCampaignDeliveryRateLimitPolicySource(
      options.deliveryPolicies,
    ),
  );
  const providerRequestTelemetry =
    createProviderRequestTelemetryScope();
  const processor = observeBotReplyProcessor(
    createMetaBotReplyRuntime({
      environment: options.environment,
      metaConnections: options.metaConnections,
      credentialVault,
      admission,
      providerRequests: {
        claim(input) {
          const claimProviderRequest =
            options.deliveries.claimProviderRequest;
          if (typeof claimProviderRequest !== "function") {
            throw new Error(
              "Railway bot reply provider request fence is unavailable",
            );
          }
          return claimProviderRequest(input);
        },
      },
      transportOptions: options.transportOptions,
      providerRequestTelemetry: {
        scope: providerRequestTelemetry,
        clock: options.clock,
      },
    }),
    options.telemetrySink,
    options.clock,
    providerRequestTelemetry,
  );
  const worker = createBotReplyDeliveryWorker(
    options.deliveries,
    processor,
    options.clock,
  );
  const dueRunner = createBotReplyDueDeliveryRunner(
    options.deliveries,
    worker,
    options.clock,
  );

  return Object.freeze({
    processor,
    deliveryWorker: worker,
    dueDeliveries: Object.freeze({
      run: () => dueRunner.run(batchSize),
    }),
  });
}
