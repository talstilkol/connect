import type {
  AiReplyApprovalDecisionView,
  AiReplyApprovalDirectoryView,
  AiReplyApprovalView,
} from "../../shared/domain/aiReplyApprovalView.ts";

const outboxKeyPattern = /^ai_reply_outbox_v1_[0-9a-f]{64}$/;
const conversationKeyPattern = /^conversation_v1_[0-9a-f]{64}$/;
const unsafeControlCharacters =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isBoundedNonnegativeInteger(
  value: unknown,
  maximum: number,
): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 &&
    Number(value) <= maximum;
}

function isCanonicalTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value;
}

export function parseRailwayAiReplyApprovalView(
  value: unknown,
): Readonly<AiReplyApprovalView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "conversationKey",
      "createdAt",
      "groundedSourceCount",
      "groundingScoreBasisPoints",
      "outboxKey",
      "replyText",
      "version",
    ]) ||
    typeof value.outboxKey !== "string" ||
    !outboxKeyPattern.test(value.outboxKey) ||
    typeof value.conversationKey !== "string" ||
    !conversationKeyPattern.test(value.conversationKey) ||
    typeof value.replyText !== "string" ||
    value.replyText.trim().length === 0 ||
    value.replyText.length > 4_096 ||
    unsafeControlCharacters.test(value.replyText) ||
    !isPositiveInteger(value.groundedSourceCount) ||
    value.groundedSourceCount > 100 ||
    !isBoundedNonnegativeInteger(value.groundingScoreBasisPoints, 10_000) ||
    !isPositiveInteger(value.version) ||
    !isCanonicalTimestamp(value.createdAt)
  ) {
    return null;
  }

  return Object.freeze({
    outboxKey: value.outboxKey,
    conversationKey: value.conversationKey,
    replyText: value.replyText,
    groundedSourceCount: value.groundedSourceCount,
    groundingScoreBasisPoints: value.groundingScoreBasisPoints,
    version: value.version,
    createdAt: value.createdAt,
  });
}

export function parseRailwayAiReplyApprovalDirectory(
  value: unknown,
): Readonly<AiReplyApprovalDirectoryView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["approvals", "canDecide"]) ||
    !Array.isArray(value.approvals) ||
    value.approvals.length > 50 ||
    typeof value.canDecide !== "boolean"
  ) {
    return null;
  }

  const approvals: Readonly<AiReplyApprovalView>[] = [];
  const keys = new Set<string>();
  for (const candidate of value.approvals) {
    const approval = parseRailwayAiReplyApprovalView(candidate);
    if (approval === null || keys.has(approval.outboxKey)) {
      return null;
    }
    const previous = approvals.at(-1);
    if (
      previous &&
      (previous.createdAt > approval.createdAt ||
        (previous.createdAt === approval.createdAt &&
          previous.outboxKey >= approval.outboxKey))
    ) {
      return null;
    }
    keys.add(approval.outboxKey);
    approvals.push(approval);
  }

  return Object.freeze({
    approvals: Object.freeze(approvals),
    canDecide: value.canDecide,
  });
}

export function parseRailwayAiReplyApprovalDecisionView(
  value: unknown,
): Readonly<AiReplyApprovalDecisionView> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["outboxKey", "status", "version"]) ||
    typeof value.outboxKey !== "string" ||
    !outboxKeyPattern.test(value.outboxKey) ||
    (value.status !== "ready-for-delivery" && value.status !== "rejected") ||
    !isPositiveInteger(value.version)
  ) {
    return null;
  }

  return Object.freeze({
    outboxKey: value.outboxKey,
    status: value.status,
    version: value.version,
  });
}
