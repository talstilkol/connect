import type {
  BackupRestorePolicy,
} from "./backupRestorePolicy.ts";

const SAFE_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MAXIMUM_DATE_DAYS = 100_000_000;
const MAXIMUM_DATE_HOURS =
  MAXIMUM_DATE_DAYS * 24;
const MAXIMUM_RETAINED_BACKUP_IDS = 10_000;

export interface BackupRestoreClock {
  now(): Date;
}

export type BackupRestoreEvidenceAssessment =
  | {
      status: "verified";
      backupId: string;
      backupCreatedAt: string;
      restoredBackupId: string;
      restoreRehearsalCompletedAt: string;
    }
  | {
      status: "not-verified";
      code:
        | "INVALID_POLICY"
        | "INVALID_EVIDENCE"
        | "CLOCK_UNAVAILABLE"
        | "FUTURE_EVIDENCE"
        | "BACKUP_STALE"
        | "BACKUP_RETENTION_UNVERIFIED"
        | "RESTORE_EVIDENCE_MISMATCH"
        | "RESTORE_REHEARSAL_STALE";
    };

interface BackupRestoreEvidence {
  version: 2;
  backupId: string;
  backupCreatedAt: string;
  backupVerifiedAt: string;
  d1: {
    status: "verified";
    sha256: string;
    sizeBytes: number;
  };
  r2: {
    status: "verified";
    inventorySha256: string;
    objectCount: number;
    totalBytes: number;
  };
  retention: {
    windowStartedAt: string;
    oldestRetainedBackupAt: string;
    newestRetainedBackupAt: string;
    retainedBackupIds: readonly string[];
  };
  restoreRehearsal: {
    target: "isolated";
    restoredBackupId: string;
    restoredBackupCreatedAt: string;
    completedAt: string;
    sourceD1Sha256: string;
    restoredD1Sha256: string;
    sourceR2InventorySha256: string;
    restoredR2InventorySha256: string;
    d1Status: "verified";
    r2Status: "verified";
  };
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
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);

  return (
    actual.length === keys.length &&
    keys.every((key) =>
      Object.hasOwn(value, key),
    )
  );
}

function isUtcTimestamp(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function isNonNegativeSafeInteger(
  value: unknown,
): value is number {
  return (
    Number.isSafeInteger(value) &&
    Number(value) >= 0
  );
}

function isSha256(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    SHA256_PATTERN.test(value)
  );
}

function isSafeId(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    SAFE_ID_PATTERN.test(value)
  );
}

function parseEvidence(
  value: unknown,
): BackupRestoreEvidence | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "backupId",
      "backupCreatedAt",
      "backupVerifiedAt",
      "d1",
      "r2",
      "retention",
      "restoreRehearsal",
    ]) ||
    value.version !== 2 ||
    !isSafeId(value.backupId) ||
    !isUtcTimestamp(value.backupCreatedAt) ||
    !isUtcTimestamp(value.backupVerifiedAt) ||
    !isRecord(value.d1) ||
    !hasExactKeys(value.d1, [
      "status",
      "sha256",
      "sizeBytes",
    ]) ||
    value.d1.status !== "verified" ||
    !isSha256(value.d1.sha256) ||
    !Number.isSafeInteger(value.d1.sizeBytes) ||
    Number(value.d1.sizeBytes) <= 0 ||
    !isRecord(value.r2) ||
    !hasExactKeys(value.r2, [
      "status",
      "inventorySha256",
      "objectCount",
      "totalBytes",
    ]) ||
    value.r2.status !== "verified" ||
    !isSha256(value.r2.inventorySha256) ||
    !isNonNegativeSafeInteger(
      value.r2.objectCount,
    ) ||
    !isNonNegativeSafeInteger(
      value.r2.totalBytes,
    ) ||
    (Number(value.r2.objectCount) === 0) !==
      (Number(value.r2.totalBytes) === 0) ||
    !isRecord(value.retention) ||
    !hasExactKeys(value.retention, [
      "windowStartedAt",
      "oldestRetainedBackupAt",
      "newestRetainedBackupAt",
      "retainedBackupIds",
    ]) ||
    !isUtcTimestamp(
      value.retention.windowStartedAt,
    ) ||
    !isUtcTimestamp(
      value.retention.oldestRetainedBackupAt,
    ) ||
    !isUtcTimestamp(
      value.retention.newestRetainedBackupAt,
    ) ||
    !Array.isArray(
      value.retention.retainedBackupIds,
    ) ||
    value.retention.retainedBackupIds.length ===
      0 ||
    value.retention.retainedBackupIds.length >
      MAXIMUM_RETAINED_BACKUP_IDS ||
    value.retention.retainedBackupIds.some(
      (backupId) => !isSafeId(backupId),
    ) ||
    new Set(
      value.retention.retainedBackupIds,
    ).size !==
      value.retention.retainedBackupIds.length ||
    !isRecord(value.restoreRehearsal) ||
    !hasExactKeys(value.restoreRehearsal, [
      "target",
      "restoredBackupId",
      "restoredBackupCreatedAt",
      "completedAt",
      "sourceD1Sha256",
      "restoredD1Sha256",
      "sourceR2InventorySha256",
      "restoredR2InventorySha256",
      "d1Status",
      "r2Status",
    ]) ||
    value.restoreRehearsal.target !==
      "isolated" ||
    !isSafeId(
      value.restoreRehearsal
        .restoredBackupId,
    ) ||
    !isUtcTimestamp(
      value.restoreRehearsal
        .restoredBackupCreatedAt,
    ) ||
    !isUtcTimestamp(
      value.restoreRehearsal.completedAt,
    ) ||
    !isSha256(
      value.restoreRehearsal
        .sourceD1Sha256,
    ) ||
    !isSha256(
      value.restoreRehearsal
        .restoredD1Sha256,
    ) ||
    !isSha256(
      value.restoreRehearsal
        .sourceR2InventorySha256,
    ) ||
    !isSha256(
      value.restoreRehearsal
        .restoredR2InventorySha256,
    ) ||
    value.restoreRehearsal.d1Status !==
      "verified" ||
    value.restoreRehearsal.r2Status !==
      "verified"
  ) {
    return null;
  }

  return structuredClone(
    value,
  ) as unknown as BackupRestoreEvidence;
}

