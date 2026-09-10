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

export interface NormalizedSystemAdminSubscriptionCreateInput {
  readonly tenantId: number;
  readonly status: "trial" | "active";
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface NormalizedSystemAdminSubscriptionExtendInput {
  readonly tenantId: number;
  readonly expectedVersion: number;
  readonly newEndsAt: string;
}

export interface NormalizedSystemAdminSubscriptionStatusInput {
  readonly tenantId: number;
  readonly expectedVersion: number;
  readonly status: "active" | "suspended" | "blocked";
}

export interface NormalizedSystemAdminSubscriptionCancelInput {
  readonly tenantId: number;
  readonly expectedVersion: number;
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

export function normalizeSystemAdminSubscriptionCreateInput(
  input: unknown,
): Readonly<NormalizedSystemAdminSubscriptionCreateInput> {
  if (
    !isExactRecord(input, [
      "tenantId",
      "status",
      "startsAt",
      "endsAt",
    ]) ||
    typeof input.status !== "string" ||
    typeof input.startsAt !== "string" ||
    typeof input.endsAt !== "string"
  ) {
    return inputError();
  }

  try {
    const period = requireSubscriptionWindow(
      input.startsAt,
      input.endsAt,
    );

    return Object.freeze({
      tenantId: positiveTenantId(input.tenantId),
      status: requireManualInitialStatus(input.status),
      startsAt: period.startsAt,
      endsAt: period.endsAt,
    });
  } catch (error) {
    if (error instanceof SystemAdminSubscriptionInputError) {
      throw error;
    }

    return inputError();
  }
}

export function normalizeSystemAdminSubscriptionExtendInput(
  input: unknown,
): Readonly<NormalizedSystemAdminSubscriptionExtendInput> {
  if (
    !isExactRecord(input, [
      "tenantId",
      "expectedVersion",
      "newEndsAt",
    ])
  ) {
    return inputError();
  }

  return Object.freeze({
    tenantId: positiveTenantId(input.tenantId),
    expectedVersion: positiveVersion(input.expectedVersion),
    newEndsAt: canonicalTimestamp(input.newEndsAt),
  });
}

export function normalizeSystemAdminSubscriptionStatusInput(
  input: unknown,
): Readonly<NormalizedSystemAdminSubscriptionStatusInput> {
  if (
    !isExactRecord(input, [
      "tenantId",
      "expectedVersion",
      "status",
    ]) ||
    typeof input.status !== "string"
  ) {
    return inputError();
  }

  try {
    return Object.freeze({
      tenantId: positiveTenantId(input.tenantId),
      expectedVersion: positiveVersion(input.expectedVersion),
      status: requireManualOperationalStatus(input.status),
    });
  } catch (error) {
    if (error instanceof SystemAdminSubscriptionInputError) {
      throw error;
    }

    return inputError();
  }
}

export function normalizeSystemAdminSubscriptionCancelInput(
  input: unknown,
): Readonly<NormalizedSystemAdminSubscriptionCancelInput> {
  if (
    !isExactRecord(input, [
      "tenantId",
      "expectedVersion",
    ])
  ) {
    return inputError();
  }

  return Object.freeze({
    tenantId: positiveTenantId(input.tenantId),
    expectedVersion: positiveVersion(input.expectedVersion),
  });
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
      const normalized =
        normalizeSystemAdminSubscriptionCreateInput(input);

      const occurredAt =
        currentTimestamp(clock);

      return runMutation(
        () =>
          repository.create({
            ...normalized,
            actorExternalUserId:
              session.externalUserId,
            occurredAt,
          }),
        normalized.tenantId,
      );
    },

    async extend(session, input) {
      assertSession(session);
      const normalized =
        normalizeSystemAdminSubscriptionExtendInput(input);
      const occurredAt =
        currentTimestamp(clock);

      return runMutation(
        () =>
          repository.extend({
            ...normalized,
            actorExternalUserId:
              session.externalUserId,
            occurredAt,
          }),
        normalized.tenantId,
      );
    },

    async changeStatus(
      session,
      input,
    ) {
      assertSession(session);
      const normalized =
        normalizeSystemAdminSubscriptionStatusInput(input);

      const occurredAt =
        currentTimestamp(clock);

      return runMutation(
        () =>
          repository.changeStatus({
            ...normalized,
            actorExternalUserId:
              session.externalUserId,
            occurredAt,
          }),
        normalized.tenantId,
      );
    },

    async cancel(session, input) {
      assertSession(session);
      const normalized =
        normalizeSystemAdminSubscriptionCancelInput(input);
      const occurredAt =
        currentTimestamp(clock);

      return runMutation(
        () =>
          repository.cancel({
            ...normalized,
            actorExternalUserId:
              session.externalUserId,
            occurredAt,
          }),
        normalized.tenantId,
      );
    },
  };
}
