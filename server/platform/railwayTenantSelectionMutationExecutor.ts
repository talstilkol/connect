import type {
  SaveTenantSelectionInput,
  TenantSelection,
} from "../../db/tenantSelectionRepository.ts";
import type {
  AuthenticatedIdentity,
} from "../auth/tenantSession.ts";

export const RAILWAY_TENANT_SELECTION_SAVE_OPERATION =
  "tenant-selection.save" as const;

export interface RailwayTenantSelectionMutationState {
  readonly repositoryOutcome: "saved" | "unchanged";
  readonly selection: Readonly<TenantSelection>;
}

export interface RailwayTenantSelectionMutationCommand {
  readonly identity: Readonly<AuthenticatedIdentity>;
  readonly operation: typeof RAILWAY_TENANT_SELECTION_SAVE_OPERATION;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly input: Readonly<SaveTenantSelectionInput>;
}

export type RailwayTenantSelectionMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      state: Readonly<RailwayTenantSelectionMutationState>;
    }>
  | Readonly<{
      outcome: "conflict" | "unavailable";
      tenantId: null;
      state: null;
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

export function parseRailwayTenantSelectionMutationState(
  input: Readonly<SaveTenantSelectionInput>,
  value: unknown,
): Readonly<RailwayTenantSelectionMutationState> | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["repositoryOutcome", "selection"]) ||
    (value.repositoryOutcome !== "saved" &&
      value.repositoryOutcome !== "unchanged") ||
    !isRecord(value.selection) ||
    !hasExactKeys(value.selection, ["tenantId", "version"]) ||
    value.selection.tenantId !== input.tenantId ||
    value.selection.externalUserId !== undefined ||
    !Number.isSafeInteger(value.selection.version) ||
    Number(value.selection.version) !== input.expectedVersion + 1
  ) {
    return null;
  }

  return Object.freeze({
    repositoryOutcome: value.repositoryOutcome,
    selection: Object.freeze({
      tenantId: input.tenantId,
      version: Number(value.selection.version),
    }),
  });
}

export interface RailwayTenantSelectionMutationExecutor {
  execute(
    command: Readonly<RailwayTenantSelectionMutationCommand>,
  ): Promise<RailwayTenantSelectionMutationResult>;
}
