import type { FragrancePreferences } from "./profile";

export type AlgoFragrance = {
  id: string;
  category: string;
  priceCents: number;
  accordNames?: string[];
};

export type AlgoEvent = {
  entity_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
};

// Keyword → preference family key
const FAMILY_KEYWORDS: [string, string][] = [
  ["floral", "floral"],    ["blumig", "floral"],    ["rose", "floral"],
  ["jasmin", "floral"],    ["jasmine", "floral"],
  ["woody", "woody"],      ["holzig", "woody"],     ["cedar", "woody"],
  ["sandalwood", "woody"], ["vetiver", "woody"],    ["oud", "woody"],
  ["oriental", "oriental"],["orientalisch", "oriental"], ["amber", "oriental"],
  ["vanilla", "oriental"], ["vanille", "oriental"],
  ["fresh", "fresh"],      ["frisch", "fresh"],     ["aqua", "fresh"],
  ["marine", "fresh"],     ["ocean", "fresh"],
  ["citrus", "citrus"],    ["zitrus", "citrus"],    ["lemon", "citrus"],
  ["bergamot", "citrus"],  ["orange", "citrus"],    ["grapefruit", "citrus"],
  ["powder", "powdery"],   ["pudrig", "powdery"],   ["iris", "powdery"],
  ["talcum", "powdery"],
  ["green", "green"],      ["grün", "green"],       ["herb", "green"],
  ["fougere", "green"],    ["grass", "green"],
  ["gourmand", "gourmand"],["sweet", "gourmand"],   ["süß", "gourmand"],
  ["chocolate", "gourmand"],["caramel", "gourmand"],
  ["leather", "leather"],  ["leder", "leather"],    ["tobacco", "leather"],
  ["musk", "musk"],        ["moschus", "musk"],     ["white musk", "musk"],
];

function extractFamilies(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, family] of FAMILY_KEYWORDS) {
    if (lower.includes(keyword)) found.add(family);
  }
  return Array.from(found);
}

/**
 * Score fragrances for a personalized feed.
 * Returns a map of fragrance ID → score (higher = more relevant).
 */
export function scoreFragrances(
  fragrances: AlgoFragrance[],
  preferences: FragrancePreferences,
  recentEvents: AlgoEvent[],
): Map<string, number> {
  const scores = new Map<string, number>();

  // Aggregate behavior maps
  const viewMap = new Map<string, number>();
  const cartMap = new Map<string, number>();
  const wishMap = new Map<string, number>();
  const orderMap = new Map<string, number>();
  const searchTerms: string[] = [];
  const categoryFilters: string[] = [];

  for (const ev of recentEvents) {
    const id = ev.entity_id;
    const inc = (m: Map<string, number>) => {
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    };
    switch (ev.event_type) {
      case "fragrance_view":    inc(viewMap);  break;
      case "cart_add":          inc(cartMap);  break;
      case "wishlist_add":      inc(wishMap);  break;
      case "order_placed":      inc(orderMap); break;
      case "search":
        if (ev.metadata?.query) searchTerms.push(String(ev.metadata.query).toLowerCase());
        break;
      case "category_filter":
        if (ev.metadata?.category) categoryFilters.push(String(ev.metadata.category).toLowerCase());
        break;
    }
  }

  for (const frag of fragrances) {
    let score = 0;

    // Gather family signals from category + accord names
    const fragFamilies = new Set<string>([
      ...extractFamilies(frag.category),
      ...(frag.accordNames ?? []).flatMap(extractFamilies),
    ]);

    // Preference: family match (+4 per hit)
    if (preferences.families?.length) {
      for (const f of fragFamilies) {
        if (preferences.families.includes(f)) score += 4;
      }
    }

    // Preference: price range
    if (preferences.price_max && preferences.price_max > 0) {
      score += frag.priceCents <= preferences.price_max ? 2 : -1;
    }

    // Behavioral: previously filtered to same category
    const catLower = frag.category.toLowerCase();
    if (categoryFilters.some((c) => catLower.includes(c) || c.includes(catLower))) {
      score += 3;
    }

    // Behavioral: search term matches accord names
    if (searchTerms.length > 0) {
      const names = (frag.accordNames ?? []).map((a) => a.toLowerCase());
      if (searchTerms.some((t) => names.some((n) => n.includes(t)) || catLower.includes(t))) {
        score += 2;
      }
    }

    // Behavioral: interaction signals
    score += Math.min(viewMap.get(frag.id) ?? 0, 3) * 1;  // views, capped at 3
    score += (cartMap.get(frag.id) ?? 0) * 3;              // cart adds
    score += (wishMap.get(frag.id) ?? 0) * 5;              // wishlist
    score += (orderMap.get(frag.id) ?? 0) * 2;             // orders

    scores.set(frag.id, score);
  }

  return scores;
}
