"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/profile";

async function handleGoogleLogin() {
  const next = new URLSearchParams(window.location.search).get("next");
  const callbackUrl = next
    ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${window.location.origin}/auth/callback`;
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (code) {
      setReferralCode(code.trim().toLowerCase());
      setMode("signup");
    }
  }, []);

  function switchMode(next: "login" | "signup") {
    if (next === mode || animating) return;
    setAnimating(true);
    setVisible(false);
    setTimeout(() => {
      setMode(next);
      setMessage("");
      setVisible(true);
      setAnimating(false);
    }, 180);
  }

  async function handleSubmit() {
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
          setMessageType("error");
          setMessage(error.message);
          setLoading(false);
          return;
        }

        await ensureProfile();

        if (referralCode.trim() && data.user?.id) {
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("id, commission_percent")
            .eq("referral_code", referralCode.trim().toLowerCase())
            .maybeSingle();

          if (creatorProfile && creatorProfile.id !== data.user.id) {
            await supabase.from("referral_attributions").insert({
              referred_user_id: data.user.id,
              creator_id: creatorProfile.id,
              referral_code: referralCode.trim(),
              source: "signup",
              lifetime_commission_percent: 3,
            });

            await supabase.from("notifications").insert({
              user_id: creatorProfile.id,
              type: "new_follower",
              data: {
                referred_user_id: data.user.id,
                source: "referral_signup",
              },
            });
          }
        }

        const signupNext = new URLSearchParams(window.location.search).get("next");
        router.push(signupNext ? `/onboarding?next=${encodeURIComponent(signupNext)}` : "/onboarding");
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessageType("error");
          setMessage(error.message);
          setLoading(false);
          return;
        }

        const profile = await ensureProfile();

        if (!profile) {
          setMessageType("error");
          setMessage("Profil konnte nicht geladen werden. Bitte erneut versuchen.");
          setLoading(false);
          return;
        }

        const next = new URLSearchParams(window.location.search).get("next");

        const INTERNAL_ROLES = ["admin", "production", "marketing", "supporter"];
        const isInternal = INTERNAL_ROLES.includes(profile.role);

        if (!profile.onboarding_completed && !isInternal) {
          const onboardingTarget = next
            ? `/onboarding?next=${encodeURIComponent(next)}`
            : "/onboarding";
          router.push(onboardingTarget);
          return;
        }

        const ROLE_HOME: Record<string, string> = {
          admin: "/admin",
          production: "/production",
          marketing: "/marketing",
          supporter: "/support",
        };
        const roleHome = profile?.role ? (ROLE_HOME[profile.role] ?? null) : null;

        router.push(next && next.startsWith("/") ? next : roleHome ?? "/discover");
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Unerwarteter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">
          {mode === "signup" ? "Account erstellen" : "Einloggen"}
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          {referralCode && (
            <div className="mb-4 rounded-2xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
              Du wurdest von einem Creator eingeladen (Code: {referralCode})
            </div>
          )}

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => switchMode("signup")}
                className={
                  mode === "signup"
                    ? "rounded-full border border-[#0A0A0A] bg-[#0A0A0A] px-3 py-1.5 text-[11px] font-medium text-white transition-all duration-200"
                    : "rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[11px] font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-all duration-200"
                }
              >
                Registrieren
              </button>

              <button
                onClick={() => switchMode("login")}
                className={
                  mode === "login"
                    ? "rounded-full border border-[#0A0A0A] bg-[#0A0A0A] px-3 py-1.5 text-[11px] font-medium text-white transition-all duration-200"
                    : "rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[11px] font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-all duration-200"
                }
              >
                Einloggen
              </button>
            </div>

            <div
              className="space-y-4 transition-all duration-180"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(6px)",
                transitionProperty: "opacity, transform",
                transitionDuration: "180ms",
                transitionTimingFunction: "ease",
              }}
            >
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#B09050] focus:outline-none focus:ring-2 focus:ring-[#B09050]/30 transition-colors"
                  placeholder="du@email.de"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">
                  Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 pr-11 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#B09050] focus:outline-none focus:ring-2 focus:ring-[#B09050]/30 transition-colors"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9890] hover:text-[#6E6860] transition-colors"
                    aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">
                    Referral-Code (optional)
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) =>
                      setReferralCode(e.target.value.trim().toLowerCase())
                    }
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#B09050] focus:outline-none focus:ring-2 focus:ring-[#B09050]/30 transition-colors"
                    placeholder="z.B. abc12345"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-60"
            >
              {loading && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading
                ? "Bitte warten…"
                : mode === "signup"
                  ? "Registrieren"
                  : "Einloggen"}
            </button>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E5E0D8]" />
              <span className="text-[10px] uppercase tracking-widest text-[#C5C0B8]">oder</span>
              <div className="flex-1 h-px bg-[#E5E0D8]" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mt-3 w-full flex items-center justify-center gap-3 rounded-full border border-[#E5E0D8] bg-white px-5 py-2.5 text-xs font-medium text-[#3A3530] hover:border-[#0A0A0A] active:scale-95 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Mit Google {mode === "signup" ? "registrieren" : "einloggen"}
            </button>

            {message && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm border animate-[fadeIn_0.2s_ease] ${
                  messageType === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
                style={{ animation: "fadeSlideIn 0.2s ease" }}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
