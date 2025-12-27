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
  ChevronDown,
  Library,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Dropdown } from "@/components/ui";
import type { Profile } from "@/types/database";

interface NavbarProps {
  user: Profile | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const navLinks = [
    { href: "/feed", label: "Catalog", icon: LayoutGrid },
    { href: "/library", label: "Library", icon: Library },
    { href: "/app", label: "App", icon: Monitor },
    { href: "/account", label: "Account", icon: User },
  ];

  const userMenuItems = [
    {
      label: "Account",
      onClick: () => (window.location.href = "/account"),
      icon: <Settings className="w-4 h-4" />,
    },
    {
      label: "Billing",
      onClick: () => (window.location.href = "/account?tab=billing"),
      icon: <CreditCard className="w-4 h-4" />,
    },
    ...(user?.is_admin
      ? [
          {
            label: "Admin Panel",
            onClick: () => (window.location.href = "/admin"),
            icon: <Shield className="w-4 h-4" />,
          },
        ]
      : []),
    {
      label: "Sign Out",
      onClick: handleSignOut,
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
    },
  ];

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

        {/* Desktop Navigation - Tracklib style with underline indicators */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === "/feed" && pathname.startsWith("/packs"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "nav-link py-1",
                  isActive && "nav-link-active"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {user && (
            <Dropdown
              trigger={
                <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-grey-800 transition-all duration-200 group border border-transparent hover:border-grey-700">
                  <div className="w-8 h-8 rounded-full bg-grey-700 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="text-body text-text-secondary hidden sm:block group-hover:text-white transition-colors">
                    {user.username || user.full_name || user.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 text-text-muted hidden sm:block" />
                </button>
              }
              items={userMenuItems}
            />
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden btn-icon"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
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
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-text-secondary hover:bg-grey-800 hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
              {user?.is_admin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/10 transition-all duration-200"
                >
                  <Shield className="w-5 h-5" />
                  Admin Panel
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
