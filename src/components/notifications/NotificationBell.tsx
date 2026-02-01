"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationPanel } from "./NotificationPanel";
import type { NotificationWithReadStatus } from "@/types/database";

interface NotificationBellProps {
  userId: string;
  initialNotifications: NotificationWithReadStatus[];
  initialUnreadCount: number;
}

export function NotificationBell({
  userId,
  initialNotifications,
  initialUnreadCount,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<NotificationWithReadStatus[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const bellRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Real-time subscription for new notifications
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        async () => {
          // Fetch latest notifications
          const { data } = await supabase
            .from("notifications")
            .select("*")
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order("created_at", { ascending: false })
            .limit(20);

          if (data) {
            // Check which are read
            const { data: reads } = await supabase
              .from("notification_reads")
              .select("notification_id")
              .eq("user_id", userId);

            const readIds = new Set(
              reads?.map((r: { notification_id: string }) => r.notification_id) || []
            );

            const withStatus = data.map((n: NotificationWithReadStatus) => ({
              ...n,
              is_read: readIds.has(n.id),
            }));

            setNotifications(withStatus);
            setUnreadCount(withStatus.filter((n: NotificationWithReadStatus) => !n.is_read).length);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("notification_reads") as any).upsert(
      {
        notification_id: notificationId,
        user_id: userId,
      },
      { onConflict: "notification_id,user_id" }
    );

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("notification_reads") as any).upsert(
      unread.map((n) => ({
        notification_id: n.id,
        user_id: userId,
      })),
      { onConflict: "notification_id,user_id" }
    );

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-grey-800 transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-text-secondary hover:text-white transition-colors" />

        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 bg-velvet text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <NotificationPanel
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllRead={handleMarkAllRead}
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
