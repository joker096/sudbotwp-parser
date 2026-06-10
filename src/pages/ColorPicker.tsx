import React, { useState, useRef, useCallback } from 'react';
import { Download, Trash2, Check, Copy, ImageIcon } from 'lucide-react';

export interface Swatch {
  id: string;
  hex: string;
  rgb: string;
  alpha: number;
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`.toUpperCase();
};

export const pixelDataToHex = (data: Uint8ClampedArray): string => {
  return rgbToHex(data[0], data[1], data[2]);
};

export default function ColorPickerPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<Swatch | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Palette ──────────────────────────────────────────────────────────────
  const [palette, setPalette] = useState<Swatch[]>([]);
  const MAX_PALETTE = 5;

  const addToPalette = useCallback(() => {
    if (!pickedColor || palette.length >= MAX_PALETTE) return;
    setPalette(prev => [...prev, { ...pickedColor, id: crypto.randomUUID() }]);
  }, [pickedColor, palette.length]);

  const removeSwatch = useCallback((id: string) => {
    setPalette(prev => prev.filter(s => s.id !== id));
  }, []);

  const copySwatchHex = useCallback(async (hex: string) => {
    try { await navigator.clipboard.writeText(hex); } catch { /* ignored */ }
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.naturalWidth / rect.width;
    const scaleY = canvas.naturalHeight / rect.height;
    const px = Math.floor((e.clientX - rect.left) * scaleX);
    const py = Math.floor((e.clientY - rect.top) * scaleY);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    const hex = pixelDataToHex(pixel);
    const rgbStr = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    const swatch: Swatch = { id: crypto.randomUUID(), hex, rgb: rgbStr, alpha: 1 };
    if (e.shiftKey) {
      if (palette.length < MAX_PALETTE) {
        setPalette(prev => [...prev, swatch]);
      }
    } else {
      setPickedColor(swatch);
    }
  }, [palette.length]);

  const PaletteSwatch = ({
    swatch,
    onRemove,
    onCopy,
  }: {
    swatch: Swatch;
    onRemove: (id: string) => void;
    onCopy: (hex: string) => void;
  }) => {
    const [hovered, setHovered] = React.useState(false);
    return (
      <div
        className="relative w-12 h-12 rounded-xl cursor-pointer group"
        style={{ backgroundColor: swatch.hex }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={() => onCopy(swatch.hex)}
        aria-label={`Color ${swatch.hex}`}
      >
        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl gap-1">
            <span className="text-[9px] text-white font-mono uppercase">{swatch.hex}</span>
            <button
              onClick={(ev) => { ev.stopPropagation(); onRemove(swatch.id); }}
              className="p-0.5 text-white/80 hover:text-red-400"
              aria-label={`Remove ${swatch.hex}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Export helpers ───────────────────────────────────────────────────────
  const exportCSS = (hexes: string[]) =>
    `:root {\n${hexes.map((h, i) => `  --color-${i+1}: ${h};`).join('\n')}\n}`;

  const exportJSON = (hexes: string[]) =>
    JSON.stringify({ palette: hexes }, null, 2);

  const exportTXT = (hexes: string[]) => hexes.join('\n');

  const triggerDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [showExport, setShowExport] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // Draw image into canvas when src changes
  React.useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current!;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.naturalWidth / rect.width;
    const scaleY = canvas.naturalHeight / rect.height;
    const px = Math.floor((e.clientX - rect.left) * scaleX);
    const py = Math.floor((e.clientY - rect.top) * scaleY);
    setCursorPos({ x: e.clientX, y: e.clientY });
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const pixel = ctx.getImageData(px, py, 1, 1).data;
    setHoveredHex(pixelDataToHex(pixel));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans">
      {/* ── Page title ── */}
      <h1 className="text-8xl font-black text-white tracking-tighter text-center pt-12 pb-2">
        CHROMA
      </h1>
      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-gray-500 pb-8">
        Image Color Picker
      </p>

      {/* ── Upload Zone ── */}
      <label
        data-testid="upload-zone"
        className="flex flex-col items-center justify-center w-[80vw] max-w-5xl mx-auto h-48
                   border-2 border-dashed border-gray-800 rounded-2xl cursor-pointer
                   hover:border-accent/50 hover:bg-white/[0.02] transition-all"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          data-testid="file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />
        <ImageIcon className="w-10 h-10 text-gray-600 mb-3" />
        <span className="text-sm text-gray-500 uppercase tracking-widest">
          Drag &amp; Drop or Click to Upload
        </span>
      </label>

      {/* ── Canvas + magnifier + readout ── */}
      {imageSrc && (
        <div className="relative w-[80vw] max-w-5xl mx-auto">
          <canvas
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
            className="mx-auto block rounded-xl cursor-crosshair"
            style={{ maxWidth: '100%' }}
            role="img"
            aria-label="Image color picker canvas"
          />

          {/* Floating magnifier */}
          {cursorPos && hoveredHex && (
            <div
              className="fixed z-50 pointer-events-none w-16 h-16 border border-white/20 rounded overflow-hidden backdrop-blur-sm shadow-lg"
              style={{ top: cursorPos.y + 12, left: cursorPos.x + 12 }}
              data-testid="magnifier"
            >
              <div className="w-full h-full" style={{ backgroundColor: hoveredHex }} />
            </div>
          )}

          {/* Color readout */}
          {pickedColor && (
            <div className="mt-4 text-center">
              <div className="text-6xl font-bold tracking-tighter text-white">
                {pickedColor.hex}
              </div>
              <div className="text-xs uppercase tracking-widest text-gray-500 mt-1">
                {pickedColor.rgb}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Export Button — shows when palette has items or a picked color ── */}
      {(palette.length > 0 || pickedColor) && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl border border-white/10
                       text-sm text-gray-300 hover:bg-white/5 transition-all uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      )}

      {/* ── Export Modal ── */}
      {showExport && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowExport(false)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Export Palette</h2>
            {palette.length > 0 && (
              <>
                <button
                  onClick={() => {
                    triggerDownload('palette.css', exportCSS(palette.map(s => s.hex)), 'text/css');
                    setShowExport(false);
                  }}
                  className="w-full py-3 mb-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-all uppercase tracking-wider"
                >
                  CSS Variables
                </button>
                <button
                  onClick={() => {
                    triggerDownload('palette.json', exportJSON(palette.map(s => s.hex)), 'application/json');
                    setShowExport(false);
                  }}
                  className="w-full py-3 mb-2 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-all uppercase tracking-wider"
                >
                  JSON
                </button>
                <button
                  onClick={() => {
                    triggerDownload('palette.txt', exportTXT(palette.map(s => s.hex)), 'text/plain');
                    setShowExport(false);
                  }}
                  className="w-full py-3 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition-all uppercase tracking-wider"
                >
                  Plain Hex
                </button>
              </>
            )}
            {palette.length === 0 && pickedColor && (
              <p className="text-sm text-gray-500 text-center">
                Save colors to the palette first, then export.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── PaletteRail ── */}
      {palette.length > 0 && (
        <div
          className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40"
          aria-label="Saved color palette"
        >
          {palette.map(swatch => (
            <PaletteSwatch
              key={swatch.id}
              swatch={swatch}
              onRemove={removeSwatch}
              onCopy={copySwatchHex}
            />
          ))}
        </div>
      )}
    </div>
  );
}
