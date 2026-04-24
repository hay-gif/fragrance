/**
 * Centralized business constants for Fragrance OS.
 * Change rates, limits, and external config here — not scattered across route files.
 */

// ── Commission rates ──────────────────────────────────────────────────────────
/** Creator commission on each order (25 %) */
export const CREATOR_COMMISSION_RATE = 0.25;

/** Share-link commission for normal users (10 %) */
export const SHARE_COMMISSION_RATE = 0.10;

/** Affiliate partner commission (configurable per affiliate in DB) */
export const DEFAULT_AFFILIATE_COMMISSION_RATE = 0.10;

/** Stripe Connect instant-payout fee charged to the creator (1.5 %) */
export const STRIPE_INSTANT_PAYOUT_FEE = 0.015;

// ── Tax ───────────────────────────────────────────────────────────────────────
/** German VAT rate (%) */
export const VAT_PERCENT = 19;

// ── Subscriptions ─────────────────────────────────────────────────────────────
/** KI-Abo monthly price in cents */
export const KI_ABO_PRICE_CENTS = 1990;

/** Minimum payout amount in cents (10 €) */
export const MIN_PAYOUT_CENTS = 1000;

/** Share earnings: minimum payout amount in cents (15 €) */
export const SHARE_MIN_PAYOUT_CENTS = 1500;

// ── Referral / Attribution ────────────────────────────────────────────────────
/** How long an affiliate referral cookie is valid (30 days in ms) */
export const AFFILIATE_REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** How long a share-link attribution is stored in localStorage (7 days in ms) */
export const SHARE_REF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ── AI ────────────────────────────────────────────────────────────────────────
/** Anthropic model used for fragrance suggestions */
export const AI_MODEL = "claude-opus-4-6";

/** Max tokens for fragrance suggestion responses */
export const AI_MAX_TOKENS = 1024;

// ── Stripe ────────────────────────────────────────────────────────────────────
/** Stripe API version used across all Stripe SDK instances */
export const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;
