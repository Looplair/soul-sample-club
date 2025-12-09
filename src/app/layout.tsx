import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
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
    <html lang="en" className={inter.variable}>
      <body className="font-sans min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
