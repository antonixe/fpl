import { StatsSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";

export default function PlayerDetailLoading() {
  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
      <StatsSkeleton count={4} />
      <div className="mt-6"><CardSkeleton rows={8} /></div>
    </main>
  );
}
