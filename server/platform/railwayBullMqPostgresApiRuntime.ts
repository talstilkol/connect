import {
  createRailwayBullMqMetaWebhookPublisherRuntime,
  type RailwayBullMqMetaWebhookPublisherRuntime,
  type RailwayBullMqMetaWebhookQueueTelemetry,
} from "./railwayBullMqMetaWebhookQueue.ts";
import {
  createRailwayBullMqTeamInvitationPublisherRuntime,
  type RailwayBullMqTeamInvitationPublisherRuntime,
  type RailwayBullMqTeamInvitationQueueTelemetry,
} from "./railwayBullMqTeamInvitationQueue.ts";
import type {
  RailwayBullMqEnvironment,
} from "./railwayBullMqConfiguration.ts";
import {
  createRailwayPostgresApiRuntime,
  type RailwayPostgresApiRuntime,
  type RailwayPostgresApiRuntimeOptions,
} from "./railwayPostgresApiRuntime.ts";
import type {
  RailwayMetaWebhookRuntimeEnvironment,
} from "./railwayMetaWebhookRuntime.ts";

export interface RailwayBullMqPostgresApiRuntimeOptions
  extends Omit<
    RailwayPostgresApiRuntimeOptions,
    "metaWebhook" | "teamInvitationPublisher"
  > {
  readonly bullMqEnvironment?: RailwayBullMqEnvironment;
  readonly metaWebhookEnvironment: RailwayMetaWebhookRuntimeEnvironment;
  readonly metaWebhookQueueTelemetry: Pick<
    RailwayBullMqMetaWebhookQueueTelemetry,
    "recordConnectionFailure" | "recordPublisherFailure"
  >;
  readonly teamInvitationQueueTelemetry: Pick<
    RailwayBullMqTeamInvitationQueueTelemetry,
    "recordConnectionFailure" | "recordPublisherFailure"
  >;
}

interface RailwayBullMqPostgresApiRuntimeDependencies {
  readonly createMetaWebhookPublisherRuntime:
    typeof createRailwayBullMqMetaWebhookPublisherRuntime;
  readonly createTeamInvitationPublisherRuntime:
    typeof createRailwayBullMqTeamInvitationPublisherRuntime;
  readonly createApiRuntime: typeof createRailwayPostgresApiRuntime;
}

const defaultDependencies = Object.freeze({
  createMetaWebhookPublisherRuntime:
    createRailwayBullMqMetaWebhookPublisherRuntime,
  createTeamInvitationPublisherRuntime:
    createRailwayBullMqTeamInvitationPublisherRuntime,
  createApiRuntime: createRailwayPostgresApiRuntime,
});

const providerOptionKeys = Object.freeze([
  "bullMqEnvironment",
  "metaWebhookEnvironment",
  "metaWebhookQueueTelemetry",
  "teamInvitationQueueTelemetry",
]);

const apiOptionKeys = Object.freeze([
  "botReplyStagingReleaseEvidence",
  "campaignDeliveryConfigured",
  "identityDependencies",
  "identityEnvironment",
  "maximumBodyBytes",
  "maximumResponseBytes",
  "messageTemplateSubmissionEnvironment",
  "mutationRateLimitEnvironment",
  "postgresEnvironment",
  "postgresTelemetry",
  "requestTelemetry",
  "systemAdminEnvironment",
  "teamInvitationAcceptanceIdentityResolver",
  "teamInvitationPolicyEnvironment",
]);

export type RailwayBullMqPostgresApiRuntimeErrorCode =
  | "options-invalid"
  | "dependencies-invalid"
  | "startup-failed"
  | "shutdown-failed";

export class RailwayBullMqPostgresApiRuntimeError extends Error {
  readonly code: RailwayBullMqPostgresApiRuntimeErrorCode;

  constructor(code: RailwayBullMqPostgresApiRuntimeErrorCode) {
    super(`Railway BullMQ PostgreSQL API runtime failed: ${code}`);
    this.name = "RailwayBullMqPostgresApiRuntimeError";
    this.code = code;
  }
}

