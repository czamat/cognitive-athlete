"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts down while `active` is true. Calls `onExpire` once when time runs out.
 * Resets when `active` or `limitMs` changes.
 */
export function usePressureTimer(active: boolean, limitMs: number, onExpire: () => void) {
  const [remainingMs, setRemainingMs] = useState(limitMs);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);
  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    if (!active || limitMs <= 0) {
      setRemainingMs(limitMs);
      return;
    }

    const start = performance.now();
    setRemainingMs(limitMs);

    const interval = setInterval(() => {
      const elapsed = performance.now() - start;
      const rem = Math.max(0, limitMs - elapsed);
      setRemainingMs(rem);
      if (rem <= 0) {
        clearInterval(interval);
        if (!firedRef.current) {
          firedRef.current = true;
          onExpireRef.current();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [active, limitMs]);

  const fraction = limitMs > 0 ? Math.min(1, remainingMs / limitMs) : 1;
  return { remainingMs, fraction };
}
