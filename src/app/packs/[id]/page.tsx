// Cache pack data for 60 seconds - packs don't change often
// User-specific data (subscription status) is still fetched fresh
export const revalidate = 60;

import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, isPackNew, isPackExpiredWithEndDate, getDaysUntilEndDate, getExpiryBadgeText } from "@/lib/utils";
import { SampleListWithModal } from "@/components/audio/SampleListWithModal";
import { cn } from "@/lib/utils";
import { SubscribeCTA } from "@/components/ui/SubscribeCTA";
import { ShareButtonsInline } from "@/components/social/ShareButtons";
import { VoteBringBack } from "@/components/packs/VoteBringBack";
import { DownloadAllButton } from "@/components/packs/DownloadAllButton";
import { Navbar } from "@/components/layout";
import { getNotificationsForUser } from "@/lib/notifications";
import { SITE_URL } from "@/lib/site";
import { isPackUuid, packPath } from "@/lib/pack-url";
import type { Pack, Sample, NotificationWithReadStatus, Profile } from "@/types/database";
import { hidePaths } from "@/lib/hide-paths";
import { getCoverColor, withCoverColors } from "@/lib/cover-color";
import { GlassBox, Pill } from "@/components/ssc/Glass";
import { PackCard, type CardPack } from "@/components/ssc/PackCard";
import { Rail } from "@/components/ssc/Rail";
import { SiteFooter } from "@/components/ssc/SiteFooter";

// -----------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------
interface PackWithSamples extends Pack {
  samples: Sample[];
}

// Pack blurbs are one-liners ("Theme music to a getaway."), so add what's
// actually in the pack for search results and share previews
function getPackSearchDescription(pack: PackWithSamples): string {
  const blurb = (pack.description || "").trim();
  const sentence = blurb && !/[.!?]$/.test(blurb) ? `${blurb}.` : blurb;
  const count = pack.samples.length;
  const stems = pack.samples.some((s) => !!s.stems_path) ? " with full stems" : "";
  const what = `${count} pre-cleared soul sample${count === 1 ? "" : "s"}${stems}, exclusive to Soul Sample Club.`;
  return sentence ? `${sentence} ${what}` : what;
}

// Structured data so search engines know this page is a music release by Looplair
function getPackJsonLd(pack: PackWithSamples, packUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicAlbum",
        name: pack.name,
        description: getPackSearchDescription(pack),
        url: packUrl,
        ...(pack.cover_image_url && { image: pack.cover_image_url }),
        datePublished: pack.release_date,
        numTracks: pack.samples.length,
        byArtist: { "@type": "MusicGroup", name: "Looplair" },
        publisher: { "@type": "Organization", name: "Soul Sample Club", url: SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Soul Sample Club", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Catalog", item: `${SITE_URL}/feed` },
          { "@type": "ListItem", position: 3, name: pack.name, item: packUrl },
        ],
      },
    ],
  };
}

// -----------------------------------------
// FETCH PACK (Public - uses admin client)
// Wrapped with React cache() to deduplicate requests within the same render
// -----------------------------------------
const getPack = cache(async (idOrSlug: string): Promise<PackWithSamples | null> => {
  const adminSupabase = createAdminClient();

  // Old links use the pack id; current links use the slug
  const result = await adminSupabase
    .from("packs")
    .select(
      `
      *,
      samples(*)
    `
    )
    .eq(isPackUuid(idOrSlug) ? "id" : "slug", idOrSlug)
    .eq("is_published", true)
    .single();

  const pack = hidePaths(result.data as PackWithSamples | null);

  if (result.error || !pack) return null;

  // Sort samples by order_index
  if (Array.isArray(pack.samples)) {
    pack.samples = pack.samples.sort(
      (a: Sample, b: Sample) => a.order_index - b.order_index
    );
  } else {
    pack.samples = [];
  }

  return pack;
});

