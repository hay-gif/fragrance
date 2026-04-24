export type UserRole = "user" | "creator" | "admin" | "production" | "supporter" | "marketing";
export type CreatorStatus = "none" | "pending" | "approved" | "rejected";

export type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  website?: string;
};

export type FragrancePreferences = {
  notes?: string[];
  intensity?: "light" | "moderate" | "strong";
};

export type Profile = {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  role: UserRole;
  creatorStatus: CreatorStatus;
  socialLinks: SocialLinks;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  dateOfBirth: string | null;
  newsletterOptIn: boolean;
  fragrancePreferences: FragrancePreferences;
  referralCode: string | null;
  affiliateCommissionPercent: number;
  createdAt: string;
};

/** Raw DB row from `profiles` table */
export type DbProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  role: UserRole;
  creator_status: CreatorStatus;
  social_links: SocialLinks | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  date_of_birth: string | null;
  newsletter_opt_in: boolean;
  fragrance_preferences: FragrancePreferences | null;
  referral_code: string | null;
  affiliate_commission_percent: number;
  created_at: string;
};

export function mapProfile(r: DbProfileRow): Profile {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    bio: r.bio,
    avatarUrl: r.avatar_url,
    bannerUrl: r.banner_url,
    role: r.role,
    creatorStatus: r.creator_status,
    socialLinks: r.social_links ?? {},
    phone: r.phone,
    addressLine1: r.address_line1,
    addressLine2: r.address_line2,
    city: r.city,
    postalCode: r.postal_code,
    country: r.country ?? "DE",
    dateOfBirth: r.date_of_birth,
    newsletterOptIn: r.newsletter_opt_in,
    fragrancePreferences: r.fragrance_preferences ?? {},
    referralCode: r.referral_code,
    affiliateCommissionPercent: r.affiliate_commission_percent,
    createdAt: r.created_at,
  };
}
