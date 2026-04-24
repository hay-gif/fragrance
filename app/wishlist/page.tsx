"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type WishlistFragrance = {
  wishlistId: string;
  fragranceId: string;
  name: string;
  priceCents: number;
  sizeMl: number;
  category: string;
  imageUrl: string;
  description: string;
  addedAt: string;
};

type DbWishlistRow = {
  id: string;
  fragrance_id: string;
  created_at: string;
  fragrances: {
    id: string;
    name: string;
    price_cents: number;
    size_ml: number;
    category: string | null;
    image_url: string | null;
    description: string | null;
  } | null;
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistFragrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadWishlist() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("wishlists")
        .select(
          "id, fragrance_id, created_at, fragrances(id, name, price_cents, size_ml, category, image_url, description)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der Wishlist:", error);
        setLoading(false);
        return;
      }

      const mapped: WishlistFragrance[] = (
        (data ?? []) as unknown as DbWishlistRow[]
      )
        .filter((row) => !!row.fragrances)
        .map((row) => ({
          wishlistId: row.id,
          fragranceId: row.fragrance_id,
          name: row.fragrances!.name,
          priceCents: row.fragrances!.price_cents,
          sizeMl: row.fragrances!.size_ml,
          category: row.fragrances!.category ?? "",
          imageUrl: row.fragrances!.image_url ?? "",
          description: row.fragrances!.description ?? "",
          addedAt: row.created_at,
        }));

      setItems(mapped);
      setLoading(false);
    }

    loadWishlist();
  }, []);

  async function removeFromWishlist(wishlistId: string) {
    setRemovingId(wishlistId);

    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("id", wishlistId);

    if (error) {
      console.error("Fehler beim Entfernen aus Wishlist:", error);
      setRemovingId(null);
      return;
    }

    setItems((prev) => prev.filter((item) => item.wishlistId !== wishlistId));
    setRemovingId(null);
  }

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

  if (notLoggedIn) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#0A0A0A]">Anmeldung erforderlich</h1>
          <p className="mt-2 text-sm text-[#6E6860]">Bitte logge dich ein.</p>
          <Link href="/auth" className="mt-6 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white">Zum Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      {/* Dark Header */}
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <div className="mx-auto max-w-3xl flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
            <h1 className="text-3xl font-bold text-white">Wishlist</h1>
            <p className="mt-1 text-xs text-white/40">
              {items.length} {items.length === 1 ? "gespeicherter Duft" : "gespeicherte Düfte"}
            </p>
          </div>
          <Link
            href="/discover"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:border-white/40 transition-colors mb-1"
          >
            Discover
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-8 text-center">
            <p className="text-sm text-[#6E6860]">Deine Wishlist ist leer.</p>
            <Link
              href="/discover"
              className="mt-4 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
            >
              Jetzt Düfte entdecken
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item.wishlistId} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <Link href={`/fragrance/${item.fragranceId}`}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="mb-4 h-40 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mb-4 flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-[#E5E0D8] text-sm text-[#C5C0B8]">
                      Kein Bild
                    </div>
                  )}
                </Link>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/fragrance/${item.fragranceId}`}
                      className="text-sm font-semibold text-[#0A0A0A] hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#9E9890]">{item.sizeMl} ml</p>
                    {item.category && (
                      <p className="text-xs text-[#9E9890]">{item.category}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#0A0A0A]">
                    {(item.priceCents / 100).toFixed(2)} €
                  </p>
                </div>

                {item.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-[#6E6860]">
                    {item.description}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/fragrance/${item.fragranceId}`}
                    className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                  >
                    Ansehen
                  </Link>
                  <button
                    onClick={() => removeFromWishlist(item.wishlistId)}
                    disabled={removingId === item.wishlistId}
                    className="rounded-full border border-red-200 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {removingId === item.wishlistId ? "..." : "Entfernen"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
