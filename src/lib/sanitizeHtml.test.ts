import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from './sanitizeHtml';

describe('sanitizeUrl', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl('   ')).toBe('');
  });

  it('allows relative URLs starting with /', () => {
    expect(sanitizeUrl('/about')).toBe('/about');
    expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
  });

  it('allows hash URLs', () => {
    expect(sanitizeUrl('#section')).toBe('#section');
  });

  it('allows safe protocols (https)', () => {
    const result = sanitizeUrl('https://example.com/path');
    expect(result).toBe('https://example.com/path');
  });

  it('allows safe protocols (http)', () => {
    const result = sanitizeUrl('http://example.com/path');
    expect(result).toBe('http://example.com/path');
  });

  it('allows safe protocols (mailto)', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('allows safe protocols (tel)', () => {
    expect(sanitizeUrl('tel:+79991234567')).toBe('tel:+79991234567');
  });

  it('blocks javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('blocks data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('blocks vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:alert(1)')).toBe('');
  });

  it('handles URLs that resolve to valid URLs via base', () => {
    // 'not a url' with a base becomes a valid relative URL on the origin
    const result = sanitizeUrl('not a url');
    // This resolves to a valid URL with the origin, so it's considered "safe"
    expect(result).toBeTruthy();
  });

  it('trims whitespace', () => {
    const result = sanitizeUrl('  https://example.com  ');
    // URL constructor normalizes the URL, may add trailing slash
    expect(result).toMatch(/^https:\/\/example\.com\/?$/);
  });
});
