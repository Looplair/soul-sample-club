import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { getNotificationsForUser } from "@/lib/notifications";
import { hasPublishedGuides } from "@/lib/guides";
import type { Profile } from "@/types/database";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, { notifications, unreadCount }, hasGuides] = await Promise.all([
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).single().then((r) => r.data as Profile | null)
      : Promise.resolve(null),
    user ? getNotificationsForUser(user.id) : Promise.resolve({ notifications: [], unreadCount: 0 }),
    hasPublishedGuides(),
  ]);

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />
      {children}
      <SiteFooter showGuides={hasGuides} cta={false} />
    </div>
  );
}
