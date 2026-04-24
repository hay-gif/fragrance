import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ROLE_GUARDS: Record<string, string[]> = {
  "/admin": ["admin"],
  "/production": ["production", "admin"],
  "/support": ["supporter", "admin"],
  "/marketing": ["marketing", "admin"],
  "/creator-dashboard": ["creator", "admin"],
  "/finance": ["admin"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const guardedPath = Object.keys(ROLE_GUARDS).find(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!guardedPath) return NextResponse.next();

  const allowedRoles = ROLE_GUARDS[guardedPath];

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.redirect(new URL("/discover", req.url));
  }

  // Creators must have accepted the legal agreement before accessing their dashboard
  if (pathname.startsWith("/creator-dashboard") && profile.role === "creator") {
    const { data: businessProfile } = await supabase
      .from("creator_business_profiles")
      .select("agreement_accepted_at")
      .eq("creator_id", user.id)
      .maybeSingle();

    if (!businessProfile?.agreement_accepted_at) {
      return NextResponse.redirect(new URL("/creator-vertrag", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/production",
    "/production/:path*",
    "/support",
    "/support/:path*",
    "/marketing",
    "/marketing/:path*",
    "/creator-dashboard",
    "/creator-dashboard/:path*",
    "/finance",
    "/finance/:path*",
  ],
};
