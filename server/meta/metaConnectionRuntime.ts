import {
  createMetaAuthorizationCodeExchanger,
  type MetaAuthorizationCodeExchangerOptions,
} from "./metaAuthorizationCodeExchanger.ts";
import {
  requireMetaAuthorizationCodeExchangeConfiguration,
  type MetaAuthorizationCodeExchangeEnvironment,
} from "./metaAuthorizationCodeExchangeConfiguration.ts";
import {
  createMetaConnectionOrchestrator,
  type MetaConnectionOrchestrator,
} from "./metaConnectionOrchestrator.ts";
import type {
  MetaConnectionService,
} from "./metaConnectionService.ts";
import {
  createMetaGraphAssetVerifier,
} from "./metaGraphAssetVerifier.ts";
import {
  createMetaGraphTransport,
  type MetaGraphTransportOptions,
} from "./metaGraphTransport.ts";
import {
  createMetaGraphWabaSubscriber,
} from "./metaGraphWabaSubscriber.ts";
import type {
  MetaCredentialVault,
} from "./metaPorts.ts";

export interface MetaConnectionRuntimeOptions
  extends MetaAuthorizationCodeExchangerOptions,
    MetaGraphTransportOptions {}

export interface MetaConnectionRuntimeDependencies {
  environment: MetaAuthorizationCodeExchangeEnvironment;
  credentialVault: MetaCredentialVault;
  connectionService: MetaConnectionService;
  options?: MetaConnectionRuntimeOptions;
}

export function createMetaConnectionRuntime(
  dependencies: MetaConnectionRuntimeDependencies,
): MetaConnectionOrchestrator {
  const exchangeConfiguration =
    requireMetaAuthorizationCodeExchangeConfiguration(
      dependencies.environment,
    );
  const transport = createMetaGraphTransport(
    { apiVersion: exchangeConfiguration.apiVersion },
    dependencies.options,
  );

  return createMetaConnectionOrchestrator({
    authorizationCodeExchanger:
      createMetaAuthorizationCodeExchanger(
        exchangeConfiguration,
        dependencies.options,
      ),
    assetVerifier: createMetaGraphAssetVerifier(transport),
    credentialVault: dependencies.credentialVault,
    wabaSubscriber: createMetaGraphWabaSubscriber(transport),
    connectionService: dependencies.connectionService,
  });
}
