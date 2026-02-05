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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://soulsampleclub.com";

export const metadata: Metadata = {
  title: "Soul Sample Club | Premium Sample Packs for Producers",
  description:
    "Access exclusive soul, gospel, and vintage sample packs. Download high-quality WAV files for your productions.",
  keywords: ["sample packs", "soul samples", "gospel samples", "music production", "looplair"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Soul Sample Club",
    title: "Soul Sample Club | Premium Sample Packs for Producers",
    description: "Access exclusive soul, gospel, and vintage sample packs. Download high-quality WAV files for your productions.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Soul Sample Club - Premium Sample Packs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Soul Sample Club | Premium Sample Packs for Producers",
    description: "Access exclusive soul, gospel, and vintage sample packs. Download high-quality WAV files for your productions.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        {gaId && <GoogleAnalytics gaId={gaId} />}
        <MetaPixel />
        <KlaviyoTracking />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <AudioProvider>
          <div className="flex-1 pb-20">{children}</div>
          <NowPlayingBar />
        </AudioProvider>
      </body>
    </html>
  );
}
