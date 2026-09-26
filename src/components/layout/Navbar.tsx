"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { VaultButton } from "@/components/vault/VaultButton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserDropdown } from "./UserDropdown";
import type { Profile, NotificationWithReadStatus } from "@/types/database";

interface NavbarProps {
  user: Profile | null;
  notifications?: NotificationWithReadStatus[];
  unreadCount?: number;
}

const NAV_LINKS = [
  { href: "/feed", label: "Catalog", icon: LayoutGrid },
  { href: "/library", label: "Library", icon: Library },
  { href: "/vault", label: "Drum Vault", icon: Trophy },
  { href: "/app", label: "App", icon: Monitor },
];

export function Navbar({ user, notifications = [], unreadCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();
  const isLoggedIn = !!user;
  // Library is a member's own collection, so hide it from logged-out visitors
  const navLinks = NAV_LINKS.filter((link) => isLoggedIn || link.href !== "/library");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isActive = (href: string) =>
    pathname === href || (href === "/feed" && pathname.startsWith("/packs"));

  return (
    <nav className="h-16 bg-charcoal border-b border-grey-700 sticky top-0 z-40 backdrop-blur-xl bg-charcoal/90">
      <div className="container-app h-full flex items-center justify-between">
        {/* Logo - always links to homepage */}
        <Link href="/" className="flex items-center group">
          <Image
            src="/logo.svg"
            alt="Soul Sample Club"
            width={160}
            height={36}
            className="h-8 sm:h-9 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("nav-link py-1", isActive(link.href) && "nav-link-active")}
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
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/subscribe">
                <Button size="sm">Get started</Button>
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
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden bg-charcoal-elevated border-b border-grey-700 overflow-hidden"
          >
            <div className="container-app py-4 space-y-1">
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
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
