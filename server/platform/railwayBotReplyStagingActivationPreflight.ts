import {
  requireMetaAuthorizationCodeExchangeConfiguration,
  type MetaAuthorizationCodeExchangeEnvironment,
} from "../meta/metaAuthorizationCodeExchangeConfiguration.ts";
import {
  inspectMetaCredentialEncryptionConfiguration,
  type MetaCredentialEncryptionEnvironment,
} from "../meta/metaCredentialVault.ts";
import {
  createBotReplyStagingPrivateCaseSource,
  type BotReplyStagingPrivateCaseEnvironment,
} from "../operations/botReplyStagingPrivateCaseSource.ts";
import {
  inspectBotReplyStagingObservationHmacConfiguration,
  type BotReplyStagingObservationEnvironment,
} from "../operations/botReplyStagingObservationSource.ts";
import {
  createBotReplyStagingRecipientFingerprintDeriver,
  type BotReplyStagingRecipientFingerprintEnvironment,
} from "../operations/botReplyStagingRecipientFingerprint.ts";
import {
  inspectBetterStackStagingEvidence,
  type BetterStackStagingEvidenceEnvironment,
} from "../operations/betterStackStagingEvidence.ts";

export const railwayBotReplyStagingActivationPreflightVersion =
  "connect-railway-bot-reply-staging-activation-preflight-v2" as const;

export type RailwayBotReplyStagingActivationEnvironment =
  BotReplyStagingPrivateCaseEnvironment &
  BotReplyStagingRecipientFingerprintEnvironment &
  BotReplyStagingObservationEnvironment &
  MetaAuthorizationCodeExchangeEnvironment &
  MetaCredentialEncryptionEnvironment &
  BetterStackStagingEvidenceEnvironment & Readonly<{
  readonly BOT_REPLY_STAGING_ENABLED?: string;
}>;

export interface RailwayBotReplyStagingActivationClock {
  now(): Date;
}

export type RailwayBotReplyStagingActivationCheckId =
  | "runtime-environment"
  | "private-case-inventory"
  | "recipient-fingerprint"
  | "observation-proof"
  | "meta-graph"
  | "credential-encryption"
  | "telemetry-evidence";

export type RailwayBotReplyStagingActivationReport = Readonly<{
  schemaVersion: 2;
  preflightVersion: typeof railwayBotReplyStagingActivationPreflightVersion;
  activationAllowed: false;
  status: "quarantined" | "disabled" | "blocked";
  code:
    | "BOT_REPLY_STAGING_LEGACY_EXECUTION_QUARANTINED"
    | "BOT_REPLY_STAGING_ACTIVATION_DISABLED"
    | "BOT_REPLY_STAGING_ACTIVATION_REQUIRED";
  passedCheckCount: number;
  requiredCheckCount: 7;
  checks: readonly Readonly<{
    id: RailwayBotReplyStagingActivationCheckId;
    status: "passed" | "blocked";
  }>[];
}>;

const requiredChecks = Object.freeze([
  "runtime-environment",
  "private-case-inventory",
  "recipient-fingerprint",
  "observation-proof",
  "meta-graph",
  "credential-encryption",
  "telemetry-evidence",
] as const satisfies readonly RailwayBotReplyStagingActivationCheckId[]);

function report(
  status: RailwayBotReplyStagingActivationReport["status"],
  code: RailwayBotReplyStagingActivationReport["code"],
  checks: RailwayBotReplyStagingActivationReport["checks"],
): RailwayBotReplyStagingActivationReport {
  const passedCheckCount = checks.filter(
    (check) => check.status === "passed",
  ).length;
  return Object.freeze({
    schemaVersion: 2 as const,
    preflightVersion: railwayBotReplyStagingActivationPreflightVersion,
    activationAllowed: false as const,
    status,
    code,
    passedCheckCount,
    requiredCheckCount: 7 as const,
    checks: Object.freeze(checks),
  });
}

function checked(
  id: RailwayBotReplyStagingActivationCheckId,
  action: () => boolean,
): Readonly<{
  id: RailwayBotReplyStagingActivationCheckId;
  status: "passed" | "blocked";
}> {
  let passed = false;
  try {
    passed = action() === true;
  } catch {
    passed = false;
  }
  return Object.freeze({
    id,
    status: passed ? "passed" as const : "blocked" as const,
  });
}

function validNow(
  clock: Readonly<RailwayBotReplyStagingActivationClock>,
): Date | null {
  try {
    const now = clock.now();
    return now instanceof Date && Number.isFinite(now.getTime())
      ? new Date(now.getTime())
      : null;
  } catch {
    return null;
  }
}

export function inspectRailwayBotReplyStagingActivation(
  environment: Readonly<RailwayBotReplyStagingActivationEnvironment>,
  clock: Readonly<RailwayBotReplyStagingActivationClock> = Object.freeze({
    now: () => new Date(),
  }),
): RailwayBotReplyStagingActivationReport {
  if (!environment || typeof environment !== "object") {
    return report(
      "blocked",
      "BOT_REPLY_STAGING_ACTIVATION_REQUIRED",
      requiredChecks.map((id) => Object.freeze({ id, status: "blocked" })),
    );
  }

  const optIn = environment.BOT_REPLY_STAGING_ENABLED;
  if (optIn === undefined || optIn === "" || optIn === "false") {
    return report(
      "disabled",
      "BOT_REPLY_STAGING_ACTIVATION_DISABLED",
      Object.freeze([]),
    );
  }
  if (optIn !== "true") {
    return report(
      "blocked",
      "BOT_REPLY_STAGING_ACTIVATION_REQUIRED",
      requiredChecks.map((id) => Object.freeze({ id, status: "blocked" })),
    );
  }

  const now = validNow(clock);
  const checks = Object.freeze([
    checked(
      "runtime-environment",
      () => environment.APP_RUNTIME_ENVIRONMENT === "staging" && now !== null,
    ),
    checked(
      "private-case-inventory",
      () => now !== null && createBotReplyStagingPrivateCaseSource(
        environment,
        Object.freeze({ now: () => new Date(now.getTime()) }),
      ).isConfigured() === true,
    ),
    checked(
      "recipient-fingerprint",
      () => createBotReplyStagingRecipientFingerprintDeriver(environment)
        .isConfigured() === true,
    ),
    checked(
      "observation-proof",
      () => inspectBotReplyStagingObservationHmacConfiguration(environment) ===
        "configured",
    ),
    checked(
      "meta-graph",
      () => {
        requireMetaAuthorizationCodeExchangeConfiguration(environment);
        return true;
      },
    ),
    checked(
      "credential-encryption",
      () => inspectMetaCredentialEncryptionConfiguration(environment) ===
        "configured",
    ),
    checked(
      "telemetry-evidence",
      () => now !== null &&
        inspectBetterStackStagingEvidence(environment, now).status ===
          "configured",
    ),
  ]);
  const allDiagnosticChecksPassed = checks.every(
    (check) => check.status === "passed",
  );
  return report(
    allDiagnosticChecksPassed ? "quarantined" : "blocked",
    allDiagnosticChecksPassed
      ? "BOT_REPLY_STAGING_LEGACY_EXECUTION_QUARANTINED"
      : "BOT_REPLY_STAGING_ACTIVATION_REQUIRED",
    checks,
  );
}
