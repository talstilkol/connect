import type {
  InterfaceLanguage,
} from "../domain/businessProfileDraft.ts";

export const adminLanguages = [
  "he",
  "en",
  "ar",
] as const satisfies readonly InterfaceLanguage[];

export type AdminDirection = "ltr" | "rtl";

export function readAdminLanguage(
  value: string | string[] | undefined,
): InterfaceLanguage {
  return value === "en" || value === "ar"
    ? value
    : "he";
}

export function readAdminDirection(
  language: InterfaceLanguage,
): AdminDirection {
  return language === "en" ? "ltr" : "rtl";
}

export function adminPath(
  pathname: string,
  language: InterfaceLanguage,
): string {
  return language === "he"
    ? pathname
    : `${pathname}?lang=${language}`;
}

export function adminHomePath(
  language: InterfaceLanguage,
): string {
  return language === "he"
    ? "/"
    : `/${language}`;
}

export function readAdminLocaleLinks(
  pathname: string,
): readonly {
  language: InterfaceLanguage;
  href: string;
  direction: AdminDirection;
}[] {
  return adminLanguages.map((language) => ({
    language,
    href: adminPath(pathname, language),
    direction: readAdminDirection(language),
  }));
}
