import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { FreePackOffer } from "@/components/free-pack/FreePackOffer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FREE_PACK_OFFER_COUPON, OFFER_MINUTES, claimFreePack, getFreePack, startOffer, userHasAccess } from "@/lib/free-pack";

// Where the free pack's Download button lands: the download starts from here,
// and the one-time welcome offer runs for 30 minutes from the first visit.

export const dynamic = "force-dynamic";
export const metadata = { title: "Your download | Soul Sample Club", robots: { index: false, follow: false } };

const display = Unbounded({ subsets: ["latin"], weight: ["700"], display: "swap" });

export default async function FreePackOfferPage() {
  const pack = await getFreePack();
  if (!pack || !FREE_PACK_OFFER_COUPON) redirect("/free");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/free");
  if (await userHasAccess(user.id)) redirect("/free");

  await claimFreePack(user.id, user.email, pack);
  const deadline = await startOffer(user.id, pack.id);

  // Recent releases, never bonus packs or the free pack itself
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: covers } = await (createAdminClient() as any)
    .from("packs")
    .select("id, name, cover_image_url")
    .eq("is_published", true)
    .eq("is_bonus", false)
    .neq("id", pack.id)
    .not("cover_image_url", "is", null)
    .order("release_date", { ascending: false })
    .limit(6);

  return (
    <FreePackOffer
      packName={pack.name}
      deadline={deadline?.toISOString() ?? null}
      serverNow={Date.now()}
      windowMinutes={OFFER_MINUTES}
      covers={((covers ?? []) as { id: string; name: string; cover_image_url: string }[])}
      displayFont={display.className}
    />
  );
}
