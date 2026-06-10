import { describe, it, expect, vi } from 'vitest';
import { getCachedData, getSubBlockByCode, BLOCK_CODES } from './pravo';

describe('pravo', () => {
  describe('BLOCK_CODES', () => {
    it('contains expected block codes', () => {
      expect(BLOCK_CODES.FEDERAL_LAWS).toBe('laws');
      expect(BLOCK_CODES.PRESIDENT_DECREES).toBe('decrees');
      expect(BLOCK_CODES.GOVERNMENT_ACTS).toBe('govacts');
    });
  });

  describe('getCachedData', () => {
    it('calls fetcher and caches result', async () => {
      const fetcher = vi.fn().mockResolvedValue('cached-data');
      const result = await getCachedData('test-key', fetcher);
      expect(result).toBe('cached-data');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('returns cached data on second call without calling fetcher', async () => {
      const fetcher = vi.fn().mockResolvedValue('fresh-data');
      await getCachedData('cache-test-key', fetcher);
      const result = await getCachedData('cache-test-key', fetcher);
      expect(result).toBe('fresh-data');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSubBlockByCode', () => {
    it('returns empty array when catch block is hit (no mock setup)', async () => {
      const result = await getSubBlockByCode('nonexistent');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
