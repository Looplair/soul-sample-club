import Link from "next/link";
import { PackCard } from "@/components/packs/PackCard";
import { Button } from "@/components/ui";

interface Pack {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  hero_image_url: string | null;
  release_date: string;
  end_date: string | null;
  is_published: boolean;
  is_staff_pick?: boolean;
  is_bonus: boolean;
  is_returned?: boolean;
  scheduled_publish_at: string | null;
  created_at: string;
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  samples: any[];
}

interface ArchivedPacksSectionProps {
  archivedPacks: Pack[];
}

export function ArchivedPacksSection({ archivedPacks }: ArchivedPacksSectionProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-medium">Archive</p>
        <p className="text-[11px] text-white/20">Packs return for members</p>
      </div>

      {/* Grid — all archive packs, no blur wall */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {archivedPacks.map((pack) => (
          <div key={pack.id} style={{ filter: "saturate(0.6) brightness(0.75)" }}>
            <PackCard
              pack={pack}
              sampleCount={Array.isArray(pack.samples) ? pack.samples.length : 0}
              hasSubscription={false}
            />
          </div>
        ))}
      </div>

      {/* CTA at the end */}
      <div className="flex justify-center mt-10 sm:mt-14">
        <div className="w-full max-w-sm bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/25 mb-3">Members only</p>
          <h3 className="text-base font-semibold text-white mb-2">{archivedPacks.length}+ releases in the archive</h3>
          <p className="text-[13px] text-white/35 mb-5 leading-relaxed">
            Pre-cleared and exclusive. Nowhere else on the internet. Plus a members-only drum vault and Looplair perks. First month $0.99.
          </p>
          <Link href="/subscribe">
            <Button className="w-full mb-3">Get started</Button>
          </Link>
          <p className="text-xs text-white/25">
            or{" "}
            <Link href="/subscribe" className="hover:text-white transition-colors underline">
              $49/year
            </Link>
            {" "}· Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
