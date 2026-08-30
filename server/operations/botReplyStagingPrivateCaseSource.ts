import {
  createHash,
  createHmac,
} from "node:crypto";

import type {
  BotReplyPayload,
} from "../../shared/domain/botReplyDelivery.ts";
import type {
  BotReplyStagingPrivateCaseDefinition,
  BotReplyStagingPrivateCaseSource,
} from "./botReplyStagingProviderCaseInventory.ts";
import type {
  BotReplyStagingProviderCaseName,
  BotReplyStagingProviderCaseRequest,
} from "./botReplyStagingProviderDriver.ts";

export const botReplyStagingPrivateCaseSourceVersion =
  "connect-bot-reply-staging-private-case-source-v1" as const;

export interface BotReplyStagingPrivateCaseEnvironment {
  readonly APP_RUNTIME_ENVIRONMENT?: string;
  readonly APP_RELEASE_ID?: string;
  readonly APP_DEPLOYED_COMMIT_SHA?: string;
  readonly APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
  readonly META_GRAPH_API_VERSION?: string;
  readonly BOT_REPLY_STAGING_TENANT_ID?: string;
  readonly BOT_REPLY_STAGING_PRIVATE_CASES_JSON?: string;
  readonly BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1?: string;
}

export interface BotReplyStagingPrivateCaseClock {
  now(): Date;
}

type PrivateDelivery = BotReplyStagingPrivateCaseDefinition["delivery"];

interface PrivateCase {
  readonly caseName: BotReplyStagingProviderCaseName;
  readonly subjectCaseName: BotReplyStagingProviderCaseName;
  readonly recipientPhoneNumber: string;
  readonly delivery: PrivateDelivery;
}

interface PrivateCaseInventory {
  readonly targetTenantId: number;
  readonly connectionVersion: number;
  readonly policyVersion: number;
  readonly releaseId: string;
  readonly commitSha: string;
  readonly artifactDigest: string;
  readonly graphApiVersion: string;
  readonly preparedAt: string;
  readonly expiresAt: string;
  readonly inventoryAuthentication: string;
  readonly cases: readonly PrivateCase[];
}

const maximumInventoryBytes = 65_536;
const maximumInventoryLifetimeMilliseconds = 2 * 60 * 60 * 1_000;
const releaseIdPattern = /^connect_release_v1_[a-f0-9]{64}$/;
const commitShaPattern = /^[a-f0-9]{40}$/;
const fingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const graphApiVersionPattern = /^v[1-9][0-9]{0,2}\.0$/;
const phoneNumberPattern = /^\+[1-9][0-9]{0,14}$/;
const conversationKeyPattern = /^conversation_v1_[a-f0-9]{64}$/;
const messageKeyPattern = /^message_v1_[a-f0-9]{64}$/;
const botFlowKeyPattern = /^bot_flow_v1_[a-f0-9]{64}$/;
const botFlowVersionKeyPattern = /^bot_flow_version_v1_[a-f0-9]{64}$/;
const botOptionKeyPattern = /^bot_option_v1_[a-f0-9]{64}$/;
const senderPhoneNumberIdPattern = /^[1-9][0-9]{0,63}$/;
const hmacKeyPattern = /^[A-Za-z0-9+/]{43}=$/;
const unsafeControlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const caseRequirements = Object.freeze([
  Object.freeze({ caseName: "text-send", subjectCaseName: "text-send" }),
  Object.freeze({ caseName: "button-send", subjectCaseName: "button-send" }),
  Object.freeze({ caseName: "button-reply", subjectCaseName: "button-send" }),
  Object.freeze({ caseName: "status-sent", subjectCaseName: "button-send" }),
  Object.freeze({
    caseName: "status-delivered",
    subjectCaseName: "button-send",
  }),
  Object.freeze({ caseName: "status-read", subjectCaseName: "button-send" }),
  Object.freeze({
    caseName: "customer-window-expired",
    subjectCaseName: "customer-window-expired",
  }),
  Object.freeze({ caseName: "provider-retry", subjectCaseName: "provider-retry" }),
  Object.freeze({ caseName: "pair-limit", subjectCaseName: "pair-limit" }),
  Object.freeze({
    caseName: "duplicate-safety",
    subjectCaseName: "duplicate-safety",
  }),
  Object.freeze({ caseName: "kill-switch", subjectCaseName: "kill-switch" }),
] as const);

