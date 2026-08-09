import {
  inspectClerkConfiguration,
  type ClerkConfigurationState,
} from "../auth/clerkConfiguration.ts";
import {
  inspectDeploymentProvenanceEvidence,
  type DeploymentProvenanceReport,
} from "../operations/deploymentProvenanceEvidence.ts";
import {
  resolvePublicOrigin,
} from "../operations/publicOrigin.ts";
import {
  inspectTeamInvitationBrowserEvidence,
  type TeamInvitationBrowserEvidenceReport,
} from "../operations/teamInvitationBrowserEvidence.ts";
import {
  inspectTeamInvitationPolicy,
  type TeamInvitationPolicyInspection,
} from "./teamInvitationPolicy.ts";

const commitPattern = /^[a-f0-9]{40}$/;
const releaseIdPattern =
  /^connect_release_v1_[a-f0-9]{64}$/;
const artifactDigestPattern =
  /^sha256:[a-f0-9]{64}$/;

export type TeamInvitationAcceptanceMode =
  | "disabled"
  | "staging-e2e"
  | "production";

export interface TeamInvitationAcceptanceActivationEnvironment {
  NODE_ENV?: string;
  APP_RUNTIME_ENVIRONMENT?: string;
  APP_PUBLIC_ORIGIN?: string;
  APP_DEPLOYED_COMMIT_SHA?: string;
  APP_RELEASE_ID?: string;
  APP_DEPLOYMENT_ARTIFACT_DIGEST?: string;
  DEPLOYMENT_PROVENANCE_EVIDENCE_JSON?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  TEAM_INVITATION_ACCEPTANCE_MODE?: string;
  TEAM_INVITATION_TTL_HOURS?: string;
  TEAM_INVITATION_REREQUEST_POLICY?: string;
  TEAM_INVITATION_BROWSER_E2E_ORIGIN?: string;
  TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON?: string;
}

export type TeamInvitationAcceptanceActivationBlocker =
  | "TEAM_INVITATION_ACCEPTANCE_DISABLED"
  | "TEAM_INVITATION_ACCEPTANCE_CONFIGURATION_INVALID"
  | "CLERK_CONFIGURATION_REQUIRED"
  | "TEAM_INVITATION_POLICY_REQUIRED"
  | "TEAM_INVITATION_STAGING_CONFIGURATION_REQUIRED"
  | "TEAM_INVITATION_PRODUCTION_CONFIGURATION_REQUIRED"
  | TeamInvitationBrowserEvidenceReport["code"]
  | DeploymentProvenanceReport["code"];

export type TeamInvitationAcceptanceActivationReport =
  Readonly<
    | {
        status: "ready";
        code: "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_VERIFIED";
        mode: Exclude<
          TeamInvitationAcceptanceMode,
          "disabled"
        >;
        blockerCodes: readonly [];
      }
    | {
        status: "blocked";
        code: "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_BLOCKED";
        mode: TeamInvitationAcceptanceMode | "invalid";
        blockerCodes:
          readonly TeamInvitationAcceptanceActivationBlocker[];
      }
  >;

export interface TeamInvitationAcceptanceActivationInspection {
  mode: string | undefined;
  nodeEnvironment: string | undefined;
  runtimeEnvironment: string | undefined;
  publicOrigin: string | null;
  stagingOrigin: string | null;
  deploymentIdentityValid: boolean;
  clerk: ClerkConfigurationState;
  policy: TeamInvitationPolicyInspection;
  browserEvidence: TeamInvitationBrowserEvidenceReport;
  deploymentProvenance: DeploymentProvenanceReport;
}

function readProcessEnvironment():
TeamInvitationAcceptanceActivationEnvironment {
  return {
    NODE_ENV: process.env.NODE_ENV,
    APP_RUNTIME_ENVIRONMENT:
      process.env.APP_RUNTIME_ENVIRONMENT,
    APP_PUBLIC_ORIGIN:
      process.env.APP_PUBLIC_ORIGIN,
    APP_DEPLOYED_COMMIT_SHA:
      process.env.APP_DEPLOYED_COMMIT_SHA,
    APP_RELEASE_ID:
      process.env.APP_RELEASE_ID,
    APP_DEPLOYMENT_ARTIFACT_DIGEST:
      process.env
        .APP_DEPLOYMENT_ARTIFACT_DIGEST,
    DEPLOYMENT_PROVENANCE_EVIDENCE_JSON:
      process.env
        .DEPLOYMENT_PROVENANCE_EVIDENCE_JSON,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env
        .NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY:
      process.env.CLERK_SECRET_KEY,
    TEAM_INVITATION_ACCEPTANCE_MODE:
      process.env
        .TEAM_INVITATION_ACCEPTANCE_MODE,
    TEAM_INVITATION_TTL_HOURS:
      process.env
        .TEAM_INVITATION_TTL_HOURS,
    TEAM_INVITATION_REREQUEST_POLICY:
      process.env
        .TEAM_INVITATION_REREQUEST_POLICY,
    TEAM_INVITATION_BROWSER_E2E_ORIGIN:
      process.env
        .TEAM_INVITATION_BROWSER_E2E_ORIGIN,
    TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON:
      process.env
        .TEAM_INVITATION_BROWSER_E2E_EVIDENCE_JSON,
  };
}

function isRemoteHttpsOrigin(
  value: string | null,
): value is string {
  if (value === null) {
    return false;
  }

  const hostname = new URL(value).hostname;

  return (
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    hostname !== "[::1]"
  );
}

