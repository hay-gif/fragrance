"use client";

// Leichtgewichtiger Canvas-Bildeditor für Zuschneiden, Drehen, Helligkeit.
// Keine externen Abhängigkeiten — reines HTML5 Canvas API.

import { useCallback, useEffect, useRef, useState } from "react";

export type ImageEditorProps = {
  /** Die vom User ausgewählte Datei */
  file: File;
  /** Seitenverhältnis des Ausschnitts (1 = quadratisch, 16/9 = Banner) */
  aspectRatio?: number;
  /** Ausgabegröße der langen Kante in Pixeln */
  outputSize?: number;
  /** Titel der Modal-Überschrift */
  title?: string;
  /** Wird mit dem fertigen JPEG-Blob aufgerufen */
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
};

const PREVIEW_SIZE = 360; // px, quadratisches Vorschau-Canvas

export default function ImageEditor({
  file,
  aspectRatio = 1,
  outputSize = 800,
  title = "Bild bearbeiten",
  onConfirm,
  onCancel,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // in Grad, Vielfache von 90
  const [brightness, setBrightness] = useState(100); // 50–150
  const [contrast, setContrast] = useState(100); // 50–150
  const [offsetX, setOffsetX] = useState(0); // Pan in Pixeln relativ zu Mitte
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Crop-Rahmen-Abmessungen (in Canvas-Koordinaten)
  const cropH = PREVIEW_SIZE;
  const cropW = Math.round(PREVIEW_SIZE * Math.min(aspectRatio, 1));
  const cropX = (PREVIEW_SIZE - cropW) / 2;
  const cropY = (PREVIEW_SIZE - cropH) / 2;

  // Bild laden
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      // Initiales Scale: Bild füllt den Crop-Rahmen
      const fitScale = Math.max(cropW / image.naturalWidth, cropH / image.naturalHeight);
      setScale(fitScale);
      setOffsetX(0);
      setOffsetY(0);
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Canvas neu zeichnen
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    // Bild mit Transformationen zeichnen
    ctx.save();
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    const cx = PREVIEW_SIZE / 2;
    const cy = PREVIEW_SIZE / 2;

    ctx.translate(cx + offsetX, cy + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const isRotated90 = rotation === 90 || rotation === 270;
    const drawW = isRotated90 ? img.naturalHeight : img.naturalWidth;
    const drawH = isRotated90 ? img.naturalWidth : img.naturalHeight;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, img.naturalWidth, img.naturalHeight);

    ctx.restore();
    ctx.filter = "none";

    // Dunkel-Maske außerhalb Crop-Rahmen
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    // Oben
    ctx.fillRect(0, 0, PREVIEW_SIZE, cropY);
    // Unten
    ctx.fillRect(0, cropY + cropH, PREVIEW_SIZE, PREVIEW_SIZE - cropY - cropH);
    // Links
    ctx.fillRect(0, cropY, cropX, cropH);
    // Rechts
    ctx.fillRect(cropX + cropW, cropY, PREVIEW_SIZE - cropX - cropW, cropH);

    // Crop-Rahmen
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cropX, cropY, cropW, cropH);

    // Drittel-Linien
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cropX + (cropW / 3) * i, cropY);
      ctx.lineTo(cropX + (cropW / 3) * i, cropY + cropH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cropX, cropY + (cropH / 3) * i);
      ctx.lineTo(cropX + cropW, cropY + (cropH / 3) * i);
      ctx.stroke();
    }
  }, [img, scale, rotation, brightness, contrast, offsetX, offsetY, cropX, cropY, cropW, cropH]);

  useEffect(() => { draw(); }, [draw]);

  // Maus-Events für Pan
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
  };

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !dragStart.current) return;
      setOffsetX(dragStart.current.ox + (e.clientX - dragStart.current.x));
      setOffsetY(dragStart.current.oy + (e.clientY - dragStart.current.y));
    },
    [dragging],
  );

  const onMouseUp = () => { setDragging(false); dragStart.current = null; };

  // Touch-Events für Mobile
  const touchStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, ox: offsetX, oy: offsetY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    setOffsetX(touchStart.current.ox + (t.clientX - touchStart.current.x));
    setOffsetY(touchStart.current.oy + (t.clientY - touchStart.current.y));
  };

  // Wheel-Zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.2, Math.min(5, s - e.deltaY * 0.001)));
  };

  // Exportieren: Crop-Bereich in OutputCanvas rendern
  const handleConfirm = useCallback(() => {
    if (!img) return;

    // Output-Canvas-Größe
    const outW = aspectRatio >= 1 ? outputSize : Math.round(outputSize * aspectRatio);
    const outH = aspectRatio >= 1 ? Math.round(outputSize / aspectRatio) : outputSize;

    const outCanvas = document.createElement("canvas");
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) return;

    // Skalierungsfaktor: Crop-Pixel → Output-Pixel
    const scaleToOutput = outW / cropW;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Bild mit denselben Transformationen wie Vorschau zeichnen, skaliert auf Output
    ctx.save();
    ctx.translate(outW / 2 + offsetX * scaleToOutput, outH / 2 + offsetY * scaleToOutput);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * scaleToOutput, scale * scaleToOutput);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
    ctx.restore();

    outCanvas.toBlob(
      (blob) => { if (blob) onConfirm(blob); },
      "image/jpeg",
      0.92,
    );
  }, [img, scale, rotation, brightness, contrast, offsetX, offsetY, cropW, aspectRatio, outputSize, onConfirm]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#0A0A0A] border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <p className="text-sm font-semibold text-white">{title}</p>
          <button onClick={onCancel} className="text-white/50 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Canvas */}
        <div className="relative bg-[#111]">
          <canvas
            ref={canvasRef}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            className={`mx-auto block ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, touchAction: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { touchStart.current = null; }}
            onWheel={onWheel}
          />
          <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/30 select-none">
            Ziehen zum Verschieben · Scrollen zum Zoomen
          </p>
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-3">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-white/40 w-20">Zoom</span>
            <input
              type="range" min={0.2} max={3} step={0.01} value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="flex-1 accent-[#C9A96E]"
            />
            <span className="text-xs text-white/40 w-10 text-right">{(scale * 100).toFixed(0)}%</span>
          </div>

          {/* Helligkeit */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-white/40 w-20">Helligkeit</span>
            <input
              type="range" min={50} max={150} step={1} value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="flex-1 accent-[#C9A96E]"
            />
            <span className="text-xs text-white/40 w-10 text-right">{brightness - 100 >= 0 ? "+" : ""}{brightness - 100}</span>
          </div>

          {/* Kontrast */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-white/40 w-20">Kontrast</span>
            <input
              type="range" min={50} max={150} step={1} value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="flex-1 accent-[#C9A96E]"
            />
            <span className="text-xs text-white/40 w-10 text-right">{contrast - 100 >= 0 ? "+" : ""}{contrast - 100}</span>
          </div>

          {/* Drehen */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-white/40 w-20">Drehen</span>
            <div className="flex gap-2">
              <button
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white/50 hover:text-white transition-colors"
              >
                ↺ Links
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white/50 hover:text-white transition-colors"
              >
                ↻ Rechts
              </button>
              {(scale !== 1 || rotation !== 0 || offsetX !== 0 || offsetY !== 0 || brightness !== 100 || contrast !== 100) && (
                <button
                  onClick={() => { setScale(img ? Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight) : 1); setRotation(0); setOffsetX(0); setOffsetY(0); setBrightness(100); setContrast(100); }}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors ml-1"
                >
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-white/20 py-2.5 text-xs font-medium text-white/70 hover:border-white/40 hover:text-white transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-full bg-[#C9A96E] py-2.5 text-xs font-bold text-[#0A0A0A] hover:bg-[#E8C99A] transition-colors"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
