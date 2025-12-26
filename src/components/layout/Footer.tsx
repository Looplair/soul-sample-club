import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-grey-800/50 py-8 mt-auto">
      <div className="container-app">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Image
            src="/logo.svg"
            alt="Soul Sample Club"
            width={140}
            height={32}
            className="h-7 w-auto"
          />

          {/* Links */}
          <div className="flex items-center gap-6 text-caption text-text-subtle">
            <Link
              href="https://looplair.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Looplair
            </Link>
            <Link
              href="/terms"
              className="hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
