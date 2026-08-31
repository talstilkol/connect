import {
  AVAILABILITY_SLO_TARGET_BASIS_POINTS,
} from "../operations/availabilitySlo.ts";
import {
  inspectSloAlertPolicyConfiguration,
  type OperationalAlertSink,
  type SloAlertPolicyConfiguration,
} from "../operations/sloAlertPolicy.ts";

const BETTER_STACK_INCIDENT_ENDPOINT =
  "https://uptime.betterstack.com/api/v3/incidents";
const requestTimeoutMilliseconds = 5_000;
const maximumResponseBytes = 32_768;
const maximumValidEvents = 1_000_000_000;
const maximumTeamWaitSeconds = 86_400;
const tokenPattern = /^[A-Za-z0-9._~-]{20,512}$/;
const policyIdPattern = /^[A-Za-z0-9_-]{1,128}$/;
const emailPattern =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export interface BetterStackIncidentAlertEnvironment {
  readonly APP_RUNTIME_ENVIRONMENT?: string;
  readonly SLO_MEASUREMENT_WINDOW_MINUTES?: string;
  readonly SLO_MINIMUM_VALID_EVENTS?: string;
  readonly SLO_ALERT_OWNER?: string;
  readonly SLO_ALERT_ESCALATION_ROUTE?: string;
  readonly BETTER_STACK_INCIDENT_API_TOKEN?: string;
  readonly BETTER_STACK_INCIDENT_REQUESTER_EMAIL?: string;
  readonly BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID?: string;
  readonly BETTER_STACK_INCIDENT_NOTIFY_CALL?: string;
  readonly BETTER_STACK_INCIDENT_NOTIFY_SMS?: string;
  readonly BETTER_STACK_INCIDENT_NOTIFY_EMAIL?: string;
  readonly BETTER_STACK_INCIDENT_NOTIFY_PUSH?: string;
  readonly BETTER_STACK_INCIDENT_NOTIFY_CRITICAL?: string;
  readonly BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS?: string;
}

export interface BetterStackIncidentAlertConfiguration {
  readonly runtimeEnvironment: "staging" | "production";
  readonly alertPolicy: SloAlertPolicyConfiguration;
  readonly apiToken: string;
  readonly requesterEmail: string;
  readonly escalationPolicyId: string;
  readonly channels: Readonly<{
    call: boolean;
    sms: boolean;
    email: boolean;
    push: boolean;
    criticalAlert: boolean;
  }>;
  readonly teamWaitSeconds: number;
}

export type BetterStackIncidentAlertConfigurationState =
  | Readonly<{
      status: "disabled";
      runtimeEnvironment: "development" | "test";
    }>
  | Readonly<{
      status: "configured";
      configuration: BetterStackIncidentAlertConfiguration;
    }>
  | Readonly<{
      status: "configuration-required" | "invalid";
      missingKeys: readonly string[];
    }>;

interface BetterStackIncidentAlertDependencies {
  readonly fetchImplementation: typeof fetch;
  readonly createTimeoutSignal: (
    timeoutMilliseconds: number,
  ) => AbortSignal;
}

const requiredConfigurationKeys = Object.freeze([
  "SLO_MEASUREMENT_WINDOW_MINUTES",
  "SLO_MINIMUM_VALID_EVENTS",
  "SLO_ALERT_OWNER",
  "SLO_ALERT_ESCALATION_ROUTE",
  "BETTER_STACK_INCIDENT_API_TOKEN",
  "BETTER_STACK_INCIDENT_REQUESTER_EMAIL",
  "BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID",
  "BETTER_STACK_INCIDENT_NOTIFY_CALL",
  "BETTER_STACK_INCIDENT_NOTIFY_SMS",
  "BETTER_STACK_INCIDENT_NOTIFY_EMAIL",
  "BETTER_STACK_INCIDENT_NOTIFY_PUSH",
  "BETTER_STACK_INCIDENT_NOTIFY_CRITICAL",
  "BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS",
] as const);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function blank(value: string | undefined): boolean {
  return value === undefined || value === "";
}

