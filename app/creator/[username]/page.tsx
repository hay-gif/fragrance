"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccordName } from "@/lib/accords";
import { supabase } from "@/lib/supabase";
import type { SocialLinks } from "@/lib/profile";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  social_link: string | null;
  social_links: SocialLinks;
  banner_url: string | null;
  avatar_url: string | null;
  role: string;
  creator_status: string;
};

type Fragrance = {
  id: string;
  name: string;
  composition: Record<string, number>;
  createdAt: string;
  priceCents: number;
  sizeMl: number;
  category: string;
  description: string;
  imageUrl: string;
};

type DbProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  social_link: string | null;
  social_links: SocialLinks | null;
  banner_url: string | null;
  avatar_url: string | null;
  role: string;
  creator_status: string;
};

type DbFragranceRow = {
  id: string;
  name: string;
  composition: Record<string, number>;
  created_at: string;
  price_cents: number;
  size_ml: number;
  category: string | null;
  description: string | null;
  image_url: string | null;
};

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter / X",
  website: "Website",
};

export default function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const [creatorPlan, setCreatorPlan] = useState<{ id: string; name: string; price_cents: number; benefits: string[] } | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [products, setProducts] = useState<{
    id: string;
    name: string;
    description: string | null;
    price_cents: number;
    stock: number;
    category: string;
    image_url: string | null;
  }[]>([]);

  useEffect(() => {
    async function loadCreatorPage() {
      const resolvedParams = await params;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      // Affiliate-Tracking: Profilbesuch speichern damit Cart weiß wer Provision erhält
      if (resolvedParams.username) {
        localStorage.setItem("fos_affiliate_ref", resolvedParams.username);
        localStorage.setItem("fos_affiliate_ref_ts", String(Date.now()));
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, bio, social_link, social_links, banner_url, avatar_url, role, creator_status",
        )
        .eq("username", resolvedParams.username)
        .maybeSingle();

      if (profileError) {
        console.error("Fehler beim Laden des Creator-Profils:", profileError);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setLoading(false);
        return;
      }

      const row = profileData as DbProfileRow;

      const mappedProfile: Profile = {
        id: row.id,
        username: row.username,
        display_name: row.display_name,
        bio: row.bio,
        social_link: row.social_link,
        social_links: row.social_links ?? {},
        banner_url: row.banner_url,
        avatar_url: row.avatar_url,
        role: row.role,
        creator_status: row.creator_status,
      };

      setProfile(mappedProfile);

      const { data: fragranceData, error: fragranceError } = await supabase
        .from("fragrances")
        .select(
          "id, name, composition, created_at, price_cents, size_ml, category, description, image_url",
        )
        .eq("owner_id", mappedProfile.id)
        .eq("is_public", true)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (fragranceError) {
        console.error("Fehler beim Laden der Creator-Düfte:", fragranceError);
        setLoading(false);
        return;
      }

      const mappedFragrances: Fragrance[] = (fragranceData ?? []).map(
        (row: DbFragranceRow) => ({
          id: row.id,
          name: row.name,
          composition: row.composition,
          createdAt: row.created_at,
          priceCents: row.price_cents,
          sizeMl: row.size_ml,
          category: row.category ?? "",
          description: row.description ?? "",
          imageUrl: row.image_url ?? "",
        }),
      );

      setFragrances(mappedFragrances);

      const { count, error: countError } = await supabase
        .from("creator_follows")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", mappedProfile.id);

      if (!countError) {
        setFollowerCount(count ?? 0);
      }

      if (user?.id) {
        const { data: followData } = await supabase
          .from("creator_follows")
          .select("id")
          .eq("creator_id", mappedProfile.id)
          .eq("follower_id", user.id)
          .maybeSingle();

        setIsFollowing(!!followData);
      }

      // Creator-Abo-Plan laden
      const { data: planData } = await supabase
        .from("creator_subscription_plans")
        .select("id, name, price_cents, benefits")
        .eq("creator_id", mappedProfile.id)
        .eq("active", true)
        .maybeSingle();

      if (planData) setCreatorPlan(planData);

      // Physische Produkte laden
      const { data: productData } = await supabase
        .from("creator_products")
        .select("id, name, description, price_cents, stock, category, image_url")
        .eq("creator_id", mappedProfile.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setProducts(productData ?? []);

      if (user?.id && planData) {
        const { data: subData } = await supabase
          .from("creator_subscriptions")
          .select("id")
          .eq("subscriber_id", user.id)
          .eq("creator_id", mappedProfile.id)
          .eq("status", "active")
          .maybeSingle();
        setIsSubscribed(!!subData);
      }

      setLoading(false);
    }

    loadCreatorPage();
  }, [params]);

  async function toggleFollow() {
    if (!profile || !currentUserId) {
      alert("Bitte logge dich ein, um Profilen zu folgen.");
      return;
    }

    if (profile.id === currentUserId) {
      alert("Du kannst dir nicht selbst folgen.");
      return;
    }

    setFollowLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from("creator_follows")
        .delete()
        .eq("creator_id", profile.id)
        .eq("follower_id", currentUserId);

      if (error) {
        console.error("Fehler beim Entfolgen:", error);
        alert("Entfolgen fehlgeschlagen.");
        setFollowLoading(false);
        return;
      }

      setIsFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
      setFollowLoading(false);
      return;
    }

    const { error } = await supabase.from("creator_follows").insert({
      creator_id: profile.id,
      follower_id: currentUserId,
    });

    if (error) {
      console.error("Fehler beim Folgen:", error);
      alert("Folgen fehlgeschlagen.");
      setFollowLoading(false);
      return;
    }

    // Notification erstellen
    await supabase.from("notifications").insert({
      user_id: profile.id,
      type: "new_follower",
      data: { follower_id: currentUserId },
    });

    setIsFollowing(true);
    setFollowerCount((prev) => prev + 1);
    setFollowLoading(false);
  }

  async function subscribeToCreator() {
    if (!creatorPlan || !currentUserId) {
      alert("Bitte logge dich ein.");
      return;
    }
    setSubscribing(true);
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch("/api/stripe/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "creator",
        creatorId: profile!.id,
        creatorName: profile!.display_name || profile!.username,
        priceCents: creatorPlan.price_cents,
        userEmail: user?.email,
        userId: currentUserId,
      }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setSubscribing(false);
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

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-[#9E9890] mb-3">404</p>
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Profil nicht gefunden</h1>
          <Link href="/discover" className="mt-6 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white">
            Zurück zu Discover
          </Link>
        </div>
      </main>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const socialLinkEntries = Object.entries(profile.social_links ?? {}).filter(
    ([, url]) => !!url,
  );

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      {/* Banner Hero */}
      <div className="relative">
        {profile.banner_url ? (
          <div className="h-56 w-full overflow-hidden sm:h-80">
            <img src={profile.banner_url} alt="Banner" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-[#0A0A0A]/20 to-transparent" />
          </div>
        ) : (
          <div className="h-56 w-full bg-[#0A0A0A] sm:h-80">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #C9A96E 0%, transparent 60%), radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 40%)" }}
            />
          </div>
        )}
        <Link
          href="/discover"
          className="absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all text-sm border border-white/20"
        >
          ←
        </Link>
        {/* Creator ◆ badge */}
        <div className="absolute right-5 top-5">
          <span className="rounded-full bg-[#C9A96E]/20 backdrop-blur-md border border-[#C9A96E]/40 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-[#C9A96E]">
            ◆ Creator
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5">
        {/* Profile header card */}
        <div className="relative -mt-16 mb-8">
          <div className="rounded-3xl bg-white border border-[#E5E0D8] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div className="shrink-0 -mt-14 sm:-mt-16">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || profile.username || "Creator"}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#F0EDE8] to-[#E5E0D8] border-4 border-white text-3xl font-light text-[#9E9890] shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
                    {(profile.display_name || profile.username || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pt-0 sm:pt-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0A0A0A] leading-tight">
                      {profile.display_name || profile.username || "Creator"}
                    </h1>
                    {profile.username && (
                      <p className="mt-0.5 text-sm text-[#9E9890]">@{profile.username}</p>
                    )}
                  </div>
                  {!isOwnProfile && (
                    <button
                      onClick={toggleFollow}
                      disabled={followLoading}
                      className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 ${
                        isFollowing
                          ? "border border-[#E5E0D8] text-[#6E6860] hover:border-red-200 hover:text-red-500"
                          : "bg-[#0A0A0A] text-white hover:bg-[#1a1a1a]"
                      }`}
                    >
                      {followLoading ? "…" : isFollowing ? "Entfolgen" : "+ Folgen"}
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-4 flex flex-wrap gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#0A0A0A]">{fragrances.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Düfte</p>
                  </div>
                  <div className="w-px bg-[#E5E0D8]" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#0A0A0A]">{followerCount}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Follower</p>
                  </div>
                  {products.length > 0 && (
                    <>
                      <div className="w-px bg-[#E5E0D8]" />
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#0A0A0A]">{products.length}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Produkte</p>
                      </div>
                    </>
                  )}
                </div>

                {profile.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-[#4A4540] max-w-xl">{profile.bio}</p>
                )}

                {/* Social links */}
                {(socialLinkEntries.length > 0 || profile.social_link) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {socialLinkEntries.map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[11px] font-medium text-[#3A3530] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
                      >
                        {SOCIAL_LABELS[platform] ?? platform} ↗
                      </a>
                    ))}
                    {socialLinkEntries.length === 0 && profile.social_link && (
                      <a
                        href={profile.social_link}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[11px] font-medium text-[#3A3530] hover:border-[#0A0A0A] transition-colors"
                      >
                        Social ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Fan-Abo card (premium dark) */}
            {!isOwnProfile && creatorPlan && (
              <div className="mt-6 overflow-hidden rounded-2xl bg-[#0A0A0A] p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fan-Abo</p>
                    <p className="mt-1 text-base font-bold text-white">{creatorPlan.name}</p>
                    <p className="mt-0.5 text-sm text-[#C9A96E]">
                      {(creatorPlan.price_cents / 100).toFixed(2)} € / Monat
                    </p>
                    {(creatorPlan.benefits as string[]).filter(b => b).length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {(creatorPlan.benefits as string[]).filter(b => b).map((b, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                            <span className="text-[#C9A96E]">◆</span>{b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isSubscribed ? (
                      <span className="rounded-full bg-[#C9A96E]/20 border border-[#C9A96E]/40 px-4 py-2 text-xs font-medium text-[#C9A96E]">
                        Abonniert ◆
                      </span>
                    ) : (
                      <button
                        onClick={subscribeToCreator}
                        disabled={subscribing}
                        className="rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0A0A0A] hover:bg-[#C9A96E] transition-colors active:scale-95 disabled:opacity-40"
                      >
                        {subscribing ? "…" : "Abonnieren"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Physische Produkte */}
        {products.length > 0 && (
          <section className="mb-12">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Shop</p>
                <h2 className="mt-0.5 text-xl font-bold text-[#0A0A0A]">Produkte</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <div key={product.id} className="group overflow-hidden rounded-3xl bg-white border border-[#E5E0D8] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
                  {product.image_url ? (
                    <div className="aspect-square overflow-hidden bg-[#F5F0EA]">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-[#F5F0EA] to-[#E8E0D5]">
                      <span className="text-4xl text-[#C5C0B8]">◈</span>
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-[9px] uppercase tracking-widest text-[#C9A96E] font-medium">{product.category}</p>
                    <p className="mt-1 text-sm font-bold text-[#0A0A0A] leading-tight truncate">{product.name}</p>
                    {product.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#9E9890]">{product.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-[#0A0A0A]">
                        {(product.price_cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                      </span>
                      {product.stock > 0 ? (
                        <button
                          onClick={async () => {
                            if (!currentUserId) { alert("Bitte einloggen"); return; }
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user?.email) return;
                            const res = await fetch("/api/stripe/create-product-checkout", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ productId: product.id, quantity: 1, customerEmail: user.email, userId: currentUserId }),
                            });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                          }}
                          className="rounded-full bg-[#0A0A0A] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#C9A96E] hover:text-[#0A0A0A] active:scale-95 transition-all"
                        >
                          Kaufen
                        </button>
                      ) : (
                        <span className="rounded-full border border-[#E5E0D8] px-3 py-1 text-[10px] text-[#C5C0B8]">
                          Ausverkauft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fragrances */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Kollektion</p>
              <h2 className="mt-0.5 text-xl font-bold text-[#0A0A0A]">Veröffentlichte Düfte</h2>
            </div>
            <span className="rounded-full bg-[#F5F0EA] px-3 py-1 text-xs text-[#9E9890]">{fragrances.length}</span>
          </div>

          {fragrances.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E5E0D8] p-12 text-center">
              <p className="text-2xl text-[#C5C0B8] mb-3">◉</p>
              <p className="text-sm text-[#9E9890]">Aktuell keine öffentlichen Düfte.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fragrances.map((fragrance) => {
                const topComponents = Object.entries(fragrance.composition)
                  .filter(([, percent]) => percent > 0)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);

                return (
                  <Link
                    key={fragrance.id}
                    href={`/fragrance/${fragrance.id}`}
                    className="group block overflow-hidden rounded-3xl bg-white border border-[#E5E0D8] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {fragrance.imageUrl ? (
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={fragrance.imageUrl}
                          alt={fragrance.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {fragrance.category && (
                          <span className="absolute top-3 left-3 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-[10px] text-white uppercase tracking-wider">
                            {fragrance.category}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="relative flex h-52 w-full items-center justify-center bg-gradient-to-br from-[#F0EDE8] to-[#E5E0D8]">
                        <span className="text-5xl text-[#C5C0B8] group-hover:scale-110 transition-transform duration-500">◉</span>
                        {fragrance.category && (
                          <span className="absolute top-3 left-3 rounded-full bg-black/20 backdrop-blur-sm px-2.5 py-1 text-[10px] text-[#6E6860] uppercase tracking-wider">
                            {fragrance.category}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-[#0A0A0A]">{fragrance.name}</p>
                          <p className="text-[11px] text-[#9E9890]">{fragrance.sizeMl} ml</p>
                        </div>
                        <p className="shrink-0 text-base font-bold text-[#0A0A0A]">
                          {(fragrance.priceCents / 100).toFixed(2)} €
                        </p>
                      </div>

                      {topComponents.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {topComponents.map(([accordId, percent]) => (
                            <span key={accordId} className="rounded-full bg-[#F5F0EA] px-2.5 py-0.5 text-[10px] text-[#6E6860]">
                              {getAccordName(accordId)} {percent}%
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-[#C9A96E] font-medium">
                          Entdecken →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
