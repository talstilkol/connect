import type {
  Metadata,
} from "next";
import {
  notFound,
} from "next/navigation";

import AuthForm from "../../../features/auth/AuthForm";
import {
  readAuthMessages,
} from "../../../shared/i18n/auth";
import {
  isPublicLandingLanguage,
} from "../../../shared/i18n/publicLanding";

interface LocalizedLoginPageProps {
  params: Promise<{ locale: string }>;
}

async function requireLocalizedLanguage(
  params: LocalizedLoginPageProps["params"],
) {
  const { locale } = await params;

  if (
    !isPublicLandingLanguage(locale) ||
    locale === "he"
  ) {
    notFound();
  }

  return locale;
}

export async function generateMetadata({
  params,
}: LocalizedLoginPageProps): Promise<Metadata> {
  const language = await requireLocalizedLanguage(params);

  return readAuthMessages(language).metadata.login;
}

export default async function LocalizedLoginPage({
  params,
}: LocalizedLoginPageProps) {
  const language = await requireLocalizedLanguage(params);

  return <AuthForm language={language} mode="login" />;
}
