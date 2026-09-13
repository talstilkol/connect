import { readAuthHref, readAuthLanguageFromPathname } from "../../shared/i18n/auth.ts";
import { readWorkspaceLanguage } from "../../shared/i18n/workspace.ts";

export function readClerkRequestRoutes(url: Pick<URL, "pathname" | "searchParams">) {
  const isWorkspace = url.pathname === "/workspace" || url.pathname.startsWith("/workspace/");
  const values = url.searchParams.getAll("lang");
  const language = isWorkspace
    ? readWorkspaceLanguage(values.length === 1 ? values[0] : undefined)
    : readAuthLanguageFromPathname(url.pathname);

  // Only fixed local auth paths are selected here. Clerk continues to own
  // validation and preservation of the original post-authentication redirect.
  return {
    signInUrl: readAuthHref(language, "login"),
    signUpUrl: readAuthHref(language, "register"),
  };
}
