/**
 * LoopPreviewControls - Tracklib-style loop and pitch preview UI
 *
 * IMPORTANT: This is a PREVIEW tool only.
 * - All processing happens client-side in the browser
 * - Downloads always serve the ORIGINAL untouched audio file
 * - This never modifies any files
 *
 * UI Controls:
 * - LOOP toggle button
 * - Bar selector (1/2/4) - only visible when looping
 * - Pitch nudge buttons (-/+)
 *
 * To remove this feature:
 * 1. Delete this file
 * 2. Delete src/hooks/useLoopPreview.ts
 * 3. Remove any imports/usage from SampleRow or other components
 */

"use client";

import { Repeat, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BarCount } from "@/hooks/useLoopPreview";

interface LoopPreviewControlsProps {
  /** Whether looping is enabled */
  isLooping: boolean;
  /** Current bar count (1, 2, or 4) */
  barCount: BarCount;
  /** Current pitch offset in semitones (-3 to +3) */
  pitchOffset: number;
  /** Whether BPM is available (loop controls only work with BPM) */
  hasBpm: boolean;
  /** Toggle loop on/off */
  onToggleLoop: () => void;
  /** Set bar count */
  onSetBarCount: (bars: BarCount) => void;
  /** Pitch up (+1 semitone) */
  onPitchUp: () => void;
  /** Pitch down (-1 semitone) */
  onPitchDown: () => void;
  /** Optional: reset pitch to 0 */
  onResetPitch?: () => void;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Size variant */
  size?: "sm" | "md";
}

export function LoopPreviewControls({
  isLooping,
  barCount,
  pitchOffset,
  hasBpm,
  onToggleLoop,
  onSetBarCount,
  onPitchUp,
  onPitchDown,
  onResetPitch,
  disabled = false,
  size = "sm",
}: LoopPreviewControlsProps) {
  const buttonBase = cn(
    "flex items-center justify-center transition-all duration-150 font-medium",
    size === "sm" ? "h-7 text-xs rounded-md" : "h-8 text-sm rounded-lg",
    disabled && "opacity-50 cursor-not-allowed"
  );

  const barOptions: BarCount[] = [1, 2, 4];

  return (
    <div className="flex items-center gap-1.5">
      {/* Loop Toggle */}
      <button
        onClick={onToggleLoop}
        disabled={disabled || !hasBpm}
        title={!hasBpm ? "BPM required for looping" : isLooping ? "Disable loop" : "Enable loop"}
        className={cn(
          buttonBase,
          size === "sm" ? "px-2 gap-1" : "px-2.5 gap-1.5",
          isLooping
            ? "bg-white text-charcoal"
            : hasBpm
            ? "bg-grey-700 text-text-secondary hover:bg-grey-600 hover:text-white"
            : "bg-grey-800 text-text-muted cursor-not-allowed"
        )}
      >
        <Repeat className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span>LOOP</span>
      </button>

      {/* Bar Selector - only visible when looping and has BPM */}
      {isLooping && hasBpm && (
        <div className="flex items-center bg-grey-800 rounded-md overflow-hidden">
          {barOptions.map((bars) => (
            <button
              key={bars}
              onClick={() => onSetBarCount(bars)}
              disabled={disabled}
              className={cn(
                "transition-all duration-150 font-medium",
                size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm",
                barCount === bars
                  ? "bg-white text-charcoal"
                  : "text-text-secondary hover:text-white hover:bg-grey-700",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {bars}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-5 bg-grey-700 mx-0.5" />

      {/* Pitch Controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onPitchDown}
          disabled={disabled || pitchOffset <= -3}
          title="Pitch down (-1 semitone)"
          className={cn(
            buttonBase,
            size === "sm" ? "w-7" : "w-8",
            pitchOffset <= -3
              ? "bg-grey-800 text-text-muted cursor-not-allowed"
              : "bg-grey-700 text-text-secondary hover:bg-grey-600 hover:text-white"
          )}
        >
          <Minus className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>

        {/* Pitch display - clickable to reset */}
        <button
          onClick={onResetPitch}
          disabled={disabled || pitchOffset === 0}
          title={pitchOffset === 0 ? "Pitch: 0" : "Reset pitch"}
          className={cn(
            buttonBase,
            size === "sm" ? "w-8" : "w-10",
            "tabular-nums",
            pitchOffset !== 0
              ? "bg-grey-700 text-white hover:bg-grey-600"
              : "bg-grey-800 text-text-muted cursor-default"
          )}
        >
          {pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset}
        </button>

        <button
          onClick={onPitchUp}
          disabled={disabled || pitchOffset >= 3}
          title="Pitch up (+1 semitone)"
          className={cn(
            buttonBase,
            size === "sm" ? "w-7" : "w-8",
            pitchOffset >= 3
              ? "bg-grey-800 text-text-muted cursor-not-allowed"
              : "bg-grey-700 text-text-secondary hover:bg-grey-600 hover:text-white"
          )}
        >
          <Plus className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>
      </div>
    </div>
  );
}

/**
 * Minimal version - just loop and pitch, no bar selector visible
 * Use this if you want a simpler UI
 */
export function LoopPreviewControlsMinimal({
  isLooping,
  pitchOffset,
  hasBpm,
  onToggleLoop,
  onPitchUp,
  onPitchDown,
  disabled = false,
}: Pick<
  LoopPreviewControlsProps,
  "isLooping" | "pitchOffset" | "hasBpm" | "onToggleLoop" | "onPitchUp" | "onPitchDown" | "disabled"
>) {
  const buttonBase =
    "h-6 flex items-center justify-center transition-all duration-150 text-xs font-medium rounded";

  return (
    <div className="flex items-center gap-1">
      {/* Loop Toggle */}
      <button
        onClick={onToggleLoop}
        disabled={disabled || !hasBpm}
        className={cn(
          buttonBase,
          "px-1.5",
          isLooping
            ? "bg-white text-charcoal"
            : hasBpm
            ? "bg-grey-700 text-text-muted hover:text-white"
            : "bg-grey-800 text-text-muted/50 cursor-not-allowed"
        )}
      >
        <Repeat className="w-3 h-3" />
      </button>

      {/* Pitch */}
      <button
        onClick={onPitchDown}
        disabled={disabled || pitchOffset <= -3}
        className={cn(buttonBase, "w-5", "bg-grey-700 text-text-muted hover:text-white")}
      >
        <Minus className="w-2.5 h-2.5" />
      </button>
      <span className="text-xs text-text-muted tabular-nums w-5 text-center">
        {pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset}
      </span>
      <button
        onClick={onPitchUp}
        disabled={disabled || pitchOffset >= 3}
        className={cn(buttonBase, "w-5", "bg-grey-700 text-text-muted hover:text-white")}
      >
        <Plus className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}
