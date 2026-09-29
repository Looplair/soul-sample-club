import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Pill } from "@/components/ssc/Glass";

export default function NotFound() {
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
          <Pill>Error 404</Pill>
          <h1 className="ssc-display mt-6 text-[clamp(2.6rem,9vw,6.5rem)]">Page not found</h1>
          <p className="ssc-body mt-6 max-w-md text-[clamp(1rem,1.3vw,1.125rem)] leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          {/* Actions */}
          <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/" className="ssc-btn ssc-btn--primary">
              Go to homepage
            </Link>
            <Link href="/#catalog" className="ssc-btn ssc-btn--ghost">
              Browse catalog
              <ArrowRight className="h-4 w-4" />
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
