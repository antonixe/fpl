import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/LoadingSkeleton";

export const metadata: Metadata = {
  title: "Players",
  description: "Browse and compare all FPL players by points, form, expected points, and value.",
  alternates: { canonical: "/players" },
};

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <TableSkeleton rows={10} />
      </main>
    }>
      {children}
    </Suspense>
  );
}
