import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { getNotificationsForUser } from "@/lib/notifications";
import type { Profile } from "@/types/database";

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

  const { notifications, unreadCount } = await getNotificationsForUser(user.id);

  return (
    <div className="ssc flex min-h-screen flex-col overflow-x-clip">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />
      {/* Bottom padding clears the now-playing bar */}
      <main className="flex-1 px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
        <div className="mx-auto max-w-[1240px]">{children}</div>
      </main>
      <SiteFooter cta={false} />
    </div>
  );
}
