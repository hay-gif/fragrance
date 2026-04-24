"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import InfoTooltip from "@/components/InfoTooltip";
import { HELP } from "@/lib/helpTexts";

type AdminTab = "hub" | "users" | "orders" | "payouts" | "applications" | "analytics" | "challenges" | "compliance";

type AdminChallenge = {
  id: string;
  title: string;
  description: string | null;
  accordRequired: string | null;
  prizeAmountCents: number;
  prizeDescription: string | null;
  rules: string | null;
  logoUrl: string | null;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "judging" | "ended";
  maxEntries: number | null;
  entryCount: number;
};

type EventCount = { event_type: string; count: number };
type TopEntity = { entity_id: string; label: string; count: number };
type RecentEvent = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};
type AnalyticsData = {
  eventCounts: EventCount[];
  topViewed: TopEntity[];
  topSearches: { term: string; count: number }[];
  familyDistribution: { family: string; count: number }[];
  recentEvents: RecentEvent[];
};

type ComplianceFragrance = {
  id: string;
  name: string;
  creatorId: string | null;
  creatorUsername: string | null;
  complianceStatus: string;
  isPublic: boolean;
  createdAt: string;
};

type ComplianceCreator = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  agreementAcceptedAt: string | null;
  legalName: string | null;
  vatId: string | null;
  taxId: string | null;
  isKleinunternehmer: boolean;
  kycVerifiedAt: string | null;
  payoutBlocked: boolean;
  payoutBlockedReason: string | null;
};

type CreatorApplication = {
  id: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  userUsername: string | null;
  message: string | null;
  portfolioUrl: string | null;
  status: "pending" | "approved" | "rejected";
  adminNote: string;
  createdAt: string;
};

type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  role: "user" | "creator" | "admin" | "production" | "supporter" | "marketing";
  creatorStatus: "none" | "invited" | "unlocked";
  publicSlots: number;
  commissionPercent: number;
  lifetimeCommissionPercent: number;
  affiliateCommissionPercent: number;
  affiliateContractNote: string | null;
  createdAt: string;
  newsletterOptIn: boolean;
};

type AdminOrder = {
  id: string;
  createdAt: string;
  status: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  itemCount: number;
};

type PayableItem = {
  id: string;
  orderId: string;
  fragranceName: string;
  quantity: number;
  priceCents: number;
  creatorId: string;
  creatorEmail: string | null;
  creatorUsername: string | null;
  commissionCents: number;
  commissionPercent: number;
  payoutStatus: "pending" | "payable" | "paid" | "reversed";
};

type DbProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  role: "user" | "creator" | "admin" | "production" | "supporter" | "marketing";
  creator_status: "none" | "invited" | "unlocked";
  public_slots: number;
  commission_percent: number;
  lifetime_commission_percent: number;
  affiliate_commission_percent: number;
  affiliate_contract_note: string | null;
  created_at: string;
  newsletter_opt_in: boolean;
};

type DbOrderRow = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
  customer_email: string;
  total_cents: number;
};

