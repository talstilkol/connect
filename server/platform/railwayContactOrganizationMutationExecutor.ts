import type {
  ContactOrganizationSnapshot,
} from "../../shared/domain/contactOrganization.ts";
import type {
  TenantSession,
} from "../auth/tenantSession.ts";

export const railwayContactOrganizationMutationOperations = Object.freeze([
  "contacts.organization.tag.save",
  "contacts.organization.list.save",
  "contacts.organization.tag-assignment",
  "contacts.organization.list-membership",
] as const);

export type RailwayContactOrganizationMutationOperation =
  typeof railwayContactOrganizationMutationOperations[number];

export type RailwayContactOrganizationMutationPayload =
  | Readonly<{ name: string }>
  | Readonly<{
      contactId: number;
      groupId: number;
      assigned: boolean;
    }>;

export interface RailwayContactOrganizationMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: RailwayContactOrganizationMutationOperation;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: RailwayContactOrganizationMutationPayload;
}

export type RailwayContactOrganizationMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      organization: Readonly<ContactOrganizationSnapshot>;
    }>
  | Readonly<{
      outcome: "conflict" | "not-found" | "unavailable";
      tenantId: null;
      organization: null;
    }>;

/**
 * The production adapter must claim the request, mutate the organization,
 * write an immutable audit row, capture the response, and complete the
 * receipt in one PostgreSQL transaction.
 */
export interface RailwayContactOrganizationMutationExecutor {
  execute(
    command: Readonly<RailwayContactOrganizationMutationCommand>,
  ): Promise<RailwayContactOrganizationMutationResult>;
}
