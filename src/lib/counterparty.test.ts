import { describe, it, expect } from 'vitest';
import { calculateRiskScore, CounterpartyCheck } from './counterparty';

describe('calculateRiskScore', () => {
  it('returns low risk for clean company', () => {
    const check: CounterpartyCheck = {
      inn: '1234567890',
      egrul: { success: true, data: { inn: '1234567890', status: 'ACTIVE', capital: '10000' } as any, raw: {} },
      fssp: { status: 'not_found', count: 0, productions: [] },
      efrsb: { hasBankruptcy: false, cases: [], registry: [] },
      timestamp: new Date().toISOString(),
    };

    const result = calculateRiskScore(check);

    expect(result.total).toBe(0);
    expect(result.level).toBe('low');
    expect(result.label).toBe('Низкий риск');
    expect(result.factors).toHaveLength(0);
  });

  it('returns medium risk with FSSP', () => {
    const check: CounterpartyCheck = {
      inn: '1234567890',
      egrul: null,
      fssp: { status: 'found', count: 2, productions: [] },
      efrsb: { hasBankruptcy: false, cases: [], registry: [] },
      timestamp: new Date().toISOString(),
    };

    const result = calculateRiskScore(check);

    expect(result.total).toBe(20);
    expect(result.level).toBe('medium');
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0].name).toBe('Исполнительные производства');
  });

  it('returns high risk with bankruptcy', () => {
    const check: CounterpartyCheck = {
      inn: '1234567890',
      egrul: null,
      fssp: { status: 'not_found', count: 0, productions: [] },
      efrsb: { hasBankruptcy: true, cases: [{ number: 'A40-123/2026' } as any], registry: [] },
      timestamp: new Date().toISOString(),
    };

    const result = calculateRiskScore(check);

    expect(result.total).toBe(50);
    expect(result.level).toBe('high');
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0].name).toBe('Банкротство');
  });

  it('caps risk at 100%', () => {
    const check: CounterpartyCheck = {
      inn: '1234567890',
      egrul: { success: true, data: { status: 'LIQUIDATING', capital: '0' } as any, raw: {} },
      fssp: { status: 'found', count: 5, productions: [] },
      efrsb: { hasBankruptcy: true, cases: [], registry: [] },
      timestamp: new Date().toISOString(),
    };

    const result = calculateRiskScore(check);

    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.level).toBe('high');
  });

  it('detects liquidation status', () => {
    const check: CounterpartyCheck = {
      inn: '1234567890',
      egrul: { success: true, data: { status: 'ЛИКВИДАЦИЯ' } as any, raw: {} },
      fssp: null,
      efrsb: null,
      timestamp: new Date().toISOString(),
    };

    const result = calculateRiskScore(check);

    expect(result.factors.some(f => f.name === 'Ликвидация')).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(40);
  });

  it('detects zero capital', () => {
    const check: CounterpartyCheck = {
      inn: '1234567890',
      egrul: { success: true, data: { capital: '0' } as any, raw: {} },
      fssp: null,
      efrsb: null,
      timestamp: new Date().toISOString(),
    };

    const result = calculateRiskScore(check);

    expect(result.factors.some(f => f.name === 'Нулевой уставной капитал')).toBe(true);
    expect(result.total).toBe(15);
  });
});
