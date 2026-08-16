import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  CampaignDeliveryProcessor,
} from "../../shared/domain/campaignDelivery.ts";
import {
  requireMetaGraphConfiguration,
  type MetaGraphEnvironment,
} from "../meta/metaGraphConfiguration.ts";
import {
  createMetaGraphTransport,
  type MetaGraphTransportOptions,
} from "../meta/metaGraphTransport.ts";
import type {
  MetaCredentialVault,
} from "../meta/metaPorts.ts";
import {
  createMetaCampaignDeliveryProcessor,
} from "./metaCampaignDeliveryProcessor.ts";
import {
  createMetaCampaignDeliveryRetryPolicy,
  type MetaCampaignDeliveryRetryEvidenceSource,
} from "./metaCampaignDeliveryRetryPolicy.ts";
import {
  createMetaCampaignTemplateAdapter,
} from "./metaCampaignTemplateAdapter.ts";

export interface MetaCampaignDeliveryRuntimeInput {
  environment: MetaGraphEnvironment;
  metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  credentialVault: MetaCredentialVault;
  retryEvidenceSource:
    MetaCampaignDeliveryRetryEvidenceSource;
  transportOptions?: MetaGraphTransportOptions;
}

export function createMetaCampaignDeliveryRuntime(
  input: MetaCampaignDeliveryRuntimeInput,
): CampaignDeliveryProcessor {
  const graphConfiguration =
    requireMetaGraphConfiguration(input.environment);
  const transport = createMetaGraphTransport(
    graphConfiguration,
    input.transportOptions,
  );

  return createMetaCampaignDeliveryProcessor({
    metaConnections: input.metaConnections,
    credentialVault: input.credentialVault,
    retryPolicy:
      createMetaCampaignDeliveryRetryPolicy(
        input.retryEvidenceSource,
      ),
    sender: createMetaCampaignTemplateAdapter(transport),
  });
}
