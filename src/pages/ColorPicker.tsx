import React, { useState, useRef, useCallback } from 'react';
import { Download, Trash2, Check, Copy, ImageIcon, Pencil } from 'lucide-react';

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
  return (
    <div data-testid="color-picker-page">
      <h1>CHROMA</h1>
    </div>
  );
}
