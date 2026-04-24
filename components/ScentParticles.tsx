"use client";

import { useMemo } from "react";

type Particle = {
  id: number;
  left: number;       // % from left
  bottom: number;     // % from bottom
  size: number;       // px
  delay: number;      // s
  duration: number;   // s
  opacity: number;
};

type Props = {
  count?: number;
  className?: string;
  color?: string;
};

export default function ScentParticles({
  count = 14,
  className = "",
  color = "rgba(201,169,110,",
}: Props) {
  // Stabile Zufallswerte (SSR-sicher, keine Math.random im Render)
  const particles = useMemo<Particle[]>(() => {
    // Deterministischer PRNG (Lehmer)
    let seed = 42;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: 5 + rand() * 90,
      bottom: 5 + rand() * 25,
      size: 2 + rand() * 4,
      delay: rand() * 5,
      duration: 4 + rand() * 5,
      opacity: 0.15 + rand() * 0.45,
    }));
  }, [count]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-particle"
          style={{
            left: `${p.left}%`,
            bottom: `${p.bottom}%`,
            width: p.size,
            height: p.size,
            background: `${color}${p.opacity})`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
