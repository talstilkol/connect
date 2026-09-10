import {requestMetaMediaCleanupAction} from '../../../server/meta/metaMediaCleanupActions.ts';
import { auth } from "@clerk/nextjs/server";
import { MetaMediaTaskPanel } from "../../../features/workspace/MetaMediaTaskPanel.tsx";
import { hasClerkServerConfiguration } from "../../../server/auth/clerkConfiguration.ts";
import { readCurrentMetaMediaTasks } from "../../../server/meta/currentMetaMediaTasks.ts";
import { requestMetaMediaInspectionRetryAction } from "../../../server/meta/metaMediaInspectionRetryActions.ts";
import { decodeMetaMediaTaskCursor } from "../../../shared/domain/metaMediaTaskView.ts";
import { readWorkspaceLanguage } from "../../../shared/i18n/workspace.ts";
export const dynamic = "force-dynamic";
// Config-disabled pages expose only the unavailable state. The reader verifies
// current owner membership through the authenticated Railway boundary.
// eslint-disable-next-line @clerk/next/require-auth-protection
export default async function MetaMediaTasksPage({ searchParams }: {
  searchParams: Promise<{ lang?: string | string[]; after?: string | string[] }>;
}) {
  if (hasClerkServerConfiguration()) await auth.protect();
  const { lang, after } = await searchParams;
  const language = readWorkspaceLanguage(lang);
  const result = await readCurrentMetaMediaTasks(after);
  return <MetaMediaTaskPanel result={result} language={language} after={decodeMetaMediaTaskCursor(after)} requestRetry={requestMetaMediaInspectionRetryAction} requestCleanup={requestMetaMediaCleanupAction} />;
}
