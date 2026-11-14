export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { AccountSettings } from "./AccountSettings";
import { PageHead } from "@/components/member/MemberUI";
import { getFlaireCreditsState } from "@/lib/flaire/membership";
import { FLAIRE_CONNECTED_KEY } from "@/lib/flaire/eligibility";
import type { Profile, Subscription, PatreonLink } from "@/types/database";

export const metadata = {
  title: "Account | Soul Sample Club",
};

interface UserData {
  profile: Profile;
  subscription: Subscription | null;
  patreonLink: PatreonLink | null;
  flaireConnected: boolean;
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
    flaireConnected: !!user.app_metadata?.[FLAIRE_CONNECTED_KEY],
  };
}

export default async function AccountPage() {
  const data = await getUserData();

  if (!data?.profile) {
    return null;
  }

  const flaireCredits = await getFlaireCreditsState(data.profile.email, data.flaireConnected);

  return (
    <div>
      <PageHead pill="Account" title="Your account" body="Your profile, membership and sign-in details." />
      <div className="mt-8">
        <AccountSettings
          profile={data.profile}
          subscription={data.subscription}
          patreonLink={data.patreonLink}
          flaireCredits={flaireCredits}
        />
      </div>
    </div>
  );
}
