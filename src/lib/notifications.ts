import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationWithReadStatus } from "@/types/database";

export async function getNotificationsForUser(
  userId: string
): Promise<{ notifications: NotificationWithReadStatus[]; unreadCount: number }> {
  const adminSupabase = createAdminClient();
  const now = new Date().toISOString();

  // Scheduled ones stay hidden until their show_at time
  const query = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminSupabase.from("notifications") as any)
      .select("*, pack:packs(id, name, cover_image_url)")
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false });
  let { data: notificationsRaw, error } = await query().or(`show_at.is.null,show_at.lte.${now}`).limit(40);
  // Before the schedule column exists: everything, as before
  if (error) ({ data: notificationsRaw } = await query().limit(20));
  // Newest first by when each one went out (a scheduled one went out at show_at)
  const shownAt = (n: { show_at?: string | null; created_at: string }) => new Date(n.show_at ?? n.created_at).getTime();
  notificationsRaw = (notificationsRaw || []).sort((a: { show_at?: string | null; created_at: string }, b: { show_at?: string | null; created_at: string }) => shownAt(b) - shownAt(a)).slice(0, 20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reads } = await (adminSupabase.from("notification_reads") as any)
    .select("notification_id, dismissed")
    .eq("user_id", userId);

  const readIds = new Set(
    (reads || []).map((r: { notification_id: string }) => r.notification_id)
  );
  const dismissedIds = new Set(
    (reads || [])
      .filter((r: { dismissed: boolean }) => r.dismissed)
      .map((r: { notification_id: string }) => r.notification_id)
  );

  const notifications: NotificationWithReadStatus[] = (notificationsRaw || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((n: any) => !dismissedIds.has(n.id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((n: any) => ({
      ...n,
      is_read: readIds.has(n.id),
    }));

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount };
}
