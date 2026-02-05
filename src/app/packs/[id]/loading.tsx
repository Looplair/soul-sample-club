import { ArrowLeft, Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-grey-700/50 rounded ${className || ""}`} />
  );
}

export default function PackLoading() {
  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <header className="border-b border-grey-700 bg-charcoal/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="container-app h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Soul Sample Club"
              width={160}
              height={36}
              className="h-8 sm:h-9 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <Skeleton className="w-20 h-9 rounded-lg" />
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="w-32 h-9 rounded-full hidden sm:block" />
          </div>
        </div>
      </header>

      <main className="section">
        <div className="container-app">
          {/* Back Link */}
          <div className="inline-flex items-center gap-2 text-body text-text-muted mb-8">
            <ArrowLeft className="w-4 h-4" />
            <Skeleton className="w-28 h-4" />
          </div>

          {/* Pack Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 mb-8 lg:mb-12">
            {/* Cover Image Skeleton */}
            <div className="relative aspect-square rounded-card overflow-hidden bg-grey-800">
              <div className="absolute inset-0 flex items-center justify-center">
                <Music2 className="w-24 h-24 text-grey-700 animate-pulse" />
              </div>
            </div>

            {/* Pack Info Skeleton */}
            <div className="lg:col-span-2">
              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Skeleton className="w-24 h-6 rounded-full" />
                <Skeleton className="w-20 h-6 rounded-full" />
                <Skeleton className="w-28 h-4" />
              </div>

              {/* Title */}
              <Skeleton className="w-3/4 h-10 mb-4" />

              {/* Description */}
              <Skeleton className="w-full h-6 mb-2" />
              <Skeleton className="w-2/3 h-6 mb-6" />

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6">
                <Skeleton className="w-24 h-5" />
                <Skeleton className="w-28 h-5" />
                <Skeleton className="w-32 h-5" />
              </div>

              {/* CTA Box */}
              <div className="bg-white/5 border border-white/10 rounded-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="w-40 h-5 mb-2" />
                      <Skeleton className="w-56 h-4" />
                    </div>
                  </div>
                  <Skeleton className="w-32 h-10 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Sample List Skeleton */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="w-24 h-8" />
            </div>

            {/* Sample Items */}
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-lg bg-grey-800/30 border border-grey-700/50"
                >
                  {/* Play button */}
                  <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

                  {/* Waveform area */}
                  <div className="flex-1 min-w-0">
                    <Skeleton className="w-48 h-4 mb-2" />
                    <Skeleton className="w-full h-8" />
                  </div>

                  {/* Duration */}
                  <Skeleton className="w-12 h-4 hidden sm:block" />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded" />
                    <Skeleton className="w-8 h-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
