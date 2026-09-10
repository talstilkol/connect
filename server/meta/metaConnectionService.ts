import type {
  MetaRepository,
  SaveMetaAssetSnapshotInput,
} from "../../db/metaRepository";
import type {
  MetaConnectionRecord,
  PersistedMetaConnectionStatus,
} from "../../shared/domain/metaConnection";
import {
  requireTenantPermission,
  type TenantSession,
} from "../auth/tenantSession.ts";

type MetaConnectionProblemStatus = Exclude<
  PersistedMetaConnectionStatus,
  "pending" | "connected"
>;

export interface VerifiedMetaAssetSnapshot {
  businessPortfolioId: string;
  wabaId: string;
  phoneNumberId: string;
}

export interface MetaConnectionService {
  read(
    session: TenantSession,
  ): Promise<MetaConnectionRecord | null>;
  captureVerifiedAssets(
    session: TenantSession,
    snapshot: VerifiedMetaAssetSnapshot,
    expectedConnectionVersion?: number | null,
  ): Promise<MetaConnectionRecord>;
  confirmWebhookSubscription(
    session: TenantSession,
    expectedVersion: number,
  ): Promise<MetaConnectionRecord>;
  recordConnectionProblem(
    session: TenantSession,
    status: MetaConnectionProblemStatus,
  ): Promise<MetaConnectionRecord>;
}

export function createMetaConnectionService(
  repository: MetaRepository,
): MetaConnectionService {
  return {
    async read(session) {
      requireTenantPermission(session, "workspace.manage");

      return repository.findConnectionByTenantId(session.tenantId);
    },

    async captureVerifiedAssets(session, snapshot, expectedConnectionVersion) {
      requireTenantPermission(session, "workspace.manage");

      const input: SaveMetaAssetSnapshotInput = {
        tenantId: session.tenantId,
        businessPortfolioId: snapshot.businessPortfolioId,
        wabaId: snapshot.wabaId,
        phoneNumberId: snapshot.phoneNumberId,
        ...(expectedConnectionVersion === undefined ? {} : { expectedConnectionVersion }),
      };

      return repository.saveAssetSnapshot(input);
    },

    async confirmWebhookSubscription(session, expectedVersion) {
      requireTenantPermission(session, "workspace.manage");

      return repository.markConnectionConnected(session.tenantId, expectedVersion);
    },

    async recordConnectionProblem(session, status) {
      requireTenantPermission(session, "workspace.manage");

      return repository.markConnectionStatus(session.tenantId, status);
    },
  };
}
