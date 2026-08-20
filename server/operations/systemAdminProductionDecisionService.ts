import type {
  ProductionDecisionRepository,
} from "../../db/productionDecisionRepository.ts";
import type {
  ProductionDecisionMutationResult,
  ProductionDecisionRecord,
} from "../../shared/domain/productionDecisionRecord.ts";
import type {
  SystemAdminSession,
} from "../auth/systemAdminSession.ts";
import {
  requireProductionDecisionActor,
  requireProductionDecisionCheckId,
  requireProductionDecisionRationale,
  requireProductionDecisionSelection,
  requireProductionDecisionTimestamp,
  requireProductionDecisionVersion,
} from "./productionDecisionValidation.ts";

export type SystemAdminProductionDecisionErrorCode =
  | "CONFLICT"
  | "PERSISTENCE_FAILED";

export class SystemAdminProductionDecisionInputError extends Error {
  constructor() {
    super(
      "System admin production decision input is invalid",
    );
    this.name =
      "SystemAdminProductionDecisionInputError";
  }
}

export class SystemAdminProductionDecisionError extends Error {
  readonly code:
    SystemAdminProductionDecisionErrorCode;

  constructor(
    code:
      SystemAdminProductionDecisionErrorCode,
  ) {
    super(
      "System admin production decision operation failed",
    );
    this.name =
      "SystemAdminProductionDecisionError";
    this.code = code;
  }
}

export interface SystemAdminProductionDecisionService {
  list(
    session: SystemAdminSession,
  ): Promise<readonly ProductionDecisionRecord[]>;
  save(
    session: SystemAdminSession,
    input: unknown,
  ): Promise<ProductionDecisionMutationResult>;
}

export interface NormalizedSystemAdminProductionDecisionInput {
  readonly checkId: ProductionDecisionRecord["checkId"];
  readonly expectedVersion: number;
  readonly selection: string;
  readonly rationale: string;
}

type Clock = () => string;

function inputError(): never {
  throw new SystemAdminProductionDecisionInputError();
}

function assertExactInput(
  value: unknown,
): asserts value is {
  checkId: unknown;
  expectedVersion: unknown;
  selection: unknown;
  rationale: unknown;
} {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !==
      Object.prototype
  ) {
    return inputError();
  }

  const keys = Object.keys(value);
  const expectedKeys = [
    "checkId",
    "expectedVersion",
    "selection",
    "rationale",
  ] as const;

  if (
    keys.length !== expectedKeys.length ||
    !keys.every((key) =>
      expectedKeys.includes(
        key as
          (typeof expectedKeys)[number],
      ),
    )
  ) {
    return inputError();
  }
}

function requireSessionActor(
  session: SystemAdminSession,
): string {
  try {
    return requireProductionDecisionActor(
      session?.externalUserId,
    );
  } catch {
    throw new SystemAdminProductionDecisionError(
      "PERSISTENCE_FAILED",
    );
  }
}

function currentTimestamp(
  clock: Clock,
): string {
  try {
    return requireProductionDecisionTimestamp(
      clock(),
    );
  } catch {
    throw new SystemAdminProductionDecisionError(
      "PERSISTENCE_FAILED",
    );
  }
}

export function normalizeSystemAdminProductionDecisionInput(
  input: unknown,
): Readonly<NormalizedSystemAdminProductionDecisionInput> {
  assertExactInput(input);

  try {
    return Object.freeze({
      checkId:
        requireProductionDecisionCheckId(
          input.checkId,
        ),
      expectedVersion:
        requireProductionDecisionVersion(
          input.expectedVersion,
          true,
        ),
      selection:
        requireProductionDecisionSelection(
          input.selection,
        ),
      rationale:
        requireProductionDecisionRationale(
          input.rationale,
        ),
    });
  } catch {
    return inputError();
  }
}

export function createSystemAdminProductionDecisionService(
  repository: Pick<
    ProductionDecisionRepository,
    "list" | "save"
  >,
  clock: Clock = () =>
    new Date().toISOString(),
): SystemAdminProductionDecisionService {
  return {
    async list(session) {
      requireSessionActor(session);

      try {
        return await repository.list();
      } catch {
        throw new SystemAdminProductionDecisionError(
          "PERSISTENCE_FAILED",
        );
      }
    },

    async save(session, input) {
      const actorExternalUserId =
        requireSessionActor(session);
      const normalized =
        normalizeSystemAdminProductionDecisionInput(input);
      let result:
        ProductionDecisionMutationResult;

      try {
        result = await repository.save({
          ...normalized,
          actorExternalUserId,
          occurredAt:
            currentTimestamp(clock),
        });
      } catch {
        throw new SystemAdminProductionDecisionError(
          "PERSISTENCE_FAILED",
        );
      }

      if (result.outcome === "conflict") {
        throw new SystemAdminProductionDecisionError(
          "CONFLICT",
        );
      }

      if (
        result.record.checkId !==
        normalized.checkId
      ) {
        throw new SystemAdminProductionDecisionError(
          "PERSISTENCE_FAILED",
        );
      }

      return result;
    },
  };
}
