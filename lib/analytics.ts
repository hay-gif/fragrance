// Fragrance OS – User Behavior Tracking
// Schreibt Events in die Supabase-Tabelle analytics_events.
// Schlägt still fehl wenn Tabelle nicht existiert oder kein User eingeloggt ist.
//
// Empfohlene Supabase-Tabelle:
//   create table analytics_events (
//     id uuid primary key default gen_random_uuid(),
//     created_at timestamptz default now(),
//     session_id text,
//     user_id uuid references auth.users,
//     event_type text not null,
//     page text,
//     entity_type text,
//     entity_id text,
//     properties jsonb,
//     dwell_ms int
//   );

import { supabase } from "./supabase";

// ─── Typen ────────────────────────────────────────────────────────────────────

export type AnalyticsEventType =
  | "page_view"
  | "page_exit"
  | "fragrance_view"
  | "fragrance_created"
  | "fragrance_published"
  | "accord_viewed"
  | "sample_requested"
  | "cart_add"
  | "checkout_started"
  | "purchase_completed"
  | "creator_applied"
  | "onboarding_completed"
  | "search"
  | "filter_used"
  | "scroll_50"
  | "scroll_90"
  | "image_uploaded"
  | "pif_exported"
  | "label_printed"
  | "button_click";

export type TrackEventOptions = {
  page?: string;
  entityType?: string;
  entityId?: string;
  properties?: Record<string, unknown>;
  dwellMs?: number;
};

// ─── Session-ID ───────────────────────────────────────────────────────────────

let _sessionId: string | null = null;

function getSessionId(): string {
  if (_sessionId) return _sessionId;

  if (typeof window === "undefined") return "server";

  let stored = sessionStorage.getItem("fos_session");
  if (!stored) {
    stored = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("fos_session", stored);
  }

  _sessionId = stored;
  return stored;
}

// ─── trackEvent ──────────────────────────────────────────────────────────────

export async function trackEvent(
  eventType: AnalyticsEventType,
  opts: TrackEventOptions = {},
): Promise<void> {
  if (typeof window === "undefined") return; // Server-Side: nicht tracken

  try {
    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from("analytics_events").insert({
      session_id: getSessionId(),
      user_id: session?.user?.id ?? null,
      event_type: eventType,
      page: opts.page ?? window.location.pathname,
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      properties: opts.properties ?? null,
      dwell_ms: opts.dwellMs ?? null,
    });
  } catch {
    // Stilles Fehlschlagen — Analytics darf die App nie blockieren
  }
}

// ─── Page-View-Tracker ───────────────────────────────────────────────────────

/** Hilfsfunktion für usePageTracking-Hook (kein React-Import hier) */
export function createPageTracker(pageName: string) {
  const startTime = Date.now();

  // Page-View sofort tracken
  trackEvent("page_view", { page: pageName });

  // Scroll-Milestones
  let scroll50Tracked = false;
  let scroll90Tracked = false;

  function handleScroll() {
    if (typeof window === "undefined") return;
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    const pct = scrolled / total;

    if (!scroll50Tracked && pct >= 0.5) {
      scroll50Tracked = true;
      trackEvent("scroll_50", { page: pageName });
    }
    if (!scroll90Tracked && pct >= 0.9) {
      scroll90Tracked = true;
      trackEvent("scroll_90", { page: pageName });
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  // Cleanup-Funktion (für useEffect return)
  return function cleanup() {
    if (typeof window !== "undefined") {
      window.removeEventListener("scroll", handleScroll);
    }
    const dwellMs = Date.now() - startTime;
    trackEvent("page_exit", { page: pageName, dwellMs });
  };
}

// ─── Conversion-Events ───────────────────────────────────────────────────────

export function trackFragranceView(fragranceId: string, fragranceName: string) {
  return trackEvent("fragrance_view", {
    entityType: "fragrance",
    entityId: fragranceId,
    properties: { name: fragranceName },
  });
}

export function trackSearch(query: string, resultCount: number) {
  return trackEvent("search", {
    properties: { query, resultCount },
  });
}

export function trackButtonClick(label: string, page?: string) {
  return trackEvent("button_click", {
    page,
    properties: { label },
  });
}

export function trackImageUpload(context: "avatar" | "banner" | "fragrance" | "document") {
  return trackEvent("image_uploaded", { properties: { context } });
}

export function trackPifExport(fragranceId: string) {
  return trackEvent("pif_exported", { entityType: "fragrance", entityId: fragranceId });
}

export function trackLabelPrint(fragranceId: string) {
  return trackEvent("label_printed", { entityType: "fragrance", entityId: fragranceId });
}
