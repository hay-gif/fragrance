"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccordName } from "@/lib/accords";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/tracking";
import type { SocialLinks } from "@/lib/profile";
import ShareButton from "@/components/ShareButton";

type SavedFragrance = {
  id: string;
  name: string;
  composition: Record<string, number>;
  total: number;
  createdAt: string;
  creatorId: string | null;
  ownerId: string | null;
  isPublic: boolean;
  priceCents: number;
  status: "draft" | "active";
  sizeMl: number;
  description: string;
  category: string;
  sampleStatus: "not_requested" | "requested" | "shipped" | "tested";
  imageUrl: string;
};

type DbFragranceRow = {
  id: string;
  name: string;
  composition: Record<string, number>;
  total: number;
  created_at: string;
  creator_id: string | null;
  owner_id: string | null;
  is_public: boolean;
  price_cents: number;
  status: "draft" | "active";
  size_ml: number;
  description: string | null;
  category: string | null;
  sample_status: "not_requested" | "requested" | "shipped" | "tested";
  image_url: string | null;
};

type CreatorProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  social_link: string | null;
  social_links: SocialLinks;
  avatar_url: string | null;
};

type Review = {
  id: string;
  userId: string;
  rating: number;
  longevity: number | null;
  valueForMoney: number | null;
  seasons: string[];
  occasion: string | null;
  genderFit: string | null;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
  username: string | null;
  displayName: string | null;
};

type DbReviewRow = {
  id: string;
  user_id: string;
  rating: number;
  longevity: number | null;
  sillage: number | null;
  value_for_money: number | null;
  seasons: string[];
  occasion: string | null;
  gender_fit: string | null;
  body: string;
  verified_purchase: boolean;
  created_at: string;
  profiles: {
    username: string | null;
    display_name: string | null;
  } | null;
};

const LONGEVITY_LABELS = ["", "Sehr kurz", "Kurz", "Mittel", "Lang", "Sehr lang"];
const VALUE_LABELS = ["", "Schlecht", "Ausreichend", "OK", "Gut", "Sehr gut"];

const SEASON_OPTIONS = [
  { key: "spring", label: "Frühling", emoji: "🌸" },
  { key: "summer", label: "Sommer", emoji: "☀️" },
  { key: "autumn", label: "Herbst", emoji: "🍂" },
  { key: "winter", label: "Winter", emoji: "❄️" },
];

const OCCASION_OPTIONS = [
  { key: "everyday", label: "Alltag" },
  { key: "office", label: "Büro" },
  { key: "evening", label: "Abends" },
  { key: "special", label: "Besonderer Anlass" },
  { key: "sport", label: "Sport" },
];

const GENDER_FIT_OPTIONS = [
  { key: "feminine", label: "Eher feminin" },
  { key: "unisex", label: "Unisex" },
  { key: "masculine", label: "Eher maskulin" },
];

function ScaleSelector({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium tracking-wide transition-all ${
            n <= value
              ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
              : "border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
          }`}
        >
          {labels[n]}
        </button>
      ))}
    </div>
  );
}

function DimensionBar({ label, value, labels }: { label: string; value: number; labels: string[] }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[11px] uppercase tracking-wider text-[#9E9890]">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1.5 w-5 rounded-full transition-colors ${n <= value ? "bg-[#C9A96E]" : "bg-[#E5E0D8]"}`}
          />
        ))}
      </div>
      <span className="text-[11px] text-[#6E6860]">{labels[value]}</span>
    </div>
  );
}

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter / X",
  website: "Website",
};

type FragranceVariant = {
  id: string;
  sizeMl: number;
  intensity: string | null;
  priceCents: number;
  stockQty: number;
  isActive: boolean;
};

type DbVariantRow = {
  id: string;
  size_ml: number;
  intensity: string | null;
  price_cents: number;
  stock_qty: number;
  is_active: boolean;
};

const CART_STORAGE_KEY = "fragrance-os-cart";
// Share-Code wird pro Fragrance gespeichert: fragrance-os-share-{fragranceId}
function getShareCodeForFragrance(fragranceId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`fragrance-os-share-${fragranceId}`);
    if (!raw) return null;
    const { code, expires } = JSON.parse(raw);
    if (Date.now() > expires) { localStorage.removeItem(`fragrance-os-share-${fragranceId}`); return null; }
    return code as string;
  } catch { return null; }
}

