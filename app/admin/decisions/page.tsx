import { auth } from "@clerk/nextjs/server";
import {
  SystemAdminDecisionPanel,
} from "../../../features/admin/SystemAdminDecisionPanel.tsx";
import { hasClerkServerConfiguration } from "../../../server/auth/clerkConfiguration.ts";
import {
  readCurrentProductionReadiness,
} from "../../../server/operations/currentProductionReadiness.ts";
import {
  readCurrentSystemAdminProductionDecisions,
} from "../../../server/operations/currentSystemAdminProductionDecisions.ts";

export const dynamic = "force-dynamic";

// Clerk's experimental lint rule cannot follow the intentional config-disabled rehearsal branch; source-contract tests enforce the conditional direct protection.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function SystemAdminDecisionsPage() {
  if (hasClerkServerConfiguration()) {
    await auth.protect();
  }

  const [result, readinessReport] =
    await Promise.all([
      readCurrentSystemAdminProductionDecisions(),
      readCurrentProductionReadiness(),
    ]);

  return (
    <SystemAdminDecisionPanel
      initialStatus={result.status}
      initialRecords={result.records}
      readinessReport={readinessReport}
    />
  );
}
