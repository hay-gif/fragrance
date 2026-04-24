import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY nicht konfiguriert. Bitte in .env.local hinzufügen." },
      { status: 500 },
    );
  }

  const body = await req.json() as {
    prompt: string;
    preferences?: Record<string, unknown>;
    availableAccords?: string[];
  };

  const { prompt, preferences = {}, availableAccords = [] } = body;

  // Build preference context
  const prefLines: string[] = [];
  if (Array.isArray(preferences.families) && preferences.families.length > 0)
    prefLines.push(`Duftstile: ${(preferences.families as string[]).join(", ")}`);
  if (Array.isArray(preferences.brands) && preferences.brands.length > 0)
    prefLines.push(`Bekannte Marken: ${(preferences.brands as string[]).join(", ")}`);
  if (Array.isArray(preferences.occasions) && preferences.occasions.length > 0)
    prefLines.push(`Anlässe: ${(preferences.occasions as string[]).join(", ")}`);
  if (preferences.intensity)
    prefLines.push(`Intensität: ${preferences.intensity}`);

  const accordList = availableAccords.length > 0
    ? availableAccords.join(", ")
    : "Diverse Accorde";

  const systemPrompt = [
    "Du bist ein erfahrener Parfümeur. Erstelle eine maßgeschneiderte Duftkomposition aus den verfügbaren Accorden.",
    "",
    `Verfügbare Accorde: ${accordList}`,
    "",
    prefLines.length > 0 ? `Nutzerprofil:\n${prefLines.join("\n")}` : "",
    "",
    "Regeln:",
    "- Verwende NUR Accorde aus der obigen Liste (exakter Name).",
    "- Die Summe aller Prozentangaben muss exakt 100% ergeben.",
    "- Antworte immer auf Deutsch.",
    "",
    "Antwortformat (exakt einhalten):",
    "KOMPOSITION:",
    "- [Accord-Name]: [Zahl]%",
    "- [Accord-Name]: [Zahl]%",
    "",
    "BEGRÜNDUNG:",
    "[Ein bis zwei Sätze zur Zusammensetzung und zum Charakter des Dufts.]",
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt?.trim() || "Erstelle einen passenden Duft basierend auf meinen Präferenzen.",
          },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: txt }, { status: res.status });
    }

    const data = await res.json() as { content?: { text?: string }[] };
    const suggestion = data.content?.[0]?.text ?? "";
    return NextResponse.json({ suggestion });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
