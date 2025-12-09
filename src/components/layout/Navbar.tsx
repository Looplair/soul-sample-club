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
    <nav className="h-72 bg-midnight border-b border-steel sticky top-0 z-40">
      <div className="container-app h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-12">
          <div className="w-10 h-10 rounded-lg bg-velvet flex items-center justify-center">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <span className="text-h3 text-snow hidden sm:block">
            Soul Sample Club
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-32">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-8 text-body transition-colors",
                  isActive
                    ? "text-velvet-light"
                    : "text-snow/70 hover:text-snow"
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-16">
          {user && (
            <Dropdown
              trigger={
                <button className="flex items-center gap-12 p-8 rounded-button hover:bg-steel/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-velvet flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="text-body text-snow hidden sm:block">
                    {user.full_name || user.email?.split("@")[0]}
                  </span>
                </button>
              }
              items={userMenuItems}
            />
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-8 text-snow/70 hover:text-snow"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
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
            transition={{ duration: 0.2 }}
            className="md:hidden bg-midnight border-b border-steel overflow-hidden"
          >
            <div className="container-app py-16 space-y-8">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-12 p-12 rounded-button transition-colors",
                      isActive
                        ? "bg-velvet/20 text-velvet-light"
                        : "text-snow/70 hover:bg-steel/50 hover:text-snow"
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
                  className="flex items-center gap-12 p-12 rounded-button text-velvet-light hover:bg-velvet/20 transition-colors"
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
