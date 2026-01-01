"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Music,
  Heart,
  X,
  Vote,
  Shuffle,
  Archive,
  Loader2,
  ExternalLink,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { Sample, Pack } from "@/types/database";

interface SampleWithPack extends Sample {
  pack: Pack;
}

interface ExplorePlayerProps {
  samples: SampleWithPack[];
  initialVotes: string[];
  isLoggedIn: boolean;
  userId: string | null;
  hasSubscription?: boolean;
}

// Helper to check if pack is archived
function isArchived(releaseDate: string): boolean {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return new Date(releaseDate) < threeMonthsAgo;
}

// Format duration from seconds to mm:ss
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ExplorePlayer({
  samples,
  initialVotes,
  isLoggedIn,
  userId,
  hasSubscription = false,
}: ExplorePlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [votes, setVotes] = useState<Set<string>>(new Set(initialVotes));
  const [showVoteToast, setShowVoteToast] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");

  // Vertical swipe state (TikTok style)
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSample = samples[currentIndex];
  const nextSample = samples[currentIndex + 1];
  const prevSample = samples[currentIndex - 1];
  const packIsArchived = currentSample ? isArchived(currentSample.pack.release_date) : false;
  const hasVoted = currentSample ? votes.has(currentSample.pack.id) : false;

  // Audio URL for current sample
  const audioUrl = currentSample ? `/api/preview/${currentSample.id}?stream=true` : null;

  // Audio playback handlers
  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Playback error:", error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [isPlaying, audioUrl]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (currentIndex < samples.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, samples.length, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentIndex, isTransitioning]);

  // CTA handler
  const handleCTA = () => {
    if (!isLoggedIn) {
      router.push("/signup");
    } else if (!hasSubscription) {
      // Trigger checkout
      fetch("/api/create-checkout-session", {
        method: "POST",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.url) {
            window.location.href = data.url;
          }
        })
        .catch(console.error);
    }
  };

  // Vote handler
  const handleVote = async () => {
    if (!isLoggedIn || !currentSample) {
      setVoteMessage("Sign in to vote for packs");
      setShowVoteToast(true);
      setTimeout(() => setShowVoteToast(false), 2000);
      return;
    }

    if (!packIsArchived) {
      setVoteMessage("Only archived packs can be voted on");
      setShowVoteToast(true);
      setTimeout(() => setShowVoteToast(false), 2000);
      return;
    }

    const packId = currentSample.pack.id;

    if (hasVoted) {
      await fetch("/api/vote", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      setVotes((prev) => {
        const next = new Set(prev);
        next.delete(packId);
        return next;
      });
      setVoteMessage("Vote removed");
    } else {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      setVotes((prev) => new Set([...Array.from(prev), packId]));
      setVoteMessage("Voted! This pack may return");
    }

    setShowVoteToast(true);
    setTimeout(() => setShowVoteToast(false), 2000);
  };

  // Vertical touch handlers (TikTok style - swipe UP for next, DOWN for previous)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || isTransitioning) return;
    const deltaY = e.touches[0].clientY - touchStartY;

    // Limit the drag distance
    const maxDrag = 200;
    const limitedDelta = Math.max(-maxDrag, Math.min(maxDrag, deltaY));
    setTouchDeltaY(limitedDelta);
  };

  const handleTouchEnd = () => {
    if (isTransitioning) return;

    const threshold = 80;
    if (touchDeltaY < -threshold && currentIndex < samples.length - 1) {
      // Swiped UP -> go to next
      goToNext();
    } else if (touchDeltaY > threshold && currentIndex > 0) {
      // Swiped DOWN -> go to previous
      goToPrev();
    }

    setTouchStartY(null);
    setTouchDeltaY(0);
  };

  // Mouse wheel for desktop
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isTransitioning) return;

    if (e.deltaY > 50) {
      goToNext();
    } else if (e.deltaY < -50) {
      goToPrev();
    }
  }, [goToNext, goToPrev, isTransitioning]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: true });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      // Auto-advance to next track
      if (currentIndex < samples.length - 1) {
        setTimeout(goToNext, 500);
      }
    };

    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
    };
  }, [currentIndex, samples.length, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goToNext();
      if (e.key === "ArrowUp") goToPrev();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, togglePlay]);

  if (!currentSample) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-grey-600 mx-auto mb-4" />
          <p className="text-text-muted">No samples to explore</p>
        </div>
      </div>
    );
  }

  // Calculate transform based on drag
  const dragOffset = touchDeltaY;

  return (
    <div
      ref={containerRef}
      className="h-screen bg-charcoal relative overflow-hidden touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Previous sample (above - peek) */}
      {prevSample && (
        <div
          className="absolute inset-x-0 h-screen flex items-center justify-center transition-transform duration-300 ease-out"
          style={{
            transform: `translateY(calc(-100% + ${dragOffset}px))`,
            opacity: dragOffset > 0 ? Math.min(1, dragOffset / 100) : 0,
          }}
        >
          <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl opacity-60">
            {prevSample.pack.cover_image_url ? (
              <Image
                src={prevSample.pack.cover_image_url}
                alt={prevSample.pack.name}
                fill
                className="object-cover"
                sizes="280px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-grey-700 to-grey-800 flex items-center justify-center">
                <Music className="w-16 h-16 text-grey-600" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current sample */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${dragOffset}px)`,
        }}
      >
        {/* Background - blurred album art */}
        <div className="absolute inset-0 pointer-events-none">
          {currentSample.pack.cover_image_url && (
            <Image
              src={currentSample.pack.cover_image_url}
              alt=""
              fill
              className="object-cover opacity-40 blur-3xl scale-125"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-charcoal/70 to-charcoal/90" />
        </div>

        {/* Header */}
        <header className="relative z-20 px-4 pt-4 pb-2 flex items-center justify-between">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
          >
            <X className="w-5 h-5 text-white" />
          </Link>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
            <Shuffle className="w-4 h-4 text-white/80" />
            <span className="text-sm text-white/80 font-medium">Explore</span>
          </div>

          <div className="w-10 h-10" />
        </header>

        {/* Main Content */}
        <main className="relative z-10 h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6">
          {/* Album Art */}
          <Link
            href={`/packs/${currentSample.pack.id}`}
            className="relative w-full max-w-[300px] sm:max-w-[340px] aspect-square mb-6 group"
          >
            <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              {currentSample.pack.cover_image_url ? (
                <Image
                  src={currentSample.pack.cover_image_url}
                  alt={currentSample.pack.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 300px, 340px"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-grey-700 to-grey-800 flex items-center justify-center">
                  <Music className="w-24 h-24 text-grey-600" />
                </div>
              )}

              {/* Archive Badge */}
              {packIsArchived && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                  <Archive className="w-3 h-3 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">Archived</span>
                </div>
              )}

              {/* Tap to view pack */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-charcoal text-sm font-medium">
                  <ExternalLink className="w-4 h-4" />
                  View Pack
                </div>
              </div>
            </div>
          </Link>

          {/* Track Info */}
          <div className="w-full max-w-sm text-center mb-4">
            <h1 className="text-2xl font-bold text-white truncate mb-1">
              {currentSample.name}
            </h1>
            <Link
              href={`/packs/${currentSample.pack.id}`}
              className="text-base text-white/70 hover:text-white transition-colors"
            >
              {currentSample.pack.name}
            </Link>

            {/* Sample metadata */}
            <div className="flex items-center justify-center gap-3 mt-2 text-sm text-white/50">
              {currentSample.bpm && <span>{currentSample.bpm} BPM</span>}
              {currentSample.key && <span>•</span>}
              {currentSample.key && <span>{currentSample.key}</span>}
              <span>•</span>
              <span>{formatDuration(currentSample.duration)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-sm mb-5">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${progress}%`, transition: isPlaying ? "width 0.1s linear" : "none" }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-white/40">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(currentSample.duration)}</span>
            </div>
          </div>

          {/* Play Button */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform mb-5"
          >
            {isLoading ? (
              <Loader2 className="w-7 h-7 text-charcoal animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7 text-charcoal" fill="currentColor" />
            ) : (
              <Play className="w-7 h-7 text-charcoal ml-1" fill="currentColor" />
            )}
          </button>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-3 mb-4">
            {/* Vote Button (for archived packs) */}
            {packIsArchived && (
              <button
                onClick={handleVote}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-95 ${
                  hasVoted
                    ? "bg-white text-charcoal"
                    : "bg-white/10 text-white border border-white/20"
                }`}
              >
                {hasVoted ? (
                  <>
                    <Heart className="w-4 h-4" fill="currentColor" />
                    <span className="text-sm font-medium">Voted</span>
                  </>
                ) : (
                  <>
                    <Vote className="w-4 h-4" />
                    <span className="text-sm font-medium">Bring back</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* CTA Button - Always visible for non-subscribers */}
          {(!isLoggedIn || !hasSubscription) && (
            <button
              onClick={handleCTA}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-charcoal font-semibold shadow-xl hover:shadow-2xl active:scale-95 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Sampling For Free</span>
            </button>
          )}

          {/* Counter */}
          <div className="mt-4 text-sm text-white/40">
            {currentIndex + 1} / {samples.length}
          </div>
        </main>
      </div>

      {/* Next sample (below - peek) */}
      {nextSample && (
        <div
          className="absolute inset-x-0 h-screen flex items-center justify-center transition-transform duration-300 ease-out pointer-events-none"
          style={{
            transform: `translateY(calc(100% + ${dragOffset}px))`,
            opacity: dragOffset < 0 ? Math.min(1, Math.abs(dragOffset) / 100) : 0,
          }}
        >
          <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl opacity-60 relative">
            {nextSample.pack.cover_image_url ? (
              <Image
                src={nextSample.pack.cover_image_url}
                alt={nextSample.pack.name}
                fill
                className="object-cover"
                sizes="280px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-grey-700 to-grey-800 flex items-center justify-center">
                <Music className="w-16 h-16 text-grey-600" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scroll hint indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-30">
        {currentIndex > 0 && (
          <button
            onClick={goToPrev}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
        {currentIndex < samples.length - 1 && (
          <button
            onClick={goToNext}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 transition-all animate-bounce"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Vote Toast */}
      {showVoteToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="px-4 py-2 rounded-full bg-white text-charcoal text-sm font-medium shadow-lg">
            {voteMessage}
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
        />
      )}
    </div>
  );
}
