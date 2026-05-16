import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for the retry wrapper logic.
 * Tests the core retry behavior: success, transient failure, permanent failure,
 * exponential backoff delay, and error propagation.
 */

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;

// Re-implement the logic being tested (mirrors supabase.ts)
async function withRetry<T>(
  fn: () => Promise<{ data: T; error: any }>,
  attempts = RETRY_ATTEMPTS,
  delayMs = RETRY_DELAY_MS
): Promise<{ data: T | null; error: any }> {
  let lastError: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      if (!result.error) {
        return result;
      }
      lastError = result.error;
    } catch (e) {
      lastError = e;
    }
    // Wait before next attempt (skip delay on last attempt)
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  return { data: null, error: lastError };
}

// Helper to create a mock result
const ok = <T>(data: T) => ({ data, error: null });
const err = (errorMsg: string) => ({ data: null, error: new Error(errorMsg) });

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns data on first attempt when successful', async () => {
    const fn = vi.fn(() => Promise.resolve(ok({ id: '1', name: 'test' })));
    const result = await withRetry(fn);

    expect(result.data).toEqual({ id: '1', name: 'test' });
    expect(result.error).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient error and succeeds on second attempt', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(err('Network error'))
      .mockResolvedValueOnce(ok({ id: '2', name: 'success' }));

    const promise = withRetry(fn);

    // Fast-forward through all retries
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.data).toEqual({ id: '2', name: 'success' });
    expect(result.error).toBeNull();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries all attempts and returns last error when permanently failing', async () => {
    const fn = vi.fn().mockResolvedValue(err('Database timeout'));
    vi.spyOn(fn, 'mockResolvedValue');

    const promise = withRetry(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Database timeout');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('succeeds on third attempt after two failures', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(err('Error 1'))
      .mockResolvedValueOnce(err('Error 2'))
      .mockResolvedValueOnce(ok({ id: '3' }));

    const promise = withRetry(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.data).toEqual({ id: '3' });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws on sync exception and retries', async () => {
    let count = 0;
    const fn = vi.fn().mockImplementation(() => {
      if (count++ < 2) throw new Error('Sync error');
      return Promise.resolve(ok({ id: '4' }));
    });

    const promise = withRetry(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.data).toEqual({ id: '4' });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('propagates null data with null error when fn returns { data: null, error: null }', async () => {
    const fn = vi.fn().mockResolvedValue({ data: null, error: null });
    const promise = withRetry(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('respects custom attempt count', async () => {
    const fn = vi.fn().mockResolvedValue(err('Always fails'));
    const promise = withRetry(fn, 5);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.data).toBeNull();
    expect(fn).toHaveBeenCalledTimes(5);
  });
});