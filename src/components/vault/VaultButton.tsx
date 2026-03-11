"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DrumIcon } from "@/components/icons/DrumIcon";

export function VaultButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-9 h-9 rounded-full text-text-muted hover:text-white hover:bg-grey-800 transition-all duration-200"
        title="Drum Vault"
        aria-label="Open Drum Vault"
      >
        <DrumIcon className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 z-50 rounded-xl border border-[#1E1E1E] bg-[#0C0C0C] shadow-2xl left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-0"
          style={{ width: 260, maxWidth: "calc(100vw - 1rem)" }}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-[#141414]">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2E2E2E] mb-1">
              Members Exclusive
            </div>
            <div className="flex items-center gap-2">
              <DrumIcon className="w-4 h-4 text-[#555]" />
              <span className="text-[15px] font-bold tracking-tight text-white">Drum Vault</span>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-3">
            <p className="text-[12px] text-[#444] leading-relaxed mb-4">
              Members-only drum breaks. Original, raw, dope. Collect yours to keep forever.
            </p>
            <Link
              href="/vault"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-white text-black text-[13px] font-bold tracking-tight hover:bg-[#E0E0E0] transition-colors"
            >
              Enter The Drum Vault
              <span className="text-[16px]">→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
