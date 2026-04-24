"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AnimatedFlacon from "@/components/AnimatedFlacon";
import ScentParticles from "@/components/ScentParticles";
import ScrollReveal from "@/components/ScrollReveal";
import TiltCard from "@/components/TiltCard";

type Fragrance = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  size_ml: number | null;
  category: string | null;
  image_url: string | null;
  owner_id: string;
};

type Creator = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  accordRequired: string | null;
  prizeAmountCents: number;
  prizeDescription: string | null;
  logoUrl: string | null;
  endDate: string;
  startDate: string;
};

const MARQUEE_TEXT =
  "Handgefertigt · Individuell · Limitiert · Creator-Exklusiv · Nachhaltig · Personalisierbar · ";

const VALUE_PROPS = [
  {
    icon: "◈",
    title: "Unique",
    desc: "Jedes Parfüm ist ein Original. Kreiert von unabhängigen Duft-Creatoren.",
    gradient: "from-[#C9A96E]/20 to-transparent",
  },
  {
    icon: "◉",
    title: "Personalisiert",
    desc: "KI-gestützte Empfehlungen basierend auf deinen Vorlieben und Stimmungen.",
    gradient: "from-[#A8803D]/20 to-transparent",
  },
  {
    icon: "✦",
    title: "Premium",
    desc: "Hochwertige Zutaten, professionell abgefüllt. Direkt an deine Tür.",
    gradient: "from-[#E8C99A]/20 to-transparent",
  },
];

const TRUST_STATS = [
  { value: "500+", label: "Handgefertigte Düfte" },
  { value: "80+",  label: "Unabhängige Creator" },
  { value: "12k+", label: "Bestellungen" },
  { value: "4.9",  label: "Ø Bewertung" },
];

const BENEFITS = [
  "70% Provision auf jeden Verkauf",
  "Eigene Creator-Seite",
  "Fan-Abos & physische Produkte",
  "Stripe-Direktauszahlung",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Entdecken",
    desc: "Stöbere durch hunderte handgefertigte Düfte von unabhängigen Creatoren.",
    icon: "◎",
  },
  {
    step: "02",
    title: "Personalisieren",
    desc: "Unsere KI lernt deinen Geschmack und empfiehlt Düfte die zu dir passen.",
    icon: "✦",
  },
  {
    step: "03",
    title: "Bestellen",
    desc: "Sicher bezahlen, direkt an deine Tür liefern lassen — jederzeit kündbar.",
    icon: "◈",
  },
];

function FragranceSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white border border-[#E5E0D8]">
      <div className="h-56 skeleton" />
      <div className="p-5 space-y-3">
        <div className="h-4 skeleton rounded-full w-3/4" />
        <div className="h-3 skeleton rounded-full w-1/2" />
        <div className="h-3 skeleton rounded-full w-1/3" />
      </div>
    </div>
  );
}

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-black/40 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90">
      {label}
    </span>
  );
}

