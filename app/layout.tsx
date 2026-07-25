import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Connect | WhatsApp Business Platform";
const description =
  "מערכת SaaS לניהול WhatsApp Business רשמי, קמפיינים, שיחות, בוטים וסוכני AI.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol ?? (host?.startsWith("localhost") ? "http" : "https");
  const requestOrigin = host ? `${protocol}://${host}` : null;
  const socialImage = requestOrigin ? `${requestOrigin}/og.png` : null;

  return {
    title,
    description,
    openGraph: socialImage
      ? {
          title,
          description,
          type: "website",
          url: requestOrigin ?? undefined,
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
