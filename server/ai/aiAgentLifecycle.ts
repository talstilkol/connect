import type {
  AiAgentActivationIssue,
  AiAgentActivationReadiness,
  AiAgentActivationContext,
  AiAgentFallbackEffect,
  AiAgentFallbackReason,
  AiAgentStatus,
  ValidatedAiAgentDefinition,
} from "../../shared/domain/aiAgent.ts";

export type {
  AiAgentActivationIssue,
  AiAgentActivationReadiness,
} from "../../shared/domain/aiAgent.ts";

export type AiAgentLifecycleAction =
  | "publish"
  | "deactivate"
  | "activate";

function pushIssue(
  issues: AiAgentActivationIssue[],
  issue: AiAgentActivationIssue,
): void {
  if (!issues.includes(issue)) {
    issues.push(issue);
  }
}

export function inspectAiAgentActivationReadiness(
  definition: ValidatedAiAgentDefinition,
  context: AiAgentActivationContext,
): AiAgentActivationReadiness {
  const issues: AiAgentActivationIssue[] = [];

  if (!context.providerReady) {
    pushIssue(issues, "provider-required");
  }

  if (!context.billingPolicyApproved) {
    pushIssue(
      issues,
      "billing-policy-required",
    );
  }

  if (!context.handoffPolicyApproved) {
    pushIssue(
      issues,
      "handoff-policy-required",
    );
  }

  if (!context.auditSinkReady) {
    pushIssue(issues, "audit-sink-required");
  }

  if (definition.responseMode === null) {
    pushIssue(
      issues,
      "response-mode-required",
    );
  }

  if (
    definition
      .minimumGroundingScoreBasisPoints === null
  ) {
    pushIssue(
      issues,
      "grounding-threshold-required",
    );
  }

  if (
    definition.monthlyCostLimitMinorUnits ===
      null ||
    definition.billingCurrency === null
  ) {
    pushIssue(issues, "cost-limit-required");
  }

  if (definition.knowledgeSourceKeys.length === 0) {
    pushIssue(
      issues,
      "knowledge-source-required",
    );
  } else {
    const sourceStatuses = new Map<
      string,
      string
    >();
    let duplicateSource = false;

    for (const source of context.knowledgeSources) {
      if (sourceStatuses.has(source.sourceKey)) {
        duplicateSource = true;
      }

      sourceStatuses.set(
        source.sourceKey,
        source.status,
      );
    }

    if (
      duplicateSource ||
      definition.knowledgeSourceKeys.some(
        (sourceKey) =>
          sourceStatuses.get(sourceKey) !== "ready",
      )
    ) {
      pushIssue(
        issues,
        "knowledge-source-not-ready",
      );
    }
  }

  return {
    ready: issues.length === 0,
    issues,
  };
}

export function resolveAiAgentStatusTransition(
  currentStatus: AiAgentStatus,
  action: AiAgentLifecycleAction,
  readiness: AiAgentActivationReadiness,
): AiAgentStatus | null {
  if (action === "deactivate") {
    return currentStatus === "active"
      ? "inactive"
      : null;
  }

  if (!readiness.ready) {
    return null;
  }

  if (
    currentStatus === "draft" &&
    action === "publish"
  ) {
    return "active";
  }

  if (
    currentStatus === "inactive" &&
    action === "activate"
  ) {
    return "active";
  }

  return null;
}

export function resolveAiAgentFallbackEffect(
  reason: AiAgentFallbackReason,
): AiAgentFallbackEffect {
  return {
    outcome: "handoff",
    reason,
    generateReply: false,
    sendReply: false,
    stopAiExecution: true,
    conversationStatus: "waiting_for_agent",
    assignmentAction: "none",
    auditRequired: true,
  };
}
