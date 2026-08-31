import {
  createHmac,
  createSecretKey,
  type KeyObject,
} from "node:crypto";

import type {
  DispatchBotReplyDeliveryResult,
} from "../bot/botReplyDeliveryWorker.ts";
import type {
  BotReplyStagingProviderCase,
  BotReplyStagingProviderKillSwitchResult,
  BotReplyStagingProviderObservationSource,
} from "./botReplyStagingProviderDriver.ts";
import type {
  BotReplyStagingAssetObservation,
  BotReplyStagingCredentialBoundaryObservation,
  BotReplyStagingDuplicateSafetyObservation,
  BotReplyStagingKillSwitchObservation,
  BotReplyStagingPairLimitObservation,
  BotReplyStagingProviderRetryObservation,
  BotReplyStagingRedactionObservation,
  BotReplyStagingScenarioContext,
  BotReplyStagingScenarioObservation,
  BotReplyStagingStepContext,
  BotReplyStagingThroughputObservation,
} from "./botReplyStagingScenarioExecutor.ts";

export const botReplyStagingObservationSourceVersion =
  "connect-bot-reply-staging-observation-source-v1" as const;

export interface BotReplyStagingObservationEnvironment {
  readonly BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1?: string;
}

export interface BotReplyStagingObservationClock {
  now(): Date;
}

interface ObservationBinding {
  readonly schemaVersion: 1;
  readonly runKey: string;
  readonly operationKey: string;
  readonly targetTenantId: number;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly observedAt: string;
  readonly recordDigest: string;
}

export interface BotReplyStagingAssetFact extends ObservationBinding {
  readonly source: "meta-graph-api";
  readonly appId: string;
  readonly businessPortfolioId: string;
  readonly wabaId: string;
  readonly phoneNumberId: string;
}

export interface BotReplyStagingThroughputFact extends ObservationBinding {
  readonly source: "meta-graph-api";
  readonly phoneNumberId: string;
  readonly messagesPerSecond: 20 | 80 | 1_000;
}

interface CaseObservationBinding extends ObservationBinding {
  readonly source: "durable-postgres";
  readonly caseName: BotReplyStagingProviderCase["caseName"];
  readonly deliveryKey: string;
  readonly subjectDeliveryKey: string;
  readonly recipientFingerprint: string;
}

export interface BotReplyStagingScenarioFact extends CaseObservationBinding {
  readonly scenario: BotReplyStagingScenarioContext["scenario"];
  readonly providerErrorCode: number | null;
  readonly dispatchOutcome: DispatchBotReplyDeliveryResult["outcome"] | null;
}

export interface BotReplyStagingProviderRetryFact
  extends CaseObservationBinding {
  readonly providerErrorCode: 130429;
  readonly retryAfterSeconds: number;
  readonly cooldownScope: "sender";
  readonly dispatchOutcome: DispatchBotReplyDeliveryResult["outcome"];
}

export interface BotReplyStagingPairLimitFact extends CaseObservationBinding {
  readonly providerErrorCode: 131056;
  readonly cooldownScope: "pair";
  readonly backoffPolicy: "meta-4-power-x";
  readonly dispatchOutcome: DispatchBotReplyDeliveryResult["outcome"];
}

export interface BotReplyStagingDuplicateSafetyFact
  extends CaseObservationBinding {
  readonly queueDeliveryCount: number;
  readonly providerRequestCount: 1;
  readonly dispatchOutcomes: readonly [
    DispatchBotReplyDeliveryResult["outcome"],
    DispatchBotReplyDeliveryResult["outcome"],
  ];
}

export interface BotReplyStagingKillSwitchFact
  extends CaseObservationBinding {
  readonly disabledPolicyVersion: number;
  readonly policyState: "disabled";
  readonly providerRequestCount: 0;
  readonly dispatchOutcome: DispatchBotReplyDeliveryResult["outcome"];
}

export interface BotReplyStagingCredentialBoundaryFact
  extends ObservationBinding {
  readonly source: "encrypted-vault-audit";
  readonly plaintextExposureFindings: 0;
}

export interface BotReplyStagingRedactionFact extends ObservationBinding {
  readonly source: "durable-telemetry-audit";
  readonly testedFieldCount: number;
  readonly findings: 0;
}

