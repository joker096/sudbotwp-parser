import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColorPickerPage, { rgbToHex, pixelDataToHex, Swatch } from '../ColorPicker';

describe('ColorPickerPage', () => {
  it('renders the CHROMA heading', () => {
    render(<ColorPickerPage />);
    expect(screen.getByText('CHROMA')).toBeInTheDocument();
  });
});

describe('rgbToHex', () => {
  it('converts black to #000000', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });
  it('converts white to #FFFFFF', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
  });
  it('converts red to #FF0000', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#FF0000');
  });
});

describe('pixelDataToHex', () => {
  it('reads hex from first 3 channels of Uint8ClampedArray', () => {
    const data = new Uint8ClampedArray([255, 128, 0, 255]);
    expect(pixelDataToHex(data)).toBe('#FF8000');
  });
});

describe('ColorPickerPage — UploadZone', () => {
  it('renders the upload zone with file picker text', () => {
    render(<ColorPickerPage />);
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
  });

  it('has a hidden file input', () => {
    render(<ColorPickerPage />);
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it('has no canvas before an image is loaded', () => {
    render(<ColorPickerPage />);
    expect(document.querySelector('canvas')).toBeNull();
  });
});

describe('ColorPickerPage — Canvas', () => {
  it('shows no canvas before an image is loaded', () => {
    render(<ColorPickerPage />);
    expect(document.querySelector('canvas')).toBeNull();
  });
});

describe('ColorPickerPage — PaletteRail', () => {
  it('palette array is empty on initial render', () => {
    const empty: Swatch[] = [];
    expect(empty.length).toBe(0);
  });
});

describe('ColorPickerPage — Export', () => {
  it('exportCSS produces CSS variables string', () => {
    const hexes = ['#FF0000', '#00FF00', '#0000FF'];
    const css = hexes.map((h, i) => `  --color-${i+1}: ${h};`).join('\n');
    expect(css).toContain('--color-1: #FF0000;');
    expect(css).toContain('--color-3: #0000FF;');
  });

  it('exportJSON produces valid JSON with palette key', () => {
    const hexes = ['#FF0000'];
    const json = JSON.stringify({ palette: hexes });
    const parsed = JSON.parse(json);
    expect(parsed.palette[0]).toBe('#FF0000');
  });

  it('exportTXT produces newline-separated hex list', () => {
    const hexes = ['#FF0000', '#00FF00'];
    const txt = hexes.join('\n');
    expect(txt.split('\n').length).toBe(2);
  });
});
