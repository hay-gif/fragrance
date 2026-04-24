"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccordName } from "@/lib/accords";
import { supabase } from "@/lib/supabase";
import { getOwnProfile, type Profile } from "@/lib/profile";

type Fragrance = {
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

function mapDbFragrance(row: DbFragranceRow): Fragrance {
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

function getSampleStatusLabel(status: Fragrance["sampleStatus"]): string {
  if (status === "not_requested") return "nicht angefordert";
  if (status === "requested") return "angefordert";
  if (status === "shipped") return "versendet";
  return "getestet";
}

function getSampleStatusBadgeClass(status: Fragrance["sampleStatus"]): string {
  if (status === "tested") return "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200";
  if (status === "shipped") return "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200";
  if (status === "requested") return "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-yellow-50 text-yellow-700 border border-yellow-200";
  return "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-[#F0EDE8] text-[#6E6860] border border-[#E5E0D8]";
}

export default function MyFragrancesPage() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const isCreator =
    profile?.role === "creator" ||
    profile?.creator_status === "invited" ||
    profile?.creator_status === "unlocked";

  async function toggleVisibility(fragranceId: string, currentValue: boolean) {
    if (!isCreator) {
      alert("Nur Creator können Düfte veröffentlichen.");
      return;
    }

    if (!currentValue) {
      const fragranceToPublish = fragrances.find(
        (fragrance) => fragrance.id === fragranceId,
      );

      if (!fragranceToPublish) {
        alert("Duft konnte nicht gefunden werden.");
        return;
      }

      if (fragranceToPublish.sampleStatus !== "tested") {
        alert(
          "Dieser Duft kann erst veröffentlicht werden, nachdem du ihn getestet hast.",
        );
        return;
      }

      if (!fragranceToPublish.category.trim()) {
        alert(
          "Dieser Duft kann erst veröffentlicht werden, wenn eine Kategorie gesetzt wurde.",
        );
        return;
      }

      if (!fragranceToPublish.description.trim()) {
        alert(
          "Dieser Duft kann erst veröffentlicht werden, wenn eine Beschreibung hinterlegt wurde.",
        );
        return;
      }
    }

    const nextValue = !currentValue;

    const { error } = await supabase
      .from("fragrances")
      .update({ is_public: nextValue })
      .eq("id", fragranceId);

    if (error) {
      console.error("Fehler beim Aktualisieren der Sichtbarkeit:", error);
      alert("Sichtbarkeit konnte nicht geändert werden.");
      return;
    }

    setFragrances((prev) =>
      prev.map((fragrance) =>
        fragrance.id === fragranceId
          ? { ...fragrance, isPublic: nextValue }
          : fragrance,
      ),
    );
  }

  async function markAsTested(fragranceId: string) {
    const { error } = await supabase
      .from("fragrances")
      .update({ sample_status: "tested" })
      .eq("id", fragranceId);

    if (error) {
      console.error("Fehler beim Aktualisieren des Sample-Status:", error);
      alert("Sample-Status konnte nicht aktualisiert werden.");
      return;
    }

    setFragrances((prev) =>
      prev.map((item) =>
        item.id === fragranceId ? { ...item, sampleStatus: "tested" } : item,
      ),
    );
  }

  async function requestSample(fragranceId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Bitte logge dich ein.");
      return;
    }

    const requestId = crypto.randomUUID();

    const { error: requestError } = await supabase
      .from("sample_requests")
      .insert({
        id: requestId,
        fragrance_id: fragranceId,
        creator_id: user.id,
        status: "requested",
      });

    if (requestError) {
      console.error("Fehler beim Anlegen der Sample-Anfrage:", requestError);
      alert("Sample konnte nicht angefordert werden.");
      return;
    }

    const { error: fragranceError } = await supabase
      .from("fragrances")
      .update({ sample_status: "requested" })
      .eq("id", fragranceId);

    if (fragranceError) {
      console.error("Fehler beim Aktualisieren des Duft-Status:", fragranceError);
      alert("Sample-Anfrage wurde erstellt, aber Duftstatus konnte nicht aktualisiert werden.");
      return;
    }

    setFragrances((prev) =>
      prev.map((item) =>
        item.id === fragranceId
          ? { ...item, sampleStatus: "requested" }
          : item
      )
    );
  }

  async function markAsShipped(fragranceId: string) {
    const { error } = await supabase
      .from("fragrances")
      .update({ sample_status: "shipped" })
      .eq("id", fragranceId);

    if (error) {
      console.error("Fehler beim Setzen auf versendet:", error);
      alert("Sample-Status konnte nicht auf versendet gesetzt werden.");
      return;
    }

    setFragrances((prev) =>
      prev.map((item) =>
        item.id === fragranceId ? { ...item, sampleStatus: "shipped" } : item,
      ),
    );
  }

  useEffect(() => {
    async function loadOwnFragrances() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      const ownProfile = await getOwnProfile();
      setProfile(ownProfile);

      const { data, error } = await supabase
        .from("fragrances")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden eigener Düfte:", error);
        setLoading(false);
        return;
      }

      setFragrances((data ?? []).map(mapDbFragrance));
      setLoading(false);
    }

    loadOwnFragrances();
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

  if (notLoggedIn) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] pb-10">
        <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
          <h1 className="text-3xl font-bold text-white">Meine Düfte</h1>
        </div>
        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#6E6860]">
              Bitte logge dich ein, um deine eigenen Düfte zu sehen.
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
            <h1 className="text-3xl font-bold text-white">Meine Düfte</h1>
            <p className="mt-1 text-xs text-white/40">
              {fragrances.length} {fragrances.length === 1 ? "Komposition" : "Kompositionen"} · {profile ? `${profile.role} / ${profile.creator_status}` : ""}
            </p>
          </div>
          <Link
            href="/create"
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white hover:border-white/60 transition-colors"
          >
            Duft erstellen
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">
          Öffentliche Veröffentlichung ist nur für Creator vorgesehen. Creator können Düfte erst veröffentlichen, nachdem sie ein Testsample erhalten und getestet haben.
        </p>

        {fragrances.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-8 text-center">
            <p className="text-sm text-[#6E6860]">Du hast noch keine Düfte erstellt.</p>
            <Link
              href="/create"
              className="mt-4 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
            >
              Neuen Duft erstellen
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fragrances.map((fragrance) => {
              const topComponents = Object.entries(fragrance.composition)
                .filter(([, percent]) => percent > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 2);

              const canPublish =
                isCreator &&
                fragrance.sampleStatus === "tested" &&
                fragrance.category.trim().length > 0 &&
                fragrance.description.trim().length > 0;

              return (
                <div
                  key={fragrance.id}
                  className="rounded-2xl bg-white border border-[#E5E0D8] p-5"
                >
                  {fragrance.imageUrl && (
                    <img
                      src={fragrance.imageUrl}
                      alt={fragrance.name}
                      className="mb-4 h-36 w-full rounded-xl object-cover"
                    />
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/fragrance/${fragrance.id}`}
                        className="text-base font-semibold text-[#0A0A0A] hover:underline"
                      >
                        {fragrance.name}
                      </Link>
                      <p className="text-xs text-[#9E9890]">{fragrance.sizeMl} ml</p>
                    </div>
                    <p className="text-sm font-semibold text-[#0A0A0A] shrink-0">
                      {(fragrance.priceCents / 100).toFixed(2)} €
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={
                        fragrance.status === "active"
                          ? "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200"
                          : "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-[#F0EDE8] text-[#6E6860] border border-[#E5E0D8]"
                      }
                    >
                      {fragrance.status === "active" ? "Aktiv" : "Entwurf"}
                    </span>
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-[#F0EDE8] text-[#6E6860] border border-[#E5E0D8]">
                      {fragrance.isPublic ? "Öffentlich" : "Privat"}
                    </span>
                    {fragrance.category && (
                      <span className="rounded-full bg-[#F0EDE8] px-2.5 py-0.5 text-[10px] text-[#6E6860]">
                        {fragrance.category}
                      </span>
                    )}
                    <span className={getSampleStatusBadgeClass(fragrance.sampleStatus)}>
                      Sample: {getSampleStatusLabel(fragrance.sampleStatus)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Top Noten</p>
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

                  {fragrance.description && (
                    <p className="mt-3 text-xs text-[#6E6860] line-clamp-2">
                      {fragrance.description}
                    </p>
                  )}

                  {!fragrance.isPublic && (
                    <div className="mt-3 space-y-0.5 text-[10px] text-[#9E9890]">
                      {fragrance.sampleStatus !== "tested" && (
                        <p>• Vor Veröffentlichung muss der Duft getestet sein.</p>
                      )}
                      {!fragrance.category.trim() && (
                        <p>• Vor Veröffentlichung muss eine Kategorie gesetzt werden.</p>
                      )}
                      {!fragrance.description.trim() && (
                        <p>• Vor Veröffentlichung muss eine Beschreibung hinterlegt werden.</p>
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-[10px] text-[#C5C0B8]">
                    Erstellt am{" "}
                    {new Date(fragrance.createdAt).toLocaleDateString("de-DE")}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/fragrance/${fragrance.id}`}
                      className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                    >
                      Ansehen
                    </Link>
                    <Link
                      href={`/fragrance/${fragrance.id}/edit`}
                      className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                    >
                      Bearbeiten
                    </Link>
                    {isCreator ? (
                      <>
                        {fragrance.sampleStatus === "not_requested" && (
                          <button
                            onClick={() => requestSample(fragrance.id)}
                            className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                          >
                            Sample anfordern
                          </button>
                        )}

                        {fragrance.sampleStatus === "requested" && (
                          <button
                            onClick={() => markAsShipped(fragrance.id)}
                            className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                          >
                            Als versendet markieren
                          </button>
                        )}

                        {fragrance.sampleStatus === "shipped" && (
                          <button
                            onClick={() => markAsTested(fragrance.id)}
                            className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                          >
                            Als getestet markieren
                          </button>
                        )}

                        <button
                          onClick={() =>
                            toggleVisibility(fragrance.id, fragrance.isPublic)
                          }
                          disabled={!fragrance.isPublic && !canPublish}
                          className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                            !fragrance.isPublic && !canPublish
                              ? "border border-[#E5E0D8] text-[#C5C0B8] cursor-not-allowed"
                              : fragrance.isPublic
                              ? "border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                              : "bg-[#0A0A0A] text-white uppercase tracking-wider active:scale-95"
                          }`}
                        >
                          {fragrance.isPublic
                            ? "Privat stellen"
                            : "Veröffentlichen"}
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs text-[#C5C0B8]">
                        Veröffentlichung nur für Creator
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
