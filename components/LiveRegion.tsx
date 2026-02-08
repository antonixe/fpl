"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Announces dynamic content changes to screen readers via aria-live.
 * Renders a visually hidden element that screen readers will announce.
 */
export function LiveRegion({
  message,
  politeness = "polite",
}: {
  message: string;
  politeness?: "polite" | "assertive";
}) {
  // Toggle between two slots to force re-announcement of same text
  const [current, setCurrent] = useState(0);
  const prevMessage = useRef(message);

  useEffect(() => {
    if (message !== prevMessage.current) {
      setCurrent((c) => (c === 0 ? 1 : 0));
      prevMessage.current = message;
    }
  }, [message]);

  return (
    <div className="sr-only" aria-live={politeness} aria-atomic="true" role="status">
      {current === 0 ? message : ""}
      {current === 1 ? message : ""}
    </div>
  );
}
