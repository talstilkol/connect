import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectBackupRestorePolicy,
} from "../server/operations/backupRestorePolicy.ts";
import {
  assessBackupRestoreEvidence,
} from "../server/operations/backupRestoreEvidence.ts";

const policy = {
  backupScheduleIntervalHours: 24,
  backupRetentionDays: 30,
  restoreRehearsalIntervalDays: 90,
};

const evidence = {
  version: 2,
  backupId: "backup-2026-07-27",
  backupCreatedAt:
    "2026-07-27T08:00:00.000Z",
  backupVerifiedAt:
    "2026-07-27T08:30:00.000Z",
  d1: {
    status: "verified",
    sha256: "a".repeat(64),
    sizeBytes: 2048,
  },
  r2: {
    status: "verified",
    inventorySha256: "b".repeat(64),
    objectCount: 2,
    totalBytes: 4096,
  },
  retention: {
    windowStartedAt:
      "2026-06-01T00:00:00.000Z",
    oldestRetainedBackupAt:
      "2026-06-26T08:00:00.000Z",
    newestRetainedBackupAt:
      "2026-07-27T08:00:00.000Z",
    retainedBackupIds: [
      "backup-2026-06-30",
      "backup-2026-07-27",
    ],
  },
  restoreRehearsal: {
    target: "isolated",
    restoredBackupId:
      "backup-2026-06-30",
    restoredBackupCreatedAt:
      "2026-06-30T08:00:00.000Z",
    completedAt:
      "2026-07-26T09:00:00.000Z",
    sourceD1Sha256: "c".repeat(64),
    restoredD1Sha256: "c".repeat(64),
    sourceR2InventorySha256:
      "d".repeat(64),
    restoredR2InventorySha256:
      "d".repeat(64),
    d1Status: "verified",
    r2Status: "verified",
  },
};

const clock = {
  now() {
    return new Date(
      "2026-07-27T10:00:00.000Z",
    );
  },
};

test("requires explicit backup and restore policy without defaults", () => {
  assert.deepEqual(
    inspectBackupRestorePolicy({}),
    {
      status: "configuration-required",
      issues: [
        "BACKUP_INTERVAL_REQUIRED",
        "BACKUP_RETENTION_REQUIRED",
        "RESTORE_REHEARSAL_INTERVAL_REQUIRED",
      ],
    },
  );

  assert.deepEqual(
    inspectBackupRestorePolicy({
      BACKUP_SCHEDULE_INTERVAL_HOURS:
        "24",
      BACKUP_RETENTION_DAYS: "30",
      RESTORE_REHEARSAL_INTERVAL_DAYS:
        "90",
    }),
    {
      status: "configured",
      configuration: policy,
    },
  );
});

test("verifies linked D1, R2, retention, and isolated restore evidence", () => {
  assert.deepEqual(
    assessBackupRestoreEvidence(
      policy,
      evidence,
      clock,
    ),
    {
      status: "verified",
      backupId: evidence.backupId,
      backupCreatedAt:
        evidence.backupCreatedAt,
      restoredBackupId:
        evidence.restoreRehearsal
          .restoredBackupId,
      restoreRehearsalCompletedAt:
        evidence.restoreRehearsal
          .completedAt,
    },
  );
});

test("rejects stale backup and restore evidence separately", () => {
  assert.deepEqual(
    assessBackupRestoreEvidence(
      {
        ...policy,
        backupScheduleIntervalHours: 1,
      },
      evidence,
      clock,
    ),
    {
      status: "not-verified",
      code: "BACKUP_STALE",
    },
  );
  assert.deepEqual(
    assessBackupRestoreEvidence(
      {
        ...policy,
        restoreRehearsalIntervalDays: 1,
      },
      {
        ...evidence,
        restoreRehearsal: {
          ...evidence.restoreRehearsal,
          completedAt:
            "2026-07-24T09:00:00.000Z",
        },
      },
      clock,
    ),
    {
      status: "not-verified",
      code: "RESTORE_REHEARSAL_STALE",
    },
  );
});

test("rejects inconsistent R2 and unproven retention history", () => {
  assert.equal(
    assessBackupRestoreEvidence(
      policy,
      {
        ...evidence,
        r2: {
          ...evidence.r2,
          objectCount: 0,
        },
      },
      clock,
    ).code,
    "INVALID_EVIDENCE",
  );
  assert.equal(
    assessBackupRestoreEvidence(
      policy,
      {
        ...evidence,
        retention: {
          ...evidence.retention,
          oldestRetainedBackupAt:
            "2026-07-10T08:00:00.000Z",
        },
      },
      clock,
    ).code,
    "BACKUP_RETENTION_UNVERIFIED",
  );
});

test("rejects an unlinked or digest-mismatched restore rehearsal", () => {
  assert.equal(
    assessBackupRestoreEvidence(
      policy,
      {
        ...evidence,
        retention: {
          ...evidence.retention,
          retainedBackupIds: [
            evidence.backupId,
          ],
        },
      },
      clock,
    ).code,
    "BACKUP_RETENTION_UNVERIFIED",
  );
  assert.equal(
    assessBackupRestoreEvidence(
      policy,
      {
        ...evidence,
        restoreRehearsal: {
          ...evidence.restoreRehearsal,
          restoredD1Sha256:
            "e".repeat(64),
        },
      },
      clock,
    ).code,
    "RESTORE_EVIDENCE_MISMATCH",
  );
});

test("rejects extended, future, and non-isolated evidence", () => {
  assert.equal(
    assessBackupRestoreEvidence(
      policy,
      {
        ...evidence,
        tenantId: 7,
      },
      clock,
    ).code,
    "INVALID_EVIDENCE",
  );
  assert.equal(
    assessBackupRestoreEvidence(
      policy,
      {
        ...evidence,
        restoreRehearsal: {
          ...evidence.restoreRehearsal,
          target: "production",
        },
      },
      clock,
    ).code,
    "INVALID_EVIDENCE",
  );
  assert.equal(
    assessBackupRestoreEvidence(
      policy,
      {
        ...evidence,
        backupVerifiedAt:
          "2026-07-27T11:00:00.000Z",
      },
      clock,
    ).code,
    "FUTURE_EVIDENCE",
  );
});