function parseBoolean(value: string | undefined): boolean | null {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function parsePositiveInteger(
  value: string | undefined,
  maximum: number,
): number | null {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,8}$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum
    ? parsed
    : null;
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value;
}

function providerValues(
  environment: BetterStackIncidentAlertEnvironment,
): readonly (string | undefined)[] {
  return requiredConfigurationKeys.map(
    (key) => environment[key],
  );
}

export function inspectBetterStackIncidentAlertConfiguration(
  environment: BetterStackIncidentAlertEnvironment,
): BetterStackIncidentAlertConfigurationState {
  if (
    typeof environment !== "object" ||
    environment === null ||
    Array.isArray(environment)
  ) {
    return Object.freeze({
      status: "invalid",
      missingKeys: Object.freeze([]),
    });
  }

  const runtimeEnvironment = environment.APP_RUNTIME_ENVIRONMENT;
  if (runtimeEnvironment === "development" || runtimeEnvironment === "test") {
    return providerValues(environment).every(blank)
      ? Object.freeze({ status: "disabled", runtimeEnvironment })
      : Object.freeze({
          status: "invalid",
          missingKeys: Object.freeze([]),
        });
  }

  if (runtimeEnvironment !== "staging" && runtimeEnvironment !== "production") {
    return Object.freeze({
      status: "invalid",
      missingKeys: Object.freeze([]),
    });
  }

  const missingKeys = Object.freeze(
    requiredConfigurationKeys.filter((key) => blank(environment[key])),
  );
  if (missingKeys.length > 0) {
    return Object.freeze({
      status: "configuration-required",
      missingKeys,
    });
  }

  const alertPolicyInspection = inspectSloAlertPolicyConfiguration(environment);
  const apiToken = environment.BETTER_STACK_INCIDENT_API_TOKEN;
  const requesterEmail = environment.BETTER_STACK_INCIDENT_REQUESTER_EMAIL;
  const escalationPolicyId =
    environment.BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID;
  const call = parseBoolean(environment.BETTER_STACK_INCIDENT_NOTIFY_CALL);
  const sms = parseBoolean(environment.BETTER_STACK_INCIDENT_NOTIFY_SMS);
  const email = parseBoolean(environment.BETTER_STACK_INCIDENT_NOTIFY_EMAIL);
  const push = parseBoolean(environment.BETTER_STACK_INCIDENT_NOTIFY_PUSH);
  const criticalAlert = parseBoolean(
    environment.BETTER_STACK_INCIDENT_NOTIFY_CRITICAL,
  );
  const teamWaitSeconds = parsePositiveInteger(
    environment.BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS,
    maximumTeamWaitSeconds,
  );

  if (
    alertPolicyInspection.status !== "configured" ||
    typeof apiToken !== "string" || !tokenPattern.test(apiToken) ||
    typeof requesterEmail !== "string" ||
    requesterEmail.length > 254 || !emailPattern.test(requesterEmail) ||
    typeof escalationPolicyId !== "string" ||
    !policyIdPattern.test(escalationPolicyId) ||
    call === null || sms === null || email === null || push === null ||
    criticalAlert === null || teamWaitSeconds === null ||
    ![call, sms, email, push, criticalAlert].some(Boolean) ||
    (criticalAlert && !push)
  ) {
    return Object.freeze({
      status: "invalid",
      missingKeys: Object.freeze([]),
    });
  }

  return Object.freeze({
    status: "configured",
    configuration: Object.freeze({
      runtimeEnvironment,
      alertPolicy: Object.freeze({
        ...alertPolicyInspection.configuration,
      }),
      apiToken,
      requesterEmail,
      escalationPolicyId,
      channels: Object.freeze({
        call,
        sms,
        email,
        push,
        criticalAlert,
      }),
      teamWaitSeconds,
    }),
  });
}

