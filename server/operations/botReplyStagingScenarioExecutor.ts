import {
  createHash,
} from "node:crypto";

import {
  botReplyStagingScenarioRequirements,
} from "./botReplyStagingEvidence.ts";
import {
  buildBotReplyStagingEvidenceFromReceipt,
  botReplyStagingRunnerVersion,
} from "./botReplyStagingEvidenceBuilder.ts";
import type {
  BotReplyStagingScenarioExecutor,
} from "./botReplyStagingDurableRunner.ts";
import type {
  BotReplyStagingLiveRunInput,
  BotReplyStagingLiveSafetySnapshot,
} from "./botReplyStagingLiveDriver.ts";
import {
  createBotReplyStagingQueueMessage,
  type BotReplyStagingQueueClaim,
} from "./botReplyStagingQueueMessage.ts";

type ScenarioRequirement =
  (typeof botReplyStagingScenarioRequirements)[number];

type ScenarioName = ScenarioRequirement["scenario"];

const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const operationKeyPattern =
  /^bot_reply_staging_step_v1_[a-f0-9]{64}$/;
const deliveryKeyPattern = /^bot_reply_delivery_v1_[a-f0-9]{64}$/;

export interface BotReplyStagingStepContext {
  readonly run: Readonly<BotReplyStagingLiveRunInput>;
  readonly claim: Readonly<BotReplyStagingQueueClaim>;
  readonly operationKey: string;
  readonly deliveryKey: string;
}

export interface BotReplyStagingScenarioContext
  extends BotReplyStagingStepContext {
  readonly scenario: ScenarioName;
  readonly expectedProviderErrorCode: number | null;
}

export interface BotReplyStagingAssetObservation {
  readonly operationKey: string;
  readonly graphApiVersion: string;
  readonly assetProofs: Readonly<{
    app: string;
    waba: string;
    phoneNumber: string;
  }>;
}

export interface BotReplyStagingScenarioObservation {
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly scenario: ScenarioName;
  readonly status: "passed";
  readonly providerErrorCode: number | null;
  readonly observedAt: string;
  readonly evidenceProof: string;
  readonly executionBoundary: "railway-bot-reply-worker";
}

export interface BotReplyStagingThroughputObservation {
  readonly operationKey: string;
  readonly messagesPerSecond: 20 | 80 | 1_000;
  readonly source: "graph-api";
  readonly observedAt: string;
  readonly evidenceProof: string;
}

export interface BotReplyStagingProviderRetryObservation {
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly status: "passed";
  readonly providerErrorCode: 130429;
  readonly retryAfterSeconds: number;
  readonly cooldownScope: "sender";
  readonly observedAt: string;
  readonly evidenceProof: string;
  readonly executionBoundary: "railway-bot-reply-worker";
}

export interface BotReplyStagingPairLimitObservation {
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly status: "passed";
  readonly providerErrorCode: 131056;
  readonly cooldownScope: "pair";
  readonly backoffPolicy: "meta-4-power-x";
  readonly observedAt: string;
  readonly evidenceProof: string;
  readonly executionBoundary: "railway-bot-reply-worker";
}

export interface BotReplyStagingDuplicateSafetyObservation {
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly status: "passed";
  readonly queueDeliveryCount: number;
  readonly providerRequestCount: 1;
  readonly observedAt: string;
  readonly evidenceProof: string;
  readonly executionBoundary: "railway-bot-reply-worker";
}

export interface BotReplyStagingCredentialBoundaryObservation {
  readonly operationKey: string;
  readonly source: "encrypted-vault";
  readonly plaintextExposureFindings: 0;
  readonly observedAt: string;
  readonly evidenceProof: string;
}

export interface BotReplyStagingRedactionObservation {
  readonly operationKey: string;
  readonly testedFieldCount: number;
  readonly findings: 0;
  readonly observedAt: string;
  readonly evidenceProof: string;
}

export interface BotReplyStagingKillSwitchObservation {
  readonly operationKey: string;
  readonly deliveryKey: string;
  readonly status: "passed";
  readonly providerRequestCount: 0;
  readonly observedAt: string;
  readonly evidenceProof: string;
  readonly executionBoundary: "railway-bot-reply-worker";
}

