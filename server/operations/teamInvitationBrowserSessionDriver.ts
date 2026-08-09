import {
  requireTeamInvitationKey,
} from "../team/teamInvitationValidation.ts";
import {
  findTeamInvitationBrowserScenario,
  type TeamInvitationBrowserScenarioName,
} from "./teamInvitationBrowserScenarioRegistry.ts";
import {
  resolvePublicOrigin,
} from "./publicOrigin.ts";

const fingerprintPattern =
  /^sha256:[a-f0-9]{64}$/;
const maximumExposedElementCount = 1_000;

export type TeamInvitationBrowserSessionProfile =
  | "signed-out"
  | "unverified-primary-email"
  | "verified-matching-email"
  | "verified-mismatched-email"
  | "verified-expired-invitation"
  | "verified-accepted-invitation"
  | "verified-accessibility";

export interface TeamInvitationBrowserSessionDriver {
  runIsolatedScenario(
    input: Readonly<{
      scenarioName:
        TeamInvitationBrowserScenarioName;
      invitationUrl: string;
      sessionProfile:
        TeamInvitationBrowserSessionProfile;
      interaction:
        | "submit"
        | "keyboard-submit";
    }>,
    signal: AbortSignal,
  ): Promise<unknown>;
}

export type TeamInvitationBrowserSessionDriverErrorCode =
  | "INVALID_CONFIGURATION"
  | "INVALID_INPUT"
  | "ABORTED"
  | "DRIVER_UNAVAILABLE"
  | "DRIVER_RESULT_INVALID";

export class TeamInvitationBrowserSessionDriverError
  extends Error {
  readonly code:
    TeamInvitationBrowserSessionDriverErrorCode;

  constructor(
    code:
      TeamInvitationBrowserSessionDriverErrorCode,
  ) {
    super(code);
    this.name =
      "TeamInvitationBrowserSessionDriverError";
    this.code = code;
  }
}

function isPlainObject(
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
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return (
    actual.length === expected.length &&
    actual.every(
      (key, index) =>
        key === expected[index],
    )
  );
}

function isCanonicalTimestamp(
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const milliseconds = Date.parse(value);

  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value
  );
}

function parseExposedCount(
  value: unknown,
): number | null {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= maximumExposedElementCount
  )
    ? value
    : null;
}

function isRemoteStagingOrigin(
  value: unknown,
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const origin = resolvePublicOrigin({
    APP_PUBLIC_ORIGIN: value,
    NODE_ENV: "production",
  });

  if (origin !== value) {
    return false;
  }

  const hostname = new URL(origin).hostname;

  return ![
    "localhost",
    "127.0.0.1",
    "[::1]",
  ].includes(hostname);
}

const profileByScenario:
  Readonly<
    Record<
      TeamInvitationBrowserScenarioName,
      TeamInvitationBrowserSessionProfile
    >
  > = Object.freeze({
    "unauthenticated-user-rejected":
      "signed-out",
    "unverified-primary-email-rejected":
      "unverified-primary-email",
    "verified-matching-email-accepts":
      "verified-matching-email",
    "mismatched-email-remains-private":
      "verified-mismatched-email",
    "expired-invitation-rejected":
      "verified-expired-invitation",
    "identical-retry-idempotent":
      "verified-accepted-invitation",
    "keyboard-and-focus-accessible":
      "verified-accessibility",
  });

type BrowserOutcome =
  | "sign-in-required"
  | "identity-verification-required"
  | "accepted"
  | "invitation-unavailable"
  | "already-accepted";

interface AccessibilityTranscript {
  focusOrder: readonly string[];
  submittedWith: "keyboard";
  statusLiveRegion: "polite";
  announcementObserved: boolean;
  focusIndicatorVisible: boolean;
}

interface ScenarioTranscript {
  completedAt: string;
  runFingerprint: string;
  sessionIsolation:
    "isolated-and-closed";
  navigatedOrigin: string;
  outcome: BrowserOutcome;
  exposedPrivateFieldCount: number;
  exposedInvitationDetailCount: number;
  accessibility:
    AccessibilityTranscript | null;
}

