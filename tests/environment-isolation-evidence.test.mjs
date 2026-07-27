import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  deriveEnvironmentIsolationEvidenceDigest,
  inspectEnvironmentIsolationEvidence,
} from "../server/operations/environmentIsolationEvidence.ts";

const environmentNames = [
  "development",
  "preview",
  "staging",
  "production",
];
const resourceClasses = [
  "d1",
  "r2",
  "metaWebhookQueue",
  "metaWebhookDeadLetterQueue",
  "campaignDeliveryQueue",
  "campaignDeliveryDeadLetterQueue",
  "metaWebhookRateLimiter",
  "tenantMutationRateLimiter",
  "systemAdminMutationRateLimiter",
  "secretSet",
  "scheduler",
];
const now =
  new Date("2026-07-27T12:00:00.000Z");

function fingerprint(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function createEvidence() {
  const evidence = {
    schemaVersion: 1,
    verifiedAt:
      "2026-07-27T11:00:00.000Z",
    expiresAt:
      "2026-07-28T11:00:00.000Z",
    environments:
      environmentNames.map((name) => ({
        name,
        dataBoundary:
          name === "production"
            ? "production-only"
            : "non-production-only",
        resources: Object.fromEntries(
          resourceClasses.map(
            (resourceClass) => [
              resourceClass,
              fingerprint(
                `${name}:${resourceClass}`,
              ),
            ],
          ),
        ),
      })),
  };

  return {
    ...evidence,
    evidenceDigest:
      deriveEnvironmentIsolationEvidenceDigest(
        evidence,
      ),
  };
}

test("accepts complete expiring evidence with 44 isolated resource fingerprints", () => {
  const report =
    inspectEnvironmentIsolationEvidence(
      {
        ENVIRONMENT_ISOLATION_EVIDENCE_JSON:
          JSON.stringify(
            createEvidence(),
          ),
      },
      now,
    );

  assert.deepEqual(report, {
    status: "configured",
    code:
      "ENVIRONMENT_ISOLATION_EVIDENCE_VERIFIED",
    environmentCount: 4,
    resourceFingerprintCount: 44,
  });
});

test("rejects one resource reused across environments", () => {
  const evidence = createEvidence();
  const environments =
    structuredClone(
      evidence.environments,
    );

  environments[1].resources.d1 =
    environments[0].resources.d1;

  const modified = {
    ...evidence,
    environments,
  };
  modified.evidenceDigest =
    deriveEnvironmentIsolationEvidenceDigest(
      modified,
    );

  assert.equal(
    inspectEnvironmentIsolationEvidence(
      {
        ENVIRONMENT_ISOLATION_EVIDENCE_JSON:
          JSON.stringify(modified),
      },
      now,
    ).status,
    "invalid",
  );
});

test("rejects expired, future, extended, and digest-mismatched evidence", () => {
  const evidence = createEvidence();
  const expired = {
    ...evidence,
    expiresAt:
      "2026-07-27T12:00:00.000Z",
  };
  expired.evidenceDigest =
    deriveEnvironmentIsolationEvidenceDigest(
      expired,
    );
  const future = {
    ...evidence,
    verifiedAt:
      "2026-07-27T13:00:00.000Z",
  };
  future.evidenceDigest =
    deriveEnvironmentIsolationEvidenceDigest(
      future,
    );

  assert.equal(
    inspectEnvironmentIsolationEvidence(
      {
        ENVIRONMENT_ISOLATION_EVIDENCE_JSON:
          JSON.stringify(expired),
      },
      now,
    ).status,
    "expired",
  );
  assert.equal(
    inspectEnvironmentIsolationEvidence(
      {
        ENVIRONMENT_ISOLATION_EVIDENCE_JSON:
          JSON.stringify(future),
      },
      now,
    ).status,
    "invalid",
  );
  assert.equal(
    inspectEnvironmentIsolationEvidence(
      {
        ENVIRONMENT_ISOLATION_EVIDENCE_JSON:
          JSON.stringify({
            ...evidence,
            untrusted: true,
          }),
      },
      now,
    ).status,
    "invalid",
  );
  assert.equal(
    inspectEnvironmentIsolationEvidence(
      {
        ENVIRONMENT_ISOLATION_EVIDENCE_JSON:
          JSON.stringify({
            ...evidence,
            evidenceDigest:
              "environment_isolation_evidence_v1_" +
              "0".repeat(64),
          }),
      },
      now,
    ).status,
    "invalid",
  );
});

test("fails closed when environment isolation evidence is absent", () => {
  assert.deepEqual(
    inspectEnvironmentIsolationEvidence(
      {},
      now,
    ),
    {
      status: "disabled",
      code:
        "ENVIRONMENT_ISOLATION_EVIDENCE_REQUIRED",
      environmentCount: 0,
      resourceFingerprintCount: 0,
    },
  );
});

test("fails closed for an invalid verification clock", () => {
  assert.equal(
    inspectEnvironmentIsolationEvidence(
      {
        ENVIRONMENT_ISOLATION_EVIDENCE_JSON:
          JSON.stringify(
            createEvidence(),
          ),
      },
      new Date(Number.NaN),
    ).status,
    "invalid",
  );
});
