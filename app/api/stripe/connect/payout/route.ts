import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const INSTANT_FEE_PERCENT = 0.015; // 1,5% — wird auf Creator umgelegt

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { userId, amountCents, type } = await req.json() as {
    userId: string;
    amountCents: number;
    type: "standard" | "instant";
  };

  if (auth.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!userId || !amountCents || amountCents < 1000) {
    return NextResponse.json(
      { error: "Mindestbetrag: 10,00 EUR" },
      { status: 400 },
    );
  }

  // § 22f UStG Gate: Prüfe KYC + Steuerdaten vor jeder Auszahlung
  const { data: bizProfile } = await supabaseAdmin
    .from("creator_business_profiles")
    .select("agreement_accepted_at, legal_name, vat_id, tax_id, is_kleinunternehmer, payout_blocked, payout_blocked_reason, kyc_verified_at")
    .eq("creator_id", userId)
    .maybeSingle();

  if (!bizProfile?.agreement_accepted_at) {
    return NextResponse.json(
      { error: "Auszahlung gesperrt: Creator-Vereinbarung wurde noch nicht akzeptiert." },
      { status: 403 },
    );
  }
  if (!bizProfile?.legal_name?.trim()) {
    return NextResponse.json(
      { error: "Auszahlung gesperrt: Vollständiger Klarname fehlt (§ 22f UStG)." },
      { status: 403 },
    );
  }
  const hasTaxId = !!(bizProfile?.vat_id?.trim() || bizProfile?.tax_id?.trim() || bizProfile?.is_kleinunternehmer);
  if (!hasTaxId) {
    return NextResponse.json(
      { error: "Auszahlung gesperrt: Steuerliche Identifikation fehlt (§ 22f UStG). Bitte USt-IdNr., Steuer-IdNr. oder Kleinunternehmer-Erklärung hinterlegen." },
      { status: 403 },
    );
  }
  if (bizProfile?.payout_blocked) {
    const reason = bizProfile.payout_blocked_reason ?? "Kein Grund angegeben";
    return NextResponse.json(
      { error: `Auszahlung durch Admin gesperrt: ${reason}` },
      { status: 403 },
    );
  }

  const { data: row } = await supabaseAdmin
    .from("creator_stripe_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("creator_id", userId)
    .maybeSingle();

  if (!row?.payouts_enabled) {
    return NextResponse.json(
      { error: "Auszahlung nicht möglich – Stripe Connect nicht vollständig eingerichtet." },
      { status: 400 },
    );
  }

  // Instant Payout: 1,5% Gebühr wird vom Betrag abgezogen (Creator trägt Kosten)
  const feeCents = type === "instant" ? Math.ceil(amountCents * INSTANT_FEE_PERCENT) : 0;
  const netCents = amountCents - feeCents;

  try {
    const payout = await stripe.payouts.create(
      {
        amount: netCents,
        currency: "eur",
        method: type === "instant" ? "instant" : "standard",
        description:
          type === "instant"
            ? `Sofortauszahlung (1,5% Gebühr = ${(feeCents / 100).toFixed(2)} EUR)`
            : "Monatliche Auszahlung – Fragrance OS",
      },
      { stripeAccount: row.stripe_account_id },
    );

    await supabaseAdmin.from("creator_payout_requests").insert({
      creator_id: userId,
      amount_cents: amountCents,
      fee_cents: feeCents,
      net_cents: netCents,
      type,
      status: payout.status === "paid" ? "completed" : "processing",
      stripe_payout_id: payout.id,
      processed_at: payout.status === "paid" ? new Date().toISOString() : null,
    });

    return NextResponse.json({ success: true, netCents, feeCents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("Payout error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
