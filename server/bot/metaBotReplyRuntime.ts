import type {
  BotReplyDeliveryRepository,
} from "../../db/botReplyDeliveryRepository.ts";
import type {
  MetaRepository,
} from "../../db/metaRepository.ts";
import type {
  BotReplyProcessor,
} from "../../shared/domain/botReplyDelivery.ts";
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
  createMetaBotReplyAdapter,
  type MetaBotReplyAdapterTelemetry,
} from "./metaBotReplyAdapter.ts";
import {
  createMetaBotReplyProcessor,
} from "./metaBotReplyProcessor.ts";
import type {
  BotReplyAdmissionController,
} from "./botReplyAdmission.ts";

export interface MetaBotReplyRuntimeInput {
  environment: MetaGraphEnvironment;
  metaConnections: Pick<
    MetaRepository,
    "findConnectionByTenantId"
  >;
  credentialVault: MetaCredentialVault;
  admission: BotReplyAdmissionController;
  providerRequests: Readonly<{
    claim: NonNullable<
      BotReplyDeliveryRepository["claimProviderRequest"]
    >;
  }>;
  transportOptions?: MetaGraphTransportOptions;
  providerRequestTelemetry?: MetaBotReplyAdapterTelemetry;
}

export function createMetaBotReplyRuntime(
  input: MetaBotReplyRuntimeInput,
): BotReplyProcessor {
  const graphConfiguration =
    requireMetaGraphConfiguration(input.environment);
  const transport = createMetaGraphTransport(
    graphConfiguration,
    input.transportOptions,
  );

  return createMetaBotReplyProcessor({
    metaConnections: input.metaConnections,
    credentialVault: input.credentialVault,
    admission: input.admission,
    providerRequests: input.providerRequests,
    sender: createMetaBotReplyAdapter(
      transport,
      input.providerRequestTelemetry,
    ),
  });
}
