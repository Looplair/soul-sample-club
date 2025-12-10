"use client";

import Link from "next/link";
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
    window.location.href = "/login";
  };

  const navLinks = [
    { href: "/dashboard", label: "Packs", icon: LayoutGrid },
    { href: "/account", label: "Account", icon: User },
  ];

  const userMenuItems = [
    {
      label: "Account Settings",
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
    <nav className="h-16 bg-black border-b border-grey-800/50 sticky top-0 z-40 backdrop-blur-xl bg-black/90">
      <div className="container-app h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-purple flex items-center justify-center shadow-glow-purple-soft group-hover:shadow-glow-purple transition-shadow duration-300">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <span className="text-h4 text-white hidden sm:block group-hover:text-purple-light transition-colors">
            Soul Sample Club
          </span>
        </Link>

        {/* Desktop Navigation - Tracklib style with underline indicators */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
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
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-grey-800/50 transition-all duration-200 group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-purple-dark flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="text-body text-text-secondary hidden sm:block group-hover:text-white transition-colors">
                    {user.full_name || user.email?.split("@")[0]}
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
            className="md:hidden bg-black-elevated border-b border-grey-800/50 overflow-hidden"
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
                        ? "bg-purple-muted text-purple-light"
                        : "text-text-secondary hover:bg-grey-800/50 hover:text-white"
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-light hover:bg-purple-muted transition-all duration-200"
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
