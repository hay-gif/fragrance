"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccordName } from "@/lib/accords";
import { supabase } from "@/lib/supabase";

type FollowedProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type FeedFragrance = {
  id: string;
  name: string;
  composition: Record<string, number>;
  createdAt: string;
  priceCents: number;
  sizeMl: number;
  category: string;
  description: string;
  imageUrl: string;
  ownerId: string | null;
};

type DbFollowRow = {
  creator_id: string;
};

type DbProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
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
  owner_id: string | null;
};

export default function FollowingPage() {
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [followedProfiles, setFollowedProfiles] = useState<FollowedProfile[]>(
    [],
  );
  const [fragrances, setFragrances] = useState<FeedFragrance[]>([]);

  useEffect(() => {
    async function loadFollowingFeed() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      const { data: followRows, error: followsError } = await supabase
        .from("creator_follows")
        .select("creator_id")
        .eq("follower_id", user.id);

      if (followsError) {
        console.error("Fehler beim Laden der Followings:", followsError);
        setLoading(false);
        return;
      }

      const creatorIds = (followRows ?? []).map(
        (row: DbFollowRow) => row.creator_id,
      );

      if (creatorIds.length === 0) {
        setFollowedProfiles([]);
        setFragrances([]);
        setLoading(false);
        return;
      }

      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url")
        .in("id", creatorIds);

      if (profilesError) {
        console.error("Fehler beim Laden der Profile:", profilesError);
        setLoading(false);
        return;
      }

      setFollowedProfiles((profileRows ?? []) as FollowedProfile[]);

      const { data: fragranceRows, error: fragrancesError } = await supabase
        .from("fragrances")
        .select(
          "id, name, composition, created_at, price_cents, size_ml, category, description, image_url, owner_id",
        )
        .in("owner_id", creatorIds)
        .eq("is_public", true)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (fragrancesError) {
        console.error("Fehler beim Laden des Duft-Feeds:", fragrancesError);
        setLoading(false);
        return;
      }

      const mappedFragrances: FeedFragrance[] = (fragranceRows ?? []).map(
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
          ownerId: row.owner_id,
        }),
      );

      setFragrances(mappedFragrances);
      setLoading(false);
    }

    loadFollowingFeed();
  }, []);

  function getProfileByOwnerId(ownerId: string | null) {
    if (!ownerId) return null;
    return followedProfiles.find((profile) => profile.id === ownerId) ?? null;
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
      <main className="min-h-screen bg-[#FAFAF8] pb-10">
        <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
          <h1 className="text-3xl font-bold text-white">Following</h1>
        </div>
        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#6E6860]">
              Bitte logge dich ein, um deinen Feed zu sehen.
            </p>
            <Link
              href="/auth"
              className="mt-4 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
            >
              Zum Login
            </Link>
          </div>
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
            <h1 className="text-3xl font-bold text-white">Following</h1>
            <p className="mt-1 text-xs text-white/40">
              Neue öffentliche Düfte von Profilen, denen du folgst.
            </p>
          </div>
          <Link
            href="/discover"
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white hover:border-white/60 transition-colors"
          >
            Zu Discover
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {followedProfiles.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6 text-center">
            <p className="text-sm text-[#6E6860]">Du folgst aktuell noch niemandem.</p>
            <Link
              href="/discover"
              className="mt-4 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
            >
              Creator und Düfte entdecken
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Du folgst</p>
              <div className="flex flex-wrap gap-2">
                {followedProfiles.map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/creator/${profile.username}`}
                    className="flex items-center gap-2 rounded-full border border-[#E5E0D8] px-3 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={
                          profile.display_name ||
                          profile.username ||
                          "Profilbild"
                        }
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-[#F0EDE8] flex items-center justify-center text-[10px] font-medium text-[#6E6860]">
                        {(profile.display_name || profile.username || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <span>
                      {profile.display_name || profile.username || "Profil"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Neue Düfte</p>

              {fragrances.length === 0 ? (
                <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                  <p className="text-sm text-[#6E6860]">
                    Von deinen gefolgten Profilen gibt es aktuell keine
                    öffentlichen Düfte.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {fragrances.map((fragrance) => {
                    const topComponents = Object.entries(fragrance.composition)
                      .filter(([, percent]) => percent > 0)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3);

                    const ownerProfile = getProfileByOwnerId(fragrance.ownerId);

                    return (
                      <Link
                        key={fragrance.id}
                        href={`/fragrance/${fragrance.id}`}
                        className="rounded-2xl bg-white border border-[#E5E0D8] p-5 transition-all hover:shadow-md hover:border-[#C5C0B8] cursor-pointer"
                      >
                        {fragrance.imageUrl ? (
                          <img
                            src={fragrance.imageUrl}
                            alt={fragrance.name}
                            className="mb-4 h-32 w-full rounded-xl object-cover"
                          />
                        ) : (
                          <div className="mb-4 h-32 w-full rounded-xl bg-[#F0EDE8] flex items-center justify-center">
                            <span className="text-[10px] uppercase tracking-widest text-[#C5C0B8]">Kein Bild</span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-[#0A0A0A]">
                              {fragrance.name}
                            </h3>
                            <p className="text-xs text-[#9E9890]">
                              {fragrance.sizeMl} ml
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-[#0A0A0A] shrink-0">
                            {(fragrance.priceCents / 100).toFixed(2)} €
                          </p>
                        </div>

                        {ownerProfile && (
                          <div className="mt-2 flex items-center gap-1.5">
                            {ownerProfile.avatar_url ? (
                              <img
                                src={ownerProfile.avatar_url}
                                alt={ownerProfile.display_name || ownerProfile.username || ""}
                                className="h-4 w-4 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-[#F0EDE8] flex items-center justify-center text-[8px] font-medium text-[#6E6860]">
                                {(ownerProfile.display_name || ownerProfile.username || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                            <p className="text-xs text-[#9E9890]">
                              {ownerProfile.display_name || ownerProfile.username}
                            </p>
                          </div>
                        )}

                        {fragrance.category && (
                          <div className="mt-2">
                            <span className="rounded-full bg-[#F0EDE8] px-2.5 py-0.5 text-[10px] text-[#6E6860]">
                              {fragrance.category}
                            </span>
                          </div>
                        )}

                        {fragrance.description && (
                          <p className="mt-3 line-clamp-2 text-xs text-[#6E6860]">
                            {fragrance.description}
                          </p>
                        )}

                        <div className="mt-3">
                          <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Top Noten</p>
                          <div className="flex flex-wrap gap-1.5">
                            {topComponents.map(([accordId, percent]) => (
                              <span
                                key={accordId}
                                className="rounded-full bg-[#F0EDE8] px-2.5 py-0.5 text-[10px] text-[#6E6860]"
                              >
                                {getAccordName(accordId)} · {percent}%
                              </span>
                            ))}
                          </div>
                        </div>

                        <p className="mt-3 text-[10px] text-[#C5C0B8]">
                          Erstellt am{" "}
                          {new Date(fragrance.createdAt).toLocaleDateString(
                            "de-DE",
                          )}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