export interface BotReplyStagingGraphObservationReader {
  isConfigured(): boolean;
  readAssets(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingAssetFact>;
  readThroughput(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingThroughputFact>;
}

export interface BotReplyStagingDurableObservationReader {
  isConfigured(): boolean;
  readScenario(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<BotReplyStagingScenarioFact>;
  readProviderRetry(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<BotReplyStagingProviderRetryFact>;
  readPairLimit(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<BotReplyStagingPairLimitFact>;
  readDuplicateSafety(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<BotReplyStagingDuplicateSafetyFact>;
  readKillSwitch(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<BotReplyStagingKillSwitchFact>;
}

export interface BotReplyStagingSecurityObservationReader {
  isConfigured(): boolean;
  readCredentialBoundary(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingCredentialBoundaryFact>;
  readRedaction(
    context: Readonly<BotReplyStagingStepContext>,
  ): Promise<BotReplyStagingRedactionFact>;
}

export interface BotReplyStagingWebhookObservationProducer {
  isConfigured(): boolean;
  recordStatus(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<unknown>;
}

export interface BotReplyStagingProviderDeferralObservationProducer {
  isConfigured(): boolean;
  recordDeferral(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<unknown>;
}

export interface BotReplyStagingSendObservationProducer {
  isConfigured(): boolean;
  recordAcceptedSend(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<unknown>;
  recordButtonReply(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
  ): Promise<unknown>;
  recordServiceWindowRejection(
    context: Readonly<BotReplyStagingScenarioContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<unknown>;
  recordDuplicateSafety(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    dispatches: readonly [
      Readonly<DispatchBotReplyDeliveryResult>,
      Readonly<DispatchBotReplyDeliveryResult>,
    ],
  ): Promise<unknown>;
  recordKillSwitch(
    context: Readonly<BotReplyStagingStepContext>,
    allocatedCase: Readonly<BotReplyStagingProviderCase>,
    disabled: Readonly<BotReplyStagingProviderKillSwitchResult>,
    dispatch: Readonly<DispatchBotReplyDeliveryResult>,
  ): Promise<unknown>;
}

export interface BotReplyStagingObservationSourceDependencies {
  readonly graph: BotReplyStagingGraphObservationReader;
  readonly durable: BotReplyStagingDurableObservationReader;
  readonly security: BotReplyStagingSecurityObservationReader;
  readonly webhook: BotReplyStagingWebhookObservationProducer;
  readonly providerDeferrals: BotReplyStagingProviderDeferralObservationProducer;
  readonly send: BotReplyStagingSendObservationProducer;
}

export type BotReplyStagingObservationSourceErrorCode =
  | "BOT_REPLY_STAGING_OBSERVATION_RUNTIME_UNAVAILABLE"
  | "BOT_REPLY_STAGING_OBSERVATION_CLOCK_INVALID"
  | "BOT_REPLY_STAGING_OBSERVATION_READ_FAILED"
  | "BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID";

export class BotReplyStagingObservationSourceError extends Error {
  readonly code: BotReplyStagingObservationSourceErrorCode;

  constructor(code: BotReplyStagingObservationSourceErrorCode) {
    super(code);
    this.name = "BotReplyStagingObservationSourceError";
    this.code = code;
  }
}

const hmacKeyPattern = /^[A-Za-z0-9+/]{43}=$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const metaAssetIdPattern = /^[1-9][0-9]{0,63}$/;

const bindingKeys = Object.freeze([
  "schemaVersion",
  "runKey",
  "operationKey",
  "targetTenantId",
  "connectionVersion",
  "policyVersion",
  "releaseId",
  "commitSha",
  "artifactDigest",
  "graphApiVersion",
  "observedAt",
  "recordDigest",
] as const);

const caseBindingKeys = Object.freeze([
  ...bindingKeys,
  "source",
  "caseName",
  "deliveryKey",
  "subjectDeliveryKey",
  "recipientFingerprint",
] as const);

function fail(code: BotReplyStagingObservationSourceErrorCode): never {
  throw new BotReplyStagingObservationSourceError(code);
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

function decodeHmacKey(value: unknown): KeyObject | null {
  if (typeof value !== "string") return null;
  const encoded = value.trim();
  if (!hmacKeyPattern.test(encoded)) return null;
  let bytes: Buffer | null = null;
  try {
    bytes = Buffer.from(encoded, "base64");
    if (bytes.byteLength !== 32 || bytes.toString("base64") !== encoded) {
      bytes.fill(0);
      return null;
    }
    const key = createSecretKey(bytes);
    bytes.fill(0);
    return key;
  } catch {
    bytes?.fill(0);
    return null;
  }
}

export function inspectBotReplyStagingObservationHmacConfiguration(
  environment: Readonly<BotReplyStagingObservationEnvironment>,
): "configured" | "invalid" {
  const key = decodeHmacKey(
    environment?.BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1,
  );
  return key === null ? "invalid" : "configured";
}

function nowMilliseconds(clock: Readonly<BotReplyStagingObservationClock>): number {
  let value: Date;
  try {
    value = clock.now();
  } catch {
    fail("BOT_REPLY_STAGING_OBSERVATION_CLOCK_INVALID");
  }
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    fail("BOT_REPLY_STAGING_OBSERVATION_CLOCK_INVALID");
  }
  return value.getTime();
}

function requireDependencies(
  dependencies: Readonly<BotReplyStagingObservationSourceDependencies>,
  clock: Readonly<BotReplyStagingObservationClock>,
): void {
  if (
    !dependencies || typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "durable,graph,providerDeferrals,security,send,webhook" ||
    typeof clock?.now !== "function" ||
    !dependencies.graph || typeof dependencies.graph !== "object" ||
    Object.keys(dependencies.graph).sort().join(",") !==
      "isConfigured,readAssets,readThroughput" ||
    !dependencies.durable || typeof dependencies.durable !== "object" ||
    Object.keys(dependencies.durable).sort().join(",") !==
      "isConfigured,readDuplicateSafety,readKillSwitch,readPairLimit,readProviderRetry,readScenario" ||
    !dependencies.security || typeof dependencies.security !== "object" ||
    Object.keys(dependencies.security).sort().join(",") !==
      "isConfigured,readCredentialBoundary,readRedaction" ||
    !dependencies.webhook || typeof dependencies.webhook !== "object" ||
    Object.keys(dependencies.webhook).sort().join(",") !==
      "isConfigured,recordStatus" ||
    !dependencies.providerDeferrals ||
    typeof dependencies.providerDeferrals !== "object" ||
    Object.keys(dependencies.providerDeferrals).sort().join(",") !==
      "isConfigured,recordDeferral" ||
    !dependencies.send || typeof dependencies.send !== "object" ||
    Object.keys(dependencies.send).sort().join(",") !==
      "isConfigured,recordAcceptedSend,recordButtonReply,recordDuplicateSafety,recordKillSwitch,recordServiceWindowRejection" ||
    Object.values(dependencies).some(
      (reader) => Object.values(reader).some(
        (member) => typeof member !== "function",
      ),
    )
  ) {
    throw new Error("Bot reply staging observation dependencies are invalid");
  }
}

function readersConfigured(
  dependencies: Readonly<BotReplyStagingObservationSourceDependencies>,
): boolean {
  try {
    return dependencies.graph.isConfigured() === true &&
      dependencies.durable.isConfigured() === true &&
      dependencies.security.isConfigured() === true &&
      dependencies.webhook.isConfigured() === true &&
      dependencies.providerDeferrals.isConfigured() === true &&
      dependencies.send.isConfigured() === true;
  } catch {
    return false;
  }
}

function requireRuntime(
  key: KeyObject | null,
  dependencies: Readonly<BotReplyStagingObservationSourceDependencies>,
): KeyObject {
  if (key === null || !readersConfigured(dependencies)) {
    fail("BOT_REPLY_STAGING_OBSERVATION_RUNTIME_UNAVAILABLE");
  }
  return key;
}

async function readFact<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof BotReplyStagingObservationSourceError) throw error;
    fail("BOT_REPLY_STAGING_OBSERVATION_READ_FAILED");
  }
}

function bindingMatches(
  value: Record<string, unknown>,
  context: Readonly<BotReplyStagingStepContext>,
  clock: Readonly<BotReplyStagingObservationClock>,
): value is Record<string, unknown> & ObservationBinding {
  const observedAt = canonicalTimestampMilliseconds(value.observedAt);
  return value.schemaVersion === 1 &&
    value.runKey === context.run.runKey &&
    value.operationKey === context.operationKey &&
    value.targetTenantId === context.run.targetTenantId &&
    value.connectionVersion === context.run.expectedConnectionVersion &&
    value.policyVersion === context.run.expectedPolicyVersion &&
    value.releaseId === context.run.releaseId &&
    value.commitSha === context.run.commitSha &&
    value.artifactDigest === context.run.artifactDigest &&
    value.graphApiVersion === context.run.graphApiVersion &&
    typeof value.recordDigest === "string" &&
    fingerprintPattern.test(value.recordDigest) &&
    observedAt !== null &&
    observedAt >= Date.parse(context.run.requestedAt) &&
    observedAt <= nowMilliseconds(clock) &&
    observedAt <= Date.parse(context.claim.leaseExpiresAt);
}

function caseBindingMatches(
  value: Record<string, unknown>,
  context: Readonly<BotReplyStagingStepContext>,
  allocatedCase: Readonly<BotReplyStagingProviderCase>,
  clock: Readonly<BotReplyStagingObservationClock>,
): boolean {
  return bindingMatches(value, context, clock) &&
    value.source === "durable-postgres" &&
    value.caseName === allocatedCase.caseName &&
    value.deliveryKey === allocatedCase.deliveryKey &&
    value.subjectDeliveryKey === allocatedCase.subjectDeliveryKey &&
    value.recipientFingerprint === allocatedCase.recipientFingerprint &&
    allocatedCase.runKey === context.run.runKey &&
    allocatedCase.operationKey === context.operationKey &&
    allocatedCase.targetTenantId === context.run.targetTenantId &&
    allocatedCase.connectionVersion === context.run.expectedConnectionVersion &&
    allocatedCase.policyVersion === context.run.expectedPolicyVersion &&
    allocatedCase.claimVersion === context.claim.claimVersion &&
    allocatedCase.leaseExpiresAt === context.claim.leaseExpiresAt;
}

function proof(
  key: KeyObject,
  domain: string,
  context: Readonly<BotReplyStagingStepContext>,
  recordDigest: string,
  details: readonly (string | number | null)[],
): string {
  const digest = createHmac("sha256", key)
    .update(botReplyStagingObservationSourceVersion)
    .update("\0")
    .update(domain)
    .update("\0")
    .update(context.run.runKey)
    .update("\0")
    .update(context.operationKey)
    .update("\0")
    .update(context.deliveryKey)
    .update("\0")
    .update(String(context.run.targetTenantId))
    .update("\0")
    .update(String(context.run.expectedConnectionVersion))
    .update("\0")
    .update(String(context.run.expectedPolicyVersion))
    .update("\0")
    .update(context.run.releaseId)
    .update("\0")
    .update(context.run.commitSha)
    .update("\0")
    .update(context.run.artifactDigest)
    .update("\0")
    .update(context.run.graphApiVersion)
    .update("\0")
    .update(recordDigest);
  for (const detail of details) {
    digest.update("\0").update(detail === null ? "null" : String(detail));
  }
  return `bot-reply-staging-proof-v1:${digest.digest("hex")}`;
}

function dispatchOutcome(
  value: Readonly<DispatchBotReplyDeliveryResult> | null,
): DispatchBotReplyDeliveryResult["outcome"] | null {
  return value?.outcome ?? null;
}

export function createBotReplyStagingObservationSource(
  environment: Readonly<BotReplyStagingObservationEnvironment>,
  dependencies: Readonly<BotReplyStagingObservationSourceDependencies>,
  clock: Readonly<BotReplyStagingObservationClock>,
): BotReplyStagingProviderObservationSource {
  requireDependencies(dependencies, clock);
  const key = decodeHmacKey(
    environment?.BOT_REPLY_STAGING_OBSERVATION_HMAC_KEY_V1,
  );

  return Object.freeze({
    isConfigured() {
      return key !== null && readersConfigured(dependencies);
    },

    async inspectAssets(
      context: Readonly<BotReplyStagingStepContext>,
    ): Promise<BotReplyStagingAssetObservation> {
      const activeKey = requireRuntime(key, dependencies);
      const fact = await readFact(() => dependencies.graph.readAssets(context));
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...bindingKeys,
          "source",
          "appId",
          "businessPortfolioId",
          "wabaId",
          "phoneNumberId",
        ]) ||
        !bindingMatches(fact, context, clock) ||
        fact.source !== "meta-graph-api" ||
        typeof fact.appId !== "string" || !metaAssetIdPattern.test(fact.appId) ||
        typeof fact.businessPortfolioId !== "string" ||
        !metaAssetIdPattern.test(fact.businessPortfolioId) ||
        typeof fact.wabaId !== "string" || !metaAssetIdPattern.test(fact.wabaId) ||
        typeof fact.phoneNumberId !== "string" ||
        !metaAssetIdPattern.test(fact.phoneNumberId)
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        graphApiVersion: context.run.graphApiVersion,
        assetProofs: Object.freeze({
          app: proof(activeKey, "asset:app", context, fact.recordDigest, [fact.appId]),
          waba: proof(activeKey, "asset:waba", context, fact.recordDigest, [
            fact.businessPortfolioId,
            fact.wabaId,
          ]),
          phoneNumber: proof(activeKey, "asset:phone", context, fact.recordDigest, [
            fact.wabaId,
            fact.phoneNumberId,
          ]),
        }),
      });
    },

    async observeScenario(
      context: Readonly<BotReplyStagingScenarioContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      dispatch: Readonly<DispatchBotReplyDeliveryResult> | null,
    ): Promise<BotReplyStagingScenarioObservation> {
      const activeKey = requireRuntime(key, dependencies);
      if (
        (context.scenario === "text-send" ||
          context.scenario === "button-send") &&
        dispatch !== null
      ) {
        await readFact(() => dependencies.send.recordAcceptedSend(
          context,
          allocatedCase,
          dispatch,
        ));
      }
      if (context.scenario === "button-reply") {
        await readFact(() => dependencies.send.recordButtonReply(
          context,
          allocatedCase,
        ));
      }
      if (
        context.scenario === "customer-window-expired" &&
        dispatch !== null
      ) {
        await readFact(() =>
          dependencies.send.recordServiceWindowRejection(
            context,
            allocatedCase,
            dispatch,
          )
        );
      }
      if (
        context.scenario === "status-sent" ||
        context.scenario === "status-delivered" ||
        context.scenario === "status-read"
      ) {
        await readFact(() =>
          dependencies.webhook.recordStatus(context, allocatedCase)
        );
      }
      const fact = await readFact(() =>
        dependencies.durable.readScenario(context, allocatedCase)
      );
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...caseBindingKeys,
          "scenario",
          "providerErrorCode",
          "dispatchOutcome",
        ]) ||
        !caseBindingMatches(fact, context, allocatedCase, clock) ||
        fact.scenario !== context.scenario ||
        fact.providerErrorCode !== context.expectedProviderErrorCode ||
        fact.dispatchOutcome !== dispatchOutcome(dispatch)
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        scenario: context.scenario,
        status: "passed",
        providerErrorCode: context.expectedProviderErrorCode,
        observedAt: fact.observedAt,
        evidenceProof: proof(activeKey, `scenario:${context.scenario}`, context, fact.recordDigest, [
          allocatedCase.caseFingerprint,
          context.expectedProviderErrorCode,
          fact.dispatchOutcome as string | null,
        ]),
        executionBoundary: "railway-bot-reply-worker",
      });
    },

    async inspectThroughput(
      context: Readonly<BotReplyStagingStepContext>,
    ): Promise<BotReplyStagingThroughputObservation> {
      const activeKey = requireRuntime(key, dependencies);
      const fact = await readFact(() => dependencies.graph.readThroughput(context));
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...bindingKeys,
          "source",
          "phoneNumberId",
          "messagesPerSecond",
        ]) ||
        !bindingMatches(fact, context, clock) ||
        fact.source !== "meta-graph-api" ||
        typeof fact.phoneNumberId !== "string" ||
        !metaAssetIdPattern.test(fact.phoneNumberId) ||
        (fact.messagesPerSecond !== 20 && fact.messagesPerSecond !== 80 &&
          fact.messagesPerSecond !== 1_000)
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        messagesPerSecond: fact.messagesPerSecond,
        source: "graph-api",
        observedAt: fact.observedAt,
        evidenceProof: proof(activeKey, "throughput", context, fact.recordDigest, [
          fact.phoneNumberId,
          fact.messagesPerSecond,
        ]),
      });
    },

    async observeProviderRetry(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      dispatch: Readonly<DispatchBotReplyDeliveryResult>,
    ): Promise<BotReplyStagingProviderRetryObservation> {
      const activeKey = requireRuntime(key, dependencies);
      await readFact(() => dependencies.providerDeferrals.recordDeferral(
        context,
        allocatedCase,
        dispatch,
      ));
      const fact = await readFact(() =>
        dependencies.durable.readProviderRetry(context, allocatedCase)
      );
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...caseBindingKeys,
          "providerErrorCode",
          "retryAfterSeconds",
          "cooldownScope",
          "dispatchOutcome",
        ]) ||
        !caseBindingMatches(fact, context, allocatedCase, clock) ||
        fact.providerErrorCode !== 130429 || fact.cooldownScope !== "sender" ||
        !positiveInteger(fact.retryAfterSeconds) || fact.retryAfterSeconds > 86_400 ||
        fact.dispatchOutcome !== dispatch.outcome
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        providerErrorCode: 130429,
        retryAfterSeconds: fact.retryAfterSeconds,
        cooldownScope: "sender",
        observedAt: fact.observedAt,
        evidenceProof: proof(activeKey, "provider-retry", context, fact.recordDigest, [
          allocatedCase.caseFingerprint,
          fact.retryAfterSeconds,
          fact.dispatchOutcome,
        ]),
        executionBoundary: "railway-bot-reply-worker",
      });
    },

    async observePairLimit(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      dispatch: Readonly<DispatchBotReplyDeliveryResult>,
    ): Promise<BotReplyStagingPairLimitObservation> {
      const activeKey = requireRuntime(key, dependencies);
      await readFact(() => dependencies.providerDeferrals.recordDeferral(
        context,
        allocatedCase,
        dispatch,
      ));
      const fact = await readFact(() =>
        dependencies.durable.readPairLimit(context, allocatedCase)
      );
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...caseBindingKeys,
          "providerErrorCode",
          "cooldownScope",
          "backoffPolicy",
          "dispatchOutcome",
        ]) ||
        !caseBindingMatches(fact, context, allocatedCase, clock) ||
        fact.providerErrorCode !== 131056 || fact.cooldownScope !== "pair" ||
        fact.backoffPolicy !== "meta-4-power-x" ||
        fact.dispatchOutcome !== dispatch.outcome
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        providerErrorCode: 131056,
        cooldownScope: "pair",
        backoffPolicy: "meta-4-power-x",
        observedAt: fact.observedAt,
        evidenceProof: proof(activeKey, "pair-limit", context, fact.recordDigest, [
          allocatedCase.caseFingerprint,
          fact.dispatchOutcome,
        ]),
        executionBoundary: "railway-bot-reply-worker",
      });
    },

    async observeDuplicateSafety(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      dispatches: readonly [
        Readonly<DispatchBotReplyDeliveryResult>,
        Readonly<DispatchBotReplyDeliveryResult>,
      ],
    ): Promise<BotReplyStagingDuplicateSafetyObservation> {
      const activeKey = requireRuntime(key, dependencies);
      await readFact(() =>
        dependencies.send.recordDuplicateSafety(
          context,
          allocatedCase,
          dispatches,
        )
      );
      const fact = await readFact(() =>
        dependencies.durable.readDuplicateSafety(context, allocatedCase)
      );
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...caseBindingKeys,
          "queueDeliveryCount",
          "providerRequestCount",
          "dispatchOutcomes",
        ]) ||
        !caseBindingMatches(fact, context, allocatedCase, clock) ||
        !positiveInteger(fact.queueDeliveryCount) ||
        fact.queueDeliveryCount < 2 || fact.queueDeliveryCount > 100 ||
        fact.providerRequestCount !== 1 ||
        !Array.isArray(fact.dispatchOutcomes) || fact.dispatchOutcomes.length !== 2 ||
        fact.dispatchOutcomes[0] !== dispatches[0].outcome ||
        fact.dispatchOutcomes[1] !== dispatches[1].outcome
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        queueDeliveryCount: fact.queueDeliveryCount,
        providerRequestCount: 1,
        observedAt: fact.observedAt,
        evidenceProof: proof(activeKey, "duplicate-safety", context, fact.recordDigest, [
          allocatedCase.caseFingerprint,
          fact.queueDeliveryCount,
          fact.dispatchOutcomes[0] as string,
          fact.dispatchOutcomes[1] as string,
        ]),
        executionBoundary: "railway-bot-reply-worker",
      });
    },

    async inspectCredentialBoundary(
      context: Readonly<BotReplyStagingStepContext>,
    ): Promise<BotReplyStagingCredentialBoundaryObservation> {
      const activeKey = requireRuntime(key, dependencies);
      const fact = await readFact(() =>
        dependencies.security.readCredentialBoundary(context)
      );
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...bindingKeys,
          "source",
          "plaintextExposureFindings",
        ]) ||
        !bindingMatches(fact, context, clock) ||
        fact.source !== "encrypted-vault-audit" ||
        fact.plaintextExposureFindings !== 0
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        source: "encrypted-vault",
        plaintextExposureFindings: 0,
        observedAt: fact.observedAt,
        evidenceProof: proof(activeKey, "credential-boundary", context, fact.recordDigest, [0]),
      });
    },

    async inspectRedaction(
      context: Readonly<BotReplyStagingStepContext>,
    ): Promise<BotReplyStagingRedactionObservation> {
      const activeKey = requireRuntime(key, dependencies);
      const fact = await readFact(() => dependencies.security.readRedaction(context));
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...bindingKeys,
          "source",
          "testedFieldCount",
          "findings",
        ]) ||
        !bindingMatches(fact, context, clock) ||
        fact.source !== "durable-telemetry-audit" ||
        !positiveInteger(fact.testedFieldCount) || fact.testedFieldCount < 12 ||
        fact.testedFieldCount > 1_000 || fact.findings !== 0
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        testedFieldCount: fact.testedFieldCount,
        findings: 0,
        observedAt: fact.observedAt,
        evidenceProof: proof(
          activeKey,
          "redaction",
          context,
          fact.recordDigest,
          [fact.testedFieldCount, 0],
        ),
      });
    },

    async observeKillSwitch(
      context: Readonly<BotReplyStagingStepContext>,
      allocatedCase: Readonly<BotReplyStagingProviderCase>,
      disabled: Readonly<BotReplyStagingProviderKillSwitchResult>,
      dispatch: Readonly<DispatchBotReplyDeliveryResult>,
    ): Promise<BotReplyStagingKillSwitchObservation> {
      const activeKey = requireRuntime(key, dependencies);
      await readFact(() =>
        dependencies.send.recordKillSwitch(
          context,
          allocatedCase,
          disabled,
          dispatch,
        )
      );
      const fact = await readFact(() =>
        dependencies.durable.readKillSwitch(context, allocatedCase)
      );
      if (
        !isRecord(fact) ||
        !hasExactKeys(fact, [
          ...caseBindingKeys,
          "disabledPolicyVersion",
          "policyState",
          "providerRequestCount",
          "dispatchOutcome",
        ]) ||
        !caseBindingMatches(fact, context, allocatedCase, clock) ||
        fact.disabledPolicyVersion !== disabled.disabledPolicyVersion ||
        fact.policyState !== "disabled" || fact.providerRequestCount !== 0 ||
        fact.dispatchOutcome !== dispatch.outcome ||
        disabled.operationKey !== context.operationKey ||
        disabled.deliveryKey !== context.deliveryKey ||
        disabled.targetTenantId !== context.run.targetTenantId ||
        disabled.previousPolicyVersion !== context.run.expectedPolicyVersion ||
        disabled.state !== "disabled"
      ) {
        fail("BOT_REPLY_STAGING_OBSERVATION_FACT_INVALID");
      }
      return Object.freeze({
        operationKey: context.operationKey,
        deliveryKey: context.deliveryKey,
        status: "passed",
        providerRequestCount: 0,
        observedAt: fact.observedAt,
        evidenceProof: proof(activeKey, "kill-switch", context, fact.recordDigest, [
          allocatedCase.caseFingerprint,
          disabled.disabledPolicyVersion,
          fact.dispatchOutcome,
        ]),
        executionBoundary: "railway-bot-reply-worker",
      });
    },
  });
}
