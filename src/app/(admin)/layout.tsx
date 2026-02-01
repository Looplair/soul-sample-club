import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar, AdminSidebar } from "@/components/layout";
import { getNotificationsForUser } from "@/lib/notifications";
import type { Profile } from "@/types/database";

export default async function AdminLayout({
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

  if (!profile?.is_admin) {
    redirect("/feed");
  }

  const { notifications, unreadCount } = await getNotificationsForUser(user.id);

  return (
    <div className="min-h-screen bg-charcoal">
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 lg:ml-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
