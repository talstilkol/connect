"use client";

import { createContext, useContext, useEffect, type Dispatch, type SetStateAction } from "react";
import type { InterfaceLanguage } from "../../shared/domain/businessProfileDraft";

export const ClerkWorkspaceLanguageContext = createContext<
  Dispatch<SetStateAction<InterfaceLanguage | null>> | null
>(null);

export function useClerkWorkspaceLanguage(language: InterfaceLanguage) {
  const setLanguage = useContext(ClerkWorkspaceLanguageContext);
  useEffect(() => {
    setLanguage?.(language);
    return () => setLanguage?.(null);
  }, [language, setLanguage]);
}
