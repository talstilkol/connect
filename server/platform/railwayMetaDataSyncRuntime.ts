import { createMetaDataSyncService, type MetaDataSyncRepository } from "../meta/metaDataSync.ts";
import { createMetaGraphDataSyncProvider } from "../meta/metaGraphDataSyncProvider.ts";
import { createMetaGraphTransport, type MetaGraphTransportOptions } from "../meta/metaGraphTransport.ts";
import { requireMetaGraphConfiguration, type MetaGraphEnvironment } from "../meta/metaGraphConfiguration.ts";
import { createMetaCredentialVault, type MetaCredentialEncryptionEnvironment } from "../meta/metaCredentialVault.ts";
import type { MetaCredentialRepository } from "../../db/metaCredentialRepository.ts";

// Internal signup and persisted Worker continuations share this runtime.
// Construction alone never sends a provider request.
export function createRailwayMetaDataSyncRuntime(dependencies: Readonly<{
  environment: MetaGraphEnvironment & MetaCredentialEncryptionEnvironment;
  requests: MetaDataSyncRepository;
  credentials: MetaCredentialRepository;
  transportOptions?: MetaGraphTransportOptions;
}>) {
  return createMetaDataSyncService({
    repository: dependencies.requests,
    credentials: createMetaCredentialVault(dependencies.credentials, dependencies.environment),
    provider: createMetaGraphDataSyncProvider(createMetaGraphTransport(requireMetaGraphConfiguration(dependencies.environment), dependencies.transportOptions)),
  });
}
