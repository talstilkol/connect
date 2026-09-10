const META_MESSAGE_FAILURE_SIGNAL_KEYS = [
  "code",
  "heldForQualityAssessment",
  "pairFailureExponent",
  "providerRetryAfterSeconds",
  "source",
  "version",
] as const;

const PROVIDER_DELAY_CODES = new Set([
  4,
  80_007,
  130_429,
]);

const MINIMUM_MARKETING_COOLDOWN_SECONDS =
  24 * 60 * 60;

export type MetaMessageFailureSource =
  | "graph-response"
  | "status-webhook";

export interface MetaMessageFailureSignal {
  version: 1;
  source: MetaMessageFailureSource;
  code: number;
  providerRetryAfterSeconds: number | null;
  pairFailureExponent: number | null;
  heldForQualityAssessment: boolean;
}

export type MetaMessageFailureScope =
  | "app"
  | "waba"
  | "phone"
  | "sender-recipient"
  | "recipient-marketing"
  | "business-initiated-messaging"
  | "template"
  | "flow"
  | "portfolio"
  | "delivery";

export type MetaMessageFailureDecision =
  | {
      version: 1;
      outcome: "defer";
      scope: MetaMessageFailureScope;
      delaySeconds: number;
      reasonCode:
        | "PROVIDER_RATE_LIMIT"
        | "PAIR_RATE_LIMIT"
        | "MARKETING_RECIPIENT_LIMIT";
      automaticRetryAllowed: true;
      requiresFreshClaim: true;
    }
  | {
      version: 1;
      outcome: "replace-message";
      scope: "delivery";
      reasonCode: "APPROVED_TEMPLATE_REQUIRED";
      requiredMessageType: "approved-template";
      automaticRetryAllowed: false;
    }
  | {
      version: 1;
      outcome: "pause";
      scope: "phone" | "template" | "flow";
      reasonCode:
        | "PHONE_STATE_REFRESH_REQUIRED"
        | "TEMPLATE_STATE_REFRESH_REQUIRED"
        | "FLOW_STATE_REFRESH_REQUIRED";
      resumeSignal:
        | "phone-state-refreshed"
        | "template-state-refreshed"
        | "flow-state-refreshed";
      automaticRetryAllowed: false;
    }
  | {
      version: 1;
      outcome: "block";
      scope: "recipient-marketing" | "template";
      reasonCode:
        | "MARKETING_OPT_OUT"
        | "TEMPLATE_DISABLED";
      automaticRetryAllowed: false;
    }
  | {
      version: 1;
      outcome: "circuit-break";
      scope:
        | "phone"
        | "business-initiated-messaging"
        | "portfolio";
      reasonCode:
        | "PHONE_QUALITY_REVIEW_REQUIRED"
        | "TEMPLATE_CLASSIFICATION_REVIEW_REQUIRED"
        | "PORTFOLIO_REVIEW_REQUIRED";
      automaticRetryAllowed: false;
    }
  | {
      version: 1;
      outcome: "manual-review";
      scope: "delivery";
      reasonCode:
        | "UNKNOWN_PROVIDER_CODE"
        | "PROVIDER_RETRY_GUIDANCE_REQUIRED"
        | "PAIR_FAILURE_EXPONENT_REQUIRED"
        | "PAIR_BACKOFF_UNREPRESENTABLE"
        | "PORTFOLIO_PACING_CONTEXT_REQUIRED";
      automaticRetryAllowed: false;
    };

export class MetaMessageFailureSignalError
  extends Error {
  constructor() {
    super("Meta message failure signal is invalid");
    this.name = "MetaMessageFailureSignalError";
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
): boolean {
  const keys = Object.keys(value).sort();
  const expected = [
    ...META_MESSAGE_FAILURE_SIGNAL_KEYS,
  ].sort();

  return (
    keys.length === expected.length &&
    keys.every(
      (key, index) => key === expected[index],
    )
  );
}

function isPositiveSafeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) > 0
  );
}

function isNonNegativeSafeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 0
  );
}

function requireSignal(
  value: unknown,
): MetaMessageFailureSignal {
  if (
    !isRecord(value) ||
    !hasExactKeys(value) ||
    value.version !== 1 ||
    (
      value.source !== "graph-response" &&
      value.source !== "status-webhook"
    ) ||
    !isPositiveSafeInteger(value.code) ||
    (
      value.providerRetryAfterSeconds !== null &&
      !isPositiveSafeInteger(
        value.providerRetryAfterSeconds,
      )
    ) ||
    (
      value.pairFailureExponent !== null &&
      !isNonNegativeSafeInteger(
        value.pairFailureExponent,
      )
    ) ||
    typeof value.heldForQualityAssessment !==
      "boolean"
  ) {
    throw new MetaMessageFailureSignalError();
  }

  const code = value.code;
  const providerRetryAfterSeconds =
    value.providerRetryAfterSeconds;
  const pairFailureExponent =
    value.pairFailureExponent;
  const heldForQualityAssessment =
    value.heldForQualityAssessment;

  if (
    (
      providerRetryAfterSeconds !== null &&
      !PROVIDER_DELAY_CODES.has(code)
    ) ||
    (
      pairFailureExponent !== null &&
      code !== 131_056
    ) ||
    (
      heldForQualityAssessment &&
      (
        code !== 135_000 ||
        value.source !== "status-webhook"
      )
    )
  ) {
    throw new MetaMessageFailureSignalError();
  }

  return {
    version: 1,
    source: value.source,
    code,
    providerRetryAfterSeconds,
    pairFailureExponent,
    heldForQualityAssessment,
  };
}

