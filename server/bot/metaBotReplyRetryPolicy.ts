import {
  decideMetaMessageFailure,
} from "../meta/metaMessageFailurePolicy.ts";
import type {
  WhatsappProviderCooldownErrorCode,
  WhatsappProviderCooldownScope,
} from "../../shared/domain/whatsappRateLimit.ts";

const MAXIMUM_RETRY_DELAY_SECONDS = 24 * 60 * 60;
const MAXIMUM_PAIR_FAILURE_EXPONENT = 8;

export interface MetaBotReplyRetryPolicyRequest {
  attemptCount: number;
  providerErrorCode: WhatsappProviderCooldownErrorCode;
  cooldownScope: WhatsappProviderCooldownScope;
  providerRetryAfterSeconds: number | null;
}

export type MetaBotReplyRetryPolicyDecision =
  | { action: "stop" }
  | {
      action: "defer";
      retryAfterSeconds: number;
    };

function hasExactKeys(
  value: MetaBotReplyRetryPolicyRequest,
): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    Object.keys(value).sort().join(",") ===
      "attemptCount,cooldownScope,providerErrorCode,providerRetryAfterSeconds",
  );
}

function requestIsValid(
  value: MetaBotReplyRetryPolicyRequest,
): boolean {
  return (
    hasExactKeys(value) &&
    Number.isSafeInteger(value.attemptCount) &&
    value.attemptCount > 0 &&
    (
      value.providerRetryAfterSeconds === null ||
      (
        Number.isSafeInteger(
          value.providerRetryAfterSeconds,
        ) &&
        value.providerRetryAfterSeconds > 0 &&
        value.providerRetryAfterSeconds <=
          MAXIMUM_RETRY_DELAY_SECONDS
      )
    )
  );
}

/**
 * Uses only evidence carried by the current Graph response and the durable
 * delivery attempt. Missing Retry-After or an unrepresentable pair exponent
 * stops automatic retry instead of inventing provider guidance.
 */
export function decideMetaBotReplyRetry(
  request: MetaBotReplyRetryPolicyRequest,
): MetaBotReplyRetryPolicyDecision {
  if (!requestIsValid(request)) {
    return { action: "stop" };
  }

  let pairFailureExponent: number | null = null;

  if (
    request.providerErrorCode === 130429 &&
    request.cooldownScope === "sender"
  ) {
    if (request.providerRetryAfterSeconds === null) {
      return { action: "stop" };
    }
  } else if (
    request.providerErrorCode === 131056 &&
    request.cooldownScope === "pair" &&
    request.providerRetryAfterSeconds === null
  ) {
    pairFailureExponent = request.attemptCount - 1;

    if (
      pairFailureExponent >
        MAXIMUM_PAIR_FAILURE_EXPONENT
    ) {
      return { action: "stop" };
    }
  } else {
    // A service reply must never create the Marketing recipient cooldown
    // represented by 131049.
    return { action: "stop" };
  }

  try {
    const decision = decideMetaMessageFailure({
      version: 1,
      source: "graph-response",
      code: request.providerErrorCode,
      providerRetryAfterSeconds:
        request.providerRetryAfterSeconds,
      pairFailureExponent,
      heldForQualityAssessment: false,
    });

    if (
      decision.outcome !== "defer" ||
      decision.automaticRetryAllowed !== true ||
      decision.requiresFreshClaim !== true ||
      !Number.isSafeInteger(decision.delaySeconds) ||
      decision.delaySeconds < 1 ||
      decision.delaySeconds >
        MAXIMUM_RETRY_DELAY_SECONDS ||
      (
        request.providerErrorCode === 130429 &&
        decision.scope !== "phone"
      ) ||
      (
        request.providerErrorCode === 131056 &&
        decision.scope !== "sender-recipient"
      )
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
}
