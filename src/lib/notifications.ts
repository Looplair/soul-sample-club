import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationWithReadStatus } from "@/types/database";

export async function getNotificationsForUser(
  userId: string
): Promise<{ notifications: NotificationWithReadStatus[]; unreadCount: number }> {
  const adminSupabase = createAdminClient();
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notificationsRaw } = await (adminSupabase.from("notifications") as any)
    .select("*, pack:packs(id, name, cover_image_url)")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reads } = await (adminSupabase.from("notification_reads") as any)
    .select("notification_id")
    .eq("user_id", userId);

  const readIds = new Set(
    (reads || []).map((r: { notification_id: string }) => r.notification_id)
  );

  const notifications: NotificationWithReadStatus[] = (notificationsRaw || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n: any) => ({
      ...n,
      is_read: readIds.has(n.id),
    })
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount };
}
