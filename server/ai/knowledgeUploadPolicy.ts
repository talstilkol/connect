import type {
  KnowledgeUploadPolicy,
} from "./knowledgeIngestionPorts.ts";

const MEDIA_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const MAX_CONFIGURED_MEDIA_TYPES = 50;

export type KnowledgeUploadPolicyConfigurationIssue =
  | "MAX_BYTES_REQUIRED"
  | "MAX_BYTES_INVALID"
  | "ALLOWED_MEDIA_TYPES_REQUIRED"
  | "ALLOWED_MEDIA_TYPES_INVALID";

export interface KnowledgeUploadPolicyConfiguration {
  maximumSizeBytes: number;
  allowedMediaTypes: readonly string[];
}

export type KnowledgeUploadPolicyConfigurationInspection =
  | {
      status: "configured";
      configuration:
        KnowledgeUploadPolicyConfiguration;
    }
  | {
      status: "configuration-required";
      issues:
        readonly KnowledgeUploadPolicyConfigurationIssue[];
    };

export interface KnowledgeUploadPolicyEnvironment {
  KNOWLEDGE_UPLOAD_MAX_BYTES?: string;
  KNOWLEDGE_UPLOAD_ALLOWED_MEDIA_TYPES_JSON?:
    string;
}

function parseMaximumSizeBytes(
  value: string | undefined,
): number | null {
  if (
    typeof value !== "string" ||
    !/^[1-9][0-9]{0,15}$/.test(value)
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed)
    ? parsed
    : null;
}

function parseAllowedMediaTypes(
  value: string | undefined,
): readonly string[] | null {
  if (typeof value !== "string") {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.length > MAX_CONFIGURED_MEDIA_TYPES
  ) {
    return null;
  }

  const normalized = parsed.map((item) =>
    typeof item === "string"
      ? item.trim().toLowerCase()
      : null,
  );

  if (
    normalized.some(
      (item) =>
        item === null ||
        !MEDIA_TYPE_PATTERN.test(item),
    )
  ) {
    return null;
  }

  const mediaTypes = normalized as string[];

  if (
    new Set(mediaTypes).size !==
    mediaTypes.length
  ) {
    return null;
  }

  return mediaTypes.sort();
}

export function inspectKnowledgeUploadPolicyConfiguration(
  environment: KnowledgeUploadPolicyEnvironment,
): KnowledgeUploadPolicyConfigurationInspection {
  const issues:
    KnowledgeUploadPolicyConfigurationIssue[] =
    [];
  const maximumSizeBytes =
    parseMaximumSizeBytes(
      environment.KNOWLEDGE_UPLOAD_MAX_BYTES,
    );
  const allowedMediaTypes =
    parseAllowedMediaTypes(
      environment
        .KNOWLEDGE_UPLOAD_ALLOWED_MEDIA_TYPES_JSON,
    );

  if (
    environment.KNOWLEDGE_UPLOAD_MAX_BYTES ===
    undefined
  ) {
    issues.push("MAX_BYTES_REQUIRED");
  } else if (maximumSizeBytes === null) {
    issues.push("MAX_BYTES_INVALID");
  }

  if (
    environment
      .KNOWLEDGE_UPLOAD_ALLOWED_MEDIA_TYPES_JSON ===
    undefined
  ) {
    issues.push(
      "ALLOWED_MEDIA_TYPES_REQUIRED",
    );
  } else if (allowedMediaTypes === null) {
    issues.push(
      "ALLOWED_MEDIA_TYPES_INVALID",
    );
  }

  if (
    issues.length > 0 ||
    maximumSizeBytes === null ||
    allowedMediaTypes === null
  ) {
    return {
      status: "configuration-required",
      issues,
    };
  }

  return {
    status: "configured",
    configuration: {
      maximumSizeBytes,
      allowedMediaTypes,
    },
  };
}

export function createConfiguredKnowledgeUploadPolicy(
  configuration: KnowledgeUploadPolicyConfiguration,
): KnowledgeUploadPolicy {
  if (
    !Number.isSafeInteger(
      configuration.maximumSizeBytes,
    ) ||
    configuration.maximumSizeBytes <= 0 ||
    !Array.isArray(
      configuration.allowedMediaTypes,
    ) ||
    configuration.allowedMediaTypes.length ===
      0 ||
    configuration.allowedMediaTypes.length >
      MAX_CONFIGURED_MEDIA_TYPES ||
    configuration.allowedMediaTypes.some(
      (mediaType) =>
        typeof mediaType !== "string" ||
        mediaType !==
          mediaType.trim().toLowerCase() ||
        !MEDIA_TYPE_PATTERN.test(mediaType),
    ) ||
    new Set(configuration.allowedMediaTypes)
      .size !==
      configuration.allowedMediaTypes.length
  ) {
    throw new Error(
      "knowledge upload policy configuration is invalid",
    );
  }

  const allowedMediaTypes = new Set(
    configuration.allowedMediaTypes,
  );

  return {
    async evaluate(file) {
      if (
        !Number.isSafeInteger(file.sizeBytes) ||
        file.sizeBytes <= 0 ||
        file.sizeBytes >
          configuration.maximumSizeBytes
      ) {
        return {
          outcome: "rejected",
          errorCode: "FILE_SIZE_NOT_ALLOWED",
        };
      }

      if (
        typeof file.mediaType !== "string" ||
        !allowedMediaTypes.has(
          file.mediaType.trim().toLowerCase(),
        )
      ) {
        return {
          outcome: "rejected",
          errorCode:
            "MEDIA_TYPE_NOT_ALLOWED",
        };
      }

      return { outcome: "accepted" };
    },
  };
}
