"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

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
    <div className="min-h-screen bg-charcoal flex flex-col">
      {/* Header */}
      <header className="border-b border-grey-700/50">
        <div className="container-app h-14 sm:h-16 flex items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Soul Sample Club"
              width={160}
              height={36}
              className="h-7 sm:h-9 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* Error Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-error/10 border border-error/20 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-error" />
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Something went wrong
          </h1>
          <p className="text-text-muted mb-2">
            We encountered an unexpected error. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-text-subtle mb-8">
              Error ID: {error.digest}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={reset} className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
            <Link href="/">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Go to homepage
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-grey-700/50 py-6">
        <div className="container-app text-center">
          <p className="text-sm text-text-subtle">
            © {new Date().getFullYear()} Soul Sample Club
          </p>
        </div>
      </footer>
    </div>
  );
}