function isPolicyValid(
  policy: BackupRestorePolicy,
): boolean {
  return (
    Number.isSafeInteger(
      policy.backupScheduleIntervalHours,
    ) &&
    policy.backupScheduleIntervalHours > 0 &&
    policy.backupScheduleIntervalHours <=
      MAXIMUM_DATE_HOURS &&
    Number.isSafeInteger(
      policy.backupRetentionDays,
    ) &&
    policy.backupRetentionDays > 0 &&
    policy.backupRetentionDays <=
      MAXIMUM_DATE_DAYS &&
    Number.isSafeInteger(
      policy.restoreRehearsalIntervalDays,
    ) &&
    policy.restoreRehearsalIntervalDays > 0 &&
    policy.restoreRehearsalIntervalDays <=
      MAXIMUM_DATE_DAYS
  );
}

export function assessBackupRestoreEvidence(
  policy: BackupRestorePolicy,
  evidenceInput: unknown,
  clock: BackupRestoreClock,
): BackupRestoreEvidenceAssessment {
  if (!isPolicyValid(policy)) {
    return {
      status: "not-verified",
      code: "INVALID_POLICY",
    };
  }

  const evidence = parseEvidence(evidenceInput);

  if (!evidence) {
    return {
      status: "not-verified",
      code: "INVALID_EVIDENCE",
    };
  }

  let nowMilliseconds: number;

  try {
    nowMilliseconds = clock.now().getTime();
  } catch {
    return {
      status: "not-verified",
      code: "CLOCK_UNAVAILABLE",
    };
  }

  if (!Number.isFinite(nowMilliseconds)) {
    return {
      status: "not-verified",
      code: "CLOCK_UNAVAILABLE",
    };
  }

  const backupCreated =
    Date.parse(evidence.backupCreatedAt);
  const backupVerified =
    Date.parse(evidence.backupVerifiedAt);
  const windowStarted = Date.parse(
    evidence.retention.windowStartedAt,
  );
  const oldestRetained = Date.parse(
    evidence.retention
      .oldestRetainedBackupAt,
  );
  const newestRetained = Date.parse(
    evidence.retention
      .newestRetainedBackupAt,
  );
  const restoredBackupCreated = Date.parse(
    evidence.restoreRehearsal
      .restoredBackupCreatedAt,
  );
  const restoreCompleted = Date.parse(
    evidence.restoreRehearsal.completedAt,
  );

  if (
    backupCreated > backupVerified ||
    backupVerified > nowMilliseconds ||
    windowStarted > nowMilliseconds ||
    oldestRetained > nowMilliseconds ||
    newestRetained > nowMilliseconds ||
    restoredBackupCreated >
      nowMilliseconds ||
    restoreCompleted > nowMilliseconds
  ) {
    return {
      status: "not-verified",
      code: "FUTURE_EVIDENCE",
    };
  }

  if (
    nowMilliseconds - backupCreated >
    policy.backupScheduleIntervalHours *
      60 * 60 * 1000
  ) {
    return {
      status: "not-verified",
      code: "BACKUP_STALE",
    };
  }

  const retentionCutoff =
    nowMilliseconds -
    policy.backupRetentionDays *
      24 * 60 * 60 * 1000;

  if (
    windowStarted > oldestRetained ||
    oldestRetained > retentionCutoff ||
    newestRetained !== backupCreated ||
    !evidence.retention.retainedBackupIds.includes(
      evidence.backupId,
    ) ||
    !evidence.retention.retainedBackupIds.includes(
      evidence.restoreRehearsal
        .restoredBackupId,
    ) ||
    restoredBackupCreated <
      oldestRetained ||
    restoredBackupCreated >
      newestRetained
  ) {
    return {
      status: "not-verified",
      code: "BACKUP_RETENTION_UNVERIFIED",
    };
  }

  if (
    evidence.restoreRehearsal
      .sourceD1Sha256 !==
      evidence.restoreRehearsal
        .restoredD1Sha256 ||
    evidence.restoreRehearsal
      .sourceR2InventorySha256 !==
      evidence.restoreRehearsal
        .restoredR2InventorySha256 ||
    restoreCompleted <
      restoredBackupCreated
  ) {
    return {
      status: "not-verified",
      code: "RESTORE_EVIDENCE_MISMATCH",
    };
  }

  if (
    nowMilliseconds - restoreCompleted >
    policy.restoreRehearsalIntervalDays *
      24 * 60 * 60 * 1000
  ) {
    return {
      status: "not-verified",
      code: "RESTORE_REHEARSAL_STALE",
    };
  }

  return {
    status: "verified",
    backupId: evidence.backupId,
    backupCreatedAt:
      evidence.backupCreatedAt,
    restoredBackupId:
      evidence.restoreRehearsal
        .restoredBackupId,
    restoreRehearsalCompletedAt:
      evidence.restoreRehearsal.completedAt,
  };
}
