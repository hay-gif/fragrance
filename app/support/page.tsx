"use client";

// Support-Dashboard
// Zugänglich für: supporter, admin
// Funktionen: Bestellungs-Tracking, Kunden-Anfragen, Sample-Requests, Creator-Bewerbungen

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";

type SupportTab = "orders" | "samples" | "applications";

type SupportOrder = {
  id: string;
  createdAt: string;
  status: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  trackingNumber: string | null;
};

type SampleRequest = {
  id: string;
  createdAt: string;
  status: string;
  fragranceName: string;
  creatorEmail: string | null;
};

type Application = {
  id: string;
  createdAt: string;
  userEmail: string | null;
  userDisplayName: string | null;
  message: string | null;
  portfolioUrl: string | null;
  status: "pending" | "approved" | "rejected";
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  created: "Neu",
  in_production: "In Produktion",
  shipped: "Versendet",
  delivered: "Zugestellt",
  returned: "Retoure",
  cancelled: "Storniert",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  in_production: "bg-yellow-100 text-yellow-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  returned: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function SupportDashboardPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SupportTab>("orders");

  const [orders, setOrders] = useState<SupportOrder[]>([]);
  const [samples, setSamples] = useState<SampleRequest[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<Record<string, string>>({});
  const [editTracking, setEditTracking] = useState<Record<string, string>>({});
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const [appNotes, setAppNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const profile = await getOwnProfile();
      if (!profile || !["supporter", "admin"].includes(profile.role)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);

      // Bestellungen laden
      const { data: orderRows } = await supabase
        .from("orders")
        .select("id, created_at, status, customer_name, customer_email, total_cents, tracking_number")
        .order("created_at", { ascending: false })
        .limit(100);

      const mappedOrders: SupportOrder[] = (orderRows ?? []).map((r: {
        id: string; created_at: string; status: string;
        customer_name: string; customer_email: string; total_cents: number;
        tracking_number: string | null;
      }) => ({
        id: r.id, createdAt: r.created_at, status: r.status,
        customerName: r.customer_name, customerEmail: r.customer_email,
        totalCents: r.total_cents, trackingNumber: r.tracking_number,
      }));
      setOrders(mappedOrders);
      const statusInit: Record<string, string> = {};
      const trackingInit: Record<string, string> = {};
      for (const o of mappedOrders) {
        statusInit[o.id] = o.status;
        trackingInit[o.id] = o.trackingNumber ?? "";
      }
      setEditStatus(statusInit);
      setEditTracking(trackingInit);

      // Sample Requests
      const { data: sampleRows } = await supabase
        .from("sample_requests")
        .select("id, created_at, status, fragrance_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (sampleRows && sampleRows.length > 0) {
        const fragranceIds = sampleRows.map((r: { fragrance_id: string }) => r.fragrance_id);
        const { data: frRows } = await supabase
          .from("fragrances")
          .select("id, name, creator_id")
          .in("id", fragranceIds);

        const frMap = new Map(
          (frRows ?? []).map((r: { id: string; name: string; creator_id: string | null }) => [r.id, r])
        );
        const creatorIds = [...new Set((frRows ?? []).map((r: { creator_id: string | null }) => r.creator_id).filter(Boolean))];
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", creatorIds);
        const profileMap = new Map((profileRows ?? []).map((r: { id: string; email: string | null }) => [r.id, r.email]));

        setSamples(sampleRows.map((r: { id: string; created_at: string; status: string; fragrance_id: string }) => {
          const fr = frMap.get(r.fragrance_id);
          return {
            id: r.id, createdAt: r.created_at, status: r.status,
            fragranceName: fr?.name ?? "–",
            creatorEmail: fr?.creator_id ? (profileMap.get(fr.creator_id) ?? null) : null,
          };
        }));
      }

      // Creator-Bewerbungen (pending)
      const { data: appRows } = await supabase
        .from("creator_applications")
        .select("id, created_at, user_id, message, portfolio_url, status, admin_note")
        .order("created_at", { ascending: false })
        .limit(50);

      if (appRows && appRows.length > 0) {
        const userIds = appRows.map((r: { user_id: string }) => r.user_id);
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, email, display_name")
          .in("id", userIds);
        const profMap = new Map((profileRows ?? []).map((r: {
          id: string; email: string | null; display_name: string | null
        }) => [r.id, r]));

        setApplications(appRows.map((r: {
          id: string; created_at: string; user_id: string;
          message: string | null; portfolio_url: string | null; status: string; admin_note: string | null;
        }) => {
          const prof = profMap.get(r.user_id);
          return {
            id: r.id, createdAt: r.created_at,
            userEmail: prof?.email ?? null, userDisplayName: prof?.display_name ?? null,
            message: r.message, portfolioUrl: r.portfolio_url,
            status: r.status as "pending" | "approved" | "rejected",
          };
        }));

        const notesInit: Record<string, string> = {};
        for (const r of appRows as { id: string; admin_note: string | null }[]) {
          notesInit[r.id] = r.admin_note ?? "";
        }
        setAppNotes(notesInit);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function saveOrder(orderId: string) {
    setUpdatingOrderId(orderId);
    await supabase
      .from("orders")
      .update({
        status: editStatus[orderId],
        tracking_number: editTracking[orderId] || null,
      })
      .eq("id", orderId);
    setOrders((prev) => prev.map((o) =>
      o.id === orderId
        ? { ...o, status: editStatus[orderId], trackingNumber: editTracking[orderId] || null }
        : o
    ));
    setUpdatingOrderId(null);
  }

  async function reviewApplication(appId: string, decision: "approved" | "rejected") {
    setProcessingAppId(appId);
    await supabase
      .from("creator_applications")
      .update({ status: decision, admin_note: appNotes[appId] ?? "" })
      .eq("id", appId);
    if (decision === "approved") {
      const app = applications.find((a) => a.id === appId);
      if (app) {
        // find user id from user_id in applications – need to re-fetch
        const { data: appRow } = await supabase
          .from("creator_applications")
          .select("user_id")
          .eq("id", appId)
          .single();
        if (appRow) {
          await supabase.from("profiles").update({ role: "creator", creator_status: "unlocked" }).eq("id", appRow.user_id);
        }
      }
    }
    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status: decision } : a));
    setProcessingAppId(null);
  }

  if (authorized === null || loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#C9A96E] border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#0A0A0A]">Kein Zugriff</p>
          <p className="mt-1 text-sm text-[#9E9890]">Nur für Supporter und Admins.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-[#C9A96E] hover:underline">Zurück</Link>
        </div>
      </main>
    );
  }

  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || o.customerName.toLowerCase().includes(q) || o.customerEmail.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pendingApps = applications.filter((a) => a.status === "pending");

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Support-Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold text-[#0A0A0A]">Kundensupport</h1>
          </div>
          <div className="flex items-center gap-2">
            {pendingApps.length > 0 && (
              <span className="rounded-full bg-[#C9A96E] px-3 py-1 text-xs font-medium text-white">
                {pendingApps.length} offene Bewerbung{pendingApps.length !== 1 ? "en" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Bestellungen gesamt", value: orders.length },
            { label: "Offene Samples", value: samples.filter((s) => s.status === "requested").length },
            { label: "Offene Bewerbungen", value: pendingApps.length },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="text-sm text-[#9E9890]">{s.label}</p>
              <p className="mt-2 text-2xl font-light text-[#0A0A0A]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 border-b border-[#E5E0D8]">
          {(["orders", "samples", "applications"] as SupportTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-[#0A0A0A] text-[#0A0A0A]"
                  : "border-transparent text-[#9E9890] hover:text-[#0A0A0A]"
              }`}
            >
              {t === "orders" ? "Bestellungen" : t === "samples" ? "Sample-Requests" : "Bewerbungen"}
              {t === "applications" && pendingApps.length > 0 && (
                <span className="ml-1.5 rounded-full bg-[#C9A96E] px-1.5 py-0.5 text-[10px] text-white">{pendingApps.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── BESTELLUNGEN ── */}
        {tab === "orders" && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-3">
              <input
                placeholder="Suche nach Name, E-Mail, Bestell-ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-52 rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
              >
                <option value="all">Alle Status</option>
                {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                      <th className="px-4 py-3 font-medium">Kunde</th>
                      <th className="px-4 py-3 font-medium">Datum</th>
                      <th className="px-4 py-3 font-medium">Betrag</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Tracking</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 50).map((order) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#0A0A0A]">{order.customerName}</p>
                          <p className="text-xs text-[#9E9890]">{order.customerEmail}</p>
                          <p className="text-[10px] font-mono text-[#C5C0B8]">{order.id.slice(0, 8)}…</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#9E9890]">
                          {new Date(order.createdAt).toLocaleDateString("de-DE")}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {(order.totalCents / 100).toFixed(2)} €
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editStatus[order.id] ?? order.status}
                            onChange={(e) => setEditStatus((prev) => ({ ...prev, [order.id]: e.target.value }))}
                            className="rounded-lg border border-[#E5E0D8] px-2 py-1 text-xs focus:outline-none focus:border-[#0A0A0A]"
                          >
                            {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            placeholder="Tracking-Nr."
                            value={editTracking[order.id] ?? ""}
                            onChange={(e) => setEditTracking((prev) => ({ ...prev, [order.id]: e.target.value }))}
                            className="w-36 rounded-lg border border-[#E5E0D8] px-2 py-1 text-xs focus:outline-none focus:border-[#0A0A0A]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => saveOrder(order.id)}
                            disabled={updatingOrderId === order.id}
                            className="rounded-lg border border-[#E5E0D8] px-3 py-1 text-xs hover:bg-[#0A0A0A] hover:text-white disabled:opacity-40 transition-colors"
                          >
                            {updatingOrderId === order.id ? "…" : "Speichern"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredOrders.length === 0 && (
                <p className="px-4 py-6 text-sm text-center text-[#9E9890]">Keine Bestellungen gefunden.</p>
              )}
            </div>
          </div>
        )}

        {/* ── SAMPLE REQUESTS ── */}
        {tab === "samples" && (
          <div className="mt-5">
            <div className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                    <th className="px-4 py-3 font-medium">Duft</th>
                    <th className="px-4 py-3 font-medium">Creator</th>
                    <th className="px-4 py-3 font-medium">Datum</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium text-[#0A0A0A]">{s.fragranceName}</td>
                      <td className="px-4 py-3 text-xs text-[#9E9890]">{s.creatorEmail ?? "–"}</td>
                      <td className="px-4 py-3 text-xs text-[#9E9890]">
                        {new Date(s.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          s.status === "requested" ? "bg-blue-100 text-blue-700" :
                          s.status === "shipped" ? "bg-purple-100 text-purple-700" :
                          s.status === "received" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {s.status === "requested" ? "Angefordert" :
                           s.status === "shipped" ? "Versendet" :
                           s.status === "received" ? "Erhalten" : "Getestet"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {samples.length === 0 && (
                <p className="px-4 py-6 text-sm text-center text-[#9E9890]">Keine Sample-Requests vorhanden.</p>
              )}
            </div>
          </div>
        )}

        {/* ── BEWERBUNGEN ── */}
        {tab === "applications" && (
          <div className="mt-5 space-y-3">
            {applications.length === 0 && (
              <p className="text-sm text-center text-[#9E9890] py-8">Keine Bewerbungen vorhanden.</p>
            )}
            {applications.map((app) => (
              <div key={app.id} className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-[#0A0A0A]">{app.userDisplayName ?? app.userEmail ?? "Unbekannt"}</p>
                    <p className="text-xs text-[#9E9890]">{app.userEmail} · {new Date(app.createdAt).toLocaleDateString("de-DE")}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    app.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    app.status === "approved" ? "bg-green-100 text-green-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {app.status === "pending" ? "Offen" : app.status === "approved" ? "Genehmigt" : "Abgelehnt"}
                  </span>
                </div>
                {app.message && (
                  <p className="mt-3 text-sm text-[#6E6860] bg-[#FAFAF8] rounded-lg p-3">{app.message}</p>
                )}
                {app.portfolioUrl && (
                  <a href={app.portfolioUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-[#C9A96E] hover:underline">
                    Portfolio / Social Links ↗
                  </a>
                )}
                {app.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Admin-Notiz (intern)"
                      value={appNotes[app.id] ?? ""}
                      onChange={(e) => setAppNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                      className="w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#0A0A0A]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewApplication(app.id, "approved")}
                        disabled={processingAppId === app.id}
                        className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
                      >
                        Genehmigen
                      </button>
                      <button
                        onClick={() => reviewApplication(app.id, "rejected")}
                        disabled={processingAppId === app.id}
                        className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Ablehnen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
