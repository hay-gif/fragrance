"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  intensity?: number;  // Grad (default 8)
};

/**
 * TiltCard — 3D-Perspektiv-Kipp-Effekt beim Hovern.
 * Folgt dem Mauscursor. Wird auf Touch-Geräten deaktiviert.
 */
export default function TiltCard({ children, className = "", intensity = 8 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 … 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) translateZ(8px)`;
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateY(0) rotateX(0) translateZ(0)";
    el.style.transition = "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)";
    setTimeout(() => { if (el) el.style.transition = ""; }, 400);
  }

  return (
    <div
      ref={ref}
      className={`card-3d ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}
