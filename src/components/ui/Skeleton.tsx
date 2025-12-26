import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

// Pack Card Skeleton - WAVS style shimmer
export function PackCardSkeleton() {
  return (
    <div className="bg-black-card rounded-card overflow-hidden border border-grey-800/50">
      {/* Image skeleton */}
      <Skeleton className="aspect-square w-full rounded-none" />

      {/* Content */}
      <div className="p-5">
        {/* Title */}
        <Skeleton className="h-5 w-3/4 mb-3" />

        {/* Description lines */}
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-4" />

        {/* Metadata */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

// Sample Row Skeleton
export function SampleRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-grey-900 rounded-xl">
      {/* Play button */}
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

      {/* Waveform area */}
      <div className="flex-1 min-w-0">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Time */}
      <Skeleton className="h-4 w-20 flex-shrink-0" />

      {/* Metadata */}
      <div className="hidden sm:flex items-center gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>

      {/* Volume */}
      <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3 border-b border-grey-800/50">
          <Skeleton className="h-4 w-full max-w-[150px]" />
        </td>
      ))}
    </tr>
  );
}

// Generic text skeleton
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-black-card rounded-card p-6 border border-grey-800/50", className)}>
      <Skeleton className="h-6 w-1/2 mb-4" />
      <TextSkeleton lines={3} />
    </div>
  );
}

// Avatar skeleton
export function AvatarSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return <Skeleton className={cn("rounded-full", sizes[size])} />;
}

// Button skeleton
export function ButtonSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-20",
    md: "h-10 w-24",
    lg: "h-12 w-32",
  };

  return <Skeleton className={cn("rounded-button", sizes[size])} />;
}
