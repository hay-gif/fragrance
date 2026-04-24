"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type TopFragrance = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  priceCents: number;
  ownerUsername: string | null;
  ownerDisplayName: string | null;
  orderCount: number;
  avgRating: number;
};

type TopCreator = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  fragranceCount: number;
};

export default function RankingsPage() {
  const [topFragrances, setTopFragrances] = useState<TopFragrance[]>([]);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"fragrances" | "creators">("fragrances");

  useEffect(() => {
    async function load() {
      // Top Düfte: sortiert nach Bewertung + neueste
      const { data: fragRows } = await supabase
        .from("fragrances")
        .select("id, name, category, image_url, price_cents, owner_id, profiles:owner_id(username, display_name)")
        .eq("is_public", true)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      // Bewertungen laden
      const fragIds = (fragRows ?? []).map((r: { id: string }) => r.id);
      let reviewMap: Record<string, { count: number; avg: number }> = {};

      if (fragIds.length > 0) {
        const { data: reviewRows } = await supabase
          .from("fragrance_reviews")
          .select("fragrance_id, rating")
          .in("fragrance_id", fragIds);

        for (const row of (reviewRows ?? []) as { fragrance_id: string; rating: number }[]) {
          if (!reviewMap[row.fragrance_id]) reviewMap[row.fragrance_id] = { count: 0, avg: 0 };
          reviewMap[row.fragrance_id].count++;
          reviewMap[row.fragrance_id].avg += row.rating;
        }
        for (const id of Object.keys(reviewMap)) {
          reviewMap[id].avg = reviewMap[id].avg / reviewMap[id].count;
        }
      }

      type FragRow = {
        id: string;
        name: string;
        category: string | null;
        image_url: string | null;
        price_cents: number;
        owner_id: string | null;
        profiles: { username: string | null; display_name: string | null } | { username: string | null; display_name: string | null }[] | null;
      };

      const mapped: TopFragrance[] = ((fragRows ?? []) as FragRow[])
        .map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          imageUrl: r.image_url,
          priceCents: r.price_cents,
          ownerUsername: (Array.isArray(r.profiles) ? r.profiles[0]?.username : r.profiles?.username) ?? null,
          ownerDisplayName: (Array.isArray(r.profiles) ? r.profiles[0]?.display_name : r.profiles?.display_name) ?? null,
          orderCount: 0,
          avgRating: reviewMap[r.id]?.avg ?? 0,
        }))
        .sort((a, b) => {
          // Sort: avg rating desc, then count desc
          if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
          return (reviewMap[b.id]?.count ?? 0) - (reviewMap[a.id]?.count ?? 0);
        })
        .slice(0, 20);

      setTopFragrances(mapped);

      // Top Creators: nach Anzahl Düfte
      const { data: creatorRows } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .eq("role", "creator")
        .limit(20);

      if (creatorRows && creatorRows.length > 0) {
        const creatorIds = creatorRows.map((c: { id: string }) => c.id);
        const { data: countRows } = await supabase
          .from("fragrances")
          .select("owner_id")
          .in("owner_id", creatorIds)
          .eq("is_public", true)
          .eq("status", "active");

        const countMap: Record<string, number> = {};
        for (const row of (countRows ?? []) as { owner_id: string }[]) {
          countMap[row.owner_id] = (countMap[row.owner_id] ?? 0) + 1;
        }

        type CreatorRow = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; bio: string | null };
        const creators: TopCreator[] = ((creatorRows as CreatorRow[]))
          .map((c) => ({
            id: c.id,
            username: c.username,
            displayName: c.display_name,
            avatarUrl: c.avatar_url,
            bio: c.bio,
            fragranceCount: countMap[c.id] ?? 0,
          }))
          .sort((a, b) => b.fragranceCount - a.fragranceCount);

        setTopCreators(creators);
      }

      setLoading(false);
    }

    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      {/* Header */}
      <div className="relative bg-[#0A0A0A] px-5 pt-24 pb-10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(201,169,110,0.12) 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto max-w-4xl">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/30">Fragrance OS</p>
          <h1 className="text-5xl font-bold text-white leading-none">Rankings</h1>
          <div className="mt-3 h-px w-12 bg-gradient-to-r from-[#C9A96E] to-transparent" />
          <p className="mt-3 text-sm text-white/40">Die besten Düfte und Creator auf der Plattform</p>

          {/* Tabs */}
          <div className="mt-8 flex gap-2">
            <button
              onClick={() => setTab("fragrances")}
              className={`rounded-full px-5 py-2 text-xs font-medium uppercase tracking-wider transition-all ${tab === "fragrances" ? "bg-white text-[#0A0A0A]" : "border border-white/20 text-white/60 hover:border-white/50 hover:text-white"}`}
            >
              ◉ Top Düfte
            </button>
            <button
              onClick={() => setTab("creators")}
              className={`rounded-full px-5 py-2 text-xs font-medium uppercase tracking-wider transition-all ${tab === "creators" ? "bg-white text-[#0A0A0A]" : "border border-white/20 text-white/60 hover:border-white/50 hover:text-white"}`}
            >
              ◆ Top Creator
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 pt-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-[#E5E0D8] p-4 animate-pulse flex items-center gap-4">
                <div className="h-6 w-6 rounded-full bg-[#F0EDE8] shrink-0" />
                <div className="h-14 w-14 rounded-2xl bg-[#F0EDE8] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F0EDE8] rounded-full w-1/2" />
                  <div className="h-3 bg-[#F0EDE8] rounded-full w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : tab === "fragrances" ? (
          <div className="space-y-2">
            {topFragrances.length === 0 ? (
              <div className="py-16 text-center text-[#9E9890]">
                <span className="text-4xl block mb-3 opacity-30">◉</span>
                <p className="text-sm">Noch keine bewerteten Düfte vorhanden.</p>
              </div>
            ) : topFragrances.map((frag, i) => (
              <Link
                key={frag.id}
                href={`/fragrance/${frag.id}`}
                className="group flex items-center gap-4 rounded-2xl bg-white border border-[#E5E0D8] p-4 hover:bg-[#F5F3F0] hover:border-[#C9A96E]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 cursor-pointer"
              >
                {/* Rank */}
                {i === 0 ? (
                  <span className="shrink-0 w-7 text-center text-lg" title="Gold">🥇</span>
                ) : i === 1 ? (
                  <span className="shrink-0 w-7 text-center text-lg" title="Silber">🥈</span>
                ) : i === 2 ? (
                  <span className="shrink-0 w-7 text-center text-lg" title="Bronze">🥉</span>
                ) : (
                  <span className="shrink-0 w-7 text-center">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#F5F0EA] text-[11px] font-bold text-[#9E9890]">{i + 1}</span>
                  </span>
                )}

                {/* Image */}
                <div className="shrink-0 h-14 w-14 rounded-2xl overflow-hidden bg-[#F5F0EA]">
                  {frag.imageUrl ? (
                    <img src={frag.imageUrl} alt={frag.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#C9A96E] text-xl">◉</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0A0A0A] text-sm truncate">{frag.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {frag.category && (
                      <span className="text-[10px] uppercase tracking-wider text-[#9E9890]">{frag.category}</span>
                    )}
                    {frag.ownerUsername && (
                      <>
                        <span className="text-[#E5E0D8]">·</span>
                        <span className="text-[10px] text-[#9E9890]">@{frag.ownerUsername}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Rating */}
                <div className="shrink-0 text-right">
                  {frag.avgRating > 0 ? (
                    <>
                      <div className="flex items-center gap-1 justify-end">
                        {"★★★★★".split("").map((s, j) => (
                          <span key={j} className={`text-xs ${j < Math.round(frag.avgRating) ? "text-[#C9A96E]" : "text-[#E5E0D8]"}`}>{s}</span>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#9E9890] mt-0.5">{frag.avgRating.toFixed(1)}</p>
                    </>
                  ) : (
                    <span className="text-[10px] text-[#C5C0B8]">Neu</span>
                  )}
                </div>

                {/* Price */}
                <span className="shrink-0 text-sm font-semibold text-[#0A0A0A]">
                  {(frag.priceCents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {topCreators.length === 0 ? (
              <div className="py-16 text-center text-[#9E9890]">
                <span className="text-4xl block mb-3 opacity-30">◆</span>
                <p className="text-sm">Noch keine Creator vorhanden.</p>
              </div>
            ) : topCreators.map((creator, i) => (
              <Link
                key={creator.id}
                href={creator.username ? `/creator/${creator.username}` : "#"}
                className="group flex items-center gap-4 rounded-2xl bg-white border border-[#E5E0D8] p-4 hover:bg-[#F5F3F0] hover:border-[#C9A96E]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 cursor-pointer"
              >
                {/* Rank */}
                {i === 0 ? (
                  <span className="shrink-0 w-7 text-center text-lg" title="Gold">🥇</span>
                ) : i === 1 ? (
                  <span className="shrink-0 w-7 text-center text-lg" title="Silber">🥈</span>
                ) : i === 2 ? (
                  <span className="shrink-0 w-7 text-center text-lg" title="Bronze">🥉</span>
                ) : (
                  <span className="shrink-0 w-7 text-center">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#F5F0EA] text-[11px] font-bold text-[#9E9890]">{i + 1}</span>
                  </span>
                )}

                {/* Avatar */}
                <div className="shrink-0 h-12 w-12 rounded-full overflow-hidden bg-[#F5F0EA] border border-[#E5E0D8]">
                  {creator.avatarUrl ? (
                    <img src={creator.avatarUrl} alt={creator.displayName || creator.username || "Creator"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[#9E9890] text-sm font-medium">
                      {(creator.displayName || creator.username || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#0A0A0A] text-sm">
                    {creator.displayName || creator.username || "Creator"}
                  </h3>
                  {creator.username && (
                    <p className="text-[10px] text-[#9E9890] mt-0.5">@{creator.username}</p>
                  )}
                </div>

                {/* Fragrance count */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[#0A0A0A]">{creator.fragranceCount}</p>
                  <p className="text-[10px] text-[#9E9890]">{creator.fragranceCount === 1 ? "Duft" : "Düfte"}</p>
                </div>

                <span className="shrink-0 text-[#C5C0B8] group-hover:text-[#C9A96E] transition-colors">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
