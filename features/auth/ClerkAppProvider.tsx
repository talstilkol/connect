import { ClerkProvider } from "@clerk/nextjs";
import { heIL } from "@clerk/localizations";
import type { ReactNode } from "react";
import { inspectClerkConfiguration } from "../../server/auth/clerkConfiguration";

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
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl="/workspace"
      signUpFallbackRedirectUrl="/workspace/onboarding"
      localization={heIL}
      appearance={{
        variables: {
          colorPrimary: "#2f825f",
          colorForeground: "#18322d",
          colorBackground: "#ffffff",
          borderRadius: "0.75rem",
        },
        elements: {
          rootBox: "clerk-auth-root",
          cardBox: "clerk-auth-card-box",
          card: "clerk-auth-card",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
