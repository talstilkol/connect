import type {
  SystemAdminBusinessProfileMutationResult,
  SystemAdminBusinessProfileRepository,
} from "../../db/systemAdminBusinessProfileRepository.ts";
import {
  validatePersistedBusinessProfile,
} from "../../shared/validation/persistedBusinessProfile.ts";
import type {
  SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import {
  requireCanonicalTimestamp,
  requirePositiveTenantId,
  requirePositiveVersion,
} from "../billing/tenantSubscriptionValidation.ts";

export type SystemAdminBusinessProfileErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "PERSISTENCE_FAILED";

export class SystemAdminBusinessProfileInputError extends Error {
  constructor() {
    super(
      "System admin business profile input is invalid",
    );
    this.name =
      "SystemAdminBusinessProfileInputError";
  }
}

export class SystemAdminBusinessProfileError extends Error {
  readonly code:
    SystemAdminBusinessProfileErrorCode;

  constructor(
    code:
      SystemAdminBusinessProfileErrorCode,
  ) {
    super(
      "System admin business profile operation failed",
    );
    this.name =
      "SystemAdminBusinessProfileError";
    this.code = code;
  }
}

export interface SystemAdminBusinessProfileService {
  update(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<SystemAdminBusinessProfileMutationResult>;
}

type Clock = () => string;

function inputError(): never {
  throw new SystemAdminBusinessProfileInputError();
}

function isExactRecord(
  value: unknown,
  fields: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !==
      Object.prototype
  ) {
    return false;
  }

  const keys = Object.keys(value);

  return (
    keys.length === fields.length &&
    keys.every((key) =>
      fields.includes(key),
    )
  );
}

function assertSession(
  session: SystemAdminSession,
): void {
  if (
    typeof session !== "object" ||
    session === null ||
    typeof session.externalUserId !==
      "string" ||
    session.externalUserId.length === 0 ||
    session.externalUserId.length > 255 ||
    session.externalUserId.trim() !==
      session.externalUserId
  ) {
    throw new SystemAdminBusinessProfileError(
      "PERSISTENCE_FAILED",
    );
  }
}

function currentTimestamp(
  clock: Clock,
): string {
  try {
    return requireCanonicalTimestamp(
      clock(),
    );
  } catch {
    throw new SystemAdminBusinessProfileError(
      "PERSISTENCE_FAILED",
    );
  }
}

function requireResult(
  result:
    SystemAdminBusinessProfileMutationResult,
  tenantId: number,
): SystemAdminBusinessProfileMutationResult {
  if (result.outcome === "not-found") {
    throw new SystemAdminBusinessProfileError(
      "NOT_FOUND",
    );
  }

  if (result.outcome === "conflict") {
    throw new SystemAdminBusinessProfileError(
      "CONFLICT",
    );
  }

  if (
    !result.profile ||
    result.profile.tenantId !== tenantId
  ) {
    throw new SystemAdminBusinessProfileError(
      "PERSISTENCE_FAILED",
    );
  }

  return result;
}

export function createSystemAdminBusinessProfileService(
  repository:
    SystemAdminBusinessProfileRepository,
  clock: Clock = () =>
    new Date().toISOString(),
): SystemAdminBusinessProfileService {
  return {
    async update(session, input) {
      assertSession(session);

      if (
        !isExactRecord(input, [
          "tenantId",
          "expectedVersion",
          "businessName",
          "timezone",
          "interfaceLanguage",
        ]) ||
        typeof input.tenantId !==
          "number" ||
        typeof input.expectedVersion !==
          "number"
      ) {
        return inputError();
      }

      let tenantId;
      let expectedVersion;

      try {
        tenantId = requirePositiveTenantId(
          input.tenantId,
        );
        expectedVersion =
          requirePositiveVersion(
            input.expectedVersion,
          );
      } catch {
        return inputError();
      }

      const validation =
        validatePersistedBusinessProfile({
          businessName:
            input.businessName,
          timezone: input.timezone,
          interfaceLanguage:
            input.interfaceLanguage,
        });

      if (
        !validation.success ||
        validation.value.businessName
          .length > 500 ||
        validation.value.timezone.length >
          500 ||
        /[\u0000-\u001f\u007f]/.test(
          validation.value.businessName,
        ) ||
        /[\u0000-\u001f\u007f]/.test(
          validation.value.timezone,
        )
      ) {
        return inputError();
      }

      let result;

      try {
        result = await repository.update({
          tenantId,
          expectedVersion,
          ...validation.value,
          actorExternalUserId:
            session.externalUserId,
          occurredAt:
            currentTimestamp(clock),
        });
      } catch {
        throw new SystemAdminBusinessProfileError(
          "PERSISTENCE_FAILED",
        );
      }

      return requireResult(
        result,
        tenantId,
      );
    },
  };
}
