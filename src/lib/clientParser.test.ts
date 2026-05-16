import { describe, it, expect } from 'vitest';
import { parseCaseHtml } from './clientParser';

function mockHtml(overrides?: {
  caseNumber?: string;
  heading?: string;
  infoRows?: string;
  eventsRows?: string;
  partiesRows?: string;
}): string {
  const cn = overrides?.caseNumber || '2-1234/2024';
  const hd = overrides?.heading || '';
  const info = overrides?.infoRows || `
    <tr><td>Дата поступления</td><td>15.01.2024</td></tr>
    <tr><td>Категория дела</td><td>Гражданское дело</td></tr>
    <tr><td>Судья</td><td>Иванов И.И.</td></tr>
    <tr><td>Результат рассмотрения</td><td>Удовлетворен</td></tr>
  `;
  const ev = overrides?.eventsRows || `
    <tr><th>Событие</th><th>Дата</th><th>Время</th><th>Место</th><th>Результат</th></tr>
    <tr><td>Судебное заседание</td><td>15.02.2024</td><td>10:00</td><td>Зал 1</td><td>Отложено</td></tr>
  `;
  const pt = overrides?.partiesRows || `
    <tr><td>Истец</td><td>ООО "Ромашка"</td></tr>
    <tr><td>Ответчик</td><td>Петров П.П.</td></tr>
  `;

  return `<html><head><title>Дело</title></head><body>
    ${hd ? `<div class="heading heading_caps heading_title">${hd}</div>` : ''}
    <div class="casenumber">№ ${cn}</div>
    <div id="cont1"><table id="tablcont">${info}</table></div>
    <div id="cont2"><table id="tablcont">${ev}</table></div>
    <div id="cont3"><table id="tablcont">${pt}</table></div>
  </body></html>`;
}

describe('parseCaseHtml', () => {
  it('parses case number from .casenumber element', () => {
    const result = parseCaseHtml(
      mockHtml({ caseNumber: '33-4567/2024' }),
      'https://example.com'
    );
    expect(result.number).toBe('№ 33-4567/2024');
  });

  it('detects court from URL via courtMap', () => {
    const result = parseCaseHtml(
      '<html><body></body></html>',
      'https://oblsud-lo.sudrf.ru/modules.php?name=sud_delo'
    );
    expect(result.court).toBe('Ленинградский областной суд');
  });

  it('detects court from heading when present', () => {
    const result = parseCaseHtml(
      mockHtml({ heading: 'Ленинградский областной суд' }),
      'https://example.com'
    );
    expect(result.court).toBe('Ленинградский областной суд');
  });

  it('parses main info table correctly', () => {
    const result = parseCaseHtml(mockHtml(), 'https://example.com');
    expect(result.date).toBe('15.01.2024');
    expect(result.category).toBe('Гражданское дело');
    expect(result.judge).toBe('Иванов И.И.');
    expect(result.status).toBe('Удовлетворен');
  });

  it('parses parties from cont3', () => {
    const result = parseCaseHtml(mockHtml(), 'https://example.com');
    expect(result.plaintiff).toBe('ООО "Ромашка"');
    expect(result.defendant).toBe('Петров П.П.');
  });

  it('parses events from cont2', () => {
    const result = parseCaseHtml(mockHtml(), 'https://example.com');
    expect(result.events.length).toBe(1);
    expect(result.events[0].date).toBe('15.02.2024');
    expect(result.events[0].time).toBe('10:00');
    expect(result.events[0].name).toBe('Судебное заседание');
    expect(result.events[0].location).toBe('Зал 1');
    expect(result.events[0].result).toBe('Отложено');
  });

  it('adds fallback event when events table is empty', () => {
    const html = '<html><body><div class="casenumber">№ 1/2024</div></body></html>';
    const result = parseCaseHtml(html, 'https://example.com');
    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('Судебное событие');
  });

  it('adds fallback appeal when appeals table is empty', () => {
    const html = '<html><body><div class="casenumber">№ 1/2024</div></body></html>';
    const result = parseCaseHtml(html, 'https://example.com');
    expect(result.appeals).toHaveLength(1);
    expect(result.appeals[0].type).toBe('Нет данных об обжаловании');
  });

  it('returns defaults for completely empty HTML', () => {
    const result = parseCaseHtml('<html><body></body></html>', 'https://example.com');
    expect(result.number).toBe('Неизвестный номер');
    expect(result.court).toBe('Неизвестный суд');
    expect(result.status).toBe('Статус не указан');
    expect(result.date).toBe('Дата не указана');
    expect(result.judge).toBe('Судья не указан');
    expect(result.plaintiff).toBe('Информация скрыта');
    expect(result.defendant).toBe('Информация скрыта');
  });

  it('parses case number from regex fallback when no .casenumber', () => {
    const html = '<html><body><p>ДЕЛО № 55-6789/2024</p></body></html>';
    const result = parseCaseHtml(html, 'https://example.com');
    expect(result.number).toBe('55-6789/2024');
  });

  it('skips header row in events table', () => {
    const html = `
      <html><body>
        <div class="casenumber">№ 1/2024</div>
        <div id="cont2"><table id="tablcont">
          <tr><th>Событие</th><th>Дата</th><th>Время</th><th>Место</th><th>Результат</th></tr>
          <tr><td>Заседание 1</td><td>01.03.2024</td><td>11:00</td><td></td><td></td></tr>
          <tr><td>Заседание 2</td><td>15.04.2024</td><td>14:30</td><td>Зал 2</td><td></td></tr>
        </table></div>
      </body></html>
    `;
    const result = parseCaseHtml(html, 'https://example.com');
    expect(result.events).toHaveLength(2);
    expect(result.events[0].name).toBe('Заседание 1');
    expect(result.events[1].name).toBe('Заседание 2');
  });

  it('stores the original URL in link field', () => {
    const url = 'https://example.sudrf.ru/case/123';
    const result = parseCaseHtml('<html><body><div class="casenumber">№ 1/2024</div></body></html>', url);
    expect(result.link).toBe(url);
  });

  it('handles category with arrow entities', () => {
    const html = `
      <html><body>
        <div class="casenumber">№ 1/2024</div>
        <div id="cont1"><table id="tablcont">
          <tr><td>Категория дела</td><td>Споры &rarr; Договорные &rarr; Займы</td></tr>
        </table></div>
      </body></html>
    `;
    const result = parseCaseHtml(html, 'https://example.com');
    expect(result.category).toContain('→');
  });
});