type DbOrderItemRow = {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  price_cents: number;
  creator_id: string | null;
  creator_commission_cents: number;
  commission_percent: number;
  payout_status: "pending" | "payable" | "paid" | "reversed";
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  created: "Erstellt",
  in_production: "In Produktion",
  shipped: "Versendet",
  delivered: "Zugestellt",
  returned: "Retoure",
  cancelled: "Storniert",
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<AdminTab>("hub");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [payableItems, setPayableItems] = useState<PayableItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [applicationAdminNotes, setApplicationAdminNotes] = useState<Record<string, string>>({});
  const [processingApplicationId, setProcessingApplicationId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Compliance
  const [complianceFragrances, setComplianceFragrances] = useState<ComplianceFragrance[]>([]);
  const [complianceCreators, setComplianceCreators] = useState<ComplianceCreator[]>([]);
  const [complianceLoaded, setComplianceLoaded] = useState(false);
  const [updatingComplianceId, setUpdatingComplianceId] = useState<string | null>(null);
  const [updatingKycId, setUpdatingKycId] = useState<string | null>(null);

  // Challenges
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [challengesLoaded, setChallengesLoaded] = useState(false);
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [challengeMsg, setChallengeMsg] = useState("");
  const [viewingEntriesChallengeId, setViewingEntriesChallengeId] = useState<string | null>(null);
  const [challengeEntries, setChallengeEntries] = useState<{
    id: string; creator_id: string; fragrance_id: string | null;
    submitted_at: string; is_winner: boolean;
    creator_username: string | null; fragrance_name: string | null;
  }[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [markingWinnerId, setMarkingWinnerId] = useState<string | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    title: "", description: "", accordRequired: "",
    prizeAmountCents: "", prizeDescription: "", rules: "",
    logoUrl: "", startDate: "", endDate: "",
    status: "draft" as "draft" | "active" | "judging" | "ended",
    maxEntries: "",
  });

  // Inline-Edit-State für Nutzer
  const [editRoles, setEditRoles] = useState<Record<string, AdminUser["role"]>>({});
  const [editCreatorStatus, setEditCreatorStatus] = useState<Record<string, AdminUser["creatorStatus"]>>({});
  const [editPublicSlots, setEditPublicSlots] = useState<Record<string, string>>({});
  const [editCommission, setEditCommission] = useState<Record<string, string>>({});
  const [editLifetimeCommission, setEditLifetimeCommission] = useState<Record<string, string>>({});
  const [editAffiliateCommission, setEditAffiliateCommission] = useState<Record<string, string>>({});
  const [editAffiliateNote, setEditAffiliateNote] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const profile = await getOwnProfile();

      if (!profile || profile.role !== "admin") {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      // Nutzer laden
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, email, username, display_name, role, creator_status, public_slots, commission_percent, lifetime_commission_percent, affiliate_commission_percent, affiliate_contract_note, created_at, newsletter_opt_in")
        .order("created_at", { ascending: false });

      if (profileRows) {
        const mapped: AdminUser[] = (profileRows as DbProfileRow[]).map((r) => ({
          id: r.id,
          email: r.email,
          username: r.username,
          displayName: r.display_name,
          role: r.role,
          creatorStatus: r.creator_status,
          publicSlots: r.public_slots,
          commissionPercent: r.commission_percent,
          lifetimeCommissionPercent: r.lifetime_commission_percent ?? 3,
          affiliateCommissionPercent: r.affiliate_commission_percent ?? 10,
          affiliateContractNote: r.affiliate_contract_note ?? null,
          createdAt: r.created_at,
          newsletterOptIn: r.newsletter_opt_in,
        }));
        setUsers(mapped);

        const rolesInit: Record<string, AdminUser["role"]> = {};
        const statusInit: Record<string, AdminUser["creatorStatus"]> = {};
        const slotsInit: Record<string, string> = {};
        const commInit: Record<string, string> = {};
        const ltCommInit: Record<string, string> = {};
        const affCommInit: Record<string, string> = {};
        const affNoteInit: Record<string, string> = {};
        for (const u of mapped) {
          rolesInit[u.id] = u.role;
          statusInit[u.id] = u.creatorStatus;
          slotsInit[u.id] = String(u.publicSlots);
          commInit[u.id] = String(u.commissionPercent);
          ltCommInit[u.id] = String(u.lifetimeCommissionPercent);
          affCommInit[u.id] = String(u.affiliateCommissionPercent);
          affNoteInit[u.id] = u.affiliateContractNote ?? "";
        }
        setEditRoles(rolesInit);
        setEditCreatorStatus(statusInit);
        setEditPublicSlots(slotsInit);
        setEditCommission(commInit);
        setEditLifetimeCommission(ltCommInit);
        setEditAffiliateCommission(affCommInit);
        setEditAffiliateNote(affNoteInit);
      }

      // Orders laden
      const { data: orderRows } = await supabase
        .from("orders")
        .select("id, created_at, status, customer_name, customer_email, total_cents")
        .order("created_at", { ascending: false });

      if (orderRows) {
        const orderIds = (orderRows as DbOrderRow[]).map((r) => r.id);

        let itemCounts: Record<string, number> = {};
        if (orderIds.length > 0) {
          const { data: countRows } = await supabase
            .from("order_items")
            .select("order_id")
            .in("order_id", orderIds);
          if (countRows) {
            for (const row of countRows as { order_id: string }[]) {
              itemCounts[row.order_id] = (itemCounts[row.order_id] ?? 0) + 1;
            }
          }
        }

        setOrders(
          (orderRows as DbOrderRow[]).map((r) => ({
            id: r.id,
            createdAt: r.created_at,
            status: r.status,
            customerName: r.customer_name,
            customerEmail: r.customer_email,
            totalCents: r.total_cents,
            itemCount: itemCounts[r.id] ?? 0,
          })),
        );
      }

      // Auszahlbare Items laden
      const { data: itemRows } = await supabase
        .from("order_items")
        .select("id, order_id, name, quantity, price_cents, creator_id, creator_commission_cents, commission_percent, payout_status")
        .in("payout_status", ["payable", "paid"])
        .order("payout_status", { ascending: true });

      if (itemRows) {
        const creatorIds = Array.from(
          new Set(
            (itemRows as DbOrderItemRow[])
              .map((r) => r.creator_id)
              .filter(Boolean) as string[],
          ),
        );

        let creatorMap: Record<string, { email: string | null; username: string | null }> = {};
        if (creatorIds.length > 0) {
          const { data: creatorProfiles } = await supabase
            .from("profiles")
            .select("id, email, username")
            .in("id", creatorIds);
          if (creatorProfiles) {
            for (const p of creatorProfiles as { id: string; email: string | null; username: string | null }[]) {
              creatorMap[p.id] = { email: p.email, username: p.username };
            }
          }
        }

        setPayableItems(
          (itemRows as DbOrderItemRow[])
            .filter((r) => r.creator_id)
            .map((r) => ({
              id: r.id,
              orderId: r.order_id,
              fragranceName: r.name,
              quantity: r.quantity,
              priceCents: r.price_cents,
              creatorId: r.creator_id!,
              creatorEmail: creatorMap[r.creator_id!]?.email ?? null,
              creatorUsername: creatorMap[r.creator_id!]?.username ?? null,
              commissionCents: r.creator_commission_cents,
              commissionPercent: r.commission_percent,
              payoutStatus: r.payout_status,
            })),
        );
      }

      // Creator-Bewerbungen laden
      const { data: appRows } = await supabase
        .from("creator_applications")
        .select("id, user_id, message, portfolio_url, status, admin_note, created_at")
        .order("created_at", { ascending: false });

      if (appRows) {
        const appUserIds = Array.from(new Set((appRows as { user_id: string }[]).map((r) => r.user_id)));
        let appProfileMap: Record<string, { email: string | null; display_name: string | null; username: string | null }> = {};

        if (appUserIds.length > 0) {
          const { data: appProfiles } = await supabase
            .from("profiles")
            .select("id, email, display_name, username")
            .in("id", appUserIds);
          if (appProfiles) {
            for (const p of appProfiles as { id: string; email: string | null; display_name: string | null; username: string | null }[]) {
              appProfileMap[p.id] = p;
            }
          }
        }

        const mappedApps: CreatorApplication[] = (appRows as {
          id: string; user_id: string; message: string | null; portfolio_url: string | null;
          status: "pending" | "approved" | "rejected"; admin_note: string | null; created_at: string;
        }[]).map((r) => ({
          id: r.id,
          userId: r.user_id,
          userEmail: appProfileMap[r.user_id]?.email ?? null,
          userDisplayName: appProfileMap[r.user_id]?.display_name ?? null,
          userUsername: appProfileMap[r.user_id]?.username ?? null,
          message: r.message,
          portfolioUrl: r.portfolio_url,
          status: r.status,
          adminNote: r.admin_note ?? "",
          createdAt: r.created_at,
        }));
        setApplications(mappedApps);
        const notesInit: Record<string, string> = {};
        for (const a of mappedApps) notesInit[a.id] = a.adminNote;
        setApplicationAdminNotes(notesInit);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function saveUser(userId: string) {
    setSavingUserId(userId);

    const slots = Number(editPublicSlots[userId]);
    const comm = Number(editCommission[userId]);
    const ltComm = Number(editLifetimeCommission[userId] ?? "3");
    const affComm = Number(editAffiliateCommission[userId] ?? "10");
    const affNote = editAffiliateNote[userId]?.trim() ?? "";

    if (Number.isNaN(slots) || slots < 0) {
      alert("Ungültige Slot-Anzahl."); setSavingUserId(null); return;
    }
    if (Number.isNaN(comm) || comm < 0 || comm > 100) {
      alert("Provision muss zwischen 0 und 100 liegen."); setSavingUserId(null); return;
    }
    if (Number.isNaN(ltComm) || ltComm < 0 || ltComm > 5) {
      alert("Lifetime-Provision muss zwischen 0 und 5 liegen."); setSavingUserId(null); return;
    }
    if (Number.isNaN(affComm) || affComm < 0 || affComm > 50) {
      alert("Affiliate-Rate muss zwischen 0 und 50 liegen."); setSavingUserId(null); return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        role: editRoles[userId],
        creator_status: editCreatorStatus[userId],
        public_slots: slots,
        commission_percent: comm,
        lifetime_commission_percent: ltComm,
        affiliate_commission_percent: affComm,
        affiliate_contract_note: affNote || null,
      })
      .eq("id", userId);

    if (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Nutzer konnte nicht gespeichert werden.");
      setSavingUserId(null);
      return;
    }

    // Referral-Attributionen synchron aktualisieren
    await supabase
      .from("referral_attributions")
      .update({ lifetime_commission_percent: ltComm })
      .eq("creator_id", userId);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              role: editRoles[userId],
              creatorStatus: editCreatorStatus[userId],
              publicSlots: slots,
              commissionPercent: comm,
              lifetimeCommissionPercent: ltComm,
              affiliateCommissionPercent: affComm,
              affiliateContractNote: affNote || null,
            }
          : u,
      ),
    );

    setSavingUserId(null);
  }

  async function loadChallenges() {
    const { data, error } = await supabase
      .from("challenges")
      .select("id, title, description, accord_required, prize_amount_cents, prize_description, rules, logo_url, start_date, end_date, status, max_entries")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fehler beim Laden der Challenges:", error);
      return;
    }
    if (data) {
      const ids = data.map((r: { id: string }) => r.id);
      const { data: entryCounts } = ids.length > 0
        ? await supabase.from("challenge_entries").select("challenge_id").in("challenge_id", ids)
        : { data: [] };

      const countMap = new Map<string, number>();
      for (const e of (entryCounts ?? []) as { challenge_id: string }[]) {
        countMap.set(e.challenge_id, (countMap.get(e.challenge_id) ?? 0) + 1);
      }

      setChallenges(data.map((r: {
        id: string; title: string; description: string | null;
        accord_required: string | null; prize_amount_cents: number;
        prize_description: string | null; rules: string | null; logo_url: string | null;
        start_date: string; end_date: string;
        status: "draft" | "active" | "judging" | "ended"; max_entries: number | null;
      }) => ({
        id: r.id, title: r.title, description: r.description,
        accordRequired: r.accord_required, prizeAmountCents: r.prize_amount_cents,
        prizeDescription: r.prize_description, rules: r.rules, logoUrl: r.logo_url,
        startDate: r.start_date, endDate: r.end_date,
        status: r.status, maxEntries: r.max_entries,
        entryCount: countMap.get(r.id) ?? 0,
      })));
    }
    setChallengesLoaded(true);
  }

  function startEditChallenge(c: AdminChallenge) {
    setEditingChallengeId(c.id);
    setChallengeForm({
      title: c.title, description: c.description ?? "",
      accordRequired: c.accordRequired ?? "", prizeAmountCents: String(c.prizeAmountCents / 100),
      prizeDescription: c.prizeDescription ?? "", rules: c.rules ?? "",
      logoUrl: c.logoUrl ?? "", startDate: c.startDate, endDate: c.endDate,
      status: c.status, maxEntries: c.maxEntries ? String(c.maxEntries) : "",
    });
  }

  function resetChallengeForm() {
    setEditingChallengeId(null);
    setChallengeForm({
      title: "", description: "", accordRequired: "", prizeAmountCents: "",
      prizeDescription: "", rules: "", logoUrl: "", startDate: "", endDate: "",
      status: "draft", maxEntries: "",
    });
    setChallengeMsg("");
  }

  async function saveChallenge() {
    if (!challengeForm.title || !challengeForm.startDate || !challengeForm.endDate) {
      setChallengeMsg("Titel, Start- und Enddatum sind Pflichtfelder.");
      return;
    }
    setSavingChallenge(true);
    setChallengeMsg("");
    const payload = {
      title: challengeForm.title.trim(),
      description: challengeForm.description || null,
      accord_required: challengeForm.accordRequired || null,
      prize_amount_cents: Math.round((parseFloat(challengeForm.prizeAmountCents) || 0) * 100),
      prize_description: challengeForm.prizeDescription || null,
      rules: challengeForm.rules || null,
      logo_url: challengeForm.logoUrl || null,
      start_date: challengeForm.startDate,
      end_date: challengeForm.endDate,
      status: challengeForm.status,
      max_entries: challengeForm.maxEntries ? parseInt(challengeForm.maxEntries) : null,
    };

    if (editingChallengeId) {
      const { error } = await supabase.from("challenges").update(payload).eq("id", editingChallengeId);
      if (!error) {
        setChallenges((prev) => prev.map((c) => c.id === editingChallengeId
          ? { ...c, ...payload, accordRequired: payload.accord_required, prizeAmountCents: payload.prize_amount_cents, prizeDescription: payload.prize_description, rules: payload.rules, logoUrl: payload.logo_url, startDate: payload.start_date, endDate: payload.end_date, maxEntries: payload.max_entries }
          : c
        ));
        setChallengeMsg("Gespeichert.");
        resetChallengeForm();
      } else {
        setChallengeMsg(`Fehler: ${error.message}`);
      }
    } else {
      const { data, error } = await supabase.from("challenges").insert(payload).select("id").single();
      if (!error && data) {
        setChallengesLoaded(false);
        await loadChallenges();
        setChallengeMsg("Challenge erstellt.");
        resetChallengeForm();
      } else {
        setChallengeMsg(`Fehler: ${error?.message}`);
      }
    }
    setSavingChallenge(false);
  }

  async function deleteChallenge(id: string) {
    if (!confirm("Challenge wirklich löschen?")) return;
    await supabase.from("challenges").delete().eq("id", id);
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  }

  async function loadChallengeEntries(challengeId: string) {
    if (viewingEntriesChallengeId === challengeId) {
      setViewingEntriesChallengeId(null);
      return;
    }
    setLoadingEntries(true);
    setViewingEntriesChallengeId(challengeId);
    const { data } = await supabase
      .from("challenge_entries")
      .select("id, creator_id, fragrance_id, submitted_at, is_winner, profiles:creator_id(username), fragrances:fragrance_id(name)")
      .eq("challenge_id", challengeId)
      .order("submitted_at", { ascending: false });
    setChallengeEntries((data ?? []).map((e: {
      id: string; creator_id: string; fragrance_id: string | null;
      submitted_at: string; is_winner: boolean;
      profiles: { username: string | null } | { username: string | null }[] | null;
      fragrances: { name: string | null } | { name: string | null }[] | null;
    }) => ({
      id: e.id,
      creator_id: e.creator_id,
      fragrance_id: e.fragrance_id,
      submitted_at: e.submitted_at,
      is_winner: e.is_winner,
      creator_username: Array.isArray(e.profiles) ? (e.profiles[0]?.username ?? null) : (e.profiles?.username ?? null),
      fragrance_name: Array.isArray(e.fragrances) ? (e.fragrances[0]?.name ?? null) : (e.fragrances?.name ?? null),
    })));
    setLoadingEntries(false);
  }

  async function markWinner(entryId: string, challengeId: string) {
    if (!confirm("Diesen Eintrag als Gewinner markieren und Preisgeld übertragen?")) return;
    setMarkingWinnerId(entryId);
    try {
      const { authFetch } = await import("@/lib/authFetch");
      const res = await authFetch("/api/challenges/mark-winner", {
        method: "POST",
        body: JSON.stringify({ entryId, challengeId }),
      });
      const data = await res.json();
      if (data.success) {
        setChallengeEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, is_winner: true } : e));
      } else {
        alert("Fehler: " + (data.error ?? "Unbekannt"));
      }
    } catch (err) {
      console.error("markWinner fehlgeschlagen:", err);
      alert("Netzwerkfehler – bitte erneut versuchen.");
    }
    setMarkingWinnerId(null);
  }

  async function reviewApplication(
    applicationId: string,
    userId: string,
    decision: "approved" | "rejected",
  ) {
    setProcessingApplicationId(applicationId);
    const adminNote = applicationAdminNotes[applicationId] ?? "";

    const { error: appError } = await supabase
      .from("creator_applications")
      .update({
        status: decision,
        admin_note: adminNote || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (appError) {
      console.error("Fehler beim Bearbeiten:", appError);
      alert("Bewerbung konnte nicht bearbeitet werden.");
      setProcessingApplicationId(null);
      return;
    }

    if (decision === "approved") {
      await supabase
        .from("profiles")
        .update({ creator_status: "unlocked", role: "creator" })
        .eq("id", userId);

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "creator_approved",
        data: { message: "Deine Creator-Bewerbung wurde genehmigt! Du kannst jetzt Düfte veröffentlichen." },
      });
    } else {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "creator_rejected",
        data: { message: "Deine Creator-Bewerbung wurde leider abgelehnt.", admin_note: adminNote },
      });
    }

    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId ? { ...a, status: decision, adminNote } : a)),
    );
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId && decision === "approved"
          ? { ...u, role: "creator", creatorStatus: "unlocked" }
          : u,
      ),
    );
    setProcessingApplicationId(null);
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);

    // Letzte 2000 Events laden und client-seitig aggregieren
    const { data: rawEvents } = await supabase
      .from("user_events")
      .select("id, event_type, entity_type, entity_id, user_id, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(2000);

    const events = (rawEvents ?? []) as RecentEvent[];

    // Events nach Typ zählen
    const typeMap = new Map<string, number>();
    const viewMap = new Map<string, number>();
    const searchMap = new Map<string, number>();

    for (const ev of events) {
      typeMap.set(ev.event_type, (typeMap.get(ev.event_type) ?? 0) + 1);
      if (ev.event_type === "fragrance_view" && ev.entity_id) {
        viewMap.set(ev.entity_id, (viewMap.get(ev.entity_id) ?? 0) + 1);
      }
      if (ev.event_type === "search" && ev.metadata?.query) {
        const term = String(ev.metadata.query).toLowerCase().trim();
        if (term) searchMap.set(term, (searchMap.get(term) ?? 0) + 1);
      }
    }

    const eventCounts: EventCount[] = Array.from(typeMap.entries())
      .map(([event_type, count]) => ({ event_type, count }))
      .sort((a, b) => b.count - a.count);

    // Top angesehene Düfte anreichern
    const topViewedIds = Array.from(viewMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    let topViewed: TopEntity[] = topViewedIds.map((id) => ({
      entity_id: id,
      label: id,
      count: viewMap.get(id) ?? 0,
    }));

    if (topViewedIds.length > 0) {
      const { data: fragNames } = await supabase
        .from("fragrances")
        .select("id, name")
        .in("id", topViewedIds);

      if (fragNames) {
        const nameMap = new Map((fragNames as { id: string; name: string }[]).map((f) => [f.id, f.name]));
        topViewed = topViewed.map((t) => ({ ...t, label: nameMap.get(t.entity_id) ?? t.entity_id }));
      }
    }

    const topSearches = Array.from(searchMap.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Duftstil-Verteilung aus Nutzerprofilen
    const { data: prefRows } = await supabase
      .from("profiles")
      .select("fragrance_preferences")
      .not("fragrance_preferences", "eq", "{}");

    const familyMap = new Map<string, number>();
    for (const row of prefRows ?? []) {
      const families = (row.fragrance_preferences as { families?: string[] })?.families ?? [];
      for (const f of families) {
        familyMap.set(f, (familyMap.get(f) ?? 0) + 1);
      }
    }
    const familyDistribution = Array.from(familyMap.entries())
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count);

    setAnalytics({
      eventCounts,
      topViewed,
      topSearches,
      familyDistribution,
      recentEvents: events.slice(0, 50),
    });
    setAnalyticsLoading(false);
  }

  async function markAsPaid(itemId: string) {
    setMarkingPaidId(itemId);

    const { error } = await supabase
      .from("order_items")
      .update({
        payout_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (error) {
      console.error("Fehler beim Markieren:", error);
      alert("Auszahlung konnte nicht gespeichert werden.");
      setMarkingPaidId(null);
      return;
    }

    setPayableItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, payoutStatus: "paid" } : item,
      ),
    );

    setMarkingPaidId(null);
  }

  async function loadCompliance() {
    if (complianceLoaded) return;

    // Fragrances with compliance_status not yet approved_for_sale
    const { data: fragRows } = await supabase
      .from("fragrances")
      .select("id, name, creator_id, is_public, compliance_status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (fragRows) {
      const creatorIds = Array.from(
        new Set((fragRows as { creator_id: string | null }[]).map((r) => r.creator_id).filter(Boolean) as string[]),
      );
      let creatorMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: cProfiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", creatorIds);
        if (cProfiles) {
          for (const p of cProfiles as { id: string; username: string | null }[]) {
            creatorMap[p.id] = p.username ?? p.id.slice(0, 8);
          }
        }
      }
      setComplianceFragrances(
        (fragRows as {
          id: string; name: string; creator_id: string | null;
          is_public: boolean; compliance_status: string; created_at: string;
        }[]).map((r) => ({
          id: r.id,
          name: r.name,
          creatorId: r.creator_id,
          creatorUsername: r.creator_id ? (creatorMap[r.creator_id] ?? null) : null,
          complianceStatus: r.compliance_status ?? "draft",
          isPublic: r.is_public,
          createdAt: r.created_at,
        })),
      );
    }

    // Creators with their business profiles (KYC data)
    const { data: creatorProfiles } = await supabase
      .from("profiles")
      .select("id, email, username, display_name")
      .eq("role", "creator")
      .order("created_at", { ascending: false });

    if (creatorProfiles) {
      const creatorIds2 = (creatorProfiles as { id: string }[]).map((r) => r.id);
      let bizMap: Record<string, {
        agreement_accepted_at: string | null;
        legal_name: string | null;
        vat_id: string | null;
        tax_id: string | null;
        is_kleinunternehmer: boolean;
        kyc_verified_at: string | null;
        payout_blocked: boolean;
        payout_blocked_reason: string | null;
      }> = {};

      if (creatorIds2.length > 0) {
        const { data: bizRows } = await supabase
          .from("creator_business_profiles")
          .select("creator_id, agreement_accepted_at, legal_name, vat_id, tax_id, is_kleinunternehmer, kyc_verified_at, payout_blocked, payout_blocked_reason")
          .in("creator_id", creatorIds2);
        if (bizRows) {
          for (const b of bizRows as {
            creator_id: string;
            agreement_accepted_at: string | null;
            legal_name: string | null;
            vat_id: string | null;
            tax_id: string | null;
            is_kleinunternehmer: boolean;
            kyc_verified_at: string | null;
            payout_blocked: boolean;
            payout_blocked_reason: string | null;
          }[]) {
            bizMap[b.creator_id] = b;
          }
        }
      }

      setComplianceCreators(
        (creatorProfiles as { id: string; email: string | null; username: string | null; display_name: string | null }[]).map((r) => {
          const biz = bizMap[r.id];
          return {
            id: r.id,
            email: r.email,
            username: r.username,
            displayName: r.display_name,
            agreementAcceptedAt: biz?.agreement_accepted_at ?? null,
            legalName: biz?.legal_name ?? null,
            vatId: biz?.vat_id ?? null,
            taxId: biz?.tax_id ?? null,
            isKleinunternehmer: biz?.is_kleinunternehmer ?? false,
            kycVerifiedAt: biz?.kyc_verified_at ?? null,
            payoutBlocked: biz?.payout_blocked ?? false,
            payoutBlockedReason: biz?.payout_blocked_reason ?? null,
          };
        }),
      );
    }

    setComplianceLoaded(true);
  }

  async function updateComplianceStatus(fragranceId: string, newStatus: string) {
    setUpdatingComplianceId(fragranceId);
    const { error } = await supabase
      .from("fragrances")
      .update({ compliance_status: newStatus })
      .eq("id", fragranceId);
    if (error) {
      alert("Fehler beim Aktualisieren des Compliance-Status.");
    } else {
      setComplianceFragrances((prev) =>
        prev.map((f) => f.id === fragranceId ? { ...f, complianceStatus: newStatus } : f),
      );
    }
    setUpdatingComplianceId(null);
  }

  async function verifyKyc(creatorId: string, block: boolean) {
    setUpdatingKycId(creatorId);
    const update = block
      ? { payout_blocked: true }
      : { kyc_verified_at: new Date().toISOString(), payout_blocked: false };
    const { error } = await supabase
      .from("creator_business_profiles")
      .update(update)
      .eq("creator_id", creatorId);
    if (error) {
      alert("Fehler beim KYC-Update.");
    } else {
      setComplianceCreators((prev) =>
        prev.map((c) =>
          c.id === creatorId
            ? { ...c, kycVerifiedAt: block ? c.kycVerifiedAt : new Date().toISOString(), payoutBlocked: block }
            : c,
        ),
      );
    }
    setUpdatingKycId(null);
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

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] p-8">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="mt-3 text-[#6E6860]">
            Zugriff verweigert. Nur Admins können diese Seite sehen.
          </p>
          <Link href="/" className="mt-4 inline-block underline">
            Zurück zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  const pendingPayoutCents = payableItems
    .filter((i) => i.payoutStatus === "payable")
    .reduce((sum, i) => sum + i.commissionCents, 0);

  const paidPayoutCents = payableItems
    .filter((i) => i.payoutStatus === "paid")
    .reduce((sum, i) => sum + i.commissionCents, 0);

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">Admin</h1>
      </div>
      <div className="mx-auto max-w-6xl px-5">

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-[#FAFAF8] border-b border-[#E5E0D8] mb-6">
          <div className="flex gap-0 overflow-x-auto">
          {(
            [
              ["hub", "Übersicht"],
              ["users", `Nutzer (${users.length})`],
              ["orders", `Bestellungen (${orders.length})`],
              ["payouts", `Auszahlungen`],
              ["applications", `Bewerbungen (${applications.filter((a) => a.status === "pending").length})`],
              ["analytics", `Analytics`],
              ["challenges", `Challenges (${challenges.length})`],
              ["compliance", `Compliance`],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => {
                setTab(key);
                if (key === "analytics" && !analytics && !analyticsLoading) loadAnalytics();
                if (key === "challenges") loadChallenges();
                if (key === "compliance") loadCompliance();
              }}
              className={`shrink-0 px-4 py-3 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? "border-[#0A0A0A] text-[#0A0A0A]"
                  : "border-transparent text-[#9E9890] hover:text-[#6E6860]"
              }`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>

        {/* TAB: HUB / ÜBERSICHT */}
        {tab === "hub" && (
          <div className="mt-6 space-y-8">

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Nutzer", value: users.length, icon: "◎" },
                { label: "Bestellungen", value: orders.length, icon: "◫" },
                { label: "Offen (Auszahlung)", value: payableItems.filter(i => i.payoutStatus === "payable").length, icon: "€" },
                { label: "Bewerbungen", value: applications.filter(a => a.status === "pending").length, icon: "✦" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-[#E5E0D8] bg-white p-4">
                  <p className="text-xl font-bold text-[#0A0A0A]">{s.icon} {s.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-[#9E9890]">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Operations */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890] font-semibold">Operations</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { href: "/production", icon: "⚗️", title: "Produktion", desc: "Bestellwarteschlange, Batch-Produktion, Ressourcen-Prognose" },
                  { href: "/inventory", icon: "📦", title: "Inventar", desc: "Lagerübersicht, Bewegungen, Einkaufsplanung" },
                  { href: "/finance", icon: "💶", title: "Finanzen", desc: "Umsatz, Creator-Provisionen, Steuereinträge, Auszahlungen" },
                ].map((p) => (
                  <Link key={p.href} href={p.href} className="group flex items-start gap-4 rounded-2xl border border-[#E5E0D8] bg-white p-4 hover:border-[#C9A96E] hover:shadow-sm transition-all">
                    <span className="text-2xl mt-0.5">{p.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#0A0A0A] group-hover:text-[#C9A96E] transition-colors">{p.title}</p>
                      <p className="mt-0.5 text-[10px] text-[#9E9890] leading-relaxed">{p.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Compliance & Regulatorik */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890] font-semibold">Compliance & Regulatorik</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { href: "/inventory/compliance-rules", icon: "⚖️", title: "Compliance-Regeln", desc: "IFRA-Limits, Verbotsregeln, Konzentrationsgrenzen" },
                  { href: "/inventory/cpsr-framework", icon: "📋", title: "CPSR-Framework", desc: "Kosmetische Sicherheitsbewertungen & Vorlagen" },
                  { href: "/inventory/toxicology", icon: "🧪", title: "Toxikologie", desc: "Rohstoff-Toxizitätsdaten, SDS-Dokumente" },
                  { href: "/inventory/raw-material-documents", icon: "📄", title: "Rohmaterial-Dokumente", desc: "Zertifikate, Datenblätter, Prüfberichte" },
                  { href: "/inventory/fragrance-analysis", icon: "🔬", title: "Duft-Analyse", desc: "GC/MS-Daten, Inhaltsstoffdeklarationen" },
                  { href: "/inventory/fragrance-formulas", icon: "🧬", title: "Formulas", desc: "Rezepturen & Kompositionen" },
                ].map((p) => (
                  <Link key={p.href} href={p.href} className="group flex items-start gap-4 rounded-2xl border border-[#E5E0D8] bg-white p-4 hover:border-[#0A0A0A] hover:shadow-sm transition-all">
                    <span className="text-2xl mt-0.5">{p.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#0A0A0A]">{p.title}</p>
                      <p className="mt-0.5 text-[10px] text-[#9E9890] leading-relaxed">{p.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Inventar-Details */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890] font-semibold">Inventar-Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { href: "/inventory/accords", icon: "🌹", title: "Akkorde", desc: "Alle Akkorde, Kompositionen, IFRA-Status" },
                  { href: "/inventory/raw-materials", icon: "🪨", title: "Rohstoffe", desc: "Lagerbestand, CAS-Nummern, Preise" },
                  { href: "/inventory/movements", icon: "↕️", title: "Lagerbewegungen", desc: "Ein- und Ausgänge, Verbrauchshistorie" },
                  { href: "/inventory/purchases", icon: "🛒", title: "Einkäufe", desc: "Lieferantenbestellungen, Eingangsrechnungen" },
                  { href: "/inventory/reorder-planning", icon: "📊", title: "Wiederbeschaffung", desc: "Mindestbestand, Bestellvorschläge" },
                  { href: "/inventory/order-material-demand", icon: "📈", title: "Materialbedarf", desc: "Rohstoffbedarf aus offenen Bestellungen" },
                ].map((p) => (
                  <Link key={p.href} href={p.href} className="group flex items-start gap-4 rounded-2xl border border-[#E5E0D8] bg-white p-4 hover:border-[#0A0A0A] hover:shadow-sm transition-all">
                    <span className="text-2xl mt-0.5">{p.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#0A0A0A]">{p.title}</p>
                      <p className="mt-0.5 text-[10px] text-[#9E9890] leading-relaxed">{p.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Interne Teams */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890] font-semibold">Interne Teams</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { href: "/marketing", icon: "📣", title: "Marketing", desc: "Kampagnen, Rabattcodes, Newsletter" },
                  { href: "/support", icon: "💬", title: "Support", desc: "Kundenanfragen, Tickets, Erstattungen" },
                ].map((p) => (
                  <Link key={p.href} href={p.href} className="group flex items-start gap-4 rounded-2xl border border-[#E5E0D8] bg-white p-4 hover:border-[#0A0A0A] hover:shadow-sm transition-all">
                    <span className="text-2xl mt-0.5">{p.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#0A0A0A]">{p.title}</p>
                      <p className="mt-0.5 text-[10px] text-[#9E9890] leading-relaxed">{p.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB: NUTZER */}
        {tab === "users" && (
          <div className="mt-6">
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                    <th className="px-4 py-3 font-medium">Nutzer</th>
                    <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1">Rolle <InfoTooltip text={HELP.admin.role} compact /></span></th>
                    <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1">Creator-Status <InfoTooltip text={HELP.admin.creatorStatus} compact /></span></th>
                    <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1">Slots <InfoTooltip text={HELP.admin.publicSlots} compact /></span></th>
                    <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1">Provision % <InfoTooltip text={HELP.admin.commissionPercent} compact /></span></th>
                    <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1">Lifetime-Prov. % <InfoTooltip text={HELP.admin.lifetimeCommissionPercent} compact /></span></th>
                    <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1">Affiliate % <InfoTooltip text={HELP.admin.affiliateCommissionPercent} compact /></span></th>
                    <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1">Affiliate-Notiz <InfoTooltip text={HELP.admin.affiliateContractNote} compact /></span></th>
                    <th className="px-4 py-3 font-medium">Newsletter</th>
                    <th className="px-4 py-3 font-medium">Registriert</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {user.displayName ?? user.username ?? "–"}
                        </p>
                        <p className="text-xs text-[#C5C0B8]">{user.email}</p>
                        {user.username && (
                          <p className="text-xs text-[#C5C0B8]">
                            @{user.username}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editRoles[user.id] ?? user.role}
                          onChange={(e) =>
                            setEditRoles((prev) => ({
                              ...prev,
                              [user.id]: e.target.value as AdminUser["role"],
                            }))
                          }
                          className="rounded-lg border px-2 py-1 text-xs"
                        >
                          <option value="user">user</option>
                          <option value="creator">creator</option>
                          <option value="admin">admin</option>
                          <option value="production">production</option>
                          <option value="supporter">supporter</option>
                          <option value="marketing">marketing</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editCreatorStatus[user.id] ?? user.creatorStatus}
                          onChange={(e) =>
                            setEditCreatorStatus((prev) => ({
                              ...prev,
                              [user.id]: e.target.value as AdminUser["creatorStatus"],
                            }))
                          }
                          className="rounded-lg border px-2 py-1 text-xs"
                        >
                          <option value="none">none</option>
                          <option value="invited">invited</option>
                          <option value="unlocked">unlocked</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={editPublicSlots[user.id] ?? String(user.publicSlots)}
                          onChange={(e) =>
                            setEditPublicSlots((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="w-16 rounded-lg border px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={editCommission[user.id] ?? String(user.commissionPercent)}
                          onChange={(e) =>
                            setEditCommission((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="w-20 rounded-lg border px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={5}
                          step="0.5"
                          value={editLifetimeCommission[user.id] ?? String(user.lifetimeCommissionPercent)}
                          onChange={(e) =>
                            setEditLifetimeCommission((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="w-20 rounded-lg border px-2 py-1 text-xs"
                          title="Max. 5%"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          step="0.5"
                          value={editAffiliateCommission[user.id] ?? String(user.affiliateCommissionPercent)}
                          onChange={(e) =>
                            setEditAffiliateCommission((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="w-20 rounded-lg border px-2 py-1 text-xs"
                          title="Affiliate-Provision % (0–50)"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editAffiliateNote[user.id] ?? (user.affiliateContractNote ?? "")}
                          onChange={(e) =>
                            setEditAffiliateNote((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          placeholder="Vertragsnotiz…"
                          className="w-40 rounded-lg border px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {user.newsletterOptIn ? "Ja" : "Nein"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#C5C0B8]">
                        {new Date(user.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => saveUser(user.id)}
                          disabled={savingUserId === user.id}
                          className="rounded-lg border px-3 py-1 text-xs hover:bg-black hover:text-white disabled:opacity-50"
                        >
                          {savingUserId === user.id ? "..." : "Speichern"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: BESTELLUNGEN */}
        {tab === "orders" && (
          <div className="mt-6">
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                    <th className="px-4 py-3 font-medium">Order-ID</th>
                    <th className="px-4 py-3 font-medium">Kunde</th>
                    <th className="px-4 py-3 font-medium"><span className="flex items-center gap-1">Status <InfoTooltip text={HELP.admin.orderStatus} compact /></span></th>
                    <th className="px-4 py-3 font-medium">Positionen</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Gesamt
                    </th>
                    <th className="px-4 py-3 font-medium">Datum</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-[#9E9890]">
                        {order.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-[#C5C0B8]">
                          {order.customerEmail}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border px-2 py-0.5 text-xs">
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{order.itemCount}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(order.totalCents / 100).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-xs text-[#C5C0B8]">
                        {new Date(order.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/production`}
                          className="text-xs underline"
                        >
                          Produktion
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: BEWERBUNGEN */}
        {tab === "applications" && (
          <div className="mt-6 space-y-4">
            {applications.length === 0 && (
              <div className="rounded-2xl border p-6 text-sm text-[#9E9890]">
                Keine Bewerbungen vorhanden.
              </div>
            )}
            {applications.map((app) => (
              <div key={app.id} className="rounded-2xl border p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {app.userDisplayName ?? app.userUsername ?? "–"}
                    </p>
                    <p className="text-xs text-[#C5C0B8]">{app.userEmail}</p>
                    {app.userUsername && (
                      <p className="text-xs text-[#C5C0B8]">@{app.userUsername}</p>
                    )}
                    <p className="mt-1 text-xs text-[#C5C0B8]">
                      {new Date(app.createdAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      app.status === "approved"
                        ? "border-green-300 bg-green-50 text-green-700"
                        : app.status === "rejected"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-yellow-300 bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {app.status === "approved" ? "Genehmigt" : app.status === "rejected" ? "Abgelehnt" : "Ausstehend"}
                  </span>
                </div>

                {app.message && (
                  <div className="mt-3 rounded-xl bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
                    {app.message}
                  </div>
                )}

                {app.portfolioUrl && (
                  <a
                    href={app.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs underline text-[#9E9890]"
                  >
                    Portfolio / Link ansehen
                  </a>
                )}

                {app.status === "pending" && (
                  <div className="mt-4 space-y-2">
                    <input
                      type="text"
                      value={applicationAdminNotes[app.id] ?? ""}
                      onChange={(e) =>
                        setApplicationAdminNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                      }
                      placeholder="Admin-Notiz (optional, wird an Nutzer gesendet)"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewApplication(app.id, app.userId, "approved")}
                        disabled={processingApplicationId === app.id}
                        className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-sm text-white disabled:opacity-50"
                      >
                        {processingApplicationId === app.id ? "..." : "Genehmigen"}
                      </button>
                      <button
                        onClick={() => reviewApplication(app.id, app.userId, "rejected")}
                        disabled={processingApplicationId === app.id}
                        className="rounded-full border border-[#E5E0D8] px-4 py-2 text-sm disabled:opacity-50"
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

        {/* TAB: AUSZAHLUNGEN */}
        {tab === "payouts" && (
          <div className="mt-6">
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <p className="text-sm text-[#9E9890]">Ausstehend (auszahlbar)</p>
                <p className="mt-2 text-2xl font-bold text-orange-600">
                  {(pendingPayoutCents / 100).toFixed(2)} €
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <p className="text-sm text-[#9E9890]">Bereits ausgezahlt</p>
                <p className="mt-2 text-2xl font-bold text-green-700">
                  {(paidPayoutCents / 100).toFixed(2)} €
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                    <th className="px-4 py-3 font-medium">Creator</th>
                    <th className="px-4 py-3 font-medium">Duft</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Satz</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Provision
                    </th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {payableItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {item.creatorUsername ?? "–"}
                        </p>
                        <p className="text-xs text-[#C5C0B8]">
                          {item.creatorEmail}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{item.fragranceName}</p>
                        <p className="text-xs text-[#C5C0B8]">
                          × {item.quantity}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#C5C0B8]">
                        {item.orderId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.commissionPercent}%
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {(item.commissionCents / 100).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${
                            item.payoutStatus === "paid"
                              ? "border-green-300 bg-green-50 text-green-700"
                              : "border-orange-300 bg-orange-50 text-orange-700"
                          }`}
                        >
                          {item.payoutStatus === "paid"
                            ? "ausgezahlt"
                            : "auszahlbar"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.payoutStatus === "payable" && (
                          <button
                            onClick={() => markAsPaid(item.id)}
                            disabled={markingPaidId === item.id}
                            className="rounded-lg border px-3 py-1 text-xs hover:bg-black hover:text-white disabled:opacity-50"
                          >
                            {markingPaidId === item.id ? "..." : "Als bezahlt"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payableItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-[#9E9890]"
                      >
                        Keine auszahlbaren Positionen vorhanden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* TAB: ANALYTICS */}
        {tab === "analytics" && (
          <div className="mt-6 space-y-8">
            {analyticsLoading && <p className="text-sm text-[#9E9890]">Daten werden geladen…</p>}

            {analytics && (
              <>
                {/* Event-Übersicht */}
                <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                  <h3 className="mb-4 text-base font-semibold">Events nach Typ</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-[#9E9890]">
                          <th className="pb-2 font-medium">Event</th>
                          <th className="pb-2 font-medium text-right">Anzahl</th>
                          <th className="pb-2 pl-4 font-medium">Anteil</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.eventCounts.map((e) => {
                          const total = analytics.eventCounts.reduce((s, x) => s + x.count, 0);
                          const pct = total > 0 ? Math.round((e.count / total) * 100) : 0;
                          return (
                            <tr key={e.event_type} className="border-b last:border-0">
                              <td className="py-2 font-mono text-xs">{e.event_type}</td>
                              <td className="py-2 text-right font-semibold">{e.count}</td>
                              <td className="py-2 pl-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-24 rounded-full bg-[#F0EDE8]">
                                    <div className="h-1.5 rounded-full bg-black" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-[#C5C0B8]">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Top angesehene Düfte */}
                  <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                    <h3 className="mb-4 text-base font-semibold">Top Aufrufe</h3>
                    <ol className="space-y-2">
                      {analytics.topViewed.map((t, i) => (
                        <li key={t.entity_id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="w-5 shrink-0 text-xs text-[#C5C0B8]">{i + 1}.</span>
                          <span className="flex-1 truncate">{t.label}</span>
                          <span className="rounded-full border px-2 py-0.5 text-xs">{t.count}×</span>
                        </li>
                      ))}
                      {analytics.topViewed.length === 0 && (
                        <p className="text-xs text-[#C5C0B8]">Noch keine Daten.</p>
                      )}
                    </ol>
                  </div>

                  {/* Top Suchanfragen */}
                  <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                    <h3 className="mb-4 text-base font-semibold">Top Suchanfragen</h3>
                    <ol className="space-y-2">
                      {analytics.topSearches.map((s, i) => (
                        <li key={s.term} className="flex items-center justify-between gap-3 text-sm">
                          <span className="w-5 shrink-0 text-xs text-[#C5C0B8]">{i + 1}.</span>
                          <span className="flex-1 truncate">{s.term}</span>
                          <span className="rounded-full border px-2 py-0.5 text-xs">{s.count}×</span>
                        </li>
                      ))}
                      {analytics.topSearches.length === 0 && (
                        <p className="text-xs text-[#C5C0B8]">Noch keine Suchanfragen.</p>
                      )}
                    </ol>
                  </div>
                </div>

                {/* Duftstil-Verteilung */}
                {analytics.familyDistribution.length > 0 && (
                  <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                    <h3 className="mb-4 text-base font-semibold">Duftstil-Präferenzen (Nutzerprofile)</h3>
                    <div className="flex flex-wrap gap-2">
                      {analytics.familyDistribution.map((f) => (
                        <span key={f.family} className="rounded-xl border px-3 py-1.5 text-sm">
                          {f.family} <span className="ml-1 text-xs text-[#C5C0B8]">{f.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Letzte Events */}
                <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Letzte Events</h3>
                    <button
                      onClick={() => loadAnalytics()}
                      className="rounded-xl border px-3 py-1.5 text-xs"
                    >
                      Aktualisieren
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-[#9E9890]">
                          <th className="pb-2 font-medium">Zeit</th>
                          <th className="pb-2 font-medium">Typ</th>
                          <th className="pb-2 font-medium">Entity</th>
                          <th className="pb-2 font-medium">User</th>
                          <th className="pb-2 font-medium">Metadata</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentEvents.map((ev) => (
                          <tr key={ev.id} className="border-b last:border-0">
                            <td className="py-1.5 text-[#C5C0B8]">
                              {new Date(ev.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                            </td>
                            <td className="py-1.5 font-mono">{ev.event_type}</td>
                            <td className="py-1.5 text-[#9E9890]">
                              {ev.entity_type && <span>{ev.entity_type}/</span>}
                              {ev.entity_id ? ev.entity_id.slice(0, 8) + "…" : "–"}
                            </td>
                            <td className="py-1.5 text-[#C5C0B8]">
                              {ev.user_id ? ev.user_id.slice(0, 8) + "…" : "anon"}
                            </td>
                            <td className="py-1.5 text-[#C5C0B8]">
                              {Object.keys(ev.metadata ?? {}).length > 0
                                ? JSON.stringify(ev.metadata).slice(0, 60)
                                : "–"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: CHALLENGES */}
        {tab === "challenges" && (
          <div className="mt-6 space-y-6">

            {/* Formular: Erstellen / Bearbeiten */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A]">
                {editingChallengeId ? "Challenge bearbeiten" : "Neue Challenge erstellen"}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#9E9890]">Titel *</label>
                  <input value={challengeForm.title} onChange={(e) => setChallengeForm((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#9E9890]">Beschreibung</label>
                  <textarea rows={3} value={challengeForm.description} onChange={(e) => setChallengeForm((p) => ({ ...p, description: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div>
                  <label className="text-xs text-[#9E9890]">Pflicht-Accord (z.B. Rose)</label>
                  <input value={challengeForm.accordRequired} onChange={(e) => setChallengeForm((p) => ({ ...p, accordRequired: e.target.value }))}
                    placeholder="optional" className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div>
                  <label className="text-xs text-[#9E9890]">Preisgeld (€)</label>
                  <input type="number" min={0} step="0.01" value={challengeForm.prizeAmountCents} onChange={(e) => setChallengeForm((p) => ({ ...p, prizeAmountCents: e.target.value }))}
                    placeholder="0.00" className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#9E9890]">Zusatzpreise (Logo, Badge, Feature etc.)</label>
                  <input value={challengeForm.prizeDescription} onChange={(e) => setChallengeForm((p) => ({ ...p, prizeDescription: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#9E9890]">Regeln</label>
                  <textarea rows={4} value={challengeForm.rules} onChange={(e) => setChallengeForm((p) => ({ ...p, rules: e.target.value }))}
                    placeholder="Teilnahmebedingungen, Bewertungskriterien…" className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div>
                  <label className="text-xs text-[#9E9890]">Start-Datum *</label>
                  <input type="date" value={challengeForm.startDate} onChange={(e) => setChallengeForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div>
                  <label className="text-xs text-[#9E9890]">End-Datum *</label>
                  <input type="date" value={challengeForm.endDate} onChange={(e) => setChallengeForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div>
                  <label className="text-xs text-[#9E9890]">Status</label>
                  <select value={challengeForm.status} onChange={(e) => setChallengeForm((p) => ({ ...p, status: e.target.value as typeof p.status }))}
                    className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]">
                    <option value="draft">Entwurf</option>
                    <option value="active">Aktiv (auf Startseite)</option>
                    <option value="judging">Bewertungsphase</option>
                    <option value="ended">Beendet</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#9E9890]">Max. Einreichungen</label>
                  <input type="number" min={1} value={challengeForm.maxEntries} onChange={(e) => setChallengeForm((p) => ({ ...p, maxEntries: e.target.value }))}
                    placeholder="unbegrenzt" className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#9E9890]">Logo-URL</label>
                  <input value={challengeForm.logoUrl} onChange={(e) => setChallengeForm((p) => ({ ...p, logoUrl: e.target.value }))}
                    placeholder="https://…" className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]" />
                </div>
              </div>
              {challengeMsg && <p className="mt-3 text-xs text-[#9E9890]">{challengeMsg}</p>}
              <div className="mt-4 flex gap-2">
                <button onClick={saveChallenge} disabled={savingChallenge}
                  className="rounded-full bg-[#0A0A0A] px-5 py-2 text-xs font-medium uppercase tracking-wider text-white disabled:opacity-40">
                  {savingChallenge ? "Wird gespeichert…" : editingChallengeId ? "Aktualisieren" : "Challenge erstellen"}
                </button>
                {editingChallengeId && (
                  <button onClick={resetChallengeForm}
                    className="rounded-full border border-[#E5E0D8] px-5 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A]">
                    Abbrechen
                  </button>
                )}
              </div>
            </div>

            {/* Liste bestehender Challenges */}
            {challenges.length > 0 && (
              <div className="space-y-3">
                {challenges.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-[#0A0A0A]">{c.title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            c.status === "active" ? "bg-green-100 text-green-700" :
                            c.status === "judging" ? "bg-yellow-100 text-yellow-700" :
                            c.status === "ended" ? "bg-gray-100 text-gray-500" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {c.status === "active" ? "Aktiv" : c.status === "judging" ? "Bewertung" : c.status === "ended" ? "Beendet" : "Entwurf"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#9E9890]">
                          {new Date(c.startDate).toLocaleDateString("de-DE")} – {new Date(c.endDate).toLocaleDateString("de-DE")}
                          {c.accordRequired && ` · Accord: ${c.accordRequired}`}
                          {c.prizeAmountCents > 0 && ` · ${(c.prizeAmountCents / 100).toFixed(0)} € Preisgeld`}
                          {` · ${c.entryCount} Einreichungen`}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => loadChallengeEntries(c.id)}
                          className="rounded-lg border border-[#E5E0D8] px-3 py-1 text-xs hover:bg-[#F5F0EA] transition-colors">
                          {viewingEntriesChallengeId === c.id ? "▲ Schließen" : "Einreichungen"}
                        </button>
                        <button onClick={() => startEditChallenge(c)}
                          className="rounded-lg border border-[#E5E0D8] px-3 py-1 text-xs hover:bg-[#F5F0EA] transition-colors">
                          Bearbeiten
                        </button>
                        <button onClick={() => deleteChallenge(c.id)}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors">
                          Löschen
                        </button>
                      </div>
                    </div>

                    {viewingEntriesChallengeId === c.id && (
                      <div className="mt-4 border-t border-[#F0EDE8] pt-4">
                        {loadingEntries ? (
                          <p className="text-xs text-[#9E9890]">Lädt…</p>
                        ) : challengeEntries.length === 0 ? (
                          <p className="text-xs text-[#9E9890]">Noch keine Einreichungen.</p>
                        ) : (
                          <div className="space-y-2">
                            {challengeEntries.map((e) => (
                              <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#F0EDE8] px-3 py-2">
                                <div className="text-xs">
                                  <span className="font-medium text-[#0A0A0A]">{e.fragrance_name ?? "Unbekannter Duft"}</span>
                                  <span className="text-[#9E9890] ml-2">von @{e.creator_username ?? e.creator_id.slice(0, 8)}</span>
                                  <span className="text-[#C5C0B8] ml-2">{new Date(e.submitted_at).toLocaleDateString("de-DE")}</span>
                                </div>
                                {e.is_winner ? (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Gewinner</span>
                                ) : (
                                  <button
                                    onClick={() => markWinner(e.id, c.id)}
                                    disabled={markingWinnerId === e.id}
                                    className="rounded-full bg-[#0A0A0A] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#2A2A2A] disabled:opacity-40 transition-colors"
                                  >
                                    {markingWinnerId === e.id ? "…" : "Als Gewinner"}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {challenges.length === 0 && challengesLoaded && (
              <p className="text-sm text-center text-[#9E9890] py-6">Noch keine Challenges erstellt.</p>
            )}
          </div>
        )}

        {/* TAB: COMPLIANCE */}
        {tab === "compliance" && (
          <div className="mt-6 space-y-8">

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Düfte gesamt", value: complianceFragrances.length, icon: "◎" },
                { label: "Freigegeben", value: complianceFragrances.filter(f => f.complianceStatus === "approved_for_sale").length, icon: "✓", green: true },
                { label: "Ausstehend", value: complianceFragrances.filter(f => f.complianceStatus !== "approved_for_sale" && f.complianceStatus !== "rejected").length, icon: "◌", amber: true },
                { label: "Creator ohne KYC", value: complianceCreators.filter(c => !c.kycVerifiedAt).length, icon: "!", red: true },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl border p-4 ${
                  s.green ? "border-green-200 bg-green-50" :
                  s.amber ? "border-amber-200 bg-amber-50" :
                  s.red ? "border-red-200 bg-red-50" :
                  "border-[#E5E0D8] bg-white"
                }`}>
                  <p className={`text-xl font-bold ${s.green ? "text-green-700" : s.amber ? "text-amber-700" : s.red ? "text-red-700" : "text-[#0A0A0A]"}`}>
                    {s.icon} {s.value}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-[#9E9890]">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Legal Info */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
              <p className="font-semibold uppercase tracking-wider text-amber-700">Gesetzliche Anforderungen vor Verkauf (EU-KVO 1223/2009)</p>
              <p>Jedes Produkt braucht: <strong>PIF</strong> (Art. 11), <strong>CPSR</strong> durch qualifizierte Sicherheitsperson (Art. 10), <strong>CPNP-Notifizierung</strong> (Art. 13), benannte <strong>Verantwortliche Person / RP</strong> (Art. 4).</p>
              <p>Compliance-Status <strong>approved_for_sale</strong> = alle vier Voraussetzungen bestätigt. Ohne diesen Status darf <em>is_public</em> nicht gesetzt werden.</p>
            </div>

            {/* Fragrance Compliance Table */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890] font-semibold">
                Düfte — Compliance-Status
              </p>
              {!complianceLoaded ? (
                <p className="text-sm text-[#9E9890]">Lädt…</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#E5E0D8]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                        <th className="px-4 py-3 font-medium">Duft</th>
                        <th className="px-4 py-3 font-medium">Creator</th>
                        <th className="px-4 py-3 font-medium">Compliance-Status</th>
                        <th className="px-4 py-3 font-medium">Öffentlich</th>
                        <th className="px-4 py-3 font-medium">Erstellt</th>
                        <th className="px-4 py-3 font-medium">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceFragrances.map((f) => (
                        <tr key={f.id} className="border-b last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#0A0A0A]">{f.name}</p>
                            <p className="text-xs text-[#C5C0B8]">{f.id.slice(0, 8)}…</p>
                          </td>
                          <td className="px-4 py-3 text-[#6E6860]">
                            {f.creatorUsername ? `@${f.creatorUsername}` : "–"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              f.complianceStatus === "approved_for_sale"
                                ? "bg-green-100 text-green-700"
                                : f.complianceStatus === "cpsr_approved"
                                  ? "bg-blue-100 text-blue-700"
                                  : f.complianceStatus === "pif_submitted"
                                    ? "bg-amber-100 text-amber-700"
                                    : f.complianceStatus === "rejected"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-[#F0EDE8] text-[#9E9890]"
                            }`}>
                              {f.complianceStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs ${f.isPublic ? "text-green-700" : "text-[#C5C0B8]"}`}>
                              {f.isPublic ? "Ja" : "Nein"}
                            </span>
                            {f.isPublic && f.complianceStatus !== "approved_for_sale" && (
                              <span className="ml-1 text-xs text-red-500">⚠</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#C5C0B8]">
                            {new Date(f.createdAt).toLocaleDateString("de-DE")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(["pif_submitted", "cpsr_approved", "approved_for_sale", "rejected"] as const).map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={f.complianceStatus === status || updatingComplianceId === f.id}
                                  onClick={() => updateComplianceStatus(f.id, status)}
                                  className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 ${
                                    status === "approved_for_sale"
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : status === "rejected"
                                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                                        : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                                  }`}
                                >
                                  {status === "pif_submitted" ? "PIF ✓" :
                                   status === "cpsr_approved" ? "CPSR ✓" :
                                   status === "approved_for_sale" ? "Freigeben" :
                                   "Ablehnen"}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {complianceFragrances.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-[#9E9890]">Keine Düfte vorhanden.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Creator KYC Table */}
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890] font-semibold">Creator — KYC & § 22f UStG Status</p>
              <p className="mb-3 text-xs text-[#9E9890]">Auszahlungen nur möglich nach: Vereinbarung akzeptiert + Klarname + Steuer-ID (USt-IdNr. oder Steuer-IdNr. oder Kleinunternehmer-Erklärung) + KYC verifiziert.</p>
              {!complianceLoaded ? (
                <p className="text-sm text-[#9E9890]">Lädt…</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#E5E0D8]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-[#FAFAF8] text-left text-[#9E9890]">
                        <th className="px-4 py-3 font-medium">Creator</th>
                        <th className="px-4 py-3 font-medium">Vereinbarung</th>
                        <th className="px-4 py-3 font-medium">Klarname</th>
                        <th className="px-4 py-3 font-medium">Steuer-ID</th>
                        <th className="px-4 py-3 font-medium">KYC verifiziert</th>
                        <th className="px-4 py-3 font-medium">Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceCreators.map((c) => {
                        const hasTax = !!(c.vatId || c.taxId || c.isKleinunternehmer);
                        const isReady = !!(c.agreementAcceptedAt && c.legalName && hasTax);
                        return (
                          <tr key={c.id} className={`border-b last:border-0 ${c.payoutBlocked ? "bg-red-50" : ""}`}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-[#0A0A0A]">{c.displayName ?? c.username ?? "–"}</p>
                              <p className="text-[#C5C0B8]">{c.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              {c.agreementAcceptedAt
                                ? <span className="text-green-700">✓ {new Date(c.agreementAcceptedAt).toLocaleDateString("de-DE")}</span>
                                : <span className="text-red-500">✗ Fehlend</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              {c.legalName
                                ? <span className="text-green-700">✓ {c.legalName.slice(0, 20)}</span>
                                : <span className="text-red-500">✗ Fehlend</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              {c.vatId
                                ? <span className="text-green-700">USt: {c.vatId}</span>
                                : c.taxId
                                  ? <span className="text-green-700">Steuer-ID: {c.taxId.slice(0, 6)}…</span>
                                  : c.isKleinunternehmer
                                    ? <span className="text-blue-700">Kleinunternehmer</span>
                                    : <span className="text-red-500">✗ Fehlend</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              {c.kycVerifiedAt
                                ? <span className="text-green-700">✓ {new Date(c.kycVerifiedAt).toLocaleDateString("de-DE")}</span>
                                : isReady
                                  ? <span className="text-amber-700">Bereit zur Prüfung</span>
                                  : <span className="text-[#C5C0B8]">Daten unvollständig</span>
                              }
                              {c.payoutBlocked && (
                                <span className="ml-1 text-red-500 font-semibold">GESPERRT</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {!c.kycVerifiedAt && isReady && (
                                  <button
                                    type="button"
                                    disabled={updatingKycId === c.id}
                                    onClick={() => verifyKyc(c.id, false)}
                                    className="rounded-lg bg-green-100 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-200 disabled:opacity-40"
                                  >
                                    KYC freigeben
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={updatingKycId === c.id}
                                  onClick={() => verifyKyc(c.id, !c.payoutBlocked)}
                                  className={`rounded-lg px-2 py-1 text-[10px] font-medium disabled:opacity-40 ${
                                    c.payoutBlocked
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  }`}
                                >
                                  {c.payoutBlocked ? "Entsperren" : "Sperren"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {complianceCreators.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-6 text-center text-[#9E9890]">Keine Creator vorhanden.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
