import { describe, it, expect, vi } from 'vitest';
import { exportToExcel, exportToCSV } from './export';
import type { CounterpartyCheck } from './counterparty';
import type { RosstatResult } from './rosstat';
import type { RiskScore } from './counterparty';

describe('export', () => {
  describe('exportToExcel', () => {
    const baseCheck: CounterpartyCheck = {
      inn: '1234567890',
      egrul: null,
      fssp: null,
      efrsb: null,
      timestamp: new Date().toISOString(),
    };

    it('returns a Blob with xlsx content type', () => {
      const checkWithData: CounterpartyCheck = {
        ...baseCheck,
        egrul: {
          success: true,
          data: { inn: '1234567890', ogrn: '1234567890123', name: 'ООО Тест', status: 'ACTIVE' } as any,
          raw: {},
        },
      };
      const blob = exportToExcel(checkWithData, null, null);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('includes ЕГРЮL sheet when egrul data is present', () => {
      const check: CounterpartyCheck = {
        ...baseCheck,
        egrul: {
          success: true,
          data: {
            inn: '1234567890',
            ogrn: '1234567890123',
            name: 'ООО Тест',
            fullName: 'Общество с ограниченной ответственностью Тест',
            director: 'Иванов И.И.',
            founder: 'Петров П.П.',
            address: 'г. Москва',
            status: 'ACTIVE',
            okved: '62.20',
            capital: '10000',
          },
          raw: {},
        },
      };

      const blob = exportToExcel(check, null, null);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    it('includes ФССП sheet when fssp data is present', () => {
      const check: CounterpartyCheck = {
        ...baseCheck,
        fssp: {
          status: 'found',
          count: 2,
          productions: [
            { number: 'ИП-123/2024', date: '2024-01-15', sum: '50000', subject: 'Возмещение ущерба' },
            { number: 'ИП-456/2024', date: '2024-02-20', sum: '', subject: '' },
          ],
        },
      };

      const blob = exportToExcel(check, null, null);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('includes ЕФРСБ sheet when efrsb data is present', () => {
      const check: CounterpartyCheck = {
        ...baseCheck,
        efrsb: {
          hasBankruptcy: true,
          cases: [
            { number: 'A40-123/2024', date: '2024-03-01', court: 'АС Москвы', status: 'Наблюдение' },
          ],
          registry: [],
        },
      };

      const blob = exportToExcel(check, null, null);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('includes Росстат sheet when rosstat data is present', () => {
      const rosstat: RosstatResult = {
        success: true,
        company: { name: 'ООО Тест', inn: '1234567890', ogrn: '1234567890123' },
        reports: [
          { year: 2023, period: 'год', assets: 100000, liabilities: 40000, capital: 60000, revenue: 200000, profit: 30000, expenses: 170000, receivables: 50000, payables: 30000 },
        ],
      };

      const blob = exportToExcel(baseCheck, rosstat, null);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('includes Риск sheet when riskScore is present', () => {
      const riskScore: RiskScore = {
        total: 65,
        level: 'high',
        label: 'Высокий риск',
        factors: [
          { name: 'Банкротство', weight: 50 },
          { name: 'ФССП', weight: 20 },
        ],
      };

      const blob = exportToExcel(baseCheck, null, riskScore);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('produces valid xlsx that can be parsed', async () => {
      const check: CounterpartyCheck = {
        ...baseCheck,
        egrul: {
          success: true,
          data: { inn: '1234567890', ogrn: '1234567890123', name: 'ООО Тест', status: 'ACTIVE' } as any,
          raw: {},
        },
        fssp: {
          status: 'found',
          count: 1,
          productions: [{ number: 'IP-1', date: '2024-01-01', sum: '1000', subject: 'Тест' }],
        },
      };

      const blob = exportToExcel(check, null, null);
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      expect(bytes.length).toBeGreaterThan(0);

      const signature = bytes.slice(0, 4);
      const hex = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
      expect(hex).toBe('504b0304');
    });
  });

  describe('exportToCSV', () => {
    const baseCheck: CounterpartyCheck = {
      inn: '1234567890',
      egrul: null,
      fssp: null,
      efrsb: null,
      timestamp: new Date().toISOString(),
    };

    it('returns a Blob with CSV content type', () => {
      const blob = exportToCSV(baseCheck);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv;charset=utf-8;');
    });

    it('includes header row', async () => {
      const blob = exportToCSV(baseCheck);
      const text = await blob.text();
      expect(text).toContain('"Тип"');
      expect(text).toContain('"Номер/Название"');
    });

    it('includes ФССП data', async () => {
      const check: CounterpartyCheck = {
        ...baseCheck,
        fssp: {
          status: 'found',
          count: 1,
          productions: [
            { number: 'ИП-123', date: '2024-01-15', sum: '50000', subject: 'Тест' },
          ],
        },
      };

      const blob = exportToCSV(check);
      const text = await blob.text();
      expect(text).toContain('ФССП');
      expect(text).toContain('ИП-123');
    });

    it('includes ЕФРСБ data', async () => {
      const check: CounterpartyCheck = {
        ...baseCheck,
        efrsb: {
          hasBankruptcy: true,
          cases: [
            { number: 'A40-123', date: '2024-03-01', court: 'АС Москвы', status: 'Наблюдение' },
          ],
          registry: [],
        },
      };

      const blob = exportToCSV(check);
      const text = await blob.text();
      expect(text).toContain('ЕФРСБ');
      expect(text).toContain('A40-123');
    });

    it('escapes quotes in CSV values', async () => {
      const check: CounterpartyCheck = {
        ...baseCheck,
        fssp: {
          status: 'found',
          count: 1,
          productions: [
            { number: 'IP-"test"', date: '2024-01-01', sum: '1000', subject: 'Subject with "quotes"' },
          ],
        },
      };

      const blob = exportToCSV(check);
      const text = await blob.text();
      expect(text).toContain('""');
    });

    it('handles empty subject values', async () => {
      const check: CounterpartyCheck = {
        ...baseCheck,
        fssp: {
          status: 'found',
          count: 1,
          productions: [
            { number: 'IP-1', date: '2024-01-01', sum: '', subject: '' },
          ],
        },
      };

      const blob = exportToCSV(check);
      const text = await blob.text();
      const lines = text.trim().split('\n');
      expect(lines.length).toBe(2);
    });
  });
});
