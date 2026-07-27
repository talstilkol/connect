const MAXIMUM_DATE_DAYS = 100_000_000;
const MAXIMUM_DATE_HOURS =
  MAXIMUM_DATE_DAYS * 24;

export type BackupRestorePolicyIssue =
  | "BACKUP_INTERVAL_REQUIRED"
  | "BACKUP_INTERVAL_INVALID"
  | "BACKUP_RETENTION_REQUIRED"
  | "BACKUP_RETENTION_INVALID"
  | "RESTORE_REHEARSAL_INTERVAL_REQUIRED"
  | "RESTORE_REHEARSAL_INTERVAL_INVALID";

export interface BackupRestorePolicyEnvironment {
  BACKUP_SCHEDULE_INTERVAL_HOURS?: string;
  BACKUP_RETENTION_DAYS?: string;
  RESTORE_REHEARSAL_INTERVAL_DAYS?: string;
}

export interface BackupRestorePolicy {
  backupScheduleIntervalHours: number;
  backupRetentionDays: number;
  restoreRehearsalIntervalDays: number;
}

export type BackupRestorePolicyInspection =
  | {
      status: "configured";
      configuration: BackupRestorePolicy;
    }
  | {
      status: "configuration-required";
      issues: readonly BackupRestorePolicyIssue[];
    };

function parsePositiveInteger(
  value: string | undefined,
  maximum: number,
): number | null {
  if (
    typeof value !== "string" ||
    !/^[1-9][0-9]{0,9}$/.test(value)
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) &&
    parsed <= maximum
    ? parsed
    : null;
}

export function inspectBackupRestorePolicy(
  environment: BackupRestorePolicyEnvironment,
): BackupRestorePolicyInspection {
  const issues: BackupRestorePolicyIssue[] =
    [];
  const backupScheduleIntervalHours =
    parsePositiveInteger(
      environment
        .BACKUP_SCHEDULE_INTERVAL_HOURS,
      MAXIMUM_DATE_HOURS,
    );
  const backupRetentionDays =
    parsePositiveInteger(
      environment.BACKUP_RETENTION_DAYS,
      MAXIMUM_DATE_DAYS,
    );
  const restoreRehearsalIntervalDays =
    parsePositiveInteger(
      environment
        .RESTORE_REHEARSAL_INTERVAL_DAYS,
      MAXIMUM_DATE_DAYS,
    );

  if (
    environment
      .BACKUP_SCHEDULE_INTERVAL_HOURS ===
    undefined
  ) {
    issues.push(
      "BACKUP_INTERVAL_REQUIRED",
    );
  } else if (
    backupScheduleIntervalHours === null
  ) {
    issues.push("BACKUP_INTERVAL_INVALID");
  }

  if (
    environment.BACKUP_RETENTION_DAYS ===
    undefined
  ) {
    issues.push(
      "BACKUP_RETENTION_REQUIRED",
    );
  } else if (backupRetentionDays === null) {
    issues.push("BACKUP_RETENTION_INVALID");
  }

  if (
    environment
      .RESTORE_REHEARSAL_INTERVAL_DAYS ===
    undefined
  ) {
    issues.push(
      "RESTORE_REHEARSAL_INTERVAL_REQUIRED",
    );
  } else if (
    restoreRehearsalIntervalDays === null
  ) {
    issues.push(
      "RESTORE_REHEARSAL_INTERVAL_INVALID",
    );
  }

  if (
    issues.length > 0 ||
    backupScheduleIntervalHours === null ||
    backupRetentionDays === null ||
    restoreRehearsalIntervalDays === null
  ) {
    return {
      status: "configuration-required",
      issues,
    };
  }

  return {
    status: "configured",
    configuration: {
      backupScheduleIntervalHours,
      backupRetentionDays,
      restoreRehearsalIntervalDays,
    },
  };
}
