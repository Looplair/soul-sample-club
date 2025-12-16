import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Music2, Download, Lock, Archive, Sparkles, Star, Play, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, isPackNew, isPackExpired } from "@/lib/utils";
import { SampleList } from "@/components/audio/SampleList";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Pack, Sample, Subscription } from "@/types/database";

// -----------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------
interface PackWithSamples extends Pack {
  samples: Sample[];
}

// -----------------------------------------
// METADATA
// -----------------------------------------
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const adminSupabase = createAdminClient();

  const result = await adminSupabase
    .from("packs")
    .select("name, description")
    .eq("id", params.id)
    .single();

  const data = result.data as { name: string; description: string } | null;

  if (result.error || !data) {
    return {
      title: "Release Not Found | Soul Sample Club",
      description: "This release does not exist.",
    };
  }

  return {
    title: `${data.name} | Soul Sample Club`,
    description: data.description,
  };
}

// -----------------------------------------
// FETCH PACK (Public - uses admin client)
// -----------------------------------------
async function getPack(id: string): Promise<PackWithSamples | null> {
  const adminSupabase = createAdminClient();

  const result = await adminSupabase
    .from("packs")
    .select(
      `
      *,
      samples(*)
    `
    )
    .eq("id", id)
    .eq("is_published", true)
    .single();

  const pack = result.data as PackWithSamples | null;

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
}

// -----------------------------------------
// FETCH SUBSCRIPTION (if logged in)
// -----------------------------------------
async function getUserSubscription(): Promise<{ subscription: Subscription | null; isLoggedIn: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { subscription: null, isLoggedIn: false };

  const result = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  return {
    subscription: result.data as Subscription | null,
    isLoggedIn: true
  };
}

