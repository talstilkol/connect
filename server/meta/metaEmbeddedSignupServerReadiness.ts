import {
  requireMetaAuthorizationCodeExchangeConfiguration,
  type MetaAuthorizationCodeExchangeEnvironment,
} from "./metaAuthorizationCodeExchangeConfiguration.ts";
import {
  inspectMetaCredentialEncryptionConfiguration,
  type MetaCredentialEncryptionEnvironment,
} from "./metaCredentialVault.ts";
import {
  inspectMetaEmbeddedSignupConfiguration,
  type MetaEmbeddedSignupEnvironment,
} from "./metaEmbeddedSignupConfiguration.ts";

export type MetaEmbeddedSignupServerEnvironment =
  MetaEmbeddedSignupEnvironment &
    MetaAuthorizationCodeExchangeEnvironment &
    MetaCredentialEncryptionEnvironment;

export interface MetaEmbeddedSignupServerReadiness {
  status: "configured" | "disabled" | "incomplete";
}

export function inspectMetaEmbeddedSignupServerReadiness(
  environment: MetaEmbeddedSignupServerEnvironment,
): MetaEmbeddedSignupServerReadiness {
  const clientConfiguration =
    inspectMetaEmbeddedSignupConfiguration(environment);

  if (clientConfiguration.status !== "configured") {
    return { status: clientConfiguration.status };
  }

  try {
    requireMetaAuthorizationCodeExchangeConfiguration(
      environment,
    );

    if (
      inspectMetaCredentialEncryptionConfiguration(
        environment,
      ) !== "configured"
    ) {
      return { status: "incomplete" };
    }

    return { status: "configured" };
  } catch {
    return { status: "incomplete" };
  }
}
