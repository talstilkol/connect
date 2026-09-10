import type {
  BotReplyDeliveryWorker,
  DispatchBotReplyDeliveryResult,
} from "../bot/botReplyDeliveryWorker.ts";
import type {
  BotReplyStagingAssetObservation,
  BotReplyStagingCredentialBoundaryObservation,
  BotReplyStagingDuplicateSafetyObservation,
  BotReplyStagingKillSwitchObservation,
  BotReplyStagingPairLimitObservation,
  BotReplyStagingProviderRetryObservation,
  BotReplyStagingRedactionObservation,
  BotReplyStagingScenarioContext,
  BotReplyStagingScenarioDriver,
  BotReplyStagingScenarioObservation,
  BotReplyStagingStepContext,
  BotReplyStagingThroughputObservation,
} from "./botReplyStagingScenarioExecutor.ts";
import {
  deriveBotReplyStagingStepDeliveryKey,
} from "./botReplyStagingScenarioExecutor.ts";

export const botReplyStagingProviderDriverVersion =
  "connect-bot-reply-staging-provider-driver-v1" as const;

type ScenarioName = BotReplyStagingScenarioContext["scenario"];

export type BotReplyStagingProviderCaseName =
  | ScenarioName
  | "provider-retry"
  | "pair-limit"
  | "duplicate-safety"
  | "kill-switch";

export type BotReplyStagingProviderExecutionMode =
  | "dispatch"
  | "observe-only";

export interface BotReplyStagingProviderCaseRequest {
  readonly caseName: BotReplyStagingProviderCaseName;
  readonly runKey: string;
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly targetTenantId: number;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly recipientFingerprint: string;
  readonly claimVersion: number;
  readonly leaseExpiresAt: string;
}

export interface BotReplyStagingProviderCase {
  readonly schemaVersion: 1;
  readonly source: "durable-postgres";
  readonly caseName: BotReplyStagingProviderCaseName;
  readonly runKey: string;
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly subjectDeliveryKey: string;
  readonly targetTenantId: number;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly recipientFingerprint: string;
  readonly claimVersion: number;
  readonly leaseExpiresAt: string;
  readonly executionMode: BotReplyStagingProviderExecutionMode;
  readonly serviceWindowOpenedAt: string | null;
  readonly serviceWindowExpiresAt: string | null;
  readonly caseFingerprint: string;
}

export interface BotReplyStagingProviderCaseInventory {
  isConfigured(): boolean;
  allocate(
    request: Readonly<BotReplyStagingProviderCaseRequest>,
  ): Promise<BotReplyStagingProviderCase>;
}