// -----------------------------------------
// STATIC PARAMS - Pre-render all pack pages at build time
// -----------------------------------------
export async function generateStaticParams() {
  const adminSupabase = createAdminClient();
  const { data: packs } = await adminSupabase
    .from("packs")
    .select("id, slug")
    .eq("is_published", true);

  return ((packs as { id: string; slug: string | null }[]) || []).map((pack) => ({
    id: pack.slug || pack.id,
  }));
}

// -----------------------------------------
// METADATA - Uses cached getPack to avoid duplicate fetch
// -----------------------------------------
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const siteUrl = SITE_URL;
  const pack = await getPack(params.id);

  if (!pack) {
    return {
      title: "Release Not Found | Soul Sample Club",
      description: "This release does not exist.",
    };
  }

  const packUrl = `${siteUrl}${packPath(pack)}`;
  const ogImage = pack.cover_image_url || `${siteUrl}/og-image.png`;
  const description = getPackSearchDescription(pack);

  return {
    title: `${pack.name}: Soul Sample Pack | Soul Sample Club`,
    description,
    alternates: { canonical: packUrl },
    openGraph: {
      title: `${pack.name} | Soul Sample Club`,
      description,
      url: packUrl,
      siteName: "Soul Sample Club",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: pack.name,
        },
      ],
      type: "music.album",
    },
    twitter: {
      card: "summary_large_image",
      title: `${pack.name} | Soul Sample Club`,
      description,
      images: [ogImage],
    },
  };
}

// -----------------------------------------
// FETCH ACCESS (subscription OR patreon)
// -----------------------------------------
// Uses admin client to bypass RLS for subscription checks
async function getUserAccess(): Promise<{ hasAccess: boolean; isLoggedIn: boolean; userId: string | null; hasUsedTrial: boolean; profile: Profile | null }> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { hasAccess: false, isLoggedIn: false, userId: null, hasUsedTrial: false, profile: null };

  // Fetch user profile
  const profileResult = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileResult.data as Profile | null;

  // Check subscription using admin client to bypass RLS
  // Filter by current_period_end in the future to catch stale rows
  const now = new Date().toISOString();
  const subResult = await adminSupabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .gte("current_period_end", now)
    .limit(1);

  const hasSubscription = (subResult.data?.length ?? 0) > 0;

  // Check Patreon using admin client to bypass RLS
  const patreonResult = await adminSupabase
    .from("patreon_links")
    .select("is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const hasPatreon = !!patreonResult.data;

  // Check if user has ever had any subscription
  const anySubResult = await adminSupabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  return {
    hasAccess: hasSubscription || hasPatreon,
    isLoggedIn: true,
    userId: user.id,
    hasUsedTrial: (anySubResult.data?.length ?? 0) > 0,
    profile,
  };
}

// -----------------------------------------
// FETCH VOTE DATA
// -----------------------------------------
async function getVoteData(packId: string): Promise<{ hasVoted: boolean; voteCount: number }> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get total vote count
  const countResult = await adminSupabase
    .from("pack_votes")
    .select("id", { count: "exact" })
    .eq("pack_id", packId);

  const voteCount = countResult.count ?? 0;

  // Check if current user has voted
  let hasVoted = false;
  if (user) {
    const voteResult = await adminSupabase
      .from("pack_votes")
      .select("id")
      .eq("pack_id", packId)
      .eq("user_id", user.id)
      .limit(1);

    hasVoted = (voteResult.data?.length ?? 0) > 0;
  }

  return { hasVoted, voteCount };
}

// -----------------------------------------
// PAGE COMPONENT
// -----------------------------------------
// Other packs still in the catalog, newest first, for the rail under the tracks
async function getMorePacks(excludeId: string): Promise<CardPack[]> {
  const { data } = await createAdminClient()
    .from("packs")
    .select("id, slug, name, cover_image_url, release_date, end_date, is_returned, is_bonus, samples(id)")
    .eq("is_published", true)
    .eq("is_bonus", false)
    .neq("id", excludeId)
    .order("release_date", { ascending: false })
    .limit(24);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data as any[]) ?? []).filter((p) =>
    p.is_returned ? !p.end_date || new Date() <= new Date(p.end_date) : !isPackExpiredWithEndDate(p.release_date, p.end_date)
  );
  const lit = await withCoverColors(rows.slice(0, 10));
  return lit.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    cover_image_url: p.cover_image_url,
    release_date: p.release_date,
    end_date: p.end_date,
    is_returned: p.is_returned,
    glow: p.glow,
    sampleCount: p.samples?.length ?? 0,
  }));
}

