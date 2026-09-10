"use server";

import {
  createCurrentRailwayTenantSelectionHandler,
} from "./currentRailwayTenantSelectionHandler.ts";
import type {
  LoadTenantSelectionActionResult,
  SelectTenantActionResult,
} from "./tenantSelectionActionResult.ts";

export type {
  LoadTenantSelectionActionResult,
  SelectTenantActionResult,
} from "./tenantSelectionActionResult.ts";

export async function loadTenantSelectionAction():
Promise<LoadTenantSelectionActionResult> {
  return createCurrentRailwayTenantSelectionHandler().load();
}

export async function selectTenantAction(
  input: unknown,
): Promise<SelectTenantActionResult> {
  return createCurrentRailwayTenantSelectionHandler().select(input);
}
