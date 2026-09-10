import type { ReactNode } from "react";
import { inspectClerkConfiguration } from "../../server/auth/clerkConfiguration";
import { LocalizedClerkProvider } from "./LocalizedClerkProvider";

export default function ClerkAppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const configuration = inspectClerkConfiguration();
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();

  if (configuration.status !== "configured" || !publishableKey) {
    return children;
  }

  return (
    <LocalizedClerkProvider
      publishableKey={publishableKey}
    >
      {children}
    </LocalizedClerkProvider>
  );
}
