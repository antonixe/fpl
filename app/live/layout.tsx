import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/LoadingSkeleton";

export const metadata: Metadata = {
  title: "Live",
  description: "Follow live FPL match scores, bonus points, and player performances in real-time.",
  alternates: { canonical: "/live" },
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <PageSkeleton />
      </main>
    }>
      {children}
    </Suspense>
  );
}
