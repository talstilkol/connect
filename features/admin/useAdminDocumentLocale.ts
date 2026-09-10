import { useEffect } from "react";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  readAdminDirection,
} from "../../shared/i18n/admin.ts";

export function useAdminDocumentLocale(
  language: InterfaceLanguage,
) {
  const direction = readAdminDirection(language);

  useEffect(() => {
    const root = document.documentElement;
    const previousLanguage = root.lang;
    const previousDirection = root.dir;

    root.lang = language;
    root.dir = direction;

    return () => {
      root.lang = previousLanguage;
      root.dir = previousDirection;
    };
  }, [direction, language]);

  return direction;
}
