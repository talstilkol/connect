import {
  createHash,
} from "node:crypto";

import type {
  WhatsappCampaignDeliveryPolicyRepository,
} from "../../db/whatsappCampaignDeliveryPolicyRepository.ts";
import type {
  WhatsappCampaignDeliveryPolicyRecord,
} from "../../shared/domain/whatsappCampaignDeliveryPolicy.ts";
import {
  requireWhatsappDeliveryPolicyPositiveInteger,
  requireWhatsappDeliveryPolicyVersion,
  requireWhatsappProviderIdentifier,
} from "../campaigns/whatsappCampaignDeliveryPolicyValidation.ts";
import type {
  BotReplyStagingProviderKillSwitch,
  BotReplyStagingProviderKillSwitchRequest,
  BotReplyStagingProviderKillSwitchResult,
} from "../operations/botReplyStagingProviderDriver.ts";

const adapterVersion =
  "connect-railway-bot-reply-staging-kill-switch-v1";
const operationKeyPattern =
  /^bot_reply_staging_step_v1_[a-f0-9]{64}$/;
const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;

export interface RailwayBotReplyStagingKillSwitchClock {
  now(): Date;
}

export interface RailwayBotReplyStagingKillSwitchOptions {
  readonly policies: Pick<
    WhatsappCampaignDeliveryPolicyRepository,
    "findLatestPolicyEvent" | "recordPolicyEvent"
  >;
  readonly clock: RailwayBotReplyStagingKillSwitchClock;
}

export type RailwayBotReplyStagingKillSwitchErrorCode =
  | "BOT_REPLY_STAGING_KILL_SWITCH_CONFIGURATION_INVALID"
  | "BOT_REPLY_STAGING_KILL_SWITCH_REQUEST_INVALID"
  | "BOT_REPLY_STAGING_KILL_SWITCH_POLICY_INVALID"
  | "BOT_REPLY_STAGING_KILL_SWITCH_WRITE_FAILED";

export class RailwayBotReplyStagingKillSwitchError extends Error {
  readonly code: RailwayBotReplyStagingKillSwitchErrorCode;

  constructor(code: RailwayBotReplyStagingKillSwitchErrorCode) {
    super(code);
    this.name = "RailwayBotReplyStagingKillSwitchError";
    this.code = code;
  }
}

