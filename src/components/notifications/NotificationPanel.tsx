"use client";

import { motion } from "framer-motion";
import { Package, RotateCcw, Info, Megaphone, CheckCheck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NotificationWithReadStatus } from "@/types/database";

interface NotificationPanelProps {
  notifications: NotificationWithReadStatus[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

const notificationIcons: Record<string, typeof Package> = {
  new_pack: Package,
  returned_pack: RotateCcw,
  announcement: Megaphone,
  custom: Info,
};

const notificationColors: Record<string, string> = {
  new_pack: "text-velvet",
  returned_pack: "text-emerald-400",
  announcement: "text-amber-400",
  custom: "text-purple-400",
};

const notificationBg: Record<string, string> = {
  new_pack: "bg-velvet/10",
  returned_pack: "bg-emerald-500/10",
  announcement: "bg-amber-500/10",
  custom: "bg-purple-500/10",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get the link href for a notification — pack link, custom link_url, or null
function getNotificationHref(notification: NotificationWithReadStatus): string | null {
  if (notification.pack_id) return `/packs/${notification.pack_id}`;
  if (notification.link_url) return notification.link_url;
  return null;
}

export function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllRead,
  onClearAll,
  onClose,
}: NotificationPanelProps) {
  const unread = notifications.filter((n) => !n.is_read);
  const read = notifications.filter((n) => n.is_read);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-full sm:mt-2 w-auto sm:w-[380px] bg-charcoal rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-semibold text-sm">Notifications</h3>
        <div className="flex items-center gap-3">
          {unread.length > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[420px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-text-muted opacity-40" />
            </div>
            <p className="text-sm text-text-muted">No notifications yet</p>
            <p className="text-xs text-text-muted/60 mt-1">
              We&apos;ll notify you when new packs drop
            </p>
          </div>
        ) : (
          <>
            {unread.length > 0 && (
              <div>
                <div className="px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  New
                </div>
                {unread.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}

            {read.length > 0 && (
              <div>
                {unread.length > 0 && (
                  <div className="px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    Earlier
                  </div>
                )}
                {read.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: {
  notification: NotificationWithReadStatus;
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}) {
  const Icon = notificationIcons[notification.type] || Info;
  const iconColor = notificationColors[notification.type] || "text-text-muted";
  const iconBg = notificationBg[notification.type] || "bg-white/5";
  const href = getNotificationHref(notification);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (href) {
      onClose();
    }
  };

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer",
        !notification.is_read && "bg-white/[0.02]"
      )}
      onClick={handleClick}
    >
      {/* Icon / Thumbnail */}
      {notification.pack?.cover_image_url ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
          <Image
            src={notification.pack.cover_image_url}
            alt={notification.pack.name || ""}
            width={40}
            height={40}
            className="object-cover w-full h-full"
          />
        </div>
      ) : (
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            iconBg
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-tight",
            notification.is_read ? "text-text-muted" : "text-white font-medium"
          )}
        >
          {notification.title}
        </p>
        <p
          className={cn(
            "text-xs mt-0.5 line-clamp-2",
            notification.is_read ? "text-text-muted/60" : "text-text-muted"
          )}
        >
          {notification.message}
        </p>
        <p className="text-[10px] text-text-muted/50 mt-1">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-velvet flex-shrink-0 mt-2" />
      )}
    </div>
  );

  if (href) {
    // External links (http) open in new tab, internal links use Next Link
    if (href.startsWith("http")) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} prefetch={false}>
        {content}
      </Link>
    );
  }

  return content;
}
