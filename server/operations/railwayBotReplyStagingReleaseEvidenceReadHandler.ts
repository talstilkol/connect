import type {
  RailwayApiClient,
} from "../platform/railwayApiClient.ts";
import type {
  RailwayApiClientConfigurationState,
} from "../platform/railwayApiClientConfiguration.ts";
import {
  RAILWAY_API_CONTRACT_VERSION,
} from "../platform/railwayApiContract.ts";
import type {
  RailwayApiServerIdentityState,
} from "../platform/railwayApiServerIdentity.ts";
import {
  RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_OPERATION,
} from "../platform/railwayBotReplyStagingReleaseEvidenceReadOperation.ts";

const maximumEvidenceBytes = 8_192;
const evidenceDigestPattern =
  /^bot_reply_staging_cross_service_evidence_v1_[a-f0-9]{64}$/;
const resultKeys = Object.freeze([
  "evidenceDigest",
  "evidenceJson",
  "evidenceVersion",
  "schemaVersion",
  "storageMode",
]);

export type RailwayBotReplyStagingReleaseEvidenceReadState = Readonly<
  | {
      status: "ready";
      evidenceJson: string;
      evidenceDigest: string;
      evidenceVersion: number;
    }
  | {
      status: "unavailable";
      evidenceJson: null;
      evidenceDigest: null;
      evidenceVersion: null;
    }
>;

export interface RailwayBotReplyStagingReleaseEvidenceReadHandlerDependencies {
  readonly applicationConfigured: () => boolean;
  readonly inspectConfiguration: () => RailwayApiClientConfigurationState;
  readonly resolveIdentity: () => Promise<RailwayApiServerIdentityState>;
  readonly createClient: (
    configuration: Readonly<{
      apiOrigin: string;
      deploymentEnvironment: "development" | "preview" | "production";
      oidcToken: string;
      userSessionToken: string;
    }>,
  ) => RailwayApiClient;
}

const unavailable = Object.freeze({
  status: "unavailable" as const,
  evidenceJson: null,
  evidenceDigest: null,
  evidenceVersion: null,
});

function requireDependencies(
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceReadHandlerDependencies
  >,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "applicationConfigured,createClient,inspectConfiguration,resolveIdentity" ||
    typeof dependencies.applicationConfigured !== "function" ||
    typeof dependencies.inspectConfiguration !== "function" ||
    typeof dependencies.resolveIdentity !== "function" ||
    typeof dependencies.createClient !== "function"
  ) {
    throw new Error(
      "Railway release evidence read handler dependencies are invalid",
    );
  }
}

function exactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  return actual.length === expectedKeys.length &&
    actual.every((key, index) => key === expectedKeys[index]);
}

function parseResult(
  value: unknown,
): RailwayBotReplyStagingReleaseEvidenceReadState {
  if (
    !exactRecord(value, resultKeys) ||
    value.schemaVersion !== 1 ||
    value.storageMode !== "postgresql" ||
    !Number.isSafeInteger(value.evidenceVersion) ||
    Number(value.evidenceVersion) < 1 ||
    Number(value.evidenceVersion) > 2_147_483_647 ||
    typeof value.evidenceDigest !== "string" ||
    !evidenceDigestPattern.test(value.evidenceDigest) ||
    typeof value.evidenceJson !== "string" ||
    Buffer.byteLength(value.evidenceJson, "utf8") > maximumEvidenceBytes
  ) {
    return unavailable;
  }

  let evidence: unknown;
  try {
    evidence = JSON.parse(value.evidenceJson);
  } catch {
    return unavailable;
  }
  if (
    typeof evidence !== "object" ||
    evidence === null ||
    Array.isArray(evidence) ||
    !("evidenceDigest" in evidence) ||
    evidence.evidenceDigest !== value.evidenceDigest
  ) {
    return unavailable;
  }

  return Object.freeze({
    status: "ready" as const,
    evidenceJson: value.evidenceJson,
    evidenceDigest: value.evidenceDigest,
    evidenceVersion: Number(value.evidenceVersion),
  });
}

export function createRailwayBotReplyStagingReleaseEvidenceReadHandler(
  dependencies: Readonly<
    RailwayBotReplyStagingReleaseEvidenceReadHandlerDependencies
  >,
) {
  requireDependencies(dependencies);

  return Object.freeze({
    async read(): Promise<
      RailwayBotReplyStagingReleaseEvidenceReadState
    > {
      if (!dependencies.applicationConfigured()) {
        return unavailable;
      }
      const configuration = dependencies.inspectConfiguration();
      if (configuration.status !== "configured") {
        return unavailable;
      }

      let identity: RailwayApiServerIdentityState;
      try {
        identity = await dependencies.resolveIdentity();
      } catch {
        return unavailable;
      }
      if (identity.status !== "authenticated") {
        return unavailable;
      }

      try {
        const client = dependencies.createClient({
          ...configuration.configuration,
          oidcToken: identity.oidcToken,
          userSessionToken: identity.userSessionToken,
        });
        const response = await client.call(Object.freeze({
          contractVersion: RAILWAY_API_CONTRACT_VERSION,
          operation:
            RAILWAY_BOT_REPLY_STAGING_RELEASE_EVIDENCE_READ_OPERATION,
          requestKind: "query" as const,
          idempotencyKey: null,
          payload: Object.freeze({}),
        }));
        return response.outcome === "ok"
          ? parseResult(response.data)
          : unavailable;
      } catch {
        return unavailable;
      }
    },
  });
}
