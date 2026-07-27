import { createMetaRepository } from "../../db/metaRepository";
import { requireRuntimeDatabase } from "../../db/runtimeDatabase";
import {
  configurationRequiredMetaConnection,
  toMetaConnectionView,
  type MetaConnectionView,
} from "../../shared/domain/metaConnectionView";
import { inspectClerkConfiguration } from "../auth/clerkConfiguration";
import { requireCurrentTenantSession } from "../auth/currentTenantSession";
import { TenantSessionError } from "../auth/tenantSession";
import { createMetaConnectionService } from "./metaConnectionService";

export async function readCurrentMetaConnection(): Promise<MetaConnectionView> {
  if (inspectClerkConfiguration().status !== "configured") {
    return configurationRequiredMetaConnection;
  }

  try {
    const database = await requireRuntimeDatabase();
    const session = await requireCurrentTenantSession(database);
    const service = createMetaConnectionService(
      createMetaRepository(database),
    );
    const connection = await service.read(session);

    return toMetaConnectionView(connection);
  } catch (error) {
    if (error instanceof TenantSessionError) {
      if (error.code === "TENANT_MEMBERSHIP_REQUIRED") {
        return { status: "onboarding-required" };
      }

      if (error.code === "TENANT_SELECTION_REQUIRED") {
        return { status: "tenant-selection-required" };
      }

      if (error.code === "PERMISSION_DENIED") {
        return { status: "permission-denied" };
      }
    }

    return { status: "server-error" };
  }
}
