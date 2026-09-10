import { auth } from "@clerk/nextjs/server";
import {
  SystemAdminTenantPanel,
} from "../../features/admin/SystemAdminTenantPanel.tsx";
import {
  readCurrentSystemAdminTenantDirectory,
} from "../../server/admin/currentSystemAdminTenantDirectory.ts";
import { hasClerkServerConfiguration } from "../../server/auth/clerkConfiguration.ts";
import {
  readAdminLanguage,
} from "../../shared/i18n/admin.ts";

export const dynamic = "force-dynamic";

// Clerk's experimental lint rule cannot follow the intentional config-disabled rehearsal branch; source-contract tests enforce the conditional direct protection.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function SystemAdminPage({
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

  const result =
    await readCurrentSystemAdminTenantDirectory();

  return (
    <SystemAdminTenantPanel
      language={language}
      initialStatus={result.status}
      initialDirectory={result.directory}
    />
  );
}
