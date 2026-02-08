"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SHORTCUT_LIST } from "@/components/KeyboardShortcuts";

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    window.addEventListener("fpl:toggle-shortcuts", toggle);
    return () => window.removeEventListener("fpl:toggle-shortcuts", toggle);
  }, [toggle]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
        className="relative card p-6 w-full max-w-sm shadow-2xl animate-slide-up"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {SHORTCUT_LIST.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between py-1.5"
            >
              <span className="text-sm text-[var(--text-secondary)]">
                {s.label}
              </span>
              <div className="flex gap-1">
                {s.keys.split(" ").map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-mono font-semibold bg-[var(--bg-hover)] border border-[var(--border)] rounded"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--border)] text-center">
          <span className="text-[10px] text-[var(--text-muted)]">
            Press <kbd className="font-mono">?</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
