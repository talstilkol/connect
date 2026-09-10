"use server";

import {
  createCurrentRailwaySystemAdminTenantDirectoryHandler,
} from "./currentRailwaySystemAdminTenantDirectoryHandler.ts";
import type {
  SystemAdminTenantDirectoryActionResult,
} from "./systemAdminTenantDirectoryActionResult.ts";

export async function loadSystemAdminTenantDirectoryAction(
  input: unknown,
): Promise<SystemAdminTenantDirectoryActionResult> {
  try {
    return await createCurrentRailwaySystemAdminTenantDirectoryHandler()
      .load(input);
  } catch {
    return { status: "server-error" };
  }
}
