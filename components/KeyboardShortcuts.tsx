"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts for fast navigation.
 *
 * Shortcuts (active when no input is focused):
 *   g d → Dashboard
 *   g p → Players
 *   g f → Fixtures
 *   g l → Live
 *   g o → Optimizer
 *   /   → Focus search (if available)
 *   ?   → Show shortcut help
 */

const ROUTES: Record<string, string> = {
  d: "/",
  p: "/players",
  f: "/fixtures",
  l: "/live",
  o: "/optimizer",
};

export function KeyboardShortcuts() {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      // "?" shows help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Toggle help dialog by dispatching a custom event
        window.dispatchEvent(new CustomEvent("fpl:toggle-shortcuts"));
        return;
      }

      // "/" focuses search input
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"], input[type="search"]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
        return;
      }

      // "g" prefix: wait for next key to navigate
      if (e.key === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const handler = (e2: KeyboardEvent) => {
          const route = ROUTES[e2.key];
          if (route) {
            e2.preventDefault();
            router.push(route);
          }
          window.removeEventListener("keydown", handler);
          clearTimeout(timer);
        };
        const timer = setTimeout(() => {
          window.removeEventListener("keydown", handler);
        }, 1000); // 1s window to press second key
        window.addEventListener("keydown", handler);
      }
    },
    [router]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return null;
}

/** Shortcut help data for display */
export const SHORTCUT_LIST = [
  { keys: "g d", label: "Go to Dashboard" },
  { keys: "g p", label: "Go to Players" },
  { keys: "g f", label: "Go to Fixtures" },
  { keys: "g l", label: "Go to Live" },
  { keys: "g o", label: "Go to Optimizer" },
  { keys: "/", label: "Focus search" },
  { keys: "?", label: "Toggle shortcuts" },
];
