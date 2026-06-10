import { describe, it, expect } from 'vitest';
import { calculateRatios, hasHighDebt, RosstatReport, FinancialRatios } from './rosstat';

describe('rosstat', () => {
  describe('calculateRatios', () => {
    const reports: RosstatReport[] = [
      { year: 2023, period: 'год', assets: 100000, liabilities: 40000, capital: 60000, revenue: 200000, profit: 30000, expenses: 170000, receivables: 50000, payables: 30000 },
      { year: 2022, period: 'год', assets: 90000, liabilities: 45000, capital: 45000, revenue: 180000, profit: 25000, expenses: 155000, receivables: 45000, payables: 35000 },
    ];

    it('calculates profitability correctly', () => {
      const result = calculateRatios(reports);
      expect(result[0].profitability).toBeCloseTo(15, 1);
    });

    it('calculates liquidity correctly', () => {
      const result = calculateRatios(reports);
      expect(result[0].liquidity).toBeCloseTo(1.5, 1);
    });

    it('calculates debtRatio correctly', () => {
      const result = calculateRatios(reports);
      expect(result[0].debtRatio).toBeCloseTo(30, 1);
    });

    it('returns null for profitability when revenue is zero', () => {
      const zeroRevenue: RosstatReport[] = [
        { year: 2023, period: 'год', assets: 100000, liabilities: 40000, capital: 60000, revenue: 0, profit: 0, expenses: 0, receivables: 0, payables: 0 },
      ];
      const result = calculateRatios(zeroRevenue);
      expect(result[0].profitability).toBeNull();
    });

    it('returns null for profitability when revenue is negative', () => {
      const negRevenue: RosstatReport[] = [
        { year: 2023, period: 'год', assets: 100000, liabilities: 40000, capital: 60000, revenue: -50000, profit: -30000, expenses: 0, receivables: 0, payables: 0 },
      ];
      const result = calculateRatios(negRevenue);
      expect(result[0].profitability).toBeNull();
    });

    it('returns null for liquidity when liabilities is zero', () => {
      const zeroLiab: RosstatReport[] = [
        { year: 2023, period: 'год', assets: 100000, liabilities: 0, capital: 100000, revenue: 200000, profit: 30000, expenses: 170000, receivables: 0, payables: 0 },
      ];
      const result = calculateRatios(zeroLiab);
      expect(result[0].liquidity).toBeNull();
    });

    it('returns null for debtRatio when assets is zero', () => {
      const zeroAssets: RosstatReport[] = [
        { year: 2023, period: 'год', assets: 0, liabilities: 0, capital: 0, revenue: 0, profit: 0, expenses: 0, receivables: 0, payables: 100 },
      ];
      const result = calculateRatios(zeroAssets);
      expect(result[0].debtRatio).toBeNull();
    });

    it('preserves all years in output', () => {
      const multiYear: RosstatReport[] = [
        { year: 2021, period: 'год', assets: 50000, liabilities: 20000, capital: 30000, revenue: 100000, profit: 10000, expenses: 90000, receivables: 20000, payables: 10000 },
        { year: 2022, period: 'год', assets: 70000, liabilities: 30000, capital: 40000, revenue: 150000, profit: 20000, expenses: 130000, receivables: 30000, payables: 15000 },
        { year: 2023, period: 'год', assets: 100000, liabilities: 40000, capital: 60000, revenue: 200000, profit: 30000, expenses: 170000, receivables: 50000, payables: 30000 },
      ];
      const result = calculateRatios(multiYear);
      expect(result).toHaveLength(3);
      expect(result.map(r => r.year)).toEqual([2021, 2022, 2023]);
    });

    it('handles null values gracefully', () => {
      const nullValues: RosstatReport[] = [
        { year: 2023, period: 'год', assets: null, liabilities: null, capital: null, revenue: null, profit: null, expenses: null, receivables: null, payables: null },
      ];
      const result = calculateRatios(nullValues);
      expect(result[0].profitability).toBeNull();
      expect(result[0].liquidity).toBeNull();
      expect(result[0].debtRatio).toBeNull();
    });
  });

  describe('hasHighDebt', () => {
    it('returns true when latest debtRatio exceeds 70%', () => {
      const ratios: FinancialRatios[] = [
        { year: 2022, profitability: 10, liquidity: 1.2, debtRatio: 60 },
        { year: 2023, profitability: 5, liquidity: 0.8, debtRatio: 80 },
      ];
      expect(hasHighDebt(ratios)).toBe(true);
    });

    it('returns false when latest debtRatio is below 70%', () => {
      const ratios: FinancialRatios[] = [
        { year: 2023, profitability: 15, liquidity: 1.5, debtRatio: 50 },
      ];
      expect(hasHighDebt(ratios)).toBe(false);
    });

    it('returns false when latest debtRatio is exactly 70%', () => {
      const ratios: FinancialRatios[] = [
        { year: 2023, profitability: 10, liquidity: 1.0, debtRatio: 70 },
      ];
      expect(hasHighDebt(ratios)).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(hasHighDebt([])).toBe(false);
    });

    it('uses latest year for decision', () => {
      const ratios: FinancialRatios[] = [
        { year: 2021, profitability: 10, liquidity: 1.0, debtRatio: 80 },
        { year: 2022, profitability: 10, liquidity: 1.0, debtRatio: 80 },
        { year: 2023, profitability: 10, liquidity: 1.0, debtRatio: 50 },
      ];
      expect(hasHighDebt(ratios)).toBe(false);
    });

    it('handles null debtRatio in latest year', () => {
      const ratios: FinancialRatios[] = [
        { year: 2023, profitability: null, liquidity: null, debtRatio: null },
      ];
      expect(hasHighDebt(ratios)).toBe(false);
    });

    it('treats null as 0', () => {
      const ratios: FinancialRatios[] = [
        { year: 2023, profitability: 10, liquidity: 1.0, debtRatio: null },
      ];
      expect(hasHighDebt(ratios)).toBe(false);
    });
  });
});