const rootKeys = Object.freeze([
  "schemaVersion",
  "source",
  "environment",
  "releaseId",
  "commitSha",
  "artifactDigest",
  "graphApiVersion",
  "targetTenantId",
  "connectionVersion",
  "policyVersion",
  "preparedAt",
  "expiresAt",
  "cases",
] as const);
const caseKeys = Object.freeze([
  "caseName",
  "subjectCaseName",
  "recipientPhoneNumber",
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

function parsePositiveInteger(value: unknown): number | null {
  if (
    typeof value !== "string" || !/^[1-9][0-9]{0,14}$/.test(value)
  ) {
    return null;
  }
  const parsed = Number(value);
  return positiveInteger(parsed) ? parsed : null;
}

function decodeHmacKey(value: unknown): Buffer | null {
  if (typeof value !== "string") return null;
  const encoded = value.trim();
  if (!hmacKeyPattern.test(encoded)) return null;
  try {
    const key = Buffer.from(encoded, "base64");
    if (key.byteLength !== 32 || key.toString("base64") !== encoded) {
      key.fill(0);
      return null;
    }
    return key;
  } catch {
    return null;
  }
}

function parseReply(value: unknown): BotReplyPayload | null {
  if (!isRecord(value)) return null;
  if (
    value.kind === "text" && hasExactKeys(value, ["kind", "text"]) &&
    typeof value.text === "string" && value.text.trim().length > 0 &&
    value.text.length <= 4_096 && !unsafeControlCharacters.test(value.text)
  ) {
    return Object.freeze({ kind: "text" as const, text: value.text });
  }
  if (
    value.kind !== "buttons" ||
    !hasExactKeys(value, ["kind", "text", "options"]) ||
    typeof value.text !== "string" || value.text.trim().length === 0 ||
    value.text.length > 4_096 || unsafeControlCharacters.test(value.text) ||
    !Array.isArray(value.options) || value.options.length < 1 ||
    value.options.length > 3
  ) {
    return null;
  }
  const optionKeys = new Set<string>();
  const labels = new Set<string>();
  const options: { optionKey: string; label: string }[] = [];
  for (const option of value.options) {
    if (
      !isRecord(option) || !hasExactKeys(option, ["optionKey", "label"]) ||
      typeof option.optionKey !== "string" ||
      !botOptionKeyPattern.test(option.optionKey) ||
      optionKeys.has(option.optionKey) || typeof option.label !== "string" ||
      option.label.trim().length === 0 || option.label.length > 20 ||
      unsafeControlCharacters.test(option.label)
    ) {
      return null;
    }
    const comparableLabel = option.label.toLocaleLowerCase("und");
    if (labels.has(comparableLabel)) return null;
    optionKeys.add(option.optionKey);
    labels.add(comparableLabel);
    options.push(Object.freeze({
      optionKey: option.optionKey,
      label: option.label,
    }));
  }
  return Object.freeze({
    kind: "buttons" as const,
    text: value.text,
    options: Object.freeze(options),
  });
}

function parseDelivery(value: unknown): PrivateDelivery | null {
  if (
    !isRecord(value) || !hasExactKeys(value, deliveryKeys) ||
    typeof value.conversationKey !== "string" ||
    !conversationKeyPattern.test(value.conversationKey) ||
    typeof value.inboundMessageKey !== "string" ||
    !messageKeyPattern.test(value.inboundMessageKey) ||
    typeof value.botFlowKey !== "string" ||
    !botFlowKeyPattern.test(value.botFlowKey) ||
    typeof value.botFlowVersionKey !== "string" ||
    !botFlowVersionKeyPattern.test(value.botFlowVersionKey) ||
    !positiveInteger(value.replyIndex) ||
    typeof value.senderPhoneNumberId !== "string" ||
    !senderPhoneNumberIdPattern.test(value.senderPhoneNumberId)
  ) {
    return null;
  }
  const reply = parseReply(value.reply);
  if (reply === null) return null;
  return Object.freeze({
    conversationKey: value.conversationKey,
    inboundMessageKey: value.inboundMessageKey,
    botFlowKey: value.botFlowKey,
    botFlowVersionKey: value.botFlowVersionKey,
    replyIndex: value.replyIndex,
    senderPhoneNumberId: value.senderPhoneNumberId,
    reply,
  });
}

function parseCase(
  value: unknown,
  requirement: (typeof caseRequirements)[number],
): PrivateCase | null {
  if (
    !isRecord(value) || !hasExactKeys(value, caseKeys) ||
    value.caseName !== requirement.caseName ||
    value.subjectCaseName !== requirement.subjectCaseName ||
    typeof value.recipientPhoneNumber !== "string" ||
    !phoneNumberPattern.test(value.recipientPhoneNumber)
  ) {
    return null;
  }
  const delivery = parseDelivery(value.delivery);
  if (
    delivery === null ||
    (requirement.subjectCaseName === "button-send"
      ? delivery.reply.kind !== "buttons"
      : delivery.reply.kind !== "text")
  ) {
    return null;
  }
  return Object.freeze({
    caseName: requirement.caseName,
    subjectCaseName: requirement.subjectCaseName,
    recipientPhoneNumber: value.recipientPhoneNumber,
    delivery,
  });
}

function samePrivateSubject(left: PrivateCase, right: PrivateCase): boolean {
  return left.recipientPhoneNumber === right.recipientPhoneNumber &&
    JSON.stringify(left.delivery) === JSON.stringify(right.delivery);
}

function parseInventory(
  environment: Readonly<BotReplyStagingPrivateCaseEnvironment>,
): PrivateCaseInventory | null {
  if (
    !environment || typeof environment !== "object" ||
    environment.APP_RUNTIME_ENVIRONMENT !== "staging" ||
    typeof environment.BOT_REPLY_STAGING_PRIVATE_CASES_JSON !== "string" ||
    environment.BOT_REPLY_STAGING_PRIVATE_CASES_JSON.length === 0 ||
    Buffer.byteLength(
      environment.BOT_REPLY_STAGING_PRIVATE_CASES_JSON,
      "utf8",
    ) > maximumInventoryBytes
  ) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(environment.BOT_REPLY_STAGING_PRIVATE_CASES_JSON);
  } catch {
    return null;
  }
  const targetTenantId = parsePositiveInteger(
    environment.BOT_REPLY_STAGING_TENANT_ID,
  );
  const hmacKey = decodeHmacKey(
    environment.BOT_REPLY_STAGING_RECIPIENT_HMAC_KEY_V1,
  );
  if (
    !isRecord(value) || !hasExactKeys(value, rootKeys) ||
    value.schemaVersion !== 1 || value.source !== "private-staging-inventory" ||
    value.environment !== "staging" || targetTenantId === null ||
    hmacKey === null ||
    value.targetTenantId !== targetTenantId ||
    value.releaseId !== environment.APP_RELEASE_ID ||
    typeof value.releaseId !== "string" ||
    !releaseIdPattern.test(value.releaseId) ||
    value.commitSha !== environment.APP_DEPLOYED_COMMIT_SHA ||
    typeof value.commitSha !== "string" ||
    !commitShaPattern.test(value.commitSha) ||
    value.artifactDigest !== environment.APP_DEPLOYMENT_ARTIFACT_DIGEST ||
    typeof value.artifactDigest !== "string" ||
    !fingerprintPattern.test(value.artifactDigest) ||
    value.graphApiVersion !== environment.META_GRAPH_API_VERSION ||
    typeof value.graphApiVersion !== "string" ||
    !graphApiVersionPattern.test(value.graphApiVersion) ||
    !positiveInteger(value.connectionVersion) ||
    !positiveInteger(value.policyVersion) || !Array.isArray(value.cases) ||
    value.cases.length !== caseRequirements.length
  ) {
    hmacKey?.fill(0);
    return null;
  }
  const preparedAt = canonicalTimestampMilliseconds(value.preparedAt);
  const expiresAt = canonicalTimestampMilliseconds(value.expiresAt);
  if (
    preparedAt === null || expiresAt === null || expiresAt <= preparedAt ||
    expiresAt - preparedAt > maximumInventoryLifetimeMilliseconds
  ) {
    hmacKey.fill(0);
    return null;
  }
  const cases: PrivateCase[] = [];
  for (let index = 0; index < caseRequirements.length; index += 1) {
    const parsed = parseCase(value.cases[index], caseRequirements[index]);
    if (parsed === null) {
      hmacKey.fill(0);
      return null;
    }
    cases.push(parsed);
  }
  const buttonSubject = cases[1];
  if (
    buttonSubject === undefined ||
    cases.slice(2, 6).some((candidate) =>
      !samePrivateSubject(buttonSubject, candidate)
    )
  ) {
    hmacKey.fill(0);
    return null;
  }
  const dispatchIdentity = new Set<string>();
  for (const candidate of [cases[0], cases[1], ...cases.slice(6)]) {
    if (candidate === undefined) {
      hmacKey.fill(0);
      return null;
    }
    const identity = `${candidate.delivery.inboundMessageKey}:` +
      `${candidate.delivery.replyIndex}`;
    if (dispatchIdentity.has(identity)) {
      hmacKey.fill(0);
      return null;
    }
    dispatchIdentity.add(identity);
  }
  const inventoryAuthentication = createHmac("sha256", hmacKey)
    .update(environment.BOT_REPLY_STAGING_PRIVATE_CASES_JSON, "utf8")
    .digest("hex");
  hmacKey.fill(0);
  return Object.freeze({
    targetTenantId,
    connectionVersion: value.connectionVersion,
    policyVersion: value.policyVersion,
    releaseId: value.releaseId,
    commitSha: value.commitSha,
    artifactDigest: value.artifactDigest,
    graphApiVersion: value.graphApiVersion,
    preparedAt: value.preparedAt as string,
    expiresAt: value.expiresAt as string,
    inventoryAuthentication,
    cases: Object.freeze(cases),
  });
}

function active(
  inventory: Readonly<PrivateCaseInventory> | null,
  clock: Readonly<BotReplyStagingPrivateCaseClock>,
): inventory is Readonly<PrivateCaseInventory> {
  if (inventory === null) return false;
  try {
    const now = clock.now();
    const nowMilliseconds = now.getTime();
    return Number.isFinite(nowMilliseconds) &&
      now.toISOString() === new Date(nowMilliseconds).toISOString() &&
      nowMilliseconds >= Date.parse(inventory.preparedAt) &&
      nowMilliseconds < Date.parse(inventory.expiresAt);
  } catch {
    return false;
  }
}

function requestMatches(
  request: Readonly<BotReplyStagingProviderCaseRequest>,
  inventory: Readonly<PrivateCaseInventory>,
): boolean {
  return request.targetTenantId === inventory.targetTenantId &&
    request.connectionVersion === inventory.connectionVersion &&
    request.policyVersion === inventory.policyVersion &&
    request.releaseId === inventory.releaseId &&
    request.commitSha === inventory.commitSha &&
    request.artifactDigest === inventory.artifactDigest &&
    request.graphApiVersion === inventory.graphApiVersion &&
    canonicalTimestampMilliseconds(request.leaseExpiresAt) !== null &&
    Date.parse(request.leaseExpiresAt) <= Date.parse(inventory.expiresAt);
}

function caseFingerprint(
  inventory: Readonly<PrivateCaseInventory>,
  caseName: BotReplyStagingProviderCaseName,
): string {
  return `sha256:${createHash("sha256").update(JSON.stringify({
    sourceVersion: botReplyStagingPrivateCaseSourceVersion,
    inventoryAuthentication: inventory.inventoryAuthentication,
    caseName,
  })).digest("hex")}`;
}

export function createBotReplyStagingPrivateCaseSource(
  environment: Readonly<BotReplyStagingPrivateCaseEnvironment>,
  clock: Readonly<BotReplyStagingPrivateCaseClock>,
): Readonly<BotReplyStagingPrivateCaseSource> {
  if (!clock || typeof clock.now !== "function") {
    throw new Error("Bot reply staging private case clock is invalid");
  }
  const inventory = parseInventory(environment);
  return Object.freeze({
    isConfigured() {
      return active(inventory, clock);
    },
    async resolve(request: Readonly<BotReplyStagingProviderCaseRequest>) {
      if (!active(inventory, clock) || !requestMatches(request, inventory)) {
        throw new Error("Bot reply staging private case is unavailable");
      }
      const resolved = inventory.cases.find(
        (candidate) => candidate.caseName === request.caseName,
      );
      if (resolved === undefined) {
        throw new Error("Bot reply staging private case is unavailable");
      }
      return Object.freeze({
        schemaVersion: 1 as const,
        source: "private-staging-inventory" as const,
        caseName: resolved.caseName,
        subjectCaseName: resolved.subjectCaseName,
        targetTenantId: inventory.targetTenantId,
        connectionVersion: inventory.connectionVersion,
        policyVersion: inventory.policyVersion,
        releaseId: inventory.releaseId,
        commitSha: inventory.commitSha,
        artifactDigest: inventory.artifactDigest,
        graphApiVersion: inventory.graphApiVersion,
        recipientPhoneNumber: resolved.recipientPhoneNumber,
        inventoryExpiresAt: inventory.expiresAt,
        caseFingerprint: caseFingerprint(inventory, resolved.caseName),
        delivery: resolved.delivery,
      });
    },
  });
}
