"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console (and future error tracking service)
    console.error('[GlobalError]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    });
  }, [error]);

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12">
      <ErrorState
        title="Something went wrong"
        message={error.message || "An unexpected error occurred"}
        retry={reset}
      />
    </main>
  );
}
