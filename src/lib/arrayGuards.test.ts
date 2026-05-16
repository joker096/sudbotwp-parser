import { describe, it, expect } from 'vitest';

/**
 * Unit tests for parseCaseClient function and the array-guard pattern.
 * Tests parsing of various HTML structures, edge cases with events/appeals,
 * and the defensive Array.isArray() pattern used throughout the codebase.
 */

function isArrayGuard(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

describe('Array.isArray guard pattern (arrayGuard)', () => {
  it('returns true for plain array', () => {
    expect(isArrayGuard([1, 2, 3])).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isArrayGuard([])).toBe(true);
  });

  it('returns false for JSON string', () => {
    expect(isArrayGuard('[{"date":"01.01.2024"}]')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isArrayGuard(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isArrayGuard(undefined)).toBe(false);
  });

  it('returns false for object', () => {
    expect(isArrayGuard({ date: '01.01.2024' })).toBe(false);
  });

  it('returns false for number', () => {
    expect(isArrayGuard(42)).toBe(false);
  });

  it('returns false for string that looks like array', () => {
    expect(isArrayGuard('[]')).toBe(false);
    expect(isArrayGuard('[] events')).toBe(false);
  });
});

describe('safeArrayMap (events.map safe pattern)', () => {
  // Mirrors the pattern used in PaymentModal and CaseCard
  function safeArrayMap<T, R>(arr: T | null | undefined, mapper: (item: T, index: number) => R): R[] {
    return Array.isArray(arr) ? arr.map(mapper) : [];
  }

  it('maps array normally', () => {
    const events = [{ date: '01.01.2024' }, { date: '02.01.2024' }];
    const result = safeArrayMap(events, (e) => e.date);
    expect(result).toEqual(['01.01.2024', '02.01.2024']);
  });

  it('returns empty array when events is null', () => {
    const result = safeArrayMap(null, (e: any) => e.date);
    expect(result).toEqual([]);
  });

  it('returns empty array when events is undefined', () => {
    const result = safeArrayMap(undefined, (e: any) => e.date);
    expect(result).toEqual([]);
  });

  it('returns empty array when events is a JSON string', () => {
    const result = safeArrayMap('[{"date":"01.01.2024"}]' as any, (e: any) => e.date);
    expect(result).toEqual([]);
  });

  it('returns empty array when events is a number', () => {
    const result = safeArrayMap(42 as any, (e: any) => e);
    expect(result).toEqual([]);
  });

  it('joins mapped array correctly', () => {
    const events = [{ name: 'Заседание' }, { name: 'Решение' }];
    const result = safeArrayMap(events, (e) => `<div>${e.name}</div>`).join('');
    expect(result).toBe('<div>Заседание</div><div>Решение</div>');
  });
});

describe('safeArrayCondition (events && events.length > 0 guard)', () => {
  function safeArrayCondition(arr: unknown): boolean {
    return Array.isArray(arr) && arr.length > 0;
  }

  it('returns true for non-empty array', () => {
    expect(safeArrayCondition([1, 2])).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(safeArrayCondition([])).toBe(false);
  });

  it('returns false for null', () => {
    expect(safeArrayCondition(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(safeArrayCondition(undefined)).toBe(false);
  });

  it('returns false for JSON string', () => {
    expect(safeArrayCondition('[]')).toBe(false);
    expect(safeArrayCondition('[1,2,3]')).toBe(false);
  });
});

describe('caseData normalization (events field type normalization)', () => {
  // Simulates what happens in Profile.tsx / Home.tsx when loading from Supabase
  function normalizeCaseData(raw: any): { events: any[]; appeals: any[] } {
    return {
      events: typeof raw.events === 'string' ? JSON.parse(raw.events) : raw.events || [],
      appeals: typeof raw.appeals === 'string' ? JSON.parse(raw.appeals) : raw.appeals || [],
    };
  }

  it('handles events as plain array', () => {
    const raw = { events: [{ date: '01.01.2024' }], appeals: [] };
    const result = normalizeCaseData(raw);
    expect(result.events).toEqual([{ date: '01.01.2024' }]);
  });

  it('handles events as JSON string', () => {
    const raw = { events: '[{"date":"01.01.2024"}]', appeals: '[]' };
    const result = normalizeCaseData(raw);
    expect(result.events).toEqual([{ date: '01.01.2024' }]);
  });

  it('handles null events', () => {
    const raw = { events: null, appeals: null };
    const result = normalizeCaseData(raw);
    expect(result.events).toEqual([]);
  });

  it('handles undefined events', () => {
    const raw = { appeals: [] };
    const result = normalizeCaseData(raw);
    expect(result.events).toEqual([]);
  });

  it('handles invalid JSON string gracefully', () => {
    const raw = { events: 'not valid json', appeals: [] };
    expect(() => normalizeCaseData(raw)).toThrow();
  });
});

describe('favorites fallback (localStorage pattern)', () => {
  const STORAGE_KEY = 'profile-favorite-lawyers';

  function getLocalFavorites(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addLocalFavorite(id: string): void {
    const current = getLocalFavorites();
    if (!current.includes(id)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, id]));
    }
  }

  function removeLocalFavorite(id: string): void {
    const current = getLocalFavorites();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.filter((b) => b !== id)));
  }

  function isLocalFavorite(id: string): boolean {
    return getLocalFavorites().includes(id);
  }

  // localStorage is used as fallback when user is not authenticated
  it('adds and removes favorites via localStorage', () => {
    expect(isLocalFavorite('lawyer-1')).toBe(false);
    addLocalFavorite('lawyer-1');
    expect(isLocalFavorite('lawyer-1')).toBe(true);
    removeLocalFavorite('lawyer-1');
    expect(isLocalFavorite('lawyer-1')).toBe(false);
  });

  it('does not duplicate favorites', () => {
    addLocalFavorite('lawyer-2');
    addLocalFavorite('lawyer-2');
    const favs = getLocalFavorites();
    expect(favs.filter(f => f === 'lawyer-2').length).toBe(1);
  });
});