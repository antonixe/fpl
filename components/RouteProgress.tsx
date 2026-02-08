"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Slim progress bar at the top of the page during route transitions.
 * Inspired by YouTube / GitHub's top-loading bars.
 *
 * Automatically triggers on pathname changes and animates:
 *   0% → 90% (during transition), then 90% → 100% (on complete).
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathname = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // When pathname changes, the new page has already loaded — complete the bar
  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    // Complete animation
    setProgress(100);
    setVisible(true);

    cleanup();
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, [pathname, cleanup]);

  // Listen for navigation start via click interception
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto") ||
        anchor.target === "_blank"
      ) {
        return;
      }

      // Only trigger for internal navigation to a different page
      if (href !== pathname) {
        cleanup();
        setProgress(20);
        setVisible(true);

        // Gradually increase without reaching 100
        let current = 20;
        intervalRef.current = setInterval(() => {
          current += Math.random() * 10;
          if (current >= 90) {
            current = 90;
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
          setProgress(current);
        }, 200);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      cleanup();
    };
  }, [pathname, cleanup]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-[2px] pointer-events-none"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
    >
      <div
        className="h-full bg-[var(--accent)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "400ms",
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
