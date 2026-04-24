"use client";

import { useEffect } from "react";
import { createPageTracker } from "@/lib/analytics";

/**
 * Trackt automatisch Seitenaufrufe, Scroll-Milestones und Verweildauer.
 * Einbinden mit: usePageTracking("pagename")
 */
export function usePageTracking(pageName: string) {
  useEffect(() => {
    const cleanup = createPageTracker(pageName);
    return cleanup;
  }, [pageName]);
}
