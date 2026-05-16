import type { ParsedCase } from '../types';

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function normalizeParsedCase(caseItem: ParsedCase): ParsedCase {
  return {
    ...caseItem,
    status: caseItem.status || 'active',
    events: parseJsonArray(caseItem.events).map((event: any, index: number) => ({
      ...event,
      id: event?.id || `${caseItem.id || caseItem.number || 'case'}-evt-${index}`,
    })),
    appeals: parseJsonArray(caseItem.appeals),
  };
}

export function normalizeParsedCases(caseItems: ParsedCase[] | null | undefined): ParsedCase[] {
  return (caseItems || []).map(normalizeParsedCase);
}
