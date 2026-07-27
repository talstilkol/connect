import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import test from "node:test";

import {
  deriveSecretInventoryEvidenceDigest,
  inspectSecretInventoryEvidence,
} from "../server/operations/secretInventoryEvidence.ts";

const environmentNames = [
  "development",
  "preview",
  "staging",
  "production",
];
const secretNames = [
  "CLERK_SECRET_KEY",
  "CONNECT_SYSTEM_ADMIN_EXTERNAL_USER_IDS",
  "META_APP_SECRET",
  "META_WEBHOOK_VERIFY_TOKEN",
  "META_CREDENTIAL_ENCRYPTION_KEY_V1",
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
    secrets: environmentNames.flatMap(
      (environment) =>
        secretNames.map((name) => ({
          environment,
          name,
          secretFingerprint:
            fingerprint(
              `${environment}:${name}`,
            ),
          ownerFingerprint:
            fingerprint(
              `owner:${name}`,
            ),
          lastRotatedAt:
            "2026-07-26T11:00:00.000Z",
          nextRotationAt:
            "2026-08-26T11:00:00.000Z",
        })),
    ),
  };

  return {
    ...evidence,
    evidenceDigest:
      deriveSecretInventoryEvidenceDigest(
        evidence,
      ),
  };
}

test("accepts a complete isolated inventory with owners and rotation", () => {
  assert.deepEqual(
    inspectSecretInventoryEvidence(
      {
        SECRET_INVENTORY_EVIDENCE_JSON:
          JSON.stringify(
            createEvidence(),
          ),
      },
      now,
    ),
    {
      status: "configured",
      code:
        "SECRET_INVENTORY_EVIDENCE_VERIFIED",
      environmentCount: 4,
      secretCount: 20,
    },
  );
});

test("rejects a secret reused across environments", () => {
  const evidence = createEvidence();
  const secrets =
    structuredClone(evidence.secrets);

  secrets[5].secretFingerprint =
    secrets[0].secretFingerprint;
  const modified = {
    ...evidence,
    secrets,
  };
  modified.evidenceDigest =
    deriveSecretInventoryEvidenceDigest(
      modified,
    );

  assert.equal(
    inspectSecretInventoryEvidence(
      {
        SECRET_INVENTORY_EVIDENCE_JSON:
          JSON.stringify(modified),
      },
      now,
    ).status,
    "invalid",
  );
});

test("blocks an overdue rotation separately from expired evidence", () => {
  const evidence = createEvidence();
  const secrets =
    structuredClone(evidence.secrets);

  secrets[0].nextRotationAt =
    "2026-07-27T12:00:00.000Z";
  const overdue = {
    ...evidence,
    secrets,
  };
  overdue.evidenceDigest =
    deriveSecretInventoryEvidenceDigest(
      overdue,
    );
  const expired = {
    ...evidence,
    expiresAt:
      "2026-07-27T12:00:00.000Z",
  };
  expired.evidenceDigest =
    deriveSecretInventoryEvidenceDigest(
      expired,
    );

  assert.equal(
    inspectSecretInventoryEvidence(
      {
        SECRET_INVENTORY_EVIDENCE_JSON:
          JSON.stringify(overdue),
      },
      now,
    ).status,
    "rotation-overdue",
  );
  assert.equal(
    inspectSecretInventoryEvidence(
      {
        SECRET_INVENTORY_EVIDENCE_JSON:
          JSON.stringify(expired),
      },
      now,
    ).status,
    "expired",
  );
});

test("rejects missing ownership, future verification, extensions, and digest changes", () => {
  const evidence = createEvidence();
  const noOwner =
    structuredClone(evidence);

  noOwner.secrets[0].ownerFingerprint =
    "";
  noOwner.evidenceDigest =
    deriveSecretInventoryEvidenceDigest(
      noOwner,
    );
  const future = {
    ...evidence,
    verifiedAt:
      "2026-07-27T13:00:00.000Z",
  };
  future.evidenceDigest =
    deriveSecretInventoryEvidenceDigest(
      future,
    );

  for (const value of [
    noOwner,
    future,
    {
      ...evidence,
      untrusted: true,
    },
    {
      ...evidence,
      evidenceDigest:
        "secret_inventory_evidence_v1_" +
        "0".repeat(64),
    },
  ]) {
    assert.equal(
      inspectSecretInventoryEvidence(
        {
          SECRET_INVENTORY_EVIDENCE_JSON:
            JSON.stringify(value),
        },
        now,
      ).status,
      "invalid",
    );
  }
});

test("fails closed without evidence or with an invalid clock", () => {
  assert.equal(
    inspectSecretInventoryEvidence(
      {},
      now,
    ).status,
    "disabled",
  );
  assert.equal(
    inspectSecretInventoryEvidence(
      {
        SECRET_INVENTORY_EVIDENCE_JSON:
          JSON.stringify(
            createEvidence(),
          ),
      },
      new Date(Number.NaN),
    ).status,
    "invalid",
  );
});
