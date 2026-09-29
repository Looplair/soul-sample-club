"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  LayoutGrid,
  User,
  Settings,
  LogOut,
  Shield,
  CreditCard,
  Library,
  Monitor,
  Trophy,
  LogIn,
  UserPlus,
  HelpCircle,
  Tag,
} from "lucide-react";
import { VaultButton } from "@/components/vault/VaultButton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserDropdown } from "./UserDropdown";
import type { Profile, NotificationWithReadStatus } from "@/types/database";

interface NavbarProps {
  user: Profile | null;
  notifications?: NotificationWithReadStatus[];
  unreadCount?: number;
  /** This week's pack, shown as a chip next to the logo */
  latest?: { name: string; href: string; cover_image_url: string | null };
  /**
   * Slide the bar away while scrolling down and back on any scroll up. For
   * pages with their own sticky toolbar (the catalog), so only one bar shows.
   * Sets data-nav-hidden on <html> so `.ssc-under-nav` bars can move up.
   */
  autoHide?: boolean;
}

// Members get their tools; logged-out visitors (often cold traffic from ads)
// get the two questions they arrive with: how it works and what it costs.
const MEMBER_LINKS = [
  { href: "/feed", label: "Catalog", icon: LayoutGrid },
  { href: "/library", label: "Library", icon: Library },
  { href: "/vault", label: "Drum Vault", icon: Trophy },
  { href: "/app", label: "App", icon: Monitor },
];
const VISITOR_LINKS = [
  { href: "/feed", label: "Catalog", icon: LayoutGrid },
  { href: "/#how-it-works", label: "How it works", icon: HelpCircle },
  { href: "/#pricing", label: "Pricing", icon: Tag },
  { href: "/app", label: "App", icon: Monitor },
];

export function Navbar({ user, notifications = [], unreadCount = 0, latest, autoHide = false }: NavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!autoHide) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 140) setHidden(false);
      else if (y > lastY + 6) setHidden(true);
      else if (y < lastY - 6) setHidden(false);
      else return; // tiny movements don't count
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      delete document.documentElement.dataset.navHidden;
    };
  }, [autoHide]);

  // Never hide while the phone menu is open
  const isHidden = autoHide && hidden && !menuOpen;
  useEffect(() => {
    if (!autoHide) return;
    if (isHidden) document.documentElement.dataset.navHidden = "1";
    else delete document.documentElement.dataset.navHidden;
  }, [autoHide, isHidden]);
  const supabase = createClient();
  const isLoggedIn = !!user;
  const navLinks = isLoggedIn ? MEMBER_LINKS : VISITOR_LINKS;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isActive = (href: string) =>
    pathname === href || (href === "/feed" && pathname.startsWith("/packs"));

  return (
    // Floating glass bar inside the same 64px band the old bar used, so page offsets don't change
    <nav
      className={cn(
        "sticky top-0 z-40 h-16 px-3 pt-2 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-5",
        isHidden && "-translate-y-full"
      )}
    >
      <div
        className="ssc-glass ssc-glass--plain ssc-glass--blur relative mx-auto flex h-12 max-w-[1240px] items-center justify-between gap-3 rounded-2xl px-2.5 sm:px-3"
        style={{ background: "linear-gradient(180deg, rgba(20,20,20,0.82), rgba(8,8,8,0.78))" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          {/* Logo - always links to homepage */}
          <Link href="/" className="flex flex-shrink-0 items-center pl-1.5">
            <Image src="/logo.svg" alt="Soul Sample Club" width={160} height={36} className="h-7 w-auto" priority />
          </Link>
          {latest && (
            <Link
              href={latest.href}
              className="hidden items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] py-1 pl-1 pr-3 transition-colors hover:border-white/30 lg:flex"
            >
              <span className="relative h-6 w-6 overflow-hidden rounded-full">
                {latest.cover_image_url && <Image src={latest.cover_image_url} alt="" fill sizes="24px" className="object-cover" />}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">New release</span>
            </Link>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "py-1 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
                isActive(link.href) ? "text-white" : "text-white/60 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <VaultButton />

          {isLoggedIn ? (
            <>
              <NotificationBell
                userId={user.id}
                initialNotifications={notifications}
                initialUnreadCount={unreadCount}
              />
              {/* Desktop-only account menu (incl. Admin Panel for admins); mobile gets the same via the menu below */}
              <div className="hidden md:block">
                <UserDropdown
                  email={user.email}
                  displayName={user.username || user.full_name || user.email?.split("@")[0] || "Account"}
                  isAdmin={user.is_admin}
                />
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-1.5">
              <Link
                href="/login"
                className="rounded-xl px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/75 transition-colors hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/subscribe"
                className="rounded-xl bg-white px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-black transition-colors hover:bg-white/85"
              >
                Join
              </Link>
            </div>
          )}

          {/* Single menu button — everything (nav + account) lives here on mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden btn-icon"
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — nav links + account actions together, one surface */}
      {/* CSS open animation (no animation library on every page) */}
      {menuOpen && (
          <div className="ssc-menu-in md:hidden mx-auto mt-2 max-w-[1240px] overflow-hidden rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl">
            <div className="p-2 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive(link.href)
                        ? "bg-white/10 text-white"
                        : "text-text-secondary hover:bg-grey-800 hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}

              <div className="my-2 border-t border-grey-700" />

              {isLoggedIn ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive("/account")
                        ? "bg-white/10 text-white"
                        : "text-text-secondary hover:bg-grey-800 hover:text-white"
                    )}
                  >
                    <Settings className="w-5 h-5" />
                    Account
                  </Link>
                  <Link
                    href="/account?tab=billing"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-grey-800 hover:text-white transition-all duration-200"
                  >
                    <CreditCard className="w-5 h-5" />
                    Billing
                  </Link>
                  {user.is_admin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-grey-800 hover:text-white transition-all duration-200"
                    >
                      <Shield className="w-5 h-5" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-error hover:bg-error/10 transition-all duration-200 w-full text-left"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-grey-800 hover:text-white transition-all duration-200"
                  >
                    <LogIn className="w-5 h-5" />
                    Log in
                  </Link>
                  <Link
                    href="/subscribe"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-all duration-200"
                  >
                    <UserPlus className="w-5 h-5" />
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
      )}
    </nav>
  );
}
