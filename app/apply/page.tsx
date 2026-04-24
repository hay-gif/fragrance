"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";

type ApplicationStatus = "none" | "pending" | "approved" | "rejected";

const BENEFITS = [
  {
    icon: "◈",
    title: "Provision auf jeden Verkauf",
    desc: "Du verdienst automatisch an jedem Verkauf deiner Düfte. Die Provision wird direkt auf deinem Dashboard angezeigt und regelmäßig ausgezahlt.",
  },
  {
    icon: "◈",
    title: "Lifetime-Referral-Provision",
    desc: "Wenn du neue Kunden über deinen persönlichen Referral-Link wirbst, erhältst du eine lebenslange Provision auf jeden ihrer Käufe — auch zukünftige.",
  },
  {
    icon: "◈",
    title: "Eigene Duftkompositionen",
    desc: "Erstelle und veröffentliche deine eigenen Düfte auf der Plattform. Nutze unseren KI-Assistenten und unsere Accord-Bibliothek für professionelle Ergebnisse.",
  },
  {
    icon: "◈",
    title: "Creator Dashboard",
    desc: "Vollständige Übersicht über deine Umsätze, Provisionen, Follower und die Performance jedes einzelnen Dufts.",
  },
  {
    icon: "◈",
    title: "Eigene Community",
    desc: "Kunden können dir folgen und werden bei neuen Düften benachrichtigt. Baue dir eine loyale Kundschaft direkt auf der Plattform auf.",
  },
  {
    icon: "◈",
    title: "Sample-Programm",
    desc: "Fordere Samples deiner Kreationen an — teste vor dem Launch und stelle sicher, dass alles perfekt ist.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Bewerbung einreichen",
    desc: "Fülle das Formular aus und erkläre uns, wer du bist und was du vorhast. Ein kurzes Portfolio oder Social-Media-Link hilft uns, dich kennenzulernen.",
  },
  {
    step: "2",
    title: "Prüfung durch unser Team",
    desc: "Wir schauen uns deine Bewerbung an und melden uns in der Regel innerhalb weniger Tage. Bei Rückfragen kommen wir auf dich zu.",
  },
  {
    step: "3",
    title: "Account-Freischaltung",
    desc: "Nach der Genehmigung wird dein Account auf Creator hochgestuft. Du erhältst sofort Zugang zu allen Creator-Funktionen.",
  },
  {
    step: "4",
    title: "Loslegen & verdienen",
    desc: "Erstelle deinen ersten Duft, teile deinen Referral-Link und baue deine Präsenz auf der Plattform auf.",
  },
];

