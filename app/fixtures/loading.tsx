import { TableSkeleton } from "@/components/LoadingSkeleton";

export default function FixturesLoading() {
  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <div className="h-7 w-32 bg-[var(--bg-hover)] rounded animate-pulse" />
        <div className="h-4 w-64 bg-[var(--bg-hover)] rounded animate-pulse mt-2" />
      </div>
      <TableSkeleton rows={10} />
    </main>
  );
}
