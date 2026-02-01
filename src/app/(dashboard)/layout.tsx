import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar, Footer, MobileBottomNav } from "@/components/layout";
import type { Profile, NotificationWithReadStatus } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = result.data as Profile | null;

  // Fetch notifications for the bell
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
    .eq("user_id", user.id);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />
      {/* Add padding at bottom for mobile nav + now playing bar */}
      <main className="flex-1 pb-32 sm:pb-0">{children}</main>
      {/* Footer hidden on mobile to make room for bottom nav */}
      <div className="hidden sm:block">
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
}
