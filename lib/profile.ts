import { supabase } from "@/lib/supabase";

export type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
  twitter?: string;
};

export type FragrancePreferences = {
  notes?: string[];
  families?: string[];
  intensity?: "light" | "moderate" | "strong";
  brands?: string[];
  occasions?: string[];
  price_max?: number;
};

export type Profile = {
  id: string;
  email: string | null;
  role: "user" | "creator" | "admin" | "production" | "supporter" | "marketing";
  creator_status: "none" | "invited" | "unlocked";
  public_slots: number;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  social_link: string | null;
  social_links: SocialLinks;
  banner_url: string | null;
  avatar_url: string | null;
  created_at: string;
  commission_percent: number;
  affiliate_commission_percent: number;
  referral_code: string | null;
  // Erweitertes Profil
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  date_of_birth: string | null;
  newsletter_opt_in: boolean;
  fragrance_preferences: FragrancePreferences;
  onboarding_completed: boolean;
};

export async function ensureProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Fehler beim Laden des Profils:", profileError);
    return null;
  }

  if (existingProfile) {
    return existingProfile as Profile;
  }

  const emailPrefix =
    user.email?.split("@")[0] ?? `user-${user.id.slice(0, 8)}`;

  const generatedUsername = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "-")
    .slice(0, 30);

  const newProfile = {
    id: user.id,
    email: user.email ?? null,
    role: "user",
    creator_status: "none",
    public_slots: 0,
    username: generatedUsername,
    display_name: user.email?.split("@")[0] ?? "Neuer Nutzer",
    bio: "",
    social_link: "",
    social_links: {},
    banner_url: null,
    avatar_url: "",
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
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert(newProfile)
    .select("*")
    .single();

  if (insertError) {
    console.error("Fehler beim Erstellen des Profils:", insertError);
    return null;
  }

  return insertedProfile as Profile;
}

export async function getOwnProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Fehler beim Laden des eigenen Profils:", error);
    return null;
  }

  return data as Profile | null;
}
