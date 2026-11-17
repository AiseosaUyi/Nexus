/**
 * Route-level loading skeletons (used by loading.tsx files). Server-safe —
 * no client JS. Shown instantly on navigation while the server renders.
 */
function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-hover animate-pulse ${className}`} />;
}

export function DocumentSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="w-full">
      <div className="h-12 border-b border-border/10 px-6 flex items-center">
        <Bar className="h-3 w-40" />
      </div>
      <div className="w-full max-w-full md:max-w-4xl mx-auto px-6 pt-16 space-y-4">
        <Bar className="h-10 w-10" />
        <Bar className="h-9 w-2/3" />
        <div className="pt-6 space-y-3">
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-11/12" />
          <Bar className="h-4 w-4/5" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-3/5" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Loading" className="w-full max-w-6xl mx-auto px-6 py-10 space-y-8">
      <Bar className="h-8 w-56" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="rounded-xl border border-border/10 p-4 space-y-3">
            <Bar className="h-6 w-6" />
            <Bar className="h-4 w-3/4" />
            <Bar className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div role="status" aria-label="Loading calendar" className="w-full px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Bar className="h-8 w-48" />
        <Bar className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, i) => (
          <Bar key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
