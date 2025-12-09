import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

export function PackCardSkeleton() {
  return (
    <div className="card">
      <Skeleton className="aspect-square w-full rounded-image mb-16" />
      <Skeleton className="h-6 w-3/4 mb-8" />
      <Skeleton className="h-4 w-1/2 mb-16" />
      <Skeleton className="h-10 w-full rounded-button" />
    </div>
  );
}

export function SampleRowSkeleton() {
  return (
    <div className="flex items-center gap-16 p-12">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-24 rounded-button" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-16 py-12 border-b border-steel/50">
          <Skeleton className="h-5 w-full max-w-[150px]" />
        </td>
      ))}
    </tr>
  );
}
