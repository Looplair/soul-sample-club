"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { Pill } from "@/components/ssc/Glass";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="ssc flex min-h-screen flex-col overflow-x-clip">
      {/* Header */}
      <header className="px-5 pt-6 sm:px-8">
        <div className="mx-auto max-w-[1240px]">
          <Link href="/" className="inline-flex">
            <Image src="/logo.svg" alt="Soul Sample Club" width={160} height={36} className="h-7 w-auto sm:h-9" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-8">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <Pill>Error</Pill>
          <h1 className="ssc-display mt-6 text-[clamp(2.4rem,8vw,5.8rem)]">Something went wrong</h1>
          <p className="ssc-body mt-6 max-w-md text-[clamp(1rem,1.3vw,1.125rem)] leading-relaxed">
            We encountered an unexpected error. Please try again.
          </p>
          {error.digest && <p className="mt-3 text-[12px] text-white/55">Error ID: {error.digest}</p>}

          {/* Actions */}
          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button type="button" onClick={reset} className="ssc-btn ssc-btn--primary">
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <Link href="/" className="ssc-btn ssc-btn--ghost">
              Go to homepage
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-5 py-6 text-center text-[12px] text-white/55">
        © {new Date().getFullYear()} Soul Sample Club
      </footer>
    </div>
  );
}
