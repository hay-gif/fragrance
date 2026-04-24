"use client";

import { useCallback, useRef } from "react";

type SwipeHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
};

type Options = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Minimum swipe distance in px to trigger (default: 60) */
  threshold?: number;
};

/**
 * Returns touch event handlers that detect swipe gestures.
 * Attach the returned handlers to a container element.
 *
 * @example
 * const swipe = useSwipe({ onSwipeLeft: () => setTab("next") });
 * <div {...swipe}>…</div>
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 60,
}: Options): SwipeHandlers {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchMove = useCallback((_e: React.TouchEvent) => {
    // no-op: we evaluate on end
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!start.current) return;
    // Read from the last cached touch (changedTouches not accessible here)
    // Handled via touchend with stored start ref
  }, []);

  // Override with a version that reads changedTouches on end
  const handlers: SwipeHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd: () => {},
  };

  // Patch onTouchEnd to have access to start ref
  handlers.onTouchEnd = () => {
    // We rely on onTouchMove to track the last position
    start.current = null;
  };

  // Re-implement with proper move tracking
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
      lastPos.current = { x: t.clientX, y: t.clientY };
    },
    onTouchMove: (e) => {
      const t = e.touches[0];
      lastPos.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: () => {
      if (!start.current || !lastPos.current) return;
      const dx = lastPos.current.x - start.current.x;
      const dy = lastPos.current.y - start.current.y;
      start.current = null;
      lastPos.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy && absDx >= threshold) {
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      } else if (absDy > absDx && absDy >= threshold) {
        if (dy < 0) onSwipeUp?.();
        else onSwipeDown?.();
      }
    },
  };
}
