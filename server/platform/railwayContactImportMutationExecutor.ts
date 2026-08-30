import type {
  ContactImportCandidate,
  ContactImportJobSummary,
  ContactImportProfileMapping,
} from "../../shared/domain/contactImportJob.ts";
import type { ContactRecord } from "../../shared/domain/contactRecord.ts";
import type { TenantSession } from "../auth/tenantSession.ts";

export const railwayContactImportMutationOperations = Object.freeze([
  "contacts.import.start",
  "contacts.import.chunk",
] as const);

export type RailwayContactImportMutationOperation =
  typeof railwayContactImportMutationOperations[number];

export type RailwayContactImportMutationPayload =
  | Readonly<{
      fileName: string;
      sourceDigest: string;
      totalRows: number;
      mapping: ContactImportProfileMapping;
    }>
  | Readonly<{
      jobId: number;
      rows: readonly ContactImportCandidate[];
    }>;

export interface RailwayContactImportMutationCommand {
  readonly session: Readonly<TenantSession>;
  readonly operation: RailwayContactImportMutationOperation;
  readonly idempotencyKey: string;
  readonly requestDigest: string;
  readonly payload: RailwayContactImportMutationPayload;
}

export interface RailwayContactImportMutationSnapshot {
  readonly job: ContactImportJobSummary;
  readonly contacts: readonly ContactRecord[];
}

export type RailwayContactImportMutationResult =
  | Readonly<{
      outcome: "committed" | "replayed";
      tenantId: number;
      result: Readonly<RailwayContactImportMutationSnapshot>;
    }>
  | Readonly<{
      outcome: "conflict" | "not-found" | "unavailable";
      tenantId: null;
      result: null;
    }>;

/**
 * A production implementation must lock the import job for chunk work, then
 * mutate rows, refresh counters, write audit evidence, capture the response,
 * and complete the replay receipt in one PostgreSQL transaction.
 */
export interface RailwayContactImportMutationExecutor {
  execute(
    command: Readonly<RailwayContactImportMutationCommand>,
  ): Promise<RailwayContactImportMutationResult>;
}
