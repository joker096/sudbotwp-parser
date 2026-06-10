import { describe, it, expect } from 'vitest';
import { transliterate, generateSlug } from './transliterate';

describe('transliterate', () => {
  it('returns empty string for empty input', () => {
    expect(transliterate('')).toBe('');
    expect(transliterate(null as any)).toBe('');
  });

  it('transliterates simple Russian text', () => {
    expect(transliterate('привет')).toBe('privet');
  });

  it('lowercases the result', () => {
    expect(transliterate('Привет')).toBe('privet');
  });

  it('converts spaces to dashes', () => {
    expect(transliterate('Привет мир')).toBe('privet-mir');
  });

  it('preserves special characters not in translitMap', () => {
    expect(transliterate('Тест!?.,;:')).toBe('test!?.,;:');
  });

  it('handles ё and Ё', () => {
    expect(transliterate('ёлка')).toBe('yolka');
    expect(transliterate('Ёлка')).toBe('yolka');
  });

  it('handles soft and hard signs', () => {
    expect(transliterate('Конь')).toBe('kon');
    expect(transliterate('Съезд')).toBe('s-ezd');
    expect(transliterate('День')).toBe('den');
  });

  it('replaces multiple consecutive dashes with single dash', () => {
    expect(transliterate('Привет   мир')).toBe('privet-mir');
  });

  it('removes leading and trailing dashes', () => {
    expect(transliterate(' -Привет мир- ')).toBe('privet-mir');
  });

  it('replaces non-ASCII with dash', () => {
    expect(transliterate('你好')).toBe('');
  });

  it('converts tabs and newlines to dashes', () => {
    expect(transliterate('Привет\tмир\nновый')).toBe('privet-mir-novyy');
  });

  it('converts numbers to themselves', () => {
    expect(transliterate('Тест123')).toBe('test123');
  });

  it('lowercases the result', () => {
    expect(transliterate('ПРИВЕТ')).toBe('privet');
  });

  it('handles + and = symbols', () => {
    expect(transliterate('1+1=2')).toBe('1=1-2');
  });

  it('transliterates complex phrase with known mappings', () => {
    const result = transliterate('Федеральный закон о защите прав');
    expect(result).toContain('federal');
    expect(result).toContain('nyy');
    expect(result).toContain('zakon');
    expect(result).toContain('zaschite');
    expect(result).toContain('prav');
  });

  it('handles full complex phrase', () => {
    const result = transliterate('Федеральный закон о защите прав потребителей');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('generateSlug', () => {
  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
    expect(generateSlug(null as any)).toBe('');
  });

  it('returns transliterated slug', () => {
    expect(generateSlug('Привет мир')).toBe('privet-mir');
  });

  it('handles complex title', () => {
    const result = generateSlug('Федеральный закон № 123-ФЗ от 01.01.2024');
    expect(result).toContain('federal');
    expect(result).toContain('zakon');
  });
});
