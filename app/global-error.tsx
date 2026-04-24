"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.capture(error, { boundary: "global-error" });
  }, [error]);

  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#FAFAF8" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "#9E9890", marginBottom: 8 }}>
              Kritischer Fehler
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0A0A0A", marginBottom: 12 }}>
              Anwendung konnte nicht geladen werden
            </h1>
            <p style={{ fontSize: 14, color: "#6E6860", marginBottom: 32 }}>
              {error.message || "Ein unerwarteter Fehler ist aufgetreten."}
            </p>
            <button
              onClick={reset}
              style={{ background: "#0A0A0A", color: "#fff", border: "none", borderRadius: 999, padding: "10px 24px", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Neu laden
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