export default function Home() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [loadingFragrances, setLoadingFragrances] = useState(true);
  const [loadingCreators, setLoadingCreators] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [fragRes, creatRes, challengeRes] = await Promise.all([
        supabase
          .from("fragrances")
          .select("id, name, description, price_cents, size_ml, category, image_url, owner_id")
          .eq("is_public", true)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .eq("role", "creator")
          .limit(4),
        supabase
          .from("challenges")
          .select("id, title, description, accord_required, prize_amount_cents, prize_description, logo_url, start_date, end_date")
          .eq("status", "active")
          .order("end_date", { ascending: true }),
      ]);

      setFragrances(fragRes.data ?? []);
      setLoadingFragrances(false);
      setCreators(creatRes.data ?? []);
      setLoadingCreators(false);
      setActiveChallenges(
        (challengeRes.data ?? []).map((c: {
          id: string; title: string; description: string | null;
          accord_required: string | null; prize_amount_cents: number;
          prize_description: string | null; logo_url: string | null;
          start_date: string; end_date: string;
        }) => ({
          id: c.id, title: c.title, description: c.description,
          accordRequired: c.accord_required, prizeAmountCents: c.prize_amount_cents,
          prizeDescription: c.prize_description, logoUrl: c.logo_url,
          startDate: c.start_date, endDate: c.end_date,
        }))
      );
    }
    fetchData();
  }, []);

  const marqueeContent = MARQUEE_TEXT.repeat(3);

  function daysLeft(endDate: string) {
    return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
  }

  return (
    <main className="bg-[#FAFAF8] overflow-x-hidden">
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center overflow-hidden px-5 pt-20">
        {/* Animated hero background shimmer */}
        <div
          className="pointer-events-none absolute inset-0 animate-hero-shimmer"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% 55%, rgba(201,169,110,0.18) 0%, transparent 65%)" }}
        />
        {/* Secondary glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 50% 50% at 20% 80%, rgba(168,128,61,0.06) 0%, transparent 60%)" }}
        />

        {/* Scent particles */}
        <ScentParticles count={18} className="z-0" />

        {/* Desktop: animated flacon right side */}
        <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-[55%] lg:block xl:right-20 z-10">
          <div className="animate-float-slow">
            <AnimatedFlacon size={200} fillPercent={68} />
          </div>
        </div>

        {/* Mobile: small flacon above heading */}
        <div className="pointer-events-none mb-6 block lg:hidden z-10 animate-float-slow">
          <AnimatedFlacon size={90} fillPercent={68} />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl text-center lg:text-left lg:mr-[260px]">
          <p className="animate-fade-up mb-6 text-[10px] uppercase tracking-[0.4em] text-white/30"
            style={{ animationDelay: "0.1s" }}>
            Fragrance OS — Luxury × Tech × Social
          </p>

          <h1 className="animate-fade-up text-5xl font-bold leading-tight text-white md:text-7xl lg:text-[80px]"
            style={{ animationDelay: "0.25s" }}>
            Der Duft,
            <br />
            der deine{" "}
            <span className="shimmer-gold">Geschichte</span>
            <br />
            erzählt.
          </h1>

          <p className="animate-fade-up mt-6 max-w-xl text-lg text-white/55 lg:max-w-lg"
            style={{ animationDelay: "0.45s" }}>
            Entdecke handgefertigte Düfte von unabhängigen Creatoren.
            Oder kreiere deinen eigenen.
          </p>

          <div className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
            style={{ animationDelay: "0.6s" }}>
            <Link
              href="/discover"
              className="magnetic rounded-full bg-white px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-[#0A0A0A] transition-transform duration-150 hover:bg-[#C9A96E] hover:scale-105 active:scale-95 animate-glow-gold"
            >
              Jetzt entdecken
            </Link>
            <Link
              href="/create"
              className="magnetic rounded-full border border-white/30 px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-white/80 transition-transform duration-150 hover:border-white hover:text-white hover:scale-105 active:scale-95"
            >
              Duft erstellen
            </Link>
          </div>
        </div>

        {/* Trust micro-stats */}
        <div className="animate-fade-up absolute bottom-20 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8 z-10"
          style={{ animationDelay: "0.8s" }}>
          {TRUST_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold text-[#C9A96E]">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/30">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 z-10">
          <span className="text-[10px] uppercase tracking-[0.3em]">Entdecken</span>
          <svg
            className="animate-chevron"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ─── MARQUEE ──────────────────────────────────────────────────── */}
      <section className="bg-[#C9A96E] overflow-hidden py-3.5">
        <div className="flex whitespace-nowrap animate-marquee">
          {[marqueeContent, marqueeContent].map((text, i) => (
            <span key={i} className="shrink-0 text-[11px] font-bold uppercase tracking-[0.25em] text-[#0A0A0A]">
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="bg-white px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-12 text-center">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#9E9890]">Wie es funktioniert</p>
              <h2 className="text-3xl font-bold text-[#0A0A0A] md:text-4xl">In drei Schritten zum Lieblingsduft.</h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <ScrollReveal key={step.step} animation="up" delay={i * 120}>
                <div className="group relative border-gradient rounded-3xl bg-[#FAFAF8] p-8 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300">
                  <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.3em] text-[#C9A96E]">{step.step}</span>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0A0A] text-2xl text-[#C9A96E] transition-transform duration-300 group-hover:scale-110">
                    {step.icon}
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-[#0A0A0A]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[#9E9890]">{step.desc}</p>
                  {/* Connector line */}
                  {i < 2 && (
                    <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-4 md:block">
                      <div className="h-px w-8 bg-gradient-to-r from-[#C9A96E]/50 to-transparent" />
                    </div>
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED FRAGRANCES ──────────────────────────────────────── */}
      <section className="bg-[#FAFAF8] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-10">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#9E9890]">Frisch eingetroffen</p>
              <h2 className="text-3xl font-bold text-[#0A0A0A] md:text-4xl">Aktuelle Drops</h2>
              <p className="mt-2 text-[#9E9890]">Handgefertigte Düfte, direkt von unseren Creatoren.</p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loadingFragrances
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={`stagger-${i + 1}`}>
                    <FragranceSkeleton />
                  </div>
                ))
              : fragrances.length > 0
              ? fragrances.map((frag, i) => (
                  <ScrollReveal key={frag.id} animation="up" delay={i * 80}>
                    <TiltCard className="h-full rounded-3xl overflow-hidden bg-white border border-[#E5E0D8] shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300">
                      {/* Image area */}
                      <div className="relative h-60 overflow-hidden bg-[#F5F0EA]">
                        {frag.image_url ? (
                          <Image
                            src={frag.image_url}
                            alt={frag.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center gap-3"
                            style={{ background: "linear-gradient(135deg, #F5F0EA 0%, #EDE8E0 50%, #E5DDD2 100%)" }}>
                            {/* Mini flacon placeholder */}
                            <AnimatedFlacon size={60} fillPercent={50 + (i * 7) % 40} animated={false} />
                          </div>
                        )}
                        {frag.category && (
                          <div className="absolute top-3 left-3">
                            <CategoryPill label={frag.category} />
                          </div>
                        )}
                        {/* Shine overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
                      </div>

                      {/* Card body */}
                      <div className="p-5">
                        <h3 className="font-bold text-[#0A0A0A] text-base leading-snug">{frag.name}</h3>
                        {frag.description && (
                          <p className="mt-1 text-sm text-[#9E9890] line-clamp-2">{frag.description}</p>
                        )}
                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <p className="text-lg font-bold text-[#0A0A0A]">
                              {(frag.price_cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                            </p>
                            {frag.size_ml && <p className="text-xs text-[#9E9890]">{frag.size_ml} ml</p>}
                          </div>
                          <Link
                            href={`/fragrance/${frag.id}`}
                            className="rounded-full bg-[#0A0A0A] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#C9A96E] transition-all active:scale-95"
                          >
                            Ansehen
                          </Link>
                        </div>
                      </div>
                    </TiltCard>
                  </ScrollReveal>
                ))
              : (
                <div className="col-span-full py-16 text-center text-[#9E9890]">
                  <AnimatedFlacon size={80} fillPercent={20} className="mx-auto mb-4 opacity-40" />
                  <p className="text-sm">Noch keine Düfte verfügbar. Bald mehr!</p>
                </div>
              )}
          </div>

          {fragrances.length > 0 && (
            <ScrollReveal className="mt-10 text-center">
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-full border border-[#E5E0D8] bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#0A0A0A] transition-all hover:border-[#C9A96E] hover:shadow-premium"
              >
                Alle Düfte entdecken →
              </Link>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* ─── TRUST BADGES ─────────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {TRUST_STATS.map((stat, i) => (
              <ScrollReveal key={stat.label} animation="scale" delay={i * 80}>
                <div className="text-center">
                  <p className="text-4xl font-bold text-[#C9A96E] md:text-5xl">{stat.value}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-widest text-white/40">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VALUE PROPS ──────────────────────────────────────────────── */}
      <section className="bg-[#FAFAF8] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-12 text-center">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#9E9890]">Warum Fragrance OS</p>
              <h2 className="text-3xl font-bold text-[#0A0A0A] md:text-4xl">Mehr als ein Parfüm-Shop.</h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {VALUE_PROPS.map((vp, i) => (
              <ScrollReveal key={vp.title} animation="up" delay={i * 100}>
                <TiltCard className={`h-full rounded-3xl bg-gradient-to-br ${vp.gradient} border border-[#E5E0D8] bg-white p-8 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300`}>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A0A0A] text-2xl text-[#C9A96E]">
                    {vp.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-[#0A0A0A]">{vp.title}</h3>
                  <p className="text-sm leading-relaxed text-[#9E9890]">{vp.desc}</p>
                </TiltCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CREATOR SPOTLIGHT ────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal>
            <div className="mb-10">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#C9A96E]">Community</p>
              <h2 className="text-3xl font-bold text-white md:text-4xl">Unsere Creator</h2>
              <p className="mt-2 text-white/40">Die Menschen hinter den Düften</p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loadingCreators
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`stagger-${i + 1} rounded-3xl border border-white/10 bg-white/5 p-6 text-center`}>
                    <div className="mx-auto mb-4 h-20 w-20 skeleton rounded-full" />
                    <div className="h-4 skeleton rounded-full w-24 mx-auto mb-2" />
                    <div className="h-3 skeleton rounded-full w-16 mx-auto" />
                  </div>
                ))
              : creators.length > 0
              ? creators.map((creator, i) => (
                  <ScrollReveal key={creator.id} animation="scale" delay={i * 80}>
                    <Link
                      href={`/creator/${creator.username ?? creator.id}`}
                      className="group block rounded-3xl border border-white/10 bg-white/5 p-6 text-center hover:border-[#C9A96E]/40 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full bg-[#1A1A1A] border-2 border-white/10 group-hover:border-[#C9A96E]/50 transition-colors">
                        {creator.avatar_url ? (
                          <Image src={creator.avatar_url} alt={creator.display_name ?? ""} width={80} height={80} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-2xl text-[#C9A96E]">◎</div>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-sm">{creator.display_name ?? creator.username ?? "Creator"}</h3>
                      {creator.username && <p className="mt-0.5 text-xs text-white/40">@{creator.username}</p>}
                      {creator.bio && <p className="mt-2 text-xs leading-relaxed text-white/40 line-clamp-2">{creator.bio}</p>}
                    </Link>
                  </ScrollReveal>
                ))
              : null}
          </div>

          <ScrollReveal className="mt-10 text-center">
            <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-[#C9A96E] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#0A0A0A] transition-all hover:bg-white hover:scale-105 active:scale-100">
              Creator werden →
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── ACTIVE CHALLENGES ────────────────────────────────────────── */}
      {activeChallenges.length > 0 && (
        <section className="bg-[#FAFAF8] px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal>
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#C9A96E]">Aktuelle Wettbewerbe</p>
                  <h2 className="text-3xl font-bold text-[#0A0A0A] lg:text-4xl">Challenges & Preisgelder</h2>
                </div>
                <Link href="/challenges" className="shrink-0 text-xs text-[#9E9890] hover:text-[#0A0A0A] transition-colors">Alle →</Link>
              </div>
            </ScrollReveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeChallenges.map((challenge, i) => {
                const left = daysLeft(challenge.endDate);
                return (
                  <ScrollReveal key={challenge.id} animation="up" delay={i * 80}>
                    <TiltCard className="h-full">
                      <Link
                        href={`/challenges/${challenge.id}`}
                        className="group flex h-full flex-col rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-premium hover:shadow-premium-hover hover:border-[#C9A96E]/40 transition-all"
                      >
                        {challenge.logoUrl && (
                          <img src={challenge.logoUrl} alt="" className="mb-4 h-10 w-10 object-contain" />
                        )}
                        <p className="text-[10px] uppercase tracking-wider text-[#C9A96E] mb-2">Challenge</p>
                        <h3 className="text-lg font-bold text-[#0A0A0A] group-hover:text-[#C9A96E] transition-colors">{challenge.title}</h3>
                        {challenge.description && (
                          <p className="mt-2 text-sm text-[#9E9890] line-clamp-2">{challenge.description}</p>
                        )}
                        {challenge.prizeAmountCents > 0 && (
                          <p className="mt-4 text-2xl font-bold text-[#C9A96E]">
                            {(challenge.prizeAmountCents / 100).toFixed(0)} € Preisgeld
                          </p>
                        )}
                        <div className="mt-auto pt-4 flex items-center gap-2 text-xs text-[#9E9890]">
                          <span>bis {new Date(challenge.endDate).toLocaleDateString("de-DE")}</span>
                          {left <= 7 && left > 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-500 font-medium border border-red-200">
                              Noch {left} {left === 1 ? "Tag" : "Tage"}!
                            </span>
                          )}
                        </div>
                      </Link>
                    </TiltCard>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── KI-ABO TEASER ────────────────────────────────────────────── */}
      <section className="px-5 py-16 lg:px-8" style={{ background: "linear-gradient(135deg, #0A0A0A 0%, #1A1208 100%)" }}>
        <div className="mx-auto max-w-7xl">
          <ScrollReveal animation="scale">
            <div className="relative rounded-3xl overflow-hidden border border-[#C9A96E]/20 animate-glow-gold">
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(201,169,110,0.08) 0%, transparent 70%)" }}
              />
              <ScentParticles count={8} className="opacity-50" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-8 lg:p-12">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#C9A96E] mb-3">KI-Abo · ab 19,90 €/Monat</p>
                  <h2 className="text-3xl font-bold text-white lg:text-4xl">
                    Dein persönlicher<br />Duft des Monats
                  </h2>
                  <p className="mt-4 text-sm text-white/50 max-w-md leading-relaxed">
                    Unsere KI analysiert deine Vorlieben, aktuelle Trends und die besten Creator-Kollektionen —
                    und wählt jeden Monat einen Duft, der perfekt zu dir passt.
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {["Personalisiert nach deinen Präferenzen", "Monatlich kuratiert", "Jederzeit kündbar"].map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-white/60">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C9A96E]/20 text-[9px] text-[#C9A96E]">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link href="/ki-abo" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#C9A96E] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#0A0A0A] hover:bg-white hover:scale-105 active:scale-100 transition-all">
                    Jetzt abonnieren →
                  </Link>
                </div>
                <div className="hidden lg:flex items-center justify-center p-12">
                  <div className="animate-float-slow">
                    <AnimatedFlacon size={150} fillPercent={80} />
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── CREATOR CTA ──────────────────────────────────────────────── */}
      <section className="grain relative overflow-hidden bg-[#0A0A0A] px-5 py-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 70% 70% at 20% 50%, rgba(201,169,110,0.07) 0%, transparent 60%)" }}
        />
        <ScentParticles count={10} className="opacity-30" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <ScrollReveal animation="left">
              <p className="mb-5 text-[10px] uppercase tracking-[0.4em] text-[#C9A96E]">Für Creatoren</p>
              <h2 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                Dein Duft.
                <br />Deine Marke.
                <br /><span className="shimmer-gold">Deine Plattform.</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal animation="right" delay={150}>
              <ul className="mb-8 space-y-4">
                {BENEFITS.map((b, i) => (
                  <li key={b} className="flex items-start gap-3" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C9A96E]/20 text-[10px] text-[#C9A96E]">✓</span>
                    <span className="text-sm text-white/70">{b}</span>
                  </li>
                ))}
              </ul>
              <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-[#C9A96E] px-8 py-4 text-sm font-bold uppercase tracking-widest text-[#0A0A0A] transition-all hover:bg-white hover:scale-105 active:scale-100">
                Jetzt bewerben →
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-[#0A0A0A] border-t border-white/10 px-5 pt-16 pb-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4 mb-12">
            <div className="md:col-span-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white mb-3">Fragrance OS</p>
              <p className="text-sm text-white/40 leading-relaxed max-w-xs mb-6">
                Die Plattform für handgefertigte Düfte von unabhängigen Creatoren. Luxury × Tech × Social.
              </p>
              <AnimatedFlacon size={55} fillPercent={70} className="opacity-60" animated={false} />
            </div>
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[0.3em] text-white/30">Links</p>
              <div className="space-y-3">
                {[
                  { href: "/discover", label: "Discover" },
                  { href: "/orders", label: "Meine Bestellungen" },
                  { href: "/subscriptions", label: "Meine Abos" },
                  { href: "/apply", label: "Creator werden" },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="block text-sm text-white/50 hover:text-[#C9A96E] transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[0.3em] text-white/30">Rechtliches</p>
              <div className="space-y-3">
                {[
                  { href: "/impressum", label: "Impressum" },
                  { href: "/datenschutz", label: "Datenschutz" },
                  { href: "/agb", label: "AGB" },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="block text-sm text-white/50 hover:text-white/80 transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Fragrance OS. Alle Rechte vorbehalten.</p>
            <p className="text-xs text-[#C9A96E]/60">◉ Made with passion for fragrance</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
