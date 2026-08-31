"use client";

import {
  ClerkProvider,
} from "@clerk/nextjs";
import {
  arSA,
  enUS,
  heIL,
} from "@clerk/localizations";
import {
  usePathname,
} from "next/navigation";
import type {
  ReactNode,
} from "react";

import {
  readAuthHref,
  readAuthLanguageFromPathname,
} from "../../shared/i18n/auth";

const clerkLocalization = {
  he: heIL,
  en: enUS,
  ar: arSA,
} as const;

export function LocalizedClerkProvider({
  children,
  publishableKey,
}: {
  children: ReactNode;
  publishableKey: string;
}) {
  const pathname = usePathname();
  const language = readAuthLanguageFromPathname(pathname);

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={readAuthHref(language, "login")}
      signUpUrl={readAuthHref(language, "register")}
      signInFallbackRedirectUrl="/workspace"
      signUpFallbackRedirectUrl="/workspace/onboarding"
      localization={clerkLocalization[language]}
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
