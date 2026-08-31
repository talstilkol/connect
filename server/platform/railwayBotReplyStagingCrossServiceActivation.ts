import {
  inspectRailwayBotReplyStagingActivation,
  type RailwayBotReplyStagingActivationClock,
  type RailwayBotReplyStagingActivationEnvironment,
  type RailwayBotReplyStagingActivationReport,
} from "./railwayBotReplyStagingActivationPreflight.ts";
import {
  inspectRailwayBotReplyStagingApiConfiguration,
  type RailwayBotReplyStagingApiConfigurationState,
  type RailwayBotReplyStagingApiEnvironment,
} from "./railwayBotReplyStagingApiConfiguration.ts";

export const railwayBotReplyStagingCrossServiceActivationVersion =
  "connect-railway-bot-reply-staging-cross-service-activation-v1" as const;

export type RailwayBotReplyStagingCrossServiceCheckId =
  | "api-configuration"
  | "worker-activation"
  | "runtime-environment-alignment"
  | "tenant-alignment";

export interface RailwayBotReplyStagingCrossServiceInput {
  readonly apiEnvironment: Readonly<RailwayBotReplyStagingApiEnvironment>;
  readonly workerEnvironment:
    Readonly<RailwayBotReplyStagingActivationEnvironment>;
}

export type RailwayBotReplyStagingCrossServiceReport = Readonly<{
  schemaVersion: 1;
  activationVersion:
    typeof railwayBotReplyStagingCrossServiceActivationVersion;
  status: "ready" | "disabled" | "blocked";
  code:
    | "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED"
    | "BOT_REPLY_STAGING_CROSS_SERVICE_DISABLED"
    | "BOT_REPLY_STAGING_CROSS_SERVICE_REQUIRED";
  passedCheckCount: number;
  requiredCheckCount: 4;
  checks: readonly Readonly<{
    id: RailwayBotReplyStagingCrossServiceCheckId;
    status: "passed" | "blocked";
  }>[];
}>;

interface RailwayBotReplyStagingCrossServiceDependencies {
  readonly inspectApiConfiguration:
    typeof inspectRailwayBotReplyStagingApiConfiguration;
  readonly inspectWorkerActivation:
    typeof inspectRailwayBotReplyStagingActivation;
}

const defaultDependencies = Object.freeze({
  inspectApiConfiguration:
    inspectRailwayBotReplyStagingApiConfiguration,
  inspectWorkerActivation:
    inspectRailwayBotReplyStagingActivation,
});
export const railwayBotReplyStagingCrossServiceCheckIds = Object.freeze([
  "api-configuration",
  "worker-activation",
  "runtime-environment-alignment",
  "tenant-alignment",
] as const satisfies readonly RailwayBotReplyStagingCrossServiceCheckId[]);
const inputKeys = Object.freeze(["apiEnvironment", "workerEnvironment"]);

function requireDependencies(
  dependencies: Readonly<
    RailwayBotReplyStagingCrossServiceDependencies
  >,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "inspectApiConfiguration,inspectWorkerActivation" ||
    typeof dependencies.inspectApiConfiguration !== "function" ||
    typeof dependencies.inspectWorkerActivation !== "function"
  ) {
    throw new Error(
      "Railway Bot reply staging cross-service dependencies are invalid",
    );
  }
}

function report(
  status: RailwayBotReplyStagingCrossServiceReport["status"],
  code: RailwayBotReplyStagingCrossServiceReport["code"],
  checks: RailwayBotReplyStagingCrossServiceReport["checks"],
): RailwayBotReplyStagingCrossServiceReport {
  return Object.freeze({
    schemaVersion: 1 as const,
    activationVersion:
      railwayBotReplyStagingCrossServiceActivationVersion,
    status,
    code,
    passedCheckCount: checks.filter((check) => check.status === "passed")
      .length,
    requiredCheckCount: 4 as const,
    checks: Object.freeze(checks),
  });
}

function blockedReport(): RailwayBotReplyStagingCrossServiceReport {
  return report(
    "blocked",
    "BOT_REPLY_STAGING_CROSS_SERVICE_REQUIRED",
    railwayBotReplyStagingCrossServiceCheckIds.map((id) =>
      Object.freeze({ id, status: "blocked" as const })
    ),
  );
}

function parseTenantId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,9}$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 2_147_483_647
    ? parsed
    : null;
}

function checked(
  id: RailwayBotReplyStagingCrossServiceCheckId,
  passed: boolean,
) {
  return Object.freeze({
    id,
    status: passed ? "passed" as const : "blocked" as const,
  });
}

export function inspectRailwayBotReplyStagingCrossServiceActivation(
  input: Readonly<RailwayBotReplyStagingCrossServiceInput>,
  clock?: Readonly<RailwayBotReplyStagingActivationClock>,
  dependencies: Readonly<
    RailwayBotReplyStagingCrossServiceDependencies
  > = defaultDependencies,
): RailwayBotReplyStagingCrossServiceReport {
  requireDependencies(dependencies);
  if (
    !input || typeof input !== "object" ||
    Object.keys(input).sort().join(",") !== [...inputKeys].sort().join(",") ||
    !input.apiEnvironment || typeof input.apiEnvironment !== "object" ||
    !input.workerEnvironment || typeof input.workerEnvironment !== "object"
  ) {
    return blockedReport();
  }

  let api: RailwayBotReplyStagingApiConfigurationState;
  let worker: RailwayBotReplyStagingActivationReport;
  try {
    api = dependencies.inspectApiConfiguration(input.apiEnvironment);
    worker = dependencies.inspectWorkerActivation(
      input.workerEnvironment,
      clock,
    );
  } catch {
    return blockedReport();
  }

  if (api.status === "disabled" && worker.status === "disabled") {
    return report(
      "disabled",
      "BOT_REPLY_STAGING_CROSS_SERVICE_DISABLED",
      Object.freeze([]),
    );
  }

  const workerTenantId = parseTenantId(
    input.workerEnvironment.BOT_REPLY_STAGING_TENANT_ID,
  );
  const checks = Object.freeze([
    checked("api-configuration", api.status === "configured"),
    checked("worker-activation", false),
    checked(
      "runtime-environment-alignment",
      input.apiEnvironment.APP_RUNTIME_ENVIRONMENT === "staging" &&
        input.workerEnvironment.APP_RUNTIME_ENVIRONMENT === "staging",
    ),
    checked(
      "tenant-alignment",
      api.status === "configured" && workerTenantId !== null &&
        api.configuration.stagingTenantId === workerTenantId,
    ),
  ]);
  const ready = checks.every((check) => check.status === "passed");
  return report(
    ready ? "ready" : "blocked",
    ready
      ? "BOT_REPLY_STAGING_CROSS_SERVICE_VERIFIED"
      : "BOT_REPLY_STAGING_CROSS_SERVICE_REQUIRED",
    checks,
  );
}
