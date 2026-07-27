import type {
  AvailabilitySloResult,
} from "./availabilitySlo.ts";

const SAFE_ROUTE_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/;
const MAXIMUM_SAFE_MINUTES = Math.floor(
  Number.MAX_SAFE_INTEGER / 60_000,
);

export type SloAlertPolicyConfigurationIssue =
  | "WINDOW_MINUTES_REQUIRED"
  | "WINDOW_MINUTES_INVALID"
  | "MINIMUM_EVENTS_REQUIRED"
  | "MINIMUM_EVENTS_INVALID"
  | "OWNER_REQUIRED"
  | "OWNER_INVALID"
  | "ESCALATION_ROUTE_REQUIRED"
  | "ESCALATION_ROUTE_INVALID";

export interface SloAlertPolicyEnvironment {
  SLO_MEASUREMENT_WINDOW_MINUTES?: string;
  SLO_MINIMUM_VALID_EVENTS?: string;
  SLO_ALERT_OWNER?: string;
  SLO_ALERT_ESCALATION_ROUTE?: string;
}

export interface SloAlertPolicyConfiguration {
  measurementWindowMinutes: number;
  minimumValidEvents: number;
  owner: string;
  escalationRoute: string;
}

export type SloAlertPolicyConfigurationInspection =
  | {
      status: "configured";
      configuration:
        SloAlertPolicyConfiguration;
    }
  | {
      status: "configuration-required";
      issues:
        readonly SloAlertPolicyConfigurationIssue[];
    };

export type SloAlertDecision =
  | { outcome: "healthy" }
  | {
      outcome: "alert";
      alert: {
        version: 1;
        code:
          | "SLO_BREACH"
          | "SLO_INSUFFICIENT_DATA";
        owner: string;
        escalationRoute: string;
        windowStartedAt: string;
        windowEndedAt: string;
        targetBasisPoints: number;
        observedBasisPoints: number | null;
        validEvents: number;
      };
    };

export interface OperationalAlertSink {
  send(
    alert: Extract<
      SloAlertDecision,
      { outcome: "alert" }
    >["alert"],
  ): Promise<unknown>;
}

export type OperationalAlertDeliveryResult =
  | { outcome: "accepted" }
  | { outcome: "unavailable" };

function parsePositiveInteger(
  value: string | undefined,
  maximum: number = Number.MAX_SAFE_INTEGER,
): number | null {
  if (
    typeof value !== "string" ||
    !/^[1-9][0-9]{0,15}$/.test(value)
  ) {
    return null;
  }

  const parsed = Number(value);

  return (
    Number.isSafeInteger(parsed) &&
    parsed <= maximum
  )
    ? parsed
    : null;
}

function parseRoute(
  value: string | undefined,
): string | null {
  return (
    typeof value === "string" &&
    SAFE_ROUTE_PATTERN.test(value)
  )
    ? value
    : null;
}

