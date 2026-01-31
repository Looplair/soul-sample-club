export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExplorePlayer } from "@/components/explore/ExplorePlayer";
import type { Sample, Pack } from "@/types/database";

export const metadata = {
  title: "Explore | Soul Sample Club",
  description: "Discover samples by swiping through our catalog",
};

interface SampleWithPack extends Sample {
  pack: Pack;
}

// Fetch all samples with their packs and shuffle them
async function getRandomSamples(): Promise<SampleWithPack[]> {
  const adminSupabase = createAdminClient();

  const result = await adminSupabase
    .from("samples")
    .select(`*, pack:packs(*)`)
    .not("pack", "is", null);

  if (result.error || !result.data) {
    console.error("Error fetching samples:", result.error);
    return [];
  }

  // Filter to only published packs and shuffle
  const samples = (result.data as SampleWithPack[]).filter(
    (s) => s.pack && s.pack.is_published
  );

  // Fisher-Yates shuffle
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }

  return samples;
}

// Get user's votes
async function getUserVotes(): Promise<Set<string>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return new Set();

    const result = await supabase
      .from("pack_votes")
      .select("pack_id")
      .eq("user_id", user.id);

    if (result.error || !result.data) return new Set();

    return new Set((result.data as { pack_id: string }[]).map((v) => v.pack_id));
  } catch {
    return new Set();
  }
}

// Check user state and subscription
async function getUserState(): Promise<{
  isLoggedIn: boolean;
  userId: string | null;
  hasSubscription: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isLoggedIn: false, userId: null, hasSubscription: false };
    }

    // Check for active subscription (Stripe or Patreon)
    const [subscriptionResult, patreonResult] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .single(),
      supabase
        .from("patreon_links")
        .select("is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single(),
    ]);

    const hasStripe = !!subscriptionResult.data;
    const hasPatreon = !!patreonResult.data;

    return {
      isLoggedIn: true,
      userId: user.id,
      hasSubscription: hasStripe || hasPatreon,
    };
  } catch {
    return { isLoggedIn: false, userId: null, hasSubscription: false };
  }
}

export default async function ExplorePage() {
  const [samples, userVotes, userState] = await Promise.all([
    getRandomSamples(),
    getUserVotes(),
    getUserState(),
  ]);

  return (
    <ExplorePlayer
      samples={samples}
      initialVotes={Array.from(userVotes)}
      isLoggedIn={userState.isLoggedIn}
      userId={userState.userId}
      hasSubscription={userState.hasSubscription}
    />
  );
}
