"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/tracking";

const SCENT_ACCORDS = [
  { key: "vanilla_amber", label: "Vanille & Ambra", desc: "Warm, süßlich, sinnlich" },
  { key: "fresh_citrus", label: "Zitrusfrüchte", desc: "Belebend, hell, leicht" },
  { key: "rose_floral", label: "Rosen & Blüten", desc: "Romantisch, blumig, klassisch" },
  { key: "sandalwood_cedar", label: "Sandelholz & Zeder", desc: "Cremig, warm, holzig" },
  { key: "sea_aqua", label: "Meer & Aqua", desc: "Frisch, sauber, lebendig" },
  { key: "musk_skin", label: "Moschus & Haut", desc: "Nah, vertraut, sinnlich" },
  { key: "oud_smoke", label: "Oud & Rauch", desc: "Tief, dunkel, geheimnisvoll" },
  { key: "spice_pepper", label: "Gewürze & Pfeffer", desc: "Scharf, warm, markant" },
  { key: "bergamot_tea", label: "Bergamotte & Tee", desc: "Frisch, elegant, luftig" },
  { key: "patchouli_earth", label: "Patchouli & Erde", desc: "Geerdet, herb, kraftvoll" },
  { key: "iris_powder", label: "Iris & Puder", desc: "Zart, pudrig, nostalgisch" },
  { key: "coffee_chocolate", label: "Kaffee & Schokolade", desc: "Reich, warm, verführerisch" },
];

const FAMILIES = [
  { key: "floral", label: "Blumig", emoji: "🌸" },
  { key: "woody", label: "Holzig", emoji: "🌳" },
  { key: "oriental", label: "Orientalisch", emoji: "✨" },
  { key: "fresh", label: "Frisch", emoji: "💧" },
  { key: "citrus", label: "Zitrus", emoji: "🍋" },
  { key: "powdery", label: "Pudrig", emoji: "☁️" },
  { key: "green", label: "Grün / Krautig", emoji: "🌿" },
  { key: "gourmand", label: "Gourmand / Süß", emoji: "🍫" },
  { key: "leather", label: "Ledrig", emoji: "🪵" },
  { key: "musk", label: "Moschusartig", emoji: "🕯️" },
];

const OCCASIONS = [
  { key: "everyday", label: "Alltag", emoji: "☀️" },
  { key: "office", label: "Büro", emoji: "💼" },
  { key: "evening", label: "Abends", emoji: "🌙" },
  { key: "sport", label: "Sport", emoji: "🏃" },
  { key: "special", label: "Besonderer Anlass", emoji: "🎉" },
];

const INTENSITIES = [
  { key: "light", label: "Leicht", desc: "Dezent, für den Alltag" },
  { key: "moderate", label: "Mittel", desc: "Ausgewogen, vielseitig" },
  { key: "strong", label: "Intensiv", desc: "Markant, bleibt in Erinnerung" },
] as const;

const PRICE_OPTIONS = [
  { label: "Unter 50 €", value: 5000 },
  { label: "Unter 100 €", value: 10000 },
  { label: "Unter 200 €", value: 20000 },
  { label: "Kein Limit", value: 0 },
];

