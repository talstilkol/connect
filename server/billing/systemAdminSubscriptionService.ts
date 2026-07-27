import type {
  TenantSubscriptionRepository,
} from "../../db/tenantSubscriptionRepository.ts";
import type {
  TenantSubscriptionMutationResult,
} from "../../shared/domain/tenantSubscription.ts";
import type {
  SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import {
  requireCanonicalTimestamp,
  requireManualInitialStatus,
  requireManualOperationalStatus,
  requirePositiveTenantId,
  requirePositiveVersion,
  requireSubscriptionWindow,
} from "./tenantSubscriptionValidation.ts";

export type SystemAdminSubscriptionErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "PERSISTENCE_FAILED";

export class SystemAdminSubscriptionInputError extends Error {
  constructor() {
    super(
      "System admin subscription input is invalid",
    );
    this.name =
      "SystemAdminSubscriptionInputError";
  }
}

export class SystemAdminSubscriptionError extends Error {
  readonly code: SystemAdminSubscriptionErrorCode;

  constructor(
    code: SystemAdminSubscriptionErrorCode,
  ) {
    super(
      "System admin subscription operation failed",
    );
    this.name =
      "SystemAdminSubscriptionError";
    this.code = code;
  }
}

export interface SystemAdminSubscriptionService {
  create(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<TenantSubscriptionMutationResult>;
  extend(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<TenantSubscriptionMutationResult>;
  changeStatus(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<TenantSubscriptionMutationResult>;
  cancel(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<TenantSubscriptionMutationResult>;
}

type Clock = () => string;

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

function inputError(): never {
  throw new SystemAdminSubscriptionInputError();
}

function positiveTenantId(
  value: unknown,
): number {
  if (typeof value !== "number") {
    return inputError();
  }

  try {
    return requirePositiveTenantId(value);
  } catch {
    return inputError();
  }
}

function positiveVersion(
  value: unknown,
): number {
  if (typeof value !== "number") {
    return inputError();
  }

  try {
    return requirePositiveVersion(value);
  } catch {
    return inputError();
  }
}

function canonicalTimestamp(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return inputError();
  }

  try {
    return requireCanonicalTimestamp(
      value,
    );
  } catch {
    return inputError();
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
    throw new SystemAdminSubscriptionError(
      "PERSISTENCE_FAILED",
    );
  }
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
    throw new SystemAdminSubscriptionError(
      "PERSISTENCE_FAILED",
    );
  }
}

function requireSubscriptionResult(
  result: TenantSubscriptionMutationResult,
  tenantId: number,
): TenantSubscriptionMutationResult {
  if (
    result.outcome === "not-found"
  ) {
    throw new SystemAdminSubscriptionError(
      "NOT_FOUND",
    );
  }

  if (result.outcome === "conflict") {
    throw new SystemAdminSubscriptionError(
      "CONFLICT",
    );
  }

  if (
    result.outcome ===
    "invalid-transition"
  ) {
    throw new SystemAdminSubscriptionError(
      "INVALID_TRANSITION",
    );
  }

  if (
    !result.subscription ||
    result.subscription.tenantId !== tenantId
  ) {
    throw new SystemAdminSubscriptionError(
      "PERSISTENCE_FAILED",
    );
  }

  return result;
}

async function runMutation(
  operation:
    () => Promise<TenantSubscriptionMutationResult>,
  tenantId: number,
): Promise<TenantSubscriptionMutationResult> {
  let result:
    TenantSubscriptionMutationResult;

  try {
    result = await operation();
  } catch {
    throw new SystemAdminSubscriptionError(
      "PERSISTENCE_FAILED",
    );
  }

  return requireSubscriptionResult(
    result,
    tenantId,
  );
}

export function createSystemAdminSubscriptionService(
  repository: Pick<
    TenantSubscriptionRepository,
    "create" | "extend" | "changeStatus" | "cancel"
  >,
  clock: Clock = () =>
    new Date().toISOString(),
): SystemAdminSubscriptionService {
  return {
    async create(session, input) {
      assertSession(session);

      if (
        !isExactRecord(input, [
          "tenantId",
          "status",
          "startsAt",
          "endsAt",
        ])
      ) {
        return inputError();
      }

      const tenantId = positiveTenantId(
        input.tenantId,
      );
      let status;
      let period;

      try {
        if (
          typeof input.status !== "string" ||
          typeof input.startsAt !== "string" ||
          typeof input.endsAt !== "string"
        ) {
          return inputError();
        }

        status = requireManualInitialStatus(
          input.status,
        );
        period = requireSubscriptionWindow(
          input.startsAt,
          input.endsAt,
        );
      } catch {
        return inputError();
      }

      const occurredAt =
        currentTimestamp(clock);

      return runMutation(
        () =>
          repository.create({
            tenantId,
            status,
            startsAt: period.startsAt,
            endsAt: period.endsAt,
            actorExternalUserId:
              session.externalUserId,
            occurredAt,
          }),
        tenantId,
      );
    },

    async extend(session, input) {
      assertSession(session);

      if (
        !isExactRecord(input, [
          "tenantId",
          "expectedVersion",
          "newEndsAt",
        ])
      ) {
        return inputError();
      }

      const tenantId = positiveTenantId(
        input.tenantId,
      );
      const expectedVersion =
        positiveVersion(
          input.expectedVersion,
        );
      const newEndsAt =
        canonicalTimestamp(
          input.newEndsAt,
        );
      const occurredAt =
        currentTimestamp(clock);

      return runMutation(
        () =>
          repository.extend({
            tenantId,
            expectedVersion,
            newEndsAt,
            actorExternalUserId:
              session.externalUserId,
            occurredAt,
          }),
        tenantId,
      );
    },

    async changeStatus(
      session,
      input,
    ) {
      assertSession(session);

      if (
        !isExactRecord(input, [
          "tenantId",
          "expectedVersion",
          "status",
        ])
      ) {
        return inputError();
      }

      const tenantId = positiveTenantId(
        input.tenantId,
      );
      const expectedVersion =
        positiveVersion(
          input.expectedVersion,
        );
      let status;

      try {
        if (
          typeof input.status !== "string"
        ) {
          return inputError();
        }

        status =
          requireManualOperationalStatus(
            input.status,
          );
      } catch {
        return inputError();
      }

      const occurredAt =
        currentTimestamp(clock);

      return runMutation(
        () =>
          repository.changeStatus({
            tenantId,
            expectedVersion,
            status,
            actorExternalUserId:
              session.externalUserId,
            occurredAt,
          }),
        tenantId,
      );
    },

    async cancel(session, input) {
      assertSession(session);

      if (
        !isExactRecord(input, [
          "tenantId",
          "expectedVersion",
        ])
      ) {
        return inputError();
      }

      const tenantId = positiveTenantId(
        input.tenantId,
      );
      const expectedVersion =
        positiveVersion(
          input.expectedVersion,
        );
      const occurredAt =
        currentTimestamp(clock);

      return runMutation(
        () =>
          repository.cancel({
            tenantId,
            expectedVersion,
            actorExternalUserId:
              session.externalUserId,
            occurredAt,
          }),
        tenantId,
      );
    },
  };
}
