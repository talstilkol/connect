"use client";

import {
  ClerkProvider,
} from "@clerk/nextjs";
import {
  usePathname,
} from "next/navigation";
import {
  useState,
  type ReactNode,
} from "react";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft";
import { ClerkWorkspaceLanguageContext } from "./ClerkWorkspaceLanguage";

import {
  readAuthHref,
  readAuthLanguageFromPathname,
} from "../../shared/i18n/auth";

import {
  clerkLocalization,
} from "../../shared/i18n/clerk";
import { workspaceSectionPath } from "../../shared/workspace/navigation";

export function LocalizedClerkProvider({
  children,
  publishableKey,
}: {
  children: ReactNode;
  publishableKey: string;
}) {
  const pathname = usePathname();
  const [workspaceLanguage, setWorkspaceLanguage] = useState<InterfaceLanguage | null>(null);
  const language = pathname === "/workspace" || pathname?.startsWith("/workspace/")
    ? workspaceLanguage ?? "he"
    : readAuthLanguageFromPathname(pathname);

  return (
    <ClerkWorkspaceLanguageContext.Provider value={setWorkspaceLanguage}>
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={readAuthHref(language, "login")}
      signUpUrl={readAuthHref(language, "register")}
      signInFallbackRedirectUrl={workspaceSectionPath("dashboard", language)}
      signUpFallbackRedirectUrl={workspaceSectionPath("onboarding", language)}
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
    </ClerkWorkspaceLanguageContext.Provider>
  );
}
