export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { AccountSettings } from "./AccountSettings";
import type { Profile, Subscription, PatreonLink } from "@/types/database";

export const metadata = {
  title: "Account | Soul Sample Club",
};

interface UserData {
  profile: Profile;
  subscription: Subscription | null;
  patreonLink: PatreonLink | null;
}

async function getUserData(): Promise<UserData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileResult, subscriptionResult, patreonResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("patreon_links")
      .select("*")
      .eq("user_id", user.id)
      .single(),
  ]);

  const profile = profileResult.data as Profile | null;
  const subscription = subscriptionResult.data as Subscription | null;
  const patreonLink = patreonResult.data as PatreonLink | null;

  if (!profile) return null;

  return {
    profile,
    subscription,
    patreonLink,
  };
}

export default async function AccountPage() {
  const data = await getUserData();

  if (!data?.profile) {
    return null;
  }

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Account Settings</h1>
        <AccountSettings
          profile={data.profile}
          subscription={data.subscription}
          patreonLink={data.patreonLink}
        />
      </div>
    </div>
  );
}
