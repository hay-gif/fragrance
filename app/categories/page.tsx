"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CategoryStat = {
  category: string;
  count: number;
  minPriceCents: number;
  maxPriceCents: number;
  sampleImageUrl: string | null;
};

type DbRow = {
  category: string | null;
  price_cents: number;
  image_url: string | null;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("fragrances")
        .select("category, price_cents, image_url")
        .eq("is_public", true)
        .eq("status", "active")
        .not("category", "is", null);

      if (error || !data) {
        setLoading(false);
        return;
      }

      const map = new Map<string, CategoryStat>();

      for (const row of data as DbRow[]) {
        const cat = row.category?.trim();
        if (!cat) continue;

        const existing = map.get(cat);
        if (!existing) {
          map.set(cat, {
            category: cat,
            count: 1,
            minPriceCents: row.price_cents,
            maxPriceCents: row.price_cents,
            sampleImageUrl: row.image_url ?? null,
          });
        } else {
          existing.count += 1;
          existing.minPriceCents = Math.min(existing.minPriceCents, row.price_cents);
          existing.maxPriceCents = Math.max(existing.maxPriceCents, row.price_cents);
          if (!existing.sampleImageUrl && row.image_url) {
            existing.sampleImageUrl = row.image_url;
          }
        }
      }

      const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
      setCategories(sorted);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Lädt</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Kategorien</h1>
            <p className="mt-1 text-xs text-white/40">Entdecke Düfte nach Duftfamilie.</p>
          </div>
          <Link
            href="/discover"
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white hover:border-white/60 transition-colors"
          >
            Alle Düfte
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        {categories.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
            <p className="text-sm text-[#6E6860]">Noch keine kategorisierten Düfte vorhanden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.category}
                href={`/discover?category=${encodeURIComponent(cat.category)}`}
                className="rounded-2xl bg-white border border-[#E5E0D8] overflow-hidden transition-all hover:shadow-md hover:border-[#C5C0B8] cursor-pointer"
              >
                {cat.sampleImageUrl ? (
                  <img
                    src={cat.sampleImageUrl}
                    alt={cat.category}
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="h-32 w-full bg-[#F0EDE8]" />
                )}

                <div className="p-5">
                  <h2 className="text-sm font-semibold text-[#0A0A0A]">{cat.category}</h2>
                  <p className="mt-0.5 text-xs text-[#9E9890]">
                    {cat.count} {cat.count === 1 ? "Duft" : "Düfte"}
                  </p>
                  <p className="mt-1 text-[10px] text-[#C5C0B8]">
                    {cat.minPriceCents === cat.maxPriceCents
                      ? `${(cat.minPriceCents / 100).toFixed(2)} €`
                      : `${(cat.minPriceCents / 100).toFixed(2)} – ${(cat.maxPriceCents / 100).toFixed(2)} €`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
