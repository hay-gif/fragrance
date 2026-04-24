import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "production"]);
  if (auth.error) return auth.error;

  const { to, orderId, trackingNumber, trackingUrl } = await req.json();

  if (!to || !orderId) {
    return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY nicht gesetzt — Versand-E-Mail wird nicht gesendet");
    return NextResponse.json({ skipped: true });
  }

  const orderNumber = orderId.slice(0, 8).toUpperCase();

  const html = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="background:#0A0A0A;border-radius:16px 16px 0 0;padding:32px 32px 24px;">
              <p style="margin:0;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.3em;font-weight:600;">Fragrance OS</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:700;">Dein Duft ist unterwegs 🎁</h1>
              <div style="margin-top:16px;height:2px;width:40px;background:#C9A96E;border-radius:1px;"></div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #E5E0D8;border-top:none;padding:32px;">
              <p style="margin:0 0 20px;color:#6E6860;font-size:14px;line-height:1.6;">
                Deine Bestellung <strong style="color:#0A0A0A;">#${orderNumber}</strong> wurde soeben versendet. Du kannst dein Paket jetzt verfolgen.
              </p>
              ${trackingNumber ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EA;border-radius:12px;padding:20px;margin:0 0 24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;color:#9E9890;font-size:10px;text-transform:uppercase;letter-spacing:0.2em;">Sendungsnummer</p>
                    <p style="margin:0;color:#0A0A0A;font-size:16px;font-weight:700;font-family:monospace;">${trackingNumber}</p>
                  </td>
                </tr>
              </table>
              ` : ""}
              ${trackingUrl ? `
              <a href="${trackingUrl}" style="display:inline-block;background:#C9A96E;color:#0A0A0A;text-decoration:none;padding:12px 24px;border-radius:100px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:16px;">
                Sendung verfolgen →
              </a><br />
              ` : ""}
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/orders" style="display:inline-block;background:#0A0A0A;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:100px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;">
                Bestellung ansehen →
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#F5F0EA;border:1px solid #E5E0D8;border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;">
              <p style="margin:0;color:#C5C0B8;font-size:11px;line-height:1.5;">
                Fragrance OS · Handgefertigte Düfte von unabhängigen Creatoren<br />
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/datenschutz" style="color:#9E9890;">Datenschutz</a> ·
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/impressum" style="color:#9E9890;">Impressum</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fragrance OS <versand@fragrance-os.de>",
        to: [to],
        subject: `Dein Duft ist auf dem Weg! #${orderNumber} — Fragrance OS`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Resend Fehler:", err);
      return NextResponse.json({ error: "E-Mail-Versand fehlgeschlagen" }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("E-Mail Ausnahme:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
