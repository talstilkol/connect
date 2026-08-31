import type {
  CurrentSystemAdminTenantDirectory,
} from "../../shared/domain/systemAdminTenantDirectory.ts";
import {
  createCurrentRailwaySystemAdminTenantDirectoryHandler,
} from "./currentRailwaySystemAdminTenantDirectoryHandler.ts";

export async function readCurrentSystemAdminTenantDirectory():
  Promise<CurrentSystemAdminTenantDirectory> {
  try {
    return await createCurrentRailwaySystemAdminTenantDirectoryHandler()
      .read();
  } catch {
    return {
      status: "server-error",
      directory: {
        tenants: [],
        nextCursor: null,
      },
    };
  }
}
