import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { VaultButton } from "@/components/vault/VaultButton";
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
    .in("status", ["active", "trialing", "past_due"])
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
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image src="/logo.svg" alt="Soul Sample Club" width={160} height={36} className="h-8 sm:h-9 w-auto" priority />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/feed" className="hidden sm:block">
              <button className="btn-secondary text-sm px-4 py-2">Catalog</button>
            </Link>
            <VaultButton />
            <NotificationBell userId={user.id} initialNotifications={notifications} initialUnreadCount={unreadCount} />
            {profile && (
              <UserDropdown
                email={profile.email}
                displayName={profile.username || profile.full_name || profile.email?.split("@")[0] || "User"}
                isAdmin={profile.is_admin}
              />
            )}
          </div>
        </div>
      </header>

      <main className="section pb-32 sm:pb-0">
        <div className="container-app">
          <Link href="/feed" className="inline-flex items-center gap-2 text-body text-text-muted hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </Link>

          <div className="mb-10">
            <h1 className="text-h1 text-white mb-2">Announcements</h1>
            <p className="text-body text-text-muted">Members-only updates, drops, and news.</p>
          </div>

          {announcements.length === 0 ? (
            <div className="py-24 text-center">
              <Megaphone className="w-12 h-12 text-text-subtle mx-auto mb-4" />
              <p className="text-h4 text-text-muted">Nothing yet</p>
              <p className="text-body text-text-subtle mt-2">Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((a) => (
                <Link key={a.id} href={`/announcements/${a.slug}`} className="group block">
                  <article className="bg-grey-800/50 border border-grey-700 rounded-card overflow-hidden hover:border-grey-600 hover:bg-grey-800 transition-all duration-200">
                    {a.cover_image_url ? (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={a.cover_image_url}
                          alt={a.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-velvet/20 to-grey-700 flex items-center justify-center">
                        <Megaphone className="w-10 h-10 text-velvet/40" />
                      </div>
                    )}
                    <div className="p-5">
                      <p className="text-label text-text-muted mb-2">
                        {formatDate(a.published_at ?? a.created_at)}
                      </p>
                      <h2 className="text-h4 text-white mb-2 group-hover:text-text-secondary transition-colors line-clamp-2">
                        {a.title}
                      </h2>
                      <p className="text-body-sm text-text-muted line-clamp-3">
                        {a.body.slice(0, 120)}{a.body.length > 120 ? "…" : ""}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
