"use client";

// Deterministic widths to avoid hydration mismatch (Math.random differs server vs client)
const SKELETON_WIDTHS = [45, 65, 30, 55, 70, 40, 60, 35, 50, 75, 25, 68, 52, 38, 72, 28, 58, 42, 62, 33];

export function CardSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="h-3 w-32 bg-[var(--bg-hover)] rounded" />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, j) => (
              <div
                key={j}
                className="h-3 bg-[var(--bg-hover)] rounded"
                style={{ width: `${SKELETON_WIDTHS[(i * cols + j) % SKELETON_WIDTHS.length]}%`, flex: j === 0 ? 2 : 1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        {[80, 40, 30, 30, 30, 30].map((w, i) => (
          <div key={i} className="h-2.5 bg-[var(--bg-hover)] rounded" style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0">
          <div className="h-3 w-20 bg-[var(--bg-hover)] rounded" />
          <div className="h-3 w-full bg-[var(--bg-hover)] rounded max-w-[120px]" />
          <div className="h-3 w-10 bg-[var(--bg-hover)] rounded" />
          <div className="h-5 w-10 bg-[var(--bg-hover)] rounded" />
          <div className="h-3 w-12 bg-[var(--bg-hover)] rounded ml-auto" />
          <div className="h-3 w-8 bg-[var(--bg-hover)] rounded" />
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 5 }: { count?: number }) {
  // Use explicit responsive grid classes — dynamic classes like `md:${var}` get purged by Tailwind
  const mdClass = count <= 2 ? 'md:grid-cols-2' : count <= 3 ? 'md:grid-cols-3' : count <= 4 ? 'md:grid-cols-4' : 'md:grid-cols-5';
  const gridClasses: Record<string, string> = {
    'md:grid-cols-2': 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2',
    'md:grid-cols-3': 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3',
    'md:grid-cols-4': 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    'md:grid-cols-5': 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
  };
  return (
    <div className="card animate-pulse">
      <div className={`${gridClasses[mdClass]} divide-x divide-[var(--border)]`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="h-7 w-16 bg-[var(--bg-hover)] rounded mb-2" />
            <div className="h-2.5 w-20 bg-[var(--bg-hover)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title */}
      <div>
        <div className="h-7 w-40 bg-[var(--bg-hover)] rounded mb-2" />
        <div className="h-3 w-60 bg-[var(--bg-hover)] rounded" />
      </div>
      {/* Stats */}
      <StatsSkeleton />
      {/* Table */}
      <TableSkeleton />
    </div>
  );
}
