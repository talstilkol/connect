export const AVAILABILITY_SLO_TARGET_BASIS_POINTS =
  9_950;

export interface AvailabilitySloWindow {
  startedAt: string;
  endedAt: string;
}

export interface AvailabilitySloDataSource {
  read(
    window: AvailabilitySloWindow,
  ): Promise<unknown>;
}

export type AvailabilitySloResult =
  | {
      status: "measured";
      window: AvailabilitySloWindow;
      targetBasisPoints: 9_950;
      availabilityBasisPoints: number;
      goodEvents: number;
      validEvents: number;
      badEvents: number;
      errorBudgetRemainingEvents: number;
      objectiveMet: boolean;
    }
  | {
      status: "no-data";
      window: AvailabilitySloWindow;
      targetBasisPoints: 9_950;
      goodEvents: 0;
      validEvents: 0;
    };

export type AvailabilitySloMeasurementErrorCode =
  | "INVALID_WINDOW"
  | "DATA_SOURCE_UNAVAILABLE"
  | "INVALID_SNAPSHOT";

export class AvailabilitySloMeasurementError extends Error {
  readonly code: AvailabilitySloMeasurementErrorCode;

  constructor(
    code: AvailabilitySloMeasurementErrorCode,
  ) {
    super("Availability SLO measurement failed");
    this.name =
      "AvailabilitySloMeasurementError";
    this.code = code;
  }
}

interface AvailabilitySloSnapshot {
  windowStartedAt: string;
  windowEndedAt: string;
  goodEvents: number;
  validEvents: number;
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

function validateWindow(
  value: unknown,
): AvailabilitySloWindow {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "startedAt",
      "endedAt",
    ]) ||
    !isUtcTimestamp(value.startedAt) ||
    !isUtcTimestamp(value.endedAt) ||
    Date.parse(value.endedAt) <=
      Date.parse(value.startedAt)
  ) {
    throw new AvailabilitySloMeasurementError(
      "INVALID_WINDOW",
    );
  }

  return {
    startedAt: value.startedAt,
    endedAt: value.endedAt,
  };
}

function parseSnapshot(
  value: unknown,
  window: AvailabilitySloWindow,
): AvailabilitySloSnapshot {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "windowStartedAt",
      "windowEndedAt",
      "goodEvents",
      "validEvents",
    ]) ||
    value.windowStartedAt !==
      window.startedAt ||
    value.windowEndedAt !== window.endedAt ||
    !Number.isSafeInteger(value.goodEvents) ||
    Number(value.goodEvents) < 0 ||
    !Number.isSafeInteger(value.validEvents) ||
    Number(value.validEvents) < 0 ||
    Number(value.goodEvents) >
      Number(value.validEvents)
  ) {
    throw new AvailabilitySloMeasurementError(
      "INVALID_SNAPSHOT",
    );
  }

  return {
    windowStartedAt: window.startedAt,
    windowEndedAt: window.endedAt,
    goodEvents: Number(value.goodEvents),
    validEvents: Number(value.validEvents),
  };
}

function ratioBasisPoints(
  numerator: number,
  denominator: number,
): number {
  return Number(
    (BigInt(numerator) * BigInt(10_000)) /
      BigInt(denominator),
  );
}

function allowedBadEvents(
  validEvents: number,
): number {
  return Number(
    (BigInt(validEvents) *
      BigInt(
        10_000 -
          AVAILABILITY_SLO_TARGET_BASIS_POINTS,
      )) /
      BigInt(10_000),
  );
}

export async function measureAvailabilitySlo(
  source: AvailabilitySloDataSource,
  input: unknown,
): Promise<AvailabilitySloResult> {
  const window = validateWindow(input);
  let rawSnapshot: unknown;

  try {
    rawSnapshot = await source.read(window);
  } catch {
    throw new AvailabilitySloMeasurementError(
      "DATA_SOURCE_UNAVAILABLE",
    );
  }

  const snapshot = parseSnapshot(
    rawSnapshot,
    window,
  );

  if (snapshot.validEvents === 0) {
    return {
      status: "no-data",
      window,
      targetBasisPoints:
        AVAILABILITY_SLO_TARGET_BASIS_POINTS,
      goodEvents: 0,
      validEvents: 0,
    };
  }

  const availabilityBasisPoints =
    ratioBasisPoints(
      snapshot.goodEvents,
      snapshot.validEvents,
    );
  const badEvents =
    snapshot.validEvents -
    snapshot.goodEvents;

  return {
    status: "measured",
    window,
    targetBasisPoints:
      AVAILABILITY_SLO_TARGET_BASIS_POINTS,
    availabilityBasisPoints,
    goodEvents: snapshot.goodEvents,
    validEvents: snapshot.validEvents,
    badEvents,
    errorBudgetRemainingEvents:
      allowedBadEvents(snapshot.validEvents) -
      badEvents,
    objectiveMet:
      availabilityBasisPoints >=
      AVAILABILITY_SLO_TARGET_BASIS_POINTS,
  };
}

export const unavailableAvailabilitySloDataSource:
AvailabilitySloDataSource = {
  async read() {
    throw new Error(
      "Availability SLO data source is unavailable",
    );
  },
};
