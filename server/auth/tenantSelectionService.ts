import {
  createHash,
} from "node:crypto";

import type {
  ActiveTenantMembership,
  TenantMembershipRepository,
} from "../../db/tenantMembershipRepository.ts";
import type {
  TenantSelectionRepository,
} from "../../db/tenantSelectionRepository.ts";
import type {
  TenantId,
  TenantRole,
  UserId,
} from "../../shared/domain/model.ts";
import {
  isEligibleTenantMembership,
  TenantSessionError,
  type AuthenticatedIdentity,
} from "./tenantSession.ts";

const selectionKeyPattern =
  /^tenant_selection_option_v1_[a-f0-9]{64}$/;

export interface TenantSelectionOption {
  selectionKey: string;
  displayName: string;
  role: TenantRole;
  selected: boolean;
}

export interface TenantSelectionDirectory {
  version: number;
  selectionRequired: boolean;
  options:
    readonly TenantSelectionOption[];
}

export type SelectTenantResult =
  Readonly<{
    outcome:
      | "saved"
      | "unchanged";
    version: number;
  }>;

export type TenantSelectionInputIssue =
  | "INVALID_INPUT"
  | "INVALID_SELECTION_KEY"
  | "INVALID_EXPECTED_VERSION";

export class TenantSelectionInputError extends Error {
  readonly issue:
    TenantSelectionInputIssue;

  constructor(
    issue: TenantSelectionInputIssue,
  ) {
    super("Tenant selection input is invalid");
    this.name =
      "TenantSelectionInputError";
    this.issue = issue;
  }
}

export class TenantSelectionConflictError extends Error {
  constructor() {
    super(
      "Tenant selection version is stale",
    );
    this.name =
      "TenantSelectionConflictError";
  }
}

export interface TenantSelectionService {
  list(
    identity: AuthenticatedIdentity,
  ): Promise<TenantSelectionDirectory>;
  select(
    identity: AuthenticatedIdentity,
    input: unknown,
  ): Promise<SelectTenantResult>;
}

interface TenantSelectionServiceDependencies {
  memberships:
    TenantMembershipRepository;
  selections:
    TenantSelectionRepository;
}

interface ValidatedSelectionInput {
  selectionKey: string;
  expectedVersion: number;
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actualKeys =
    Object.keys(value).sort();
  const expectedKeys =
    [...keys].sort();

  return (
    actualKeys.length ===
      expectedKeys.length &&
    actualKeys.every(
      (key, index) =>
        key === expectedKeys[index],
    )
  );
}

function validateSelectionInput(
  value: unknown,
): ValidatedSelectionInput {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !hasExactKeys(
      value as Record<string, unknown>,
      [
        "selectionKey",
        "expectedVersion",
      ],
    )
  ) {
    throw new TenantSelectionInputError(
      "INVALID_INPUT",
    );
  }

  const input =
    value as Record<string, unknown>;

  if (
    typeof input.selectionKey !==
      "string" ||
    !selectionKeyPattern.test(
      input.selectionKey,
    )
  ) {
    throw new TenantSelectionInputError(
      "INVALID_SELECTION_KEY",
    );
  }

  if (
    !Number.isSafeInteger(
      input.expectedVersion,
    ) ||
    Number(input.expectedVersion) < 0
  ) {
    throw new TenantSelectionInputError(
      "INVALID_EXPECTED_VERSION",
    );
  }

  return {
    selectionKey: input.selectionKey,
    expectedVersion:
      input.expectedVersion as number,
  };
}

function deriveSelectionKey(
  externalUserId: UserId,
  tenantId: TenantId,
): string {
  return `tenant_selection_option_v1_${createHash(
    "sha256",
  )
    .update(
      JSON.stringify({
        purpose:
          "tenant-selection-option",
        externalUserId,
        tenantId,
      }),
    )
    .digest("hex")}`;
}

function eligibleMemberships(
  identity: AuthenticatedIdentity,
  memberships:
    readonly ActiveTenantMembership[],
): readonly ActiveTenantMembership[] {
  const eligible = memberships.filter(
    (membership) =>
      isEligibleTenantMembership(
        membership,
        identity,
      ),
  );

  if (eligible.length === 0) {
    throw new TenantSessionError(
      "TENANT_MEMBERSHIP_REQUIRED",
      "The authenticated user has no eligible tenant membership",
    );
  }

  return eligible;
}

export function createTenantSelectionService(
  dependencies:
    TenantSelectionServiceDependencies,
): TenantSelectionService {
  return {
    async list(identity) {
      const memberships =
        eligibleMemberships(
          identity,
          await dependencies.memberships
            .findActiveByExternalUserId(
              identity.externalUserId,
            ),
        );
      const selection =
        await dependencies.selections
          .findByExternalUserId(
            identity.externalUserId,
          );
      const selectionIsEligible =
        selection !== null &&
        memberships.some(
          (membership) =>
            membership.tenantId ===
            selection.tenantId,
        );
      const effectiveSelectedTenantId =
        selectionIsEligible
          ? selection.tenantId
          : memberships.length === 1
            ? memberships[0].tenantId
            : null;

      return {
        version:
          selection?.version ?? 0,
        selectionRequired:
          memberships.length > 1 &&
          !selectionIsEligible,
        options: memberships.map(
          (membership) => ({
            selectionKey:
              deriveSelectionKey(
                identity.externalUserId,
                membership.tenantId,
              ),
            displayName:
              membership
                .tenantDisplayName,
            role: membership.role,
            selected:
              effectiveSelectedTenantId ===
                membership.tenantId,
          }),
        ),
      };
    },

    async select(identity, rawInput) {
      const input =
        validateSelectionInput(
          rawInput,
        );
      const memberships =
        eligibleMemberships(
          identity,
          await dependencies.memberships
            .findActiveByExternalUserId(
              identity.externalUserId,
            ),
        );
      const selectedMembership =
        memberships.find(
          (membership) =>
            deriveSelectionKey(
              identity.externalUserId,
              membership.tenantId,
            ) === input.selectionKey,
        );

      if (!selectedMembership) {
        throw new TenantSelectionInputError(
          "INVALID_SELECTION_KEY",
        );
      }

      const result =
        await dependencies.selections.save({
          externalUserId:
            identity.externalUserId,
          tenantId:
            selectedMembership.tenantId,
          expectedVersion:
            input.expectedVersion,
        });

      if (
        result.outcome === "conflict"
      ) {
        throw new TenantSelectionConflictError();
      }

      if (
        result.outcome === "rejected"
      ) {
        throw new TenantSessionError(
          "TENANT_SELECTION_REQUIRED",
          "The selected tenant is not available",
        );
      }

      if (result.selection === null) {
        throw new TenantSessionError(
          "TENANT_SELECTION_REQUIRED",
          "The selected tenant could not be loaded",
        );
      }

      return {
        outcome: result.outcome,
        version:
          result.selection.version,
      };
    },
  };
}
