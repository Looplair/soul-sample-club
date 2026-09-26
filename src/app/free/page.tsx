import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { FreePackExperience } from "@/components/free-pack/FreePackExperience";
import { createClient } from "@/lib/supabase/server";
import { FREE_PACK_OFFER_COUPON, getFreePack, getOfferDeadline, userHasAccess } from "@/lib/free-pack";
import { SITE_URL } from "@/lib/site";
import { hidePaths } from "@/lib/hide-paths";

// Free pack funnel for cold traffic (Meta ads) and "free soul samples" searches.
// Linked from the footer, genre pages and guides (never the main menus). The pack is chosen in Admin → Settings.

export const dynamic = "force-dynamic";

const display = Unbounded({ subsets: ["latin"], weight: ["700"], display: "swap" });

export async function generateMetadata() {
  const pack = await getFreePack();
  if (!pack) return { title: "Free Soul Sample Pack | Soul Sample Club", robots: { index: false } };
  const title = `Free Soul Sample Pack: ${pack.name} | Soul Sample Club`;
  const description = `Download ${pack.name} free: ${pack.tracks.length} pre-cleared soul compositions with stems. Create a free account, no card needed.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/free` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/free`,
      siteName: "Soul Sample Club",
      images: pack.cover_image_url ? [{ url: pack.cover_image_url, alt: pack.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function FreePackPage() {
  const pack = await getFreePack();
  if (!pack) redirect("/subscribe");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasAccess = user ? await userHasAccess(user.id) : false;

  // Download goes via the one-time offer page unless it's already been and gone
  const deadline = user && !hasAccess && FREE_PACK_OFFER_COUPON ? await getOfferDeadline(user.id) : null;
  const viaOffer = !!user && !hasAccess && !!FREE_PACK_OFFER_COUPON && (!deadline || deadline.getTime() > Date.now());

  return (
    <FreePackExperience
      pack={hidePaths(pack)}
      isLoggedIn={!!user}
      hasAccess={hasAccess}
      downloadHref={viaOffer ? "/free/offer?dl=1" : "/api/free-pack/download"}
      displayFont={display.className}
    />
  );
}