const MOODS = [
  { id: "clean", label: "Clean", desc: "Frisch, sauber, klar" },
  { id: "sexy", label: "Sexy", desc: "Sinnlich, verführerisch" },
  { id: "fresh", label: "Fresh", desc: "Lebendig, energetisch" },
  { id: "mysterious", label: "Mysterious", desc: "Dunkel, geheimnisvoll" },
  { id: "cozy", label: "Cozy", desc: "Warm, gemütlich, vertraut" },
  { id: "energetic", label: "Energetic", desc: "Aktiv, motivierend" },
];

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [stepVisible, setStepVisible] = useState(true);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");

  const [selectedAccords, setSelectedAccords] = useState<string[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<"light" | "moderate" | "strong" | null>(null);
  const [priceMax, setPriceMax] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth");
        return;
      }
      setUserId(user.id);
    });
  }, [router]);

  function navigateTo(nextStep: number) {
    const dir = nextStep > step ? "forward" : "back";
    setStepDirection(dir);
    setStepVisible(false);
    setTimeout(() => {
      setStep(nextStep);
      setStepVisible(true);
    }, 200);
  }

  function toggleAccord(key: string) {
    setSelectedAccords((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function toggleFamily(key: string) {
    setSelectedFamilies((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function toggleOccasion(key: string) {
    setSelectedOccasions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function toggleMood(id: string) {
    setSelectedMoods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  async function finish() {
    if (!userId) return;
    setSaving(true);

    const preferences = {
      accords: selectedAccords,
      families: selectedFamilies,
      occasions: selectedOccasions,
      moods: selectedMoods,
      intensity: intensity ?? undefined,
      price_max: priceMax || undefined,
    };

    await supabase
      .from("profiles")
      .update({
        fragrance_preferences: preferences,
        onboarding_completed: true,
      })
      .eq("id", userId);

    await trackEvent({
      eventType: "onboarding_complete",
      metadata: {
        accords: selectedAccords,
        families: selectedFamilies,
        occasions: selectedOccasions,
        intensity,
        price_max: priceMax || null,
      },
    });

    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && next.startsWith("/") ? next : "/discover");
  }

  const slideOffset = stepVisible
    ? "0px"
    : stepDirection === "forward"
      ? "-12px"
      : "12px";

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-6">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold text-white">Schritt {step}</h1>
          <span className="text-sm text-white/30">von {TOTAL_STEPS}</span>
        </div>

        <div className="mt-5 flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full overflow-hidden bg-white/20"
            >
              <div
                className="h-full rounded-full bg-white transition-all duration-500 ease-out"
                style={{ width: i < step ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 py-6">
        <div
          style={{
            opacity: stepVisible ? 1 : 0,
            transform: `translateX(${slideOffset})`,
            transition: "opacity 200ms ease, transform 200ms ease",
          }}
        >
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-[#0A0A0A]">Welche Düfte liebst du?</h2>
              <p className="mt-2 text-sm text-[#6E6860]">
                Wähle die Duftnoten, die dich ansprechen. Je mehr du auswählst, desto besser werden deine Empfehlungen.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {SCENT_ACCORDS.map((accord) => (
                  <button
                    key={accord.key}
                    type="button"
                    onClick={() => toggleAccord(accord.key)}
                    className={`rounded-2xl border p-4 text-left transition-all duration-150 active:scale-95 ${
                      selectedAccords.includes(accord.key)
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#B09050]/60"
                    }`}
                  >
                    <p className="text-sm font-semibold">{accord.label}</p>
                    <p className={`mt-0.5 text-[11px] ${selectedAccords.includes(accord.key) ? "text-white/60" : "text-[#9E9890]"}`}>
                      {accord.desc}
                    </p>
                  </button>
                ))}
              </div>

              {selectedAccords.length > 0 && (
                <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">
                  {selectedAccords.length} ausgewählt
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-[#0A0A0A]">Welche Duftstile magst du?</h2>
              <p className="mt-2 text-sm text-[#6E6860]">
                Mehrfachauswahl möglich.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FAMILIES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleFamily(f.key)}
                    className={`rounded-2xl border p-4 text-left transition-all duration-150 active:scale-95 ${
                      selectedFamilies.includes(f.key)
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#B09050]/60"
                    }`}
                  >
                    <span className="text-xl">{f.emoji}</span>
                    <p className="mt-1 text-sm font-medium">{f.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-[#0A0A0A]">Wofür trägst du Parfüm?</h2>
              <p className="mt-2 text-sm text-[#6E6860]">Mehrfachauswahl möglich.</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => toggleOccasion(o.key)}
                    className={`transition-all duration-150 active:scale-95 ${
                      selectedOccasions.includes(o.key)
                        ? "rounded-full border border-[#0A0A0A] bg-[#0A0A0A] px-3 py-1.5 text-[11px] font-medium text-white"
                        : "rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[11px] font-medium text-[#6E6860] hover:border-[#B09050]/60"
                    }`}
                  >
                    {o.emoji} {o.label}
                  </button>
                ))}
              </div>

              <p className="mt-8 mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Intensität</p>
              <div className="space-y-2">
                {INTENSITIES.map((i) => (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => setIntensity(i.key)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-150 active:scale-95 ${
                      intensity === i.key
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#B09050]/60"
                    }`}
                  >
                    <p className="text-sm font-medium">{i.label}</p>
                    <p className={`text-xs mt-0.5 ${intensity === i.key ? "text-white/60" : "text-[#9E9890]"}`}>
                      {i.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-[#0A0A0A]">Welche Stimmung soll dein Duft vermitteln?</h2>
              <p className="mt-2 text-sm text-[#6E6860]">Mehrfachauswahl möglich.</p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => toggleMood(mood.id)}
                    className={`rounded-2xl border p-4 text-left transition-all duration-150 active:scale-95 ${
                      selectedMoods.includes(mood.id)
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#B09050]/60"
                    }`}
                  >
                    <p className="text-sm font-semibold">{mood.label}</p>
                    <p className={`mt-0.5 text-[11px] ${selectedMoods.includes(mood.id) ? "text-white/60" : "text-[#9E9890]"}`}>
                      {mood.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-[#0A0A0A]">Was ist dein Budget?</h2>
              <p className="mt-2 text-sm text-[#6E6860]">
                Wir zeigen dir Düfte in deiner Preisklasse zuerst.
              </p>

              <div className="mt-6 space-y-2">
                {PRICE_OPTIONS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPriceMax(p.value)}
                    className={`w-full rounded-2xl border p-4 text-left text-sm font-medium transition-all duration-150 active:scale-95 ${
                      priceMax === p.value
                        ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                        : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#B09050]/60"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <p className="text-sm font-medium text-[#0A0A0A]">Fast fertig!</p>
                <p className="mt-1 text-sm text-[#6E6860]">
                  Deine Präferenzen werden gespeichert und helfen uns, den Feed und zukünftige
                  Empfehlungen auf dich anzupassen. Du kannst sie jederzeit in deinem Profil ändern.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => navigateTo(step - 1)}
              className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-all active:scale-95"
            >
              ← Zurück
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(window.location.search).get("next");
                router.push(next && next.startsWith("/") ? next : "/discover");
              }}
              className="text-xs text-[#9E9890] underline underline-offset-2 hover:text-[#6E6860] transition-colors"
            >
              Überspringen
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => navigateTo(step + 1)}
              className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all hover:bg-[#1A1A1A]"
            >
              Weiter →
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-60 hover:bg-[#1A1A1A]"
            >
              {saving && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {saving ? "Wird gespeichert…" : "Fertig & Discover öffnen"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
