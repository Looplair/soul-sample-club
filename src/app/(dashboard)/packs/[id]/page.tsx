import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Music2, Download, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, isWithinRollingWindow } from "@/lib/utils";
import { SampleList } from "@/components/audio/SampleList";
import { SubscriptionBanner } from "@/components/packs/SubscriptionBanner";
import { Badge } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pack } = await supabase
    .from("packs")
    .select("name, description")
    .eq("id", id)
    .single();

  if (!pack) {
    return { title: "Pack Not Found | Soul Sample Club" };
  }

  return {
    title: `${pack.name} | Soul Sample Club`,
    description: pack.description,
  };
}

async function getPack(id: string) {
  const supabase = await createClient();

  const { data: pack, error } = await supabase
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

  if (error || !pack) return null;

  // Sort samples by order_index
  pack.samples = pack.samples.sort((a: any, b: any) => a.order_index - b.order_index);

  return pack;
}

async function getUserSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  return subscription;
}

export default async function PackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pack, subscription] = await Promise.all([
    getPack(id),
    getUserSubscription(),
  ]);

  if (!pack) {
    notFound();
  }

  const hasActiveSubscription = !!subscription;
  const isAccessible = hasActiveSubscription && isWithinRollingWindow(pack.release_date);

  // Calculate total file size
  const totalSize = pack.samples.reduce(
    (acc: number, sample: any) => acc + (sample.file_size || 0),
    0
  );
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);

  return (
    <div className="section">
      <div className="container-app">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-8 text-body text-snow/60 hover:text-snow transition-colors mb-32"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Packs
        </Link>

        {/* Subscription Banner if needed */}
        {!hasActiveSubscription && <SubscriptionBanner />}

        {/* Pack Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-48 mb-48">
          {/* Cover Image */}
          <div className="relative aspect-square rounded-card overflow-hidden bg-steel">
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
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-velvet/20 to-steel">
                <Music2 className="w-24 h-24 text-snow/30" />
              </div>
            )}
          </div>

          {/* Pack Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-12 mb-16">
              <Badge variant={isAccessible ? "success" : "warning"}>
                {isAccessible ? "Available" : "Subscription Required"}
              </Badge>
              <span className="text-label text-snow/50">
                {formatDate(pack.release_date)}
              </span>
            </div>

            <h1 className="text-h1 text-snow mb-16">{pack.name}</h1>

            <p className="text-body-lg text-snow/70 mb-32">
              {pack.description}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-24 mb-32">
              <div className="flex items-center gap-8 text-body text-snow/60">
                <Music2 className="w-5 h-5 text-velvet" />
                <span>{pack.samples.length} samples</span>
              </div>
              <div className="flex items-center gap-8 text-body text-snow/60">
                <Download className="w-5 h-5 text-velvet" />
                <span>{totalSizeMB} MB total</span>
              </div>
              <div className="flex items-center gap-8 text-body text-snow/60">
                <Calendar className="w-5 h-5 text-velvet" />
                <span>Released {formatDate(pack.release_date)}</span>
              </div>
            </div>

            {!isAccessible && (
              <div className="bg-warning/10 border border-warning/30 rounded-card p-16 flex items-center gap-12">
                <Lock className="w-5 h-5 text-warning" />
                <p className="text-body text-snow/80">
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
          <h2 className="text-h2 text-snow mb-24">Samples</h2>
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
