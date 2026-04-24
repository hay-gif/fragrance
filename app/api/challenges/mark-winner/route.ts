import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireRole, supabaseAdmin } from "@/lib/apiAuth";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
  // Only admin or production roles can mark winners (this triggers Stripe transfers)
  const auth = await requireRole(req, ["admin", "production"]);
  if (auth.error) return auth.error;

  const { entryId, challengeId } = await req.json() as {
    entryId: string;
    challengeId: string;
  };

  if (!entryId || !challengeId) {
    return NextResponse.json({ error: "entryId und challengeId erforderlich" }, { status: 400 });
  }

  // Load entry + challenge data
  const [{ data: entry }, { data: challenge }] = await Promise.all([
    supabaseAdmin
      .from("challenge_entries")
      .select("id, creator_id, is_winner")
      .eq("id", entryId)
      .eq("challenge_id", challengeId)
      .maybeSingle(),
    supabaseAdmin
      .from("challenges")
      .select("id, title, prize_amount_cents")
      .eq("id", challengeId)
      .maybeSingle(),
  ]);

  if (!entry) return NextResponse.json({ error: "Entry nicht gefunden" }, { status: 404 });
  if (!challenge) return NextResponse.json({ error: "Challenge nicht gefunden" }, { status: 404 });
  if (entry.is_winner) return NextResponse.json({ error: "Bereits als Gewinner markiert" }, { status: 409 });

  // Mark as winner
  const { error: updateError } = await supabaseAdmin
    .from("challenge_entries")
    .update({ is_winner: true })
    .eq("id", entryId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Transfer prize if > 0
  let transferId: string | null = null;
  if (challenge.prize_amount_cents > 0) {
    const { data: stripeAccount } = await supabaseAdmin
      .from("creator_stripe_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("creator_id", entry.creator_id)
      .maybeSingle();

    if (stripeAccount?.payouts_enabled && stripeAccount?.stripe_account_id) {
      try {
        const transfer = await stripe.transfers.create({
          amount: challenge.prize_amount_cents,
          currency: "eur",
          destination: stripeAccount.stripe_account_id,
          description: `Challenge-Preis: ${challenge.title}`,
          metadata: { challenge_id: challengeId, entry_id: entryId },
        });
        transferId = transfer.id;
      } catch (err) {
        console.error("Stripe Transfer fehlgeschlagen:", err);
        // Don't fail the whole request — winner is marked, payout can be retried
      }
    }
  }

  // Send notification to winner
  await supabaseAdmin.from("notifications").insert({
    user_id: entry.creator_id,
    type: "challenge_winner",
    data: {
      challenge_id: challengeId,
      challenge_title: challenge.title,
      prize_amount_cents: challenge.prize_amount_cents,
      transfer_id: transferId,
    },
  });

  return NextResponse.json({ success: true, transferId });
}
