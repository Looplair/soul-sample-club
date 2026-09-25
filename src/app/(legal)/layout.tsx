import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout";
import { getNotificationsForUser } from "@/lib/notifications";
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

  const [profile, { notifications, unreadCount }] = user
    ? await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single().then((r) => r.data as Profile | null),
        getNotificationsForUser(user.id),
      ])
    : [null, { notifications: [], unreadCount: 0 }];

  return (
    <>
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />
      {children}
    </>
  );
}
