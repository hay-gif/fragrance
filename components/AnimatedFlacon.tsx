"use client";

/**
 * AnimatedFlacon — SVG-Parfümflakon mit animiertem Flüssigkeitsspiegel.
 *
 * Technik:
 *  • Flaschenform als <clipPath> für die Flüssigkeit
 *  • Sinus-Welle die sich endlos nach links bewegt (liquid-wave keyframe)
 *  • Glasglanz: diagonaler weißer Streifen mit fade-animation
 *  • Goldener Korken / Verschluss oben
 */

type Props = {
  size?: number;
  fillPercent?: number;  // 0–100
  className?: string;
  animated?: boolean;
};

export default function AnimatedFlacon({
  size = 180,
  fillPercent = 65,
  className = "",
  animated = true,
}: Props) {
  // Flasche: viewBox 0 0 100 200
  // Korken: y 0–22
  // Hals: y 22–48
  // Schulter: y 48–72
  // Körper: y 72–178
  // Boden: y 178–192

  const bottleBodyTop = 72;
  const bottleBodyBottom = 178;
  const bodyHeight = bottleBodyBottom - bottleBodyTop;
  const liquidTop = bottleBodyTop + bodyHeight * (1 - fillPercent / 100);
  const waveAmplitude = 5;

  // Flasche-Clip-Path (Körper + Schulter)
  const bottleClipPath =
    "M 22 48 " +
    "C 22 48 8 60 8 72 " +   // linke Schulter
    "L 8 178 " +             // linke Seite
    "Q 8 192 50 192 " +      // untere linke Rundung
    "Q 92 192 92 178 " +     // untere rechte Rundung
    "L 92 72 " +             // rechte Seite
    "C 92 60 78 48 78 48 Z"; // rechte Schulter

  // Gesamte Flasche inkl. Hals für äußere Silhouette
  const fullBottlePath =
    "M 38 22 L 62 22 " +      // Halsübergang
    "C 62 22 78 35 78 48 " +  // rechte Schulter
    "C 92 60 92 72 92 72 " +  // rechte Schulter unten
    "L 92 178 Q 92 192 50 192 Q 8 192 8 178 " +
    "L 8 72 C 8 60 22 48 22 48 " +
    "C 22 35 38 22 38 22 Z";

  return (
    <svg
      viewBox="0 0 100 200"
      width={size}
      height={(size * 200) / 100}
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        {/* Clip-Pfad für die Flüssigkeit — nur Flaschenkörper */}
        <clipPath id={`bottle-body-${size}`}>
          <path d={bottleClipPath} />
        </clipPath>

        {/* Clip für Glasglanz — gesamte Flasche */}
        <clipPath id={`bottle-full-${size}`}>
          <path d={fullBottlePath} />
        </clipPath>

        {/* Goldener Gradient für Flüssigkeit */}
        <linearGradient id={`liquid-grad-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#E8C99A" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="#C9A96E" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#A8803D" stopOpacity="0.95" />
        </linearGradient>

        {/* Glasgradient für Flaschenkörper */}
        <linearGradient id={`glass-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#F8F4EE" stopOpacity="0.18" />
          <stop offset="40%"  stopColor="#EDE8E0" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#D4CFC5" stopOpacity="0.04" />
        </linearGradient>

        {/* Korken-Gradient */}
        <linearGradient id={`cap-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#E8C99A" />
          <stop offset="50%"  stopColor="#C9A96E" />
          <stop offset="100%" stopColor="#A8803D" />
        </linearGradient>
      </defs>

      {/* ── Flaschenkörper (Hintergrund) ── */}
      <path
        d={fullBottlePath}
        fill="rgba(240,235,228,0.12)"
        stroke="rgba(201,169,110,0.35)"
        strokeWidth="1"
      />

      {/* ── Flüssigkeit (innerhalb des Körpers) ── */}
      <g clipPath={`url(#bottle-body-${size})`}>
        {/* Solide Füllung unterhalb der Welle */}
        <rect
          x="0"
          y={liquidTop + waveAmplitude}
          width="100"
          height={bottleBodyBottom - liquidTop}
          fill={`url(#liquid-grad-${size})`}
        />

        {/* Animierte Sinus-Welle oben */}
        <g style={{ animation: animated ? "liquid-wave 3s linear infinite" : "none" }}>
          {/* Doppelt breite Welle für nahtloses Looping */}
          <path
            d={[
              `M -100 ${liquidTop}`,
              // Erste Wellenlänge
              `C -87.5 ${liquidTop - waveAmplitude} -62.5 ${liquidTop + waveAmplitude} -50 ${liquidTop}`,
              `C -37.5 ${liquidTop - waveAmplitude} -12.5 ${liquidTop + waveAmplitude} 0 ${liquidTop}`,
              `C 12.5 ${liquidTop - waveAmplitude} 37.5 ${liquidTop + waveAmplitude} 50 ${liquidTop}`,
              `C 62.5 ${liquidTop - waveAmplitude} 87.5 ${liquidTop + waveAmplitude} 100 ${liquidTop}`,
              `C 112.5 ${liquidTop - waveAmplitude} 137.5 ${liquidTop + waveAmplitude} 150 ${liquidTop}`,
              `C 162.5 ${liquidTop - waveAmplitude} 187.5 ${liquidTop + waveAmplitude} 200 ${liquidTop}`,
              `L 200 ${bottleBodyBottom} L -100 ${bottleBodyBottom} Z`,
            ].join(" ")}
            fill={`url(#liquid-grad-${size})`}
          />
        </g>

        {/* Schimmer-Highlight auf der Flüssigkeit */}
        <ellipse
          cx="35" cy={liquidTop + 4}
          rx="12" ry="2.5"
          fill="rgba(255,255,255,0.25)"
        />
      </g>

      {/* ── Glasbeschichtung / Transparenz über Flasche ── */}
      <g clipPath={`url(#bottle-full-${size})`}>
        <path
          d={fullBottlePath}
          fill={`url(#glass-grad-${size})`}
        />

        {/* Glasglanz-Streifen — schwenkt durch */}
        <rect
          x="-20" y="0"
          width="18" height="200"
          fill="rgba(255,255,255,0.18)"
          transform="skewX(-8)"
          style={{
            transformOrigin: "center",
            animation: animated ? "glass-shine 5s ease-in-out 2s infinite" : "none",
          }}
        />

        {/* Rechtes Highlight-Band */}
        <path
          d="M 76 72 C 84 72 88 80 88 90 L 88 155 C 88 165 84 170 78 172"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      {/* ── Flaschenkante / Outline ── */}
      <path
        d={fullBottlePath}
        fill="none"
        stroke="rgba(201,169,110,0.5)"
        strokeWidth="0.8"
      />

      {/* ── Hals ── */}
      <rect
        x="36" y="22"
        width="28" height="26"
        rx="2"
        fill="rgba(230,220,205,0.18)"
        stroke="rgba(201,169,110,0.4)"
        strokeWidth="0.8"
      />
      {/* Hals-Highlight */}
      <rect
        x="38" y="23"
        width="7" height="24"
        rx="1"
        fill="rgba(255,255,255,0.12)"
      />

      {/* ── Korken / Verschluss ── */}
      <rect
        x="28" y="2"
        width="44" height="22"
        rx="8"
        fill={`url(#cap-grad-${size})`}
      />
      {/* Korken-Glanz */}
      <rect
        x="31" y="4"
        width="12" height="16"
        rx="5"
        fill="rgba(255,255,255,0.25)"
      />
      {/* Korken-Kante unten */}
      <rect
        x="28" y="19"
        width="44" height="3"
        rx="1"
        fill="rgba(0,0,0,0.15)"
      />

      {/* ── Korken-Zier-Gravur ── */}
      <text
        x="50" y="15"
        textAnchor="middle"
        fontSize="6"
        fontWeight="600"
        letterSpacing="1"
        fill="rgba(10,10,10,0.55)"
        fontFamily="serif"
      >
        F·OS
      </text>

      {/* ── Etikett auf der Flasche ── */}
      <rect
        x="18" y="105"
        width="64" height="48"
        rx="4"
        fill="rgba(250,248,244,0.85)"
        stroke="rgba(201,169,110,0.4)"
        strokeWidth="0.6"
      />
      <rect
        x="21" y="108"
        width="58" height="42"
        rx="3"
        fill="none"
        stroke="rgba(201,169,110,0.25)"
        strokeWidth="0.4"
      />
      <text
        x="50" y="123"
        textAnchor="middle"
        fontSize="5"
        fontWeight="700"
        letterSpacing="1.5"
        fill="#6E6860"
        fontFamily="serif"
      >
        FRAGRANCE
      </text>
      <text
        x="50" y="131"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="700"
        letterSpacing="0.5"
        fill="#0A0A0A"
        fontFamily="serif"
      >
        OS
      </text>
      <line x1="26" y1="135" x2="74" y2="135" stroke="rgba(201,169,110,0.5)" strokeWidth="0.5" />
      <text
        x="50" y="143"
        textAnchor="middle"
        fontSize="4"
        letterSpacing="2"
        fill="#9E9890"
        fontFamily="sans-serif"
      >
        EAU DE PARFUM
      </text>

      {/* ── Boden-Verstärkung ── */}
      <rect
        x="12" y="181"
        width="76" height="8"
        rx="4"
        fill="rgba(201,169,110,0.15)"
        stroke="rgba(201,169,110,0.25)"
        strokeWidth="0.5"
      />
    </svg>
  );
}
