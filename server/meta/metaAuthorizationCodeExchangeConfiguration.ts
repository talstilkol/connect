import {
  requireMetaGraphConfiguration,
} from "./metaGraphConfiguration.ts";

export interface MetaAuthorizationCodeExchangeEnvironment {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_GRAPH_API_VERSION?: string;
}

export interface MetaAuthorizationCodeExchangeConfiguration {
  appId: string;
  appSecret: string;
  apiVersion: string;
}

function requireMetaAppId(value: string | undefined): string {
  const appId = value?.trim();

  if (!appId) {
    throw new Error(
      "Missing required Meta configuration: META_APP_ID",
    );
  }

  if (!/^[1-9][0-9]{0,63}$/.test(appId)) {
    throw new Error(
      "META_APP_ID must be a numeric Meta application ID",
    );
  }

  return appId;
}

function requireMetaAppSecret(
  value: string | undefined,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      "Missing required Meta secret: META_APP_SECRET",
    );
  }

  if (value.length > 8192) {
    throw new Error("META_APP_SECRET exceeds the supported size");
  }

  return value;
}

export function requireMetaAuthorizationCodeExchangeConfiguration(
  environment: MetaAuthorizationCodeExchangeEnvironment,
): MetaAuthorizationCodeExchangeConfiguration {
  return {
    appId: requireMetaAppId(environment.META_APP_ID),
    appSecret: requireMetaAppSecret(
      environment.META_APP_SECRET,
    ),
    apiVersion: requireMetaGraphConfiguration(
      environment,
    ).apiVersion,
  };
}
