import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserDropdown } from "@/components/layout/UserDropdown";
import { VaultButton } from "@/components/vault/VaultButton";
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
    <div className="min-h-screen bg-charcoal">
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

      <main className="pb-32 sm:pb-0">
        {announcement.cover_image_url && (
          <div className="relative w-full aspect-[21/9] max-h-[420px] overflow-hidden">
            <Image
              src={announcement.cover_image_url}
              alt={announcement.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-charcoal" />
          </div>
        )}

        <div className="container-app section">
          <Link href="/announcements" className="inline-flex items-center gap-2 text-body text-text-muted hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            All Announcements
          </Link>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Megaphone className="w-4 h-4 text-velvet" />
              <span className="text-label text-text-muted">
                {formatDate(announcement.published_at ?? announcement.created_at)}
              </span>
            </div>
            <h1 className="text-h1 text-white mb-8">{announcement.title}</h1>
            <div className="announcement-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="text-body-lg text-text-secondary leading-relaxed mb-5">{children}</p>,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-velvet hover:text-velvet/80 underline underline-offset-2 transition-colors">{children}</a>,
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="text-text-secondary italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-outside pl-6 space-y-2 mb-5 text-body-lg text-text-secondary">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-outside pl-6 space-y-2 mb-5 text-body-lg text-text-secondary">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  h2: ({ children }) => <h2 className="text-h3 text-white mt-8 mb-4">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-h4 text-white mt-6 mb-3">{children}</h3>,
                  blockquote: ({ children }) => <blockquote className="border-l-4 border-velvet pl-5 my-5 text-text-muted italic">{children}</blockquote>,
                  hr: () => <hr className="border-grey-700 my-8" />,
                  code: ({ children }) => <code className="bg-grey-800 text-snow px-2 py-0.5 rounded text-sm font-mono">{children}</code>,
                }}
              >
                {announcement.body}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
