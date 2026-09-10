import type {
  BotReplyDeliveryRepository,
  StageBotReplyDeliveryInput,
} from "../../db/botReplyDeliveryRepository.ts";
import type {
  BotReplyPayload,
  PersistedBotReplyDelivery,
} from "../../shared/domain/botReplyDelivery.ts";
import {
  deriveBotReplyStagingStepDeliveryKey,
} from "./botReplyStagingScenarioExecutor.ts";
import type {
  BotReplyStagingProviderCase,
  BotReplyStagingProviderCaseInventory,
  BotReplyStagingProviderCaseName,
  BotReplyStagingProviderCaseRequest,
  BotReplyStagingProviderExecutionMode,
} from "./botReplyStagingProviderDriver.ts";
import type {
  BotReplyStagingRecipientFingerprintDeriver,
} from "./botReplyStagingRecipientFingerprint.ts";

export interface BotReplyStagingPrivateCaseDefinition {
  readonly schemaVersion: 1;
  readonly source: "private-staging-inventory";
  readonly caseName: BotReplyStagingProviderCaseName;
  readonly subjectCaseName: BotReplyStagingProviderCaseName;
  readonly targetTenantId: number;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly recipientPhoneNumber: string;
  readonly inventoryExpiresAt: string;
  readonly caseFingerprint: string;
  readonly delivery: Readonly<{
    conversationKey: string;
    inboundMessageKey: string;
    botFlowKey: string;
    botFlowVersionKey: string;
    replyIndex: number;
    senderPhoneNumberId: string;
    reply: BotReplyPayload;
  }>;
}

export interface BotReplyStagingPrivateCaseSource {
  isConfigured(): boolean;
  resolve(
    request: Readonly<BotReplyStagingProviderCaseRequest>,
  ): Promise<BotReplyStagingPrivateCaseDefinition>;
}

export interface BotReplyStagingServiceWindowSource {
  isConfigured(): boolean;
  read(input: Readonly<{
    targetTenantId: number;
    inboundMessageKey: string;
  }>): Promise<Readonly<{
    source: "durable-postgres";
    serviceWindowOpenedAt: string;
    serviceWindowExpiresAt: string;
  }>>;
}

export interface BotReplyStagingProviderCaseInventoryDependencies {
  readonly definitions: BotReplyStagingPrivateCaseSource;
  readonly deliveries: Pick<BotReplyDeliveryRepository, "stage">;
  readonly recipientFingerprints:
    BotReplyStagingRecipientFingerprintDeriver;
  readonly serviceWindows: BotReplyStagingServiceWindowSource;
}

const definitionKeys = Object.freeze([
  "schemaVersion",
  "source",
  "caseName",
  "subjectCaseName",
  "targetTenantId",
  "connectionVersion",
  "policyVersion",
  "releaseId",
  "commitSha",
  "artifactDigest",
  "graphApiVersion",
  "recipientPhoneNumber",
  "inventoryExpiresAt",
  "caseFingerprint",
  "delivery",
] as const);
const deliveryKeys = Object.freeze([
  "conversationKey",
  "inboundMessageKey",
  "botFlowKey",
  "botFlowVersionKey",
  "replyIndex",
  "senderPhoneNumberId",
  "reply",
] as const);
const serviceWindowKeys = Object.freeze([
  "source",
  "serviceWindowOpenedAt",
  "serviceWindowExpiresAt",
] as const);
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const phoneNumberPattern = /^\+[1-9][0-9]{0,14}$/;
const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;
const serviceWindowDurationMilliseconds = 24 * 60 * 60 * 1_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1;
}

function canonicalTimestampMilliseconds(value: unknown): number | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString() === value
    ? milliseconds
    : null;
}

function executionMode(
  caseName: BotReplyStagingProviderCaseName,
): BotReplyStagingProviderExecutionMode {
  return caseName === "button-reply" || caseName === "status-sent" ||
      caseName === "status-delivered" || caseName === "status-read"
    ? "observe-only"
    : "dispatch";
}

function subjectCaseName(
  caseName: BotReplyStagingProviderCaseName,
): BotReplyStagingProviderCaseName {
  return executionMode(caseName) === "observe-only"
    ? "button-send"
    : caseName;
}