function mapDbFragrance(row: DbFragranceRow): SavedFragrance {
  return {
    id: row.id,
    name: row.name,
    composition: row.composition,
    total: row.total,
    createdAt: row.created_at,
    creatorId: row.creator_id,
    ownerId: row.owner_id,
    isPublic: row.is_public,
    priceCents: row.price_cents,
    status: row.status,
    sizeMl: row.size_ml,
    description: row.description ?? "",
    category: row.category ?? "",
    sampleStatus: row.sample_status,
    imageUrl: row.image_url ?? "",
  };
}

function StarRating({
  rating,
  onRate,
  size = "md",
}: {
  rating: number;
  onRate?: (r: number) => void;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "text-sm" : "text-xl";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate?.(star)}
          className={`${sizeClass} transition-colors ${onRate ? "cursor-pointer" : "cursor-default"} ${star <= rating ? "text-[#C9A96E]" : "text-[#DDD8CF]"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function FragranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [fragrance, setFragrance] = useState<SavedFragrance | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fragranceId, setFragranceId] = useState<string>("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [variants, setVariants] = useState<FragranceVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [similarFragrances, setSimilarFragrances] = useState<{ id: string; name: string; priceCents: number; imageUrl: string; ownerName: string }[]>([]);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewLongevity, setReviewLongevity] = useState(0);
  const [reviewValueForMoney, setReviewValueForMoney] = useState(0);
  const [reviewSeasons, setReviewSeasons] = useState<string[]>([]);
  const [reviewOccasion, setReviewOccasion] = useState<string | null>(null);
  const [reviewGenderFit, setReviewGenderFit] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  // ?via=SHARE_CODE tracking: Klick registrieren + Code in localStorage speichern
  useEffect(() => {
    const via = new URLSearchParams(window.location.search).get("via");
    if (!via) return;
    fetch("/api/share/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareCode: via }),
    })
      .then((r) => r.json())
      .then(({ fragranceId: fid }) => {
        if (fid) {
          localStorage.setItem(
            `fragrance-os-share-${fid}`,
            JSON.stringify({ code: via, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function loadFragrance() {
      const resolvedParams = await params;
      setFragranceId(resolvedParams.id);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data, error } = await supabase
        .from("fragrances")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (error || !data) {
        console.error("Fehler beim Laden des Dufts:", error);
        setLoading(false);
        return;
      }

      const mappedFragrance = mapDbFragrance(data);
      setFragrance(mappedFragrance);

      // View-Event tracken
      trackEvent({
        eventType: "fragrance_view",
        entityType: "fragrance",
        entityId: resolvedParams.id,
        metadata: { category: data.category ?? "" },
      });

      // Varianten laden
      const { data: variantRows } = await supabase
        .from("fragrance_variants")
        .select("id, size_ml, intensity, price_cents, stock_qty, is_active")
        .eq("fragrance_id", resolvedParams.id)
        .eq("is_active", true)
        .order("price_cents", { ascending: true });

      if (variantRows && variantRows.length > 0) {
        const mapped: FragranceVariant[] = (variantRows as DbVariantRow[]).map((r) => ({
          id: r.id,
          sizeMl: r.size_ml,
          intensity: r.intensity,
          priceCents: r.price_cents,
          stockQty: r.stock_qty,
          isActive: r.is_active,
        }));
        setVariants(mapped);
        setSelectedVariantId(mapped[0].id);
      }

      if (mappedFragrance.ownerId) {
        const { data: creatorData } = await supabase
          .from("profiles")
          .select("id, username, display_name, bio, social_link, social_links, avatar_url")
          .eq("id", mappedFragrance.ownerId)
          .maybeSingle();

        if (creatorData) {
          setCreator({
            ...creatorData,
            social_links: (creatorData.social_links as SocialLinks) ?? {},
          });
        }
      }

      // Wishlist-Status laden
      if (user?.id) {
        const { data: wlData } = await supabase
          .from("wishlists")
          .select("id")
          .eq("user_id", user.id)
          .eq("fragrance_id", resolvedParams.id)
          .maybeSingle();

        if (wlData) {
          setIsWishlisted(true);
          setWishlistId(wlData.id);
        }
      }

      // Reviews laden
      const { data: reviewRows, error: reviewError } = await supabase
        .from("fragrance_reviews")
        .select("id, user_id, rating, longevity, sillage, value_for_money, seasons, occasion, gender_fit, body, verified_purchase, created_at, profiles(username, display_name)")
        .eq("fragrance_id", resolvedParams.id)
        .order("created_at", { ascending: false });

      if (!reviewError && reviewRows) {
        const mapped: Review[] = (reviewRows as unknown as DbReviewRow[]).map((row) => ({
          id: row.id,
          userId: row.user_id,
          rating: row.rating,
          longevity: row.longevity ?? null,
          valueForMoney: row.value_for_money ?? null,
          seasons: row.seasons ?? [],
          occasion: row.occasion ?? null,
          genderFit: row.gender_fit ?? null,
          body: row.body,
          verifiedPurchase: row.verified_purchase,
          createdAt: row.created_at,
          username: row.profiles?.username ?? null,
          displayName: row.profiles?.display_name ?? null,
        }));
        setReviews(mapped);

        if (user?.id) {
          const own = mapped.find((r) => r.userId === user.id) ?? null;
          setExistingReview(own);
          if (own) {
            setReviewRating(own.rating);
            setReviewBody(own.body);
            setReviewLongevity(own.longevity ?? 0);
            setReviewValueForMoney(own.valueForMoney ?? 0);
            setReviewSeasons(own.seasons ?? []);
            setReviewOccasion(own.occasion ?? null);
            setReviewGenderFit(own.genderFit ?? null);
          }
        }
      }

      // Likes laden
      const { count: likeCountData } = await supabase
        .from("fragrance_likes")
        .select("*", { count: "exact", head: true })
        .eq("fragrance_id", resolvedParams.id);
      setLikeCount(likeCountData ?? 0);

      if (user?.id) {
        const { data: likeData } = await supabase
          .from("fragrance_likes")
          .select("id")
          .eq("fragrance_id", resolvedParams.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsLiked(!!likeData);
      }

      // Ähnliche Düfte laden
      const currentAccords = Object.keys(mappedFragrance.composition ?? {}).filter(
        (k) => (mappedFragrance.composition[k] ?? 0) > 0,
      );

      if (currentAccords.length > 0) {
        const { data: candidateRows } = await supabase
          .from("fragrances")
          .select("id, name, price_cents, image_url, composition, owner_id")
          .eq("is_public", true)
          .eq("status", "active")
          .neq("id", resolvedParams.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (candidateRows) {
          type CandidateRow = { id: string; name: string; price_cents: number; image_url: string | null; composition: Record<string, number>; owner_id: string | null };
          const scored = (candidateRows as CandidateRow[])
            .map((r) => {
              const rowAccords = Object.keys(r.composition ?? {}).filter((k) => (r.composition[k] ?? 0) > 0);
              const overlap = rowAccords.filter((a) => currentAccords.includes(a)).length;
              return { ...r, overlap };
            })
            .filter((r) => r.overlap > 0)
            .sort((a, b) => b.overlap - a.overlap)
            .slice(0, 4);

          const ownerIds = [...new Set(scored.map((r) => r.owner_id).filter(Boolean))] as string[];
          const ownerMap: Record<string, string> = {};
          if (ownerIds.length > 0) {
            const { data: ownerRows } = await supabase
              .from("profiles")
              .select("id, display_name, username")
              .in("id", ownerIds);
            (ownerRows ?? []).forEach((p: { id: string; display_name: string | null; username: string | null }) => {
              ownerMap[p.id] = p.display_name || p.username || "Creator";
            });
          }

          setSimilarFragrances(
            scored.map((r) => ({
              id: r.id,
              name: r.name,
              priceCents: r.price_cents,
              imageUrl: r.image_url ?? "",
              ownerName: ownerMap[r.owner_id ?? ""] ?? "Creator",
            })),
          );
        }
      }

      setLoading(false);
    }

    loadFragrance();
  }, [params]);

  function addToCart() {
    if (!fragrance) return;

    const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
    const priceCents = selectedVariant ? selectedVariant.priceCents : fragrance.priceCents;
    const sizeMl = selectedVariant ? selectedVariant.sizeMl : fragrance.sizeMl;
    // Cart-Key enthält Variant-ID damit verschiedene Größen separat im Warenkorb liegen
    const cartKey = selectedVariant ? `${fragrance.id}__${selectedVariant.id}` : fragrance.id;

    const raw = localStorage.getItem(CART_STORAGE_KEY);
    let cart: {
      id: string;
      fragranceId: string;
      variantId: string | null;
      name: string;
      priceCents: number;
      sizeMl: number;
      quantity: number;
      shareCode?: string;
    }[] = [];

    if (raw) {
      try {
        cart = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    const existing = cart.find((item) => item.fragranceId === cartKey);

    if (existing) {
      cart = cart.map((item) =>
        item.fragranceId === cartKey
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    } else {
      const variantLabel = selectedVariant
        ? ` (${selectedVariant.sizeMl} ml${selectedVariant.intensity ? ` · ${selectedVariant.intensity}` : ""})`
        : "";
      const shareCode = getShareCodeForFragrance(fragrance.id) ?? undefined;
      cart = [
        ...cart,
        {
          id: crypto.randomUUID(),
          fragranceId: cartKey,
          variantId: selectedVariant?.id ?? null,
          name: `${fragrance.name}${variantLabel}`,
          priceCents,
          sizeMl,
          quantity: 1,
          shareCode,
        },
      ];
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    trackEvent({
      eventType: "cart_add",
      entityType: "fragrance",
      entityId: fragrance.id,
      metadata: { variant_id: selectedVariant?.id ?? null, price_cents: priceCents },
    });
    alert("Duft wurde zum Warenkorb hinzugefügt.");
  }

  async function toggleWishlist() {
    if (!currentUserId || !fragrance) return;

    setTogglingWishlist(true);

    if (isWishlisted && wishlistId) {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", wishlistId);

      if (!error) {
        setIsWishlisted(false);
        setWishlistId(null);
      }
    } else {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("wishlists").insert({
        id,
        user_id: currentUserId,
        fragrance_id: fragrance.id,
      });

      if (!error) {
        setIsWishlisted(true);
        setWishlistId(id);
        trackEvent({ eventType: "wishlist_add", entityType: "fragrance", entityId: fragrance.id });
      }
    }

    setTogglingWishlist(false);
  }

  async function toggleLike() {
    if (!currentUserId || !fragranceId) return;
    if (isLiked) {
      await supabase.from("fragrance_likes").delete()
        .eq("fragrance_id", fragranceId).eq("user_id", currentUserId);
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from("fragrance_likes").insert({ fragrance_id: fragranceId, user_id: currentUserId });
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
    }
  }

  async function submitReview() {
    if (!currentUserId) {
      setReviewMessage("Bitte logge dich ein, um eine Bewertung zu schreiben.");
      return;
    }

    if (reviewRating === 0) {
      setReviewMessage("Bitte wähle eine Gesamtbewertung.");
      return;
    }

    setSubmittingReview(true);
    setReviewMessage("");

    const payload = {
      rating: reviewRating,
      body: reviewBody.trim(),
      longevity: reviewLongevity || null,
      value_for_money: reviewValueForMoney || null,
      seasons: reviewSeasons,
      occasion: reviewOccasion,
      gender_fit: reviewGenderFit,
    };

    if (existingReview) {
      const { error } = await supabase
        .from("fragrance_reviews")
        .update(payload)
        .eq("id", existingReview.id);

      if (error) {
        console.error("Fehler beim Aktualisieren der Bewertung:", error);
        setReviewMessage("Bewertung konnte nicht aktualisiert werden.");
        setSubmittingReview(false);
        return;
      }

      const updated = {
        ...existingReview,
        rating: reviewRating,
        body: reviewBody.trim(),
        longevity: reviewLongevity || null,
        valueForMoney: reviewValueForMoney || null,
        seasons: reviewSeasons,
        occasion: reviewOccasion,
        genderFit: reviewGenderFit,
      };
      setReviews((prev) => prev.map((r) => (r.id === existingReview.id ? updated : r)));
      setExistingReview(updated);
      setReviewMessage("Bewertung aktualisiert.");
    } else {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("fragrance_reviews").insert({
        id,
        fragrance_id: fragranceId,
        user_id: currentUserId,
        verified_purchase: false,
        ...payload,
      });

      if (error) {
        console.error("Fehler beim Speichern der Bewertung:", error);
        setReviewMessage("Bewertung konnte nicht gespeichert werden.");
        setSubmittingReview(false);
        return;
      }

      const newReview: Review = {
        id,
        userId: currentUserId,
        rating: reviewRating,
        body: reviewBody.trim(),
        longevity: reviewLongevity || null,
        valueForMoney: reviewValueForMoney || null,
        seasons: reviewSeasons,
        occasion: reviewOccasion,
        genderFit: reviewGenderFit,
        verifiedPurchase: false,
        createdAt: new Date().toISOString(),
        username: null,
        displayName: null,
      };

      setReviews((prev) => [newReview, ...prev]);
      setExistingReview(newReview);
      setReviewMessage("Bewertung gespeichert.");
    }

    setSubmittingReview(false);
  }

  async function deleteReview() {
    if (!existingReview) return;

    const { error } = await supabase
      .from("fragrance_reviews")
      .delete()
      .eq("id", existingReview.id);

    if (error) {
      console.error("Fehler beim Löschen:", error);
      setReviewMessage("Bewertung konnte nicht gelöscht werden.");
      return;
    }

    setReviews((prev) => prev.filter((r) => r.id !== existingReview.id));
    setExistingReview(null);
    setReviewRating(0);
    setReviewBody("");
    setReviewLongevity(0);
    setReviewValueForMoney(0);
    setReviewSeasons([]);
    setReviewOccasion(null);
    setReviewGenderFit(null);
    setReviewMessage("Bewertung gelöscht.");
  }

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  function avgDimension(key: "longevity" | "valueForMoney") {
    const vals = reviews.map((r) => r[key]).filter((v): v is number => v !== null && v > 0);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  const avgLongevity = avgDimension("longevity");
  const avgValue = avgDimension("valueForMoney");

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-[#C9A96E] border-t-transparent animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#9E9890]">Lädt</p>
        </div>
      </main>
    );
  }

  if (!fragrance) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A96E] mb-4">404</p>
          <h1 className="text-3xl font-bold text-[#0A0A0A]">Duft nicht gefunden</h1>
          <p className="mt-3 text-sm text-[#6E6860]">
            Unter der ID {fragranceId} wurde kein Duft gefunden.
          </p>
          <Link href="/discover" className="mt-8 inline-block rounded-full bg-[#0A0A0A] px-8 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] transition-colors">
            Zurück zu Discover
          </Link>
        </div>
      </main>
    );
  }

  const socialLinkEntries = Object.entries(creator?.social_links ?? {}).filter(
    ([, url]) => !!url,
  );

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const displayPrice = selectedVariant
    ? selectedVariant.priceCents
    : fragrance.priceCents;
  const displaySize = selectedVariant ? selectedVariant.sizeMl : fragrance.sizeMl;

  const compositionEntries = Object.entries(fragrance.composition)
    .filter(([, p]) => p > 0)
    .sort((a, b) => b[1] - a[1]);
  const maxPercent = compositionEntries[0]?.[1] ?? 100;

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-32">

      {/* ── BREADCRUMB + BACK ───────────────────────────────────────── */}
      <div className="px-5 pt-20 pb-0 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#9E9890]">
          <Link href="/discover" className="hover:text-[#0A0A0A] transition-colors flex items-center gap-1">
            <span>←</span>
            <span>Discover</span>
          </Link>
          <span>/</span>
          {fragrance.category && (
            <>
              <span className="text-[#C5C0B8]">{fragrance.category}</span>
              <span>/</span>
            </>
          )}
          <span className="text-[#0A0A0A] font-medium truncate max-w-[180px]">{fragrance.name}</span>
        </div>
      </div>

      {/* ── HERO 2-COLUMN ───────────────────────────────────────────── */}
      <section className="mt-6 px-5 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* Left: Image */}
          <div className="group relative rounded-3xl overflow-hidden aspect-square shadow-[0_20px_60px_-10px_rgba(0,0,0,0.18)] bg-[#F0EDE8]">
            {fragrance.imageUrl ? (
              <img
                src={fragrance.imageUrl}
                alt={fragrance.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-6xl text-[#C5C0B8]">◉</span>
              </div>
            )}
            {/* Subtle gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-col gap-5 pt-1">

            {/* Category tag */}
            {fragrance.category && (
              <span className="self-start rounded-full bg-[#F5F0EA] px-3 py-1 text-[10px] uppercase tracking-wider text-[#9E9890]">
                {fragrance.category}
              </span>
            )}

            {/* Name */}
            <h1 className="text-4xl lg:text-5xl font-bold text-[#0A0A0A] leading-tight">
              {fragrance.name}
            </h1>

            {/* Creator line */}
            {creator && (
              <div className="flex items-center gap-2.5">
                {creator.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt={creator.display_name || creator.username || "Creator"}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-[#E5E0D8]"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0EDE8] ring-1 ring-[#E5E0D8] text-[10px] font-medium text-[#9E9890]">
                    {(creator.display_name || creator.username || "?")[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-[#6E6860]">
                  von{" "}
                  {creator.username ? (
                    <Link
                      href={`/creator/${creator.username}`}
                      className="font-medium text-[#0A0A0A] hover:text-[#C9A96E] transition-colors"
                    >
                      @{creator.username}
                    </Link>
                  ) : (
                    <span className="font-medium text-[#0A0A0A]">
                      {creator.display_name || "Creator"}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Stars + review count */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2.5">
                <StarRating rating={Math.round(averageRating)} size="sm" />
                <span className="text-xs text-[#6E6860]">
                  {averageRating.toFixed(1)} · {reviews.length} Bewertung{reviews.length !== 1 ? "en" : ""}
                </span>
              </div>
            )}

            {/* Description */}
            {fragrance.description && (
              <p className="text-[#6E6860] text-sm leading-relaxed mt-1">
                {fragrance.description}
              </p>
            )}

            {/* Divider */}
            <div className="h-px bg-[#E5E0D8]" />

            {/* Price */}
            <div>
              <p className="text-3xl font-bold text-[#0A0A0A] tracking-tight">
                {(displayPrice / 100).toFixed(2)} €
                <span className="ml-2 text-sm font-normal text-[#9E9890]">{displaySize} ml</span>
              </p>
            </div>

            {/* Size / Variant selector */}
            {variants.length > 0 && (
              <div>
                <p className="mb-2.5 text-[10px] uppercase tracking-wider text-[#9E9890]">Größe & Intensität</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      disabled={v.stockQty === 0}
                      className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                        selectedVariantId === v.id
                          ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                          : v.stockQty === 0
                            ? "cursor-not-allowed border-[#E5E0D8] text-[#C5C0B8] line-through"
                            : "border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                      }`}
                    >
                      {v.sizeMl} ml{v.intensity ? ` · ${v.intensity}` : ""}
                      {v.stockQty === 0 && " · ausverkauft"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-2.5 mt-1">
              <button
                onClick={addToCart}
                className="w-full rounded-full bg-[#0A0A0A] px-6 py-3.5 text-sm font-medium uppercase tracking-wider text-white hover:bg-[#1a1a1a] active:scale-[0.98] transition-all"
              >
                In den Warenkorb
              </button>

              {/* Share & Earn — jeder eingeloggte User kann seinen Duft teilen */}
              {currentUserId && fragrance?.isPublic && (
                <div className="pt-0.5">
                  <ShareButton fragranceId={fragranceId} fragranceName={fragrance?.name ?? ""} />
                </div>
              )}

              {currentUserId && (
                <button
                  onClick={toggleWishlist}
                  disabled={togglingWishlist}
                  className={`w-full rounded-full border px-6 py-3.5 text-sm font-medium uppercase tracking-wider transition-all active:scale-[0.98] ${
                    isWishlisted
                      ? "border-[#C9A96E] bg-[#FBF6EE] text-[#B09050]"
                      : "border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
                  }`}
                >
                  {isWishlisted ? "♥ Auf der Wunschliste" : "♡ Zur Wunschliste"}
                </button>
              )}
            </div>

            {/* Like count */}
            {likeCount > 0 && (
              <button
                onClick={toggleLike}
                className={`self-start flex items-center gap-1.5 text-xs transition-colors ${
                  isLiked ? "text-[#C9A96E]" : "text-[#9E9890] hover:text-[#0A0A0A]"
                }`}
              >
                <span>{isLiked ? "♥" : "♡"}</span>
                <span>{likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
              </button>
            )}
            {likeCount === 0 && currentUserId && (
              <button
                onClick={toggleLike}
                className={`self-start flex items-center gap-1.5 text-xs transition-colors ${
                  isLiked ? "text-[#C9A96E]" : "text-[#9E9890] hover:text-[#0A0A0A]"
                }`}
              >
                <span>{isLiked ? "♥" : "♡"}</span>
                <span>Like</span>
              </button>
            )}

          </div>
        </div>
      </section>

      {/* ── DUFTPYRAMIDE ────────────────────────────────────────────── */}
      {compositionEntries.length > 0 && (
        <section className="mt-20 px-5 max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#0A0A0A]">Duftpyramide</h2>
            <div className="mt-1.5 h-0.5 w-10 rounded-full bg-gradient-to-r from-[#C9A96E] to-[#E8C99A]" />
          </div>
          <div className="space-y-4 max-w-lg">
            {compositionEntries.map(([accordId, percent]) => (
              <div key={accordId}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#0A0A0A]">{getAccordName(accordId)}</span>
                  <span className="text-xs text-[#9E9890]">{percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#E5E0D8]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#C9A96E] to-[#E8C99A] transition-all duration-500"
                    style={{ width: `${(percent / maxPercent) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CREATOR SPOTLIGHT ───────────────────────────────────────── */}
      {creator && (
        <section className="mt-20 px-5 max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#0A0A0A]">Creator</h2>
            <div className="mt-1.5 h-0.5 w-10 rounded-full bg-gradient-to-r from-[#C9A96E] to-[#E8C99A]" />
          </div>
          <div className="rounded-3xl bg-[#0A0A0A] p-7 md:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Avatar */}
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name || creator.username || "Creator"}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10 shrink-0"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 text-xl font-bold">
                  {(creator.display_name || creator.username || "?")[0].toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {creator.username ? (
                      <Link href={`/creator/${creator.username}`} className="text-lg font-bold text-white hover:text-[#C9A96E] transition-colors">
                        {creator.display_name || creator.username}
                      </Link>
                    ) : (
                      <p className="text-lg font-bold text-white">{creator.display_name || "Creator"}</p>
                    )}
                    {creator.username && (
                      <p className="text-sm text-white/40 mt-0.5">@{creator.username}</p>
                    )}
                  </div>
                  {creator.username && (
                    <Link
                      href={`/creator/${creator.username}`}
                      className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-white/70 hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors whitespace-nowrap"
                    >
                      Profil ansehen
                    </Link>
                  )}
                </div>

                {creator.bio && (
                  <p className="mt-3 text-sm leading-relaxed text-white/60 line-clamp-3">{creator.bio}</p>
                )}

                {/* Social links */}
                {(socialLinkEntries.length > 0 || creator.social_link) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {socialLinkEntries.map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/50 hover:border-[#C9A96E]/50 hover:text-[#C9A96E] transition-colors"
                      >
                        {SOCIAL_LABELS[platform] ?? platform}
                      </a>
                    ))}
                    {socialLinkEntries.length === 0 && creator.social_link && (
                      <a
                        href={creator.social_link}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/50 hover:border-[#C9A96E]/50 hover:text-[#C9A96E] transition-colors"
                      >
                        Social
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SIMILAR FRAGRANCES ──────────────────────────────────────── */}
      {similarFragrances.length > 0 && (
        <section className="mt-20 max-w-6xl mx-auto">
          <div className="px-5 mb-6">
            <h2 className="text-xl font-bold text-[#0A0A0A]">Ähnliche Düfte</h2>
            <div className="mt-1.5 h-0.5 w-10 rounded-full bg-gradient-to-r from-[#C9A96E] to-[#E8C99A]" />
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-none snap-x snap-mandatory">
            {similarFragrances.map((s) => (
              <Link
                key={s.id}
                href={`/fragrance/${s.id}`}
                className="group block shrink-0 w-40 snap-start overflow-hidden rounded-2xl bg-white border border-[#E5E0D8] transition-all hover:border-[#C9A96E]/40 hover:shadow-lg"
              >
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-[#F0EDE8]">
                    <span className="text-2xl text-[#C5C0B8]">◉</span>
                  </div>
                )}
                <div className="p-3">
                  <p className="truncate text-xs font-semibold text-[#0A0A0A]">{s.name}</p>
                  <p className="text-[10px] text-[#9E9890] truncate">{s.ownerName}</p>
                  <p className="mt-1.5 text-xs font-bold text-[#0A0A0A]">{(s.priceCents / 100).toFixed(2)} €</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── REVIEWS ─────────────────────────────────────────────────── */}
      <section className="mt-20 px-5 max-w-6xl mx-auto">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0A0A0A]">Bewertungen</h2>
            <div className="mt-1.5 h-0.5 w-10 rounded-full bg-gradient-to-r from-[#C9A96E] to-[#E8C99A]" />
          </div>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-[#6E6860]">
              <span className="text-[#C9A96E] font-bold">{averageRating.toFixed(1)}</span>
              <span>★</span>
              <span>({reviews.length})</span>
            </div>
          )}
        </div>

        {/* Avg dimension summary */}
        {reviews.length > 0 && (
          <div className="mb-6 rounded-2xl bg-white border border-[#E5E0D8] p-5 space-y-3">
            <DimensionBar label="Haltbarkeit" value={avgLongevity} labels={LONGEVITY_LABELS} />
            <DimensionBar label="Preis-Leistung" value={avgValue} labels={VALUE_LABELS} />
          </div>
        )}

        {/* Write / edit review */}
        {currentUserId && (
          <div className="mb-8 rounded-2xl bg-white border border-[#E5E0D8] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">
              {existingReview ? "Deine Bewertung" : "Bewertung schreiben"}
            </h3>

            <div className="mt-5">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Gesamteindruck *</p>
              <StarRating rating={reviewRating} onRate={setReviewRating} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Haltbarkeit</p>
              <ScaleSelector value={reviewLongevity} onChange={setReviewLongevity} labels={LONGEVITY_LABELS} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Preis-Leistung</p>
              <ScaleSelector value={reviewValueForMoney} onChange={setReviewValueForMoney} labels={VALUE_LABELS} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Jahreszeiten</p>
              <div className="flex flex-wrap gap-1.5">
                {SEASON_OPTIONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() =>
                      setReviewSeasons((prev) =>
                        prev.includes(s.key) ? prev.filter((k) => k !== s.key) : [...prev, s.key],
                      )
                    }
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                      reviewSeasons.includes(s.key)
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                    }`}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Anlass</p>
              <div className="flex flex-wrap gap-1.5">
                {OCCASION_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setReviewOccasion(reviewOccasion === o.key ? null : o.key)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                      reviewOccasion === o.key
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Für wen?</p>
              <div className="flex flex-wrap gap-1.5">
                {GENDER_FIT_OPTIONS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setReviewGenderFit(reviewGenderFit === g.key ? null : g.key)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                      reviewGenderFit === g.key
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Kommentar (optional)</p>
              <textarea
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={3}
                placeholder="Was denkst du über diesen Duft?"
                className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={submitReview}
                disabled={submittingReview}
                className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-white disabled:opacity-40 transition-opacity hover:bg-[#1a1a1a]"
              >
                {submittingReview ? "…" : existingReview ? "Aktualisieren" : "Senden"}
              </button>
              {existingReview && (
                <button
                  onClick={deleteReview}
                  className="rounded-full border border-[#E5E0D8] px-6 py-2.5 text-xs font-medium text-[#9E9890] hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  Löschen
                </button>
              )}
            </div>

            {reviewMessage && (
              <p className="mt-3 text-xs text-[#6E6860]">{reviewMessage}</p>
            )}
          </div>
        )}

        {/* Review list */}
        {reviews.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#C5C0B8]">Noch keine Bewertungen</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl bg-white border border-[#E5E0D8] p-5 hover:border-[#C9A96E]/30 transition-colors">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={review.rating} size="sm" />
                      {review.verifiedPurchase && (
                        <span className="rounded-full bg-[#F5F0EA] px-2 py-0.5 text-[10px] text-[#9E9890] uppercase tracking-wide">
                          Verifiziert
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#0A0A0A]">
                      {review.displayName || review.username || "Anonym"}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#9E9890] whitespace-nowrap">
                    {new Date(review.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>

                {/* Dimensions */}
                {(review.longevity || review.valueForMoney) && (
                  <div className="mt-4 space-y-2">
                    <DimensionBar label="Haltbarkeit" value={review.longevity ?? 0} labels={LONGEVITY_LABELS} />
                    <DimensionBar label="Preis-Leistung" value={review.valueForMoney ?? 0} labels={VALUE_LABELS} />
                  </div>
                )}

                {/* Tags */}
                {(review.seasons.length > 0 || review.occasion || review.genderFit) && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {review.seasons.map((s) => {
                      const opt = SEASON_OPTIONS.find((o) => o.key === s);
                      return opt ? (
                        <span key={s} className="rounded-full bg-[#F5F0EA] px-2.5 py-0.5 text-[10px] text-[#6E6860]">
                          {opt.emoji} {opt.label}
                        </span>
                      ) : null;
                    })}
                    {review.occasion && (
                      <span className="rounded-full bg-[#F5F0EA] px-2.5 py-0.5 text-[10px] text-[#6E6860]">
                        {OCCASION_OPTIONS.find((o) => o.key === review.occasion)?.label ?? review.occasion}
                      </span>
                    )}
                    {review.genderFit && (
                      <span className="rounded-full bg-[#F5F0EA] px-2.5 py-0.5 text-[10px] text-[#6E6860]">
                        {GENDER_FIT_OPTIONS.find((g) => g.key === review.genderFit)?.label ?? review.genderFit}
                      </span>
                    )}
                  </div>
                )}

                {/* Body */}
                {review.body && (
                  <p className="mt-3.5 text-sm leading-relaxed text-[#3A3530]">{review.body}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── FOOTER META ─────────────────────────────────────────────── */}
      <p className="mt-12 px-5 max-w-6xl mx-auto text-[10px] text-[#C5C0B8]">
        Erstellt {new Date(fragrance.createdAt).toLocaleDateString("de-DE")}
      </p>

      {/* ── STICKY BOTTOM BAR (mobile CTA) ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#E5E0D8] px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {/* Fragrance info */}
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-semibold text-[#0A0A0A]">{fragrance.name}</p>
            <p className="text-[11px] text-[#9E9890]">
              {(displayPrice / 100).toFixed(2)} € · {displaySize} ml
            </p>
          </div>

          {/* Like button */}
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs transition-all active:scale-95 ${
              isLiked
                ? "border-[#C9A96E]/40 bg-[#FBF6EE] text-[#C9A96E]"
                : "border-[#E5E0D8] text-[#6E6860] hover:border-[#C9A96E]"
            }`}
          >
            <span>{isLiked ? "♥" : "♡"}</span>
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          {/* Cart link */}
          <Link
            href="/cart"
            className="rounded-full border border-[#E5E0D8] px-4 py-2.5 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors whitespace-nowrap"
          >
            Warenkorb
          </Link>

          {/* Add to cart */}
          <button
            onClick={addToCart}
            className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 hover:bg-[#1a1a1a] transition-all whitespace-nowrap"
          >
            In den Warenkorb
          </button>
        </div>
      </div>
    </main>
  );
}
