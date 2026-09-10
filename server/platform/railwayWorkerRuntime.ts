import type {
  CampaignDispatchRepository,
} from "../../db/campaignDispatchRepository.ts";
import type {
  TeamInvitationExpirationRepository,
} from "../../db/teamInvitationExpirationRepository.ts";
import type {
  TeamInvitationRepository,
} from "../../db/teamInvitationRepository.ts";
import {
  createCampaignScheduler,
  type CampaignDeliveryQueueBinding,
} from "../campaigns/campaignScheduler.ts";
import {
  createTeamInvitationExpirationScheduler,
} from "../team/teamInvitationExpirationScheduler.ts";
import {
  createRailwayWorkerScheduler,
  type RailwayWorkerSchedulerClock,
} from "./railwayWorkerScheduler.ts";
import type {
  RailwayWorkerScheduledTask,
} from "./railwayWorkerScheduler.ts";
import type {
  RailwayWorkerSchedulerRuntime,
} from "./railwayWorkerSchedulerService.ts";
import type {
  WorkerSchedulerLeaseRepository,
} from "../../shared/domain/workerScheduler.ts";

export interface RailwayWorkerRuntimeOptions {
  readonly ownerKey: string;
  readonly leases: WorkerSchedulerLeaseRepository;
  readonly campaignDispatch: CampaignDispatchRepository;
  readonly campaignQueue: CampaignDeliveryQueueBinding;
  readonly campaignDeliveryMaintenance?: RailwayWorkerScheduledTask;
  readonly invitationExpirations: TeamInvitationExpirationRepository;
  readonly invitations: TeamInvitationRepository;
  readonly botReplyDeliveries?: RailwayWorkerScheduledTask;
  readonly messageTemplateSubmissions?: RailwayWorkerScheduledTask;
  readonly clock: RailwayWorkerSchedulerClock;
  readonly close: () => Promise<void>;
}

const optionKeys = Object.freeze([
  "botReplyDeliveries",
  "campaignDeliveryMaintenance",
  "campaignDispatch",
  "campaignQueue",
  "clock",
  "close",
  "invitationExpirations",
  "invitations",
  "leases",
  "messageTemplateSubmissions",
  "ownerKey",
]);

const requiredOptionKeys = Object.freeze([
  "campaignDispatch",
  "campaignQueue",
  "clock",
  "close",
  "invitationExpirations",
  "invitations",
  "leases",
  "ownerKey",
]);

function requireOptions(options: Readonly<RailwayWorkerRuntimeOptions>): void {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).some((key) => !optionKeys.includes(key)) ||
    requiredOptionKeys.some(
      (key) => !Object.prototype.hasOwnProperty.call(options, key),
    ) ||
    typeof options.campaignDispatch?.completeSettledCampaigns !== "function" ||
    typeof options.campaignDispatch?.promoteDueCampaigns !== "function" ||
    typeof options.campaignDispatch?.claimPendingRecipients !== "function" ||
    typeof options.campaignDispatch?.releaseQueuedRecipients !== "function" ||
    typeof options.campaignQueue?.sendBatch !== "function" ||
    (options.campaignDeliveryMaintenance !== undefined &&
      typeof options.campaignDeliveryMaintenance?.run !== "function") ||
    typeof options.invitationExpirations?.listDuePage !== "function" ||
    typeof options.invitations?.transition !== "function" ||
    (options.botReplyDeliveries !== undefined &&
      typeof options.botReplyDeliveries?.run !== "function") ||
    (options.messageTemplateSubmissions !== undefined &&
      typeof options.messageTemplateSubmissions?.run !== "function") ||
    typeof options.leases?.claimNext !== "function" ||
    typeof options.leases?.complete !== "function" ||
    typeof options.clock?.now !== "function" ||
    typeof options.close !== "function"
  ) {
    throw new Error("Railway worker runtime options are invalid");
  }
}

export function createRailwayWorkerRuntime(
  options: Readonly<RailwayWorkerRuntimeOptions>,
): Readonly<RailwayWorkerSchedulerRuntime> {
  requireOptions(options);
  const campaignScheduler = createCampaignScheduler(
    options.campaignDispatch,
    options.campaignQueue,
    options.clock,
  );
  const campaigns = options.campaignDeliveryMaintenance === undefined
    ? campaignScheduler
    : Object.freeze({
        async run() {
          const results = await Promise.allSettled([
            campaignScheduler.run(),
            options.campaignDeliveryMaintenance!.run(),
          ]);
          if (results.some((result) => result.status === "rejected")) {
            throw new Error("Railway campaign delivery maintenance failed");
          }
          return results[0].status === "fulfilled"
            ? results[0].value
            : undefined;
        },
      });
  const invitationExpirations = createTeamInvitationExpirationScheduler(
    options.invitationExpirations,
    options.invitations,
    options.clock,
  );
  const scheduler = createRailwayWorkerScheduler({
    ownerKey: options.ownerKey,
    leases: options.leases,
    campaigns,
    invitationExpirations,
    botReplyDeliveries: options.botReplyDeliveries,
    messageTemplateSubmissions: options.messageTemplateSubmissions,
    clock: options.clock,
  });
  let closed = false;
  let closing: Promise<void> | null = null;

  return Object.freeze({
    scheduler,
    async close() {
      if (closed && closing === null) {
        return;
      }

      if (closing === null) {
        closing = (async () => {
          try {
            await options.close();
          } finally {
            closed = true;
          }
        })();
      }

      await closing;
    },
  });
}