function fail(code: RailwayBotReplyStagingKillSwitchErrorCode): never {
  throw new RailwayBotReplyStagingKillSwitchError(code);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function requireOptions(
  options: Readonly<RailwayBotReplyStagingKillSwitchOptions>,
): void {
  if (
    !options || typeof options !== "object" ||
    !hasExactKeys(options, ["clock", "policies"]) ||
    typeof options.policies?.findLatestPolicyEvent !== "function" ||
    typeof options.policies?.recordPolicyEvent !== "function" ||
    typeof options.clock?.now !== "function"
  ) {
    fail("BOT_REPLY_STAGING_KILL_SWITCH_CONFIGURATION_INVALID");
  }
}

function requireNow(
  clock: Readonly<RailwayBotReplyStagingKillSwitchClock>,
): string {
  let now: Date;
  try {
    now = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_KILL_SWITCH_CONFIGURATION_INVALID");
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    fail("BOT_REPLY_STAGING_KILL_SWITCH_CONFIGURATION_INVALID");
  }
  return now.toISOString();
}

interface NormalizedRequest {
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly targetTenantId: number;
  readonly expectedConnectionVersion: number;
  readonly expectedPolicyVersion: number;
  readonly actorExternalUserId: string;
}

function requireRequest(
  request: Readonly<BotReplyStagingProviderKillSwitchRequest>,
): NormalizedRequest {
  try {
    if (
      !request || typeof request !== "object" ||
      !hasExactKeys(request, [
        "actorExternalUserId",
        "deliveryKey",
        "expectedConnectionVersion",
        "expectedPolicyVersion",
        "operationKey",
        "targetTenantId",
      ]) ||
      typeof request.operationKey !== "string" ||
      !operationKeyPattern.test(request.operationKey) ||
      typeof request.deliveryKey !== "string" ||
      !deliveryKeyPattern.test(request.deliveryKey)
    ) {
      fail("BOT_REPLY_STAGING_KILL_SWITCH_REQUEST_INVALID");
    }
    return Object.freeze({
      operationKey: request.operationKey,
      deliveryKey: request.deliveryKey,
      targetTenantId: requireWhatsappDeliveryPolicyPositiveInteger(
        request.targetTenantId,
        "tenant",
      ),
      expectedConnectionVersion:
        requireWhatsappDeliveryPolicyPositiveInteger(
          request.expectedConnectionVersion,
          "connection version",
        ),
      expectedPolicyVersion: requireWhatsappDeliveryPolicyVersion(
        request.expectedPolicyVersion,
      ),
      actorExternalUserId: requireWhatsappProviderIdentifier(
        request.actorExternalUserId,
        "actor",
      ),
    });
  } catch (error) {
    if (error instanceof RailwayBotReplyStagingKillSwitchError) throw error;
    fail("BOT_REPLY_STAGING_KILL_SWITCH_REQUEST_INVALID");
  }
}

function sameSnapshot(
  left: Readonly<WhatsappCampaignDeliveryPolicyRecord>,
  right: Readonly<WhatsappCampaignDeliveryPolicyRecord>,
): boolean {
  return left.connectionVersion === right.connectionVersion &&
    JSON.stringify(left.portfolioCapacity) ===
      JSON.stringify(right.portfolioCapacity) &&
    JSON.stringify(left.phoneThroughput) ===
      JSON.stringify(right.phoneThroughput) &&
    left.reservationDurationSeconds === right.reservationDurationSeconds &&
    left.metaGraphApiVersion === right.metaGraphApiVersion &&
    left.evidenceDigest === right.evidenceDigest &&
    left.evidenceCheckedAt === right.evidenceCheckedAt &&
    left.evidenceExpiresAt === right.evidenceExpiresAt;
}

function proof(
  request: Readonly<NormalizedRequest>,
  record: Readonly<WhatsappCampaignDeliveryPolicyRecord>,
): string {
  const digest = createHash("sha256")
    .update(adapterVersion);
  for (const value of [
    request.operationKey,
    request.deliveryKey,
    request.targetTenantId,
    request.expectedConnectionVersion,
    request.expectedPolicyVersion,
    record.eventKey,
    record.policyVersion,
    record.recordedAt,
  ]) {
    digest.update("\0").update(String(value));
  }
  return `bot-reply-staging-kill-switch-proof-v1:${digest.digest("hex")}`;
}

export function createRailwayBotReplyStagingKillSwitch(
  options: Readonly<RailwayBotReplyStagingKillSwitchOptions>,
): BotReplyStagingProviderKillSwitch {
  requireOptions(options);

  return Object.freeze({
    isConfigured() {
      return true;
    },

    async disable(
      requestInput: Readonly<BotReplyStagingProviderKillSwitchRequest>,
    ): Promise<BotReplyStagingProviderKillSwitchResult> {
      const request = requireRequest(requestInput);
      const recordedAt = requireNow(options.clock);
      let current: WhatsappCampaignDeliveryPolicyRecord | null;
      try {
        current = await options.policies.findLatestPolicyEvent(
          request.targetTenantId,
        );
      } catch {
        fail("BOT_REPLY_STAGING_KILL_SWITCH_POLICY_INVALID");
      }
      if (
        current === null || current.tenantId !== request.targetTenantId ||
        current.connectionVersion !== request.expectedConnectionVersion ||
        !(
          current.policyVersion === request.expectedPolicyVersion &&
          current.deliveryState === "enabled"
        ) && !(
          current.policyVersion === request.expectedPolicyVersion + 1 &&
          current.deliveryState === "disabled" &&
          current.actorExternalUserId === request.actorExternalUserId
        )
      ) {
        fail("BOT_REPLY_STAGING_KILL_SWITCH_POLICY_INVALID");
      }
      const [portfolioLimitKind, portfolioLimitValue] =
        current.portfolioCapacity.kind === "bounded"
          ? [
              "bounded" as const,
              current.portfolioCapacity.maximumUniqueRecipients,
            ]
          : ["unlimited" as const, null];
      let mutation;
      try {
        mutation = await options.policies.recordPolicyEvent({
          tenantId: request.targetTenantId,
          connectionVersion: request.expectedConnectionVersion,
          expectedPolicyVersion: request.expectedPolicyVersion,
          deliveryState: "disabled",
          portfolioLimitKind,
          portfolioLimitValue,
          phoneThroughputMessagesPerSecond:
            current.phoneThroughput?.maximumMessagesPerSecond ?? null,
          maximumOutboundMessagesPerSecond:
            current.phoneThroughput?.maximumOutboundMessagesPerSecond ?? null,
          reservationDurationSeconds: current.reservationDurationSeconds,
          metaGraphApiVersion: current.metaGraphApiVersion,
          evidenceDigest: current.evidenceDigest,
          evidenceCheckedAt: current.evidenceCheckedAt,
          evidenceExpiresAt: current.evidenceExpiresAt,
          actorExternalUserId: request.actorExternalUserId,
          recordedAt,
        });
      } catch {
        fail("BOT_REPLY_STAGING_KILL_SWITCH_WRITE_FAILED");
      }
      if (
        (mutation.outcome !== "updated" && mutation.outcome !== "unchanged") ||
        mutation.record.tenantId !== request.targetTenantId ||
        mutation.record.connectionVersion !==
          request.expectedConnectionVersion ||
        mutation.record.policyVersion !== request.expectedPolicyVersion + 1 ||
        mutation.record.deliveryState !== "disabled" ||
        mutation.record.actorExternalUserId !== request.actorExternalUserId ||
        !sameSnapshot(mutation.record, current)
      ) {
        fail("BOT_REPLY_STAGING_KILL_SWITCH_WRITE_FAILED");
      }
      return Object.freeze({
        operationKey: request.operationKey,
        deliveryKey: request.deliveryKey,
        targetTenantId: request.targetTenantId,
        previousPolicyVersion: request.expectedPolicyVersion,
        disabledPolicyVersion: request.expectedPolicyVersion + 1,
        state: "disabled",
        recordedAt: mutation.record.recordedAt,
        evidenceProof: proof(request, mutation.record),
      });
    },
  });
}
