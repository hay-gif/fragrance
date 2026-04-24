import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  production: "/production",
  marketing: "/marketing",
  supporter: "/support",
};

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? null;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed`);
  }

  // Profil für neue OAuth-User anlegen
  let profile: { onboarding_completed: boolean; role: string } | null = null;
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, onboarding_completed, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const emailPrefix = user.email?.split("@")[0] ?? `user-${user.id.slice(0, 8)}`;
    const username = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, "-").slice(0, 30);

    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      role: "user",
      creator_status: "none",
      public_slots: 0,
      username,
      display_name: (user.user_metadata?.full_name as string | undefined) ?? emailPrefix,
      avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      bio: "",
      social_link: "",
      social_links: {},
      banner_url: null,
      commission_percent: 25,
      affiliate_commission_percent: 10,
      phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      postal_code: null,
      country: "DE",
      date_of_birth: null,
      newsletter_opt_in: false,
      fragrance_preferences: {},
      onboarding_completed: false,
    });

    // Neue User → Onboarding (mit ?next= falls vorhanden)
    const onboardingUrl = next
      ? `${origin}/onboarding?next=${encodeURIComponent(next)}`
      : `${origin}/onboarding`;
    return NextResponse.redirect(onboardingUrl);
  }

  profile = existingProfile as { onboarding_completed: boolean; role: string };

  // Interne Rollen überspringen das Onboarding
  const INTERNAL_ROLES = ["admin", "production", "marketing", "supporter"];
  const isInternal = INTERNAL_ROLES.includes(profile.role);

  // Onboarding noch nicht abgeschlossen → dorthin (mit ?next=)
  if (!profile.onboarding_completed && !isInternal) {
    const onboardingUrl = next
      ? `${origin}/onboarding?next=${encodeURIComponent(next)}`
      : `${origin}/onboarding`;
    return NextResponse.redirect(onboardingUrl);
  }

  // Priorität: explizites ?next= > Rolle > /discover
  const roleHome = ROLE_HOME[profile.role] ?? null;
  const destination = (next && next.startsWith("/")) ? next : roleHome ?? "/discover";
  return NextResponse.redirect(`${origin}${destination}`);
}
