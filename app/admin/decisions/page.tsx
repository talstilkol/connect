import {
  SystemAdminDecisionPanel,
} from "../../../features/admin/SystemAdminDecisionPanel.tsx";
import {
  readCurrentProductionReadiness,
} from "../../../server/operations/currentProductionReadiness.ts";
import {
  readCurrentSystemAdminProductionDecisions,
} from "../../../server/operations/currentSystemAdminProductionDecisions.ts";

export const dynamic = "force-dynamic";

export default async function SystemAdminDecisionsPage() {
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
