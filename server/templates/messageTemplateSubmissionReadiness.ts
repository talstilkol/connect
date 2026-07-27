import {
  inspectMetaCredentialEncryptionConfiguration,
  type MetaCredentialEncryptionEnvironment,
} from "../meta/metaCredentialVault.ts";
import {
  requireMetaGraphConfiguration,
  type MetaGraphEnvironment,
} from "../meta/metaGraphConfiguration.ts";

export type MessageTemplateSubmissionEnvironment =
  MetaCredentialEncryptionEnvironment &
    MetaGraphEnvironment;

export interface MessageTemplateSubmissionReadiness {
  status: "configured" | "disabled" | "incomplete";
}

export function inspectMessageTemplateSubmissionReadiness(
  environment: MessageTemplateSubmissionEnvironment,
): MessageTemplateSubmissionReadiness {
  const graphVersion =
    environment.META_GRAPH_API_VERSION?.trim() ?? "";
  const encryptionKey =
    environment.META_CREDENTIAL_ENCRYPTION_KEY_V1?.trim() ??
    "";

  if (!graphVersion && !encryptionKey) {
    return { status: "disabled" };
  }

  try {
    requireMetaGraphConfiguration(environment);

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
