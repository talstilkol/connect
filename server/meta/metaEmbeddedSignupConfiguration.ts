import type {
  MetaEmbeddedSignupView,
} from "../../shared/domain/metaEmbeddedSignupView.ts";
import {
  requireMetaGraphConfiguration,
} from "./metaGraphConfiguration.ts";

export const metaEmbeddedSignupEnvironmentKeys = [
  "META_APP_ID",
  "META_EMBEDDED_SIGNUP_CONFIGURATION_ID",
  "META_GRAPH_API_VERSION",
] as const;

type MetaEmbeddedSignupEnvironmentKey =
  (typeof metaEmbeddedSignupEnvironmentKeys)[number];

export type MetaEmbeddedSignupEnvironment = Partial<
  Record<MetaEmbeddedSignupEnvironmentKey, string | undefined>
>;

export interface MetaEmbeddedSignupConfiguration {
  appId: string;
  configurationId: string;
  apiVersion: string;
}

export type MetaEmbeddedSignupConfigurationState =
  | {
      status: "configured";
      configuration: MetaEmbeddedSignupConfiguration;
      missingKeys: readonly [];
      invalidKeys: readonly [];
    }
  | {
      status: "disabled";
      missingKeys: typeof metaEmbeddedSignupEnvironmentKeys;
      invalidKeys: readonly [];
    }
  | {
      status: "incomplete";
      missingKeys: readonly MetaEmbeddedSignupEnvironmentKey[];
      invalidKeys: readonly MetaEmbeddedSignupEnvironmentKey[];
    };

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidMetaId(value: string): boolean {
  return /^[1-9][0-9]{0,63}$/.test(value);
}

export function inspectMetaEmbeddedSignupConfiguration(
  environment: MetaEmbeddedSignupEnvironment,
): MetaEmbeddedSignupConfigurationState {
  const missingKeys = metaEmbeddedSignupEnvironmentKeys.filter(
    (key) => !hasValue(environment[key]),
  );

  if (missingKeys.length === metaEmbeddedSignupEnvironmentKeys.length) {
    return {
      status: "disabled",
      missingKeys: metaEmbeddedSignupEnvironmentKeys,
      invalidKeys: [],
    };
  }

  const invalidKeys: MetaEmbeddedSignupEnvironmentKey[] = [];
  const appId = environment.META_APP_ID?.trim() ?? "";
  const configurationId =
    environment.META_EMBEDDED_SIGNUP_CONFIGURATION_ID?.trim() ?? "";
  let apiVersion = "";

  if (appId.length > 0 && !isValidMetaId(appId)) {
    invalidKeys.push("META_APP_ID");
  }

  if (
    configurationId.length > 0 &&
    !isValidMetaId(configurationId)
  ) {
    invalidKeys.push(
      "META_EMBEDDED_SIGNUP_CONFIGURATION_ID",
    );
  }

  if (hasValue(environment.META_GRAPH_API_VERSION)) {
    try {
      apiVersion = requireMetaGraphConfiguration(
        environment,
      ).apiVersion;
    } catch {
      invalidKeys.push("META_GRAPH_API_VERSION");
    }
  }

  if (missingKeys.length > 0 || invalidKeys.length > 0) {
    return {
      status: "incomplete",
      missingKeys,
      invalidKeys,
    };
  }

  return {
    status: "configured",
    configuration: {
      appId,
      configurationId,
      apiVersion,
    },
    missingKeys: [],
    invalidKeys: [],
  };
}

export function toMetaEmbeddedSignupView(
  state: MetaEmbeddedSignupConfigurationState,
): MetaEmbeddedSignupView {
  if (state.status === "disabled") {
    return { status: "configuration-required" };
  }

  if (state.status === "incomplete") {
    return { status: "configuration-invalid" };
  }

  return {
    status: "configured",
    appId: state.configuration.appId,
    configurationId: state.configuration.configurationId,
    apiVersion: state.configuration.apiVersion,
  };
}
