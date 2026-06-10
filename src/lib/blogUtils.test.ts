import { describe, it, expect, vi } from 'vitest';
import { processContent } from './blogUtils';

describe('blogUtils', () => {
  describe('processContent', () => {
    it('returns original content if empty', () => {
      expect(processContent('')).toBe('');
      expect(processContent(null as any)).toBe(null as any);
    });

    it('adds img tag attribute for images without loading', () => {
      const input = '<img src="/image.jpg" alt="test">';
      const result = processContent(input);
      expect(result).toContain('<img');
      expect(result).toContain('/image.jpg');
    });

    it('does not add loading attribute to data URL images', () => {
      const input = '<img src="data:image/png;base64,iVBORw0KGgo=" alt="test">';
      const result = processContent(input);
      expect(result).not.toContain('loading');
    });

    it('does not modify img tags that already have loading attribute', () => {
      const input = '<img src="/image.jpg" loading="lazy" alt="test">';
      const result = processContent(input);
      expect(result).toBe(input);
    });

    it('handles content with multiple img tags', () => {
      const input = '<img src="/img1.jpg" alt="1"><img src="/img2.jpg" alt="2">';
      const result = processContent(input);
      expect(result).toContain('/img1.jpg');
      expect(result).toContain('/img2.jpg');
    });
  });
});
