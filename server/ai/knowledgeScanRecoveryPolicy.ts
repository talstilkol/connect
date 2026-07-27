import type {
  PersistedKnowledgeSource,
} from "../../shared/domain/aiAgent.ts";

const MAXIMUM_SAFE_SECONDS = Math.floor(
  Number.MAX_SAFE_INTEGER / 1_000,
);

export type KnowledgeScanRecoveryPolicyResult =
  | { outcome: "retry-allowed" }
  | { outcome: "retry-later" }
  | { outcome: "unavailable" };

export interface KnowledgeScanRecoveryPolicy {
  evaluate(input: {
    source: PersistedKnowledgeSource;
    now: Date;
  }): Promise<unknown>;
}

export type KnowledgeScanRecoveryConfigurationInspection =
  | {
      status: "configured";
      minimumAgeSeconds: number;
    }
  | {
      status: "configuration-required";
      issue:
        | "MINIMUM_AGE_REQUIRED"
        | "MINIMUM_AGE_INVALID";
    };

export interface KnowledgeScanRecoveryEnvironment {
  KNOWLEDGE_SCAN_RETRY_MIN_AGE_SECONDS?: string;
}

function parseUtcTimestamp(
  value: string,
): number | null {
  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
      value,
    )
      ? `${value.replace(" ", "T")}Z`
      : value;

  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const timestamp = Date.parse(normalized);

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

export function inspectKnowledgeScanRecoveryConfiguration(
  environment: KnowledgeScanRecoveryEnvironment,
): KnowledgeScanRecoveryConfigurationInspection {
  const rawValue =
    environment
      .KNOWLEDGE_SCAN_RETRY_MIN_AGE_SECONDS;

  if (rawValue === undefined) {
    return {
      status: "configuration-required",
      issue: "MINIMUM_AGE_REQUIRED",
    };
  }

  if (!/^[1-9][0-9]{0,15}$/.test(rawValue)) {
    return {
      status: "configuration-required",
      issue: "MINIMUM_AGE_INVALID",
    };
  }

  const minimumAgeSeconds = Number(rawValue);

  if (
    !Number.isSafeInteger(minimumAgeSeconds) ||
    minimumAgeSeconds >
      MAXIMUM_SAFE_SECONDS
  ) {
    return {
      status: "configuration-required",
      issue: "MINIMUM_AGE_INVALID",
    };
  }

  return {
    status: "configured",
    minimumAgeSeconds,
  };
}

export function createConfiguredKnowledgeScanRecoveryPolicy(
  minimumAgeSeconds: number,
): KnowledgeScanRecoveryPolicy {
  if (
    !Number.isSafeInteger(minimumAgeSeconds) ||
    minimumAgeSeconds <= 0 ||
    minimumAgeSeconds >
      MAXIMUM_SAFE_SECONDS
  ) {
    throw new Error(
      "knowledge scan recovery policy is invalid",
    );
  }

  return {
    async evaluate(input) {
      if (
        !(input.now instanceof Date) ||
        !Number.isFinite(input.now.getTime()) ||
        typeof input.source.updatedAt !==
          "string"
      ) {
        return { outcome: "unavailable" };
      }

      const updatedAt = parseUtcTimestamp(
        input.source.updatedAt,
      );
      const now = input.now.getTime();

      if (
        updatedAt === null ||
        updatedAt > now
      ) {
        return { outcome: "unavailable" };
      }

      return now - updatedAt >=
        minimumAgeSeconds * 1_000
        ? { outcome: "retry-allowed" }
        : { outcome: "retry-later" };
    },
  };
}

export const unavailableKnowledgeScanRecoveryPolicy:
KnowledgeScanRecoveryPolicy = {
  async evaluate() {
    return { outcome: "unavailable" };
  },
};
