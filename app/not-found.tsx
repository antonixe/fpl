import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-24 text-center">
      <div className="space-y-6">
        <p className="text-[6rem] font-black leading-none tracking-tight text-[var(--accent)]">
          404
        </p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Page not found
        </h1>
        <p className="text-base max-w-md mx-auto text-[var(--text-tertiary)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded transition-colors bg-[var(--accent)] text-[var(--bg-primary)] hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1L1 7.5L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 7.5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Back to Dashboard
          </Link>
          <Link
            href="/players"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded border transition-colors border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            Browse Players
          </Link>
        </div>
      </div>
    </main>
  );
}
