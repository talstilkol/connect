import WorkspaceApp from "../../features/workspace/WorkspaceApp";
import { hasClerkServerConfiguration } from "../../server/auth/clerkConfiguration";
import { readCurrentMetaEmbeddedSignup } from "../../server/meta/currentMetaEmbeddedSignup";
import { readCurrentMetaConnection } from "../../server/meta/currentMetaConnection";
import { readCurrentProductionReadiness } from "../../server/operations/currentProductionReadiness";

export default async function WorkspacePage() {
  const authEnabled = hasClerkServerConfiguration();
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
