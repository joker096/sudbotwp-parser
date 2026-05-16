import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ColorPickerPage, { rgbToHex, pixelDataToHex } from '../ColorPicker';

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
