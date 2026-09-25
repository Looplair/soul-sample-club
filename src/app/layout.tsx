import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { AudioProvider } from "@/contexts/AudioContext";
import { NowPlayingBar } from "@/components/audio/NowPlayingBar";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { KlaviyoTracking } from "@/components/analytics/KlaviyoTracking";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { FbclidCapture } from "@/components/analytics/FbclidCapture";
import { PaymentFailedBanner } from "@/components/subscription/PaymentFailedBanner";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

/** SHA-256 hex digest — used for Meta Advanced Matching (server-side, safe) */
async function sha256hex(value: string): Promise<string> {
  const buf = new TextEncoder().encode(value.toLowerCase().trim());
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

// Font for the wordmark only
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-wordmark",
});

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: "Soul Sample Club | Pre-Cleared Soul Samples for Producers",
  description:
    "Exclusive soul, jazz, gospel and funk compositions, pre-cleared for real releases. Full stems on every pack. First month $0.99.",
  keywords: ["soul samples", "pre-cleared samples", "royalty free soul samples", "soul sample packs", "gospel samples", "jazz samples", "sample packs with stems", "looplair"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Soul Sample Club",
    title: "Soul Sample Club | Pre-Cleared Soul Samples for Producers",
    description: "Exclusive soul, jazz, gospel and funk compositions, pre-cleared for real releases. Full stems on every pack. First month $0.99.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Soul Sample Club",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Soul Sample Club | Pre-Cleared Soul Samples for Producers",
    description: "Exclusive soul, jazz, gospel and funk compositions, pre-cleared for real releases. Full stems on every pack. First month $0.99.",
    images: ["/og-image.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // Hash email server-side for Meta Advanced Matching — gracefully skipped if not logged in
  let hashedEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      hashedEmail = await sha256hex(user.email);
    }
  } catch {
    // Not logged in or auth unavailable — continue without advanced matching
  }

  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        {gaId && <GoogleAnalytics gaId={gaId} />}
        <MetaPixel hashedEmail={hashedEmail} />
        <KlaviyoTracking />
        <Suspense fallback={null}>
          <FbclidCapture />
        </Suspense>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <AudioProvider>
          <div className="flex-1 pb-20">{children}</div>
          <NowPlayingBar />
        </AudioProvider>
        <Suspense fallback={null}>
          <PaymentFailedBanner />
        </Suspense>
      </body>
    </html>
  );
}
