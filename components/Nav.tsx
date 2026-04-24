"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSwipe } from "@/lib/useSwipe";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const swipe = useSwipe({ onSwipeLeft: () => setMenuOpen(false) });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      if (session?.user?.id) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => setUserRole(data?.role ?? null));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      if (session?.user?.id) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => setUserRole(data?.role ?? null));
      } else {
        setUserRole(null);
      }
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  // Close on ESC
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navLinks = [
    { href: "/discover", label: "Discover" },
    { href: "/rankings", label: "Rankings" },
    { href: "/challenges", label: "Challenges" },
    { href: "/ki-abo", label: "KI-Abo" },
    { href: "/apply", label: "Creator werden" },
  ];

  const userLinks = loggedIn ? [
    { href: "/orders", label: "Bestellungen" },
    { href: "/subscriptions", label: "Abonnements" },
  ] : [];

  const roleLinks = loggedIn ? [
    ...(userRole === "creator" || userRole === "admin" ? [{ href: "/creator-dashboard", label: "Creator", highlight: true }] : []),
    ...(userRole === "admin" ? [
      { href: "/admin", label: "Admin", highlight: true },
      { href: "/production", label: "Produktion", highlight: true },
    ] : []),
    ...(userRole === "supporter" || userRole === "admin" ? [{ href: "/support", label: "Support", highlight: true }] : []),
    ...(userRole === "marketing" || userRole === "admin" ? [{ href: "/marketing", label: "Marketing", highlight: true }] : []),
    ...(userRole === "production" ? [{ href: "/production", label: "Produktion", highlight: true }] : []),
  ] : [];

  const allMobileLinks = [
    ...navLinks,
    ...userLinks,
    ...roleLinks,
    { href: loggedIn ? "/profile" : "/auth", label: loggedIn ? "Profil" : "Einloggen", highlight: false },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-[#0A0A0A]/95 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.06)]" : "bg-transparent"
      }`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Logo */}
          <Link href="/" className="text-[11px] font-bold uppercase tracking-[0.3em] text-white hover:text-[#C9A96E] transition-colors">
            Fragrance OS
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs font-medium uppercase tracking-widest text-white/70 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
            {userLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs font-medium uppercase tracking-widest text-white/50 hover:text-white/80 transition-colors">
                {l.label}
              </Link>
            ))}
            {roleLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs font-medium uppercase tracking-widest text-[#C9A96E]/80 hover:text-[#C9A96E] transition-colors border border-[#C9A96E]/30 rounded-full px-3 py-1">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              aria-label="Warenkorb"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/70 hover:border-white/50 hover:text-white active:bg-white/10 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2h1.5l1.5 8h7l1.5-5.5H5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none"/>
                <circle cx="11.5" cy="12.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
            </Link>
            {loggedIn ? (
              <Link
                href="/profile"
                aria-label="Mein Profil"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A96E] text-[10px] font-bold text-[#0A0A0A] hover:bg-[#E8C99A] active:scale-95 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="7" cy="5" r="2.5"/>
                  <path d="M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5" strokeLinecap="round"/>
                </svg>
              </Link>
            ) : (
              <Link href="/auth" className="rounded-full bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A] hover:bg-[#C9A96E] active:scale-95 transition-all">
                Einloggen
              </Link>
            )}
            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Navigation öffnen"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 md:hidden items-center justify-center rounded-full border border-white/20 text-white/70 active:bg-white/10 transition-colors"
            >
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="0" y1="1" x2="16" y2="1"/>
                <line x1="0" y1="6" x2="16" y2="6"/>
                <line x1="0" y1="11" x2="16" y2="11"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-100 bg-[#0A0A0A] flex flex-col px-8 py-16 overflow-y-auto" {...swipe}>
          <button
            type="button"
            aria-label="Navigation schließen"
            onClick={() => setMenuOpen(false)}
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white active:bg-white/10 transition-colors text-xl"
          >
            ✕
          </button>
          <p className="mb-8 text-[10px] uppercase tracking-[0.3em] text-white/30">Navigation</p>
          <div className="space-y-5">
            {allMobileLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`block text-3xl font-bold transition-colors ${
                  "highlight" in l && l.highlight
                    ? "text-[#C9A96E]/80 hover:text-[#C9A96E]"
                    : "text-white/80 hover:text-[#C9A96E]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          {loggedIn && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setMenuOpen(false);
              }}
              className="mt-12 text-sm text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest"
            >
              Abmelden
            </button>
          )}
        </div>
      )}
    </>
  );
}
