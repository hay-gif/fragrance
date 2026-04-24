/**
 * Shared auth helpers for API routes.
 * Use `requireAuth` to verify the Bearer token and return the authenticated user.
 * Use `requireRole` to additionally check that the user has an admin/production role.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const supabaseAdmin: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type AuthResult =
  | { user: { id: string; email?: string }; error: null }
  | { user: null; error: NextResponse };

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns the authenticated user or a ready-to-return 401 NextResponse.
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user: { id: user.id, email: user.email }, error: null };
}

/**
 * Like requireAuth, but also checks that the user's profile role is in `allowedRoles`.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: string[],
): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (auth.error) return auth;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}
