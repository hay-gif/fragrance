import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/apiAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ["admin", "production"]);
  if (auth.error) return auth.error;

  const body = await req.json();
  const {
    orderId,
    recipientName,
    street,
    city,
    postalCode,
    country = "DEU",
    weightGrams = 500,
  } = body;

  const apiKey = process.env.DHL_API_KEY;
  const username = process.env.DHL_USERNAME;
  const password = process.env.DHL_PASSWORD;
  const billingNumber = process.env.DHL_BILLING_NUMBER;
  const senderName = process.env.DHL_SENDER_NAME || "Fragrance OS";
  const senderStreet = process.env.DHL_SENDER_STREET || "";
  const senderZip = process.env.DHL_SENDER_ZIP || "";
  const senderCity = process.env.DHL_SENDER_CITY || "";

  if (!apiKey || !username || !password || !billingNumber) {
    return NextResponse.json(
      { error: "DHL-Zugangsdaten nicht konfiguriert" },
      { status: 500 },
    );
  }

  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  // ISO-3166-1 alpha-3 normalisieren
  const countryCode = country === "DE" || country === "DEU" ? "DEU" : country;

  const payload = {
    profile: "STANDARD_GRUPPENPROFIL",
    shipments: [
      {
        product: "V01PAK",
        billingNumber,
        refNo: orderId,
        consignee: {
          name1: recipientName,
          addressStreet: street,
          postalCode,
          city,
          country: countryCode,
        },
        shipper: {
          name1: senderName,
          addressStreet: senderStreet,
          postalCode: senderZip,
          city: senderCity,
          country: "DEU",
        },
        details: {
          weight: { uom: "g", value: weightGrams },
        },
      },
    ],
  };

  const res = await fetch(
    "https://api-eu.dhl.com/parcel/de/shipping/v2/orders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "dhl-api-key": apiKey,
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(payload),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    console.error("DHL API Fehler:", data);
    return NextResponse.json(
      { error: "DHL-Fehler", details: data },
      { status: res.status },
    );
  }

  const shipment = data.items?.[0];
  const trackingNumber = shipment?.shipmentTrackingNumber ?? null;
  const labelB64 = shipment?.label?.b64 ?? null;
  const labelUrl = shipment?.label?.url ?? null;

  return NextResponse.json({ trackingNumber, labelB64, labelUrl });
}
