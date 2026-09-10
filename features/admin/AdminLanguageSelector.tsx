import Link from "next/link";
import type {
  InterfaceLanguage,
} from "../../shared/domain/businessProfileDraft.ts";
import {
  readAdminLocaleLinks,
} from "../../shared/i18n/admin.ts";

const ariaLabels = {
  he: "בחירת שפת ניהול המערכת",
  en: "Select system administration language",
  ar: "اختيار لغة إدارة النظام",
} as const satisfies Record<
  InterfaceLanguage,
  string
>;

export function AdminLanguageSelector({
  language,
  pathname,
}: {
  language: InterfaceLanguage;
  pathname: string;
}) {
  return (
    <nav
      aria-label={ariaLabels[language]}
      className="admin-language-switcher"
    >
      {readAdminLocaleLinks(pathname).map(
        (locale) => (
          <Link
            aria-current={
              locale.language === language
                ? "page"
                : undefined
            }
            dir={locale.direction}
            href={locale.href}
            key={locale.language}
          >
            {locale.language.toUpperCase()}
          </Link>
        ),
      )}
    </nav>
  );
}
