"use client";

import { Settings, CreditCard, LogOut, Shield, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dropdown } from "@/components/ui";

interface UserDropdownProps {
  email: string;
  displayName: string;
  isAdmin?: boolean;
}

export function UserDropdown({ email, displayName, isAdmin = false }: UserDropdownProps) {
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

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
    ...(isAdmin
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
    <Dropdown
      trigger={
        <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-grey-800 transition-all duration-200 group border border-transparent hover:border-grey-700">
          <div className="w-8 h-8 rounded-full bg-grey-700 flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {email?.[0]?.toUpperCase() || "U"}
            </span>
          </div>
          <span className="text-body text-text-secondary hidden sm:block group-hover:text-white transition-colors">
            {displayName}
          </span>
          <ChevronDown className="w-4 h-4 text-text-muted hidden sm:block" />
        </button>
      }
      items={userMenuItems}
    />
  );
}
