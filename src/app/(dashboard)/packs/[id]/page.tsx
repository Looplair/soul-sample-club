import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Music2, Download, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, isWithinRollingWindow } from "@/lib/utils";
import { SampleList } from "@/components/audio/SampleList";
import { SubscriptionBanner } from "@/components/packs/SubscriptionBanner";
import { Badge } from "@/components/ui";
import type { Pack, Sample, Subscription } from "@/types/database";

// -----------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------
interface PackWithSamples extends Pack {
  samples: Sample[];
}

// -----------------------------------------
// FIXED METADATA FUNCTION
// -----------------------------------------
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const result = await supabase
    .from("packs")
    .select("name, description")
    .eq("id", params.id)
    .single();

  const data = result.data as { name: string; description: string } | null;

  if (result.error || !data) {
    return {
      title: "Pack Not Found | Soul Sample Club",
      description: "This pack does not exist.",
    };
  }

  return {
    title: `${data.name} | Soul Sample Club`,
    description: data.description,
  };
}

// -----------------------------------------
// FETCH PACK
// -----------------------------------------
async function getPack(id: string): Promise<PackWithSamples | null> {
  const supabase = await createClient();

  const result = await supabase
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
// FETCH SUBSCRIPTION
// -----------------------------------------
async function getUserSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const result = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  return result.data as Subscription | null;
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

  const [pack, subscription] = await Promise.all([
    getPack(id),
    getUserSubscription(),
  ]);

  if (!pack) {
    notFound();
  }

  const hasActiveSubscription = !!subscription;
  const isAccessible =
    hasActiveSubscription && isWithinRollingWindow(pack.release_date);

  // Calculate total file size
  const totalSize = pack.samples.reduce(
    (acc: number, sample: Sample) => acc + (sample.file_size || 0),
    0
  );
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div className="section">
      <div className="container-app">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-body text-text-muted hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Packs
        </Link>

        {/* Subscription Banner */}
        {!hasActiveSubscription && <SubscriptionBanner />}

        {/* Pack Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Cover Image */}
          <div className="relative aspect-square rounded-card overflow-hidden bg-grey-800">
            {pack.cover_image_url ? (
              <Image
                src={pack.cover_image_url}
                alt={pack.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-grey-700 to-grey-800">
                <Music2 className="w-24 h-24 text-text-subtle" />
              </div>
            )}
          </div>

          {/* Pack Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant={isAccessible ? "success" : "warning"}>
                {isAccessible ? "Available" : "Subscription Required"}
              </Badge>
              <span className="text-label text-text-muted">
                {formatDate(pack.release_date)}
              </span>
            </div>

            <h1 className="text-h1 text-white mb-4">{pack.name}</h1>

            <p className="text-body-lg text-text-muted mb-8">
              {pack.description}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mb-8">
              <div className="flex items-center gap-2 text-body text-text-muted">
                <Music2 className="w-5 h-5 text-white" />
                <span>{pack.samples.length} samples</span>
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

            {!isAccessible && (
              <div className="bg-warning/10 border border-warning/30 rounded-card p-4 flex items-center gap-3">
                <Lock className="w-5 h-5 text-warning" />
                <p className="text-body text-text-secondary">
                  {!hasActiveSubscription
                    ? "Subscribe to download samples from this pack"
                    : "This pack is outside the 3-month access window"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sample List */}
        <div>
          <h2 className="text-h2 text-white mb-6">Samples</h2>
          <SampleList
            samples={pack.samples}
            packId={pack.id}
            canDownload={isAccessible}
          />
        </div>
      </div>
    </div>
  );
}
