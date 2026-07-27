import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceDraftProvider } from "../../features/workspace/WorkspaceDraftProvider";
import { hasClerkServerConfiguration } from "../../server/auth/clerkConfiguration";
import { readCurrentBusinessProfile } from "../../server/onboarding/currentBusinessProfile";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  let initialBusinessProfile = null;

  if (hasClerkServerConfiguration()) {
    const { userId } = await auth();

    if (!userId) {
      redirect("/login");
    }

    initialBusinessProfile = await readCurrentBusinessProfile();
  }

  return (
    <WorkspaceDraftProvider
      initialBusinessProfileDraft={initialBusinessProfile}
    >
      {children}
    </WorkspaceDraftProvider>
  );
}
