import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type") ?? "fragrances"; // "fragrances" | "profiles" | "all"
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  if (q.length < 2) {
    return NextResponse.json({ fragrances: [], profiles: [] });
  }

  // Convert query to tsquery (prefix search: "rose" → "rose:*")
  const tsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");

  const results: { fragrances: unknown[]; profiles: unknown[] } = {
    fragrances: [],
    profiles: [],
  };

  if (type === "fragrances" || type === "all") {
    const { data } = await supabase
      .from("fragrances")
      .select("id, name, description, category, price_cents, size_ml, image_url, owner_id, created_at")
      .eq("is_public", true)
      .eq("status", "active")
      .textSearch("search_vector", tsQuery, { type: "websearch", config: "german" })
      .limit(limit);
    results.fragrances = data ?? [];
  }

  if (type === "profiles" || type === "all") {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, role")
      .textSearch("search_vector", tsQuery, { type: "websearch", config: "german" })
      .limit(limit);
    results.profiles = data ?? [];
  }

  return NextResponse.json(results);
}