export default function ApplyPage() {
  const [status, setStatus] = useState<ApplicationStatus>("none");
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("user");

  const [message, setMessage] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Multi-Step Bewerbungs-Wizard
  const [appStep, setAppStep] = useState(1);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [followerRange, setFollowerRange] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState({ instagram: "", tiktok: "", youtube: "", website: "" });

  function toggleNiche(n: string) {
    setSelectedNiches((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  }

  useEffect(() => {
    async function load() {
      const profile = await getOwnProfile();

      if (!profile) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      setUserId(profile.id);
      setUserRole(profile.role);

      if (profile.role === "creator" || profile.role === "admin") {
        setStatus("approved");
        setLoading(false);
        return;
      }

      // Bewerbungsstatus laden
      const { data } = await supabase
        .from("creator_applications")
        .select("status, admin_note")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (data) {
        setStatus(data.status as ApplicationStatus);
        setAdminNote(data.admin_note ?? null);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function submit() {
    if (!userId) return;
    if (!message.trim()) {
      setSubmitError("Bitte schreibe eine Nachricht zur Bewerbung (Schritt 1).");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    // Alle Felder in eine strukturierte message + portfolio_url packen
    const fullMessage = [
      `[ÜBER MICH]\n${message.trim()}`,
      experienceLevel ? `[ERFAHRUNGSLEVEL] ${experienceLevel}` : "",
      selectedNiches.length > 0 ? `[NISCHEN] ${selectedNiches.join(", ")}` : "",
      followerRange ? `[FOLLOWER] ${followerRange}` : "",
    ].filter(Boolean).join("\n\n");

    const allLinks = [socialLinks.instagram, socialLinks.tiktok, socialLinks.youtube, socialLinks.website, portfolioUrl]
      .map((s) => s.trim()).filter(Boolean).join(", ");

    const { error } = await supabase.from("creator_applications").upsert(
      {
        user_id: userId,
        message: fullMessage,
        portfolio_url: allLinks || null,
        status: "pending",
        reviewed_at: null,
        admin_note: null,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setSubmitError("Bewerbung konnte nicht eingereicht werden. Bitte versuche es erneut.");
      setSubmitting(false);
      return;
    }

    // Analytics
    try {
      const { trackEvent } = await import("@/lib/analytics");
      trackEvent("creator_applied");
    } catch {}

    setStatus("pending");
    setSubmitting(false);
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
      {/* Hero — dark full-width */}
      <section className="bg-[#0A0A0A] px-5 pt-20 pb-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Creator Programm</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-white">
            Verdiene mit deiner
            <br />
            Leidenschaft für Düfte.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-white/60">
            Werde Teil unseres Creator-Netzwerks, veröffentliche deine eigenen Kompositionen
            und baue dir einen nachhaltigen Nebenverdienst auf — vollständig integriert in
            unsere Plattform.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-5 py-8">

        {/* Vorteile */}
        <section>
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Was du bekommst</p>
          <h2 className="text-xl font-bold text-[#0A0A0A]">Creator Benefits</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <p className="text-xs font-medium text-[#9E9890]">{b.icon}</p>
                <h3 className="mt-2 text-sm font-semibold text-[#0A0A0A]">{b.title}</h3>
                <p className="mt-1.5 text-xs text-[#6E6860]">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Provisionsmodell */}
        <section className="mt-10">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Verdienst</p>
          <h2 className="text-xl font-bold text-[#0A0A0A]">Provisionsmodell</h2>
          <div className="mt-5 rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-4xl font-bold text-[#0A0A0A]">25%</p>
                <p className="mt-1.5 text-xs text-[#6E6860]">Standard-Provision auf Verkäufe deiner Düfte</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-[#0A0A0A]">5%</p>
                <p className="mt-1.5 text-xs text-[#6E6860]">Lifetime-Provision auf alle Käufe geworbener Kunden</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-[#0A0A0A]">∞</p>
                <p className="mt-1.5 text-xs text-[#6E6860]">Keine Begrenzung deiner Einnahmen oder Düfte</p>
              </div>
            </div>
            <p className="mt-5 rounded-xl bg-[#FAFAF8] border border-[#E5E0D8] px-4 py-3 text-xs text-[#9E9890]">
              Die Provision wird pro Verkauf berechnet und im Creator Dashboard angezeigt.
              Auszahlungen erfolgen monatlich. Die individuelle Provision kann nach Absprache
              angepasst werden.
            </p>
          </div>
        </section>

        {/* So funktioniert es */}
        <section className="mt-10">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Prozess</p>
          <h2 className="text-xl font-bold text-[#0A0A0A]">So funktioniert es</h2>
          <div className="mt-5 space-y-3">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="flex gap-4 rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#0A0A0A] text-xs font-bold text-[#0A0A0A]">
                  {step.step}
                </div>
                <div className="pt-0.5">
                  <h3 className="text-sm font-semibold text-[#0A0A0A]">{step.title}</h3>
                  <p className="mt-1 text-xs text-[#6E6860]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bewerbungsbereich */}
        <section className="mt-10">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Bewerbung</p>
          <h2 className="text-xl font-bold text-[#0A0A0A]">Jetzt bewerben</h2>

          {/* Nicht eingeloggt */}
          {notLoggedIn && (
            <div className="mt-5 rounded-2xl bg-white border border-[#E5E0D8] p-6 text-center">
              <p className="text-sm text-[#6E6860]">
                Du musst eingeloggt sein, um dich zu bewerben.
              </p>
              <Link
                href="/auth"
                className="mt-4 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
              >
                Account erstellen / Einloggen
              </Link>
            </div>
          )}

          {/* Bereits Creator / Admin */}
          {!notLoggedIn &&
            (status === "approved" ||
              userRole === "creator" ||
              userRole === "admin") && (
              <div className="mt-5 rounded-2xl bg-white border border-green-200 p-6">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#0A0A0A] px-3 py-1 text-xs font-medium text-white">
                    ◆ Creator
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#0A0A0A]">
                  Du bist bereits Creator!
                </p>
                <p className="mt-1 text-xs text-[#6E6860]">
                  Dein Account hat vollen Zugriff auf alle Creator-Funktionen.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/create"
                    className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
                  >
                    Duft erstellen
                  </Link>
                  <Link
                    href="/creator-dashboard"
                    className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                  >
                    Creator Dashboard
                  </Link>
                </div>
              </div>
            )}

          {/* Bewerbung ausstehend */}
          {!notLoggedIn && status === "pending" && (
            <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
              <p className="text-sm font-semibold text-yellow-800">
                Bewerbung eingereicht
              </p>
              <p className="mt-1 text-xs text-yellow-700">
                Deine Bewerbung wird aktuell geprüft. Du erhältst eine Benachrichtigung,
                sobald eine Entscheidung getroffen wurde. Das dauert in der Regel wenige
                Tage.
              </p>
            </div>
          )}

          {/* Abgelehnt */}
          {!notLoggedIn && status === "rejected" && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-semibold text-red-800">
                  Bewerbung abgelehnt
                </p>
                {adminNote && (
                  <p className="mt-1.5 text-xs text-red-700">
                    Begründung: {adminNote}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-red-700">
                  Du kannst eine neue Bewerbung einreichen.
                </p>
              </div>

              {/* Erneut bewerben */}
              <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">
                  Erneut bewerben
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">
                      Warum möchtest du Creator werden?
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      placeholder="Erzähl uns von dir, deiner Leidenschaft für Düfte und was du auf der Plattform vorhast…"
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">
                      Portfolio / Social Media (optional)
                    </label>
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://instagram.com/deinprofil"
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                    />
                  </div>
                  {submitError && (
                    <p className="text-xs text-red-600">{submitError}</p>
                  )}
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40"
                  >
                    {submitting ? "Wird eingereicht…" : "Bewerbung erneut einreichen"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Noch nicht beworben — Multi-Step Wizard */}
          {!notLoggedIn && status === "none" && (
            <div className="mt-5 rounded-2xl bg-white border border-[#E5E0D8] overflow-hidden">
              {/* Step-Indicator */}
              <div className="flex border-b border-[#E5E0D8]">
                {[
                  { n: 1, label: "Über dich" },
                  { n: 2, label: "Dein Stil" },
                  { n: 3, label: "Links" },
                ].map((s) => (
                  <button
                    key={s.n}
                    onClick={() => appStep > s.n && setAppStep(s.n)}
                    className={`flex-1 px-4 py-3 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      appStep === s.n
                        ? "border-b-2 border-[#0A0A0A] text-[#0A0A0A]"
                        : appStep > s.n
                        ? "text-[#9E9890] cursor-pointer hover:text-[#6E6860]"
                        : "text-[#C5C0B8] cursor-default"
                    }`}
                  >
                    {s.n}. {s.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* ── Step 1: Motivation & Erfahrung ── */}
                {appStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">
                        Warum möchtest du Creator werden? <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        placeholder="Erzähl uns von dir, deiner Leidenschaft für Düfte und was du auf der Plattform vorhast…"
                        className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] uppercase tracking-wider text-[#9E9890]">
                        Deine Erfahrung mit Düften
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { key: "beginner", label: "Einsteiger", desc: "Ich entdecke gerade Düfte" },
                          { key: "enthusiast", label: "Enthusiast", desc: "Ich sammle und teste aktiv" },
                          { key: "experienced", label: "Erfahren", desc: "Ich mische und komponiere" },
                          { key: "professional", label: "Profi", desc: "Ausbildung / Berufserfahrung" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setExperienceLevel(opt.key)}
                            className={`rounded-xl border p-3 text-left transition-all ${
                              experienceLevel === opt.key
                                ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                                : "border-[#E5E0D8] hover:border-[#9E9890]"
                            }`}
                          >
                            <p className={`text-xs font-medium ${experienceLevel === opt.key ? "text-white" : "text-[#0A0A0A]"}`}>{opt.label}</p>
                            <p className={`mt-0.5 text-[10px] ${experienceLevel === opt.key ? "text-white/60" : "text-[#9E9890]"}`}>{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!message.trim()) { setSubmitError("Bitte schreibe eine kurze Motivation."); return; }
                        setSubmitError("");
                        setAppStep(2);
                      }}
                      className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
                    >
                      Weiter →
                    </button>
                    {submitError && <p className="text-xs text-red-600">{submitError}</p>}
                  </div>
                )}

                {/* ── Step 2: Nische & Reichweite ── */}
                {appStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-[10px] uppercase tracking-wider text-[#9E9890]">
                        Welche Düfte-Nischen interessieren dich? (Mehrfachauswahl)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Nische & Artisan", "Mainstream / Designer", "Oud & Oriental", "Fresh & Aquatic",
                          "Floral & Romantisch", "Woody & Earthy", "Gourmand & Süß", "Unisex & Genderless",
                          "Vintage & Retro", "Vegan & Natural",
                        ].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => toggleNiche(n)}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                              selectedNiches.includes(n)
                                ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                                : "border-[#E5E0D8] text-[#6E6860] hover:border-[#9E9890]"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] uppercase tracking-wider text-[#9E9890]">
                        Deine Reichweite (Social Media / Community)
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { key: "none", label: "Keine", desc: "Starte gerade" },
                          { key: "small", label: "< 1.000", desc: "Kleine Community" },
                          { key: "medium", label: "1K – 10K", desc: "Wachsende Reichweite" },
                          { key: "large", label: "> 10K", desc: "Etablierte Präsenz" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setFollowerRange(opt.key)}
                            className={`rounded-xl border p-3 text-left transition-all ${
                              followerRange === opt.key
                                ? "border-[#C9A96E] bg-[#FDF8F0]"
                                : "border-[#E5E0D8] hover:border-[#C9A96E]/50"
                            }`}
                          >
                            <p className="text-xs font-bold text-[#0A0A0A]">{opt.label}</p>
                            <p className="mt-0.5 text-[10px] text-[#9E9890]">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAppStep(1)}
                        className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                      >
                        ← Zurück
                      </button>
                      <button
                        onClick={() => setAppStep(3)}
                        className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
                      >
                        Weiter →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Social-Media-Links + Abschicken ── */}
                {appStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-xs text-[#6E6860]">
                      Links helfen uns, dich besser kennenzulernen. Mindestens einer ist optional,
                      macht aber einen guten Eindruck.
                    </p>
                    {[
                      { key: "instagram" as const, label: "Instagram", placeholder: "https://instagram.com/deinprofil" },
                      { key: "tiktok" as const, label: "TikTok", placeholder: "https://tiktok.com/@deinprofil" },
                      { key: "youtube" as const, label: "YouTube / Basenotes / etc.", placeholder: "https://…" },
                      { key: "website" as const, label: "Website / Blog (optional)", placeholder: "https://deine-website.de" },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#9E9890]">{field.label}</label>
                        <input
                          type="url"
                          value={socialLinks[field.key]}
                          onChange={(e) => setSocialLinks((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                        />
                      </div>
                    ))}

                    {submitError && (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {submitError}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setAppStep(2)}
                        className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                      >
                        ← Zurück
                      </button>
                      <button
                        onClick={submit}
                        disabled={submitting}
                        className="flex-1 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40"
                      >
                        {submitting ? "Wird eingereicht…" : "Bewerbung einreichen ✓"}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#C5C0B8]">
                      Mit dem Einreichen stimmst du zu, dass wir deine Angaben zur Prüfung verwenden.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="mt-10">
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">FAQ</p>
          <h2 className="text-xl font-bold text-[#0A0A0A]">Häufige Fragen</h2>
          <div className="mt-5 overflow-hidden rounded-2xl bg-white border border-[#E5E0D8]">
            {[
              {
                q: "Brauche ich Vorkenntnisse in der Parfümerie?",
                a: "Nein. Unser KI-Assistent und unsere Accord-Bibliothek helfen dir dabei, professionelle Düfte zu kreieren — auch ohne Vorerfahrung. Leidenschaft und Kreativität zählen mehr.",
              },
              {
                q: "Wann und wie werde ich ausgezahlt?",
                a: "Auszahlungen erfolgen monatlich, sobald dein Guthaben die Mindestauszahlungsgrenze erreicht. Die Details werden nach Freischaltung mit dir abgestimmt.",
              },
              {
                q: "Kann ich meine Provision-Rate verhandeln?",
                a: "Ja. Die Standardprovision beträgt 25%, kann aber bei nachgewiesenem Erfolg oder besonderer Reichweite angepasst werden.",
              },
              {
                q: "Was passiert mit meinen Düften, wenn ich aufhöre?",
                a: "Deine Düfte bleiben auf der Plattform verfügbar, bis du sie manuell entfernst. Bestehende Provisionen werden weiterhin ausgezahlt.",
              },
              {
                q: "Kann ich als Creator auch selbst Düfte kaufen?",
                a: "Ja, absolut. Dein Creator-Status hat keinen Einfluss auf deine Möglichkeit, als Kunde einzukaufen.",
              },
            ].map((faq, i, arr) => (
              <div
                key={faq.q}
                className={`px-5 py-4 ${i < arr.length - 1 ? "border-b border-[#E5E0D8]" : ""}`}
              >
                <h3 className="text-sm font-semibold text-[#0A0A0A]">{faq.q}</h3>
                <p className="mt-1.5 text-xs text-[#6E6860]">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 border-t border-[#E5E0D8] pt-8 text-center">
          <p className="text-xs text-[#9E9890]">
            Hast du weitere Fragen?{" "}
            <Link href="/profile" className="underline text-[#6E6860]">
              Schreib uns über dein Profil
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
