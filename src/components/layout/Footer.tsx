import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-grey-800/50 py-8 mt-auto">
      <div className="container-app">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple/80 flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-caption text-text-subtle">
              Soul Sample Club by Looplair
            </span>
          </div>

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
