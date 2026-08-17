import type {
  CampaignDeliveryQueueBinding,
} from "../campaigns/campaignScheduler.ts";
import {
  workerSchedulerOwnerKeyPattern,
} from "../../shared/domain/workerScheduler.ts";
import type {
  NodePostgresPoolEnvironment,
  NodePostgresPoolTelemetry,
} from "./nodePostgresPoolConfiguration.ts";
import {
  createRailwayPostgresFoundation,
} from "./railwayPostgresFoundation.ts";
import {
  createRailwayWorkerRuntime,
} from "./railwayWorkerRuntime.ts";
import {
  createRailwayWorkerSchedulerService,
  type RailwayWorkerSchedulerService,
  type RailwayWorkerSchedulerServiceClock,
  type RailwayWorkerSchedulerServiceTelemetry,
} from "./railwayWorkerSchedulerService.ts";

export interface RailwayPostgresWorkerServiceOptions {
  readonly environment?: NodePostgresPoolEnvironment;
  readonly ownerKey: string;
  readonly campaignQueue: CampaignDeliveryQueueBinding;
  readonly postgresTelemetry: NodePostgresPoolTelemetry;
  readonly schedulerTelemetry: RailwayWorkerSchedulerServiceTelemetry;
  readonly clock?: RailwayWorkerSchedulerServiceClock;
}

const optionKeys = Object.freeze([
  "campaignQueue",
  "clock",
  "environment",
  "ownerKey",
  "postgresTelemetry",
  "schedulerTelemetry",
]);

const systemClock = Object.freeze({
  now() {
    return new Date();
  },
});

function requireOptions(
  options: Readonly<RailwayPostgresWorkerServiceOptions>,
): RailwayWorkerSchedulerServiceClock {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    typeof options.ownerKey !== "string" ||
    !workerSchedulerOwnerKeyPattern.test(options.ownerKey) ||
    typeof options.campaignQueue?.sendBatch !== "function" ||
    typeof options.postgresTelemetry?.recordIdleClientError !== "function" ||
    typeof options.schedulerTelemetry?.recordRunFailure !== "function" ||
    typeof options.schedulerTelemetry?.recordTimerFailure !== "function" ||
    typeof options.schedulerTelemetry?.recordOverlapSuppressed !== "function"
  ) {
    throw new Error("Railway PostgreSQL worker service options are invalid");
  }

  const clock = options.clock ?? systemClock;
  if (typeof clock.now !== "function") {
    throw new Error("Railway PostgreSQL worker service options are invalid");
  }

  return clock;
}

export async function createRailwayPostgresWorkerService(
  options: Readonly<RailwayPostgresWorkerServiceOptions>,
): Promise<Readonly<RailwayWorkerSchedulerService>> {
  const clock = requireOptions(options);
  const foundation = createRailwayPostgresFoundation(
    options.environment === undefined
      ? { telemetry: options.postgresTelemetry }
      : {
          environment: options.environment,
          telemetry: options.postgresTelemetry,
        },
  );

  try {
    const runtime = createRailwayWorkerRuntime({
      ownerKey: options.ownerKey,
      leases: foundation.workerSchedulerLeases,
      campaignDispatch: foundation.campaignDispatch,
      campaignQueue: options.campaignQueue,
      invitationExpirations: foundation.invitationExpirations,
      invitations: foundation.invitations,
      clock,
      close: foundation.close,
    });

    return createRailwayWorkerSchedulerService({
      runtime,
      telemetry: options.schedulerTelemetry,
      clock,
    });
  } catch (error) {
    await foundation.close();
    throw error;
  }
}
