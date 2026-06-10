import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isScrapingBeeConfigured, parseWithFullFallback } from './browserlessParser';

vi.mock('./clientParser', () => ({
  parseCaseClient: vi.fn(),
  parseCaseHtml: vi.fn(),
}));

describe('browserlessParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isScrapingBeeConfigured', () => {
    it('returns false when API key is missing', () => {
      expect(isScrapingBeeConfigured()).toBe(false);
    });

    it('returns false when API key is placeholder', async () => {
      const module = await import('./browserlessParser');
      expect(module.isScrapingBeeConfigured()).toBe(false);
    });
  });

  describe('parseWithFullFallback', () => {
    it('skips client-side parsing for court sites', async () => {
      const { parseCaseClient } = await import('./clientParser');
      vi.mocked(parseCaseClient).mockRejectedValueOnce(new Error('CORS blocked'));

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ number: '2-123/2024', court: 'Тестовый суд' }),
      } as Response);

      const result = await parseWithFullFallback('https://sudrf.ru/case/123');

      expect(parseCaseClient).not.toHaveBeenCalled();
      expect(result.data).toEqual({ number: '2-123/2024', court: 'Тестовый суд' });
      expect(result.error).toBeNull();
      expect(result.source).toBe('server');

      fetchSpy.mockRestore();
    });

    it('returns error when all parsing methods fail', async () => {
      const { parseCaseClient } = await import('./clientParser');
      vi.mocked(parseCaseClient).mockRejectedValueOnce(new Error('fail'));
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Server down'));

      const result = await parseWithFullFallback('https://example.com/case/fail');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Не удалось загрузить');
    });

    it('detects court sites correctly', async () => {
      const { parseCaseClient } = await import('./clientParser');
      vi.mocked(parseCaseClient).mockRejectedValueOnce(new Error('blocked'));
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ number: '2-100/2024', court: 'Суд' }),
      } as Response);

      await parseWithFullFallback('https://sudrf.ru/case/100');
      await parseWithFullFallback('https://mos-sud.ru/case/200');
      await parseWithFullFallback('https://arbitr.ru/case/300');
      await parseWithFullFallback('https://msudrf.ru/case/400');

      expect(parseCaseClient).not.toHaveBeenCalled();
    });

    it('returns server result for non-court sites', async () => {
      const { parseCaseClient } = await import('./clientParser');
      parseCaseClient.mockRejectedValueOnce(new Error('CORS'));
      const { parseCaseHtml } = await import('./clientParser');
      parseCaseHtml.mockResolvedValueOnce({ number: '2-789/2024', court: 'Суд' } as any);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ number: '2-456/2024', court: 'Суд' }),
      } as Response);

      const result = await parseWithFullFallback('https://example.com/case/789');

      expect(result.data).toBeTruthy();
      expect(result.source).toBe('server');

      fetchSpy.mockRestore();
    });
  });
});
