"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useFPL } from "@/lib/use-fpl-data";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/live", label: "Live" },
  { href: "/optimizer", label: "Optimizer" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lastUpdated, loading, error } = useFPL();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Focus trap for mobile menu
  const handleMobileKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setMobileOpen(false);
      hamburgerRef.current?.focus();
      return;
    }
    if (e.key !== 'Tab') return;

    const menu = mobileMenuRef.current;
    if (!menu) return;
    const focusable = menu.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Focus first menu item when opening
  useEffect(() => {
    if (mobileOpen) {
      // Small delay to let the DOM render
      requestAnimationFrame(() => {
        const menu = mobileMenuRef.current;
        if (menu) {
          const first = menu.querySelector<HTMLElement>('a, button');
          first?.focus();
        }
      });
    }
  }, [mobileOpen]);

  return (
    <>
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[100] focus:bg-[var(--accent)] focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <header className="bg-[var(--nav-bg)] text-white sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm tracking-tight">
                FPL<span className="text-[var(--accent)]">GRID</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "text-white bg-white/10"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Status + Mobile Toggle */}
            <div className="flex items-center gap-3">
              {/* Live Status */}
              <div className="hidden sm:flex items-center gap-2 text-xs">
                {error ? (
                  <>
                    <span className="status-dot" style={{ background: "var(--danger)" }} />
                    <span className="text-white/60 font-mono">ERR</span>
                  </>
                ) : loading ? (
                  <>
                    <span className="status-dot" style={{ background: "var(--warning)", animation: "pulse 1s infinite" }} />
                    <span className="text-white/60 font-mono">SYNC</span>
                  </>
                ) : (
                  <>
                    <span className="status-dot status-live" />
                    <span className="text-white/60 font-mono">LIVE</span>
                  </>
                )}
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Hamburger */}
              <button
                ref={hamburgerRef}
                onClick={() => setMobileOpen(!mobileOpen)}
                className="sm:hidden p-1.5 text-white/80 hover:text-white"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          onKeyDown={handleMobileKeyDown}
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setMobileOpen(false); hamburgerRef.current?.focus(); }}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
          />
          <div className="absolute top-12 left-0 right-0 bg-[var(--nav-bg)] border-t border-white/10">
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-6 py-3.5 text-sm font-medium border-b border-white/5 transition-colors ${
                      isActive
                        ? "text-white bg-white/10 border-l-2 border-l-[var(--accent)]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {lastUpdated && (
              <div className="px-6 py-3 text-xs font-mono text-white/30">
                Last sync: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
