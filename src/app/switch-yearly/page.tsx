export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout";
import { SiteFooter } from "@/components/ssc/SiteFooter";
import { PageHead } from "@/components/member/MemberUI";
import { getNotificationsForUser } from "@/lib/notifications";
import { getSwitchState } from "@/lib/switch-yearly";
import { SwitchYearlyBody } from "./SwitchYearlyBody";
import type { Profile } from "@/types/database";

// Unlisted: only reached from a link sent to members who ask
export const metadata = {
  title: "Switch to yearly | Soul Sample Club",
  robots: { index: false, follow: false },
};

export default async function SwitchYearlyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/switch-yearly");

  const [profileResult, { notifications, unreadCount }, state] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getNotificationsForUser(user.id),
    getSwitchState(user.id).catch((error) => {
      console.error("switch-yearly page:", error);
      return { kind: "needs-help" } as const;
    }),
  ]);

  return (
    <div className="ssc flex min-h-screen flex-col overflow-x-clip">
      <Navbar user={profileResult.data as Profile | null} notifications={notifications} unreadCount={unreadCount} />
      <main className="flex-1 px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
        <div className="mx-auto max-w-[1240px]">
          <PageHead pill="Membership" title="Switch to yearly" body="Same membership, paid once a year. Your library and everything you've downloaded stay exactly as they are." />
          <div className="mt-8 max-w-xl">
            <SwitchYearlyBody state={state} />
          </div>
        </div>
      </main>
      <SiteFooter cta={false} />
    </div>
  );
}
