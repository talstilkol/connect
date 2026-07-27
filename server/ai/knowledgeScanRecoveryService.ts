import type {
  KnowledgeSourceRepository,
} from "../../db/knowledgeSourceRepository.ts";
import type {
  PersistedKnowledgeSource,
} from "../../shared/domain/aiAgent.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveKnowledgeSourceKey,
} from "./aiAgentKey.ts";
import type {
  KnowledgeSourceScanner,
} from "./knowledgeIngestionPorts.ts";
import type {
  KnowledgeObjectStorage,
} from "./knowledgeObjectStorage.ts";
import type {
  KnowledgeScanRecoveryPolicy,
} from "./knowledgeScanRecoveryPolicy.ts";

const SOURCE_KEY_PATTERN =
  /^knowledge_source_v1_[0-9a-f]{64}$/;
const ERROR_CODE_PATTERN =
  /^[A-Z0-9_]{1,100}$/;

export type KnowledgeScanRecoveryServiceErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "DEPENDENCY_UNAVAILABLE"
  | "STATE_CONFLICT"
  | "INVALID_STATE"
  | "PERSISTENCE_FAILED";

export class KnowledgeScanRecoveryServiceError extends Error {
  readonly code: KnowledgeScanRecoveryServiceErrorCode;

  constructor(
    code: KnowledgeScanRecoveryServiceErrorCode,
  ) {
    super("Knowledge scan recovery failed");
    this.name =
      "KnowledgeScanRecoveryServiceError";
    this.code = code;
  }
}

export interface KnowledgeScanRecoveryClock {
  now(): Date;
}

export type RecoverKnowledgeScanResult =
  | {
      outcome: "retry-later" | "scan-clean";
      source: PersistedKnowledgeSource;
    }
  | {
      outcome: "rejected";
      errorCode: string;
      source: PersistedKnowledgeSource;
    };

export interface KnowledgeScanRecoveryService {
  recover(
    session: TenantSession,
    input: unknown,
  ): Promise<RecoverKnowledgeScanResult>;
}

export interface KnowledgeScanRecoveryDependencies {
  knowledgeSources: KnowledgeSourceRepository;
  objectStorage: KnowledgeObjectStorage;
  scanner: KnowledgeSourceScanner;
  recoveryPolicy: KnowledgeScanRecoveryPolicy;
  clock: KnowledgeScanRecoveryClock;
}

interface RecoveryRequest {
  sourceKey: string;
  expectedVersion: number;
}

type ParsedRecoveryPolicyResult =
  | { outcome: "retry-allowed" }
  | { outcome: "retry-later" }
  | { outcome: "unavailable" };

type ParsedScannerResult =
  | { outcome: "clean" }
  | {
      outcome: "rejected";
      errorCode: string;
    }
  | { outcome: "unavailable" };

function serviceError(
  code: KnowledgeScanRecoveryServiceErrorCode,
): KnowledgeScanRecoveryServiceError {
  return new KnowledgeScanRecoveryServiceError(
    code,
  );
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

function parseRequest(
  value: unknown,
): RecoveryRequest {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "sourceKey",
      "expectedVersion",
    ]) ||
    typeof value.sourceKey !== "string" ||
    !SOURCE_KEY_PATTERN.test(
      value.sourceKey,
    ) ||
    !Number.isSafeInteger(
      value.expectedVersion,
    ) ||
    Number(value.expectedVersion) <= 0
  ) {
    throw serviceError("INVALID_INPUT");
  }

  return {
    sourceKey: value.sourceKey,
    expectedVersion: Number(
      value.expectedVersion,
    ),
  };
}

function parsePolicyResult(
  value: unknown,
): ParsedRecoveryPolicyResult {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["outcome"])
  ) {
    return { outcome: "unavailable" };
  }

  if (
    value.outcome === "retry-allowed" ||
    value.outcome === "retry-later"
  ) {
    return { outcome: value.outcome };
  }

  return { outcome: "unavailable" };
}

