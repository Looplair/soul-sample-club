import { createClient } from "@/lib/supabase/server";
import { AccountSettings } from "./AccountSettings";
import type { Profile, Subscription } from "@/types/database";

export const metadata = {
  title: "Account | Soul Sample Club",
};

interface UserData {
  profile: Profile;
  subscription: Subscription | null;
}

async function getUserData(): Promise<UserData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileResult, subscriptionResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const profile = profileResult.data as Profile | null;
  const subscription = subscriptionResult.data as Subscription | null;

  if (!profile) return null;

  return {
    profile,
    subscription,
  };
}

export default async function AccountPage() {
  const data = await getUserData();

  if (!data?.profile) {
    return null;
  }

  return (
    <div className="section">
      <div className="container-app max-w-3xl">
        <h1 className="text-h1 text-snow mb-48">Account Settings</h1>
        <AccountSettings
          profile={data.profile}
          subscription={data.subscription}
        />
      </div>
    </div>
  );
}
