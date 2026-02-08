import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/LoadingSkeleton";

export const metadata: Metadata = {
  title: "Optimizer",
  description: "Transfer advice, squad building, and chip strategy for your FPL team.",
  alternates: { canonical: "/optimizer" },
};

export default function OptimizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <TableSkeleton rows={8} />
      </main>
    }>
      {children}
    </Suspense>
  );
}
