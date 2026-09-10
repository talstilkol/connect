import type {
  Metadata,
} from "next";
import {
  notFound,
} from "next/navigation";

import {
  PublicLandingPage,
} from "../../features/public/PublicLandingPage";
import {
  isPublicLandingLanguage,
  readPublicLandingMessages,
} from "../../shared/i18n/publicLanding";

interface LocalizedPublicPageProps {
  params: Promise<{ locale: string }>;
}

async function requireLanguage(
  params: LocalizedPublicPageProps["params"],
) {
  const { locale } = await params;

  if (!isPublicLandingLanguage(locale)) {
    notFound();
  }

  return locale;
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export async function generateMetadata({
  params,
}: LocalizedPublicPageProps): Promise<Metadata> {
  const language = await requireLanguage(params);
  const messages = readPublicLandingMessages(language);

  return messages.metadata;
}

export default async function LocalizedPublicPage({
  params,
}: LocalizedPublicPageProps) {
  const language = await requireLanguage(params);

  return <PublicLandingPage language={language} />;
}
