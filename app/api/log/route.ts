import { NextRequest, NextResponse } from "next/server";

/**
 * Receives structured log entries from the client.
 * In production these are written to stdout so Vercel Log Drains / any aggregator captures them.
 *
 * To forward to an external service (Sentry, Datadog, Logtail, …):
 *   Replace the console.* calls below with the SDK's ingest call.
 */
export async function POST(req: NextRequest) {
  try {
    const entry = await req.json();

    // Minimal sanitisation — only write expected fields
    const level: string = entry?.level ?? "error";
    const message: string = String(entry?.message ?? "").slice(0, 500);
    const timestamp: string = entry?.timestamp ?? new Date().toISOString();
    const errorInfo = entry?.error ?? null;
    const context = entry?.context ?? null;

    const line = JSON.stringify({ level, message, timestamp, error: errorInfo, context, source: "client" });

    if (level === "error" || level === "warn") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
