import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
} from "jose";

import type {
  RailwayApiIdentityConfiguration,
} from "./railwayApiIdentityConfiguration.ts";
import type {
  ExpectedVercelServiceIdentity,
  VercelOidcVerifier,
} from "./railwayApiHttpHandler.ts";

const REMOTE_JWKS_TIMEOUT_MS = 5_000;
const REMOTE_JWKS_COOLDOWN_MS = 30_000;
const REMOTE_JWKS_CACHE_MAX_AGE_MS = 600_000;

const invalidTokenErrorCodes = new Set([
  "ERR_JOSE_ALG_NOT_ALLOWED",
  "ERR_JOSE_NOT_SUPPORTED",
  "ERR_JWS_INVALID",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWT_EXPIRED",
  "ERR_JWT_INVALID",
  "ERR_JWKS_NO_MATCHING_KEY",
]);

export interface VercelOidcVerificationDependencies {
  readonly createRemoteKeySet: (url: URL) => JWTVerifyGetKey;
  readonly verifyJwt: (
    token: string,
    keySet: JWTVerifyGetKey,
    options: Readonly<JWTVerifyOptions>,
  ) => Promise<void>;
}

const defaultDependencies: Readonly<VercelOidcVerificationDependencies> =
  Object.freeze({
    createRemoteKeySet(url: URL): JWTVerifyGetKey {
      return createRemoteJWKSet(url, {
        timeoutDuration: REMOTE_JWKS_TIMEOUT_MS,
        cooldownDuration: REMOTE_JWKS_COOLDOWN_MS,
        cacheMaxAge: REMOTE_JWKS_CACHE_MAX_AGE_MS,
      });
    },
    async verifyJwt(
      token: string,
      keySet: JWTVerifyGetKey,
      options: Readonly<JWTVerifyOptions>,
    ): Promise<void> {
      await jwtVerify(token, keySet, options);
    },
  });

function sameExpectedIdentity(
  left: Readonly<ExpectedVercelServiceIdentity>,
  right: Readonly<ExpectedVercelServiceIdentity>,
): boolean {
  return (
    left.teamSlug === right.teamSlug &&
    left.projectName === right.projectName &&
    left.environment === right.environment
  );
}

function isInvalidTokenError(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    typeof error.code === "string" &&
    invalidTokenErrorCodes.has(error.code)
  );
}

export function createVercelOidcVerifier(
  configuration: Readonly<RailwayApiIdentityConfiguration>,
  dependencies: Readonly<VercelOidcVerificationDependencies> =
    defaultDependencies,
): VercelOidcVerifier {
  if (
    typeof dependencies.createRemoteKeySet !== "function" ||
    typeof dependencies.verifyJwt !== "function"
  ) {
    throw new Error("Vercel OIDC dependencies are invalid");
  }

  const jwksUrl = new URL(configuration.jwksUrl);

  if (
    jwksUrl.protocol !== "https:" ||
    jwksUrl.origin !== "https://oidc.vercel.com" ||
    jwksUrl.pathname !==
      `/${configuration.expectedServiceIdentity.teamSlug}/.well-known/jwks` ||
    jwksUrl.search !== "" ||
    jwksUrl.hash !== "" ||
    configuration.issuer !==
      `https://oidc.vercel.com/${configuration.expectedServiceIdentity.teamSlug}` ||
    configuration.audience !==
      `https://vercel.com/${configuration.expectedServiceIdentity.teamSlug}` ||
    configuration.subject !==
      `owner:${configuration.expectedServiceIdentity.teamSlug}:project:${configuration.expectedServiceIdentity.projectName}:environment:${configuration.expectedServiceIdentity.environment}`
  ) {
    throw new Error("Vercel OIDC configuration is invalid");
  }

  const keySet = dependencies.createRemoteKeySet(jwksUrl);
  const verificationOptions = Object.freeze({
    issuer: configuration.issuer,
    audience: configuration.audience,
    subject: configuration.subject,
  });

  return {
    async verify(token, expectedIdentity) {
      if (
        !sameExpectedIdentity(
          expectedIdentity,
          configuration.expectedServiceIdentity,
        )
      ) {
        throw new Error(
          "Vercel OIDC expected identity is inconsistent",
        );
      }

      try {
        await dependencies.verifyJwt(
          token,
          keySet,
          verificationOptions,
        );
      } catch (error) {
        if (isInvalidTokenError(error)) {
          return null;
        }

        throw new Error(
          "Vercel OIDC verification dependency is unavailable",
          { cause: error },
        );
      }

      return Object.freeze({
        provider: "vercel" as const,
        ...configuration.expectedServiceIdentity,
        subject: configuration.subject,
      });
    },
  };
}
