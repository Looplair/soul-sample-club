"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAudio } from "@/contexts/AudioContext";
import { popupHiddenOn, type PopupContent } from "@/lib/announcement-popup";
import { AnnouncementPopupView } from "./AnnouncementPopupView";

const DELAY_MS = 4000;

// The viewer's own calendar day, e.g. "2026-11-21"
const today = () => new Date().toLocaleDateString("en-CA");

function seenToday(key: string): boolean {
  try {
    return localStorage.getItem(key) === today();
  } catch {
    return false;
  }
}

function markToday(key: string) {
  try {
    localStorage.setItem(key, today());
  } catch {
    // Storage blocked: shows again on the next full load
  }
}

/**
 * Shows at most once a day: the day is marked as soon as it appears, so it
 * won't come back on the next page load. It stays put while they move around
 * the site until × (or its button) puts it away.
 */
export function AnnouncementPopupCard({ content }: { content: PopupContent }) {
  const pathname = usePathname() ?? "/";
  const { currentTrack } = useAudio();
  const key = `announce-popup-dismissed-${content.id}`;
  const hiddenHere = popupHiddenOn(pathname) || pathname === new URL(content.buttonUrl, "https://x").pathname;

  const [stage, setStage] = useState<"waiting" | "shown" | "done">("waiting");
  const [entered, setEntered] = useState(false);

  // Start the 4 second wait on the first page it's allowed on
  useEffect(() => {
    if (stage !== "waiting" || hiddenHere) return;
    if (seenToday(key)) {
      setStage("done");
      return;
    }
    const t = setTimeout(() => {
      markToday(key);
      setStage("shown");
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [stage, hiddenHere, key]);

  // Slide in on the frame after it mounts
  useEffect(() => {
    if (stage !== "shown") return;
    const r = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(r);
  }, [stage]);

  if (stage !== "shown" || hiddenHere) return null;

  const close = () => {
    markToday(key);
    setStage("done");
  };

  const motion = `transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none ${
    entered ? "translate-y-0 opacity-100" : "translate-y-[16px] opacity-0 motion-reduce:translate-y-0"
  }`;

  return (
    <div role="status" aria-live="polite">
      {/* Under 600px: slim bar along the bottom, above the player when it's open */}
      <div className={`fixed inset-x-0 z-[45] min-[600px]:hidden ${currentTrack ? "bottom-[68px]" : "bottom-0"} ${motion}`}>
        <AnnouncementPopupView content={content} layout="bar" onClose={close} onFollow={close} />
      </div>
      {/* Wider: small card bottom-right, above the player when it's open */}
      <div
        className={`fixed right-[24px] z-[45] hidden w-[340px] max-w-[calc(100vw-48px)] min-[600px]:block ${
          currentTrack ? "bottom-[100px]" : "bottom-[24px]"
        } ${motion}`}
      >
        <AnnouncementPopupView content={content} layout="card" onClose={close} onFollow={close} />
      </div>
    </div>
  );
}
