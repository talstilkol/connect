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
import {
  readAdminLanguage,
} from "../../../shared/i18n/admin.ts";

export const dynamic = "force-dynamic";

// Clerk's experimental lint rule cannot follow the intentional config-disabled rehearsal branch; source-contract tests enforce the conditional direct protection.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function SystemAdminDecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string | string[];
  }>;
}) {
  const { lang } = await searchParams;
  const language = readAdminLanguage(lang);

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
      language={language}
      initialStatus={result.status}
      initialRecords={result.records}
      readinessReport={readinessReport}
    />
  );
}
