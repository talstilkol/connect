import type {
  MetaCampaignDeliveryRetryPolicyRequest,
} from "./metaCampaignDeliveryProcessor.ts";
import type {
  MetaCampaignDeliveryRetryEvidenceSource,
} from "./metaCampaignDeliveryRetryPolicy.ts";

const MAXIMUM_RETRY_DELAY_SECONDS = 24 * 60 * 60;
const MAXIMUM_PAIR_FAILURE_EXPONENT = 8;

function hasExactRequestKeys(
  value: MetaCampaignDeliveryRetryPolicyRequest,
): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    Object.keys(value).sort().join(",") ===
      "attemptCount,cooldownScope,providerErrorCode,providerRetryAfterSeconds,templateCategory,tenantId",
  );
}

function commonRequestIsValid(
  value: MetaCampaignDeliveryRetryPolicyRequest,
): boolean {
  return (
    hasExactRequestKeys(value) &&
    Number.isSafeInteger(value.tenantId) &&
    value.tenantId > 0 &&
    Number.isSafeInteger(value.attemptCount) &&
    value.attemptCount > 0 &&
    (
      value.templateCategory === "MARKETING" ||
      value.templateCategory === "UTILITY"
    )
  );
}

/**
 * Builds bounded retry evidence from the current Graph response and the
 * durable delivery attempt. It never invents a missing provider Retry-After.
 */
export function createProviderResponseMetaCampaignDeliveryRetryEvidenceSource():
Readonly<MetaCampaignDeliveryRetryEvidenceSource> {
  return Object.freeze({
    isConfigured() {
      return true;
    },

    load(request: MetaCampaignDeliveryRetryPolicyRequest) {
      if (!commonRequestIsValid(request)) {
        return null;
      }

      if (
        request.providerErrorCode === 130429 &&
        request.cooldownScope === "sender" &&
        Number.isSafeInteger(request.providerRetryAfterSeconds) &&
        Number(request.providerRetryAfterSeconds) > 0 &&
        Number(request.providerRetryAfterSeconds) <=
          MAXIMUM_RETRY_DELAY_SECONDS
      ) {
        return Object.freeze({
          providerRetryAfterSeconds:
            Number(request.providerRetryAfterSeconds),
          pairFailureExponent: null,
        });
      }

      if (
        request.providerErrorCode === 131049 &&
        request.cooldownScope === "portfolio-recipient" &&
        request.templateCategory === "MARKETING" &&
        request.providerRetryAfterSeconds === null
      ) {
        return Object.freeze({
          providerRetryAfterSeconds: null,
          pairFailureExponent: null,
        });
      }

      const pairFailureExponent = request.attemptCount - 1;
      if (
        request.providerErrorCode === 131056 &&
        request.cooldownScope === "pair" &&
        request.providerRetryAfterSeconds === null &&
        pairFailureExponent <= MAXIMUM_PAIR_FAILURE_EXPONENT
      ) {
        return Object.freeze({
          providerRetryAfterSeconds: null,
          pairFailureExponent,
        });
      }

      return null;
    },
  });
}
