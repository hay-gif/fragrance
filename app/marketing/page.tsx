"use client";

// Marketing-Dashboard
// Zugänglich für: marketing, admin
// Funktionen: Creator-Performance, Top-Düfte, Analytics-Übersicht, Content-Kalender, Kampagnen

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";
import LineChart from "@/components/LineChart";

type MarketingTab = "overview" | "creators" | "fragrances" | "analytics";

type CreatorStat = {
  id: string;
  displayName: string | null;
  username: string | null;
  email: string | null;
  commissionPercent: number;
  totalRevenueCents: number;
  totalOrders: number;
};

type FragranceStat = {
  id: string;
  name: string;
  category: string;
  creatorName: string | null;
  totalSold: number;
  totalRevenueCents: number;
};

type AnalyticsEvent = {
  eventType: string;
  count: number;
};

export default function MarketingDashboardPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<MarketingTab>("overview");

  const [creatorStats, setCreatorStats] = useState<CreatorStat[]>([]);
  const [fragranceStats, setFragranceStats] = useState<FragranceStat[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenueCents, setTotalRevenueCents] = useState(0);
  const [totalCreators, setTotalCreators] = useState(0);
  const [totalFragrances, setTotalFragrances] = useState(0);
  const [chartRange, setChartRange] = useState<7 | 30 | 90>(30);
  const [revenueByDay, setRevenueByDay] = useState<{ label: string; value: number }[]>([]);
  const [ordersByDay, setOrdersByDay] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    async function load() {
      const profile = await getOwnProfile();
      if (!profile || !["marketing", "admin"].includes(profile.role)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);

      // Creator-Performance
      const { data: orderItemRows } = await supabase
        .from("order_items")
        .select("creator_id, price_cents, quantity, order_id")
        .not("creator_id", "is", null);

      // Creator-Statistiken aggregieren
      const creatorMap = new Map<string, { revCents: number; orders: Set<string> }>();
      for (const row of (orderItemRows ?? []) as {
        creator_id: string; price_cents: number; quantity: number; order_id: string
      }[]) {
        if (!row.creator_id) continue;
        if (!creatorMap.has(row.creator_id)) creatorMap.set(row.creator_id, { revCents: 0, orders: new Set() });
        const entry = creatorMap.get(row.creator_id)!;
        entry.revCents += row.price_cents * row.quantity;
        entry.orders.add(row.order_id);
      }

      if (creatorMap.size > 0) {
        const creatorIds = [...creatorMap.keys()];
        const { data: profRows } = await supabase
          .from("profiles")
          .select("id, display_name, username, email, commission_percent")
          .in("id", creatorIds);

        const stats: CreatorStat[] = (profRows ?? []).map((p: {
          id: string; display_name: string | null; username: string | null;
          email: string | null; commission_percent: number;
        }) => ({
          id: p.id,
          displayName: p.display_name,
          username: p.username,
          email: p.email,
          commissionPercent: p.commission_percent,
          totalRevenueCents: creatorMap.get(p.id)?.revCents ?? 0,
          totalOrders: creatorMap.get(p.id)?.orders.size ?? 0,
        }));
        stats.sort((a, b) => b.totalRevenueCents - a.totalRevenueCents);
        setCreatorStats(stats);
      }

      // Top Düfte
      const { data: frRows } = await supabase
        .from("fragrances")
        .select("id, name, category, creator_id")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (frRows && frRows.length > 0) {
        const frIds = frRows.map((r: { id: string }) => r.id);
        const { data: itemRows } = await supabase
          .from("order_items")
          .select("fragrance_id, price_cents, quantity")
          .in("fragrance_id", frIds);

        const frRevMap = new Map<string, { rev: number; sold: number }>();
        for (const row of (itemRows ?? []) as { fragrance_id: string; price_cents: number; quantity: number }[]) {
          if (!frRevMap.has(row.fragrance_id)) frRevMap.set(row.fragrance_id, { rev: 0, sold: 0 });
          const e = frRevMap.get(row.fragrance_id)!;
          e.rev += row.price_cents * row.quantity;
          e.sold += row.quantity;
        }

        const creatorIds = [...new Set(frRows.map((r: { creator_id: string | null }) => r.creator_id).filter(Boolean))];
        const { data: cProfs } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", creatorIds);
        const cProfMap = new Map(
          (cProfs ?? []).map((r: { id: string; display_name: string | null; username: string | null }) =>
            [r.id, r.display_name ?? r.username ?? "Creator"])
        );

        const frStats: FragranceStat[] = frRows.map((r: {
          id: string; name: string; category: string | null; creator_id: string | null
        }) => ({
          id: r.id,
          name: r.name,
          category: r.category ?? "–",
          creatorName: r.creator_id ? (cProfMap.get(r.creator_id) ?? null) : null,
          totalSold: frRevMap.get(r.id)?.sold ?? 0,
          totalRevenueCents: frRevMap.get(r.id)?.rev ?? 0,
        }));
        frStats.sort((a, b) => b.totalRevenueCents - a.totalRevenueCents);
        setFragranceStats(frStats);
        setTotalFragrances(frRows.length);
      }

      // Gesamt-KPIs
      const { data: allOrders } = await supabase
        .from("orders")
        .select("id, total_cents")
        .not("status", "eq", "cancelled");
      setTotalOrders((allOrders ?? []).length);
      setTotalRevenueCents((allOrders ?? []).reduce((s: number, r: { total_cents: number }) => s + r.total_cents, 0));

      const { count: creatorCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "creator");
      setTotalCreators(creatorCount ?? 0);

      // Analytics-Events
      const { data: eventRows } = await supabase
        .from("analytics_events")
        .select("event_type")
        .order("created_at", { ascending: false })
        .limit(500);

      if (eventRows) {
        const countMap = new Map<string, number>();
        for (const row of eventRows as { event_type: string }[]) {
          countMap.set(row.event_type, (countMap.get(row.event_type) ?? 0) + 1);
        }
        setAnalyticsEvents(
          Array.from(countMap.entries())
            .map(([eventType, count]) => ({ eventType, count }))
            .sort((a, b) => b.count - a.count)
        );
      }

      // Zeitreihe: Umsatz + Bestellungen der letzten 90 Tage
      const since90 = new Date(Date.now() - 90 * 86400_000).toISOString();
      const { data: tsOrders } = await supabase
        .from("orders")
        .select("total_cents, paid_at")
        .not("status", "eq", "cancelled")
        .gte("paid_at", since90)
        .order("paid_at", { ascending: true });

      if (tsOrders) {
        const dayRevMap = new Map<string, number>();
        const dayOrdMap = new Map<string, number>();
        for (const o of tsOrders as { total_cents: number; paid_at: string | null }[]) {
          if (!o.paid_at) continue;
          const day = o.paid_at.slice(0, 10);
          dayRevMap.set(day, (dayRevMap.get(day) ?? 0) + o.total_cents);
          dayOrdMap.set(day, (dayOrdMap.get(day) ?? 0) + 1);
        }
        // Build full 90-day series (fill missing days with 0)
        const series90rev: { label: string; value: number }[] = [];
        const series90ord: { label: string; value: number }[] = [];
        for (let i = 89; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400_000);
          const key = d.toISOString().slice(0, 10);
          const label = `${d.getDate()}.${d.getMonth() + 1}.`;
          series90rev.push({ label, value: Math.round((dayRevMap.get(key) ?? 0) / 100) });
          series90ord.push({ label, value: dayOrdMap.get(key) ?? 0 });
        }
        setRevenueByDay(series90rev);
        setOrdersByDay(series90ord);
      }

      setLoading(false);
    }
    load();
  }, []);

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
          <p className="mt-1 text-sm text-[#9E9890]">Nur für Marketing und Admins.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-[#C9A96E] hover:underline">Zurück</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Header */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Marketing-Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-[#0A0A0A]">Marketing & Wachstum</h1>
        </div>

        {/* KPI-Kacheln */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Gesamtumsatz", value: `${(totalRevenueCents / 100).toFixed(0)} €` },
            { label: "Bestellungen", value: totalOrders },
            { label: "Aktive Creators", value: totalCreators },
            { label: "Öffentliche Düfte", value: totalFragrances },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="text-sm text-[#9E9890]">{kpi.label}</p>
              <p className="mt-2 text-2xl font-light text-[#0A0A0A]">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 border-b border-[#E5E0D8]">
          {([
            { key: "overview", label: "Übersicht" },
            { key: "creators", label: "Creator-Performance" },
            { key: "fragrances", label: "Top-Düfte" },
            { key: "analytics", label: "Analytics" },
          ] as { key: MarketingTab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? "border-[#0A0A0A] text-[#0A0A0A]"
                  : "border-transparent text-[#9E9890] hover:text-[#0A0A0A]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── ÜBERSICHT ── */}
        {tab === "overview" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* Top 5 Creators */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A]">Top Creator</h2>
              <div className="mt-3 space-y-2">
                {creatorStats.slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-mono text-[#9E9890] text-right">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.displayName ?? c.username ?? c.email ?? "–"}</p>
                      <p className="text-xs text-[#9E9890]">{c.totalOrders} Bestellungen</p>
                    </div>
                    <p className="text-sm font-semibold">{(c.totalRevenueCents / 100).toFixed(0)} €</p>
                  </div>
                ))}
                {creatorStats.length === 0 && <p className="text-sm text-[#9E9890]">Noch keine Daten.</p>}
              </div>
            </div>

            {/* Top 5 Düfte */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A]">Top Düfte</h2>
              <div className="mt-3 space-y-2">
                {fragranceStats.slice(0, 5).map((f, i) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-mono text-[#9E9890] text-right">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-[#9E9890]">{f.totalSold} verkauft · {f.creatorName ?? "–"}</p>
                    </div>
                    <p className="text-sm font-semibold">{(f.totalRevenueCents / 100).toFixed(0)} €</p>
                  </div>
                ))}
                {fragranceStats.length === 0 && <p className="text-sm text-[#9E9890]">Noch keine Daten.</p>}
              </div>
            </div>

            {/* Quick-Links */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5 lg:col-span-2">
              <h2 className="text-base font-semibold text-[#0A0A0A]">Schnellzugriff</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  { label: "Creator-Bewerbungen prüfen", href: "/support", desc: "Im Support-Dashboard" },
                  { label: "Discover-Feed", href: "/discover", desc: "Öffentliche Düfte ansehen" },
                  { label: "Rankings", href: "/rankings", desc: "Top-Creator & Düfte" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl border border-[#E5E0D8] p-3 hover:border-[#0A0A0A] hover:bg-[#FAFAF8] transition-all"
                  >
                    <p className="text-sm font-medium text-[#0A0A0A]">{link.label}</p>
                    <p className="text-xs text-[#9E9890]">{link.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CREATOR-PERFORMANCE ── */}
        {tab === "creators" && (
          <div className="mt-5">
            <div className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Creator</th>
                      <th className="px-4 py-3 font-medium text-right">Umsatz</th>
                      <th className="px-4 py-3 font-medium text-right">Bestellungen</th>
                      <th className="px-4 py-3 font-medium text-right">Provision %</th>
                      <th className="px-4 py-3 font-medium text-right">Provision €</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {creatorStats.map((c, i) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-xs font-mono text-[#9E9890]">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{c.displayName ?? c.username ?? "–"}</p>
                          <p className="text-xs text-[#9E9890]">{c.email}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{(c.totalRevenueCents / 100).toFixed(2)} €</td>
                        <td className="px-4 py-3 text-right">{c.totalOrders}</td>
                        <td className="px-4 py-3 text-right text-[#9E9890]">{c.commissionPercent}%</td>
                        <td className="px-4 py-3 text-right text-[#C9A96E] font-medium">
                          {((c.totalRevenueCents * c.commissionPercent) / 10000).toFixed(2)} €
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/creator/${c.username ?? c.id}`} className="text-[10px] text-[#9E9890] hover:text-[#0A0A0A]">
                            Profil →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {creatorStats.length === 0 && (
                <p className="px-4 py-6 text-sm text-center text-[#9E9890]">Noch keine Creator-Daten.</p>
              )}
            </div>
          </div>
        )}

        {/* ── TOP-DÜFTE ── */}
        {tab === "fragrances" && (
          <div className="mt-5">
            <div className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Duft</th>
                      <th className="px-4 py-3 font-medium">Kategorie</th>
                      <th className="px-4 py-3 font-medium">Creator</th>
                      <th className="px-4 py-3 font-medium text-right">Verkauft</th>
                      <th className="px-4 py-3 font-medium text-right">Umsatz</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {fragranceStats.map((f, i) => (
                      <tr key={f.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-xs font-mono text-[#9E9890]">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-[#0A0A0A]">{f.name}</td>
                        <td className="px-4 py-3 text-xs text-[#9E9890]">{f.category}</td>
                        <td className="px-4 py-3 text-xs text-[#9E9890]">{f.creatorName ?? "–"}</td>
                        <td className="px-4 py-3 text-right">{f.totalSold}</td>
                        <td className="px-4 py-3 text-right font-semibold">{(f.totalRevenueCents / 100).toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <Link href={`/fragrance/${f.id}`} className="text-[10px] text-[#9E9890] hover:text-[#0A0A0A]">→</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fragranceStats.length === 0 && (
                <p className="px-4 py-6 text-sm text-center text-[#9E9890]">Noch keine Daten.</p>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && (
          <div className="mt-5 space-y-5">

            {/* Zeitraum-Selector */}
            <div className="flex gap-2">
              {([7, 30, 90] as const).map((d) => (
                <button key={d} onClick={() => setChartRange(d)}
                  className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    chartRange === d
                      ? "bg-[#0A0A0A] text-white"
                      : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                  }`}>
                  {d} Tage
                </button>
              ))}
            </div>

            {/* Umsatz-Zeitreihe */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-[#0A0A0A]">Umsatz</h2>
                  <p className="mt-0.5 text-xs text-[#9E9890]">Letzte {chartRange} Tage (in €)</p>
                </div>
                <p className="text-xl font-light text-[#0A0A0A]">
                  {revenueByDay.slice(-chartRange).reduce((s, d) => s + d.value, 0).toLocaleString("de-DE")} €
                </p>
              </div>
              <div className="mt-4">
                <LineChart
                  data={revenueByDay.slice(-chartRange)}
                  formatValue={(v) => `${v} €`}
                  height={120}
                />
              </div>
            </div>

            {/* Bestellungen-Zeitreihe */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-[#0A0A0A]">Bestellungen</h2>
                  <p className="mt-0.5 text-xs text-[#9E9890]">Letzte {chartRange} Tage</p>
                </div>
                <p className="text-xl font-light text-[#0A0A0A]">
                  {ordersByDay.slice(-chartRange).reduce((s, d) => s + d.value, 0)}
                </p>
              </div>
              <div className="mt-4">
                <LineChart
                  data={ordersByDay.slice(-chartRange)}
                  formatValue={(v) => String(v)}
                  height={100}
                  color="#6E9E8A"
                  fillColor="rgba(110,158,138,0.08)"
                />
              </div>
            </div>

            {/* Event-Typen Übersicht */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A]">Event-Typen</h2>
              <p className="mt-0.5 text-xs text-[#9E9890]">Letzte 500 Events aggregiert</p>
              <div className="mt-4 space-y-2">
                {analyticsEvents.map((ev) => {
                  const maxCount = analyticsEvents[0]?.count ?? 1;
                  const barPct = (ev.count / maxCount) * 100;
                  return (
                    <div key={ev.eventType} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 text-xs text-[#6E6860] truncate">{ev.eventType}</span>
                      <div className="flex-1 h-2 rounded-full bg-[#F5F0EA]">
                        <div className="h-full rounded-full bg-[#C9A96E]" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-mono text-[#0A0A0A]">{ev.count}</span>
                    </div>
                  );
                })}
                {analyticsEvents.length === 0 && (
                  <p className="text-sm text-[#9E9890]">Keine Events erfasst.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
