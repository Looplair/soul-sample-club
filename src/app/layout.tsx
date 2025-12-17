import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/contexts/AudioContext";
import { NowPlayingBar } from "@/components/audio/NowPlayingBar";

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

export const metadata: Metadata = {
  title: "Soul Sample Club | Premium Sample Packs for Producers",
  description:
    "Access exclusive soul, gospel, and vintage sample packs. Download high-quality WAV files for your productions.",
  keywords: ["sample packs", "soul samples", "gospel samples", "music production", "looplair"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        <AudioProvider>
          <div className="flex-1 pb-20">{children}</div>
          <NowPlayingBar />
        </AudioProvider>
      </body>
    </html>
  );
}
