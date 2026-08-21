function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/5 ${className}`}>
      <div className="h-full w-full rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  )
}

function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <SkeletonGrid />
    </div>
  )
}