// -----------------------------------------
// PAGE COMPONENT
// -----------------------------------------
export default async function PackDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const [pack, userState] = await Promise.all([
    getPack(id),
    getUserSubscription(),
  ]);

  if (!pack) {
    notFound();
  }

  const { subscription, isLoggedIn } = userState;
  const hasActiveSubscription = !!subscription;

  // Pack status checks
  const isNew = isPackNew(pack.release_date);
  const isExpired = isPackExpired(pack.release_date);
  const isStaffPick = pack.is_staff_pick ?? false;

  // Expired packs: everyone can preview, no one can download
  // Active packs: subscribers can download, others can preview
  const canDownload = hasActiveSubscription && !isExpired;

  // Calculate total file size
  const totalSize = pack.samples.reduce(
    (acc: number, sample: Sample) => acc + (sample.file_size || 0),
    0
  );
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-16 flex items-center justify-between">
          <Link href="/feed" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-button group-hover:shadow-glow-white-soft transition-shadow duration-300">
              <span className="text-charcoal font-bold text-base">S</span>
            </div>
            <span className="text-h4 text-white hidden sm:block">Soul Sample Club</span>
          </Link>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/feed">
                <Button variant="secondary" size="sm">
                  Catalog
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    <LogIn className="w-4 h-4 mr-1" />
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    Sign up free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="section">
        <div className="container-app">
          {/* Back Link */}
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-body text-text-muted hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </Link>

          {/* Pack Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 mb-8 lg:mb-12">
            {/* Cover Image */}
            <div className="relative aspect-square rounded-card overflow-hidden bg-grey-800">
              {pack.cover_image_url ? (
                <Image
                  src={pack.cover_image_url}
                  alt={pack.name}
                  fill
                  className={cn(
                    "object-cover",
                    isExpired && "blur-sm brightness-50"
                  )}
                  priority
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              ) : (
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-grey-700 to-grey-800",
                  isExpired && "opacity-50"
                )}>
                  <Music2 className="w-24 h-24 text-text-subtle" />
                </div>
              )}

              {/* Badges - Top Left */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                {isNew && !isExpired && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-success text-charcoal text-label font-semibold">
                    <Sparkles className="w-4 h-4" />
                    NEW
                  </span>
                )}
                {isStaffPick && !isExpired && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 text-charcoal text-label font-semibold">
                    <Star className="w-4 h-4" />
                    Staff Pick
                  </span>
                )}
              </div>

              {/* Expired Overlay */}
              {isExpired && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-grey-700/80 flex items-center justify-center mx-auto mb-4">
                      <Archive className="w-8 h-8 text-text-muted" />
                    </div>
                    <p className="text-h4 text-text-muted font-medium">Archived</p>
                    <p className="text-body text-text-subtle mt-1">Preview only</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pack Info */}
            <div className="lg:col-span-2">
              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {isExpired ? (
                  <Badge variant="default">
                    <Archive className="w-3 h-3 mr-1" />
                    Archived
                  </Badge>
                ) : canDownload ? (
                  <Badge variant="success">
                    <Download className="w-3 h-3 mr-1" />
                    Available
                  </Badge>
                ) : (
                  <Badge variant="warning">
                    <Lock className="w-3 h-3 mr-1" />
                    Subscribe to Download
                  </Badge>
                )}
                <span className="text-label text-text-muted">
                  {formatDate(pack.release_date)}
                </span>
              </div>

              <h1 className={cn(
                "text-h1 text-white mb-4",
                isExpired && "text-text-muted"
              )}>
                {pack.name}
              </h1>

              <p className={cn(
                "text-body-lg text-text-muted mb-6",
                isExpired && "text-text-subtle"
              )}>
                {pack.description}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 sm:gap-6 mb-6">
                <div className="flex items-center gap-2 text-body text-text-muted">
                  <Music2 className="w-5 h-5 text-white" />
                  <span>{pack.samples.length} tracks</span>
                </div>
                <div className="flex items-center gap-2 text-body text-text-muted">
                  <Download className="w-5 h-5 text-white" />
                  <span>{totalSizeMB} MB total</span>
                </div>
                <div className="flex items-center gap-2 text-body text-text-muted">
                  <Calendar className="w-5 h-5 text-white" />
                  <span>Released {formatDate(pack.release_date)}</span>
                </div>
              </div>

              {/* Status Messages */}
              {isExpired ? (
                <div className="bg-grey-800/50 border border-grey-700 rounded-card p-4 flex items-start sm:items-center gap-3">
                  <Archive className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-body text-text-secondary font-medium">
                      This release has been archived
                    </p>
                    <p className="text-body-sm text-text-muted mt-1">
                      You can still preview all tracks. Downloads are no longer available.
                    </p>
                  </div>
                </div>
              ) : !isLoggedIn ? (
                <div className="bg-white/5 border border-white/10 rounded-card p-4 flex items-start sm:items-center gap-3">
                  <Play className="w-5 h-5 text-white flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex-1">
                    <p className="text-body text-text-secondary font-medium">
                      Preview all {pack.samples.length} tracks
                    </p>
                    <p className="text-body-sm text-text-muted mt-1">
                      Sign up free to save favorites. Subscribe to download.
                    </p>
                  </div>
                  <Link href="/signup">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </div>
              ) : !canDownload ? (
                <div className="bg-warning/10 border border-warning/30 rounded-card p-4 flex items-start sm:items-center gap-3">
                  <Lock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-body text-text-secondary font-medium">
                      Subscribe to download
                    </p>
                    <p className="text-body-sm text-text-muted mt-1">
                      Preview tracks below. Subscribe to download all {pack.samples.length} tracks.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-success/10 border border-success/30 rounded-card p-4 flex items-start sm:items-center gap-3">
                  <Play className="w-5 h-5 text-success flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-body text-text-secondary font-medium">
                      Ready to download
                    </p>
                    <p className="text-body-sm text-text-muted mt-1">
                      All {pack.samples.length} tracks are available for download.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sample List */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h2 text-white">Tracks</h2>
              {isExpired && (
                <Badge variant="default" size="sm">
                  Preview Only
                </Badge>
              )}
            </div>
            <SampleList
              samples={pack.samples}
              packId={pack.id}
              canDownload={canDownload}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-grey-700 py-8 mt-16">
        <div className="container-app text-center">
          <p className="text-body-sm text-text-subtle">
            Soul Sample Club - Premium sounds for music producers
          </p>
        </div>
      </footer>
    </div>
  );
}
