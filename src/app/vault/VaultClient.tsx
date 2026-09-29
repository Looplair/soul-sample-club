// src/app/vault/VaultClient.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VaultHero } from "@/components/vault/VaultHero";
import { VaultPicker } from "@/components/vault/VaultPicker";
import { PremiumModal } from "@/components/subscription/PremiumModal";
import type { DrumBreakWithStatus } from "@/types/database";

interface VaultClientProps {
  breaks: DrumBreakWithStatus[];
  stats: { collected: number; total: number };
  hasUsedTrial: boolean;
  isLoggedIn: boolean;
}

export interface Toast {
  message: string;
  sub: string;
  key: number;
}

export function VaultClient({ breaks: initialBreaks, stats: initialStats, hasUsedTrial, isLoggedIn }: VaultClientProps) {
  const [breaks, setBreaks] = useState<DrumBreakWithStatus[]>(initialBreaks);
  const [stats, setStats] = useState(initialStats);
  const [toast, setToast] = useState<Toast | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const showToast = useCallback((message: string, sub: string) => {
    setToast({ message, sub, key: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const handleCollect = useCallback(async (breakId: string) => {
    const drumBreak = breaks.find((b) => b.id === breakId);
    if (!drumBreak || drumBreak.is_collected) return;

    // Optimistic update
    setBreaks((prev) =>
      prev.map((b) => (b.id === breakId ? { ...b, is_collected: true } : b))
    );
    const newCount = stats.collected + 1;
    setStats((prev) => ({ ...prev, collected: newCount }));

    try {
      const res = await fetch(`/api/drum-vault/${breakId}/collect`, { method: "POST" });

      if (res.status === 403) {
        // Not subscribed — revert and show modal
        setBreaks((prev) =>
          prev.map((b) => (b.id === breakId ? { ...b, is_collected: false } : b))
        );
        setStats((prev) => ({ ...prev, collected: prev.collected - 1 }));
        setModalOpen(true);
        return;
      }

      if (!res.ok) throw new Error("Collect failed");

      showToast(
        `${drumBreak.name} collected`,
        `${newCount} of ${stats.total} breaks collected`
      );
    } catch {
      setBreaks((prev) =>
        prev.map((b) => (b.id === breakId ? { ...b, is_collected: false } : b))
      );
      setStats((prev) => ({ ...prev, collected: prev.collected - 1 }));
      showToast("Couldn't collect", "Check your connection and try again");
    }
  }, [breaks, stats, showToast]);

  const handleDownload = useCallback(async (breakId: string) => {
    const res = await fetch(`/api/drum-vault/${breakId}/download`);
    if (!res.ok) return;
    const { url, fileName } = await res.json();

    // Desktop app: use Electron's download handler so files save to the
    // user's chosen folder instead of opening in the system browser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && (window as any).sscDesktop) {
      const drumBreak = breaks.find((b) => b.id === breakId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window as any).sscDesktop.downloadFile({
        url,
        packName: "Drum Vault",
        fileName: fileName || (drumBreak ? `${drumBreak.name}.wav` : "break.wav"),
      });
      return;
    }

    window.location.href = url;
  }, [breaks]);

  const newCount = breaks.filter((b) => b.is_new).length;

  return (
    <main className="px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
      <div className="mx-auto max-w-[1240px]">
        <VaultHero
          stats={stats}
          backLink={
            <Link href="/feed" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Catalog
            </Link>
          }
        />

        <section className="mt-14">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="ssc-display text-[clamp(1.4rem,2.6vw,2rem)]">All breaks</h2>
              <span className="text-[13px] text-white/55">{stats.total} in the vault</span>
            </div>
            {newCount > 0 && (
              <span className="ssc-pill">
                <span className="ssc-pill__dot" />
                {newCount} new since your last visit
              </span>
            )}
          </div>

          <VaultPicker breaks={breaks} onCollect={handleCollect} onDownload={handleDownload} />

          <p className="mt-5 text-[13px] leading-relaxed text-white/55">
            Breaks are added to the vault on a rolling basis. Once you collect one it stays in your account to download whenever you like.
          </p>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        // Outer layer centres, inner layer animates, so the slide-up never fights the centring
        <div key={toast.key} role="status" className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-5">
          <div
            className="ssc-glass ssc-glass--plain rounded-2xl px-5 py-3.5 animate-fade-in-up"
            style={{ background: "linear-gradient(180deg, rgba(24,24,24,0.94), rgba(10,10,10,0.94))" }}
          >
            <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-white">{toast.message}</p>
            <p className="mt-0.5 text-[12px] text-white/55">{toast.sub}</p>
          </div>
        </div>
      )}

      <PremiumModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        hasUsedTrial={hasUsedTrial}
        isLoggedIn={isLoggedIn}
      />
    </main>
  );
}
