# Color Picker — Implementation Design

## Goal

Build `/color-picker` — a standalone, client-side color extraction tool: upload an image, click any pixel to pick its color, save to a palette rail, and export as CSS vars / JSON / plain hex text.

## Architecture

```
pages/ColorPicker.tsx
ENTIRE_PATH:  src/pages/ColorPicker.tsx

Contains ALL logic. No new hooks or helper files are needed.
```

## Data Flow

```
Image file → FileReader → <canvas> → ctx.getImageData() → RGB → hex readout
Click → hex saved to local array state → PaletteRail re-renders
Export → Blob creation → <a> download trigger
```

## Components (singular file)

| Section | Purpose | Key element |
|---|---|---|
| Header | "CHROMA" title, path badge | Text only, Freight-style |
| UploadZone | Drop / paste / click to load image | `<label>` + hidden `<input type="file">` + canvas |
| CanvasViewer | `<canvas>` renders image; click handler reads pixel | `useRef` + mouse event |
| FloatingMagnifier | cursor-following 1:1 preview (16 px square) of pixel | Fixed `w-16 h-16` border, `fixed` position |
| ColorReadout | large hex string + RGBA string | Glass panel, `text-6xl` hex |
| PaletteRail | vertical strip, 5 saved swatches | `flex-col gap-2`, `position:fixed right-6 top-1/2` |
| ExportModal | copy / download palette | Inline panel, 3 format buttons |
| Toast | "Copied to clipboard" / "Palette cleared" | `react-intersection-observer` not needed — just a local toast + `useState` |

## Interactions

| Interaction | Behaviour |
|---|---|
| Drag file onto canvas area | Image loads, `canvas` resizes to image natural dimensions (max 80 vw) |
| Hover over pixel | magnifier follows cursor, hex readout updates live |
| Click | color snaps into readout, click pulse on canvas fires |
| Shift + Click | saves color to palette rail with shimmer animation |
| Hover swatch | shows hex + RGB value + X removal handle |
| Hover swatch (hold-down) | removal handle stays visible; on Swatch in idle state — remove handle hidden |
| Click X on swatch | removes from palette |
| Double-click swatch | copies hex to clipboard, toast fires |
| Click "Copy Pallet" (HEX) in Readout | copies full palette as JSON to clipboard, notification: "Copied to clipboard" |
| Click "Export" in Readout | opens export modal; buttons: CSS variables, JSON, plain hex list — downloads `.css` / `.json` / `.txt` |
| Scroll | canvas can be scrolled without losing palette rail sticky position |

## States

| State | Description |
|---|---|
| No image loaded | only upload zone is visible |
| Image loaded, no picked color | canvas + magnifier (shows pixel under cursor only) |
| Image loaded, color picked | color readout appears below canvas |
| Palette rail | 0–5 swatches, remove X on hover, shimmer on add |

## New CSS features

| Feature |
|---|---|
| Custom Tailwind utilities (in `index.css`): |
| `.glass-panel`  — bg supralight blend, `border-white/10` |
| `.scanline`  — repeating-linear-gradient overlay, opacity 3% |
| `.shimmer` — @keyframes animation  (horizontal, 3 cycle, from/recent opacity) |

| New theme color (when `@tailwind.config.js` standalone builds are part of this project):
| `.bg-cv-accent`  — deep blue  `#3B82F6` (reuse the existing `accent` token, same as the one already in the project — Tailwind config has it mapped) |
| `.w-1/2  h-full  rounded-sm  p-0` |

| Exact layout canvas wrapper:
| `<div className="relative max-w-[80vw] mx-auto">` |

| Show magnifier showing pixel zoomed 2x:
| `<div className="fixed z-50 pointer-events-none w-16 h-16 border border-white/30 rounded overflow-hidden backdrop-blur" style={{ top: clientY + 12, left: clientX + 12, ... }}>` |

| Color for hex string: choose one:
| `text-white` for color in dark theme, because it's used against near-black background |
| `text-gray-400` for secondary label text (RGBA strings) |

## Exact Tailwind Config we set

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      accent: '#3B82F6',
      'accent-light': '#60A5FA',
    }
  }
}
```

We will use the existing `accent` color as the main picker color (blue). No new token.

## Color Computation Rules

```
R = (color >> 16) & 0xff
G = (color >> 8) & 0xff
B = color & 0xff
```

To convert RGB → hex (uppercase): `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`

Alpha is always `255` (opaque). Convert RGBA string: `rgba(R, G, B, 1)`

## Canvas coordinate to color conversion pixel reading

```js
// Hack to get color under the mouse cursor (this is essential for reading pixel at X Y)
const ctx = canvas.current?.getContext('2d', { willReadFrequently: true })!
const pixelData = ctx.getImageData(cursorX, cursorY, 1, 1).data
// `pixelData[0]` is red, [1] green, [2] blue, [3] alpha
const hexColor = pixelToHex(pixelData) // helper below
```

## Palette storage and state shape

```ts
// src/pages/ColorPicker.tsx
interface Swatch {
  id:    string          // random `crypto.randomUUID()`
  hex:   string          // "#FF0000"
  rgb:   string          // "rgb(255, 0, 0)"
  alpha?: number         // always 1; column for future
}
// — strict typing throughout
```

## Export formats

| Format | Output |
|---|---|
| **CSS Vars** | `:root { --color-1: #FF0000; --color-2: #00FF00; }` |
| **JSON** | `{"palette": ["#FF0000", "#00FF00"]}` |
| **Plain hex** | `#FF0000\n#00FF00` line-by-line |

## Accessibility

- Canvas element gets `role="img"` and `aria-label="Image color picker canvas"`
- All buttons have `aria-label` where text is not sufficient
- Keyboard: focus goes to canvas, Enter/Space triggers click on canvas (picks center-pixel color)

## TDD and commit discipline

Use TDD throughout: failing spec, then implementation, then commit. Commit granularity: one meaningful change per commit.

## Summary deliverable

| Item | Path |
|---|---|
| Page component | `src/pages/ColorPicker.tsx` |
