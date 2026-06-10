import { describe, it, expect } from 'vitest';
import { isValidInn } from './npd';

describe('isValidInn', () => {
  it('returns true for valid 12-digit INN', () => {
    expect(isValidInn('770708389312')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidInn('')).toBe(false);
  });

  it('returns false for 11 digits', () => {
    expect(isValidInn('77070838931')).toBe(false);
  });

  it('returns false for 13 digits', () => {
    expect(isValidInn('7707083893123')).toBe(false);
  });

  it('returns false for letters', () => {
    expect(isValidInn('7707083893a')).toBe(false);
  });

  it('returns false for spaces', () => {
    expect(isValidInn('770708389312 ')).toBe(false);
  });

  it('returns false for mixed characters', () => {
    expect(isValidInn('7707 08389312')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isValidInn(null as any)).toBe(false);
    expect(isValidInn(undefined as any)).toBe(false);
  });

  it('returns true for all numeric 12-digit strings', () => {
    expect(isValidInn('000000000000')).toBe(true);
    expect(isValidInn('999999999999')).toBe(true);
  });
});
