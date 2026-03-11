// src/app/vault/VaultClient.tsx
"use client";

import { useState, useCallback } from "react";
import { VaultHero } from "@/components/vault/VaultHero";
import { VaultPicker } from "@/components/vault/VaultPicker";
import { VaultFooter } from "@/components/vault/VaultFooter";
import type { DrumBreakWithStatus } from "@/types/database";

interface VaultClientProps {
  breaks: DrumBreakWithStatus[];
  stats: { collected: number; total: number };
}

export interface Toast {
  message: string;
  sub: string;
  key: number;
}

export function VaultClient({ breaks: initialBreaks, stats: initialStats }: VaultClientProps) {
  const [breaks, setBreaks] = useState<DrumBreakWithStatus[]>(initialBreaks);
  const [stats, setStats] = useState(initialStats);
  const [toast, setToast] = useState<Toast | null>(null);

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
      if (!res.ok) throw new Error("Collect failed");

      const milestoneMsgs: Record<number, string> = {
        [Math.min(10, stats.total)]: "Milestone — 10 breaks collected",
        25: "Milestone — 25 breaks collected",
        [stats.total]: "Vault complete.",
      };
      const milestoneMsg = milestoneMsgs[newCount];
      showToast(
        milestoneMsg ?? `${drumBreak.name} collected`,
        milestoneMsg ? "★ Milestone unlocked" : `${newCount} of ${stats.total} breaks collected`
      );
    } catch {
      // Revert on failure
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
    const { url } = await res.json();
    window.location.href = url;
  }, []);

  return (
    <div
      className="flex flex-col bg-[#0C0C0C] text-white"
      style={{ height: "100dvh", overflow: "hidden" }}
    >
      <VaultHero stats={stats} />

      <hr className="border-t border-[#141414] flex-shrink-0" />

      {/* Picker bar */}
      <div className="flex-shrink-0 border-b border-[#141414]">
        <div className="max-w-[860px] mx-auto px-10 py-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2E2E2E]">
            All Breaks — {stats.total} total
          </span>
          {breaks.some((b) => b.is_new) && (
            <span className="text-[11px] font-semibold text-[#22C55E] tracking-[0.06em]">
              ↑ {breaks.filter((b) => b.is_new).length} new since your last visit
            </span>
          )}
        </div>
      </div>

      <VaultPicker
        breaks={breaks}
        onCollect={handleCollect}
        onDownload={handleDownload}
      />

      <VaultFooter />

      {/* Toast */}
      {toast && (
        <div
          key={toast.key}
          className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-[#181818] border border-[#2A2A2A] rounded-xl px-5 py-3 z-50 animate-fade-in-up"
        >
          <div className="text-[13px] font-semibold tracking-tight">{toast.message}</div>
          <div className="text-[11px] text-[#444] mt-0.5">{toast.sub}</div>
        </div>
      )}
    </div>
  );
}
