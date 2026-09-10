import {
  decideMetaMessageFailure,
} from "../meta/metaMessageFailurePolicy.ts";
import type {
  MetaCampaignDeliveryRetryPolicy,
  MetaCampaignDeliveryRetryPolicyRequest,
} from "./metaCampaignDeliveryProcessor.ts";

export interface MetaCampaignDeliveryRetryEvidence {
  providerRetryAfterSeconds: number | null;
  pairFailureExponent: number | null;
}

export interface MetaCampaignDeliveryRetryEvidenceSource {
  isConfigured(): boolean;
  load(
    request: MetaCampaignDeliveryRetryPolicyRequest,
  ):
    | MetaCampaignDeliveryRetryEvidence
    | null
    | Promise<MetaCampaignDeliveryRetryEvidence | null>;
}

function sourceIsConfigured(
  source: MetaCampaignDeliveryRetryEvidenceSource,
): boolean {
  try {
    return source.isConfigured() === true;
  } catch {
    return false;
  }
}

function normalizedEvidence(
  value: MetaCampaignDeliveryRetryEvidence | null,
): MetaCampaignDeliveryRetryEvidence | null {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).sort().join(",") !==
      "pairFailureExponent,providerRetryAfterSeconds" ||
    (
      value.providerRetryAfterSeconds !== null &&
      (
        !Number.isSafeInteger(
          value.providerRetryAfterSeconds,
        ) ||
        value.providerRetryAfterSeconds <= 0
      )
    ) ||
    (
      value.pairFailureExponent !== null &&
      (
        !Number.isSafeInteger(
          value.pairFailureExponent,
        ) ||
        value.pairFailureExponent < 0
      )
    )
  ) {
    return null;
  }

  return {
    providerRetryAfterSeconds:
      value.providerRetryAfterSeconds,
    pairFailureExponent: value.pairFailureExponent,
  };
}

function scopeMatchesDecision(
  request: MetaCampaignDeliveryRetryPolicyRequest,
  scope: string,
): boolean {
  return (
    (request.providerErrorCode === 130429 &&
      request.cooldownScope === "sender" &&
      scope === "phone") ||
    (request.providerErrorCode === 131049 &&
      request.templateCategory === "MARKETING" &&
      request.cooldownScope ===
        "portfolio-recipient" &&
      scope === "recipient-marketing") ||
    (request.providerErrorCode === 131056 &&
      request.cooldownScope === "pair" &&
      scope === "sender-recipient")
  );
}

export function createMetaCampaignDeliveryRetryPolicy(
  source: MetaCampaignDeliveryRetryEvidenceSource,
): MetaCampaignDeliveryRetryPolicy {
  return {
    isConfigured() {
      return sourceIsConfigured(source);
    },

    async decide(request) {
      if (!sourceIsConfigured(source)) {
        return { action: "stop" };
      }

      let evidence: MetaCampaignDeliveryRetryEvidence | null;

      try {
        evidence = normalizedEvidence(
          await source.load(request),
        );
      } catch {
        return { action: "stop" };
      }

      if (!evidence) {
        return { action: "stop" };
      }

      try {
        if (
          request.providerRetryAfterSeconds !== null &&
          evidence.providerRetryAfterSeconds !== null &&
          request.providerRetryAfterSeconds !==
            evidence.providerRetryAfterSeconds
        ) {
          return { action: "stop" };
        }

        const providerRetryAfterSeconds =
          request.providerRetryAfterSeconds ??
          evidence.providerRetryAfterSeconds;
        const decision = decideMetaMessageFailure({
          version: 1,
          source: "graph-response",
          code: request.providerErrorCode,
          providerRetryAfterSeconds:
            providerRetryAfterSeconds,
          pairFailureExponent:
            evidence.pairFailureExponent,
          heldForQualityAssessment: false,
        });

        if (
          decision.outcome !== "defer" ||
          decision.automaticRetryAllowed !== true ||
          decision.requiresFreshClaim !== true ||
          !scopeMatchesDecision(
            request,
            decision.scope,
          ) ||
          !Number.isSafeInteger(
            decision.delaySeconds,
          ) ||
          decision.delaySeconds < 1 ||
          decision.delaySeconds > 24 * 60 * 60
        ) {
          return { action: "stop" };
        }

        return {
          action: "defer",
          retryAfterSeconds: decision.delaySeconds,
        };
      } catch {
        return { action: "stop" };
      }
    },
  };
}