export default async function PackDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const [pack, userState] = await Promise.all([
    getPack(id),
    getUserAccess(),
  ]);

  if (!pack) {
    notFound();
  }

  // Old /packs/<uuid> links move permanently to /packs/<slug>
  if (isPackUuid(id) && pack.slug) {
    permanentRedirect(packPath(pack));
  }

  const { hasAccess, isLoggedIn, userId, hasUsedTrial, profile } = userState;

  // Fetch notifications for logged-in users
  const { notifications, unreadCount } = userId
    ? await getNotificationsForUser(userId)
    : { notifications: [] as NotificationWithReadStatus[], unreadCount: 0 };

  // Pack status checks
  const isNew = isPackNew(pack.release_date);
  const isBonus = pack.is_bonus ?? false;
  const isReturned = pack.is_returned ?? false;
  const endDate = pack.end_date ?? null;
  // Returned packs expire if they have an explicit end_date set, otherwise they stay open
  const isExpired = isReturned
    ? (endDate ? isPackExpiredWithEndDate(pack.release_date, endDate) : false)
    : isPackExpiredWithEndDate(pack.release_date, endDate);

  // Calculate expiry countdown for non-expired packs
  const daysRemaining = !isExpired ? getDaysUntilEndDate(pack.release_date, endDate, isBonus ? 1 : 3) : 0;
  const expiryBadgeText = !isExpired ? getExpiryBadgeText(daysRemaining) : null;

  // Fetch vote data for expired packs
  const voteData = isExpired ? await getVoteData(pack.id) : { hasVoted: false, voteCount: 0 };

  // Expired packs: everyone can preview, no one can download
  // Active packs: subscribers/patrons can download, others can preview
  const canDownload = hasAccess && !isExpired;

  // Calculate total file size (WAV files only - stems sizes not tracked)
  const totalSize = pack.samples.reduce(
    (acc: number, sample: Sample) => acc + (sample.file_size || 0),
    0
  );
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
  const hasStemsAvailable = pack.samples.some((s: Sample) => !!s.stems_path);

  const glow = await getCoverColor(pack.cover_image_url);
  const more = await getMorePacks(pack.id);
  const bpms = pack.samples.map((s: Sample) => s.bpm).filter((b): b is number => !!b);
  const keys = Array.from(new Set(pack.samples.map((s: Sample) => s.key).filter((k): k is string => !!k)));
  const status = isExpired
    ? "Archived"
    : isBonus
      ? "Member bonus"
      : isReturned
        ? "Back by popular demand"
        : isNew
          ? "New this week"
          : "In the catalog";

  return (
    <div className="ssc min-h-screen overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getPackJsonLd(pack, `${SITE_URL}${packPath(pack)}`)),
        }}
      />
      <Navbar user={profile} notifications={notifications} unreadCount={unreadCount} />

      <main className="px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
        <div className="mx-auto max-w-[1240px]">
          <Link href="/feed" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Catalog
          </Link>

          {/* Header: the cover lights the page */}
          <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
            <GlassBox glow={glow} className="self-start rounded-[28px] p-3">
              <div className="relative aspect-square overflow-hidden rounded-[20px] bg-white/[0.04]">
                {pack.cover_image_url && (
                  <Image
                    src={pack.cover_image_url}
                    alt={pack.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 92vw, 520px"
                    className={cn("object-cover", isExpired && "brightness-[0.55] saturate-[0.6]")}
                  />
                )}
                {expiryBadgeText && (
                  <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                    {expiryBadgeText}
                  </span>
                )}
              </div>
            </GlassBox>

            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Pill dot={!isExpired} glow={glow}>
                  {status}
                </Pill>
                <span className="text-[12px] text-white/55">Released {formatDate(pack.release_date)}</span>
              </div>
              <h1 className="ssc-display mt-5 break-words text-[clamp(2.6rem,6.4vw,5.4rem)]">{pack.name}</h1>
              {pack.description && <p className="ssc-body mt-4 max-w-2xl text-[clamp(1.05rem,1.4vw,1.2rem)] leading-relaxed">{pack.description}</p>}

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  `${pack.samples.length} composition${pack.samples.length === 1 ? "" : "s"}`,
                  hasStemsAvailable ? "Full stems" : null,
                  bpms.length ? (Math.min(...bpms) === Math.max(...bpms) ? `${bpms[0]} BPM` : `${Math.min(...bpms)}–${Math.max(...bpms)} BPM`) : null,
                  keys.length ? `${keys.length} key${keys.length === 1 ? "" : "s"}` : null,
                  totalSize ? `${totalSizeMB} MB WAV` : null,
                ]
                  .filter(Boolean)
                  .map((chip) => (
                    <span key={chip} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/75">
                      {chip}
                    </span>
                  ))}
              </div>

              {/* One clear next step for each kind of visitor */}
              <div className="mt-8">
                {isExpired ? (
                  <GlassBox plain className="rounded-[22px] p-5 sm:p-6">
                    <p className="text-[15px] font-semibold text-white">This pack is archived</p>
                    <p className="ssc-body mt-1 text-[14px]">Every track still plays below. Vote and it could come back for members to download.</p>
                    <div className="mt-4">
                      <VoteBringBack packId={pack.id} initialHasVoted={voteData.hasVoted} initialVoteCount={voteData.voteCount} isLoggedIn={isLoggedIn} />
                    </div>
                  </GlassBox>
                ) : canDownload ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {pack.pack_zip_path && <DownloadAllButton packId={pack.id} />}
                    <span className="text-[14px] text-white/55">
                      {isReturned || isBonus ? `${expiryBadgeText ?? "Here for a limited time"}. ` : ""}Or grab tracks one at a time below.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <SubscribeCTA isLoggedIn={isLoggedIn} hasSubscription={false} plan="monthly" bare className="ssc-btn ssc-btn--primary">
                        {isLoggedIn && hasUsedTrial ? "Subscribe to download" : "Start for $0.99"}
                      </SubscribeCTA>
                      <a href="#tracks" className="ssc-btn ssc-btn--ghost">
                        Preview the tracks
                      </a>
                    </div>
                    <p className="text-[13px] text-white/55">
                      {isLoggedIn && hasUsedTrial ? "$6.99 a month" : "Then $6.99 a month"}, cancel anytime. Or{" "}
                      <SubscribeCTA isLoggedIn={isLoggedIn} hasSubscription={false} plan="yearly" bare className="font-medium text-white underline underline-offset-4">
                        $35 a year
                      </SubscribeCTA>
                      , offer price.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <ShareButtonsInline url={`${SITE_URL}${packPath(pack)}`} title={`${pack.name} - Soul Sample Club`} description={pack.description} />
              </div>
            </div>
          </section>

          {/* Tracks */}
          <section id="tracks" className="mt-14 scroll-mt-24">
            <div className="mb-5 flex items-baseline gap-3">
              <h2 className="ssc-display text-[clamp(1.4rem,2.6vw,2rem)]">Tracks</h2>
              <span className="text-[13px] text-white/55">{isExpired ? "Preview only" : `${pack.samples.length} with previews`}</span>
            </div>
            <GlassBox plain className="rounded-[24px] p-2 sm:p-4">
              <SampleListWithModal samples={pack.samples} packId={pack.id} canDownload={canDownload} hasUsedTrial={hasUsedTrial} isLoggedIn={isLoggedIn} />
            </GlassBox>
          </section>

          {/* More */}
          {more.length > 0 && (
            <section className="mt-16">
              <Rail
                title={<h2 className="ssc-display text-[clamp(1.4rem,2.6vw,2rem)]">More from the catalog</h2>}
                tabs={[{ label: "More", items: more.map((m) => <PackCard key={m.id} pack={m} />) }]}
              />
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