function parseAccessibility(
  value: unknown,
): AccessibilityTranscript | null {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "focusOrder",
      "submittedWith",
      "statusLiveRegion",
      "announcementObserved",
      "focusIndicatorVisible",
    ]) ||
    !Array.isArray(value.focusOrder) ||
    value.focusOrder.some(
      (item) => typeof item !== "string",
    ) ||
    value.submittedWith !== "keyboard" ||
    value.statusLiveRegion !== "polite" ||
    typeof value.announcementObserved !==
      "boolean" ||
    typeof value.focusIndicatorVisible !==
      "boolean"
  ) {
    return null;
  }

  return Object.freeze({
    focusOrder: Object.freeze([
      ...value.focusOrder,
    ] as string[]),
    submittedWith: "keyboard" as const,
    statusLiveRegion: "polite" as const,
    announcementObserved:
      value.announcementObserved,
    focusIndicatorVisible:
      value.focusIndicatorVisible,
  });
}

function parseTranscript(
  value: unknown,
  origin: string,
  accessibilityScenario: boolean,
): ScenarioTranscript {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, [
      "completedAt",
      "runFingerprint",
      "sessionIsolation",
      "navigatedOrigin",
      "outcome",
      "exposedPrivateFieldCount",
      "exposedInvitationDetailCount",
      "accessibility",
    ]) ||
    !isCanonicalTimestamp(value.completedAt) ||
    typeof value.runFingerprint !== "string" ||
    !fingerprintPattern.test(
      value.runFingerprint,
    ) ||
    value.sessionIsolation !==
      "isolated-and-closed" ||
    value.navigatedOrigin !== origin ||
    ![
      "sign-in-required",
      "identity-verification-required",
      "accepted",
      "invitation-unavailable",
      "already-accepted",
    ].includes(value.outcome as string)
  ) {
    throw new TeamInvitationBrowserSessionDriverError(
      "DRIVER_RESULT_INVALID",
    );
  }

  const exposedPrivateFieldCount =
    parseExposedCount(
      value.exposedPrivateFieldCount,
    );
  const exposedInvitationDetailCount =
    parseExposedCount(
      value.exposedInvitationDetailCount,
    );
  const accessibility =
    value.accessibility === null
      ? null
      : parseAccessibility(
          value.accessibility,
        );

  if (
    exposedPrivateFieldCount === null ||
    exposedInvitationDetailCount === null ||
    (
      accessibilityScenario &&
      (
        accessibility === null ||
        value.outcome !==
          "already-accepted"
      )
    ) ||
    (!accessibilityScenario &&
      value.accessibility !== null)
  ) {
    throw new TeamInvitationBrowserSessionDriverError(
      "DRIVER_RESULT_INVALID",
    );
  }

  return {
    completedAt: value.completedAt,
    runFingerprint:
      value.runFingerprint,
    sessionIsolation:
      "isolated-and-closed",
    navigatedOrigin: origin,
    outcome:
      value.outcome as BrowserOutcome,
    exposedPrivateFieldCount,
    exposedInvitationDetailCount,
    accessibility,
  };
}

const expectedFocusOrder =
  Object.freeze([
    "skip-link",
    "brand-link",
    "accept-button",
    "home-link",
  ]);

function focusOrderValid(
  value: readonly string[],
): boolean {
  return (
    value.length === expectedFocusOrder.length &&
    value.every(
      (item, index) =>
        item === expectedFocusOrder[index],
    )
  );
}

