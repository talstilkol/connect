import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";
import TenantSelectionGate from "../../features/workspace/TenantSelectionGate";
import {
  TenantWorkspaceProvider,
} from "../../features/workspace/TenantWorkspaceSwitcher";
import { WorkspaceDraftProvider } from "../../features/workspace/WorkspaceDraftProvider";
import { hasClerkServerConfiguration } from "../../server/auth/clerkConfiguration";
import {
  loadTenantSelectionAction,
} from "../../server/auth/tenantSelectionActions";
import type {
  TenantSelectionDirectory,
} from "../../server/auth/tenantSelectionService";
import { readCurrentBusinessProfile } from "../../server/onboarding/currentBusinessProfile";

export const dynamic = "force-dynamic";

// Clerk's experimental lint rule cannot follow the intentional config-disabled rehearsal branch; source-contract tests enforce the conditional direct protection.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  let initialBusinessProfile = null;
  let initialOrganizationId: string | null = null;
  let tenantDirectory:
    TenantSelectionDirectory | null =
    null;

  if (hasClerkServerConfiguration()) {
    const identity = await auth.protect();
    initialOrganizationId = identity.orgId ?? null;

    const tenantSelection =
      await loadTenantSelectionAction();

    if (
      tenantSelection.status ===
      "ready"
    ) {
      tenantDirectory =
        tenantSelection.directory;

      if (
        tenantDirectory
          .selectionRequired
      ) {
        return (
          <TenantSelectionGate
            directory={
              tenantDirectory
            }
          />
        );
      }
    }

    initialBusinessProfile = await readCurrentBusinessProfile();
  }

  return (
    <TenantWorkspaceProvider
      key={tenantDirectory?.options.find((option) => option.selected)?.selectionKey ?? "unselected"}
      directory={tenantDirectory}
    >
      <WorkspaceDraftProvider
        initialBusinessProfileDraft={initialBusinessProfile}
        initialBusinessProfileVersion={initialBusinessProfile?.version ?? 0}
        initialOrganizationId={initialOrganizationId}
      >
        {children}
      </WorkspaceDraftProvider>
    </TenantWorkspaceProvider>
  );
}
