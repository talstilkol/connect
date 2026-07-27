import WorkspaceApp from "../../features/workspace/WorkspaceApp";
import { hasClerkServerConfiguration } from "../../server/auth/clerkConfiguration";
import { readCurrentMetaEmbeddedSignup } from "../../server/meta/currentMetaEmbeddedSignup";
import { readCurrentMetaConnection } from "../../server/meta/currentMetaConnection";

export default async function WorkspacePage() {
  const authEnabled = hasClerkServerConfiguration();
  const [
    initialMetaConnection,
    initialMetaEmbeddedSignup,
  ] = await Promise.all([
    readCurrentMetaConnection(),
    readCurrentMetaEmbeddedSignup(),
  ]);

  return (
    <WorkspaceApp
      activeSection="dashboard"
      authEnabled={authEnabled}
      initialMetaConnection={initialMetaConnection}
      initialMetaEmbeddedSignup={initialMetaEmbeddedSignup}
    />
  );
}