export interface BotReplyStagingProviderObservationSource {
  isConfigured(): boolean;
  inspectAssets(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingAssetObservation>;
  observeScenario(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult> | null,
  ): Promise<BotReplyStagingScenarioObservation>;
  inspectThroughput(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingThroughputObservation>;
  observeProviderRetry(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<BotReplyStagingProviderRetryObservation>;
  observePairLimit(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<BotReplyStagingPairLimitObservation>;
  observeDuplicateSafety(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatches: readonly [
      Readonly<DispatchBotReplyDeliveryResult>,
      Readonly<DispatchBotReplyDeliveryResult>,
    ],
  ): Promise<BotReplyStagingDuplicateSafetyObservation>;
  inspectCredentialBoundary(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingCredentialBoundaryObservation>;
  inspectRedaction(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingRedactionObservation>;
  observeKillSwitch(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    disabled: Readonly<BotReplyStagingProviderKillSwitchResult>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<BotReplyStagingKillSwitchObservation>;
}

export interface BotReplyStagingProviderKillSwitchRequest {
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly targetTenantId: number;
  readonly expectedConnectionVersion: number;
  readonly expectedPolicyVersion: number;
  readonly actorExternalUserId: string;
}

export interface BotReplyStagingProviderKillSwitchResult {
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly targetTenantId: number;
  readonly previousPolicyVersion: number;
  readonly disabledPolicyVersion: number;
  readonly state: "disabled";
  readonly recordedAt: string;
  readonly evidenceProof: string;
}

export interface BotReplyStagingProviderKillSwitch {
  isConfigured(): boolean;
  disable(
    request: Readonly<BotReplyStagingProviderKillSwitchRequest>,
  ): Promise<BotReplyStagingProviderKillSwitchResult>;
}

export interface BotReplyStagingProviderDriverDependencies {
  readonly cases: BotReplyStagingProviderCaseInventory;
  readonly deliveryWorker: BotReplyDeliveryWorker;
  readonly observations: BotReplyStagingProviderObservationSource;
  readonly killSwitch: BotReplyStagingProviderKillSwitch;
}

export type BotReplyStagingProviderDriverErrorCode =
  | "BOT_REPLY_STAGING_PROVIDER_RUNTIME_UNAVAILABLE"
  | "BOT_REPLY_STAGING_PROVIDER_CASE_UNAVAILABLE"
  | "BOT_REPLY_STAGING_PROVIDER_CASE_INVALID"
  | "BOT_REPLY_STAGING_PROVIDER_DELIVERY_FAILED"
  | "BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID"
  | "BOT_REPLY_STAGING_PROVIDER_KILL_SWITCH_FAILED"
  | "BOT_REPLY_STAGING_PROVIDER_KILL_SWITCH_INVALID"
  | "BOT_REPLY_STAGING_PROVIDER_OBSERVATION_FAILED";

export class BotReplyStagingProviderDriverError extends Error {
  readonly code: BotReplyStagingProviderDriverErrorCode;

  constructor(code: BotReplyStagingProviderDriverErrorCode) {
    super(code);
    this.name = "BotReplyStagingProviderDriverError";
    this.code = code;
  }
}

const caseKeys = Object.freeze([
  "schemaVersion",
  "source",
  "caseName",
  "runKey",
  "operationKey",
  "deliveryKey",
  "subjectDeliveryKey",
  "targetTenantId",
  "connectionVersion",
  "policyVersion",
  "recipientFingerprint",
  "claimVersion",
  "leaseExpiresAt",
  "executionMode",
  "serviceWindowOpenedAt",
  "serviceWindowExpiresAt",
  "caseFingerprint",
] as const);

const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const serviceWindowDurationMilliseconds = 24 * 60 * 60 * 1_000;

function fail(code: BotReplyStagingProviderDriverErrorCode): never {
  throw new BotReplyStagingProviderDriverError(code);
}

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

function canonicalTimestampMilliseconds(value: unknown): number | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString() === value
    ? milliseconds
    : null;
}

function scenarioExecutionMode(
  scenario: ScenarioName,
): BotReplyStagingProviderExecutionMode {
  return scenario === "text-send" || scenario === "button-send" ||
      scenario === "customer-window-expired"
    ? "dispatch"
    : "observe-only";
}

function requireDependencies(
  dependencies: Readonly<BotReplyStagingProviderDriverDependencies>,
): void {
  const observationKeys = Object.freeze([
    "inspectAssets",
    "inspectCredentialBoundary",
    "inspectRedaction",
    "inspectThroughput",
    "isConfigured",
    "observeDuplicateSafety",
    "observeKillSwitch",
    "observePairLimit",
    "observeProviderRetry",
    "observeScenario",
  ] as const);
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "cases,deliveryWorker,killSwitch,observations" ||
    !dependencies.cases || typeof dependencies.cases !== "object" ||
    Object.keys(dependencies.cases).sort().join(",") !==
      "allocate,isConfigured" ||
    typeof dependencies.cases.isConfigured !== "function" ||
    typeof dependencies.cases.allocate !== "function" ||
    !dependencies.deliveryWorker ||
    typeof dependencies.deliveryWorker !== "object" ||
    Object.keys(dependencies.deliveryWorker).sort().join(",") !==
      "dispatch,isConfigured" ||
    typeof dependencies.deliveryWorker.isConfigured !== "function" ||
    typeof dependencies.deliveryWorker.dispatch !== "function" ||
    !dependencies.killSwitch || typeof dependencies.killSwitch !== "object" ||
    Object.keys(dependencies.killSwitch).sort().join(",") !==
      "disable,isConfigured" ||
    typeof dependencies.killSwitch.isConfigured !== "function" ||
    typeof dependencies.killSwitch.disable !== "function" ||
    !dependencies.observations ||
    typeof dependencies.observations !== "object" ||
    Object.keys(dependencies.observations).sort().join(",") !==
      [...observationKeys].sort().join(",") ||
    observationKeys.some(
      (key) => typeof dependencies.observations[key] !== "function",
    )
  ) {
    throw new Error("Bot reply staging provider dependencies are invalid");
  }
}

function requireRuntime(
  dependencies: Readonly<BotReplyStagingProviderDriverDependencies>,
): void {
  try {
    if (
      dependencies.cases.isConfigured() !== true ||
      dependencies.deliveryWorker.isConfigured() !== true ||
      dependencies.observations.isConfigured() !== true ||
      dependencies.killSwitch.isConfigured() !== true
    ) {
      fail("BOT_REPLY_STAGING_PROVIDER_RUNTIME_UNAVAILABLE");
    }
  } catch (error) {
    if (error instanceof BotReplyStagingProviderDriverError) throw error;
    fail("BOT_REPLY_STAGING_PROVIDER_RUNTIME_UNAVAILABLE");
  }
}

function caseRequest(
  context: Readonly<BotReplyStagingStepContext>,
  caseName: BotReplyStagingProviderCaseName,
): Readonly<BotReplyStagingProviderCaseRequest> {
  return Object.freeze({
    caseName,
    runKey: context.run.runKey,
    operationKey: context.operationKey,
    deliveryKey: context.deliveryKey,
    targetTenantId: context.run.targetTenantId,
    connectionVersion: context.run.expectedConnectionVersion,
    policyVersion: context.run.expectedPolicyVersion,
    releaseId: context.run.releaseId,
    commitSha: context.run.commitSha,
    artifactDigest: context.run.artifactDigest,
    graphApiVersion: context.run.graphApiVersion,
    recipientFingerprint: context.run.recipientFingerprint,
    claimVersion: context.claim.claimVersion,
    leaseExpiresAt: context.claim.leaseExpiresAt,
  });
}

function requireAllocatedCase(
  value: unknown,
  request: Readonly<BotReplyStagingProviderCaseRequest>,
  expectedMode: BotReplyStagingProviderExecutionMode,
): Readonly<BotReplyStagingProviderCase> {
  if (
    !isRecord(value) || !hasExactKeys(value, caseKeys) ||
    value.schemaVersion !== 1 || value.source !== "durable-postgres" ||
    value.caseName !== request.caseName ||
    value.runKey !== request.runKey ||
    value.operationKey !== request.operationKey ||
    value.deliveryKey !== request.deliveryKey ||
    value.targetTenantId !== request.targetTenantId ||
    value.connectionVersion !== request.connectionVersion ||
    value.policyVersion !== request.policyVersion ||
    value.recipientFingerprint !== request.recipientFingerprint ||
    value.claimVersion !== request.claimVersion ||
    value.leaseExpiresAt !== request.leaseExpiresAt ||
    value.executionMode !== expectedMode ||
    typeof value.caseFingerprint !== "string" ||
    !fingerprintPattern.test(value.caseFingerprint)
  ) {
    fail("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID");
  }

  const leaseExpiresAt = canonicalTimestampMilliseconds(value.leaseExpiresAt);
  if (leaseExpiresAt === null) {
    fail("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID");
  }

  if (expectedMode === "observe-only") {
    if (
      value.serviceWindowOpenedAt !== null ||
      value.serviceWindowExpiresAt !== null
    ) {
      fail("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID");
    }
    const buttonSendDeliveryKey = deriveBotReplyStagingStepDeliveryKey(
      request.runKey,
      "scenario:button-send",
    );
    if (value.subjectDeliveryKey !== buttonSendDeliveryKey) {
      fail("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID");
    }
  } else {
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
      fail("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID");
    }
    if (value.subjectDeliveryKey !== request.deliveryKey) {
      fail("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID");
    }
  }

  return Object.freeze({
    schemaVersion: 1,
    source: "durable-postgres",
    caseName: request.caseName,
    runKey: request.runKey,
    operationKey: request.operationKey,
    deliveryKey: request.deliveryKey,
    subjectDeliveryKey: value.subjectDeliveryKey as string,
    targetTenantId: request.targetTenantId,
    connectionVersion: request.connectionVersion,
    policyVersion: request.policyVersion,
    recipientFingerprint: request.recipientFingerprint,
    claimVersion: request.claimVersion,
    leaseExpiresAt: request.leaseExpiresAt,
    executionMode: expectedMode,
    serviceWindowOpenedAt:
      value.serviceWindowOpenedAt as string | null,
    serviceWindowExpiresAt:
      value.serviceWindowExpiresAt as string | null,
    caseFingerprint: value.caseFingerprint,
  });
}

async function allocate(
  dependencies: Readonly<BotReplyStagingProviderDriverDependencies>,
  context: Readonly<BotReplyStagingStepContext>,
  caseName: BotReplyStagingProviderCaseName,
  expectedMode: BotReplyStagingProviderExecutionMode,
): Promise<Readonly<BotReplyStagingProviderCase>> {
  const request = caseRequest(context, caseName);
  let value: unknown;
  try {
    value = await dependencies.cases.allocate(request);
  } catch {
    fail("BOT_REPLY_STAGING_PROVIDER_CASE_UNAVAILABLE");
  }
  return requireAllocatedCase(value, request, expectedMode);
}

function requireDispatchResult(
  value: unknown,
): Readonly<DispatchBotReplyDeliveryResult> {
  if (!isRecord(value) || typeof value.outcome !== "string") {
    fail("BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID");
  }
  if (value.outcome === "deferred") {
    if (
      !hasExactKeys(value, ["outcome", "retryAt"]) ||
      canonicalTimestampMilliseconds(value.retryAt) === null
    ) {
      fail("BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID");
    }
    return Object.freeze({
      outcome: "deferred" as const,
      retryAt: value.retryAt as string,
    });
  }
  if (
    value.outcome !== "accepted" && value.outcome !== "rejected" &&
    value.outcome !== "ambiguous" && value.outcome !== "duplicate" &&
    value.outcome !== "in-progress"
  ) {
    fail("BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID");
  }
  if (!hasExactKeys(value, ["outcome"])) {
    fail("BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID");
  }
  return Object.freeze({ outcome: value.outcome });
}

async function dispatch(
  dependencies: Readonly<BotReplyStagingProviderDriverDependencies>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
): Promise<Readonly<DispatchBotReplyDeliveryResult>> {
  if (
    allocatedCase.executionMode !== "dispatch" ||
    allocatedCase.serviceWindowOpenedAt === null ||
    allocatedCase.serviceWindowExpiresAt === null
  ) {
    fail("BOT_REPLY_STAGING_PROVIDER_CASE_INVALID");
  }
  let value: unknown;
  try {
    value = await dependencies.deliveryWorker.dispatch({
      tenantId: allocatedCase.targetTenantId,
      deliveryKey: allocatedCase.deliveryKey,
      serviceWindowOpenedAt: allocatedCase.serviceWindowOpenedAt,
      serviceWindowExpiresAt: allocatedCase.serviceWindowExpiresAt,
    });
  } catch {
    fail("BOT_REPLY_STAGING_PROVIDER_DELIVERY_FAILED");
  }
  return requireDispatchResult(value);
}

function requireOutcome(
  value: Readonly<DispatchBotReplyDeliveryResult>,
  allowed: readonly DispatchBotReplyDeliveryResult["outcome"][],
): void {
  if (!allowed.includes(value.outcome)) {
    fail("BOT_REPLY_STAGING_PROVIDER_DELIVERY_OUTCOME_INVALID");
  }
}

async function observe<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch {
    fail("BOT_REPLY_STAGING_PROVIDER_OBSERVATION_FAILED");
  }
}

function requireKillSwitchResult(
  value: unknown,
  context: Readonly<BotReplyStagingStepContext>,
): Readonly<BotReplyStagingProviderKillSwitchResult> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "operationKey",
      "deliveryKey",
      "targetTenantId",
      "previousPolicyVersion",
      "disabledPolicyVersion",
      "state",
      "recordedAt",
      "evidenceProof",
    ]) ||
    value.operationKey !== context.operationKey ||
    value.deliveryKey !== context.deliveryKey ||
    value.targetTenantId !== context.run.targetTenantId ||
    value.previousPolicyVersion !== context.run.expectedPolicyVersion ||
    value.disabledPolicyVersion !== context.run.expectedPolicyVersion + 1 ||
    value.state !== "disabled" ||
    typeof value.evidenceProof !== "string" ||
    value.evidenceProof.length < 16 || value.evidenceProof.length > 2_048 ||
    value.evidenceProof.trim() !== value.evidenceProof
  ) {
    fail("BOT_REPLY_STAGING_PROVIDER_KILL_SWITCH_INVALID");
  }
  const recordedAt = canonicalTimestampMilliseconds(value.recordedAt);
  if (
    recordedAt === null ||
    recordedAt < Date.parse(context.run.requestedAt) ||
    recordedAt > Date.parse(context.claim.leaseExpiresAt)
  ) {
    fail("BOT_REPLY_STAGING_PROVIDER_KILL_SWITCH_INVALID");
  }
  return Object.freeze({
    operationKey: context.operationKey,
    deliveryKey: context.deliveryKey,
    targetTenantId: context.run.targetTenantId,
    previousPolicyVersion: context.run.expectedPolicyVersion,
    disabledPolicyVersion: context.run.expectedPolicyVersion + 1,
    state: "disabled",
    recordedAt: value.recordedAt as string,
    evidenceProof: value.evidenceProof,
  });
}

