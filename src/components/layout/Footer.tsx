import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-steel py-32 mt-auto">
      <div className="container-app">
        <div className="flex flex-col md:flex-row items-center justify-between gap-16">
          <div className="flex items-center gap-12">
            <div className="w-8 h-8 rounded-lg bg-velvet flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-label text-snow/50">
              Soul Sample Club by Looplair
            </span>
          </div>
          <div className="flex items-center gap-24 text-label text-snow/50">
            <Link
              href="https://looplair.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-snow transition-colors"
            >
              Looplair
            </Link>
            <Link
              href="/terms"
              className="hover:text-snow transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-snow transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
