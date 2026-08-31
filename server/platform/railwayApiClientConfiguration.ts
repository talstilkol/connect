import {
  vercelDeploymentEnvironments,
  type VercelDeploymentEnvironment,
} from "./railwayApiHttpHandler.ts";

export const railwayApiClientEnvironmentKeys = Object.freeze([
  "RAILWAY_API_ORIGIN",
  "VERCEL_OIDC_ENVIRONMENT",
] as const);

export type RailwayApiClientEnvironmentKey =
  (typeof railwayApiClientEnvironmentKeys)[number];

export type RailwayApiClientEnvironment = Partial<
  Record<RailwayApiClientEnvironmentKey, string | undefined>
>;

export interface RailwayApiClientConfiguration {
  readonly apiOrigin: string;
  readonly deploymentEnvironment: VercelDeploymentEnvironment;
}

export type RailwayApiClientConfigurationState =
  | Readonly<{
      status: "configured";
      missingKeys: readonly [];
      invalidKeys: readonly [];
      configuration: Readonly<RailwayApiClientConfiguration>;
    }>
  | Readonly<{
      status: "disabled" | "incomplete";
      missingKeys: readonly RailwayApiClientEnvironmentKey[];
      invalidKeys: readonly [];
      configuration: null;
    }>
  | Readonly<{
      status: "invalid";
      missingKeys: readonly [];
      invalidKeys: readonly RailwayApiClientEnvironmentKey[];
      configuration: null;
    }>;

const emptyKeys: readonly [] = Object.freeze([]);
const maximumOriginLength = 2_048;

function readProcessEnvironment(): RailwayApiClientEnvironment {
  return {
    RAILWAY_API_ORIGIN: process.env.RAILWAY_API_ORIGIN,
    VERCEL_OIDC_ENVIRONMENT:
      process.env.VERCEL_OIDC_ENVIRONMENT,
  };
}

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDevelopmentLoopback(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]")
  );
}

function parseOrigin(
  value: string,
  deploymentEnvironment: VercelDeploymentEnvironment,
): string | null {
  if (
    value.length > maximumOriginLength ||
    value.trim() !== value
  ) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    (url.pathname !== "" && url.pathname !== "/") ||
    (url.protocol !== "https:" &&
      !(
        deploymentEnvironment === "development" &&
        isDevelopmentLoopback(url)
      ))
  ) {
    return null;
  }

  return url.origin;
}

export function inspectRailwayApiClientConfiguration(
  environment: RailwayApiClientEnvironment =
    readProcessEnvironment(),
): RailwayApiClientConfigurationState {
  if (!environment || typeof environment !== "object") {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: railwayApiClientEnvironmentKeys,
      configuration: null,
    });
  }

  const missingKeys = railwayApiClientEnvironmentKeys.filter(
    (key) => !hasValue(environment[key]),
  );

  if (missingKeys.length > 0) {
    return Object.freeze({
      status:
        missingKeys.length === railwayApiClientEnvironmentKeys.length
          ? "disabled"
          : "incomplete",
      missingKeys: Object.freeze([...missingKeys]),
      invalidKeys: emptyKeys,
      configuration: null,
    });
  }

  const rawEnvironment =
    environment.VERCEL_OIDC_ENVIRONMENT!.trim();
  const deploymentEnvironment =
    vercelDeploymentEnvironments.includes(
      rawEnvironment as VercelDeploymentEnvironment,
    )
      ? (rawEnvironment as VercelDeploymentEnvironment)
      : null;
  const apiOrigin = parseOrigin(
    environment.RAILWAY_API_ORIGIN!,
    deploymentEnvironment ?? "production",
  );
  const invalidKeys: RailwayApiClientEnvironmentKey[] = [];

  if (apiOrigin === null) {
    invalidKeys.push("RAILWAY_API_ORIGIN");
  }

  if (deploymentEnvironment === null) {
    invalidKeys.push("VERCEL_OIDC_ENVIRONMENT");
  }

  if (
    invalidKeys.length > 0 ||
    apiOrigin === null ||
    deploymentEnvironment === null
  ) {
    return Object.freeze({
      status: "invalid",
      missingKeys: emptyKeys,
      invalidKeys: Object.freeze(invalidKeys),
      configuration: null,
    });
  }

  return Object.freeze({
    status: "configured",
    missingKeys: emptyKeys,
    invalidKeys: emptyKeys,
    configuration: Object.freeze({
      apiOrigin,
      deploymentEnvironment,
    }),
  });
}
