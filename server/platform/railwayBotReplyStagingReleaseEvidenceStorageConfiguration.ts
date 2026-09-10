export const railwayBotReplyStagingReleaseEvidenceStoragePolicyVersion =
  "connect-railway-bot-reply-staging-release-evidence-storage-v1" as const;

export interface RailwayBotReplyStagingReleaseEvidenceStorageEnvironment {
  readonly BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE?: string;
}

export type RailwayBotReplyStagingReleaseEvidenceStorageState = Readonly<
  | {
      status: "configured";
      code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_CONFIGURED";
      policyVersion:
        typeof railwayBotReplyStagingReleaseEvidenceStoragePolicyVersion;
      storageMode: "postgresql";
      publicationMode: "transactional-compare-and-set";
      runtimeReadMode: "repository";
      environmentVariablePublication: false;
    }
  | {
      status: "disabled" | "invalid";
      code:
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_REQUIRED"
        | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_INVALID";
      policyVersion: null;
      storageMode: null;
      publicationMode: null;
      runtimeReadMode: null;
      environmentVariablePublication: false;
    }
>;

function unavailable(
  status: "disabled" | "invalid",
  code:
    | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_REQUIRED"
    | "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_INVALID",
): RailwayBotReplyStagingReleaseEvidenceStorageState {
  return Object.freeze({
    status,
    code,
    policyVersion: null,
    storageMode: null,
    publicationMode: null,
    runtimeReadMode: null,
    environmentVariablePublication: false as const,
  });
}

export function inspectRailwayBotReplyStagingReleaseEvidenceStorageConfiguration(
  environment: Readonly<
    RailwayBotReplyStagingReleaseEvidenceStorageEnvironment
  >,
): RailwayBotReplyStagingReleaseEvidenceStorageState {
  const value = environment?.BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORE;
  if (value === undefined || value === "") {
    return unavailable(
      "disabled",
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_REQUIRED",
    );
  }
  if (value !== "postgresql") {
    return unavailable(
      "invalid",
      "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_INVALID",
    );
  }
  return Object.freeze({
    status: "configured" as const,
    code: "BOT_REPLY_STAGING_RELEASE_EVIDENCE_STORAGE_CONFIGURED" as const,
    policyVersion:
      railwayBotReplyStagingReleaseEvidenceStoragePolicyVersion,
    storageMode: "postgresql" as const,
    publicationMode: "transactional-compare-and-set" as const,
    runtimeReadMode: "repository" as const,
    environmentVariablePublication: false as const,
  });
}
