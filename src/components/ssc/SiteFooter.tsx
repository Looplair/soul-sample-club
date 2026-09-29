import Image from "next/image";
import Link from "next/link";
import { GenreWordmark } from "@/components/genre/GenreWordmark";
import { glowStyle } from "./Glass";

// Big closing footer in the Looplair style: a last call to action, link
// columns, the legal line, then the name huge and bleeding off the bottom.
// The warm light behind it takes the colour of this week's cover when given.

const COLUMNS = [
  {
    title: "Soul Sample Club",
    links: [
      { href: "/feed", label: "Catalog" },
      { href: "/free", label: "Free sample pack" },
      { href: "/vault", label: "Drum Vault" },
      { href: "/app", label: "Desktop app" },
    ],
  },
  {
    title: "Membership",
    links: [
      { href: "/subscribe", label: "Join" },
      { href: "/login", label: "Log in" },
      { href: "/account", label: "Your account" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/guides", label: "Guides" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Looplair",
    links: [
      { href: "https://thelooplair.com", label: "Looplair", external: true },
      { href: "https://flairevocals.com", label: "Flaire vocals", external: true },
    ],
  },
];

export function SiteFooter({ showGuides = true, cta = true, glow }: { showGuides?: boolean; cta?: boolean; glow?: string }) {
  return (
    // -mb-20/pb-20 runs the footer's light over the 80px the layout leaves under every page
    <footer
      className="relative -mb-20 overflow-hidden border-t border-white/[0.08] pb-20"
      style={glowStyle(glow ?? "196, 150, 110", {
        background: "radial-gradient(90% 70% at 50% 100%, rgba(var(--glow), 0.16) 0%, rgba(var(--glow), 0.05) 45%, rgba(0,0,0,0) 75%), #000",
      })}
    >
      <div className="mx-auto max-w-[1240px] px-5 pt-[clamp(56px,7vw,96px)] sm:px-8">
        {cta && (
          <div className="mb-[clamp(56px,7vw,96px)] flex flex-col items-start gap-6">
            <h2 className="ssc-display max-w-3xl text-[clamp(2.2rem,5.6vw,4.6rem)]">Soul you won&apos;t hear anywhere else</h2>
            <p className="ssc-label">Taste over quantity.</p>
            <Link href="/feed" className="ssc-btn ssc-btn--primary">
              Browse the catalog
            </Link>
          </div>
        )}

        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div>
            <Image src="/logo.svg" alt="Soul Sample Club" width={160} height={36} className="h-8 w-auto" />
            <p className="ssc-body mt-5 max-w-xs text-[15px] leading-relaxed">
              Original soul compositions, pre-cleared for producers. A new pack every week.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="ssc-label">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links
                    .filter((l) => showGuides || l.href !== "/guides")
                    .map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          {...("external" in l && l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white/75 transition-colors hover:text-white"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/[0.08] py-6 text-[12px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Soul Sample Club by Looplair</p>
        </div>
      </div>

      {/* The name, huge, softly fading toward the bottom */}
      <div
        aria-hidden
        className="pointer-events-none mt-6 select-none px-3 pb-6 sm:px-5 sm:pb-8"
        style={{ WebkitMaskImage: "linear-gradient(180deg, #000 55%, rgba(0,0,0,0.45) 100%)", maskImage: "linear-gradient(180deg, #000 55%, rgba(0,0,0,0.45) 100%)" }}
      >
        <GenreWordmark text="Soul Sample Club" fontClassName="ssc-display" className="text-white/[0.2]" />
      </div>
    </footer>
  );
}
