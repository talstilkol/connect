import {
  SystemAdminTenantPanel,
} from "../../features/admin/SystemAdminTenantPanel.tsx";
import {
  readCurrentSystemAdminTenantDirectory,
} from "../../server/admin/currentSystemAdminTenantDirectory.ts";

export const dynamic = "force-dynamic";

export default async function SystemAdminPage() {
  const result =
    await readCurrentSystemAdminTenantDirectory();

  return (
    <SystemAdminTenantPanel
      initialStatus={result.status}
      initialDirectory={result.directory}
    />
  );
}
