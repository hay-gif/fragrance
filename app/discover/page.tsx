"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAccordName } from "@/lib/accords";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";
import { scoreFragrances } from "@/lib/feedAlgorithm";
import { trackEvent } from "@/lib/tracking";
import type { FragrancePreferences } from "@/lib/profile";
import type { AlgoEvent } from "@/lib/feedAlgorithm";

type Fragrance = {
  id: string;
  name: string;
  composition: Record<string, number>;
  total: number;
  createdAt: string;
  ownerId: string | null;
  priceCents: number;
  sizeMl: number;
  description: string;
  category: string;
  imageUrl: string;
  avgRating: number;
  reviewCount: number;
};

type DbFragranceRow = {
  id: string;
  name: string;
  composition: Record<string, number>;
  total: number;
  created_at: string;
  owner_id: string | null;
  price_cents: number;
  size_ml: number;
  description: string | null;
  category: string | null;
  image_url: string | null;
};

type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type SortOption = "newest" | "oldest" | "price_asc" | "price_desc" | "rating" | "personalized";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Neueste",
  oldest: "Älteste",
  price_asc: "Preis ↑",
  price_desc: "Preis ↓",
  rating: "Beste Bewertung",
  personalized: "✦ Für dich",
};

// Category mood icons
const CATEGORY_ICONS: Record<string, string> = {
  woody: "🪵",
  fresh: "🌿",
  floral: "🌸",
  oriental: "✨",
  citrus: "🍋",
  aquatic: "💧",
  gourmand: "🍯",
  aromatic: "🌾",
  fougere: "🌿",
  chypre: "🍂",
};

// Category gradient backgrounds when no image is available
function getCategoryGradient(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("wood") || cat === "woody") return "linear-gradient(135deg, #8B6B4A 0%, #C4956A 50%, #E8C99A 100%)";
  if (cat.includes("fresh") || cat.includes("citrus") || cat.includes("aquat")) return "linear-gradient(135deg, #3D8B7A 0%, #6BBFAD 50%, #A8DDD3 100%)";
  if (cat.includes("floral")) return "linear-gradient(135deg, #C17A9B 0%, #E4A8C3 50%, #F5D5E5 100%)";
  if (cat.includes("oriental") || cat.includes("spic")) return "linear-gradient(135deg, #8B4A2B 0%, #C9853F 50%, #E8C06A 100%)";
  if (cat.includes("gourmand")) return "linear-gradient(135deg, #7B5C2E 0%, #C4925A 50%, #E8C99A 100%)";
  if (cat.includes("aromatic") || cat.includes("herb")) return "linear-gradient(135deg, #4A7B5C 0%, #7ABF8A 50%, #B8DFC4 100%)";
  return "linear-gradient(135deg, #6B7280 0%, #9CA3AF 50%, #D1D5DB 100%)";
}

function getCategoryIcon(category: string): string {
  const cat = category.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (cat.includes(key)) return icon;
  }
  return "◉";
}

