import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { AnnouncementList } from "@/components/announcements/AnnouncementViews";
import { getNotificationsForUser } from "@/lib/notifications";
import type { Announcement, Profile } from "@/types/database";

export const metadata = {
  title: "Announcements | Soul Sample Club",
  description: "Members-only announcements and updates.",
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check access (subscription or Patreon)
  const now = new Date().toISOString();
  const subResult = await adminSupabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .gte("current_period_end", now)
    .limit(1);

  const patreonResult = await adminSupabase
    .from("patreon_links")
    .select("is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const hasAccess = (subResult.data?.length ?? 0) > 0 || !!patreonResult.data;
  if (!hasAccess) redirect("/login");

  // Fetch profile and notifications
  const profileResult = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileResult.data as Profile | null;

  const { notifications, unreadCount } = await getNotificationsForUser(user.id);

  // Fetch published announcements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const announcements = (data ?? []) as Announcement[];

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />
      <AnnouncementList announcements={announcements} />
      <SiteFooter cta={false} />
    </div>
  );
}