describe('events and appeals normalization', () => {
  function normalizeEvents(events: unknown): any[] {
    if (typeof events === 'string') {
      try { return JSON.parse(events); }
      catch { return []; }
    }
    return Array.isArray(events) ? events : [];
  }

  function normalizeAppeals(appeals: unknown): any[] {
    if (typeof appeals === 'string') {
      try { return JSON.parse(appeals); }
      catch { return []; }
    }
    return Array.isArray(appeals) ? appeals : [];
  }

  it('handles events as JS array', () => {
    const events = [{ date: '01.01.2024', name: 'Test' }];
    expect(normalizeEvents(events)).toEqual(events);
  });

  it('handles events as JSON string', () => {
    const events = '[{"date":"01.01.2024","name":"Test"}]';
    const result = normalizeEvents(events);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('01.01.2024');
  });

  it('returns empty array for null events', () => {
    expect(normalizeEvents(null)).toEqual([]);
  });

  it('returns empty array for undefined events', () => {
    expect(normalizeEvents(undefined)).toEqual([]);
  });

  it('handles appeals as JS array', () => {
    const appeals = [{ id: 1, type: 'Апелляция', result: 'Отказано' }];
    expect(normalizeAppeals(appeals)).toEqual(appeals);
  });

  it('handles appeals as JSON string', () => {
    const appeals = '[{"id":1,"type":"Апелляция","result":"Отказано"}]';
    const result = normalizeAppeals(appeals);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Апелляция');
  });

  it('returns empty array for malformed JSON string', () => {
    expect(normalizeEvents('not json')).toEqual([]);
    expect(normalizeAppeals('not json')).toEqual([]);
  });

  it('round-trips events through JSON.stringify back to array', () => {
    const original = [{ date: '01.01.2024', name: 'Test' }];
    const stringified = JSON.stringify(original);
    const reparsed = JSON.parse(stringified);
    expect(reparsed).toEqual(original);
  });

  it('handles empty events array round-trip', () => {
    const original: any[] = [];
    const stringified = JSON.stringify(original);
    expect(JSON.parse(stringified)).toEqual([]);
  });
});
