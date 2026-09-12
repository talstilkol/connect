import type { SelectTenantActionResult } from "../../server/auth/tenantSelectionActionResult.ts";

export type ActivateTenantOrganization = (organizationId: string) => Promise<void>;

export async function selectTenantWithOrganization(
  input: Readonly<{ selectionKey: string; expectedVersion: number }>,
  dependencies: Readonly<{
    select: (input: Readonly<{ selectionKey: string; expectedVersion: number }>) => Promise<SelectTenantActionResult>;
    activate: ActivateTenantOrganization;
  }>,
): Promise<SelectTenantActionResult> {
  let result: SelectTenantActionResult;
  try {
    result = await dependencies.select(input);
  } catch {
    return { status: "server-error" };
  }
  if (result.status !== "selected") return result;
  try {
    await dependencies.activate(result.organizationId);
    return result;
  } catch {
    // The choice may already be committed. Reload the directory so its current
    // version and organization mismatch offer an explicit retry, not a rollback.
    return { status: "temporarily-unavailable" };
  }
}
