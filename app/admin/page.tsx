import { auth } from "@clerk/nextjs/server";
import {
  SystemAdminTenantPanel,
} from "../../features/admin/SystemAdminTenantPanel.tsx";
import {
  readCurrentSystemAdminTenantDirectory,
} from "../../server/admin/currentSystemAdminTenantDirectory.ts";
import { hasClerkServerConfiguration } from "../../server/auth/clerkConfiguration.ts";

export const dynamic = "force-dynamic";

// Clerk's experimental lint rule cannot follow the intentional config-disabled rehearsal branch; source-contract tests enforce the conditional direct protection.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function SystemAdminPage() {
  if (hasClerkServerConfiguration()) {
    await auth.protect();
  }

  const result =
    await readCurrentSystemAdminTenantDirectory();

  return (
    <SystemAdminTenantPanel
      initialStatus={result.status}
      initialDirectory={result.directory}
    />
  );
}
