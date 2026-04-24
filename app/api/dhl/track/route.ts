import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const trackingNumber = req.nextUrl.searchParams.get("trackingNumber");

  if (!trackingNumber) {
    return NextResponse.json(
      { error: "trackingNumber erforderlich" },
      { status: 400 },
    );
  }

  const apiKey = process.env.DHL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DHL_API_KEY nicht konfiguriert" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}`,
    {
      headers: { "DHL-API-Key": apiKey },
      next: { revalidate: 300 }, // 5 min Cache
    },
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: "DHL-Tracking-Fehler", details: data },
      { status: res.status },
    );
  }

  const shipment = data.shipments?.[0];
  const status = shipment?.status?.description ?? null;
  const timestamp = shipment?.status?.timestamp ?? null;
  const location = shipment?.status?.location?.address?.addressLocality ?? null;
  const events = (shipment?.events ?? []).map(
    (e: { description: string; timestamp: string; location?: { address?: { addressLocality?: string } } }) => ({
      description: e.description,
      timestamp: e.timestamp,
      location: e.location?.address?.addressLocality ?? null,
    }),
  );

  return NextResponse.json({ status, timestamp, location, events });
}
