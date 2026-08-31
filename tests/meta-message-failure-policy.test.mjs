import assert from "node:assert/strict";
import test from "node:test";

import {
  decideMetaMessageFailure,
  MetaMessageFailureSignalError,
} from "../server/meta/metaMessageFailurePolicy.ts";

function signal(code, overrides = {}) {
  return {
    version: 1,
    source: "graph-response",
    code,
    providerRetryAfterSeconds: null,
    pairFailureExponent: null,
    heldForQualityAssessment: false,
    ...overrides,
  };
}

test("defers provider throttling only with explicit retry guidance", () => {
  assert.deepEqual(
    decideMetaMessageFailure(
      signal(130429, {
        providerRetryAfterSeconds: 17,
      }),
    ),
    {
      version: 1,
      outcome: "defer",
      scope: "phone",
      delaySeconds: 17,
      reasonCode: "PROVIDER_RATE_LIMIT",
      automaticRetryAllowed: true,
      requiresFreshClaim: true,
    },
  );

  for (const [code, scope] of [
    [4, "app"],
    [80007, "waba"],
    [130429, "phone"],
  ]) {
    assert.equal(
      decideMetaMessageFailure(
        signal(code, {
          providerRetryAfterSeconds: 31,
        }),
      ).scope,
      scope,
    );
    assert.deepEqual(
      decideMetaMessageFailure(signal(code)),
      {
        version: 1,
        outcome: "manual-review",
        scope: "delivery",
        reasonCode:
          "PROVIDER_RETRY_GUIDANCE_REQUIRED",
        automaticRetryAllowed: false,
      },
    );
  }
});

test("uses Meta's exact pair backoff and rejects an absent or unsafe exponent", () => {
  for (const [exponent, delaySeconds] of [
    [0, 1],
    [1, 4],
    [2, 16],
    [6, 4096],
  ]) {
    assert.deepEqual(
      decideMetaMessageFailure(
        signal(131056, {
          pairFailureExponent: exponent,
        }),
      ),
      {
        version: 1,
        outcome: "defer",
        scope: "sender-recipient",
        delaySeconds,
        reasonCode: "PAIR_RATE_LIMIT",
        automaticRetryAllowed: true,
        requiresFreshClaim: true,
      },
    );
  }

  assert.equal(
    decideMetaMessageFailure(
      signal(131056),
    ).reasonCode,
    "PAIR_FAILURE_EXPONENT_REQUIRED",
  );
  assert.equal(
    decideMetaMessageFailure(
      signal(131056, {
        pairFailureExponent: 27,
      }),
    ).reasonCode,
    "PAIR_BACKOFF_UNREPRESENTABLE",
  );
});

test("separates cooldown, replacement, opt-out, pause, and circuit-break actions", () => {
  assert.deepEqual(
    decideMetaMessageFailure(signal(131049)),
    {
      version: 1,
      outcome: "defer",
      scope: "recipient-marketing",
      delaySeconds: 86400,
      reasonCode: "MARKETING_RECIPIENT_LIMIT",
      automaticRetryAllowed: true,
      requiresFreshClaim: true,
    },
  );
  assert.equal(
    decideMetaMessageFailure(signal(131047)).outcome,
    "replace-message",
  );
  assert.equal(
    decideMetaMessageFailure(signal(131050)).outcome,
    "block",
  );
  assert.equal(
    decideMetaMessageFailure(signal(131057)).outcome,
    "pause",
  );
  assert.equal(
    decideMetaMessageFailure(signal(131048)).outcome,
    "circuit-break",
  );
  assert.equal(
    decideMetaMessageFailure(signal(131064)).scope,
    "business-initiated-messaging",
  );
  assert.equal(
    decideMetaMessageFailure(signal(132015)).outcome,
    "pause",
  );
  assert.equal(
    decideMetaMessageFailure(signal(132016)).outcome,
    "block",
  );
  assert.equal(
    decideMetaMessageFailure(signal(132069)).scope,
    "flow",
  );
});

test("requires held status-webhook context before classifying portfolio pacing", () => {
  assert.equal(
    decideMetaMessageFailure(signal(135000))
      .reasonCode,
    "PORTFOLIO_PACING_CONTEXT_REQUIRED",
  );
  assert.deepEqual(
    decideMetaMessageFailure(
      signal(135000, {
        source: "status-webhook",
        heldForQualityAssessment: true,
      }),
    ),
    {
      version: 1,
      outcome: "circuit-break",
      scope: "portfolio",
      reasonCode: "PORTFOLIO_REVIEW_REQUIRED",
      automaticRetryAllowed: false,
    },
  );
});

test("fails closed for unknown codes and malformed or extended provider signals", () => {
  assert.deepEqual(
    decideMetaMessageFailure(signal(999999)),
    {
      version: 1,
      outcome: "manual-review",
      scope: "delivery",
      reasonCode: "UNKNOWN_PROVIDER_CODE",
      automaticRetryAllowed: false,
    },
  );

  for (const value of [
    null,
    {},
    signal(130429, {
      providerRetryAfterSeconds: 0,
    }),
    signal(131049, {
      providerRetryAfterSeconds: 60,
    }),
    signal(131056, {
      pairFailureExponent: -1,
    }),
    signal(135000, {
      heldForQualityAssessment: true,
    }),
    {
      ...signal(130429),
      httpStatus: 429,
    },
    {
      ...signal(130429),
      title: "private provider text",
    },
  ]) {
    assert.throws(
      () => decideMetaMessageFailure(value),
      MetaMessageFailureSignalError,
    );
  }
});