function hasValidDeploymentIdentity(
  environment:
    TeamInvitationAcceptanceActivationEnvironment,
): boolean {
  return (
    typeof environment
      .APP_DEPLOYED_COMMIT_SHA === "string" &&
    commitPattern.test(
      environment.APP_DEPLOYED_COMMIT_SHA,
    ) &&
    typeof environment.APP_RELEASE_ID ===
      "string" &&
    releaseIdPattern.test(
      environment.APP_RELEASE_ID,
    ) &&
    typeof environment
      .APP_DEPLOYMENT_ARTIFACT_DIGEST ===
      "string" &&
    artifactDigestPattern.test(
      environment
        .APP_DEPLOYMENT_ARTIFACT_DIGEST,
    )
  );
}

function blocked(
  mode:
    TeamInvitationAcceptanceActivationReport["mode"],
  blockerCodes:
    readonly TeamInvitationAcceptanceActivationBlocker[],
): TeamInvitationAcceptanceActivationReport {
  return {
    status: "blocked",
    code:
      "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_BLOCKED",
    mode,
    blockerCodes:
      Object.freeze([...blockerCodes]),
  };
}

export function evaluateTeamInvitationAcceptanceActivation(
  inspection:
    TeamInvitationAcceptanceActivationInspection,
): TeamInvitationAcceptanceActivationReport {
  if (
    inspection.mode === undefined ||
    inspection.mode === "" ||
    inspection.mode === "disabled"
  ) {
    return blocked("disabled", [
      "TEAM_INVITATION_ACCEPTANCE_DISABLED",
    ]);
  }

  if (
    inspection.mode !== "staging-e2e" &&
    inspection.mode !== "production"
  ) {
    return blocked("invalid", [
      "TEAM_INVITATION_ACCEPTANCE_CONFIGURATION_INVALID",
    ]);
  }

  const blockerCodes:
    TeamInvitationAcceptanceActivationBlocker[] = [];

  if (inspection.clerk.status !== "configured") {
    blockerCodes.push(
      "CLERK_CONFIGURATION_REQUIRED",
    );
  }

  if (inspection.policy.status !== "configured") {
    blockerCodes.push(
      "TEAM_INVITATION_POLICY_REQUIRED",
    );
  }

  if (inspection.mode === "staging-e2e") {
    if (
      inspection.nodeEnvironment !== "production" ||
      inspection.runtimeEnvironment !== "staging" ||
      !isRemoteHttpsOrigin(
        inspection.publicOrigin,
      ) ||
      inspection.publicOrigin !==
        inspection.stagingOrigin ||
      !inspection.deploymentIdentityValid
    ) {
      blockerCodes.push(
        "TEAM_INVITATION_STAGING_CONFIGURATION_REQUIRED",
      );
    }
  } else {
    if (
      inspection.nodeEnvironment !== "production" ||
      inspection.runtimeEnvironment !== "production" ||
      !isRemoteHttpsOrigin(
        inspection.publicOrigin,
      ) ||
      !isRemoteHttpsOrigin(
        inspection.stagingOrigin,
      ) ||
      inspection.publicOrigin ===
        inspection.stagingOrigin ||
      !inspection.deploymentIdentityValid
    ) {
      blockerCodes.push(
        "TEAM_INVITATION_PRODUCTION_CONFIGURATION_REQUIRED",
      );
    }

    if (
      inspection.browserEvidence.status !==
      "configured"
    ) {
      blockerCodes.push(
        inspection.browserEvidence.code,
      );
    }

    if (
      inspection.deploymentProvenance.status !==
      "configured"
    ) {
      blockerCodes.push(
        inspection.deploymentProvenance.code,
      );
    }
  }

  if (blockerCodes.length > 0) {
    return blocked(
      inspection.mode,
      blockerCodes,
    );
  }

  return {
    status: "ready",
    code:
      "TEAM_INVITATION_ACCEPTANCE_ACTIVATION_VERIFIED",
    mode: inspection.mode,
    blockerCodes: [],
  };
}

export function inspectTeamInvitationAcceptanceActivation(
  environment:
    TeamInvitationAcceptanceActivationEnvironment =
      readProcessEnvironment(),
  now: Date = new Date(),
): TeamInvitationAcceptanceActivationReport {
  const publicOrigin =
    resolvePublicOrigin({
      APP_PUBLIC_ORIGIN:
        environment.APP_PUBLIC_ORIGIN,
      NODE_ENV:
        environment.NODE_ENV,
    });
  const stagingOrigin =
    resolvePublicOrigin({
      APP_PUBLIC_ORIGIN:
        environment
          .TEAM_INVITATION_BROWSER_E2E_ORIGIN,
      NODE_ENV: "production",
    });

  return evaluateTeamInvitationAcceptanceActivation({
    mode:
      environment
        .TEAM_INVITATION_ACCEPTANCE_MODE,
    nodeEnvironment:
      environment.NODE_ENV,
    runtimeEnvironment:
      environment.APP_RUNTIME_ENVIRONMENT,
    publicOrigin,
    stagingOrigin:
      isRemoteHttpsOrigin(stagingOrigin)
        ? stagingOrigin
        : null,
    deploymentIdentityValid:
      hasValidDeploymentIdentity(environment),
    clerk:
      inspectClerkConfiguration(environment),
    policy:
      inspectTeamInvitationPolicy(environment),
    browserEvidence:
      inspectTeamInvitationBrowserEvidence(
        environment,
        now,
      ),
    deploymentProvenance:
      inspectDeploymentProvenanceEvidence(
        environment,
        now,
      ),
  });
}
