"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  Heart,
  X,
  Vote,
  Shuffle,
  Archive,
  Loader2,
  ExternalLink,
  Sparkles,
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Swipe state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"horizontal" | "vertical" | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSample = samples[currentIndex];
  const packIsArchived = currentSample ? isArchived(currentSample.pack.release_date) : false;
  const hasVoted = currentSample ? votes.has(currentSample.pack.id) : false;

  // Fetch audio URL when sample changes
  useEffect(() => {
    if (!currentSample) return;

    setIsLoading(true);
    setAudioUrl(null);

    // Use streaming endpoint directly
    const streamUrl = `/api/preview/${currentSample.id}?stream=true`;
    setAudioUrl(streamUrl);
    setIsLoading(false);
  }, [currentSample]);

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
    if (currentIndex < samples.length - 1) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [currentIndex, samples.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [currentIndex]);

  // CTA handler
  const handleCTA = () => {
    if (!isLoggedIn) {
      router.push("/signup");
    } else if (!hasSubscription) {
      router.push("/account?tab=billing");
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

  // Touch handlers for swipe - improved for better mobile UX
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;

    // Determine swipe direction on first significant move
    if (!swipeDirection && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        setSwipeDirection("horizontal");
      } else {
        setSwipeDirection("vertical");
      }
    }

    // Only track horizontal swipes
    if (swipeDirection === "horizontal") {
      e.preventDefault(); // Prevent scrolling while swiping
      setTouchDelta(deltaX);
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = () => {
    if (swipeDirection === "horizontal" && Math.abs(touchDelta) > 60) {
      if (touchDelta > 0 && currentIndex > 0) {
        goToPrev();
      } else if (touchDelta < 0 && currentIndex < samples.length - 1) {
        goToNext();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
    setTouchDelta(0);
    setIsSwiping(false);
    setSwipeDirection(null);
  };

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

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

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
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
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

  const swipeStyle = isSwiping
    ? {
        transform: `translateX(${touchDelta}px) rotate(${touchDelta / 30}deg)`,
        transition: "none",
      }
    : {
        transform: "translateX(0) rotate(0deg)",
        transition: "transform 0.3s ease-out",
      };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-charcoal relative overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background - blurred album art */}
      <div className="absolute inset-0 pointer-events-none">
        {currentSample.pack.cover_image_url && (
          <Image
            src={currentSample.pack.cover_image_url}
            alt=""
            fill
            className="object-cover opacity-30 blur-3xl scale-110"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/80 to-charcoal" />
      </div>

      {/* Header */}
      <header className="relative z-20 px-4 pt-4 pb-2 flex items-center justify-between safe-area-top">
        <Link
          href="/"
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <X className="w-5 h-5 text-white" />
        </Link>

        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/60 font-medium">Explore</span>
        </div>

        <div className="w-10 h-10" />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center px-6 pt-2 pb-8">
        {/* Album Art - Swipeable */}
        <div
          className="relative w-full max-w-[320px] sm:max-w-sm aspect-square mb-6"
          style={swipeStyle}
        >
          <Link href={`/packs/${currentSample.pack.id}`} className="block">
            <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl">
              {currentSample.pack.cover_image_url ? (
                <Image
                  src={currentSample.pack.cover_image_url}
                  alt={currentSample.pack.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 400px"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-grey-700 to-grey-800 flex items-center justify-center">
                  <Music className="w-24 h-24 text-grey-600" />
                </div>
              )}

              {/* Archive Badge */}
              {packIsArchived && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">Archived</span>
                </div>
              )}

              {/* View Pack indicator */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-medium text-white">View Pack</span>
              </div>
            </div>
          </Link>

          {/* Swipe hint overlay */}
          {isSwiping && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm ${touchDelta > 0 ? "text-white" : "text-white"}`}>
                {touchDelta > 0 ? "← Previous" : "Next →"}
              </div>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="w-full max-w-sm text-center mb-4">
          <h1 className="text-xl font-bold text-white truncate mb-1">
            {currentSample.name}
          </h1>
          <Link
            href={`/packs/${currentSample.pack.id}`}
            className="text-base text-text-muted hover:text-white transition-colors inline-flex items-center gap-1"
          >
            {currentSample.pack.name}
            <ExternalLink className="w-3 h-3" />
          </Link>

          {/* Sample metadata */}
          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-text-subtle">
            {currentSample.bpm && <span>{currentSample.bpm} BPM</span>}
            {currentSample.key && <span>{currentSample.key}</span>}
            <span>{formatDuration(currentSample.duration)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm mb-4">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${progress}%`, transition: isPlaying ? "width 0.1s linear" : "none" }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-text-subtle">
            <span>{formatDuration(currentTime)}</span>
            <span>-{formatDuration(Math.max(0, currentSample.duration - currentTime))}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {/* Previous */}
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="w-14 h-14 flex items-center justify-center text-white disabled:opacity-30 transition-all active:scale-90"
          >
            <SkipBack className="w-7 h-7" fill="currentColor" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!audioUrl}
            className="w-18 h-18 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
            style={{ width: "72px", height: "72px" }}
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-charcoal animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 text-charcoal" fill="currentColor" />
            ) : (
              <Play className="w-8 h-8 text-charcoal ml-1" fill="currentColor" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={goToNext}
            disabled={currentIndex === samples.length - 1}
            className="w-14 h-14 flex items-center justify-center text-white disabled:opacity-30 transition-all active:scale-90"
          >
            <SkipForward className="w-7 h-7" fill="currentColor" />
          </button>
        </div>

        {/* Vote Button (for archived packs) */}
        {packIsArchived && (
          <button
            onClick={handleVote}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all active:scale-95 mb-4 ${
              hasVoted
                ? "bg-white text-charcoal"
                : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
            }`}
          >
            {hasVoted ? (
              <>
                <Heart className="w-4 h-4" fill="currentColor" />
                <span className="font-medium text-sm">Voted</span>
              </>
            ) : (
              <>
                <Vote className="w-4 h-4" />
                <span className="font-medium text-sm">Vote to bring back</span>
              </>
            )}
          </button>
        )}

        {/* CTA Button - Start Sampling For Free */}
        {(!isLoggedIn || !hasSubscription) && (
          <button
            onClick={handleCTA}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-white to-grey-100 text-charcoal font-semibold shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            <span>Start Sampling For Free</span>
          </button>
        )}

        {/* Counter */}
        <div className="mt-4 text-sm text-text-subtle">
          {currentIndex + 1} of {samples.length}
        </div>

        {/* Swipe hint for mobile */}
        <p className="mt-2 text-xs text-text-subtle/60 sm:hidden">
          Swipe left or right to browse
        </p>

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="auto"
            crossOrigin="anonymous"
          />
        )}
      </main>

      {/* Vote Toast */}
      {showVoteToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="px-4 py-2 rounded-full bg-white text-charcoal text-sm font-medium shadow-lg">
            {voteMessage}
          </div>
        </div>
      )}

      {/* Bottom safe area spacer */}
      <div className="h-safe-area-bottom" />
    </div>
  );
}
