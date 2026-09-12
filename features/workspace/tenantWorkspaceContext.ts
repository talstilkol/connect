"use client";

import { createContext, useContext } from "react";
import type { TenantRole } from "../../shared/domain/model";
import type { TenantSelectionDirectory } from "../../server/auth/tenantSelectionService";

export const TenantWorkspaceContext = createContext<TenantSelectionDirectory | null>(null);

// Presentation hint from the server's eligible membership directory.
// Mutations still enforce the current identity and permission on the API.
export function useCurrentTenantRole(): TenantRole | null {
  const directory = useContext(TenantWorkspaceContext);
  if (!directory || directory.selectionRequired) return null;
  const selected = directory.options.filter((option) => option.selected);
  return selected.length === 1 ? selected[0].role : null;
}
