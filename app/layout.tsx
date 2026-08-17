import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClerkAppProvider from "../features/auth/ClerkAppProvider";
import { resolvePublicOrigin } from "../server/operations/publicOrigin";
import { publicLandingMessages } from "../shared/i18n/publicLanding";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { title, description } =
  publicLandingMessages.he.metadata;

export function generateMetadata(): Metadata {
  const publicOrigin = resolvePublicOrigin(
    process.env,
  );
  const socialImage = publicOrigin
    ? `${publicOrigin}/og.png`
    : null;

  return {
    title,
    description,
    openGraph: socialImage
      ? {
          title,
          description,
          type: "website",
          url: publicOrigin ?? undefined,
          images: [{ url: socialImage, width: 1748, height: 912 }],
        }
      : undefined,
    twitter: socialImage
      ? {
          card: "summary_large_image",
          title,
          description,
          images: [socialImage],
        }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link
          href="/favicon.svg"
          rel="icon"
          type="image/svg+xml"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ClerkAppProvider>{children}</ClerkAppProvider>
      </body>
    </html>
  );
}