function validAlert(
  rawAlert: unknown,
  configuration: BetterStackIncidentAlertConfiguration,
): rawAlert is Parameters<OperationalAlertSink["send"]>[0] {
  if (
    !isRecord(rawAlert) ||
    !hasExactKeys(rawAlert, [
      "version",
      "code",
      "owner",
      "escalationRoute",
      "windowStartedAt",
      "windowEndedAt",
      "targetBasisPoints",
      "observedBasisPoints",
      "validEvents",
    ]) ||
    rawAlert.version !== 1 ||
    (rawAlert.code !== "SLO_BREACH" &&
      rawAlert.code !== "SLO_INSUFFICIENT_DATA") ||
    rawAlert.owner !== configuration.alertPolicy.owner ||
    rawAlert.escalationRoute !== configuration.alertPolicy.escalationRoute ||
    !isCanonicalTimestamp(rawAlert.windowStartedAt) ||
    !isCanonicalTimestamp(rawAlert.windowEndedAt) ||
    rawAlert.targetBasisPoints !== AVAILABILITY_SLO_TARGET_BASIS_POINTS ||
    !Number.isSafeInteger(rawAlert.validEvents) ||
    Number(rawAlert.validEvents) < 0 ||
    Number(rawAlert.validEvents) > maximumValidEvents
  ) {
    return false;
  }

  const startedAt = Date.parse(rawAlert.windowStartedAt);
  const endedAt = Date.parse(rawAlert.windowEndedAt);
  const expectedWindowMilliseconds =
    configuration.alertPolicy.measurementWindowMinutes * 60_000;
  const observed = rawAlert.observedBasisPoints;
  const observedValid = observed === null ||
    (Number.isSafeInteger(observed) &&
      Number(observed) >= 0 && Number(observed) <= 10_000);
  if (
    endedAt - startedAt !== expectedWindowMilliseconds ||
    !observedValid
  ) {
    return false;
  }

  if (rawAlert.code === "SLO_BREACH") {
    return observed !== null &&
      Number(observed) < AVAILABILITY_SLO_TARGET_BASIS_POINTS &&
      Number(rawAlert.validEvents) >=
        configuration.alertPolicy.minimumValidEvents;
  }

  return Number(rawAlert.validEvents) <
    configuration.alertPolicy.minimumValidEvents;
}

function requestBody(
  alert: Parameters<OperationalAlertSink["send"]>[0],
  configuration: BetterStackIncidentAlertConfiguration,
): Readonly<Record<string, unknown>> {
  const codeLabel = alert.code === "SLO_BREACH"
    ? "availability SLO breach"
    : "SLO insufficient data";
  const observed = alert.observedBasisPoints === null
    ? "unavailable"
    : String(alert.observedBasisPoints);

  return Object.freeze({
    summary:
      `Connect ${configuration.runtimeEnvironment} ${codeLabel}`,
    requester_email: configuration.requesterEmail,
    description: [
      `Code: ${alert.code}`,
      `Window start: ${alert.windowStartedAt}`,
      `Window end: ${alert.windowEndedAt}`,
      `Target basis points: ${alert.targetBasisPoints}`,
      `Observed basis points: ${observed}`,
      `Valid events: ${alert.validEvents}`,
    ].join("\n"),
    call: configuration.channels.call,
    sms: configuration.channels.sms,
    email: configuration.channels.email,
    push: configuration.channels.push,
    critical_alert: configuration.channels.criticalAlert,
    team_wait: configuration.teamWaitSeconds,
    policy_id: configuration.escalationPolicyId,
  });
}

async function readBoundedJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.trim() ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new Error("INVALID_RESPONSE");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^[0-9]+$/.test(contentLength)) {
      throw new Error("INVALID_RESPONSE");
    }
    const parsed = Number(contentLength);
    if (!Number.isSafeInteger(parsed) || parsed > maximumResponseBytes) {
      throw new Error("INVALID_RESPONSE");
    }
  }
  if (response.body === null) {
    throw new Error("INVALID_RESPONSE");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      totalBytes += result.value.byteLength;
      if (totalBytes > maximumResponseBytes) {
        await reader.cancel();
        throw new Error("INVALID_RESPONSE");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (totalBytes === 0) {
    throw new Error("INVALID_RESPONSE");
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("INVALID_RESPONSE");
  }
}

function validIncidentResponse(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.data)) {
    return false;
  }
  const id = value.data.id;
  return value.data.type === "incident" &&
    typeof id === "string" && id.length >= 1 && id.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(id);
}