export interface BotReplyStagingScenarioDriver {
  inspectAssets(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingAssetObservation>;
  executeScenario(
    context: Readonly<BotReplyStagingScenarioContext>,
  ): Promise<BotReplyStagingScenarioObservation>;
  inspectThroughput(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingThroughputObservation>;
  verifyProviderRetry(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingProviderRetryObservation>;
  verifyPairLimit(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingPairLimitObservation>;
  verifyDuplicateSafety(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingDuplicateSafetyObservation>;
  verifyCredentialBoundary(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingCredentialBoundaryObservation>;
  verifyRedaction(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingRedactionObservation>;
  verifyKillSwitch(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingKillSwitchObservation>;
}

export interface BotReplyStagingScenarioExecutorDependencies {
  readonly clock: Readonly<{ now(): Date }>;
  readonly safety: Readonly<{
    read(
      targetTenantId: number,
    ): Promise<BotReplyStagingLiveSafetySnapshot | null>;
  }>;
  readonly driver: BotReplyStagingScenarioDriver;
}

export type BotReplyStagingScenarioExecutorErrorCode =
  | "BOT_REPLY_STAGING_SCENARIO_INPUT_INVALID"
  | "BOT_REPLY_STAGING_SCENARIO_CLOCK_INVALID"
  | "BOT_REPLY_STAGING_SCENARIO_LEASE_EXPIRED"
  | "BOT_REPLY_STAGING_SCENARIO_SAFETY_UNAVAILABLE"
  | "BOT_REPLY_STAGING_SCENARIO_SAFETY_BLOCKED"
  | "BOT_REPLY_STAGING_SCENARIO_DRIVER_FAILED"
  | "BOT_REPLY_STAGING_SCENARIO_OBSERVATION_INVALID"
  | "BOT_REPLY_STAGING_SCENARIO_RECEIPT_INVALID";

export class BotReplyStagingScenarioExecutorError extends Error {
  readonly code: BotReplyStagingScenarioExecutorErrorCode;

  constructor(code: BotReplyStagingScenarioExecutorErrorCode) {
    super(code);
    this.name = "BotReplyStagingScenarioExecutorError";
    this.code = code;
  }
}

function fail(code: BotReplyStagingScenarioExecutorErrorCode): never {
  throw new BotReplyStagingScenarioExecutorError(code);
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

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function isSafeIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return Number.isSafeInteger(value) &&
    Number(value) >= minimum && Number(value) <= maximum;
}

function isEvidenceProof(value: unknown): value is string {
  return typeof value === "string" &&
    value.length >= 16 && value.length <= 2_048 &&
    value.trim() === value && !value.includes("\0");
}

function nowMilliseconds(
  clock: Readonly<{ now(): Date }>,
): number {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_SCENARIO_CLOCK_INVALID");
  }
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    fail("BOT_REPLY_STAGING_SCENARIO_CLOCK_INVALID");
  }
  return value.getTime();
}

function requireDependencies(
  dependencies: Readonly<BotReplyStagingScenarioExecutorDependencies>,
): void {
  const driverKeys = Object.freeze([
    "executeScenario",
    "inspectAssets",
    "inspectThroughput",
    "verifyCredentialBoundary",
    "verifyDuplicateSafety",
    "verifyKillSwitch",
    "verifyPairLimit",
    "verifyProviderRetry",
    "verifyRedaction",
  ] as const);
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !== "clock,driver,safety" ||
    typeof dependencies.clock?.now !== "function" ||
    typeof dependencies.safety?.read !== "function" ||
    !dependencies.driver || typeof dependencies.driver !== "object" ||
    Object.keys(dependencies.driver).sort().join(",") !==
      [...driverKeys].sort().join(",") ||
    driverKeys.some(
      (key) => typeof dependencies.driver[key] !== "function",
    )
  ) {
    throw new Error("Bot reply staging scenario executor dependencies are invalid");
  }
}

function deriveOperationKey(runKey: string, step: string): string {
  const digest = createHash("sha256")
    .update(`${runKey}\0${step}`)
    .digest("hex");
  return `bot_reply_staging_step_v1_${digest}`;
}

export function deriveBotReplyStagingStepDeliveryKey(
  runKey: string,
  step: string,
): string {
  const digest = createHash("sha256")
    .update(`${runKey}\0delivery\0${step}`)
    .digest("hex");
  return `bot_reply_delivery_v1_${digest}`;
}

function requireSafetySnapshot(
  value: BotReplyStagingLiveSafetySnapshot | null,
  run: Readonly<BotReplyStagingLiveRunInput>,
  currentMilliseconds: number,
  requiredUntilMilliseconds: number,
): void {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "environment",
      "connectionMode",
      "connectionStatus",
      "connectionVersion",
      "policyVersion",
      "deliveryState",
      "policyEvidenceExpiresAt",
      "graphApiVersion",
      "credentialSource",
      "executionBoundary",
      "evidenceSource",
      "recipientAuthorization",
      "rateLimitTestApproval",
    ]) ||
    value.environment !== "staging" ||
    value.connectionMode !== "approved-staging-waba" ||
    value.connectionStatus !== "connected" ||
    value.connectionVersion !== run.expectedConnectionVersion ||
    value.policyVersion !== run.expectedPolicyVersion ||
    value.deliveryState !== "enabled" ||
    value.graphApiVersion !== run.graphApiVersion ||
    !graphApiVersionPattern.test(value.graphApiVersion) ||
    value.credentialSource !== "encrypted-vault" ||
    value.executionBoundary !== "railway-bullmq-bot-reply-worker" ||
    value.evidenceSource !== "durable-postgres" ||
    !isRecord(value.recipientAuthorization) ||
    !hasExactKeys(value.recipientAuthorization, [
      "status",
      "optInRecorded",
      "expiresAt",
      "recipientFingerprint",
    ]) ||
    value.recipientAuthorization.status !== "approved" ||
    value.recipientAuthorization.optInRecorded !== true ||
    value.recipientAuthorization.recipientFingerprint !==
      run.recipientFingerprint ||
    !fingerprintPattern.test(
      value.recipientAuthorization.recipientFingerprint,
    ) ||
    !isRecord(value.rateLimitTestApproval) ||
    !hasExactKeys(value.rateLimitTestApproval, [
      "status",
      "approvedBy",
      "approvedAt",
      "expiresAt",
      "methodFingerprint",
    ]) ||
    value.rateLimitTestApproval.status !== "approved" ||
    value.rateLimitTestApproval.approvedBy !== "tal" ||
    value.rateLimitTestApproval.methodFingerprint !==
      run.rateLimitMethodFingerprint ||
    !fingerprintPattern.test(
      value.rateLimitTestApproval.methodFingerprint,
    )
  ) {
    fail("BOT_REPLY_STAGING_SCENARIO_SAFETY_BLOCKED");
  }

  const policyExpiresAt = Date.parse(value.policyEvidenceExpiresAt);
  const recipientExpiresAt = Date.parse(
    value.recipientAuthorization.expiresAt,
  );
  const rateLimitApprovedAt = Date.parse(
    value.rateLimitTestApproval.approvedAt,
  );
  const rateLimitExpiresAt = Date.parse(
    value.rateLimitTestApproval.expiresAt,
  );
  if (
    !isCanonicalTimestamp(value.policyEvidenceExpiresAt) ||
    !isCanonicalTimestamp(value.recipientAuthorization.expiresAt) ||
    !isCanonicalTimestamp(value.rateLimitTestApproval.approvedAt) ||
    !isCanonicalTimestamp(value.rateLimitTestApproval.expiresAt) ||
    policyExpiresAt <= currentMilliseconds ||
    recipientExpiresAt <= currentMilliseconds ||
    rateLimitApprovedAt > currentMilliseconds ||
    rateLimitExpiresAt <= currentMilliseconds ||
    rateLimitExpiresAt <= rateLimitApprovedAt ||
    policyExpiresAt < requiredUntilMilliseconds ||
    recipientExpiresAt < requiredUntilMilliseconds ||
    rateLimitExpiresAt < requiredUntilMilliseconds
  ) {
    fail("BOT_REPLY_STAGING_SCENARIO_SAFETY_BLOCKED");
  }
}

async function requireCurrentSafety(
  dependencies: Readonly<BotReplyStagingScenarioExecutorDependencies>,
  run: Readonly<BotReplyStagingLiveRunInput>,
  claim: Readonly<BotReplyStagingQueueClaim>,
): Promise<number> {
  const currentMilliseconds = nowMilliseconds(dependencies.clock);
  if (currentMilliseconds >= Date.parse(claim.leaseExpiresAt)) {
    fail("BOT_REPLY_STAGING_SCENARIO_LEASE_EXPIRED");
  }
  let snapshot: BotReplyStagingLiveSafetySnapshot | null;
  try {
    snapshot = await dependencies.safety.read(run.targetTenantId);
  } catch {
    fail("BOT_REPLY_STAGING_SCENARIO_SAFETY_UNAVAILABLE");
  }
  requireSafetySnapshot(
    snapshot,
    run,
    currentMilliseconds,
    Date.parse(claim.leaseExpiresAt),
  );
  return currentMilliseconds;
}

function stepContext(
  run: Readonly<BotReplyStagingLiveRunInput>,
  claim: Readonly<BotReplyStagingQueueClaim>,
  step: string,
): Readonly<BotReplyStagingStepContext> {
  return Object.freeze({
    run,
    claim,
    operationKey: deriveOperationKey(run.runKey, step),
    deliveryKey: deriveBotReplyStagingStepDeliveryKey(run.runKey, step),
  });
}

function observationTimestampIsValid(
  value: unknown,
  run: Readonly<BotReplyStagingLiveRunInput>,
  currentMilliseconds: number,
): value is string {
  return isCanonicalTimestamp(value) &&
    Date.parse(value) >= Date.parse(run.requestedAt) &&
    Date.parse(value) <= currentMilliseconds;
}

async function invoke<T>(
  dependencies: Readonly<BotReplyStagingScenarioExecutorDependencies>,
  run: Readonly<BotReplyStagingLiveRunInput>,
  claim: Readonly<BotReplyStagingQueueClaim>,
  action: () => Promise<T>,
): Promise<Readonly<{ value: T; currentMilliseconds: number }>> {
  await requireCurrentSafety(
    dependencies,
    run,
    claim,
  );
  let value: T;
  try {
    value = await action();
  } catch {
    fail("BOT_REPLY_STAGING_SCENARIO_DRIVER_FAILED");
  }
  const currentMilliseconds = nowMilliseconds(dependencies.clock);
  if (currentMilliseconds > Date.parse(claim.leaseExpiresAt)) {
    fail("BOT_REPLY_STAGING_SCENARIO_LEASE_EXPIRED");
  }
  return Object.freeze({
    value,
    currentMilliseconds,
  });
}

function requireAssetObservation(
  value: unknown,
  context: Readonly<BotReplyStagingStepContext>,
  run: Readonly<BotReplyStagingLiveRunInput>,
): asserts value is BotReplyStagingAssetObservation {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "operationKey",
      "graphApiVersion",
      "assetProofs",
    ]) ||
    value.operationKey !== context.operationKey ||
    !operationKeyPattern.test(value.operationKey) ||
    !deliveryKeyPattern.test(context.deliveryKey) ||
    value.graphApiVersion !== run.graphApiVersion ||
    !isRecord(value.assetProofs) ||
    !hasExactKeys(value.assetProofs, ["app", "waba", "phoneNumber"]) ||
    !isEvidenceProof(value.assetProofs.app) ||
    !isEvidenceProof(value.assetProofs.waba) ||
    !isEvidenceProof(value.assetProofs.phoneNumber)
  ) {
    fail("BOT_REPLY_STAGING_SCENARIO_OBSERVATION_INVALID");
  }
}

