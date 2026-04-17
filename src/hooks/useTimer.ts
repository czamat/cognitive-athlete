"use client";

import { useRef, useCallback } from "react";

export function useTimer() {
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const stop = useCallback((): number => {
    if (startTimeRef.current === 0) return 0;
    const elapsed = performance.now() - startTimeRef.current;
    startTimeRef.current = 0;
    return Math.round(elapsed);
  }, []);

  const reset = useCallback(() => {
    startTimeRef.current = 0;
  }, []);

  return { start, stop, reset };
}
