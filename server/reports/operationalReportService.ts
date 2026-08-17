import type {
  OperationalReportRepository,
} from "../../db/operationalReportRepository.ts";
import type {
  OperationalReportSnapshot,
  OperationalReportWindow,
} from "../../shared/domain/operationalReport.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

const DAY_MILLISECONDS =
  24 * 60 * 60 * 1_000;
const DEFAULT_PERIOD_DAYS = 30;
const MAXIMUM_PERIOD_DAYS = 366;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface OperationalReportPeriod {
  startDate: string;
  endDate: string;
}

export interface OperationalReportResult {
  period: OperationalReportPeriod;
  snapshot: OperationalReportSnapshot;
}

export class OperationalReportInputError
  extends Error {
  constructor() {
    super("Operational report period is invalid");
    this.name =
      "OperationalReportInputError";
  }
}

export interface OperationalReportService {
  defaultPeriod(): OperationalReportPeriod;
  read(
    session: TenantSession,
    input: unknown,
  ): Promise<OperationalReportResult>;
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

function parseCalendarDate(
  value: unknown,
): Date | null {
  if (
    typeof value !== "string" ||
    !DATE_PATTERN.test(value)
  ) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parsePeriod(
  input: unknown,
): {
  period: OperationalReportPeriod;
  window: OperationalReportWindow;
} {
  if (!isRecord(input)) {
    throw new OperationalReportInputError();
  }

  const start =
    parseCalendarDate(input.startDate);
  const end = parseCalendarDate(input.endDate);

  if (!start || !end) {
    throw new OperationalReportInputError();
  }

  const endExclusive = new Date(
    end.getTime() + DAY_MILLISECONDS,
  );
  const endExclusiveTimestamp =
    endExclusive.toISOString();
  const durationDays =
    (endExclusive.getTime() -
      start.getTime()) /
    DAY_MILLISECONDS;

  if (
    !Number.isSafeInteger(durationDays) ||
    durationDays < 1 ||
    durationDays > MAXIMUM_PERIOD_DAYS ||
    !Number.isFinite(
      endExclusive.getTime(),
    ) ||
    !/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(
      endExclusiveTimestamp,
    )
  ) {
    throw new OperationalReportInputError();
  }

  return {
    period: {
      startDate: dateOnly(start),
      endDate: dateOnly(end),
    },
    window: {
      startAt: start.toISOString(),
      endAt: endExclusiveTimestamp,
    },
  };
}

export function validateOperationalReportInput(
  input: unknown,
): void {
  parsePeriod(input);
}

function requireClockDate(
  now: () => Date,
): Date {
  const current = now();

  if (
    !(current instanceof Date) ||
    !Number.isFinite(current.getTime())
  ) {
    throw new Error(
      "Operational report clock is invalid",
    );
  }

  return current;
}

export function createOperationalReportService(
  repository: OperationalReportRepository,
  options: {
    now(): Date;
  } = {
    now: () => new Date(),
  },
): OperationalReportService {
  return {
    defaultPeriod() {
      const current =
        requireClockDate(options.now);
      const end = new Date(
        Date.UTC(
          current.getUTCFullYear(),
          current.getUTCMonth(),
          current.getUTCDate(),
        ),
      );
      const start = new Date(
        end.getTime() -
          (DEFAULT_PERIOD_DAYS - 1) *
            DAY_MILLISECONDS,
      );

      return {
        startDate: dateOnly(start),
        endDate: dateOnly(end),
      };
    },

    async read(session, input) {
      requireTenantPermission(
        session,
        "reports.read",
      );

      const { period, window } =
        parsePeriod(input);
      const snapshot = await repository.read(
        session.tenantId,
        window,
      );

      return {
        period,
        snapshot,
      };
    },
  };
}
