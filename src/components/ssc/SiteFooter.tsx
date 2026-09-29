import Image from "next/image";
import Link from "next/link";

const LINKS = [
  { href: "/feed", label: "Catalog" },
  { href: "/free", label: "Free sample pack" },
  { href: "/vault", label: "Drum Vault" },
  { href: "/app", label: "App" },
  { href: "/guides", label: "Guides" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter({ showGuides = true }: { showGuides?: boolean }) {
  return (
    <footer className="border-t border-white/[0.08] px-5 pb-28 pt-12 sm:px-8 sm:pb-14">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Image src="/logo.svg" alt="Soul Sample Club" width={140} height={32} className="h-7 w-auto self-start" />
        <nav className="flex flex-wrap gap-x-6 gap-y-3">
          {LINKS.filter((l) => showGuides || l.href !== "/guides").map((l) => (
            <Link key={l.href} href={l.href} className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-[12px] text-white/55">© {new Date().getFullYear()} Soul Sample Club by Looplair</p>
      </div>
    </footer>
  );
}
