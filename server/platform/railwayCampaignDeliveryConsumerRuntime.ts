import type {
  CampaignRepository,
} from "../../db/campaignRepository.ts";
import type {
  CampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import type {
  CampaignDeliveryProviderRepository,
} from "../../db/campaignDeliveryProviderRepository.ts";
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
  createCampaignDeliveryAdmission,
} from "../campaigns/campaignDeliveryAdmission.ts";
import {
  createCampaignDeliveryQueueConsumer,
} from "../campaigns/campaignDeliveryQueueConsumer.ts";
import {
  createCampaignDeliveryRateLimitContextResolver,
} from "../campaigns/campaignDeliveryRateLimitContextResolver.ts";
import {
  createCampaignDeliveryRateLimitPolicySource,
} from "../campaigns/d1CampaignDeliveryRateLimitPolicySource.ts";
import {
  createMetaCampaignDeliveryRuntime,
} from "../campaigns/metaCampaignDeliveryRuntime.ts";
import type {
  MetaCampaignDeliveryRetryEvidenceSource,
} from "../campaigns/metaCampaignDeliveryRetryPolicy.ts";
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
  MetaGraphEnvironment,
} from "../meta/metaGraphConfiguration.ts";
import type {
  MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import type {
  OperationalTelemetrySink,
} from "../operations/operationalTelemetry.ts";
import {
  observeCampaignDeliveryProcessor,
} from "../operations/campaignDeliveryTelemetry.ts";
import {
  createProviderRequestTelemetryScope,
} from "../operations/providerRequestTelemetry.ts";
import {
  observeCampaignDeliveryQueueHandler,
} from "../operations/queueTelemetry.ts";

export type RailwayCampaignDeliveryEnvironment =
  MetaCredentialEncryptionEnvironment &
    MetaGraphEnvironment &
    WhatsappRateLimitKeyEnvironment;

export interface RailwayCampaignDeliveryConsumerRuntimeOptions {
  readonly environment: RailwayCampaignDeliveryEnvironment;
  readonly dispatch: CampaignDispatchRepository;
  readonly campaigns: Pick<CampaignRepository, "findByKey">;
  readonly providerDeliveries: Pick<
    CampaignDeliveryProviderRepository,
    "recordAccepted"
  >;
  readonly metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  readonly credentials: MetaCredentialRepository;
  readonly deliveryPolicies: WhatsappCampaignDeliveryPolicyRepository;
  readonly rateLimits: WhatsappRateLimitRepository;
  readonly retryEvidenceSource:
    MetaCampaignDeliveryRetryEvidenceSource;
  readonly telemetrySink: OperationalTelemetrySink;
  readonly transportOptions?: MetaGraphTransportOptions;
  readonly credentialVaultOptions?: MetaCredentialVaultOptions;
  readonly clock?: Readonly<{ now(): Date }>;
}

const optionKeys = Object.freeze([
  "campaigns",
  "clock",
  "credentials",
  "credentialVaultOptions",
  "deliveryPolicies",
  "dispatch",
  "environment",
  "metaConnections",
  "providerDeliveries",
  "rateLimits",
  "retryEvidenceSource",
  "telemetrySink",
  "transportOptions",
]);

const systemClock = Object.freeze({
  now() {
    return new Date();
  },
});

function requireOptions(
  options: Readonly<
    RailwayCampaignDeliveryConsumerRuntimeOptions
  >,
): Readonly<{ now(): Date }> {
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    !options.environment || typeof options.environment !== "object" ||
    typeof options.dispatch?.findQueuedDeliveryContext !== "function" ||
    typeof options.dispatch?.prepareDelivery !== "function" ||
    typeof options.dispatch?.markDeferred !== "function" ||
    typeof options.dispatch?.markRejected !== "function" ||
    typeof options.dispatch?.markAmbiguous !== "function" ||
    typeof options.campaigns?.findByKey !== "function" ||
    typeof options.providerDeliveries?.recordAccepted !== "function" ||
    typeof options.metaConnections?.findConnectionByTenantId !== "function" ||
    typeof options.credentials?.findByTenantId !== "function" ||
    typeof options.credentials?.store !== "function" ||
    typeof options.deliveryPolicies?.findCurrentEnabledPolicy !== "function" ||
    typeof options.rateLimits?.reserveBusinessInitiatedMessage !== "function" ||
    typeof options.rateLimits?.settle !== "function" ||
    typeof options.rateLimits?.applyProviderCooldown !== "function" ||
    typeof options.retryEvidenceSource?.isConfigured !== "function" ||
    typeof options.retryEvidenceSource?.load !== "function" ||
    typeof options.telemetrySink?.record !== "function" ||
    (options.clock !== undefined && typeof options.clock.now !== "function")
  ) {
    throw new Error(
      "Railway campaign delivery consumer options are invalid",
    );
  }

  return options.clock ?? systemClock;
}

/**
 * Provider-bound campaign consumer. Every send first passes the persisted
 * WhatsApp policy and atomic PostgreSQL reservation, then uses the encrypted
 * Meta credential vault. Unknown provider outcomes remain ambiguous and are
 * acknowledged by the domain consumer instead of being sent again.
 */
export function createRailwayCampaignDeliveryConsumerRuntime(
  options: Readonly<
    RailwayCampaignDeliveryConsumerRuntimeOptions
  >,
) {
  const clock = requireOptions(options);
  const credentialVault = createMetaCredentialVault(
    options.credentials,
    options.environment,
    options.credentialVaultOptions,
  );
  const providerRequestTelemetry =
    createProviderRequestTelemetryScope();
  const processor = observeCampaignDeliveryProcessor(
    createMetaCampaignDeliveryRuntime({
    environment: options.environment,
    metaConnections: options.metaConnections,
    credentialVault,
    retryEvidenceSource: options.retryEvidenceSource,
    transportOptions: options.transportOptions,
    providerRequestTelemetry: {
      scope: providerRequestTelemetry,
      clock,
    },
    }),
    options.telemetrySink,
    clock,
    providerRequestTelemetry,
  );
  const policies = createCampaignDeliveryRateLimitPolicySource(
    options.deliveryPolicies,
  );
  const admission = createCampaignDeliveryAdmission(
    options.rateLimits,
    createCampaignDeliveryRateLimitContextResolver(
      options.metaConnections,
      createWhatsappRateLimitKeyDeriver(
        options.environment,
      ),
      policies,
    ),
  );

  return observeCampaignDeliveryQueueHandler(
    createCampaignDeliveryQueueConsumer(
      options.dispatch,
      options.campaigns,
      options.providerDeliveries,
      admission,
      processor,
      clock,
    ),
    options.telemetrySink,
    clock,
  );
}
