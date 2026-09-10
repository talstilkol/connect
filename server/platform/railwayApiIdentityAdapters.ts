import {
  createClerkEndUserSessionVerifier,
  type ClerkAuthenticationClientFactory,
} from "./clerkEndUserSessionVerifier.ts";
import {
  inspectRailwayApiIdentityConfiguration,
  type RailwayApiIdentityEnvironment,
} from "./railwayApiIdentityConfiguration.ts";
import type {
  EndUserSessionVerifier,
  ExpectedVercelServiceIdentity,
  VercelOidcVerifier,
} from "./railwayApiHttpHandler.ts";
import {
  createVercelOidcVerifier,
  type VercelOidcVerificationDependencies,
} from "./vercelOidcVerifier.ts";

export interface RailwayApiIdentityAdapterDependencies {
  readonly vercelOidc?: Readonly<VercelOidcVerificationDependencies>;
  readonly clerk?: Readonly<ClerkAuthenticationClientFactory>;
}

export interface RailwayApiIdentityAdapters {
  readonly expectedServiceIdentity: Readonly<ExpectedVercelServiceIdentity>;
  readonly oidcVerifier: VercelOidcVerifier;
  readonly endUserSessionVerifier: EndUserSessionVerifier;
}

export function createRailwayApiIdentityAdapters(
  environment?: RailwayApiIdentityEnvironment,
  dependencies: Readonly<RailwayApiIdentityAdapterDependencies> = {},
): Readonly<RailwayApiIdentityAdapters> {
  const state = inspectRailwayApiIdentityConfiguration(environment);

  if (state.status !== "configured") {
    throw new Error(
      "Railway API identity configuration is unavailable",
    );
  }

  const configuration = state.configuration;

  return Object.freeze({
    expectedServiceIdentity:
      configuration.expectedServiceIdentity,
    oidcVerifier: createVercelOidcVerifier(
      configuration,
      dependencies.vercelOidc,
    ),
    endUserSessionVerifier:
      createClerkEndUserSessionVerifier(
        configuration,
        dependencies.clerk,
      ),
  });
}
