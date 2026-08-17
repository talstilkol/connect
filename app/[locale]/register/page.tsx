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

interface LocalizedRegisterPageProps {
  params: Promise<{ locale: string }>;
}

async function requireLocalizedLanguage(
  params: LocalizedRegisterPageProps["params"],
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
}: LocalizedRegisterPageProps): Promise<Metadata> {
  const language = await requireLocalizedLanguage(params);

  return readAuthMessages(language).metadata.register;
}

export default async function LocalizedRegisterPage({
  params,
}: LocalizedRegisterPageProps) {
  const language = await requireLocalizedLanguage(params);

  return <AuthForm language={language} mode="register" />;
}
