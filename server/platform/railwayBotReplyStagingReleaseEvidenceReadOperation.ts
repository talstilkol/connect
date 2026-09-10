import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import {
  inspectRailwayBotReplyStagingCrossServiceEvidence,
} from "./railwayBotReplyStagingCrossServiceEvidence.ts";
import type {
  PostgresBotReplyStagingReleaseEvidenceRepository,
} from "./postgresBotReplyStagingReleaseEvidenceRepository.ts";

export const RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_OPERATION =
  "runtime.bot-reply-release-evidence.read" as const;

export const railwayBotReplyStagingReleaseEvidenceReadOperationPolicy =
  Object.freeze({
    id: RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_OPERATION,
    requestKind: "query" as const,
    authorization: "authenticated-vercel-and-user-session" as const,
    mutationSafety: null,
  });

export interface RailwayBotReplyStagingReleaseEvidenceReadDependencies {
  readonly repository: Pick<
    PostgresBotReplyStagingReleaseEvidenceRepository,
    "clock" | "readCurrentEvidenceState"
  >;
}

export interface RailwayBotReplyStagingReleaseEvidenceReadResult {
  readonly schemaVersion: 1;
  readonly storageMode: "postgresql";
  readonly evidenceVersion: number;
  readonly evidenceDigest: string;
  readonly evidenceJson: string;
}

function dependencyUnavailable(): never {
  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

function requireDependencies(
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceReadDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "repository" ||
    !dependencies.repository ||
    typeof dependencies.repository !== "object" ||
    typeof dependencies.repository.readCurrentEvidenceState !== "function" ||
    typeof dependencies.repository.clock?.now !== "function"
  ) {
    throw new Error(
      "Railway release evidence read dependencies are invalid",
    );
  }
}

function requireEmptyQuery(
  payload: Readonly<RailwayApiJsonObject>,
  request: Readonly<RailwayApiRequestEnvelope>,
): void {
  if (
    Object.keys(payload).length !== 0 ||
    request.operation !==
      RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_OPERATION ||
    request.requestKind !== "query" ||
    request.idempotencyKey !== null
  ) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }
}

export function createRailwayBotReplyStagingReleaseEvidenceReadOperation(
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceReadDependencies
  >,
): Readonly<RailwayApiOperation> {
  requireDependencies(dependencies);

  return Object.freeze({
    id: RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_OPERATION,
    requestKind: "query" as const,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ): Promise<
      Readonly<RailwayBotReplyStagingReleaseEvidenceReadResult>
    > {
      void context;
      requireEmptyQuery(payload, request);

      try {
        const state =
          await dependencies.repository.readCurrentEvidenceState();
        if (
          !Number.isSafeInteger(state.version) ||
          state.version < 1 ||
          state.evidenceDigest === null ||
          state.evidenceJson === null
        ) {
          dependencyUnavailable();
        }

        const now = dependencies.repository.clock.now();
        if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
          dependencyUnavailable();
        }
        const report = inspectRailwayBotReplyStagingCrossServiceEvidence(
          {
            APP_RELEASE_ID: state.release.releaseId,
            APP_DEPLOYED_COMMIT_SHA: state.release.commitSha,
            APP_DEPLOYMENT_ARTIFACT_DIGEST:
              state.release.artifactDigest,
            BOT_REPLY_STAGING_CROSS_SERVICE_EVIDENCE_JSON:
              state.evidenceJson,
          },
          now,
        );
        if (report.status !== "configured") {
          dependencyUnavailable();
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(state.evidenceJson);
        } catch {
          dependencyUnavailable();
        }
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed) ||
          !("evidenceDigest" in parsed) ||
          parsed.evidenceDigest !== state.evidenceDigest
        ) {
          dependencyUnavailable();
        }

        return Object.freeze({
          schemaVersion: 1 as const,
          storageMode: "postgresql" as const,
          evidenceVersion: state.version,
          evidenceDigest: state.evidenceDigest,
          evidenceJson: state.evidenceJson,
        });
      } catch (error) {
        if (error instanceof RailwayApiDispatchError) {
          throw error;
        }
        dependencyUnavailable();
      }
    },
  });
}