export function createBotReplyStagingProviderDriver(
  dependencies: Readonly<BotReplyStagingProviderDriverDependencies>,
): Readonly<BotReplyStagingScenarioDriver> {
  requireDependencies(dependencies);

  return Object.freeze({
    async inspectAssets(
      context: Readonly<BotReplyStagingStepContext>,
    ) {
      requireRuntime(dependencies);
      return observe(() => dependencies.observations.inspectAssets(context));
    },

    async executeScenario(
      context: Readonly<BotReplyStagingScenarioContext>,
    ) {
      requireRuntime(dependencies);
      const mode = scenarioExecutionMode(context.scenario);
      const allocatedCase = await allocate(
        dependencies,
        context,
        context.scenario,
        mode,
      );
      const dispatched = mode === "dispatch"
        ? await dispatch(dependencies, allocatedCase)
        : null;
      if (dispatched !== null) {
        requireOutcome(
          dispatched,
          context.scenario === "customer-window-expired"
            ? ["rejected", "duplicate"]
            : ["accepted", "duplicate"],
        );
      }
      return observe(() => dependencies.observations.observeScenario(
        context,
        allocatedCase,
        dispatched,
      ));
    },

    async inspectThroughput(
      context: Readonly<BotReplyStagingStepContext>,
    ) {
      requireRuntime(dependencies);
      return observe(
        () => dependencies.observations.inspectThroughput(context),
      );
    },

    async verifyProviderRetry(
      context: Readonly<BotReplyStagingStepContext>,
    ) {
      requireRuntime(dependencies);
      const allocatedCase = await allocate(
        dependencies,
        context,
        "provider-retry",
        "dispatch",
      );
      const dispatched = await dispatch(dependencies, allocatedCase);
      requireOutcome(dispatched, ["deferred", "duplicate"]);
      return observe(() => dependencies.observations.observeProviderRetry(
        context,
        allocatedCase,
        dispatched,
      ));
    },

    async verifyPairLimit(
      context: Readonly<BotReplyStagingStepContext>,
    ) {
      requireRuntime(dependencies);
      const allocatedCase = await allocate(
        dependencies,
        context,
        "pair-limit",
        "dispatch",
      );
      const dispatched = await dispatch(dependencies, allocatedCase);
      requireOutcome(dispatched, ["deferred", "duplicate"]);
      return observe(() => dependencies.observations.observePairLimit(
        context,
        allocatedCase,
        dispatched,
      ));
    },

    async verifyDuplicateSafety(
      context: Readonly<BotReplyStagingStepContext>,
    ) {
      requireRuntime(dependencies);
      const allocatedCase = await allocate(
        dependencies,
        context,
        "duplicate-safety",
        "dispatch",
      );
      const first = await dispatch(dependencies, allocatedCase);
      requireOutcome(first, ["accepted", "duplicate"]);
      const second = await dispatch(dependencies, allocatedCase);
      requireOutcome(second, ["duplicate"]);
      return observe(() => dependencies.observations.observeDuplicateSafety(
        context,
        allocatedCase,
        Object.freeze([first, second]),
      ));
    },

    async verifyCredentialBoundary(
      context: Readonly<BotReplyStagingStepContext>,
    ) {
      requireRuntime(dependencies);
      return observe(
        () => dependencies.observations.inspectCredentialBoundary(context),
      );
    },

    async verifyRedaction(
      context: Readonly<BotReplyStagingStepContext>,
    ) {
      requireRuntime(dependencies);
      return observe(
        () => dependencies.observations.inspectRedaction(context),
      );
    },

    async verifyKillSwitch(
      context: Readonly<BotReplyStagingStepContext>,
    ) {
      requireRuntime(dependencies);
      const allocatedCase = await allocate(
        dependencies,
        context,
        "kill-switch",
        "dispatch",
      );
      let rawDisabled: unknown;
      try {
        rawDisabled = await dependencies.killSwitch.disable({
          operationKey: context.operationKey,
          deliveryKey: context.deliveryKey,
          targetTenantId: context.run.targetTenantId,
          expectedConnectionVersion: context.run.expectedConnectionVersion,
          expectedPolicyVersion: context.run.expectedPolicyVersion,
          actorExternalUserId: context.run.actorExternalUserId,
        });
      } catch {
        fail("BOT_REPLY_STAGING_PROVIDER_KILL_SWITCH_FAILED");
      }
      const disabled = requireKillSwitchResult(
        rawDisabled,
        context,
      );
      const dispatched = await dispatch(dependencies, allocatedCase);
      requireOutcome(dispatched, ["rejected", "deferred", "duplicate"]);
      return observe(() => dependencies.observations.observeKillSwitch(
        context,
        allocatedCase,
        disabled,
        dispatched,
      ));
    },
  });
}
