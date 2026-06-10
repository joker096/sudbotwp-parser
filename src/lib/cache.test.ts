import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedCheck, saveCheckCache, invalidateCache } from './cache';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ gt: vi.fn(() => ({ maybeSingle: vi.fn() }) ) }) ) })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
  },
}));

describe('cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no cache exists', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      }),
    });
    (supabase.from as any) = mockFrom;

    const result = await getCachedCheck('0000000000');
    expect(result).toBeNull();
  });

  it('saves check to cache', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({
      upsert: mockUpsert,
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gt: vi.fn().mockReturnValue({ maybeSingle: vi.fn() }) }) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    });
    (supabase.from as any) = mockFrom;

    const mockCheck = {
      inn: '1234567890',
      egrul: null,
      fssp: { status: 'not_found' as const, count: 0, productions: [] },
      efrsb: { hasBankruptcy: false, cases: [], registry: [] },
      timestamp: new Date().toISOString(),
    };

    await saveCheckCache('1234567890', mockCheck, null, null);
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockUpsert.mock.calls[0][0].inn).toBe('1234567890');
    expect(mockUpsert.mock.calls[0][1]).toEqual({ onConflict: 'inn' });
  });

  it('invalidates cache by inn', async () => {
    const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const mockFrom = vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ gt: vi.fn().mockReturnValue({ maybeSingle: vi.fn() }) }) }),
      delete: mockDelete,
    });
    (supabase.from as any) = mockFrom;

    await invalidateCache('1234567890');
    expect(mockDelete).toHaveBeenCalled();
  });
});