const defaultDependencies = Object.freeze({
  fetchImplementation: fetch,
  createTimeoutSignal(timeoutMilliseconds: number) {
    return AbortSignal.timeout(timeoutMilliseconds);
  },
}) satisfies BetterStackIncidentAlertDependencies;

function requireConfiguration(
  configuration: BetterStackIncidentAlertConfiguration,
): void {
  const inspection = inspectBetterStackIncidentAlertConfiguration({
    APP_RUNTIME_ENVIRONMENT: configuration.runtimeEnvironment,
    SLO_MEASUREMENT_WINDOW_MINUTES:
      String(configuration.alertPolicy.measurementWindowMinutes),
    SLO_MINIMUM_VALID_EVENTS:
      String(configuration.alertPolicy.minimumValidEvents),
    SLO_ALERT_OWNER: configuration.alertPolicy.owner,
    SLO_ALERT_ESCALATION_ROUTE:
      configuration.alertPolicy.escalationRoute,
    BETTER_STACK_INCIDENT_API_TOKEN: configuration.apiToken,
    BETTER_STACK_INCIDENT_REQUESTER_EMAIL: configuration.requesterEmail,
    BETTER_STACK_INCIDENT_ESCALATION_POLICY_ID:
      configuration.escalationPolicyId,
    BETTER_STACK_INCIDENT_NOTIFY_CALL: String(configuration.channels.call),
    BETTER_STACK_INCIDENT_NOTIFY_SMS: String(configuration.channels.sms),
    BETTER_STACK_INCIDENT_NOTIFY_EMAIL: String(configuration.channels.email),
    BETTER_STACK_INCIDENT_NOTIFY_PUSH: String(configuration.channels.push),
    BETTER_STACK_INCIDENT_NOTIFY_CRITICAL:
      String(configuration.channels.criticalAlert),
    BETTER_STACK_INCIDENT_TEAM_WAIT_SECONDS:
      String(configuration.teamWaitSeconds),
  });
  if (inspection.status !== "configured") {
    throw new Error("BETTER_STACK_INCIDENT_CONFIGURATION_INVALID");
  }
}

function requireDependencies(
  dependencies: BetterStackIncidentAlertDependencies,
): void {
  if (
    !isRecord(dependencies) ||
    !hasExactKeys(dependencies, ["fetchImplementation", "createTimeoutSignal"]) ||
    typeof dependencies.fetchImplementation !== "function" ||
    typeof dependencies.createTimeoutSignal !== "function"
  ) {
    throw new Error("BETTER_STACK_INCIDENT_CONFIGURATION_INVALID");
  }
}

export function createBetterStackIncidentAlertSink(
  configuration: BetterStackIncidentAlertConfiguration,
  dependencies: BetterStackIncidentAlertDependencies = defaultDependencies,
): OperationalAlertSink {
  requireConfiguration(configuration);
  requireDependencies(dependencies);

  return Object.freeze({
    async send(
      rawAlert: Parameters<OperationalAlertSink["send"]>[0],
    ) {
      if (!validAlert(rawAlert, configuration)) {
        return { outcome: "unavailable" };
      }

      try {
        const signal = dependencies.createTimeoutSignal(
          requestTimeoutMilliseconds,
        );
        if (!(signal instanceof AbortSignal)) {
          return { outcome: "unavailable" };
        }
        const response = await dependencies.fetchImplementation(
          BETTER_STACK_INCIDENT_ENDPOINT,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${configuration.apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody(rawAlert, configuration)),
            redirect: "error",
            signal,
          },
        );
        if (response.status !== 201) {
          return { outcome: "unavailable" };
        }
        const responseBody = await readBoundedJsonResponse(response);
        return validIncidentResponse(responseBody)
          ? { outcome: "accepted" }
          : { outcome: "unavailable" };
      } catch {
        return { outcome: "unavailable" };
      }
    },
  });
}
