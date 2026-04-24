"use client";

import { useState, useRef, useEffect, useId } from "react";

type Props = {
  text: string;
  /** Wo das Tooltip erscheint (default: "top") */
  position?: "top" | "bottom" | "left" | "right";
  /** Kleinere Version für dichte Tabellen */
  compact?: boolean;
};

/**
 * InfoTooltip — universeller Hilfe-Button für die ganze Plattform.
 *
 * Verwendung:
 *   <label className="flex items-center gap-1">
 *     Provision <InfoTooltip text="Prozentualer Anteil am Verkaufspreis" />
 *   </label>
 */
export default function InfoTooltip({ text, position = "top", compact = false }: Props) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();

  // Klick außerhalb schließt Tooltip
  useEffect(() => {
    if (!visible) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setVisible(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [visible]);

  // ESC schließt
  useEffect(() => {
    if (!visible) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setVisible(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [visible]);

  const positionClasses: Record<string, string> = {
    top:    "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left:   "right-full mr-2 top-1/2 -translate-y-1/2",
    right:  "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  const arrowClasses: Record<string, string> = {
    top:    "top-full left-1/2 -translate-x-1/2 border-t-[#1A1A1A] border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-[#1A1A1A] border-l-transparent border-r-transparent border-t-transparent",
    left:   "left-full top-1/2 -translate-y-1/2 border-l-[#1A1A1A] border-t-transparent border-b-transparent border-r-transparent",
    right:  "right-full top-1/2 -translate-y-1/2 border-r-[#1A1A1A] border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={ref}
        type="button"
        aria-describedby={id}
        aria-expanded={visible}
        onClick={() => setVisible((v) => !v)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className={`inline-flex items-center justify-center rounded-full border border-[#C5C0B8] text-[#9E9890] transition-colors hover:border-[#6E6860] hover:text-[#6E6860] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E] ${
          compact ? "h-3.5 w-3.5 text-[9px]" : "h-4 w-4 text-[10px]"
        }`}
      >
        i
      </button>

      {visible && (
        <span
          role="tooltip"
          id={id}
          className={`absolute z-50 w-56 rounded-xl bg-[#1A1A1A] px-3 py-2.5 text-[11px] leading-relaxed text-white shadow-xl ${positionClasses[position]}`}
        >
          {text}
          <span className={`absolute border-4 ${arrowClasses[position]}`} />
        </span>
      )}
    </span>
  );
}
