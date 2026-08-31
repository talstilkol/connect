import { auth } from "@clerk/nextjs/server";
import WorkspaceApp from "../../features/workspace/WorkspaceApp";
import { hasClerkServerConfiguration } from "../../server/auth/clerkConfiguration";
import { readCurrentMetaEmbeddedSignup } from "../../server/meta/currentMetaEmbeddedSignup";
import { readCurrentMetaConnection } from "../../server/meta/currentMetaConnection";
import { readCurrentProductionReadiness } from "../../server/operations/currentProductionReadiness";
import { readWorkspaceLanguage } from "../../shared/i18n/workspace";

// Clerk's experimental lint rule cannot follow the intentional config-disabled rehearsal branch; source-contract tests enforce the conditional direct protection.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string | string[];
  }>;
}) {
  const authEnabled = hasClerkServerConfiguration();
  const { lang } = await searchParams;
  const language = readWorkspaceLanguage(lang);

  if (authEnabled) {
    await auth.protect();
  }

  const [
    initialMetaConnection,
    initialMetaEmbeddedSignup,
    initialProductionReadiness,
  ] = await Promise.all([
    readCurrentMetaConnection(),
    readCurrentMetaEmbeddedSignup(),
    Promise.resolve(
      readCurrentProductionReadiness(),
    ),
  ]);

  return (
    <WorkspaceApp
      activeSection="dashboard"
      language={language}
      authEnabled={authEnabled}
      initialMetaConnection={initialMetaConnection}
      initialMetaEmbeddedSignup={initialMetaEmbeddedSignup}
      initialProductionReadiness={
        initialProductionReadiness
      }
    />
  );
}