function manualReview(
  reasonCode: Extract<
    MetaMessageFailureDecision,
    { outcome: "manual-review" }
  >["reasonCode"],
): MetaMessageFailureDecision {
  return {
    version: 1,
    outcome: "manual-review",
    scope: "delivery",
    reasonCode,
    automaticRetryAllowed: false,
  };
}

function providerDelayDecision(
  scope: "app" | "waba" | "phone",
  delaySeconds: number | null,
): MetaMessageFailureDecision {
  if (delaySeconds === null) {
    return manualReview(
      "PROVIDER_RETRY_GUIDANCE_REQUIRED",
    );
  }

  return {
    version: 1,
    outcome: "defer",
    scope,
    delaySeconds,
    reasonCode: "PROVIDER_RATE_LIMIT",
    automaticRetryAllowed: true,
    requiresFreshClaim: true,
  };
}

function pairDelayDecision(
  exponent: number | null,
): MetaMessageFailureDecision {
  if (exponent === null) {
    return manualReview(
      "PAIR_FAILURE_EXPONENT_REQUIRED",
    );
  }

  const delaySeconds = 4 ** exponent;

  if (!Number.isSafeInteger(delaySeconds)) {
    return manualReview(
      "PAIR_BACKOFF_UNREPRESENTABLE",
    );
  }

  return {
    version: 1,
    outcome: "defer",
    scope: "sender-recipient",
    delaySeconds,
    reasonCode: "PAIR_RATE_LIMIT",
    automaticRetryAllowed: true,
    requiresFreshClaim: true,
  };
}

export function decideMetaMessageFailure(
  value: unknown,
): MetaMessageFailureDecision {
  const signal = requireSignal(value);

  switch (signal.code) {
    case 4:
      return providerDelayDecision(
        "app",
        signal.providerRetryAfterSeconds,
      );
    case 80_007:
      return providerDelayDecision(
        "waba",
        signal.providerRetryAfterSeconds,
      );
    case 130_429:
      return providerDelayDecision(
        "phone",
        signal.providerRetryAfterSeconds,
      );
    case 131_047:
      return {
        version: 1,
        outcome: "replace-message",
        scope: "delivery",
        reasonCode: "APPROVED_TEMPLATE_REQUIRED",
        requiredMessageType: "approved-template",
        automaticRetryAllowed: false,
      };
    case 131_048:
      return {
        version: 1,
        outcome: "circuit-break",
        scope: "phone",
        reasonCode:
          "PHONE_QUALITY_REVIEW_REQUIRED",
        automaticRetryAllowed: false,
      };
    case 131_049:
      return {
        version: 1,
        outcome: "defer",
        scope: "recipient-marketing",
        delaySeconds:
          MINIMUM_MARKETING_COOLDOWN_SECONDS,
        reasonCode:
          "MARKETING_RECIPIENT_LIMIT",
        automaticRetryAllowed: true,
        requiresFreshClaim: true,
      };
    case 131_050:
      return {
        version: 1,
        outcome: "block",
        scope: "recipient-marketing",
        reasonCode: "MARKETING_OPT_OUT",
        automaticRetryAllowed: false,
      };
    case 131_056:
      return pairDelayDecision(
        signal.pairFailureExponent,
      );
    case 131_057:
      return {
        version: 1,
        outcome: "pause",
        scope: "phone",
        reasonCode:
          "PHONE_STATE_REFRESH_REQUIRED",
        resumeSignal: "phone-state-refreshed",
        automaticRetryAllowed: false,
      };
    case 131_064:
      return {
        version: 1,
        outcome: "circuit-break",
        scope: "business-initiated-messaging",
        reasonCode:
          "TEMPLATE_CLASSIFICATION_REVIEW_REQUIRED",
        automaticRetryAllowed: false,
      };
    case 132_015:
      return {
        version: 1,
        outcome: "pause",
        scope: "template",
        reasonCode:
          "TEMPLATE_STATE_REFRESH_REQUIRED",
        resumeSignal: "template-state-refreshed",
        automaticRetryAllowed: false,
      };
    case 132_016:
      return {
        version: 1,
        outcome: "block",
        scope: "template",
        reasonCode: "TEMPLATE_DISABLED",
        automaticRetryAllowed: false,
      };
    case 132_069:
      return {
        version: 1,
        outcome: "pause",
        scope: "flow",
        reasonCode:
          "FLOW_STATE_REFRESH_REQUIRED",
        resumeSignal: "flow-state-refreshed",
        automaticRetryAllowed: false,
      };
    case 135_000:
      return signal.source === "status-webhook" &&
        signal.heldForQualityAssessment
        ? {
            version: 1,
            outcome: "circuit-break",
            scope: "portfolio",
            reasonCode:
              "PORTFOLIO_REVIEW_REQUIRED",
            automaticRetryAllowed: false,
          }
        : manualReview(
            "PORTFOLIO_PACING_CONTEXT_REQUIRED",
          );
    default:
      return manualReview(
        "UNKNOWN_PROVIDER_CODE",
      );
  }
}
