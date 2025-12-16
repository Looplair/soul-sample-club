"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/packs", label: "Packs", icon: Package },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-graphite border-r border-steel min-h-[calc(100vh-72px)] p-24">
      <div className="mb-32">
        <Link
          href="/feed"
          className="flex items-center gap-8 text-label text-snow/50 hover:text-snow transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
      </div>

      <div className="mb-24">
        <h2 className="text-h3 text-snow">Admin Panel</h2>
        <p className="text-caption text-snow/50 mt-4">Manage your platform</p>
      </div>

      <nav className="space-y-4">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-12 p-12 rounded-button transition-all",
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
      </nav>

      <div className="mt-32 pt-32 border-t border-steel">
        <Link
          href="/admin/packs/new"
          className="btn-primary w-full flex items-center justify-center gap-8"
        >
          <Plus className="w-4 h-4" />
          New Pack
        </Link>
      </div>
    </aside>
  );
}
