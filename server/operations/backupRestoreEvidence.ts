import type {
  BackupRestorePolicy,
} from "./backupRestorePolicy.ts";

const SAFE_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MAXIMUM_DATE_DAYS = 100_000_000;
const MAXIMUM_DATE_HOURS =
  MAXIMUM_DATE_DAYS * 24;

export interface BackupRestoreClock {
  now(): Date;
}

export type BackupRestoreEvidenceAssessment =
  | {
      status: "verified";
      backupId: string;
      backupCreatedAt: string;
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
        | "RESTORE_REHEARSAL_STALE";
    };

interface BackupRestoreEvidence {
  version: 1;
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
  restoreRehearsal: {
    target: "isolated";
    completedAt: string;
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
      "restoreRehearsal",
    ]) ||
    value.version !== 1 ||
    typeof value.backupId !== "string" ||
    !SAFE_ID_PATTERN.test(value.backupId) ||
    !isUtcTimestamp(value.backupCreatedAt) ||
    !isUtcTimestamp(value.backupVerifiedAt) ||
    !isRecord(value.d1) ||
    !hasExactKeys(value.d1, [
      "status",
      "sha256",
      "sizeBytes",
    ]) ||
    value.d1.status !== "verified" ||
    typeof value.d1.sha256 !== "string" ||
    !SHA256_PATTERN.test(value.d1.sha256) ||
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
    typeof value.r2.inventorySha256 !==
      "string" ||
    !SHA256_PATTERN.test(
      value.r2.inventorySha256,
    ) ||
    !isNonNegativeSafeInteger(
      value.r2.objectCount,
    ) ||
    !isNonNegativeSafeInteger(
      value.r2.totalBytes,
    ) ||
    !isRecord(value.restoreRehearsal) ||
    !hasExactKeys(value.restoreRehearsal, [
      "target",
      "completedAt",
      "d1Status",
      "r2Status",
    ]) ||
    value.restoreRehearsal.target !==
      "isolated" ||
    !isUtcTimestamp(
      value.restoreRehearsal.completedAt,
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
  const restoreCompleted = Date.parse(
    evidence.restoreRehearsal.completedAt,
  );

  if (
    backupCreated > backupVerified ||
    backupVerified > nowMilliseconds ||
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
    restoreRehearsalCompletedAt:
      evidence.restoreRehearsal.completedAt,
  };
}
