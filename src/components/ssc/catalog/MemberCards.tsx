"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { FlaireCreditsState } from "@/lib/flaire/eligibility";

const COULDNT_REACH = "Couldn't reach Flaire. Try again in a minute.";
const card = "ssc-glass ssc-glass--plain group relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl px-5 py-4 text-left transition-colors";
const action = "text-[12px] font-semibold uppercase tracking-[0.14em] text-white/75 transition-colors group-hover:text-white";

/** The member perks above the catalog: Drum Vault, and Flaire once its status is known */
export function MemberCards() {
  const [flaire, setFlaire] = useState<FlaireCreditsState>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flaire/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !cancelled && setFlaire(j?.state ?? null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Signs them in on Flaire (and links the account the first time)
  const openFlaire = async () => {
    setOpening(true);
    setError(null);
    try {
      const res = await fetch("/api/flaire/connect", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || COULDNT_REACH);
    } catch {
      setError(COULDNT_REACH);
    }
    setOpening(false);
  };

  const vault = (
    <Link href="/vault" className={`${card} hover:border-white/20`}>
      <div>
        <p className="ssc-label">Members only</p>
        <p className="ssc-display mt-1 text-[1.3rem]">Drum Vault</p>
      </div>
      <span className={action}>Hand-picked drum breaks, yours to keep →</span>
    </Link>
  );

  if (!flaire) return <div className="mt-8">{vault}</div>;

  const heading = (
    <div>
      <p className="ssc-label">Included with your membership</p>
      <p className="ssc-display mt-1 text-[1.3rem]">Flaire</p>
      <p className="mt-1 text-[13px] text-white/60">3 free vocal credits every month in our vocal plugin.</p>
      {error && <p className="mt-2 text-[13px] text-white">{error}</p>}
    </div>
  );

  return (
    <div className="mt-8 grid gap-3 md:grid-cols-2">
      {vault}
      {flaire === "pending" ? (
        <div className={card}>
          {heading}
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50">Unlocks after your first full month</span>
        </div>
      ) : (
        <button type="button" onClick={openFlaire} disabled={opening} className={`${card} hover:border-white/20 disabled:cursor-wait`}>
          {heading}
          {flaire === "eligible" ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.1em] text-black">
              {opening && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Claim your credits →
            </span>
          ) : (
            <span className={`${action} inline-flex items-center gap-2`}>
              {opening && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Open Flaire →
            </span>
          )}
        </button>
      )}
    </div>
  );
}
