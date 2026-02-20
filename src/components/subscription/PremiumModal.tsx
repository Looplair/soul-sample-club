"use client";

import { useEffect } from "react";
import { X, Download, Music2, Sparkles, Check } from "lucide-react";
import Link from "next/link";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasUsedTrial: boolean;
  isLoggedIn: boolean;
}

export function PremiumModal({ isOpen, onClose, hasUsedTrial, isLoggedIn }: PremiumModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-grey-900 border border-grey-700 rounded-2xl overflow-hidden shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-text-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 mb-6 mx-auto">
            <Download className="w-7 h-7 text-amber-400" />
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Subscribe to Download
          </h2>
          <p className="text-text-muted text-center mb-6 text-sm leading-relaxed">
            You&apos;re previewing for free. To save and download full compositions and stems, you need an active subscription.
          </p>

          {/* Features list */}
          <ul className="space-y-3 mb-8">
            {[
              "Download full compositions + individual stems",
              "New packs on the 1st — bonus packs mid-month",
              "100% royalty free, no clearance needed",
              "Keep everything you download, forever",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-text-muted">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="space-y-3">
            {isLoggedIn ? (
              <Link
                href="/subscribe"
                className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-grey-100 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {hasUsedTrial ? "Subscribe Now" : "Start For $0.99"}
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-grey-100 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Start For $0.99
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center w-full px-6 py-3 text-text-muted text-sm hover:text-white transition-colors"
                >
                  Already have an account? Log in
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