function requireScenarioObservation(
  value: unknown,
  context: Readonly<BotReplyStagingScenarioContext>,
  currentMilliseconds: number,
): asserts value is BotReplyStagingScenarioObservation {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "operationKey",
      "deliveryKey",
      "scenario",
      "status",
      "providerErrorCode",
      "observedAt",
      "evidenceProof",
      "executionBoundary",
    ]) ||
    value.operationKey !== context.operationKey ||
    value.deliveryKey !== context.deliveryKey ||
    !deliveryKeyPattern.test(value.deliveryKey) ||
    value.scenario !== context.scenario ||
    value.status !== "passed" ||
    value.providerErrorCode !== context.expectedProviderErrorCode ||
    !observationTimestampIsValid(
      value.observedAt,
      context.run,
      currentMilliseconds,
    ) ||
    !isEvidenceProof(value.evidenceProof) ||
    value.executionBoundary !== "railway-bot-reply-worker"
  ) {
    fail("BOT_REPLY_STAGING_SCENARIO_OBSERVATION_INVALID");
  }
}

function requireControlObservation(
  kind:
    | "throughput"
    | "provider-retry"
    | "pair-limit"
    | "duplicate-safety"
    | "credential-boundary"
    | "redaction"
    | "kill-switch",
  value: unknown,
  context: Readonly<BotReplyStagingStepContext>,
  currentMilliseconds: number,
): void {
  if (!isRecord(value) || value.operationKey !== context.operationKey) {
    fail("BOT_REPLY_STAGING_SCENARIO_OBSERVATION_INVALID");
  }
  const timestampIsValid = (observedAt: unknown) =>
    observationTimestampIsValid(
      observedAt,
      context.run,
      currentMilliseconds,
    );
  const providerBoundaryIsValid =
    value.executionBoundary === "railway-bot-reply-worker";
  let valid = false;

  if (kind === "throughput") {
    valid = hasExactKeys(value, [
      "operationKey",
      "messagesPerSecond",
      "source",
      "observedAt",
      "evidenceProof",
    ]) &&
      (value.messagesPerSecond === 20 ||
        value.messagesPerSecond === 80 ||
        value.messagesPerSecond === 1_000) &&
      value.source === "graph-api" && timestampIsValid(value.observedAt) &&
      isEvidenceProof(value.evidenceProof);
  } else if (kind === "provider-retry") {
    valid = hasExactKeys(value, [
      "operationKey",
      "deliveryKey",
      "status",
      "providerErrorCode",
      "retryAfterSeconds",
      "cooldownScope",
      "observedAt",
      "evidenceProof",
      "executionBoundary",
    ]) && value.deliveryKey === context.deliveryKey &&
      value.status === "passed" && value.providerErrorCode === 130429 &&
      isSafeIntegerInRange(value.retryAfterSeconds, 1, 86_400) &&
      value.cooldownScope === "sender" && timestampIsValid(value.observedAt) &&
      isEvidenceProof(value.evidenceProof) && providerBoundaryIsValid;
  } else if (kind === "pair-limit") {
    valid = hasExactKeys(value, [
      "operationKey",
      "deliveryKey",
      "status",
      "providerErrorCode",
      "cooldownScope",
      "backoffPolicy",
      "observedAt",
      "evidenceProof",
      "executionBoundary",
    ]) && value.deliveryKey === context.deliveryKey &&
      value.status === "passed" && value.providerErrorCode === 131056 &&
      value.cooldownScope === "pair" &&
      value.backoffPolicy === "meta-4-power-x" &&
      timestampIsValid(value.observedAt) &&
      isEvidenceProof(value.evidenceProof) && providerBoundaryIsValid;
  } else if (kind === "duplicate-safety") {
    valid = hasExactKeys(value, [
      "operationKey",
      "deliveryKey",
      "status",
      "queueDeliveryCount",
      "providerRequestCount",
      "observedAt",
      "evidenceProof",
      "executionBoundary",
    ]) && value.deliveryKey === context.deliveryKey &&
      value.status === "passed" &&
      isSafeIntegerInRange(value.queueDeliveryCount, 2, 100) &&
      value.providerRequestCount === 1 && timestampIsValid(value.observedAt) &&
      isEvidenceProof(value.evidenceProof) && providerBoundaryIsValid;
  } else if (kind === "credential-boundary") {
    valid = hasExactKeys(value, [
      "operationKey",
      "source",
      "plaintextExposureFindings",
      "observedAt",
      "evidenceProof",
    ]) && value.source === "encrypted-vault" &&
      value.plaintextExposureFindings === 0 &&
      timestampIsValid(value.observedAt) &&
      isEvidenceProof(value.evidenceProof);
  } else if (kind === "redaction") {
    valid = hasExactKeys(value, [
      "operationKey",
      "testedFieldCount",
      "findings",
      "observedAt",
      "evidenceProof",
    ]) && isSafeIntegerInRange(value.testedFieldCount, 12, 1_000) &&
      value.findings === 0 && timestampIsValid(value.observedAt) &&
      isEvidenceProof(value.evidenceProof);
  } else {
    valid = hasExactKeys(value, [
      "operationKey",
      "deliveryKey",
      "status",
      "providerRequestCount",
      "observedAt",
      "evidenceProof",
      "executionBoundary",
    ]) && value.deliveryKey === context.deliveryKey &&
      value.status === "passed" && value.providerRequestCount === 0 &&
      timestampIsValid(value.observedAt) &&
      isEvidenceProof(value.evidenceProof) && providerBoundaryIsValid;
  }

  if (!valid) {
    fail("BOT_REPLY_STAGING_SCENARIO_OBSERVATION_INVALID");
  }
}

