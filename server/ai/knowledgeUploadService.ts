import type {
  KnowledgeSourceRepository,
  KnowledgeSourceTransitionAction,
} from "../../db/knowledgeSourceRepository.ts";
import type {
  PersistedKnowledgeSource,
} from "../../shared/domain/aiAgent.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  sha256Hex,
} from "../meta/metaWebhookSecurity.ts";
import {
  deriveKnowledgeSourceKey,
} from "./aiAgentKey.ts";
import type {
  KnowledgeSourceScanner,
  KnowledgeUploadPolicy,
} from "./knowledgeIngestionPorts.ts";
import type {
  KnowledgeObjectStorage,
  StoredKnowledgeObject,
} from "./knowledgeObjectStorage.ts";

const MEDIA_TYPE_PATTERN =
  /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const ERROR_CODE_PATTERN = /^[A-Z0-9_]{1,100}$/;
const UNSAFE_CONTROL_CHARACTERS =
  /[\u0000-\u001f\u007f]/;

export type KnowledgeUploadServiceErrorCode =
  | "INVALID_INPUT"
  | "DEPENDENCY_UNAVAILABLE"
  | "STATE_CONFLICT"
  | "INVALID_STATE"
  | "PERSISTENCE_FAILED";

export class KnowledgeUploadServiceError extends Error {
  readonly code: KnowledgeUploadServiceErrorCode;

  constructor(code: KnowledgeUploadServiceErrorCode) {
    super("Knowledge source upload failed");
    this.name = "KnowledgeUploadServiceError";
    this.code = code;
  }
}

export interface KnowledgeUploadFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type UploadKnowledgeSourceResult =
  | {
      outcome: "processing" | "unchanged";
      source: PersistedKnowledgeSource;
    }
  | {
      outcome: "rejected";
      stage: "policy" | "scanner";
      errorCode: string;
      source: PersistedKnowledgeSource | null;
    };

export interface KnowledgeUploadService {
  upload(
    session: TenantSession,
    file: KnowledgeUploadFile,
  ): Promise<UploadKnowledgeSourceResult>;
}

export interface KnowledgeUploadServiceDependencies {
  knowledgeSources: KnowledgeSourceRepository;
  objectStorage: KnowledgeObjectStorage;
  uploadPolicy: KnowledgeUploadPolicy;
  scanner: KnowledgeSourceScanner;
}

interface ValidatedFileDescriptor {
  fileName: string;
  mediaType: string;
  sizeBytes: number;
}

type ParsedPolicyResult =
  | { outcome: "accepted" }
  | {
      outcome: "rejected";
      errorCode: string;
    }
  | { outcome: "unavailable" };

type ParsedScanResult =
  | { outcome: "clean" }
  | {
      outcome: "rejected";
      errorCode: string;
    }
  | { outcome: "unavailable" };

function serviceError(
  code: KnowledgeUploadServiceErrorCode,
): KnowledgeUploadServiceError {
  return new KnowledgeUploadServiceError(code);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);

  return (
    actual.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(value, key),
    )
  );
}

function parsePortResult(
  value: unknown,
  successOutcome: "accepted" | "clean",
): ParsedPolicyResult | ParsedScanResult {
  if (!isRecord(value)) {
    return { outcome: "unavailable" };
  }

  if (
    value.outcome === successOutcome &&
    hasExactKeys(value, ["outcome"])
  ) {
    return { outcome: successOutcome };
  }

  if (
    value.outcome === "unavailable" &&
    hasExactKeys(value, ["outcome"])
  ) {
    return { outcome: "unavailable" };
  }

  if (
    value.outcome === "rejected" &&
    hasExactKeys(value, [
      "outcome",
      "errorCode",
    ]) &&
    typeof value.errorCode === "string" &&
    ERROR_CODE_PATTERN.test(value.errorCode)
  ) {
    return {
      outcome: "rejected",
      errorCode: value.errorCode,
    };
  }

  return { outcome: "unavailable" };
}

function validateFileDescriptor(
  file: KnowledgeUploadFile,
): ValidatedFileDescriptor {
  if (
    !file ||
    typeof file !== "object" ||
    typeof file.name !== "string" ||
    typeof file.type !== "string" ||
    typeof file.size !== "number" ||
    typeof file.arrayBuffer !== "function"
  ) {
    throw serviceError("INVALID_INPUT");
  }

  const fileName = file.name.trim();
  const mediaType = file.type.trim().toLowerCase();

  if (
    fileName.length === 0 ||
    fileName.length > 512 ||
    UNSAFE_CONTROL_CHARACTERS.test(fileName) ||
    mediaType.length > 255 ||
    !MEDIA_TYPE_PATTERN.test(mediaType) ||
    !Number.isSafeInteger(file.size) ||
    file.size <= 0
  ) {
    throw serviceError("INVALID_INPUT");
  }

  return {
    fileName,
    mediaType,
    sizeBytes: file.size,
  };
}

function expectedStoredObject(
  source: PersistedKnowledgeSource,
): StoredKnowledgeObject {
  return {
    storageObjectKey: source.storageObjectKey,
    contentSha256: source.contentSha256,
    mediaType: source.mediaType,
    sizeBytes: source.sizeBytes,
  };
}

