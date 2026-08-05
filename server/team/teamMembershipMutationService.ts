import type {
  TenantMembershipMutationRepository,
} from "../../db/tenantMembershipMutationRepository.ts";
import type {
  TenantRole,
} from "../../shared/domain/model.ts";
import type {
  TeamMembership,
  TeamMembershipMutationResult,
  TeamMembershipStatus,
  TeamOwnerTransferResult,
} from "../../shared/domain/teamMembership.ts";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";
import {
  deriveTeamMemberKey,
} from "./teamMemberKey.ts";
import {
  requireFormerOwnerRole,
  requireTeamMemberKey,
  requireTeamMembershipStatus,
  requireTeamMembershipVersion,
  requireTeamRole,
  requireTeamTimestamp,
} from "./teamMembershipValidation.ts";

export type TeamMembershipMutationErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "STALE_SESSION"
  | "PERSISTENCE_FAILED";

export class TeamMembershipMutationError
  extends Error {
  readonly code:
    TeamMembershipMutationErrorCode;

  constructor(
    code:
      TeamMembershipMutationErrorCode,
  ) {
    super(
      "The team membership mutation could not be completed",
    );
    this.name =
      "TeamMembershipMutationError";
    this.code = code;
  }
}

export class TeamMembershipMutationInputError
  extends Error {
  constructor() {
    super(
      "The team membership mutation input is invalid",
    );
    this.name =
      "TeamMembershipMutationInputError";
  }
}

interface TeamMembershipMutationService {
  changeRole(
    session: TenantSession,
    input: unknown,
  ): Promise<TeamMembershipMutationResult>;
  changeStatus(
    session: TenantSession,
    input: unknown,
  ): Promise<TeamMembershipMutationResult>;
  transferOwner(
    session: TenantSession,
    input: unknown,
  ): Promise<TeamOwnerTransferResult>;
}

type Clock = () => string;

function requireExactInput(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    throw new TeamMembershipMutationInputError();
  }

  const record =
    input as Record<string, unknown>;
  const actualKeys =
    Object.keys(record).sort();
  const expectedKeys =
    [...keys].sort();

  if (
    actualKeys.length !==
      expectedKeys.length ||
    actualKeys.some(
      (key, index) =>
        key !== expectedKeys[index],
    )
  ) {
    throw new TeamMembershipMutationInputError();
  }

  return record;
}

function validateInput<TValue>(
  read: () => TValue,
): TValue {
  try {
    return read();
  } catch (error) {
    if (
      error instanceof
      TeamMembershipMutationInputError
    ) {
      throw error;
    }

    throw new TeamMembershipMutationInputError();
  }
}

function requireNonOwnerRole(
  value: unknown,
): Exclude<TenantRole, "owner"> {
  const role = requireTeamRole(value);

  if (role === "owner") {
    throw new Error(
      "owner transitions require transfer",
    );
  }

  return role;
}

function mutationError(
  outcome:
    TeamMembershipMutationResult["outcome"],
): TeamMembershipMutationError {
  switch (outcome) {
    case "not-found":
      return new TeamMembershipMutationError(
        "NOT_FOUND",
      );
    case "conflict":
      return new TeamMembershipMutationError(
        "CONFLICT",
      );
    case "invalid-transition":
      return new TeamMembershipMutationError(
        "INVALID_TRANSITION",
      );
    default:
      return new TeamMembershipMutationError(
        "PERSISTENCE_FAILED",
      );
  }
}

function validateMembershipResult(
  result:
    TeamMembershipMutationResult,
  session: TenantSession,
  target: TeamMembership,
): TeamMembershipMutationResult {
  if (
    result.outcome !== "updated" &&
    result.outcome !== "unchanged"
  ) {
    throw mutationError(
      result.outcome,
    );
  }

  if (
    result.membership === null ||
    result.membership.tenantId !==
      session.tenantId ||
    result.membership.externalUserId !==
      target.externalUserId
  ) {
    throw new TeamMembershipMutationError(
      "PERSISTENCE_FAILED",
    );
  }

  return result;
}

