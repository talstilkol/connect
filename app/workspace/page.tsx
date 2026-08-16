import { auth } from "@clerk/nextjs/server";
import WorkspaceApp from "../../features/workspace/WorkspaceApp";
import { hasClerkServerConfiguration } from "../../server/auth/clerkConfiguration";
import { readCurrentMetaEmbeddedSignup } from "../../server/meta/currentMetaEmbeddedSignup";
import { readCurrentMetaConnection } from "../../server/meta/currentMetaConnection";
import { readCurrentProductionReadiness } from "../../server/operations/currentProductionReadiness";

// Clerk's experimental lint rule cannot follow the intentional config-disabled rehearsal branch; source-contract tests enforce the conditional direct protection.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function WorkspacePage() {
  const authEnabled = hasClerkServerConfiguration();

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
      authEnabled={authEnabled}
      initialMetaConnection={initialMetaConnection}
      initialMetaEmbeddedSignup={initialMetaEmbeddedSignup}
      initialProductionReadiness={
        initialProductionReadiness
      }
    />
  );
}
