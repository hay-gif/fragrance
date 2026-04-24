"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SampleRequestStatus = "requested" | "shipped" | "received" | "tested";

type SampleRequest = {
  id: string;
  fragranceId: string;
  creatorId: string;
  status: SampleRequestStatus;
  createdAt: string;
  fragranceName: string;
  creatorEmail: string | null;
};

type DbSampleRequestRow = {
  id: string;
  fragrance_id: string;
  creator_id: string;
  status: SampleRequestStatus;
  created_at: string;
};

type DbFragranceRow = {
  id: string;
  name: string;
};

function getStatusBadgeClass(status: SampleRequestStatus): string {
  if (status === "requested") return "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-yellow-50 text-yellow-700 border border-yellow-200";
  if (status === "shipped") return "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200";
  if (status === "tested") return "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 border border-green-200";
  return "rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-[#F0EDE8] text-[#6E6860] border border-[#E5E0D8]";
}

export default function SamplesPage() {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadRequests() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: requestRows, error: requestError } = await supabase
        .from("sample_requests")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (requestError) {
        console.error("Fehler beim Laden der Sample-Requests:", requestError);
        setLoading(false);
        return;
      }

      const fragranceIds = Array.from(
        new Set(
          (requestRows ?? []).map(
            (row: DbSampleRequestRow) => row.fragrance_id,
          ),
        ),
      );

      let fragranceRows: DbFragranceRow[] = [];

      if (fragranceIds.length > 0) {
        const { data, error } = await supabase
          .from("fragrances")
          .select("id, name")
          .in("id", fragranceIds);

        if (error) {
          console.error("Fehler beim Laden der Duftnamen:", error);
          setLoading(false);
          return;
        }

        fragranceRows = data ?? [];
      }

      const fragranceMap = new Map(fragranceRows.map((f) => [f.id, f.name]));

      const mapped: SampleRequest[] = (requestRows ?? []).map(
        (row: DbSampleRequestRow) => ({
          id: row.id,
          fragranceId: row.fragrance_id,
          creatorId: row.creator_id,
          status: row.status,
          createdAt: row.created_at,
          fragranceName:
            fragranceMap.get(row.fragrance_id) ?? "Unbekannter Duft",
          creatorEmail: user.email ?? null,
        }),
      );

      setRequests(mapped);
      setLoading(false);
    }

    loadRequests();
  }, []);

  async function updateSampleRequestStatus(
    requestId: string,
    fragranceId: string,
    nextStatus: SampleRequestStatus,
  ) {
    setUpdatingId(requestId);

    const { error: requestError } = await supabase
      .from("sample_requests")
      .update({ status: nextStatus })
      .eq("id", requestId);

    if (requestError) {
      console.error(
        "Fehler beim Aktualisieren des Request-Status:",
        requestError,
      );
      alert("Request-Status konnte nicht aktualisiert werden.");
      setUpdatingId(null);
      return;
    }

    let fragranceSampleStatus: "requested" | "shipped" | "tested" = "requested";

    if (nextStatus === "shipped") {
      fragranceSampleStatus = "shipped";
    }

    if (nextStatus === "received" || nextStatus === "tested") {
      fragranceSampleStatus = "tested";
    }

    const { error: fragranceError } = await supabase
      .from("fragrances")
      .update({ sample_status: fragranceSampleStatus })
      .eq("id", fragranceId);

    if (fragranceError) {
      console.error(
        "Fehler beim Aktualisieren des Duft-Status:",
        fragranceError,
      );
      alert("Request wurde aktualisiert, aber Duftstatus nicht.");
      setUpdatingId(null);
      return;
    }

    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: nextStatus } : request,
      ),
    );

    setUpdatingId(null);
  }

  function getStatusLabel(status: SampleRequestStatus) {
    if (status === "requested") return "angefordert";
    if (status === "shipped") return "versendet";
    if (status === "received") return "erhalten";
    return "getestet";
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

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Samples</h1>
            <p className="mt-1 text-xs text-white/40">Übersicht über angeforderte Test-Samples.</p>
          </div>
          <Link
            href="/my-fragrances"
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white hover:border-white/60 transition-colors"
          >
            Meine Düfte
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {requests.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-8 text-center">
            <p className="text-sm text-[#6E6860]">Aktuell keine Sample-Anfragen vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#0A0A0A]">
                      {request.fragranceName}
                    </h2>
                    <p className="mt-1 text-xs text-[#9E9890]">
                      Angefragt am{" "}
                      {new Date(request.createdAt).toLocaleString("de-DE")}
                    </p>
                    <div className="mt-2">
                      <span className={getStatusBadgeClass(request.status)}>
                        {getStatusLabel(request.status)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/fragrance/${request.fragranceId}`}
                    className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                  >
                    Duft ansehen
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      updateSampleRequestStatus(
                        request.id,
                        request.fragranceId,
                        "requested",
                      )
                    }
                    disabled={updatingId === request.id}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                      request.status === "requested"
                        ? "bg-[#0A0A0A] text-white"
                        : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                    }`}
                  >
                    Angefordert
                  </button>

                  <button
                    onClick={() =>
                      updateSampleRequestStatus(
                        request.id,
                        request.fragranceId,
                        "shipped",
                      )
                    }
                    disabled={updatingId === request.id}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                      request.status === "shipped"
                        ? "bg-[#0A0A0A] text-white"
                        : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                    }`}
                  >
                    Versendet
                  </button>

                  <button
                    onClick={() =>
                      updateSampleRequestStatus(
                        request.id,
                        request.fragranceId,
                        "received",
                      )
                    }
                    disabled={updatingId === request.id}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                      request.status === "received"
                        ? "bg-[#0A0A0A] text-white"
                        : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                    }`}
                  >
                    Erhalten
                  </button>

                  <button
                    onClick={() =>
                      updateSampleRequestStatus(
                        request.id,
                        request.fragranceId,
                        "tested",
                      )
                    }
                    disabled={updatingId === request.id}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
                      request.status === "tested"
                        ? "bg-[#0A0A0A] text-white"
                        : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                    }`}
                  >
                    Getestet
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