function observationFor(
  assertionName: string,
  transcript: ScenarioTranscript,
): unknown {
  switch (assertionName) {
    case "sign-in-required":
    case "identity-verification-required":
    case "acceptance-confirmed":
    case "generic-unavailable-result":
    case "already-accepted-result":
      return {
        observed: transcript.outcome,
      };
    case "private-fields-absent":
      return {
        exposedFieldCount:
          transcript.exposedPrivateFieldCount,
      };
    case "invitation-details-private":
      return {
        exposedDetailCount:
          transcript
            .exposedInvitationDetailCount,
      };
    case "initial-focus-order-valid":
      return {
        valid:
          transcript.accessibility !== null &&
          focusOrderValid(
            transcript.accessibility
              .focusOrder,
          ),
      };
    case "submit-keyboard-operable":
      return {
        submittedWith:
          transcript.accessibility
            ?.submittedWith,
      };
    case "status-announced":
      return {
        politeStatusObserved:
          transcript.accessibility !== null &&
          transcript.accessibility
            .statusLiveRegion === "polite" &&
          transcript.accessibility
            .announcementObserved,
      };
    case "focus-visible":
      return {
        visible:
          transcript.accessibility
            ?.focusIndicatorVisible ?? false,
      };
    default:
      throw new TeamInvitationBrowserSessionDriverError(
        "DRIVER_RESULT_INVALID",
      );
  }
}

function validateDriver(
  value: unknown,
): value is TeamInvitationBrowserSessionDriver {
  return (
    isPlainObject(value) &&
    hasExactKeys(value, [
      "runIsolatedScenario",
    ]) &&
    typeof value.runIsolatedScenario ===
      "function"
  );
}

export function createTeamInvitationBrowserExecutorBrowserPort(
  configuration: unknown,
  driver: TeamInvitationBrowserSessionDriver,
) {
  if (
    !isPlainObject(configuration) ||
    !hasExactKeys(configuration, [
      "origin",
    ]) ||
    !isRemoteStagingOrigin(
      configuration.origin,
    ) ||
    !validateDriver(driver)
  ) {
    throw new TeamInvitationBrowserSessionDriverError(
      "INVALID_CONFIGURATION",
    );
  }

  const origin = configuration.origin;

  return Object.freeze({
    async executeBrowserScenario(
      input: unknown,
      signal: AbortSignal,
    ) {
      if (signal.aborted) {
        throw new TeamInvitationBrowserSessionDriverError(
          "ABORTED",
        );
      }

      if (
        !isPlainObject(input) ||
        !hasExactKeys(input, [
          "scenarioName",
          "invitationKey",
        ]) ||
        typeof input.scenarioName !== "string"
      ) {
        throw new TeamInvitationBrowserSessionDriverError(
          "INVALID_INPUT",
        );
      }

      const scenario =
        findTeamInvitationBrowserScenario(
          input.scenarioName,
        );
      let invitationKey: string;

      try {
        invitationKey =
          requireTeamInvitationKey(
            input.invitationKey,
          );
      } catch {
        throw new TeamInvitationBrowserSessionDriverError(
          "INVALID_INPUT",
        );
      }

      if (scenario === null) {
        throw new TeamInvitationBrowserSessionDriverError(
          "INVALID_INPUT",
        );
      }

      const accessibilityScenario =
        scenario.name ===
        "keyboard-and-focus-accessible";
      let rawTranscript: unknown;

      try {
        rawTranscript =
          await driver.runIsolatedScenario(
            {
              scenarioName:
                scenario.name,
              invitationUrl:
                `${origin}/invite/${invitationKey}`,
              sessionProfile:
                profileByScenario[
                  scenario.name
                ],
              interaction:
                accessibilityScenario
                  ? "keyboard-submit"
                  : "submit",
            },
            signal,
          );
      } catch {
        if (signal.aborted) {
          throw new TeamInvitationBrowserSessionDriverError(
            "ABORTED",
          );
        }

        throw new TeamInvitationBrowserSessionDriverError(
          "DRIVER_UNAVAILABLE",
        );
      }

      const transcript = parseTranscript(
        rawTranscript,
        origin,
        accessibilityScenario,
      );
      const observations =
        scenario.assertions.flatMap(
          (assertion) =>
            assertion.source === "browser"
              ? [
                  Object.freeze({
                    name: assertion.name,
                    observation:
                      observationFor(
                        assertion.name,
                        transcript,
                      ),
                  }),
                ]
              : [],
        );

      return Object.freeze({
        completedAt:
          transcript.completedAt,
        runFingerprint:
          transcript.runFingerprint,
        observations:
          Object.freeze(observations),
      });
    },
  });
}