export function createBotReplyStagingScenarioExecutor(
  dependencies: Readonly<BotReplyStagingScenarioExecutorDependencies>,
): BotReplyStagingScenarioExecutor {
  requireDependencies(dependencies);

  return Object.freeze({
    async execute(
      rawRun: Readonly<BotReplyStagingLiveRunInput>,
      rawClaim: Readonly<BotReplyStagingQueueClaim>,
    ): Promise<unknown> {
      let message;
      try {
        message = createBotReplyStagingQueueMessage(rawRun, rawClaim);
      } catch {
        fail("BOT_REPLY_STAGING_SCENARIO_INPUT_INVALID");
      }
      const run = message.run;
      const claim = Object.freeze({
        runKey: message.run.runKey,
        auditKey: message.auditKey,
        claimVersion: message.claimVersion,
        leaseExpiresAt: message.leaseExpiresAt,
      });

      const assetContext = stepContext(run, claim, "assets");
      const assetsResult = await invoke(
        dependencies,
        run,
        claim,
        () => dependencies.driver.inspectAssets(assetContext),
      );
      requireAssetObservation(assetsResult.value, assetContext, run);

      const scenarios = [];
      for (const requirement of botReplyStagingScenarioRequirements) {
        const context = Object.freeze({
          ...stepContext(run, claim, `scenario:${requirement.scenario}`),
          scenario: requirement.scenario,
          expectedProviderErrorCode: requirement.providerErrorCode,
        });
        const result = await invoke(
          dependencies,
          run,
          claim,
          () => dependencies.driver.executeScenario(context),
        );
        requireScenarioObservation(
          result.value,
          context,
          result.currentMilliseconds,
        );
        scenarios.push(Object.freeze({
          scenario: result.value.scenario,
          status: result.value.status,
          providerErrorCode: result.value.providerErrorCode,
          observedAt: result.value.observedAt,
          evidenceProof: result.value.evidenceProof,
        }));
      }

      async function runControl<T>(
        kind:
          | "throughput"
          | "provider-retry"
          | "pair-limit"
          | "duplicate-safety"
          | "credential-boundary"
          | "redaction"
          | "kill-switch",
        action: (
          context: Readonly<BotReplyStagingStepContext>,
        ) => Promise<T>,
      ): Promise<T> {
        const context = stepContext(run, claim, `control:${kind}`);
        const result = await invoke(
          dependencies,
          run,
          claim,
          () => action(context),
        );
        requireControlObservation(
          kind,
          result.value,
          context,
          result.currentMilliseconds,
        );
        return result.value;
      }

      const throughput = await runControl(
        "throughput",
        (context) => dependencies.driver.inspectThroughput(context),
      ) as BotReplyStagingThroughputObservation;
      const providerRetry = await runControl(
        "provider-retry",
        (context) => dependencies.driver.verifyProviderRetry(context),
      ) as BotReplyStagingProviderRetryObservation;
      const pairLimit = await runControl(
        "pair-limit",
        (context) => dependencies.driver.verifyPairLimit(context),
      ) as BotReplyStagingPairLimitObservation;
      const duplicateSafety = await runControl(
        "duplicate-safety",
        (context) => dependencies.driver.verifyDuplicateSafety(context),
      ) as BotReplyStagingDuplicateSafetyObservation;
      const credentialBoundary = await runControl(
        "credential-boundary",
        (context) => dependencies.driver.verifyCredentialBoundary(context),
      ) as BotReplyStagingCredentialBoundaryObservation;
      const redaction = await runControl(
        "redaction",
        (context) => dependencies.driver.verifyRedaction(context),
      ) as BotReplyStagingRedactionObservation;

      // The kill-switch proof is intentionally last. It may disable the
      // current delivery policy, so no provider-capable step may follow it.
      const killSwitch = await runControl(
        "kill-switch",
        (context) => dependencies.driver.verifyKillSwitch(context),
      ) as BotReplyStagingKillSwitchObservation;

      const verifiedAtMilliseconds = nowMilliseconds(dependencies.clock);
      if (verifiedAtMilliseconds > Date.parse(claim.leaseExpiresAt)) {
        fail("BOT_REPLY_STAGING_SCENARIO_LEASE_EXPIRED");
      }
      const receipt = Object.freeze({
        schemaVersion: 1 as const,
        runnerVersion: botReplyStagingRunnerVersion,
        environment: "staging" as const,
        provider: "meta-whatsapp-cloud-api" as const,
        connectionMode: "approved-staging-waba" as const,
        graphApiVersion: assetsResult.value.graphApiVersion,
        verifiedAt: new Date(verifiedAtMilliseconds).toISOString(),
        releaseId: run.releaseId,
        commitSha: run.commitSha,
        artifactDigest: run.artifactDigest,
        assetProofs: Object.freeze({ ...assetsResult.value.assetProofs }),
        scenarios: Object.freeze(scenarios),
        rateLimits: Object.freeze({
          throughput: Object.freeze({
            messagesPerSecond: throughput.messagesPerSecond,
            source: throughput.source,
            observedAt: throughput.observedAt,
            evidenceProof: throughput.evidenceProof,
          }),
          providerRetry: Object.freeze({
            status: providerRetry.status,
            providerErrorCode: providerRetry.providerErrorCode,
            retryAfterSeconds: providerRetry.retryAfterSeconds,
            cooldownScope: providerRetry.cooldownScope,
            observedAt: providerRetry.observedAt,
            evidenceProof: providerRetry.evidenceProof,
          }),
          pairLimit: Object.freeze({
            status: pairLimit.status,
            providerErrorCode: pairLimit.providerErrorCode,
            cooldownScope: pairLimit.cooldownScope,
            backoffPolicy: pairLimit.backoffPolicy,
            observedAt: pairLimit.observedAt,
            evidenceProof: pairLimit.evidenceProof,
          }),
        }),
        killSwitch: Object.freeze({
          status: killSwitch.status,
          providerRequestCount: killSwitch.providerRequestCount,
          observedAt: killSwitch.observedAt,
          evidenceProof: killSwitch.evidenceProof,
        }),
        duplicateSafety: Object.freeze({
          status: duplicateSafety.status,
          queueDeliveryCount: duplicateSafety.queueDeliveryCount,
          providerRequestCount: duplicateSafety.providerRequestCount,
          observedAt: duplicateSafety.observedAt,
          evidenceProof: duplicateSafety.evidenceProof,
        }),
        credentialBoundary: Object.freeze({
          source: credentialBoundary.source,
          plaintextExposureFindings:
            credentialBoundary.plaintextExposureFindings,
          observedAt: credentialBoundary.observedAt,
          evidenceProof: credentialBoundary.evidenceProof,
        }),
        redaction: Object.freeze({
          testedFieldCount: redaction.testedFieldCount,
          findings: redaction.findings,
          observedAt: redaction.observedAt,
          evidenceProof: redaction.evidenceProof,
        }),
      });

      try {
        buildBotReplyStagingEvidenceFromReceipt({
          receipt,
          releaseManifest: Object.freeze({
            schemaVersion: 1,
            releaseId: run.releaseId,
            commitSha: run.commitSha,
          }),
          artifactDigest: run.artifactDigest,
          now: new Date(verifiedAtMilliseconds),
        });
      } catch {
        fail("BOT_REPLY_STAGING_SCENARIO_RECEIPT_INVALID");
      }

      return receipt;
    },
  });
}
