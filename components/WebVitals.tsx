"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useCallback } from "react";

/**
 * Reports Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 *
 * In production, sends to /api/health as a beacon (or logs to console).
 * Extend this to send to your analytics provider (Vercel Analytics, etc.)
 */
export function WebVitals() {
  useReportWebVitals(
    useCallback((metric) => {
      const { name, value, rating, id } = metric;

      // Log to console in dev, structured JSON in prod
      const entry = {
        name,
        value: Math.round(name === "CLS" ? value * 1000 : value),
        rating, // 'good' | 'needs-improvement' | 'poor'
        id,
        page: typeof window !== "undefined" ? window.location.pathname : "",
      };

      if (process.env.NODE_ENV === "production") {
        // Send to analytics endpoint via beacon (fire-and-forget)
        const body = JSON.stringify({ type: "web-vital", ...entry });
        if (typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon("/api/vitals", body);
        }
      } else {
        const color =
          rating === "good" ? "\x1b[32m" : rating === "poor" ? "\x1b[31m" : "\x1b[33m";
        console.log(
          `${color}[Web Vital]\x1b[0m ${name}: ${entry.value}${name === "CLS" ? " (x1000)" : "ms"} (${rating})`
        );
      }
    }, [])
  );

  return null;
}
