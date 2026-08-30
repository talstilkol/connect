import type {
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import type {
  SaveTenantSelectionInput,
  TenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import {
  createTenantSelectionService,
  TenantSelectionConflictError,
  TenantSelectionInputError,
  type TenantSelectionDirectory,
} from "../auth/tenantSelectionService.ts";
import {
  TenantSessionError,
} from "../auth/tenantSession.ts";
import type {
  RateLimitGuard,
} from "../security/rateLimit.ts";
import type {
  RailwayApiJsonObject,
  RailwayApiRequestEnvelope,
} from "./railwayApiContract.ts";
import {
  RailwayApiDispatchError,
  type RailwayApiDispatchContext,
  type RailwayApiOperation,
} from "./railwayApiHttpHandler.ts";
import {
  deriveRailwayApiDeterministicIdempotencyKey,
  deriveRailwayApiMutationRequestDigest,
} from "./railwayApiMutationExecutor.ts";
import {
  RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
  parseRailwayTenantSelectionMutationState,
  type RailwayTenantSelectionMutationExecutor,
} from "./railwayTenantSelectionMutationExecutor.ts";

export const RAILWAY_TENANT_SELECTION_DIRECTORY_OPERATION =
  "tenant-selection.directory.read" as const;

export const railwayTenantSelectionOperationPolicies = Object.freeze([
  Object.freeze({
    id: RAILWAY_TENANT_SELECTION_DIRECTORY_OPERATION,
    requestKind: "query" as const,
    authorization: "authenticated-user-membership-directory" as const,
    mutationSafety: null,
  }),
  Object.freeze({
    id: RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
    requestKind: "mutation" as const,
    authorization: "authenticated-user-membership-directory" as const,
    mutationSafety: Object.freeze({
      rateLimit: "tenant-mutation" as const,
      idempotency: "atomic-request-digest-replay" as const,
      audit: "atomic-immutable-event" as const,
      transaction: "required" as const,
    }),
  }),
]);

export interface RailwayTenantSelectionOperationDependencies {
  readonly memberships: TenantMembershipRepository;
  readonly selections: Pick<TenantSelectionRepository, "findByExternalUserId">;
  readonly mutationRateLimit: Pick<RateLimitGuard, "consume">;
  readonly mutations: RailwayTenantSelectionMutationExecutor;
}

interface TenantSelectionPayload {
  readonly selectionKey: string;
  readonly expectedVersion: number;
}

const selectionKeyPattern = /^tenant_selection_option_v1_[a-f0-9]{64}$/;

function invalidRequest(): never {
  throw new RailwayApiDispatchError("INVALID_REQUEST");
}

function requireDependencies(
  dependencies: Readonly<RailwayTenantSelectionOperationDependencies>,
): void {
  if (
    !dependencies ||
    typeof dependencies !== "object" ||
    Object.keys(dependencies).sort().join(",") !==
      "memberships,mutationRateLimit,mutations,selections" ||
    typeof dependencies.memberships?.findActiveByExternalUserId !== "function" ||
    typeof dependencies.selections?.findByExternalUserId !== "function" ||
    typeof dependencies.mutationRateLimit?.consume !== "function" ||
    typeof dependencies.mutations?.execute !== "function"
  ) {
    throw new Error("Railway tenant selection dependencies are invalid");
  }
}

function parseSelectionPayload(
  payload: RailwayApiJsonObject,
): Readonly<TenantSelectionPayload> {
  if (
    Object.keys(payload).sort().join(",") !==
      "expectedVersion,selectionKey" ||
    typeof payload.selectionKey !== "string" ||
    !selectionKeyPattern.test(payload.selectionKey) ||
    !Number.isSafeInteger(payload.expectedVersion) ||
    Number(payload.expectedVersion) < 0
  ) {
    invalidRequest();
  }
  return Object.freeze({
    selectionKey: payload.selectionKey,
    expectedVersion: Number(payload.expectedVersion),
  });
}

function requireReadRequest(
  payload: RailwayApiJsonObject,
  request: Readonly<RailwayApiRequestEnvelope>,
): void {
  if (
    Object.keys(payload).length !== 0 ||
    request.operation !== RAILWAY_TENANT_SELECTION_DIRECTORY_OPERATION ||
    request.requestKind !== "query" ||
    request.idempotencyKey !== null
  ) {
    invalidRequest();
  }
}

function toPublicDirectory(
  directory: Readonly<TenantSelectionDirectory>,
): Readonly<TenantSelectionDirectory> {
  const selectedCount = directory.options.filter(({ selected }) => selected)
    .length;
  if (
    !Number.isSafeInteger(directory.version) ||
    directory.version < 0 ||
    directory.options.length < 1 ||
    directory.options.length > 100 ||
    (directory.selectionRequired && selectedCount !== 0) ||
    (!directory.selectionRequired && selectedCount !== 1)
  ) {
    throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
  }
  return Object.freeze({
    version: directory.version,
    selectionRequired: directory.selectionRequired,
    options: Object.freeze(directory.options.map((option) => Object.freeze({
      selectionKey: option.selectionKey,
      displayName: option.displayName,
      role: option.role,
      selected: option.selected,
    }))),
  });
}

function mapOperationError(error: unknown): never {
  if (error instanceof RailwayApiDispatchError) throw error;
  if (error instanceof TenantSelectionInputError) {
    throw new RailwayApiDispatchError("INVALID_REQUEST");
  }
  if (error instanceof TenantSelectionConflictError) {
    throw new RailwayApiDispatchError("CONFLICT");
  }
  if (error instanceof TenantSessionError) {
    switch (error.code) {
      case "TENANT_MEMBERSHIP_REQUIRED":
        throw new RailwayApiDispatchError("TENANT_MEMBERSHIP_REQUIRED");
      case "TENANT_SELECTION_REQUIRED":
        throw new RailwayApiDispatchError("TENANT_SELECTION_REQUIRED");
      case "PERMISSION_DENIED":
        throw new RailwayApiDispatchError("PERMISSION_DENIED");
      case "AUTHENTICATION_REQUIRED":
        throw new RailwayApiDispatchError("AUTHORIZATION_DENIED");
    }
  }
  throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
}

function createReadOperation(
  dependencies: Readonly<RailwayTenantSelectionOperationDependencies>,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: RAILWAY_TENANT_SELECTION_DIRECTORY_OPERATION,
    requestKind: "query" as const,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        requireReadRequest(payload, request);
        const service = createTenantSelectionService({
          memberships: dependencies.memberships,
          selections: {
            findByExternalUserId:
              dependencies.selections.findByExternalUserId.bind(
                dependencies.selections,
              ),
            async save() {
              throw new Error("Tenant selection read cannot save");
            },
          },
        });
        return Object.freeze({
          directory: toPublicDirectory(
            await service.list(context.userIdentity),
          ),
        });
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}

function createSaveOperation(
  dependencies: Readonly<RailwayTenantSelectionOperationDependencies>,
): Readonly<RailwayApiOperation> {
  return Object.freeze({
    id: RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
    requestKind: "mutation" as const,
    async execute(
      context: Readonly<RailwayApiDispatchContext>,
      payload: RailwayApiJsonObject,
      request: Readonly<RailwayApiRequestEnvelope>,
    ) {
      try {
        const parsedPayload = parseSelectionPayload(payload);
        if (
          request.operation !== RAILWAY_TENANT_SELECTION_SAVE_OPERATION ||
          request.requestKind !== "mutation" ||
          request.idempotencyKey === null
        ) {
          invalidRequest();
        }
        const [expectedIdempotencyKey, requestDigest] = await Promise.all([
          deriveRailwayApiDeterministicIdempotencyKey(
            RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
            parsedPayload,
          ),
          deriveRailwayApiMutationRequestDigest(
            RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
            parsedPayload,
          ),
        ]);
        if (request.idempotencyKey !== expectedIdempotencyKey) {
          invalidRequest();
        }

        let rateLimitDecision;
        try {
          rateLimitDecision = await dependencies.mutationRateLimit.consume(
            `${context.userIdentity.externalUserId}:${RAILWAY_TENANT_SELECTION_SAVE_OPERATION}`,
          );
        } catch {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }
        if (rateLimitDecision.outcome === "limited") {
          throw new RailwayApiDispatchError("RATE_LIMITED");
        }
        if (rateLimitDecision.outcome !== "allowed") {
          throw new RailwayApiDispatchError("DEPENDENCY_UNAVAILABLE");
        }

        let replayed = false;
        const service = createTenantSelectionService({
          memberships: dependencies.memberships,
          selections: {
            findByExternalUserId:
              dependencies.selections.findByExternalUserId.bind(
                dependencies.selections,
              ),
            async save(input: Readonly<SaveTenantSelectionInput>) {
              const result = await dependencies.mutations.execute({
                identity: context.userIdentity,
                operation: RAILWAY_TENANT_SELECTION_SAVE_OPERATION,
                idempotencyKey: request.idempotencyKey as string,
                requestDigest,
                input,
              });
              if (result.outcome === "conflict") {
                throw new TenantSelectionConflictError();
              }
              if (
                result.outcome === "unavailable" ||
                result.tenantId === null ||
                result.state === null ||
                result.tenantId !== input.tenantId
              ) {
                throw new Error("Railway tenant selection mutation failed");
              }
              const state = parseRailwayTenantSelectionMutationState(
                input,
                result.state,
              );
              if (state === null) {
                throw new Error("Railway tenant selection state is invalid");
              }
              replayed = result.outcome === "replayed";
              return Object.freeze({
                outcome: state.repositoryOutcome,
                selection: state.selection,
              });
            },
          },
        });
        const selected = await service.select(
          context.userIdentity,
          parsedPayload,
        );
        return Object.freeze({
          version: selected.version,
          unchanged: replayed || selected.outcome === "unchanged",
          replayed,
        });
      } catch (error) {
        mapOperationError(error);
      }
    },
  });
}

export function createRailwayTenantSelectionOperations(
  dependencies: Readonly<RailwayTenantSelectionOperationDependencies>,
): readonly Readonly<RailwayApiOperation>[] {
  requireDependencies(dependencies);
  return Object.freeze([
    createReadOperation(dependencies),
    createSaveOperation(dependencies),
  ]);
}