function parseScannerResult(
  value: unknown,
): ParsedScannerResult {
  if (!isRecord(value)) {
    return { outcome: "unavailable" };
  }

  if (
    value.outcome === "clean" &&
    hasExactKeys(value, ["outcome"])
  ) {
    return { outcome: "clean" };
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

async function assertSourceIdentity(
  session: TenantSession,
  source: PersistedKnowledgeSource,
): Promise<void> {
  const expectedKey =
    await deriveKnowledgeSourceKey(
      session.tenantId,
      source.contentSha256,
    );

  if (
    source.tenantId !== session.tenantId ||
    source.sourceKey !== expectedKey
  ) {
    throw serviceError("PERSISTENCE_FAILED");
  }
}

export function createKnowledgeScanRecoveryService(
  dependencies: KnowledgeScanRecoveryDependencies,
): KnowledgeScanRecoveryService {
  return {
    async recover(session, input) {
      requireTenantPermission(session, "ai.write");
      const request = parseRequest(input);
      let source;

      try {
        source =
          await dependencies.knowledgeSources
            .findByKey(
              session.tenantId,
              request.sourceKey,
            );
      } catch {
        throw serviceError(
          "PERSISTENCE_FAILED",
        );
      }

      if (!source) {
        throw serviceError("NOT_FOUND");
      }

      await assertSourceIdentity(
        session,
        source,
      );

      if (
        source.version !==
          request.expectedVersion
      ) {
        throw serviceError("STATE_CONFLICT");
      }

      if (source.status !== "scanning") {
        throw serviceError("INVALID_STATE");
      }

      let now: Date;

      try {
        now = dependencies.clock.now();
      } catch {
        throw serviceError(
          "DEPENDENCY_UNAVAILABLE",
        );
      }

      let policyResult:
        ParsedRecoveryPolicyResult;

      try {
        policyResult = parsePolicyResult(
          await dependencies.recoveryPolicy
            .evaluate({ source, now }),
        );
      } catch {
        throw serviceError(
          "DEPENDENCY_UNAVAILABLE",
        );
      }

      if (
        policyResult.outcome ===
        "unavailable"
      ) {
        throw serviceError(
          "DEPENDENCY_UNAVAILABLE",
        );
      }

      if (
        policyResult.outcome ===
        "retry-later"
      ) {
        return {
          outcome: "retry-later",
          source,
        };
      }

      let claim;

      try {
        claim =
          await dependencies.knowledgeSources
            .transition({
              tenantId: session.tenantId,
              sourceKey: source.sourceKey,
              expectedVersion: source.version,
              action: "scan-retry-started",
              errorCode: null,
            });
      } catch {
        throw serviceError(
          "PERSISTENCE_FAILED",
        );
      }

      if (
        claim.outcome !== "updated" &&
        claim.outcome !== "unchanged"
      ) {
        throw serviceError(
          claim.outcome === "conflict"
            ? "STATE_CONFLICT"
            : claim.outcome ===
                "invalid-state"
              ? "INVALID_STATE"
              : "NOT_FOUND",
        );
      }

      source = claim.source;
      let bytes: ArrayBuffer;

      try {
        bytes =
          await dependencies.objectStorage.read({
            storageObjectKey:
              source.storageObjectKey,
            contentSha256:
              source.contentSha256,
            mediaType: source.mediaType,
            sizeBytes: source.sizeBytes,
          });
      } catch {
        throw serviceError(
          "PERSISTENCE_FAILED",
        );
      }

      let scanResult: ParsedScannerResult;

      try {
        scanResult = parseScannerResult(
          await dependencies.scanner.scan({
            sourceKey: source.sourceKey,
            mediaType: source.mediaType,
            bytes,
          }),
        );
      } catch {
        throw serviceError(
          "DEPENDENCY_UNAVAILABLE",
        );
      }

      if (
        scanResult.outcome === "unavailable"
      ) {
        throw serviceError(
          "DEPENDENCY_UNAVAILABLE",
        );
      }

      if (scanResult.outcome === "clean") {
        return {
          outcome: "scan-clean",
          source,
        };
      }

      let rejected;

      try {
        rejected =
          await dependencies.knowledgeSources
            .transition({
              tenantId: session.tenantId,
              sourceKey: source.sourceKey,
              expectedVersion: source.version,
              action: "rejected",
              errorCode:
                scanResult.errorCode,
            });
      } catch {
        throw serviceError(
          "PERSISTENCE_FAILED",
        );
      }

      if (
        rejected.outcome !== "updated" &&
        rejected.outcome !== "unchanged"
      ) {
        throw serviceError(
          rejected.outcome === "conflict"
            ? "STATE_CONFLICT"
            : rejected.outcome ===
                "invalid-state"
              ? "INVALID_STATE"
              : "PERSISTENCE_FAILED",
        );
      }

      return {
        outcome: "rejected",
        errorCode: scanResult.errorCode,
        source: rejected.source,
      };
    },
  };
}
