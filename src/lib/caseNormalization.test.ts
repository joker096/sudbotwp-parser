import { describe, expect, it } from 'vitest';
import { normalizeParsedCase, normalizeParsedCases } from './caseNormalization';

describe('caseNormalization', () => {
  it('parses events and appeals from JSON strings', () => {
    const result = normalizeParsedCase({
      id: 'case-1',
      number: '2-123/2024',
      court: 'Тестовый суд',
      status: '',
      date: '01.01.2024',
      category: 'Гражданское',
      judge: 'Судья',
      plaintiff: 'Истец',
      defendant: 'Ответчик',
      link: 'https://example.com',
      events: '[{"date":"02.02.2024","time":"10:00","name":"Заседание"}]' as any,
      appeals: '[{"id":1,"type":"Апелляция","applicant":"Истец","court":"Суд","date":"03.03.2024","result":"Принято"}]' as any,
    });

    expect(result.status).toBe('active');
    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('Заседание');
    expect((result.events[0] as any).id).toBe('case-1-evt-0');
    expect(result.appeals).toHaveLength(1);
    expect(result.appeals[0].type).toBe('Апелляция');
  });

  it('returns empty arrays for invalid payloads', () => {
    const result = normalizeParsedCase({
      id: 'case-2',
      number: '2-124/2024',
      court: 'Тестовый суд',
      status: 'active',
      date: '01.01.2024',
      category: 'Гражданское',
      judge: 'Судья',
      plaintiff: 'Истец',
      defendant: 'Ответчик',
      link: 'https://example.com',
      events: 'not-json' as any,
      appeals: null as any,
    });

    expect(result.events).toEqual([]);
    expect(result.appeals).toEqual([]);
  });

  it('normalizes case collections safely', () => {
    const result = normalizeParsedCases([
      {
        id: 'case-3',
        number: '2-125/2024',
        court: 'Тестовый суд',
        status: 'active',
        date: '01.01.2024',
        category: 'Гражданское',
        judge: 'Судья',
        plaintiff: 'Истец',
        defendant: 'Ответчик',
        link: 'https://example.com',
        events: [],
        appeals: [],
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe('2-125/2024');
  });
});
