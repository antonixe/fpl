import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] mt-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-mono font-bold text-xs tracking-tight text-[var(--text-secondary)]">
              FPL<span className="text-[var(--accent)]">GRID</span>
            </Link>
            <span className="text-[10px] text-[var(--text-muted)]">
              v{process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0"}
            </span>
          </div>

          <nav className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]" aria-label="Footer navigation">
            <Link href="/players" className="hover:text-[var(--text-primary)] transition-colors">Players</Link>
            <Link href="/fixtures" className="hover:text-[var(--text-primary)] transition-colors">Fixtures</Link>
            <Link href="/live" className="hover:text-[var(--text-primary)] transition-colors">Live</Link>
            <Link href="/optimizer" className="hover:text-[var(--text-primary)] transition-colors">Optimizer</Link>
          </nav>

          <div className="text-[10px] text-[var(--text-muted)] text-center sm:text-right">
            <p>&copy; {year} FPLGRID. Data from FPL API.</p>
            <p className="mt-0.5">
              Press <kbd className="font-mono px-1 py-0.5 bg-[var(--bg-hover)] border border-[var(--border)] rounded text-[9px]">?</kbd> for shortcuts
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
