"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Verzögerung in ms */
  delay?: number;
  /** Animationstyp */
  animation?: "up" | "left" | "right" | "scale" | "fade";
  /** Wie viel vom Element sichtbar sein muss (0–1) */
  threshold?: number;
  /** Nur einmal animieren (default true) */
  once?: boolean;
};

const ANIMATION_CLASSES: Record<string, { hidden: string; visible: string }> = {
  up:    { hidden: "opacity-0 translate-y-8",  visible: "opacity-100 translate-y-0" },
  left:  { hidden: "opacity-0 -translate-x-8", visible: "opacity-100 translate-x-0" },
  right: { hidden: "opacity-0 translate-x-8",  visible: "opacity-100 translate-x-0" },
  scale: { hidden: "opacity-0 scale-95",        visible: "opacity-100 scale-100" },
  fade:  { hidden: "opacity-0",                 visible: "opacity-100" },
};

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  animation = "up",
  threshold = 0.15,
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  const { hidden, visible: vis } = ANIMATION_CLASSES[animation];

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? vis : hidden} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