function requireDependencies(
  dependencies:
    Readonly<BotReplyStagingProviderCaseInventoryDependencies>,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "definitions,deliveries,recipientFingerprints,serviceWindows" ||
    typeof dependencies.definitions?.isConfigured !== "function" ||
    typeof dependencies.definitions?.resolve !== "function" ||
    typeof dependencies.deliveries?.stage !== "function" ||
    typeof dependencies.recipientFingerprints?.isConfigured !== "function" ||
    typeof dependencies.recipientFingerprints?.derive !== "function" ||
    typeof dependencies.serviceWindows?.isConfigured !== "function" ||
    typeof dependencies.serviceWindows?.read !== "function"
  ) {
    throw new Error(
      "Bot reply staging provider case dependencies are invalid",
    );
  }
}

function configured(
  dependencies:
    Readonly<BotReplyStagingProviderCaseInventoryDependencies>,
): boolean {
  try {
    return dependencies.definitions.isConfigured() === true &&
      dependencies.recipientFingerprints.isConfigured() === true &&
      dependencies.serviceWindows.isConfigured() === true;
  } catch {
    return false;
  }
}

function requireDefinition(
  value: unknown,
  request: Readonly<BotReplyStagingProviderCaseRequest>,
): Readonly<BotReplyStagingPrivateCaseDefinition> {
  if (
    !isRecord(value) || !hasExactKeys(value, definitionKeys) ||
    value.schemaVersion !== 1 ||
    value.source !== "private-staging-inventory" ||
    value.caseName !== request.caseName ||
    value.subjectCaseName !== subjectCaseName(request.caseName) ||
    value.targetTenantId !== request.targetTenantId ||
    value.connectionVersion !== request.connectionVersion ||
    value.policyVersion !== request.policyVersion ||
    value.releaseId !== request.releaseId ||
    value.commitSha !== request.commitSha ||
    value.artifactDigest !== request.artifactDigest ||
    value.graphApiVersion !== request.graphApiVersion ||
    typeof value.recipientPhoneNumber !== "string" ||
    !phoneNumberPattern.test(value.recipientPhoneNumber) ||
    typeof value.caseFingerprint !== "string" ||
    !fingerprintPattern.test(value.caseFingerprint) ||
    !isRecord(value.delivery) ||
    !hasExactKeys(value.delivery, deliveryKeys) ||
    !positiveInteger(value.delivery.replyIndex)
  ) {
    throw new Error("Bot reply staging private case is invalid");
  }
  const inventoryExpiresAt = canonicalTimestampMilliseconds(
    value.inventoryExpiresAt,
  );
  const leaseExpiresAt = canonicalTimestampMilliseconds(
    request.leaseExpiresAt,
  );
  if (
    inventoryExpiresAt === null || leaseExpiresAt === null ||
    inventoryExpiresAt < leaseExpiresAt
  ) {
    throw new Error("Bot reply staging private case is expired");
  }
  return value as unknown as Readonly<BotReplyStagingPrivateCaseDefinition>;
}

function requireServiceWindow(
  value: unknown,
): Readonly<{
  source: "durable-postgres";
  serviceWindowOpenedAt: string;
  serviceWindowExpiresAt: string;
}> {
  if (
    !isRecord(value) || !hasExactKeys(value, serviceWindowKeys) ||
    value.source !== "durable-postgres"
  ) {
    throw new Error("Bot reply staging service window is invalid");
  }
  const openedAt = canonicalTimestampMilliseconds(
    value.serviceWindowOpenedAt,
  );
  const expiresAt = canonicalTimestampMilliseconds(
    value.serviceWindowExpiresAt,
  );
  if (
    openedAt === null || expiresAt === null ||
    expiresAt - openedAt !== serviceWindowDurationMilliseconds
  ) {
    throw new Error("Bot reply staging service window is invalid");
  }
  return Object.freeze({
    source: "durable-postgres" as const,
    serviceWindowOpenedAt: value.serviceWindowOpenedAt as string,
    serviceWindowExpiresAt: value.serviceWindowExpiresAt as string,
  });
}

