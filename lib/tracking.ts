import { supabase } from "@/lib/supabase";

export type TrackEventType =
  | "fragrance_view"
  | "wishlist_add"
  | "wishlist_remove"
  | "cart_add"
  | "order_placed"
  | "review_submit"
  | "search"
  | "category_filter"
  | "brand_click"
  | "creator_view"
  | "onboarding_complete";

export async function trackEvent({
  eventType,
  entityType,
  entityId,
  metadata = {},
}: {
  eventType: TrackEventType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("user_events").insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      metadata,
    });
  } catch {
    // Tracking-Fehler sollen nie die UX blockieren
  }
}
