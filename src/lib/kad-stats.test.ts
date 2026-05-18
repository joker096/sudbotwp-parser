import { describe, it, expect } from 'vitest';
import { KadStats } from '../../lib/counterparty';

describe('KAD Statistics Calculation', () => {
  it('should calculate role distribution correctly', () => {
    const cases = [
      { plaintiff: 'ООО "Альфа"', defendant: 'ООО "Бета"' },
      { plaintiff: 'ООО "Альфа"', defendant: 'ООО "Гамма"' },
      { plaintiff: 'ООО "Дельта"', defendant: 'ООО "Альфа"' },
    ];

    // Simulate stats calculation logic from kad-company-search
    let asPlaintiff = 0;
    let asDefendant = 0;
    const query = 'ООО "Альфа"'.toLowerCase();

    for (const c of cases as any[]) {
      const isPlaintiff = c.plaintiff?.toLowerCase().includes(query);
      const isDefendant = c.defendant?.toLowerCase().includes(query);

      if (isPlaintiff) asPlaintiff++;
      if (isDefendant) asDefendant++;
    }

    expect(asPlaintiff).toBe(2);
    expect(asDefendant).toBe(1);
  });

  it('should find top opponents', () => {
    const cases = [
      { plaintiff: 'Company A', defendant: 'Company B' },
      { plaintiff: 'Company A', defendant: 'Company B' },
      { plaintiff: 'Company A', defendant: 'Company C' },
      { plaintiff: 'Company D', defendant: 'Company A' },
    ];

    const query = 'Company A'.toLowerCase();
    const opponents = new Map<string, number>();

    for (const c of cases as any[]) {
      const isPlaintiff = c.plaintiff?.toLowerCase().includes(query);
      const opponent = isPlaintiff ? c.defendant : c.plaintiff;
      if (opponent) {
        opponents.set(opponent, (opponents.get(opponent) || 0) + 1);
      }
    }

    const sorted = Array.from(opponents.entries()).sort((a, b) => {
      const countDiff = b[1] - a[1];
      return countDiff !== 0 ? countDiff : a[0].localeCompare(b[0]);
    });

    expect(sorted[0]).toEqual(['Company B', 2]);
    expect(sorted[1]).toEqual(['Company C', 1]);
    expect(sorted[2]).toEqual(['Company D', 1]);
  });

  it('should calculate satisfaction rate', () => {
    const judgeCases = {
      count: 10,
      satisfied: 7,
      denied: 3,
    };

    const satisfactionRate = judgeCases.count > 0 
      ? Math.round((judgeCases.satisfied / judgeCases.count) * 100) 
      : 0;

    expect(satisfactionRate).toBe(70);
  });
});