function deliveryMatches(
  delivery: Readonly<PersistedBotReplyDelivery>,
  expected: Readonly<StageBotReplyDeliveryInput>,
): boolean {
  return delivery.deliveryKey === expected.deliveryKey &&
    delivery.tenantId === expected.tenantId &&
    delivery.conversationKey === expected.conversationKey &&
    delivery.inboundMessageKey === expected.inboundMessageKey &&
    delivery.botFlowKey === expected.botFlowKey &&
    delivery.botFlowVersionKey === expected.botFlowVersionKey &&
    delivery.replyIndex === expected.replyIndex &&
    delivery.senderPhoneNumberId === expected.senderPhoneNumberId &&
    delivery.recipientPhoneNumber === expected.recipientPhoneNumber &&
    JSON.stringify(delivery.reply) === JSON.stringify(expected.reply);
}

export function createBotReplyStagingProviderCaseInventory(
  dependencies:
    Readonly<BotReplyStagingProviderCaseInventoryDependencies>,
): Readonly<BotReplyStagingProviderCaseInventory> {
  requireDependencies(dependencies);

  return Object.freeze({
    isConfigured() {
      return configured(dependencies);
    },

    async allocate(
      request: Readonly<BotReplyStagingProviderCaseRequest>,
    ) {
      if (!configured(dependencies)) {
        throw new Error("Bot reply staging provider case is unavailable");
      }
      const definition = requireDefinition(
        await dependencies.definitions.resolve(request),
        request,
      );
      const fingerprint = await dependencies.recipientFingerprints.derive(
        definition.recipientPhoneNumber,
      );
      if (fingerprint !== request.recipientFingerprint) {
        throw new Error("Bot reply staging recipient is not authorized");
      }

      const mode = executionMode(request.caseName);
      const subjectDeliveryKey = mode === "dispatch"
        ? request.deliveryKey
        : deriveBotReplyStagingStepDeliveryKey(
            request.runKey,
            "scenario:button-send",
          );
      if (!deliveryKeyPattern.test(subjectDeliveryKey)) {
        throw new Error("Bot reply staging subject is invalid");
      }
      const stageInput = Object.freeze({
        deliveryKey: subjectDeliveryKey,
        tenantId: request.targetTenantId,
        conversationKey: definition.delivery.conversationKey,
        inboundMessageKey: definition.delivery.inboundMessageKey,
        botFlowKey: definition.delivery.botFlowKey,
        botFlowVersionKey: definition.delivery.botFlowVersionKey,
        replyIndex: definition.delivery.replyIndex,
        senderPhoneNumberId: definition.delivery.senderPhoneNumberId,
        recipientPhoneNumber: definition.recipientPhoneNumber,
        reply: definition.delivery.reply,
      });
      const staged = await dependencies.deliveries.stage(stageInput);
      if (
        !staged ||
        (staged.outcome !== "created" && staged.outcome !== "duplicate") ||
        !deliveryMatches(staged.delivery, stageInput)
      ) {
        throw new Error("Bot reply staging delivery was not persisted");
      }
      const serviceWindow = requireServiceWindow(
        await dependencies.serviceWindows.read({
          targetTenantId: request.targetTenantId,
          inboundMessageKey: definition.delivery.inboundMessageKey,
        }),
      );

      return Object.freeze({
        schemaVersion: 1 as const,
        source: "durable-postgres" as const,
        caseName: request.caseName,
        runKey: request.runKey,
        operationKey: request.operationKey,
        deliveryKey: request.deliveryKey,
        subjectDeliveryKey,
        targetTenantId: request.targetTenantId,
        connectionVersion: request.connectionVersion,
        policyVersion: request.policyVersion,
        recipientFingerprint: request.recipientFingerprint,
        claimVersion: request.claimVersion,
        leaseExpiresAt: request.leaseExpiresAt,
        executionMode: mode,
        serviceWindowOpenedAt: mode === "dispatch"
          ? serviceWindow.serviceWindowOpenedAt
          : null,
        serviceWindowExpiresAt: mode === "dispatch"
          ? serviceWindow.serviceWindowExpiresAt
          : null,
        caseFingerprint: definition.caseFingerprint,
      } satisfies BotReplyStagingProviderCase);
    },
  });
}
