import Link from "next/link";
import Image from "next/image";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFound() {
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
          {/* 404 Number */}
          <div className="relative mb-8">
            <span className="text-[120px] sm:text-[180px] font-bold text-grey-800 leading-none select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-grey-800 border border-grey-700 flex items-center justify-center">
                <Search className="w-8 h-8 text-text-muted" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Page not found
          </h1>
          <p className="text-text-muted mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button size="lg" className="w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Go to homepage
              </Button>
            </Link>
            <Link href="/#catalog">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Browse catalog
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