export function inspectSloAlertPolicyConfiguration(
  environment: SloAlertPolicyEnvironment,
): SloAlertPolicyConfigurationInspection {
  const issues:
    SloAlertPolicyConfigurationIssue[] =
    [];
  const measurementWindowMinutes =
    parsePositiveInteger(
      environment
        .SLO_MEASUREMENT_WINDOW_MINUTES,
      MAXIMUM_SAFE_MINUTES,
    );
  const minimumValidEvents =
    parsePositiveInteger(
      environment.SLO_MINIMUM_VALID_EVENTS,
    );
  const owner = parseRoute(
    environment.SLO_ALERT_OWNER,
  );
  const escalationRoute = parseRoute(
    environment.SLO_ALERT_ESCALATION_ROUTE,
  );

  if (
    environment
      .SLO_MEASUREMENT_WINDOW_MINUTES ===
    undefined
  ) {
    issues.push("WINDOW_MINUTES_REQUIRED");
  } else if (measurementWindowMinutes === null) {
    issues.push("WINDOW_MINUTES_INVALID");
  }

  if (
    environment.SLO_MINIMUM_VALID_EVENTS ===
    undefined
  ) {
    issues.push("MINIMUM_EVENTS_REQUIRED");
  } else if (minimumValidEvents === null) {
    issues.push("MINIMUM_EVENTS_INVALID");
  }

  if (environment.SLO_ALERT_OWNER === undefined) {
    issues.push("OWNER_REQUIRED");
  } else if (owner === null) {
    issues.push("OWNER_INVALID");
  }

  if (
    environment.SLO_ALERT_ESCALATION_ROUTE ===
    undefined
  ) {
    issues.push(
      "ESCALATION_ROUTE_REQUIRED",
    );
  } else if (escalationRoute === null) {
    issues.push(
      "ESCALATION_ROUTE_INVALID",
    );
  }

  if (
    issues.length > 0 ||
    measurementWindowMinutes === null ||
    minimumValidEvents === null ||
    owner === null ||
    escalationRoute === null
  ) {
    return {
      status: "configuration-required",
      issues,
    };
  }

  return {
    status: "configured",
    configuration: {
      measurementWindowMinutes,
      minimumValidEvents,
      owner,
      escalationRoute,
    },
  };
}

export function evaluateSloAlert(
  configuration:
    SloAlertPolicyConfiguration,
  result: AvailabilitySloResult,
): SloAlertDecision {
  if (
    !Number.isSafeInteger(
      configuration.measurementWindowMinutes,
    ) ||
    configuration.measurementWindowMinutes <= 0 ||
    configuration.measurementWindowMinutes >
      MAXIMUM_SAFE_MINUTES ||
    !Number.isSafeInteger(
      configuration.minimumValidEvents,
    ) ||
    configuration.minimumValidEvents <= 0 ||
    !SAFE_ROUTE_PATTERN.test(
      configuration.owner,
    ) ||
    !SAFE_ROUTE_PATTERN.test(
      configuration.escalationRoute,
    )
  ) {
    throw new Error(
      "SLO alert policy configuration is invalid",
    );
  }

  if (
    result.status === "no-data" ||
    result.validEvents <
      configuration.minimumValidEvents
  ) {
    return {
      outcome: "alert",
      alert: {
        version: 1,
        code: "SLO_INSUFFICIENT_DATA",
        owner: configuration.owner,
        escalationRoute:
          configuration.escalationRoute,
        windowStartedAt:
          result.window.startedAt,
        windowEndedAt: result.window.endedAt,
        targetBasisPoints:
          result.targetBasisPoints,
        observedBasisPoints:
          result.status === "measured"
            ? result.availabilityBasisPoints
            : null,
        validEvents: result.validEvents,
      },
    };
  }

  if (!result.objectiveMet) {
    return {
      outcome: "alert",
      alert: {
        version: 1,
        code: "SLO_BREACH",
        owner: configuration.owner,
        escalationRoute:
          configuration.escalationRoute,
        windowStartedAt:
          result.window.startedAt,
        windowEndedAt: result.window.endedAt,
        targetBasisPoints:
          result.targetBasisPoints,
        observedBasisPoints:
          result.availabilityBasisPoints,
        validEvents: result.validEvents,
      },
    };
  }

  return { outcome: "healthy" };
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

export async function sendOperationalAlert(
  sink: OperationalAlertSink,
  decision: SloAlertDecision,
): Promise<OperationalAlertDeliveryResult> {
  if (decision.outcome === "healthy") {
    return { outcome: "accepted" };
  }

  try {
    const result = await sink.send(
      structuredClone(decision.alert),
    );

    return (
      isRecord(result) &&
      Object.keys(result).length === 1 &&
      result.outcome === "accepted"
    )
      ? { outcome: "accepted" }
      : { outcome: "unavailable" };
  } catch {
    return { outcome: "unavailable" };
  }
}

export const unavailableOperationalAlertSink:
OperationalAlertSink = {
  async send() {
    return { outcome: "unavailable" };
  },
};
