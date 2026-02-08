import { PageSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      <PageSkeleton />
    </main>
  );
}
