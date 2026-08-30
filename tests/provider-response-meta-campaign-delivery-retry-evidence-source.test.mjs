import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderResponseMetaCampaignDeliveryRetryEvidenceSource,
} from "../server/campaigns/providerResponseMetaCampaignDeliveryRetryEvidenceSource.ts";

const baseRequest = Object.freeze({
  tenantId: 7,
  templateCategory: "UTILITY",
  attemptCount: 1,
  providerErrorCode: 130429,
  cooldownScope: "sender",
  providerRetryAfterSeconds: 17,
});

test("uses only a bounded live Retry-After value for phone throughput", () => {
  const source =
    createProviderResponseMetaCampaignDeliveryRetryEvidenceSource();

  assert.equal(source.isConfigured(), true);
  assert.deepEqual(source.load(baseRequest), {
    providerRetryAfterSeconds: 17,
    pairFailureExponent: null,
  });
  for (const providerRetryAfterSeconds of [null, 0, 86_401]) {
    assert.equal(
      source.load({ ...baseRequest, providerRetryAfterSeconds }),
      null,
    );
  }
});

test("applies the official marketing cooldown only to marketing recipients", () => {
  const source =
    createProviderResponseMetaCampaignDeliveryRetryEvidenceSource();
  const request = {
    ...baseRequest,
    templateCategory: "MARKETING",
    providerErrorCode: 131049,
    cooldownScope: "portfolio-recipient",
    providerRetryAfterSeconds: null,
  };

  assert.deepEqual(source.load(request), {
    providerRetryAfterSeconds: null,
    pairFailureExponent: null,
  });
  assert.equal(
    source.load({ ...request, templateCategory: "UTILITY" }),
    null,
  );
});

test("derives bounded pair backoff from the durable attempt count", () => {
  const source =
    createProviderResponseMetaCampaignDeliveryRetryEvidenceSource();
  const request = {
    ...baseRequest,
    providerErrorCode: 131056,
    cooldownScope: "pair",
    providerRetryAfterSeconds: null,
  };

  assert.deepEqual(source.load(request), {
    providerRetryAfterSeconds: null,
    pairFailureExponent: 0,
  });
  assert.deepEqual(source.load({ ...request, attemptCount: 9 }), {
    providerRetryAfterSeconds: null,
    pairFailureExponent: 8,
  });
  assert.equal(source.load({ ...request, attemptCount: 10 }), null);
});

test("rejects altered scope, unsupported codes, and extended input", () => {
  const source =
    createProviderResponseMetaCampaignDeliveryRetryEvidenceSource();

  for (const request of [
    { ...baseRequest, cooldownScope: "pair" },
    { ...baseRequest, providerErrorCode: 4 },
    { ...baseRequest, unsupported: true },
    { ...baseRequest, tenantId: 0 },
    { ...baseRequest, attemptCount: 0 },
  ]) {
    assert.equal(source.load(request), null);
  }
});
