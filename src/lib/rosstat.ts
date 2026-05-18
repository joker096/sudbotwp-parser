/**
 * Расчёт финансовых коэффициентов на основе данных Росстата
 */

export interface RosstatReport {
  year: number;
  period: string;
  assets: number | null;
  liabilities: number | null;
  capital: number | null;
  revenue: number | null;
  profit: number | null;
  expenses: number | null;
  receivables: number | null;
  payables: number | null;
}

export interface RosstatResult {
  success: boolean;
  company: { name: string; inn: string; ogrn: string };
  reports: RosstatReport[];
}

export interface FinancialRatios {
  year: number;
  profitability: number | null; // Рентабельность продаж = profit / revenue * 100
  liquidity: number | null; // Текущая ликвидность = capital / liabilities
  debtRatio: number | null; // Доля заёмных = payables / assets * 100
}

export function calculateRatios(reports: RosstatReport[]): FinancialRatios[] {
  return reports.map((r) => ({
    year: r.year,
    profitability: r.revenue && r.revenue > 0 ? round((r.profit || 0) / r.revenue * 100) : null,
    liquidity: r.liabilities && r.liabilities > 0 ? round((r.capital || 0) / r.liabilities) : null,
    debtRatio: r.assets && r.assets > 0 ? round((r.payables || 0) / r.assets * 100) : null,
  }));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function hasHighDebt(ratios: FinancialRatios[]): boolean {
  const latest = ratios[ratios.length - 1];
  return latest ? (latest.debtRatio || 0) > 70 : false;
}