function storedObjectMatches(
  stored: StoredKnowledgeObject,
  source: PersistedKnowledgeSource,
): boolean {
  const expected = expectedStoredObject(source);

  return (
    stored.storageObjectKey ===
      expected.storageObjectKey &&
    stored.contentSha256 ===
      expected.contentSha256 &&
    stored.mediaType === expected.mediaType &&
    stored.sizeBytes === expected.sizeBytes
  );
}

async function requireTransition(
  repository: KnowledgeSourceRepository,
  source: PersistedKnowledgeSource,
  action: KnowledgeSourceTransitionAction,
  errorCode: string | null,
): Promise<PersistedKnowledgeSource> {
  let result;

  try {
    result = await repository.transition({
      tenantId: source.tenantId,
      sourceKey: source.sourceKey,
      expectedVersion: source.version,
      action,
      errorCode,
    });
  } catch {
    throw serviceError("PERSISTENCE_FAILED");
  }

  if (
    result.outcome === "updated" ||
    result.outcome === "unchanged"
  ) {
    return result.source;
  }

  if (result.outcome === "conflict") {
    throw serviceError("STATE_CONFLICT");
  }

  if (result.outcome === "invalid-state") {
    throw serviceError("INVALID_STATE");
  }

  throw serviceError("PERSISTENCE_FAILED");
}

export function createKnowledgeUploadService(
  dependencies: KnowledgeUploadServiceDependencies,
): KnowledgeUploadService {
  return {
    async upload(session, file) {
      requireTenantPermission(session, "ai.write");
      const descriptor =
        validateFileDescriptor(file);
      let policyResult: ParsedPolicyResult;

      try {
        policyResult = parsePortResult(
          await dependencies.uploadPolicy.evaluate({
            fileName: descriptor.fileName,
            mediaType: descriptor.mediaType,
            sizeBytes: descriptor.sizeBytes,
          }),
          "accepted",
        ) as ParsedPolicyResult;
      } catch {
        throw serviceError(
          "DEPENDENCY_UNAVAILABLE",
        );
      }

      if (policyResult.outcome === "unavailable") {
        throw serviceError(
          "DEPENDENCY_UNAVAILABLE",
        );
      }

      if (policyResult.outcome === "rejected") {
        return {
          outcome: "rejected",
          stage: "policy",
          errorCode: policyResult.errorCode,
          source: null,
        };
      }

      let bytes: ArrayBuffer;

      try {
        bytes = await file.arrayBuffer();
      } catch {
        throw serviceError("INVALID_INPUT");
      }

      if (
        !(bytes instanceof ArrayBuffer) ||
        bytes.byteLength !==
          descriptor.sizeBytes
      ) {
        throw serviceError("INVALID_INPUT");
      }

      const contentSha256 = await sha256Hex(bytes);
      const sourceKey =
        await deriveKnowledgeSourceKey(
          session.tenantId,
          contentSha256,
        );
      let registration;

      try {
        registration =
          await dependencies.knowledgeSources
            .registerUploaded({
              tenantId: session.tenantId,
              sourceKey,
              contentSha256,
              fileName: descriptor.fileName,
              mediaType: descriptor.mediaType,
              sizeBytes: descriptor.sizeBytes,
            });
      } catch {
        throw serviceError("PERSISTENCE_FAILED");
      }

      if (registration.outcome === "conflict") {
        throw serviceError("STATE_CONFLICT");
      }

      let source = registration.source;
      let scanBytes = bytes;

      if (source.status === "pending-validation") {
        let stored;

        try {
          stored =
            await dependencies.objectStorage.store({
              sourceKey,
              contentSha256,
              mediaType: descriptor.mediaType,
              bytes,
            });
        } catch {
          throw serviceError(
            "PERSISTENCE_FAILED",
          );
        }

        if (!storedObjectMatches(stored, source)) {
          throw serviceError(
            "PERSISTENCE_FAILED",
          );
        }

        source = await requireTransition(
          dependencies.knowledgeSources,
          source,
          "validation-passed",
          null,
        );
      }

      if (source.status === "pending-scan") {
        try {
          scanBytes =
            await dependencies.objectStorage.read(
              expectedStoredObject(source),
            );
        } catch {
          throw serviceError(
            "PERSISTENCE_FAILED",
          );
        }

        source = await requireTransition(
          dependencies.knowledgeSources,
          source,
          "scan-started",
          null,
        );

        let scanResult: ParsedScanResult;

        try {
          scanResult = parsePortResult(
            await dependencies.scanner.scan({
              sourceKey: source.sourceKey,
              mediaType: source.mediaType,
              bytes: scanBytes,
            }),
            "clean",
          ) as ParsedScanResult;
        } catch {
          throw serviceError(
            "DEPENDENCY_UNAVAILABLE",
          );
        }

        if (scanResult.outcome === "unavailable") {
          throw serviceError(
            "DEPENDENCY_UNAVAILABLE",
          );
        }

        if (scanResult.outcome === "rejected") {
          source = await requireTransition(
            dependencies.knowledgeSources,
            source,
            "rejected",
            scanResult.errorCode,
          );

          return {
            outcome: "rejected",
            stage: "scanner",
            errorCode: scanResult.errorCode,
            source,
          };
        }

        return {
          outcome: "processing",
          source,
        };
      }

      return {
        outcome: "unchanged",
        source,
      };
    },
  };
}
