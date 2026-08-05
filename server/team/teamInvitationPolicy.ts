const MAXIMUM_TTL_HOURS = 8_760;

export type TeamInvitationReRequestPolicy =
  | "disabled"
  | "after-terminal";

export interface TeamInvitationPolicy {
  ttlHours: number;
  reRequest:
    TeamInvitationReRequestPolicy;
}

export interface TeamInvitationPolicyEnvironment {
  TEAM_INVITATION_TTL_HOURS?:
    string;
  TEAM_INVITATION_REREQUEST_POLICY?:
    string;
}

export type TeamInvitationPolicyIssue =
  | "TTL_HOURS_REQUIRED"
  | "TTL_HOURS_INVALID"
  | "REREQUEST_POLICY_REQUIRED"
  | "REREQUEST_POLICY_INVALID";

export type TeamInvitationPolicyInspection =
  | {
      status: "configured";
      policy: TeamInvitationPolicy;
    }
  | {
      status:
        "configuration-required";
      issues:
        readonly TeamInvitationPolicyIssue[];
    };

export class TeamInvitationPolicyConfigurationError
  extends Error {
  constructor() {
    super(
      "Team invitation policy configuration is required",
    );
    this.name =
      "TeamInvitationPolicyConfigurationError";
  }
}

function parseTtlHours(
  value: string | undefined,
): number | null {
  if (
    typeof value !== "string" ||
    !/^[1-9][0-9]{0,3}$/.test(
      value,
    )
  ) {
    return null;
  }

  const parsed = Number(value);

  return (
    Number.isSafeInteger(parsed) &&
    parsed <= MAXIMUM_TTL_HOURS
  )
    ? parsed
    : null;
}

function parseReRequestPolicy(
  value: string | undefined,
): TeamInvitationReRequestPolicy | null {
  return (
    value === "disabled" ||
    value === "after-terminal"
  )
    ? value
    : null;
}

function readProcessEnvironment():
TeamInvitationPolicyEnvironment {
  return {
    TEAM_INVITATION_TTL_HOURS:
      process.env
        .TEAM_INVITATION_TTL_HOURS,
    TEAM_INVITATION_REREQUEST_POLICY:
      process.env
        .TEAM_INVITATION_REREQUEST_POLICY,
  };
}

export function inspectTeamInvitationPolicy(
  environment:
    TeamInvitationPolicyEnvironment =
      readProcessEnvironment(),
): TeamInvitationPolicyInspection {
  const issues:
    TeamInvitationPolicyIssue[] = [];
  const ttlHours =
    parseTtlHours(
      environment
        .TEAM_INVITATION_TTL_HOURS,
    );
  const reRequest =
    parseReRequestPolicy(
      environment
        .TEAM_INVITATION_REREQUEST_POLICY,
    );

  if (
    environment
      .TEAM_INVITATION_TTL_HOURS ===
    undefined
  ) {
    issues.push(
      "TTL_HOURS_REQUIRED",
    );
  } else if (ttlHours === null) {
    issues.push(
      "TTL_HOURS_INVALID",
    );
  }

  if (
    environment
      .TEAM_INVITATION_REREQUEST_POLICY ===
    undefined
  ) {
    issues.push(
      "REREQUEST_POLICY_REQUIRED",
    );
  } else if (reRequest === null) {
    issues.push(
      "REREQUEST_POLICY_INVALID",
    );
  }

  if (
    issues.length > 0 ||
    ttlHours === null ||
    reRequest === null
  ) {
    return {
      status:
        "configuration-required",
      issues,
    };
  }

  return {
    status: "configured",
    policy: {
      ttlHours,
      reRequest,
    },
  };
}

export function requireTeamInvitationPolicy(
  environment?:
    TeamInvitationPolicyEnvironment,
): TeamInvitationPolicy {
  const inspection =
    inspectTeamInvitationPolicy(
      environment,
    );

  if (
    inspection.status !==
    "configured"
  ) {
    throw new TeamInvitationPolicyConfigurationError();
  }

  return inspection.policy;
}