// Psychological trigger helpers
function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function getPricePerHundredMl(priceCents: number, sizeMl: number): string {
  if (!sizeMl || sizeMl <= 0) return "";
  return ((priceCents / sizeMl) * 100 / 100).toFixed(2);
}

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white border border-[#E5E0D8] animate-pulse">
      <div className="h-52 bg-[#F0EDE8]" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#E5E0D8]" />
          <div className="h-3 w-20 rounded-full bg-[#E5E0D8]" />
        </div>
        <div className="h-4 w-3/4 rounded-full bg-[#E5E0D8]" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-full bg-[#F0EDE8]" />
          <div className="h-5 w-14 rounded-full bg-[#F0EDE8]" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 w-14 rounded-full bg-[#E5E0D8]" />
          <div className="h-4 w-20 rounded-full bg-[#E5E0D8]" />
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const searchParams = useSearchParams();

  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, PublicProfile>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [ftsResults, setFtsResults] = useState<Fragrance[] | null>(null);
  const [ftsLoading, setFtsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("category") ?? "",
  );
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const [trendingFragrances, setTrendingFragrances] = useState<Fragrance[]>([]);

  const [userPreferences, setUserPreferences] = useState<FragrancePreferences>({});
  const [personalizedScores, setPersonalizedScores] = useState<Map<string, number>>(new Map());

  // Wishlist state
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());
  const [wishlistIds, setWishlistIds] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [togglingWishlist, setTogglingWishlist] = useState<Set<string>>(new Set());

  // Debounced FTS: wenn Suchanfrage ≥ 3 Zeichen, Server-Side FTS statt Client-Filter
  useEffect(() => {
    const q = search.trim();
    if (q.length < 3) { setFtsResults(null); return; }
    setFtsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=fragrances&limit=50`);
        const data = await res.json();
        const rows: DbFragranceRow[] = data.fragrances ?? [];
        setFtsResults(rows.map((r) => ({
          id: r.id, name: r.name,
          composition: {}, total: 0,
          createdAt: r.created_at, ownerId: r.owner_id,
          priceCents: r.price_cents, sizeMl: r.size_ml,
          description: r.description ?? "", category: r.category ?? "",
          imageUrl: r.image_url ?? "", avgRating: 0, reviewCount: 0,
        })));
      } catch { setFtsResults(null); }
      finally { setFtsLoading(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function loadFragrances() {
      const { data, error } = await supabase
        .from("fragrances")
        .select("id, name, composition, total, created_at, owner_id, price_cents, size_ml, description, category, image_url")
        .eq("is_public", true)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der öffentlichen Düfte:", error);
        setLoading(false);
        return;
      }

      const fragranceIds = (data ?? []).map((r: DbFragranceRow) => r.id);
      const ownerIds = Array.from(new Set((data ?? []).map((r: DbFragranceRow) => r.owner_id).filter(Boolean))) as string[];

      // Run all independent queries in parallel
      const [reviewData, profileData, profile, authData] = await Promise.all([
        fragranceIds.length > 0
          ? supabase.from("fragrance_reviews").select("fragrance_id, rating").in("fragrance_id", fragranceIds).then((r) => r.data)
          : Promise.resolve(null),
        ownerIds.length > 0
          ? supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ownerIds).then((r) => r.data)
          : Promise.resolve(null),
        getOwnProfile(),
        supabase.auth.getUser().then((r) => r.data),
      ]);

      // Build rating map
      let ratingMap: Record<string, { sum: number; count: number }> = {};
      if (reviewData) {
        for (const row of reviewData as { fragrance_id: string; rating: number }[]) {
          const existing = ratingMap[row.fragrance_id];
          if (!existing) {
            ratingMap[row.fragrance_id] = { sum: row.rating, count: 1 };
          } else {
            existing.sum += row.rating;
            existing.count += 1;
          }
        }
      }

      const mapped: Fragrance[] = (data ?? []).map((row: DbFragranceRow) => {
        const r = ratingMap[row.id];
        return {
          id: row.id,
          name: row.name,
          composition: row.composition,
          total: row.total,
          createdAt: row.created_at,
          ownerId: row.owner_id,
          priceCents: row.price_cents,
          sizeMl: row.size_ml,
          description: row.description ?? "",
          category: row.category ?? "",
          imageUrl: row.image_url ?? "",
          avgRating: r ? r.sum / r.count : 0,
          reviewCount: r ? r.count : 0,
        };
      });

      setFragrances(mapped);

      // Trending: reuse already-loaded data, no extra query needed
      setTrendingFragrances(mapped.slice(0, 6));

      // Apply parallel results
      if (profileData) {
        const map: Record<string, PublicProfile> = {};
        for (const p of profileData) map[p.id] = p;
        setProfilesById(map);
      }

      if (profile?.fragrance_preferences) {
        const prefs = profile.fragrance_preferences;
        setUserPreferences(prefs);

        const { data: eventRows } = await supabase
          .from("user_events")
          .select("entity_id, event_type, metadata")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(500);

        if (eventRows && eventRows.length > 0) {
          const scores = scoreFragrances(
            mapped.map((f) => ({ id: f.id, category: f.category, priceCents: f.priceCents })),
            prefs,
            eventRows as AlgoEvent[],
          );
          setPersonalizedScores(scores);
        }
      }

      const user = authData?.user ?? null;
      if (user) {
        setCurrentUserId(user.id);
        const { data: wlData } = await supabase
          .from("wishlists")
          .select("id, fragrance_id")
          .eq("user_id", user.id);
        if (wlData) {
          const wSet = new Set<string>();
          const wIds: Record<string, string> = {};
          for (const row of wlData as { id: string; fragrance_id: string }[]) {
            wSet.add(row.fragrance_id);
            wIds[row.fragrance_id] = row.id;
          }
          setWishlisted(wSet);
          setWishlistIds(wIds);
        }
      }

      setLoading(false);
    }

    loadFragrances();
  }, []);

  async function toggleWishlist(e: React.MouseEvent, fragranceId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId || togglingWishlist.has(fragranceId)) return;

    setTogglingWishlist((prev) => new Set(prev).add(fragranceId));

    if (wishlisted.has(fragranceId)) {
      const wId = wishlistIds[fragranceId];
      if (wId) {
        await supabase.from("wishlists").delete().eq("id", wId);
        setWishlisted((prev) => { const next = new Set(prev); next.delete(fragranceId); return next; });
        setWishlistIds((prev) => { const next = { ...prev }; delete next[fragranceId]; return next; });
      }
    } else {
      const { data: newWl } = await supabase
        .from("wishlists")
        .insert({ user_id: currentUserId, fragrance_id: fragranceId })
        .select("id")
        .single();
      if (newWl) {
        setWishlisted((prev) => new Set(prev).add(fragranceId));
        setWishlistIds((prev) => ({ ...prev, [fragranceId]: newWl.id }));
        trackEvent({ eventType: "wishlist_add", entityType: "fragrance", entityId: fragranceId });
      }
    }

    setTogglingWishlist((prev) => { const next = new Set(prev); next.delete(fragranceId); return next; });
  }

  // Alle verfügbaren Kategorien aus den geladenen Düften
  const allCategories = useMemo(() => {
    const cats = Array.from(
      new Set(fragrances.map((f) => f.category).filter(Boolean)),
    ).sort();
    return cats;
  }, [fragrances]);

  // Gefiltert + sortiert — nutzt FTS-Ergebnisse wenn query ≥ 3 Zeichen
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minCents = minPrice ? Number(minPrice) * 100 : null;
    const maxCents = maxPrice ? Number(maxPrice) * 100 : null;

    // Server-FTS aktiv: nur noch Preis/Kategorie-Filter anwenden
    const base = ftsResults !== null ? ftsResults : fragrances;

    let result = base.filter((f) => {
      if (!ftsResults && q && !f.name.toLowerCase().includes(q) && !f.description.toLowerCase().includes(q)) {
        return false;
      }
      if (activeCategory && f.category !== activeCategory) return false;
      if (minCents !== null && f.priceCents < minCents) return false;
      if (maxCents !== null && f.priceCents > maxCents) return false;
      return true;
    });

    switch (sort) {
      case "oldest":
        result = [...result].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "price_asc":
        result = [...result].sort((a, b) => a.priceCents - b.priceCents);
        break;
      case "price_desc":
        result = [...result].sort((a, b) => b.priceCents - a.priceCents);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.avgRating - a.avgRating);
        break;
      case "personalized":
        result = [...result].sort(
          (a, b) => (personalizedScores.get(b.id) ?? 0) - (personalizedScores.get(a.id) ?? 0),
        );
        break;
      default:
        result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return result;
  }, [fragrances, ftsResults, search, activeCategory, minPrice, maxPrice, sort, personalizedScores]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8]">
        {/* Header skeleton */}
        <div className="bg-[#0A0A0A] px-5 pt-20 pb-10">
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="h-3 w-24 rounded-full bg-white/10 animate-pulse" />
            <div className="h-12 w-40 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-4 w-72 rounded-full bg-white/10 animate-pulse" />
            <div className="mt-4 h-12 w-full rounded-2xl bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pt-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* ── Hero Header ────────────────────────────────────── */}
      <div className="relative bg-[#0A0A0A] px-5 pt-20 pb-10 overflow-hidden">
        {/* Subtle radial gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 120%, rgba(201,169,110,0.15) 0%, transparent 70%)",
          }}
        />
        {/* Fine dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-white/30">
            Fragrance OS
          </p>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-5xl font-bold text-white leading-none tracking-tight">
                Discover
              </h1>
              {/* Gold accent line */}
              <div className="mt-3 h-px w-16 bg-gradient-to-r from-[#C9A96E] to-transparent" />
            </div>
            <Link
              href="/create"
              className="shrink-0 mt-1 rounded-full border border-white/20 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/60 hover:border-[#C9A96E]/60 hover:text-[#C9A96E] transition-colors duration-200"
            >
              + Erstellen
            </Link>
          </div>

          <p className="mt-4 text-sm text-white/40 max-w-md leading-relaxed">
            Entdecke einzigartige Düfte von unabhängigen Creatoren
          </p>

          {/* Search bar — glass morphism */}
          <div className="mt-6 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
              {ftsLoading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-transparent animate-spin block" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value.trim().length > 2) {
                  trackEvent({ eventType: "search", metadata: { query: e.target.value.trim() } });
                }
              }}
              placeholder="Düfte, Noten oder Creator suchen…"
              className="w-full rounded-2xl bg-white/10 backdrop-blur border border-white/20 pl-10 pr-5 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/15 focus:outline-none transition-all duration-200"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5">
        {/* ── Sticky Filter Bar ──────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-[#FAFAF8] pt-4 pb-3 border-b border-[#E5E0D8]">
          {/* Sort + price row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-full appearance-none rounded-full border border-[#E5E0D8] bg-white px-4 py-2 text-xs text-[#6E6860] focus:border-[#0A0A0A] focus:outline-none transition-colors pr-7 font-medium uppercase tracking-wider"
              >
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9890] text-[10px]">
                ▾
              </span>
            </div>

            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min €"
              min={0}
              className="w-20 shrink-0 rounded-full border border-[#E5E0D8] bg-white px-3 py-2 text-xs text-[#6E6860] focus:border-[#0A0A0A] focus:outline-none transition-colors text-center"
            />
            <span className="text-[#C5C0B8] text-xs shrink-0">–</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max €"
              min={0}
              className="w-20 shrink-0 rounded-full border border-[#E5E0D8] bg-white px-3 py-2 text-xs text-[#6E6860] focus:border-[#0A0A0A] focus:outline-none transition-colors text-center"
            />

            {(search || activeCategory || minPrice || maxPrice || sort !== "newest") && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory("");
                  setMinPrice("");
                  setMaxPrice("");
                  setSort("newest");
                }}
                className="shrink-0 rounded-full border border-[#E5E0D8] bg-white px-3 py-2 text-[10px] uppercase tracking-wider text-[#9E9890] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {/* Category pills */}
          {allCategories.length > 0 && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              <button
                onClick={() => setActiveCategory("")}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  activeCategory === ""
                    ? "bg-[#0A0A0A] text-white border-transparent"
                    : "border-[#E5E0D8] text-[#6E6860] bg-white hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                }`}
              >
                <span>◈</span>
                <span>Alle</span>
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    const next = activeCategory === cat ? "" : cat;
                    setActiveCategory(next);
                    if (next) trackEvent({ eventType: "category_filter", metadata: { category: cat } });
                  }}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    activeCategory === cat
                      ? "bg-[#0A0A0A] text-white border-transparent"
                      : "border-[#E5E0D8] text-[#6E6860] bg-white hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                  }`}
                >
                  <span>{getCategoryIcon(cat)}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          )}

          {/* Result count */}
          <p className="mt-2 text-[10px] uppercase tracking-widest text-[#9E9890]">
            {filtered.length} {filtered.length === 1 ? "Duft" : "Düfte"}
          </p>
        </div>

        {/* ── Trending Section ────────────────────────────────── */}
        {trendingFragrances.length > 0 && !search && !activeCategory && (
          <div className="mb-6 mt-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" />
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#9E9890] font-medium">
                Trending
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {trendingFragrances.map((f) => (
                <Link
                  key={f.id}
                  href={`/fragrance/${f.id}`}
                  className="group shrink-0 w-48 overflow-hidden rounded-2xl bg-white border border-[#E5E0D8] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                >
                  {/* Image */}
                  <div className="relative h-28 overflow-hidden">
                    {f.imageUrl ? (
                      <img
                        src={f.imageUrl}
                        alt={f.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center"
                        style={{ background: getCategoryGradient(f.category) }}
                      >
                        <span className="text-2xl opacity-60">{getCategoryIcon(f.category)}</span>
                      </div>
                    )}
                    {/* TRENDING label */}
                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[9px] uppercase tracking-wider text-white font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C9A96E]" />
                      Trending
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <p className="truncate text-xs font-semibold text-[#0A0A0A] leading-tight">{f.name}</p>
                    {f.category && (
                      <p className="mt-0.5 text-[10px] text-[#9E9890] uppercase tracking-wider truncate">{f.category}</p>
                    )}
                    <p className="mt-1 text-[11px] font-medium text-[#C9A96E]">
                      {(f.priceCents / 100).toFixed(2)} €
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Main Grid ────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          /* Empty State */
          <div className="py-24 flex flex-col items-center text-center gap-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-2xl"
              style={{ background: "linear-gradient(135deg, #F5F0EA 0%, #E8E0D4 100%)" }}
            >
              <span style={{ color: "#C9A96E" }}>◉</span>
            </div>
            <div>
              <p className="text-base font-semibold text-[#0A0A0A]">Keine Düfte gefunden</p>
              <p className="mt-1 text-sm text-[#9E9890] max-w-xs">
                Passe deine Filter an oder entdecke alle verfügbaren Kreationen.
              </p>
            </div>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("");
                setMinPrice("");
                setMaxPrice("");
              }}
              className="mt-1 rounded-full border border-[#C9A96E] px-5 py-2 text-xs font-medium uppercase tracking-wider text-[#C9A96E] hover:bg-[#C9A96E] hover:text-white transition-colors duration-200"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((fragrance) => {
              const topComponents = Object.entries(fragrance.composition)
                .filter(([, percent]) => percent > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

              const ownerProfile = fragrance.ownerId ? profilesById[fragrance.ownerId] : null;
              const isWishlisted = wishlisted.has(fragrance.id);
              const isToggling = togglingWishlist.has(fragrance.id);

              return (
                <Link
                  key={fragrance.id}
                  href={`/fragrance/${fragrance.id}`}
                  className="group block rounded-3xl overflow-hidden bg-white border border-[#E5E0D8] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Image area */}
                  <div className="relative h-52 overflow-hidden">
                    {fragrance.imageUrl ? (
                      <img
                        src={fragrance.imageUrl}
                        alt={fragrance.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center"
                        style={{ background: getCategoryGradient(fragrance.category) }}
                      >
                        <span className="text-4xl opacity-40">{getCategoryIcon(fragrance.category)}</span>
                      </div>
                    )}

                    {/* Category pill — top left */}
                    {fragrance.category && (
                      <span className="absolute top-3 left-3 rounded-full bg-black/40 backdrop-blur px-2.5 py-1 text-[10px] text-white uppercase tracking-wider font-medium">
                        {fragrance.category}
                      </span>
                    )}

                    {/* NEU / Bestseller badge — bottom left */}
                    {isNew(fragrance.createdAt) ? (
                      <span className="absolute bottom-3 left-3 rounded-full bg-[#C9A96E] px-2.5 py-1 text-[9px] font-bold text-[#0A0A0A] uppercase tracking-widest shadow-sm">
                        NEU
                      </span>
                    ) : fragrance.avgRating >= 4.5 && fragrance.reviewCount >= 5 ? (
                      <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-2.5 py-1 text-[9px] font-bold text-[#0A0A0A] uppercase tracking-widest shadow-sm">
                        <span className="text-[#C9A96E]">★</span> Bestseller
                      </span>
                    ) : null}

                    {/* Wishlist heart — top right */}
                    {currentUserId && (
                      <button
                        onClick={(e) => toggleWishlist(e, fragrance.id)}
                        disabled={isToggling}
                        className={`absolute top-3 right-3 h-7 w-7 rounded-full flex items-center justify-center backdrop-blur transition-all duration-200 ${
                          isWishlisted
                            ? "bg-white/90 text-[#E05C5C]"
                            : "bg-black/40 text-white/70 hover:bg-white/90 hover:text-[#E05C5C]"
                        } ${isToggling ? "opacity-50" : ""}`}
                        aria-label={isWishlisted ? "Von Wishlist entfernen" : "Zur Wishlist hinzufügen"}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill={isWishlisted ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M7 12.25C7 12.25 1.75 9.1 1.75 5.25a3.25 3.25 0 0 1 5.25-2.56A3.25 3.25 0 0 1 12.25 5.25C12.25 9.1 7 12.25 7 12.25Z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    {/* Creator */}
                    {ownerProfile && (
                      <div className="mb-2.5 flex items-center gap-1.5">
                        {ownerProfile.avatar_url ? (
                          <img
                            src={ownerProfile.avatar_url}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover ring-1 ring-[#E5E0D8]"
                          />
                        ) : (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0EDE8] text-[8px] font-semibold text-[#9E9890] ring-1 ring-[#E5E0D8]">
                            {(ownerProfile.display_name || ownerProfile.username || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-[11px] text-[#9E9890] truncate">
                          {ownerProfile.display_name || ownerProfile.username || "Creator"}
                        </span>
                      </div>
                    )}

                    {/* Name */}
                    <p className="text-base font-semibold text-[#0A0A0A] leading-snug truncate">
                      {fragrance.name}
                    </p>

                    {/* Top accords */}
                    {topComponents.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {topComponents.map(([accordId, percent]) => (
                          <span
                            key={accordId}
                            className="rounded-full bg-[#F5F0EA] px-2 py-0.5 text-[10px] text-[#6E6860]"
                          >
                            {getAccordName(accordId)} · {percent}%
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Rating */}
                    {fragrance.reviewCount > 0 ? (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className={`text-[11px] ${s <= Math.round(fragrance.avgRating) ? "text-[#C9A96E]" : "text-[#E5E0D8]"}`}>★</span>
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-[#0A0A0A]">{fragrance.avgRating.toFixed(1)}</span>
                        <span className="text-[10px] text-[#9E9890]">({fragrance.reviewCount} Bewertungen)</span>
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] text-[#B8B0A8] italic">Noch keine Bewertungen</p>
                    )}

                    {/* Bottom row: price + Grundpreis + CTA */}
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className="text-sm font-bold text-[#0A0A0A]">
                          {(fragrance.priceCents / 100).toFixed(2).replace(".", ",")} €
                        </span>
                        {fragrance.sizeMl > 0 && (
                          <p className="text-[10px] text-[#9E9890] leading-tight">
                            {getPricePerHundredMl(fragrance.priceCents, fragrance.sizeMl)} €/100ml · {fragrance.sizeMl}ml
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[#9E9890] group-hover:text-[#C9A96E] transition-colors duration-200 font-medium shrink-0">
                        Entdecken →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
