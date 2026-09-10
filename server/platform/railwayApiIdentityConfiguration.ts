import {
  resolvePublicOrigin,
} from "../operations/publicOrigin.ts";
import {
  vercelDeploymentEnvironments,
  type ExpectedVercelServiceIdentity,
  type VercelDeploymentEnvironment,
} from "./railwayApiHttpHandler.ts";

export const railwayApiIdentityEnvironmentKeys = [
  "APP_PUBLIC_ORIGIN",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "VERCEL_OIDC_TEAM_SLUG",
  "VERCEL_OIDC_PROJECT_NAME",
  "VERCEL_OIDC_ENVIRONMENT",
] as const;

export type RailwayApiIdentityEnvironmentKey =
  (typeof railwayApiIdentityEnvironmentKeys)[number];

export interface RailwayApiIdentityEnvironment
  extends Partial<
    Record<RailwayApiIdentityEnvironmentKey, string | undefined>
  > {
  readonly NODE_ENV?: string;
}

export interface RailwayApiIdentityConfiguration {
  readonly appPublicOrigin: string;
  readonly clerkPublishableKey: string;
  readonly clerkSecretKey: string;
  readonly expectedServiceIdentity: Readonly<ExpectedVercelServiceIdentity>;
  readonly issuer: string;
  readonly audience: string;
  readonly subject: string;
  readonly jwksUrl: string;
}

export type RailwayApiIdentityConfigurationState =
  | {
      readonly status: "configured";
      readonly missingKeys: readonly [];
      readonly invalidKeys: readonly [];
      readonly configuration: Readonly<RailwayApiIdentityConfiguration>;
    }
  | {
      readonly status: "disabled" | "incomplete";
      readonly missingKeys: readonly RailwayApiIdentityEnvironmentKey[];
      readonly invalidKeys: readonly [];
      readonly configuration: null;
    }
  | {
      readonly status: "invalid";
      readonly missingKeys: readonly [];
      readonly invalidKeys: readonly RailwayApiIdentityEnvironmentKey[];
      readonly configuration: null;
    };

const SAFE_VERCEL_IDENTITY_PATTERN = /^[A-Za-z0-9._-]+$/;
const MAXIMUM_IDENTITY_LENGTH = 128;
const MAXIMUM_CREDENTIAL_LENGTH = 8_192;
const NO_CONFIGURATION_KEYS: readonly [] = Object.freeze([]);

function readProcessEnvironment(): RailwayApiIdentityEnvironment {
  return {
    APP_PUBLIC_ORIGIN: process.env.APP_PUBLIC_ORIGIN,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    VERCEL_OIDC_TEAM_SLUG:
      process.env.VERCEL_OIDC_TEAM_SLUG,
    VERCEL_OIDC_PROJECT_NAME:
      process.env.VERCEL_OIDC_PROJECT_NAME,
    VERCEL_OIDC_ENVIRONMENT:
      process.env.VERCEL_OIDC_ENVIRONMENT,
    NODE_ENV: process.env.NODE_ENV,
  };
}

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validIdentityValue(value: string): boolean {
  return (
    value.length <= MAXIMUM_IDENTITY_LENGTH &&
    SAFE_VERCEL_IDENTITY_PATTERN.test(value)
  );
}

function validCredentialValue(value: string): boolean {
  return value.length <= MAXIMUM_CREDENTIAL_LENGTH;
}

function freezeKeys(
  keys: readonly RailwayApiIdentityEnvironmentKey[],
): readonly RailwayApiIdentityEnvironmentKey[] {
  return Object.freeze([...keys]);
}

export function inspectRailwayApiIdentityConfiguration(
  environment: RailwayApiIdentityEnvironment =
    readProcessEnvironment(),
): RailwayApiIdentityConfigurationState {
  const missingKeys = railwayApiIdentityEnvironmentKeys.filter(
    (key) => !hasValue(environment[key]),
  );

  if (missingKeys.length > 0) {
    return Object.freeze({
      status:
        missingKeys.length === railwayApiIdentityEnvironmentKeys.length
          ? "disabled"
          : "incomplete",
      missingKeys: freezeKeys(missingKeys),
      invalidKeys: NO_CONFIGURATION_KEYS,
      configuration: null,
    });
  }

  const appPublicOrigin = resolvePublicOrigin({
    APP_PUBLIC_ORIGIN: environment.APP_PUBLIC_ORIGIN,
    NODE_ENV: environment.NODE_ENV,
  });
  const clerkPublishableKey =
    environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!.trim();
  const clerkSecretKey = environment.CLERK_SECRET_KEY!.trim();
  const teamSlug = environment.VERCEL_OIDC_TEAM_SLUG!.trim();
  const projectName =
    environment.VERCEL_OIDC_PROJECT_NAME!.trim();
  const deploymentEnvironment =
    environment.VERCEL_OIDC_ENVIRONMENT!.trim();
  const invalidKeys: RailwayApiIdentityEnvironmentKey[] = [];

  if (!appPublicOrigin) {
    invalidKeys.push("APP_PUBLIC_ORIGIN");
  }

  if (!validCredentialValue(clerkPublishableKey)) {
    invalidKeys.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  if (!validCredentialValue(clerkSecretKey)) {
    invalidKeys.push("CLERK_SECRET_KEY");
  }

  if (!validIdentityValue(teamSlug)) {
    invalidKeys.push("VERCEL_OIDC_TEAM_SLUG");
  }

  if (!validIdentityValue(projectName)) {
    invalidKeys.push("VERCEL_OIDC_PROJECT_NAME");
  }

  if (
    !vercelDeploymentEnvironments.includes(
      deploymentEnvironment as VercelDeploymentEnvironment,
    )
  ) {
    invalidKeys.push("VERCEL_OIDC_ENVIRONMENT");
  }

  if (invalidKeys.length > 0 || !appPublicOrigin) {
    return Object.freeze({
      status: "invalid",
      missingKeys: NO_CONFIGURATION_KEYS,
      invalidKeys: freezeKeys(invalidKeys),
      configuration: null,
    });
  }

  const environmentValue =
    deploymentEnvironment as VercelDeploymentEnvironment;
  const issuer = `https://oidc.vercel.com/${teamSlug}`;
  const audience = `https://vercel.com/${teamSlug}`;
  const subject =
    `owner:${teamSlug}:project:${projectName}:environment:${environmentValue}`;
  const expectedServiceIdentity = Object.freeze({
    teamSlug,
    projectName,
    environment: environmentValue,
  });

  return Object.freeze({
    status: "configured",
    missingKeys: NO_CONFIGURATION_KEYS,
    invalidKeys: NO_CONFIGURATION_KEYS,
    configuration: Object.freeze({
      appPublicOrigin,
      clerkPublishableKey,
      clerkSecretKey,
      expectedServiceIdentity,
      issuer,
      audience,
      subject,
      jwksUrl: `${issuer}/.well-known/jwks`,
    }),
  });
}
