import {
  createClerkClient,
  type ClerkClient,
} from "@clerk/backend";

import type {
  UserId,
} from "../../shared/domain/model.ts";
import type {
  AuthenticatedIdentity,
} from "../auth/tenantSession.ts";
import {
  RAILWAY_API_ENDPOINT_PATH,
} from "./railwayApiContract.ts";
import type {
  RailwayApiIdentityConfiguration,
} from "./railwayApiIdentityConfiguration.ts";
import type {
  EndUserSessionVerifier,
} from "./railwayApiHttpHandler.ts";

const MAXIMUM_CONFIGURATION_VALUE_LENGTH = 8_192;
const MAXIMUM_EXTERNAL_USER_ID_LENGTH = 255;

export type ClerkAuthenticationClient = Pick<
  ClerkClient,
  "authenticateRequest"
>;

export interface ClerkAuthenticationClientFactory {
  create(configuration: {
    readonly publishableKey: string;
    readonly secretKey: string;
  }): ClerkAuthenticationClient;
}

const defaultClientFactory: Readonly<ClerkAuthenticationClientFactory> =
  Object.freeze({
    create(configuration: {
      readonly publishableKey: string;
      readonly secretKey: string;
    }) {
      return createClerkClient(configuration);
    },
  });

function requireConfigurationValue(
  value: string,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAXIMUM_CONFIGURATION_VALUE_LENGTH
  ) {
    throw new Error(`${fieldName} is invalid`);
  }

  return value;
}

function isDevelopmentLoopback(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]")
  );
}

function requireCanonicalAuthorizedParty(
  value: string,
  allowDevelopmentLoopback: boolean,
): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Clerk authorized party is invalid");
  }

  if (
    (url.protocol !== "https:" &&
      !(allowDevelopmentLoopback && isDevelopmentLoopback(url))) ||
    url.origin !== value ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("Clerk authorized party is invalid");
  }

  return url.origin;
}

function validExternalUserId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAXIMUM_EXTERNAL_USER_ID_LENGTH
  );
}

export function createClerkEndUserSessionVerifier(
  configuration: Readonly<RailwayApiIdentityConfiguration>,
  clientFactory: Readonly<ClerkAuthenticationClientFactory> =
    defaultClientFactory,
): EndUserSessionVerifier {
  const publishableKey = requireConfigurationValue(
    configuration.clerkPublishableKey,
    "Clerk publishable key",
  );
  const secretKey = requireConfigurationValue(
    configuration.clerkSecretKey,
    "Clerk secret key",
  );
  const authorizedParty = requireCanonicalAuthorizedParty(
    configuration.appPublicOrigin,
    configuration.expectedServiceIdentity.environment ===
      "development",
  );

  if (typeof clientFactory.create !== "function") {
    throw new Error("Clerk client factory is invalid");
  }

  const client = clientFactory.create({
    publishableKey,
    secretKey,
  });

  if (typeof client?.authenticateRequest !== "function") {
    throw new Error("Clerk authentication client is invalid");
  }

  const requestUrl = new URL(
    RAILWAY_API_ENDPOINT_PATH,
    authorizedParty,
  );

  return {
    async verify(sessionToken): Promise<Readonly<AuthenticatedIdentity> | null> {
      const request = new Request(requestUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${sessionToken}`,
        },
      });
      const state = await client.authenticateRequest(request, {
        acceptsToken: "session_token",
        authorizedParties: [authorizedParty],
      });

      if (!state.isAuthenticated) {
        return null;
      }

      const auth = state.toAuth();

      if (
        !auth.isAuthenticated ||
        auth.tokenType !== "session_token" ||
        !validExternalUserId(auth.userId)
      ) {
        return null;
      }

      return Object.freeze({
        externalUserId: auth.userId as UserId,
      });
    },
  };
}
