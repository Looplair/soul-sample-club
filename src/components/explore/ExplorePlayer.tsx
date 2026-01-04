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
  ExternalLink,
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

// Single Slide Component - renders one full sample view
function SampleSlide({
  sample,
  isActive,
  isPlaying,
  isLoading,
  progress,
  currentTime,
  packIsArchived,
  hasVoted,
  isLoggedIn,
  hasSubscription,
  onTogglePlay,
  onVote,
  onCTA,
}: {
  sample: SampleWithPack;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  currentTime: number;
  packIsArchived: boolean;
  hasVoted: boolean;
  isLoggedIn: boolean;
  hasSubscription: boolean;
  onTogglePlay: () => void;
  onVote: () => void;
  onCTA: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col" style={{ height: '100dvh' }}>
      {/* Background - blurred album art */}
      <div className="absolute inset-0 pointer-events-none">
        {sample.pack.cover_image_url && (
          <Image
            src={sample.pack.cover_image_url}
            alt=""
            fill
            className="object-cover opacity-40 blur-3xl scale-125"
            priority={isActive}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-charcoal/70 to-charcoal/90" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16">
        {/* Album Art with Loading/Playing indicator */}
        <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square mb-5">
          {/* Album art container */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            {sample.pack.cover_image_url ? (
              <Image
                src={sample.pack.cover_image_url}
                alt={sample.pack.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 280px, 320px"
                priority={isActive}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-grey-700 to-grey-800 flex items-center justify-center">
                <Music className="w-20 h-20 text-grey-600" />
              </div>
            )}

            {/* Archive Badge */}
            {packIsArchived && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm z-20">
                <Archive className="w-3 h-3 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Archived</span>
              </div>
            )}

            {/* View Pack button */}
            <Link
              href={`/packs/${sample.pack.id}`}
              className="absolute top-3 right-3 z-20"
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-charcoal text-sm font-medium shadow-lg hover:bg-white active:scale-95 active:bg-white/80 transition-all">
                <ExternalLink className="w-4 h-4" />
                View Pack
              </div>
            </Link>
          </div>

          {/* Loading/Playing indicator - centered on album art */}
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              {isLoading ? (
                <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                </div>
              ) : !isPlaying ? (
                <button
                  onClick={onTogglePlay}
                  className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center shadow-inner hover:bg-black/40 active:scale-90 active:bg-black/50 transition-all"
                >
                  <Play className="w-7 h-7 text-white/70 ml-1" fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={onTogglePlay}
                  className="w-16 h-16 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center opacity-0 hover:opacity-100 active:scale-90 active:opacity-100 transition-all"
                >
                  <Pause className="w-7 h-7 text-white/70" fill="currentColor" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="w-full max-w-sm text-center mb-3">
          <h1 className="text-xl font-bold text-white truncate mb-1">
            {sample.name}
          </h1>
          <Link
            href={`/packs/${sample.pack.id}`}
            className="text-base text-white/70 hover:text-white transition-colors"
          >
            {sample.pack.name}
          </Link>

          {/* Sample metadata */}
          <div className="flex items-center justify-center gap-3 mt-2 text-sm text-white/50">
            {sample.bpm && <span>{sample.bpm} BPM</span>}
            {sample.key && <span>•</span>}
            {sample.key && <span>{sample.key}</span>}
            <span>•</span>
            <span>{formatDuration(sample.duration)}</span>
          </div>
        </div>

        {/* Progress Bar - only show for active slide */}
        {isActive && (
          <div className="w-full max-w-sm mb-4">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${progress}%`, transition: isPlaying ? "width 0.1s linear" : "none" }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-white/40">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(sample.duration)}</span>
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3 mb-3">
          {packIsArchived && isActive && (
            <button
              onClick={onVote}
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

        {/* CTA Button */}
        {(!isLoggedIn || !hasSubscription) && isActive && (
          <button
            onClick={onCTA}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-white text-charcoal hover:bg-white/90 active:scale-95 active:bg-white/80 transition-all"
          >
            Start Free Trial
          </button>
        )}
      </main>
    </div>
  );
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
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [votes, setVotes] = useState<Set<string>>(new Set(initialVotes));
  const [showVoteToast, setShowVoteToast] = useState(false);
  const [voteMessage, setVoteMessage] = useState("");
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Vertical swipe state
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Preload cache for upcoming tracks
  const preloadedAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [preloadedTracks, setPreloadedTracks] = useState<Set<string>>(new Set());

  const currentSample = samples[currentIndex];
  const packIsArchived = currentSample ? isArchived(currentSample.pack.release_date) : false;
  const hasVoted = currentSample ? votes.has(currentSample.pack.id) : false;

  // Audio URL for current sample
  const audioUrl = currentSample ? `/api/preview/${currentSample.id}?stream=true` : null;

  // Get visible slides - render prev, current, and next for smooth swiping
  const visibleSlides = [];
  if (samples[currentIndex - 1]) visibleSlides.push({ sample: samples[currentIndex - 1], offset: -1 });
  if (samples[currentIndex]) visibleSlides.push({ sample: samples[currentIndex], offset: 0 });
  if (samples[currentIndex + 1]) visibleSlides.push({ sample: samples[currentIndex + 1], offset: 1 });

  // Background preload next 3 tracks for smoother experience
  useEffect(() => {
    if (!hasInteracted) return;

    const preloadCount = 3;
    const startIdx = currentIndex + 1;
    const endIdx = Math.min(currentIndex + preloadCount + 1, samples.length);

    for (let i = startIdx; i < endIdx; i++) {
      const sample = samples[i];
      if (!sample || preloadedTracks.has(sample.id)) continue;

      const audioUrl = `/api/preview/${sample.id}?stream=true`;
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = audioUrl;
      preloadedAudioRef.current.set(sample.id, audio);

      audio.addEventListener("canplaythrough", () => {
        setPreloadedTracks((prev) => new Set([...Array.from(prev), sample.id]));
      }, { once: true });

      audio.load();
    }

    // Cleanup old preloaded audio
    const keysToDelete: string[] = [];
    preloadedAudioRef.current.forEach((audio, id) => {
      const idx = samples.findIndex((s) => s.id === id);
      if (idx < currentIndex - 1) {
        audio.src = "";
        keysToDelete.push(id);
      }
    });
    keysToDelete.forEach((key) => preloadedAudioRef.current.delete(key));
  }, [currentIndex, hasInteracted, samples, preloadedTracks]);

  // Autoplay on mount and when changing tracks
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    const playAudio = async () => {
      try {
        setIsLoading(true);
        await audioRef.current?.play();
        setIsPlaying(true);
        setIsLoading(false);
        setHasInteracted(true);
      } catch (error) {
        console.log("Autoplay blocked, waiting for interaction");
        setIsLoading(false);
        setIsPlaying(false);
      }
    };

    const timer = setTimeout(playAudio, 100);
    return () => clearTimeout(timer);
  }, [audioUrl, currentIndex]);

  // Handle user tap to start playback
  const handleTapToPlay = useCallback(async () => {
    if (!audioRef.current || isPlaying) return;

    try {
      setIsLoading(true);
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoading(false);
      setHasInteracted(true);
      setShowSwipeHint(false);
    } catch (error) {
      console.error("Playback error:", error);
      setIsLoading(false);
    }
  }, [isPlaying]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      handleTapToPlay();
    }
  }, [isPlaying, handleTapToPlay]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (currentIndex < samples.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setShowSwipeHint(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsLoading(true);
      setTimeout(() => setIsTransitioning(false), 400);
    }
  }, [currentIndex, samples.length, isTransitioning]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setShowSwipeHint(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsLoading(true);
      setTimeout(() => setIsTransitioning(false), 400);
    }
  }, [currentIndex, isTransitioning]);

  // CTA handler
  const handleCTA = () => {
    if (!isLoggedIn) {
      router.push("/signup");
    } else if (!hasSubscription) {
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

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchStartY(e.touches[0].clientY);

    if (!hasInteracted && !isPlaying) {
      handleTapToPlay();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || isTransitioning) return;
    const deltaY = e.touches[0].clientY - touchStartY;

    let adjustedDelta = deltaY;

    // Add resistance at edges
    if (currentIndex === 0 && deltaY > 0) {
      adjustedDelta = deltaY * 0.3;
    }
    if (currentIndex === samples.length - 1 && deltaY < 0) {
      adjustedDelta = deltaY * 0.3;
    }

    setTouchDeltaY(adjustedDelta);
  };

  const handleTouchEnd = () => {
    if (isTransitioning) return;

    const threshold = 60;
    if (touchDeltaY < -threshold && currentIndex < samples.length - 1) {
      goToNext();
    } else if (touchDeltaY > threshold && currentIndex > 0) {
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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-charcoal overflow-hidden touch-none select-none"
      style={{ height: '100dvh' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={!hasInteracted ? handleTapToPlay : undefined}
    >
      {/* Slides Container - all slides move together */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${touchDeltaY}px)`,
          transition: touchStartY === null ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          willChange: 'transform',
        }}
      >
        {/* Render visible slides */}
        {visibleSlides.map(({ sample, offset }) => (
          <div
            key={sample.id}
            className="absolute inset-0"
            style={{
              transform: `translateY(${offset * 100}%)`,
            }}
          >
            <SampleSlide
              sample={sample}
              isActive={offset === 0}
              isPlaying={offset === 0 && isPlaying}
              isLoading={offset === 0 && isLoading}
              progress={offset === 0 ? progress : 0}
              currentTime={offset === 0 ? currentTime : 0}
              packIsArchived={isArchived(sample.pack.release_date)}
              hasVoted={votes.has(sample.pack.id)}
              isLoggedIn={isLoggedIn}
              hasSubscription={hasSubscription}
              onTogglePlay={togglePlay}
              onVote={handleVote}
              onCTA={handleCTA}
            />
          </div>
        ))}
      </div>

      {/* Fixed Header - stays on top */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-2 flex items-center justify-between">
        <Link
          href="/"
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90 active:bg-black/60"
        >
          <X className="w-5 h-5 text-white" />
        </Link>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
          <Shuffle className="w-4 h-4 text-white/80" />
          <span className="text-sm text-white/80 font-medium">Explore</span>
        </div>

        <div className="w-10 h-10" />
      </header>

      {/* Counter - fixed at bottom */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-sm text-white/40">
        {currentIndex + 1} / {samples.length}
      </div>

      {/* Swipe Hint */}
      {showSwipeHint && currentIndex < samples.length - 1 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 sm:hidden">
          <div className="flex flex-col items-center gap-1 text-white/60">
            <div className="flex flex-col items-center animate-bounce">
              <ChevronUp className="w-5 h-5 -mb-2" />
              <ChevronUp className="w-5 h-5 opacity-40" />
            </div>
            <span className="text-xs font-medium">Swipe up</span>
          </div>
        </div>
      )}

      {/* Side navigation buttons */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-40">
        {currentIndex > 0 && (
          <button
            onClick={goToPrev}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 active:scale-90 active:bg-black/60 transition-all"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
        {currentIndex < samples.length - 1 && (
          <button
            onClick={goToNext}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/50 active:scale-90 active:bg-black/60 transition-all"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Vote Toast */}
      {showVoteToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
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
