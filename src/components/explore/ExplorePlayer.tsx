"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  onSeek: (percent: number) => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Background - blurred album art */}
      <div className="absolute inset-0 pointer-events-none">
        {sample.pack.cover_image_url && (
          <Image
            src={sample.pack.cover_image_url}
            alt=""
            fill
            className="object-cover opacity-40 blur-3xl scale-125"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/50 via-charcoal/70 to-charcoal/90" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-16 pb-safe overflow-hidden">
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
                priority
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
            <div
              className="h-6 flex items-center cursor-pointer touch-none"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = x / rect.width;
                onSeek(percent);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left;
                const percent = x / rect.width;
                onSeek(percent);
              }}
            >
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress}%`, transition: isPlaying ? "width 0.1s linear" : "none" }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/40">
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

  // Swipe state - dragOffset is the pixel offset while dragging
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerHeightRef = useRef(0);

  // Track container height for percentage calculations
  useEffect(() => {
    const updateHeight = () => {
      containerHeightRef.current = window.innerHeight;
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Preload cache for upcoming tracks
  const preloadedAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [preloadedTracks, setPreloadedTracks] = useState<Set<string>>(new Set());

  const currentSample = samples[currentIndex];
  const packIsArchived = currentSample ? isArchived(currentSample.pack.release_date) : false;
  const hasVoted = currentSample ? votes.has(currentSample.pack.id) : false;

  // Audio URL state - fetched from API
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Fetch signed URL for current sample
  useEffect(() => {
    if (!currentSample) {
      setAudioUrl(null);
      return;
    }

    const fetchUrl = async () => {
      try {
        const response = await fetch(`/api/preview/${currentSample.id}`);
        if (response.ok) {
          const data = await response.json();
          setAudioUrl(data.url);
        }
      } catch (err) {
        console.error('Error fetching preview URL:', err);
      }
    };

    fetchUrl();
  }, [currentSample?.id]);

  // Render more slides for smoother preloading
  const visibleSlides = useMemo(() => {
    const slides = [];
    for (let i = -1; i <= 2; i++) {
      const idx = currentIndex + i;
      if (samples[idx]) {
        slides.push({ sample: samples[idx], index: idx });
      }
    }
    return slides;
  }, [currentIndex, samples]);

  // Background preload audio with direct CDN URLs
  useEffect(() => {
    if (!hasInteracted) return;

    const preloadCount = 3;
    const preloadSample = async (sample: SampleWithPack) => {
      if (preloadedTracks.has(sample.id)) return;

      try {
        const response = await fetch(`/api/preview/${sample.id}`);
        if (!response.ok) return;
        const data = await response.json();

        const audio = new Audio();
        audio.preload = "auto";
        audio.src = data.url;
        preloadedAudioRef.current.set(sample.id, audio);
        audio.addEventListener("canplaythrough", () => {
          setPreloadedTracks((prev) => new Set([...Array.from(prev), sample.id]));
        }, { once: true });
        audio.load();
      } catch (err) {
        console.error('Error preloading audio:', err);
      }
    };

    for (let i = currentIndex + 1; i <= currentIndex + preloadCount && i < samples.length; i++) {
      const sample = samples[i];
      if (sample) preloadSample(sample);
    }
  }, [currentIndex, hasInteracted, samples, preloadedTracks]);

  // Autoplay on track change
  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    const playAudio = async () => {
      try {
        setIsLoading(true);
        await audioRef.current?.play();
        setIsPlaying(true);
        setIsLoading(false);
        setHasInteracted(true);
      } catch {
        setIsLoading(false);
        setIsPlaying(false);
      }
    };

    const timer = setTimeout(playAudio, 100);
    return () => clearTimeout(timer);
  }, [audioUrl, currentIndex]);

  const handleTapToPlay = useCallback(async () => {
    if (!audioRef.current || isPlaying) return;
    try {
      setIsLoading(true);
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoading(false);
      setHasInteracted(true);
      setShowSwipeHint(false);
    } catch {
      setIsLoading(false);
    }
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      handleTapToPlay();
    }
  }, [isPlaying, handleTapToPlay]);

  // Animate to a new index
  const animateToIndex = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= samples.length || isAnimating) return;

    const height = containerHeightRef.current || window.innerHeight;
    const targetOffset = (currentIndex - newIndex) * height;

    setIsAnimating(true);
    setDragOffset(targetOffset);

    // After animation completes, update index and reset offset
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setDragOffset(0);
      setIsAnimating(false);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsLoading(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }, 350);
  }, [currentIndex, samples.length, isAnimating]);

  const goToNext = useCallback(() => {
    if (currentIndex < samples.length - 1) {
      setShowSwipeHint(false);
      animateToIndex(currentIndex + 1);
    }
  }, [currentIndex, samples.length, animateToIndex]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setShowSwipeHint(false);
      animateToIndex(currentIndex - 1);
    }
  }, [currentIndex, animateToIndex]);

  // CTA handler
  const handleCTA = () => {
    if (!isLoggedIn) {
      router.push("/signup");
    } else if (!hasSubscription) {
      fetch("/api/create-checkout-session", { method: "POST" })
        .then((res) => res.json())
        .then((data) => { if (data.url) window.location.href = data.url; })
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
      setVotes((prev) => { const next = new Set(prev); next.delete(packId); return next; });
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
    if (isAnimating) return;
    setTouchStartY(e.touches[0].clientY);
    if (!hasInteracted && !isPlaying) {
      handleTapToPlay();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null || isAnimating) return;
    let delta = e.touches[0].clientY - touchStartY;

    // Add resistance at edges
    if (currentIndex === 0 && delta > 0) {
      delta = delta * 0.3;
    }
    if (currentIndex === samples.length - 1 && delta < 0) {
      delta = delta * 0.3;
    }

    setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (isAnimating || touchStartY === null) return;

    const threshold = 60;
    const height = containerHeightRef.current || window.innerHeight;

    if (dragOffset < -threshold && currentIndex < samples.length - 1) {
      // Swipe up - go to next
      setIsAnimating(true);
      setDragOffset(-height);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setDragOffset(0);
        setIsAnimating(false);
        setProgress(0);
        setCurrentTime(0);
        setIsPlaying(false);
        setIsLoading(true);
        setShowSwipeHint(false);
        if (audioRef.current) audioRef.current.pause();
      }, 350);
    } else if (dragOffset > threshold && currentIndex > 0) {
      // Swipe down - go to prev
      setIsAnimating(true);
      setDragOffset(height);
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setDragOffset(0);
        setIsAnimating(false);
        setProgress(0);
        setCurrentTime(0);
        setIsPlaying(false);
        setIsLoading(true);
        setShowSwipeHint(false);
        if (audioRef.current) audioRef.current.pause();
      }, 350);
    } else {
      // Snap back
      setIsAnimating(true);
      setDragOffset(0);
      setTimeout(() => setIsAnimating(false), 350);
    }

    setTouchStartY(null);
  };

  // Mouse wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isAnimating) return;
    if (e.deltaY > 50) goToNext();
    else if (e.deltaY < -50) goToPrev();
  }, [goToNext, goToPrev, isAnimating]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: true });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Audio progress
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
      if (currentIndex < samples.length - 1) setTimeout(goToNext, 500);
    };
    const handleCanPlay = () => setIsLoading(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => { setIsLoading(false); setIsPlaying(true); };

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

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goToNext();
      if (e.key === "ArrowUp") goToPrev();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
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

  // Calculate transform - slides move relative to current index
  const isDragging = touchStartY !== null;

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
      {/* Slides - each positioned relative to current index, all move with dragOffset */}
      {visibleSlides.map(({ sample, index }) => {
        const offset = index - currentIndex;
        return (
          <div
            key={sample.id}
            className="absolute inset-0"
            style={{
              transform: `translateY(calc(${offset * 100}% + ${dragOffset}px))`,
              transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              willChange: 'transform',
            }}
          >
            <SampleSlide
              sample={sample}
              isActive={index === currentIndex}
              isPlaying={index === currentIndex && isPlaying}
              isLoading={index === currentIndex && isLoading}
              progress={index === currentIndex ? progress : 0}
              currentTime={index === currentIndex ? currentTime : 0}
              packIsArchived={isArchived(sample.pack.release_date)}
              hasVoted={votes.has(sample.pack.id)}
              isLoggedIn={isLoggedIn}
              hasSubscription={hasSubscription}
              onTogglePlay={togglePlay}
              onVote={handleVote}
              onCTA={handleCTA}
              onSeek={(percent) => {
                if (audioRef.current && audioRef.current.duration) {
                  audioRef.current.currentTime = percent * audioRef.current.duration;
                }
              }}
            />
          </div>
        );
      })}

      {/* Fixed Header */}
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

      {/* Counter */}
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

      {/* Side nav */}
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

      {/* Audio */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}
    </div>
  );
}