export function createTeamMembershipMutationService(
  repository:
    TenantMembershipMutationRepository,
  clock: Clock = () =>
    new Date().toISOString(),
): TeamMembershipMutationService {
  async function readMutationScope(
    session: TenantSession,
  ): Promise<readonly TeamMembership[]> {
    let memberships:
      readonly TeamMembership[];

    try {
      memberships =
        await repository.listByTenantId(
          session.tenantId,
        );
    } catch {
      throw new TeamMembershipMutationError(
        "PERSISTENCE_FAILED",
      );
    }

    const actorMemberships =
      memberships.filter(
        (membership) =>
          membership.externalUserId ===
          session.externalUserId,
      );

    if (
      memberships.length > 100 ||
      new Set(
        memberships.map(
          (membership) =>
            membership.externalUserId,
        ),
      ).size !== memberships.length ||
      memberships.some(
        (membership) =>
          membership.tenantId !==
          session.tenantId,
      )
    ) {
      throw new TeamMembershipMutationError(
        "PERSISTENCE_FAILED",
      );
    }

    if (
      actorMemberships.length !== 1 ||
      actorMemberships[0].role !==
        "owner" ||
      actorMemberships[0].status !==
        "active"
    ) {
      throw new TeamMembershipMutationError(
        "STALE_SESSION",
      );
    }

    return memberships;
  }

  function resolveMember(
    session: TenantSession,
    memberships:
      readonly TeamMembership[],
    memberKey: string,
  ): TeamMembership {
    const matches =
      memberships.filter(
        (membership) =>
          deriveTeamMemberKey(
            session.tenantId,
            membership.externalUserId,
          ) === memberKey,
      );

    if (matches.length !== 1) {
      throw new TeamMembershipMutationError(
        "NOT_FOUND",
      );
    }

    return matches[0];
  }

  function readOccurredAt(): string {
    try {
      return requireTeamTimestamp(
        clock(),
      );
    } catch {
      throw new TeamMembershipMutationError(
        "PERSISTENCE_FAILED",
      );
    }
  }

  async function runRepository<
    TResult,
  >(
    operation: () => Promise<TResult>,
  ): Promise<TResult> {
    try {
      return await operation();
    } catch (
      error
    ) {
      if (
        error instanceof
        TeamMembershipMutationError
      ) {
        throw error;
      }

      throw new TeamMembershipMutationError(
        "PERSISTENCE_FAILED",
      );
    }
  }

  return {
    async changeRole(
      session,
      input,
    ) {
      requireTenantPermission(
        session,
        "workspace.manage",
      );
      const parsed = validateInput(
        () => {
          const record =
            requireExactInput(
              input,
              [
                "memberKey",
                "expectedVersion",
                "role",
              ],
            );

          return {
            memberKey:
              requireTeamMemberKey(
                record.memberKey,
              ),
            expectedVersion:
              requireTeamMembershipVersion(
                record.expectedVersion,
              ),
            role:
              requireNonOwnerRole(
                record.role,
              ),
          };
        },
      );
      const memberships =
        await readMutationScope(
          session,
        );
      const target =
        resolveMember(
          session,
          memberships,
          parsed.memberKey,
        );

      if (
        target.role === "owner"
      ) {
        throw new TeamMembershipMutationError(
          "INVALID_TRANSITION",
        );
      }

      const result =
        await runRepository(
          () =>
            repository.changeRole({
              tenantId:
                session.tenantId,
              targetExternalUserId:
                target.externalUserId,
              expectedVersion:
                parsed.expectedVersion,
              toRole: parsed.role,
              actorExternalUserId:
                session.externalUserId,
              occurredAt:
                readOccurredAt(),
            }),
        );

      return validateMembershipResult(
        result,
        session,
        target,
      );
    },

    async changeStatus(
      session,
      input,
    ) {
      requireTenantPermission(
        session,
        "workspace.manage",
      );
      const parsed = validateInput(
        () => {
          const record =
            requireExactInput(
              input,
              [
                "memberKey",
                "expectedVersion",
                "status",
              ],
            );

          return {
            memberKey:
              requireTeamMemberKey(
                record.memberKey,
              ),
            expectedVersion:
              requireTeamMembershipVersion(
                record.expectedVersion,
              ),
            status:
              requireTeamMembershipStatus(
                record.status,
              ),
          };
        },
      );
      const memberships =
        await readMutationScope(
          session,
        );
      const target =
        resolveMember(
          session,
          memberships,
          parsed.memberKey,
        );

      if (
        target.role === "owner"
      ) {
        throw new TeamMembershipMutationError(
          "INVALID_TRANSITION",
        );
      }

      const result =
        await runRepository(
          () =>
            repository.changeStatus({
              tenantId:
                session.tenantId,
              targetExternalUserId:
                target.externalUserId,
              expectedVersion:
                parsed.expectedVersion,
              toStatus:
                parsed.status as
                  TeamMembershipStatus,
              actorExternalUserId:
                session.externalUserId,
              occurredAt:
                readOccurredAt(),
            }),
        );

      return validateMembershipResult(
        result,
        session,
        target,
      );
    },

    async transferOwner(
      session,
      input,
    ) {
      requireTenantPermission(
        session,
        "workspace.manage",
      );
      const parsed = validateInput(
        () => {
          const record =
            requireExactInput(
              input,
              [
                "newOwnerMemberKey",
                "formerOwnerExpectedVersion",
                "newOwnerExpectedVersion",
                "formerOwnerRole",
              ],
            );

          return {
            newOwnerMemberKey:
              requireTeamMemberKey(
                record
                  .newOwnerMemberKey,
              ),
            formerOwnerExpectedVersion:
              requireTeamMembershipVersion(
                record
                  .formerOwnerExpectedVersion,
              ),
            newOwnerExpectedVersion:
              requireTeamMembershipVersion(
                record
                  .newOwnerExpectedVersion,
              ),
            formerOwnerRole:
              requireFormerOwnerRole(
                record.formerOwnerRole,
              ),
          };
        },
      );
      const memberships =
        await readMutationScope(
          session,
        );
      const formerOwner =
        memberships.find(
          (membership) =>
            membership.externalUserId ===
            session.externalUserId,
        );
      const newOwner =
        resolveMember(
          session,
          memberships,
          parsed.newOwnerMemberKey,
        );

      if (
        formerOwner === undefined ||
        newOwner.externalUserId ===
          formerOwner.externalUserId ||
        newOwner.role === "owner" ||
        newOwner.status !== "active"
      ) {
        throw new TeamMembershipMutationError(
          "INVALID_TRANSITION",
        );
      }

      const result =
        await runRepository(
          () =>
            repository.transferOwner({
              tenantId:
                session.tenantId,
              formerOwnerExternalUserId:
                formerOwner.externalUserId,
              formerOwnerExpectedVersion:
                parsed
                  .formerOwnerExpectedVersion,
              newOwnerExternalUserId:
                newOwner.externalUserId,
              newOwnerExpectedVersion:
                parsed
                  .newOwnerExpectedVersion,
              formerOwnerRole:
                parsed.formerOwnerRole,
              actorExternalUserId:
                session.externalUserId,
              occurredAt:
                readOccurredAt(),
            }),
        );

      if (
        result.outcome !==
          "updated" &&
        result.outcome !==
          "unchanged"
      ) {
        throw mutationError(
          result.outcome,
        );
      }

      if (
        result.formerOwner === null ||
        result.newOwner === null ||
        result.formerOwner.tenantId !==
          session.tenantId ||
        result.newOwner.tenantId !==
          session.tenantId ||
        result.formerOwner.externalUserId !==
          formerOwner.externalUserId ||
        result.newOwner.externalUserId !==
          newOwner.externalUserId
      ) {
        throw new TeamMembershipMutationError(
          "PERSISTENCE_FAILED",
        );
      }

      return result;
    },
  };
}