function requireOptions(
  options: Readonly<RailwayBullMqPostgresApiRuntimeOptions>,
  dependencies: Readonly<RailwayBullMqPostgresApiRuntimeDependencies>,
): void {
  const telemetry = options?.metaWebhookQueueTelemetry;
  const teamInvitationTelemetry = options?.teamInvitationQueueTelemetry;
  if (
    !options || typeof options !== "object" ||
    Object.keys(options).some(
      (key) =>
        !providerOptionKeys.includes(key) &&
        !apiOptionKeys.includes(key),
    ) ||
    !options.metaWebhookEnvironment ||
    typeof options.metaWebhookEnvironment !== "object" ||
    !telemetry || typeof telemetry !== "object" ||
    Object.keys(telemetry).sort().join(",") !==
      "recordConnectionFailure,recordPublisherFailure" ||
    typeof telemetry.recordConnectionFailure !== "function" ||
    typeof telemetry.recordPublisherFailure !== "function" ||
    !teamInvitationTelemetry ||
    typeof teamInvitationTelemetry !== "object" ||
    Object.keys(teamInvitationTelemetry).sort().join(",") !==
      "recordConnectionFailure,recordPublisherFailure" ||
    typeof teamInvitationTelemetry.recordConnectionFailure !== "function" ||
    typeof teamInvitationTelemetry.recordPublisherFailure !== "function"
  ) {
    throw new RailwayBullMqPostgresApiRuntimeError("options-invalid");
  }

  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "createApiRuntime,createMetaWebhookPublisherRuntime,createTeamInvitationPublisherRuntime" ||
    typeof dependencies.createApiRuntime !== "function" ||
    typeof dependencies.createMetaWebhookPublisherRuntime !== "function" ||
    typeof dependencies.createTeamInvitationPublisherRuntime !== "function"
  ) {
    throw new RailwayBullMqPostgresApiRuntimeError("dependencies-invalid");
  }
}

async function closeOwnedResources(
  metaWebhookPublisherRuntime:
    Readonly<RailwayBullMqMetaWebhookPublisherRuntime>,
  teamInvitationPublisherRuntime:
    Readonly<RailwayBullMqTeamInvitationPublisherRuntime>,
  apiRuntime: Readonly<RailwayPostgresApiRuntime> | null,
): Promise<void> {
  const results = await Promise.allSettled([
    metaWebhookPublisherRuntime.close(),
    teamInvitationPublisherRuntime.close(),
    ...(apiRuntime === null ? [] : [apiRuntime.close()]),
  ]);
  if (results.some((result) => result.status === "rejected")) {
    throw new RailwayBullMqPostgresApiRuntimeError("shutdown-failed");
  }
}

/**
 * Provider-bound API composition. Redis is proven ready before the HTTP
 * runtime is returned, so Meta never receives a success response from an API
 * process whose webhook publisher is unavailable.
 */
export async function createRailwayBullMqPostgresApiRuntime(
  options: Readonly<RailwayBullMqPostgresApiRuntimeOptions>,
  dependencies: Readonly<RailwayBullMqPostgresApiRuntimeDependencies> =
    defaultDependencies,
): Promise<Readonly<RailwayPostgresApiRuntime>> {
  requireOptions(options, dependencies);
  const {
    bullMqEnvironment,
    metaWebhookEnvironment,
    metaWebhookQueueTelemetry,
    teamInvitationQueueTelemetry,
    ...apiOptions
  } = options;
  const metaWebhookPublisherRuntime =
    dependencies.createMetaWebhookPublisherRuntime({
      environment: bullMqEnvironment,
      telemetry: metaWebhookQueueTelemetry,
    });
  const teamInvitationPublisherRuntime =
    dependencies.createTeamInvitationPublisherRuntime({
      environment: bullMqEnvironment,
      telemetry: teamInvitationQueueTelemetry,
    });
  let apiRuntime: Readonly<RailwayPostgresApiRuntime> | null = null;

  try {
    await Promise.all([
      metaWebhookPublisherRuntime.start(),
      teamInvitationPublisherRuntime.start(),
    ]);
    apiRuntime = await dependencies.createApiRuntime({
      ...apiOptions,
      metaWebhook: {
        environment: metaWebhookEnvironment,
        queue: metaWebhookPublisherRuntime.queue,
      },
      teamInvitationPublisher: teamInvitationPublisherRuntime.publisher,
    });
  } catch {
    try {
      await closeOwnedResources(
        metaWebhookPublisherRuntime,
        teamInvitationPublisherRuntime,
        apiRuntime,
      );
    } catch {
      // Startup remains one bounded failure after cleanup is attempted.
    }
    throw new RailwayBullMqPostgresApiRuntimeError("startup-failed");
  }

  const ownedApiRuntime = apiRuntime;
  let closed = false;
  let closing: Promise<void> | null = null;
  return Object.freeze({
    handler: ownedApiRuntime.handler,
    metaWebhookHandler: ownedApiRuntime.metaWebhookHandler,
    readiness: ownedApiRuntime.readiness,
    async close() {
      if (closed) {
        return;
      }
      if (closing === null) {
        closing = (async () => {
          try {
            await closeOwnedResources(
              metaWebhookPublisherRuntime,
              teamInvitationPublisherRuntime,
              ownedApiRuntime,
            );
          } finally {
            closed = true;
          }
        })();
      }
      return closing;
    },
  });
}
