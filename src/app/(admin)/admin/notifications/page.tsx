"use client";

import { useState, useEffect } from "react";
import {
  Package,
  RotateCcw,
  Megaphone,
  Info,
  Bell,
} from "lucide-react";
import { Card, CardContent, Badge } from "@/components/ui";
import { CreateNotificationButton } from "@/components/admin/CreateNotificationButton";
import { DeleteNotificationButton } from "@/components/admin/DeleteNotificationButton";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Notification } from "@/types/database";

const typeIcons: Record<string, typeof Package> = {
  new_pack: Package,
  returned_pack: RotateCcw,
  announcement: Megaphone,
  custom: Info,
};

const typeColors: Record<string, string> = {
  new_pack: "bg-velvet/20 text-velvet",
  returned_pack: "bg-emerald-500/20 text-emerald-400",
  announcement: "bg-amber-500/20 text-amber-400",
  custom: "bg-purple-500/20 text-purple-400",
};

const typeLabels: Record<string, string> = {
  new_pack: "New Pack",
  returned_pack: "Returned Pack",
  announcement: "Announcement",
  custom: "Custom",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchNotifications = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("notifications") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when router refreshes (after create/delete)
  useEffect(() => {
    const handleFocus = () => fetchNotifications();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage notifications shown to all users. Auto-generated when packs are published or returned.
          </p>
        </div>
        <CreateNotificationButton />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-text-muted">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-7 h-7 text-text-muted opacity-40" />
              </div>
              <p className="text-text-muted mb-4">No notifications yet</p>
              <CreateNotificationButton />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                const colorClass = typeColors[notification.type] || "bg-white/10 text-white";
                const label = typeLabels[notification.type] || notification.type;

                return (
                  <div
                    key={notification.id}
                    className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Type Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-white truncate">
                          {notification.title}
                        </h3>
                        <Badge className={`text-[10px] ${colorClass}`}>
                          {label}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted/60">
                        <span>{formatDate(notification.created_at)}</span>
                        {notification.expires_at && (
                          <span>
                            Expires {formatDate(notification.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DeleteNotificationButton
                      notificationId={notification.id}
                      notificationTitle={notification.title}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
