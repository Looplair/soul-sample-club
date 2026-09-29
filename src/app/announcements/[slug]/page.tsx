import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { AnnouncementArticle } from "@/components/announcements/AnnouncementViews";
import { getNotificationsForUser } from "@/lib/notifications";
import type { Announcement, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const adminSupabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("slug")
    .eq("is_published", true);
  return (data ?? []).map((a: { slug: string }) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const adminSupabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (adminSupabase as any)
    .from("announcements")
    .select("title, body")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .single();

  if (!data) return { title: "Announcement | Soul Sample Club" };
  return {
    title: `${data.title} | Soul Sample Club`,
    description: data.body.slice(0, 160),
  };
}

export default async function AnnouncementDetailPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check access
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

  // Fetch announcement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminSupabase as any)
    .from("announcements")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .single();

  if (error || !data) notFound();
  const announcement = data as Announcement;

  // Profile + notifications
  const profileResult = await adminSupabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileResult.data as Profile | null;
  const { notifications, unreadCount } = await getNotificationsForUser(user.id);

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />
      <AnnouncementArticle announcement={announcement} />
      <SiteFooter cta={false} />
    </div>
  );
}
