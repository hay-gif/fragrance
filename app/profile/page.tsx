"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getOwnProfile, type Profile, type SocialLinks, type FragrancePreferences } from "@/lib/profile";
import ImageEditor from "@/components/ImageEditor";
import { supabase } from "@/lib/supabase";

const SOCIAL_PLATFORMS = [
  { key: "instagram" as const, label: "Instagram", placeholder: "@deinname oder URL" },
  { key: "tiktok" as const, label: "TikTok", placeholder: "@deinname oder URL" },
  { key: "youtube" as const, label: "YouTube", placeholder: "Kanal-URL" },
  { key: "twitter" as const, label: "Twitter / X", placeholder: "@deinname oder URL" },
  { key: "website" as const, label: "Website", placeholder: "https://..." },
];

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">{label}</label>
      {children}
    </div>
  );
}

function normalizeSocialUrl(platform: keyof SocialLinks, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  if (platform === "instagram") return `https://instagram.com/${withoutAt}`;
  if (platform === "tiktok") return `https://tiktok.com/@${withoutAt}`;
  if (platform === "twitter") return `https://twitter.com/${withoutAt}`;
  if (platform === "youtube") return `https://youtube.com/@${withoutAt}`;
  return trimmed;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("DE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [fragranceNotes, setFragranceNotes] = useState<string[]>([]);
  const [fragranceIntensity, setFragranceIntensity] = useState<FragrancePreferences["intensity"] | "">("");
  const [message, setMessage] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [avatarEditorFile, setAvatarEditorFile] = useState<File | null>(null);
  const [bannerEditorFile, setBannerEditorFile] = useState<File | null>(null);

  // Creator-Bewerbung
  const [applicationStatus, setApplicationStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationPortfolio, setApplicationPortfolio] = useState("");
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [applicationNote, setApplicationNote] = useState("");

  // Loyalty
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);
  const [loyaltyEvents, setLoyaltyEvents] = useState<{ id: string; type: string; points: number; description: string; created_at: string }[]>([]);

  // Account security state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "settings" | "creator">("overview");

  useEffect(() => {
    async function loadProfile() {
      const ownProfile = await getOwnProfile();

      if (!ownProfile) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      setProfile(ownProfile);
      setUsername(ownProfile.username ?? "");
      setDisplayName(ownProfile.display_name ?? "");
      setBio(ownProfile.bio ?? "");
      setSocialLinks(ownProfile.social_links ?? {});
      setPhone(ownProfile.phone ?? "");
      setAddressLine1(ownProfile.address_line1 ?? "");
      setAddressLine2(ownProfile.address_line2 ?? "");
      setCity(ownProfile.city ?? "");
      setPostalCode(ownProfile.postal_code ?? "");
      setCountry(ownProfile.country ?? "DE");
      setDateOfBirth(ownProfile.date_of_birth ?? "");
      setNewsletterOptIn(ownProfile.newsletter_opt_in ?? false);
      setFragranceNotes(ownProfile.fragrance_preferences?.notes ?? []);
      setFragranceIntensity(ownProfile.fragrance_preferences?.intensity ?? "");

      // Creator-Bewerbung laden
      if (ownProfile.creator_status === "none") {
        const { data: appData } = await supabase
          .from("creator_applications")
          .select("status, admin_note")
          .eq("user_id", ownProfile.id)
          .maybeSingle();

        if (appData) {
          setApplicationStatus(appData.status as "pending" | "approved" | "rejected");
          setApplicationNote(appData.admin_note ?? "");
        }
      }

      // Loyalty-Punkte laden
      const { data: lpData } = await supabase
        .from("loyalty_points")
        .select("points")
        .eq("user_id", ownProfile.id)
        .maybeSingle();
      setLoyaltyPoints(lpData?.points ?? 0);

      const { data: leData } = await supabase
        .from("loyalty_events")
        .select("id, type, points, description, created_at")
        .eq("user_id", ownProfile.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setLoyaltyEvents(leData ?? []);

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function submitApplication() {
    if (!profile) return;
    if (!applicationMessage.trim()) {
      setMessage("Bitte beschreibe kurz deine Motivation.");
      return;
    }

    setSubmittingApplication(true);
    setMessage("");

    const { error } = await supabase.from("creator_applications").insert({
      user_id: profile.id,
      message: applicationMessage.trim(),
      portfolio_url: applicationPortfolio.trim() || null,
    });

    if (error) {
      console.error("Fehler beim Einreichen:", error);
      setMessage("Bewerbung konnte nicht eingereicht werden.");
      setSubmittingApplication(false);
      return;
    }

    setApplicationStatus("pending");
    setMessage("Bewerbung eingereicht. Wir melden uns bald!");
    setSubmittingApplication(false);
  }

  async function changeEmail() {
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    setSecurityMessage(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (error) {
      setSecurityMessage({ text: error.message, ok: false });
    } else {
      setNewEmail("");
      setSecurityMessage({ text: "Bestätigungslink an neue E-Mail gesendet. Bitte prüfe dein Postfach.", ok: true });
    }
  }

  async function changePassword() {
    if (!newPassword) return;
    if (newPassword.length < 8) {
      setSecurityMessage({ text: "Passwort muss mind. 8 Zeichen lang sein.", ok: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ text: "Passwörter stimmen nicht überein.", ok: false });
      return;
    }
    setSavingPassword(true);
    setSecurityMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setSecurityMessage({ text: error.message, ok: false });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      setSecurityMessage({ text: "Passwort erfolgreich geändert.", ok: true });
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Konto wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden gemäß DSGVO Art. 17 gelöscht."
    );
    if (!confirmed) return;
    const doubleConfirm = window.prompt('Gib "LÖSCHEN" ein um zu bestätigen:');
    if (doubleConfirm !== "LÖSCHEN") return;
    setDeletingAccount(true);
    setSecurityMessage(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeletingAccount(false); return; }
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      await supabase.auth.signOut();
      window.location.href = "/?deleted=1";
    } else {
      const json = await res.json().catch(() => ({}));
      setSecurityMessage({ text: json.error ?? "Konto konnte nicht gelöscht werden.", ok: false });
      setDeletingAccount(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;

    setMessage("");

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      setMessage("Bitte gib einen Username ein.");
      return;
    }

    const normalizedSocialLinks: SocialLinks = {};
    for (const platform of SOCIAL_PLATFORMS) {
      const val = socialLinks[platform.key] ?? "";
      const normalized = normalizeSocialUrl(platform.key, val);
      if (normalized) normalizedSocialLinks[platform.key] = normalized;
    }

    const fragrancePreferences: FragrancePreferences = {};
    if (fragranceNotes.length > 0) fragrancePreferences.notes = fragranceNotes;
    if (fragranceIntensity) fragrancePreferences.intensity = fragranceIntensity;

    const { error } = await supabase
      .from("profiles")
      .update({
        username: normalizedUsername,
        display_name: displayName.trim(),
        bio: bio.trim(),
        social_links: normalizedSocialLinks,
        phone: phone.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        postal_code: postalCode.trim() || null,
        country: country.trim() || "DE",
        date_of_birth: dateOfBirth || null,
        newsletter_opt_in: newsletterOptIn,
        fragrance_preferences: fragrancePreferences,
      })
      .eq("id", profile.id);

    if (error) {
      console.error("Fehler beim Speichern des Profils:", error);
      setMessage("Profil konnte nicht gespeichert werden.");
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            username: normalizedUsername,
            display_name: displayName.trim(),
            bio: bio.trim(),
            social_links: normalizedSocialLinks,
            phone: phone.trim() || null,
            address_line1: addressLine1.trim() || null,
            address_line2: addressLine2.trim() || null,
            city: city.trim() || null,
            postal_code: postalCode.trim() || null,
            country: country.trim() || "DE",
            date_of_birth: dateOfBirth || null,
            newsletter_opt_in: newsletterOptIn,
            fragrance_preferences: fragrancePreferences,
          }
        : prev,
    );

    setMessage("Profil gespeichert.");
  }

  async function handleAvatarUpload(file: File) {
    if (!profile) return;

    setUploadingAvatar(true);
    setMessage("");

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${profile.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error("Fehler beim Avatar-Upload:", uploadError);
      setMessage("Profilbild konnte nicht hochgeladen werden.");
      setUploadingAvatar(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Fehler beim Speichern der Avatar-URL:", updateError);
      setMessage("Profilbild wurde hochgeladen, aber URL konnte nicht gespeichert werden.");
      setUploadingAvatar(false);
      return;
    }

    setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    setMessage("Profilbild gespeichert.");
    setUploadingAvatar(false);
  }

  async function handleBannerUpload(file: File) {
    if (!profile) return;

    setUploadingBanner(true);
    setMessage("");

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `banners/${profile.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error("Fehler beim Banner-Upload:", uploadError);
      setMessage("Banner konnte nicht hochgeladen werden.");
      setUploadingBanner(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ banner_url: publicUrl })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Fehler beim Speichern der Banner-URL:", updateError);
      setMessage("Banner wurde hochgeladen, aber URL konnte nicht gespeichert werden.");
      setUploadingBanner(false);
      return;
    }

    setProfile((prev) => (prev ? { ...prev, banner_url: publicUrl } : prev));
    setMessage("Banner gespeichert.");
    setUploadingBanner(false);
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

  if (notLoggedIn || !profile) {
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

  const isCreator = profile.creator_status === "unlocked" || profile.role === "creator" || profile.role === "admin";
  const tabs = [
    { key: "overview" as const, label: "Übersicht" },
    { key: "profile" as const, label: "Profil" },
    { key: "settings" as const, label: "Einstellungen" },
    { key: "creator" as const, label: "Creator" },
  ];
  const inputCls = "w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors";

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-0">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between pb-6">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40">
                  {(profile.display_name || profile.username || "?")[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Fragrance OS</p>
                <h1 className="text-xl font-bold text-white leading-tight">{profile.display_name || profile.username || "Mein Profil"}</h1>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-white/40">{profile.email}</p>
                  {isCreator && <span className="rounded-full bg-[#C9A96E]/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#C9A96E]">Creator</span>}
                </div>
              </div>
            </div>
            {profile.username && (
              <Link href={`/creator/${profile.username}`} className="shrink-0 rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-medium text-white/50 hover:border-white/50 hover:text-white transition-all">
                Profil ansehen →
              </Link>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-t border-white/10 pt-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`rounded-t-lg px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-all ${
                  activeTab === t.key ? "bg-[#FAFAF8] text-[#0A0A0A]" : "text-white/40 hover:text-white/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6 space-y-4">

        {/* ── Tab: Übersicht ── */}
        {activeTab === "overview" && (
          <>
            {/* Loyalty */}
            <div className="rounded-2xl bg-[#0A0A0A] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Loyalty Punkte</p>
                <span className="text-[10px] text-white/30">1 Punkt = 1 € Einkauf</span>
              </div>
              <div className="mb-5 flex items-end gap-2">
                <span className="text-5xl font-bold text-[#C9A96E]">{loyaltyPoints ?? 0}</span>
                <span className="mb-1 text-sm text-white/40">Punkte</span>
              </div>
              {loyaltyEvents.length > 0 ? (
                <div className="space-y-1.5">
                  {loyaltyEvents.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <div>
                        <span className="text-xs text-white/60">{ev.description || ev.type}</span>
                        <span className="ml-2 text-[10px] text-white/25">{new Date(ev.created_at).toLocaleDateString("de-DE")}</span>
                      </div>
                      <span className={`text-xs font-semibold ${ev.points >= 0 ? "text-[#C9A96E]" : "text-red-400"}`}>
                        {ev.points >= 0 ? "+" : ""}{ev.points}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30">Noch keine Punkte gesammelt. Kaufe einen Duft, um loszulegen.</p>
              )}
            </div>

            {/* Account info */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Account-Informationen</p>
              <dl className="space-y-2 text-sm">
                {[
                  ["E-Mail", profile.email],
                  ["Rolle", profile.role],
                  ["Öffentliche Slots", String(profile.public_slots ?? 0)],
                  ["Provision", `${profile.commission_percent ?? 0}%`],
                  profile.referral_code ? ["Referral-Code", profile.referral_code] : null,
                ].filter(Boolean).map((entry) => {
                  const [label, value] = entry as [string, string];
                  return (
                    <div key={label} className="flex items-center justify-between">
                      <dt className="text-[#9E9890]">{label}</dt>
                      <dd className="font-medium text-[#0A0A0A] font-mono text-xs">{value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { href: "/orders", label: "Meine Bestellungen", icon: "◫" },
                { href: "/my-fragrances", label: "Meine Düfte", icon: "◉" },
                { href: "/create", label: "Duft kreieren", icon: "✦" },
                { href: "/discover", label: "Entdecken", icon: "◈" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex flex-col items-center gap-2 rounded-2xl border border-[#E5E0D8] bg-white p-4 text-center hover:border-[#C9A96E]/40 transition-all">
                  <span className="text-xl text-[#C9A96E]">{l.icon}</span>
                  <span className="text-[10px] font-medium text-[#6E6860]">{l.label}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── Tab: Profil ── */}
        {activeTab === "profile" && (
          <>
            {/* Images */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Bilder</p>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Profilbild</p>
                  <div className="mb-3 flex items-center gap-4">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#E5E0D8] text-[#C5C0B8] text-2xl">◎</div>
                    )}
                    <div>
                      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingAvatar}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAvatarEditorFile(f); e.target.value = ""; } }}
                        className="block w-full text-xs text-[#6E6860]" />
                      {uploadingAvatar && <p className="mt-1 text-[10px] text-[#9E9890]">Hochladen…</p>}
                      {avatarEditorFile && (
                        <ImageEditor file={avatarEditorFile} aspectRatio={1} outputSize={400} title="Profilbild zuschneiden"
                          onCancel={() => setAvatarEditorFile(null)}
                          onConfirm={(blob) => { setAvatarEditorFile(null); handleAvatarUpload(new File([blob], "avatar.jpg", { type: "image/jpeg" })); }} />
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Banner</p>
                  {profile.banner_url ? (
                    <img src={profile.banner_url} alt="Banner" className="mb-3 h-24 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="mb-3 flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-[#E5E0D8] text-xs text-[#C5C0B8]">Kein Banner</div>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingBanner}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { setBannerEditorFile(f); e.target.value = ""; } }}
                    className="block w-full text-xs text-[#6E6860]" />
                  {uploadingBanner && <p className="mt-1 text-[10px] text-[#9E9890]">Hochladen…</p>}
                  {bannerEditorFile && (
                    <ImageEditor file={bannerEditorFile} aspectRatio={16 / 9} outputSize={1200} title="Banner zuschneiden"
                      onCancel={() => setBannerEditorFile(null)}
                      onConfirm={(blob) => { setBannerEditorFile(null); handleBannerUpload(new File([blob], "banner.jpg", { type: "image/jpeg" })); }} />
                  )}
                </div>
              </div>
            </div>

            {/* Profil-Daten */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Profil-Informationen</p>
              <div className="space-y-4">
                <InputField label="Username">
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} placeholder="deinname" />
                </InputField>
                <InputField label="Anzeigename">
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} placeholder="Dein Name" />
                </InputField>
                <InputField label="Bio">
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                    className="w-full resize-none rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                    placeholder="Erzähl etwas über dich…" />
                </InputField>
              </div>
            </div>

            {/* Social */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Social Media</p>
              <p className="mb-4 text-xs text-[#9E9890]">Eingabe als @handle oder vollständige URL.</p>
              <div className="space-y-4">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <InputField key={platform.key} label={platform.label}>
                    <input type="text" value={socialLinks[platform.key] ?? ""} placeholder={platform.placeholder}
                      onChange={(e) => setSocialLinks((prev) => ({ ...prev, [platform.key]: e.target.value }))}
                      className={inputCls} />
                  </InputField>
                ))}
              </div>
            </div>

            <SaveBar onSave={saveProfile} message={message} />
          </>
        )}

        {/* ── Tab: Einstellungen ── */}
        {activeTab === "settings" && (
          <>
            {/* Lieferadresse */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Lieferadresse</p>
              <p className="mb-4 text-xs text-[#9E9890]">Wird beim Checkout vorausgefüllt.</p>
              <div className="space-y-4">
                <InputField label="Telefon">
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 …" className={inputCls} />
                </InputField>
                <InputField label="Straße + Hausnummer">
                  <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Musterstraße 1" className={inputCls} />
                </InputField>
                <InputField label="Adresszeile 2 (optional)">
                  <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apartment, Etage …" className={inputCls} />
                </InputField>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="PLZ">
                    <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="12345" className={inputCls} />
                  </InputField>
                  <InputField label="Stadt">
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Berlin" className={inputCls} />
                  </InputField>
                </div>
                <InputField label="Land">
                  <select value={country} onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm text-[#6E6860] focus:border-[#0A0A0A] focus:outline-none transition-colors">
                    {[["DE","Deutschland"],["AT","Österreich"],["CH","Schweiz"],["FR","Frankreich"],["NL","Niederlande"],["BE","Belgien"],["LU","Luxemburg"],["IT","Italien"],["ES","Spanien"],["GB","Vereinigtes Königreich"],["US","USA"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </InputField>
                <InputField label="Geburtsdatum">
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputCls} />
                </InputField>
              </div>
            </div>

            {/* Duftpräferenzen */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Duftpräferenzen</p>
              <p className="mb-4 text-xs text-[#9E9890]">Beeinflusst deine Empfehlungen im Discover-Feed.</p>
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Bevorzugte Noten</p>
                <div className="flex flex-wrap gap-2">
                  {["Blumig","Holzig","Zitrus","Orientalisch","Frisch","Moschusartig","Fruchtig","Würzig","Aquatisch","Pudrig"].map((note) => (
                    <button key={note} type="button"
                      onClick={() => setFragranceNotes((prev) => prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note])}
                      className={fragranceNotes.includes(note)
                        ? "rounded-full border border-[#0A0A0A] bg-[#0A0A0A] px-3 py-1.5 text-[11px] font-medium text-white"
                        : "rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[11px] font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-all"}>
                      {note}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#9E9890]">Bevorzugte Intensität</p>
                <div className="flex gap-2">
                  {([["light","Leicht"],["moderate","Mittel"],["strong","Intensiv"]] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setFragranceIntensity(fragranceIntensity === val ? "" : val)}
                      className={fragranceIntensity === val
                        ? "rounded-full border border-[#0A0A0A] bg-[#0A0A0A] px-3 py-1.5 text-[11px] font-medium text-white"
                        : "rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[11px] font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-all"}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Newsletter */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Kommunikation</p>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={newsletterOptIn} onChange={(e) => setNewsletterOptIn(e.target.checked)} className="h-4 w-4 rounded" />
                <span className="text-sm text-[#6E6860]">Newsletter — Neue Düfte, Creator-Highlights und Angebote</span>
              </label>
            </div>

            {/* Account & Sicherheit */}
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5 space-y-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Account & Sicherheit</p>

              {/* Email ändern */}
              <div>
                <p className="mb-1 text-xs font-medium text-[#0A0A0A]">E-Mail-Adresse ändern</p>
                <p className="mb-3 text-[11px] text-[#9E9890]">Aktuelle E-Mail: <span className="font-medium text-[#0A0A0A]">{profile.email}</span></p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Neue E-Mail-Adresse"
                    className={inputCls + " flex-1"}
                  />
                  <button
                    onClick={changeEmail}
                    disabled={savingEmail || !newEmail.trim()}
                    className="shrink-0 rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-medium uppercase tracking-wider text-white disabled:opacity-40 transition-all active:scale-95"
                  >
                    {savingEmail ? "…" : "Ändern"}
                  </button>
                </div>
              </div>

              {/* Passwort ändern */}
              <div>
                <p className="mb-3 text-xs font-medium text-[#0A0A0A]">Passwort ändern</p>
                <div className="space-y-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Neues Passwort (mind. 8 Zeichen)"
                    className={inputCls}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Passwort bestätigen"
                    className={inputCls}
                  />
                  <button
                    onClick={changePassword}
                    disabled={savingPassword || !newPassword}
                    className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#0A0A0A] hover:border-[#0A0A0A] disabled:opacity-40 transition-all"
                  >
                    {savingPassword ? "Wird gespeichert…" : "Passwort speichern"}
                  </button>
                </div>
              </div>

              {/* Security feedback */}
              {securityMessage && (
                <div className={`rounded-xl px-4 py-3 text-sm ${securityMessage.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {securityMessage.text}
                </div>
              )}

              {/* Abmelden + Konto löschen */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#F0EDE8]">
                <button
                  onClick={handleSignOut}
                  className="w-full rounded-xl border border-[#E5E0D8] py-2.5 text-xs font-medium uppercase tracking-wider text-[#6E6860] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-all"
                >
                  Abmelden
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deletingAccount}
                  className="w-full rounded-xl border border-red-200 py-2.5 text-xs font-medium uppercase tracking-wider text-red-500 hover:bg-red-50 disabled:opacity-40 transition-all"
                >
                  {deletingAccount ? "Wird gelöscht…" : "Konto löschen (DSGVO Art. 17)"}
                </button>
              </div>
            </div>

            <SaveBar onSave={saveProfile} message={message} />
          </>
        )}

        {/* ── Tab: Creator ── */}
        {activeTab === "creator" && (
          <>
            {isCreator ? (
              <>
                <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-full bg-[#0A0A0A] px-3 py-1 text-xs font-medium text-white">◆ Creator</span>
                    <p className="text-sm text-[#6E6860]">Du bist als Creator freigeschaltet.</p>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[#9E9890]">Provision</dt>
                      <dd className="font-semibold text-[#0A0A0A]">{profile.commission_percent ?? 0}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#9E9890]">Öffentliche Slots</dt>
                      <dd className="font-semibold text-[#0A0A0A]">{profile.public_slots ?? 0}</dd>
                    </div>
                  </dl>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/my-fragrances" className="flex flex-col gap-1 rounded-2xl border border-[#E5E0D8] bg-white p-4 hover:border-[#C9A96E]/40 transition-all">
                    <span className="text-[#C9A96E]">◉</span>
                    <p className="text-sm font-medium text-[#0A0A0A]">Meine Düfte</p>
                    <p className="text-[10px] text-[#9E9890]">Verwalte deine Kreationen</p>
                  </Link>
                  <Link href="/create" className="flex flex-col gap-1 rounded-2xl border border-[#E5E0D8] bg-white p-4 hover:border-[#C9A96E]/40 transition-all">
                    <span className="text-[#C9A96E]">✦</span>
                    <p className="text-sm font-medium text-[#0A0A0A]">Neuen Duft kreieren</p>
                    <p className="text-[10px] text-[#9E9890]">Jetzt starten</p>
                  </Link>
                </div>
              </>
            ) : applicationStatus === "pending" ? (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                <p className="font-medium text-yellow-800">Bewerbung wird geprüft</p>
                <p className="mt-1 text-sm text-yellow-700">Wir melden uns, sobald deine Bewerbung bearbeitet wurde.</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-[#0A0A0A] p-6">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-2">Creator Programm</p>
                  <h2 className="text-xl font-bold text-white mb-2">Werde Creator</h2>
                  <p className="text-sm text-white/50">Veröffentliche eigene Düfte, baue deine Marke auf und verdiene Provision auf jeden Verkauf.</p>
                  <Link href="/apply" className="mt-4 inline-block text-xs text-[#C9A96E] hover:underline">Mehr erfahren →</Link>
                </div>

                {applicationStatus === "rejected" && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">Bewerbung abgelehnt.</p>
                    {applicationNote && <p className="mt-1 text-xs text-red-700">{applicationNote}</p>}
                  </div>
                )}

                <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Bewerbung einreichen</p>
                  <div className="space-y-3">
                    <textarea value={applicationMessage} onChange={(e) => setApplicationMessage(e.target.value)} rows={4}
                      placeholder="Warum möchtest du Creator werden? Was planst du zu verkaufen?"
                      className="w-full resize-none rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors" />
                    <input type="url" value={applicationPortfolio} onChange={(e) => setApplicationPortfolio(e.target.value)}
                      placeholder="Portfolio / Instagram / Website (optional)"
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors" />
                    <button onClick={submitApplication} disabled={submittingApplication}
                      className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40">
                      {submittingApplication ? "Wird eingereicht…" : applicationStatus === "rejected" ? "Erneut bewerben" : "Als Creator bewerben"}
                    </button>
                  </div>
                  {message && <p className="mt-3 text-sm text-[#6E6860]">{message}</p>}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </main>
  );
}

function SaveBar({ onSave, message }: { onSave: () => void; message: string }) {
  return (
    <div className="sticky bottom-4">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E5E0D8] bg-white px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        {message ? (
          <p className="text-sm text-[#6E6860]">{message}</p>
        ) : (
          <p className="text-xs text-[#C5C0B8]">Änderungen werden nicht automatisch gespeichert.</p>
        )}
        <button onClick={onSave}
          className="shrink-0 rounded-full bg-[#0A0A0A] px-5 py-2 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all">
          Speichern
        </button>
      </div>
    </div>
  );
}
