/**
 * Генерация Excel/CSV из результатов проверки контрагента
 */

import * as XLSX from 'xlsx';
import type { CounterpartyCheck } from './counterparty';
import type { RosstatResult } from './rosstat';
import type { RiskScore } from './counterparty';

export function exportToExcel(
  check: CounterpartyCheck,
  rosstat: RosstatResult | null,
  riskScore: RiskScore | null
): Blob {
  const wb = XLSX.utils.book_new();

  // Лист 1: ЕГРЮЛ
  if (check.egrul?.data) {
    const egrulData = [
      ['Поле', 'Значение'],
      ['ИНН', check.egrul.data.inn],
      ['ОГРН', check.egrul.data.ogrn],
      ['Название', check.egrul.data.name || check.egrul.data.fullName],
      ['Директор', check.egrul.data.director],
      ['Учредитель', check.egrul.data.founder],
      ['Адрес', check.egrul.data.address],
      ['Статус', check.egrul.data.status],
      ['ОКВЭД', check.egrul.data.okved],
      ['Капитал', check.egrul.data.capital],
    ];
    const wsEgrul = XLSX.utils.aoa_to_sheet(egrulData);
    XLSX.utils.book_append_sheet(wb, wsEgrul, 'ЕГРЮЛ');
  }

  // Лист 2: ФССП
  if (check.fssp) {
    const fsspData = [
      ['Номер', 'Дата', 'Сумма', 'Предмет'],
      ...check.fssp.productions.map((p) => [
        p.number, p.date, p.sum || '', p.subject || '',
      ]),
    ];
    const wsFssp = XLSX.utils.aoa_to_sheet(fsspData);
    XLSX.utils.book_append_sheet(wb, wsFssp, 'ФССП');
  }

  // Лист 3: ЕФРСБ
  if (check.efrsb) {
    const efrsbData = [
      ['Номер дела', 'Дата', 'Суд', 'Статус'],
      ...check.efrsb.cases.map((c) => [
        c.number, c.date, c.court || '', c.status || '',
      ]),
    ];
    const wsEfrsb = XLSX.utils.aoa_to_sheet(efrsbData);
    XLSX.utils.book_append_sheet(wb, wsEfrsb, 'ЕФРСБ');
  }

  // Лист 4: Росстат
  if (rosstat?.reports) {
    const rosstatData = [
      ['Год', 'Активы', 'Обязательства', 'Капитал', 'Выручка', 'Прибыль', 'Дебиторка', 'Кредиторка'],
      ...rosstat.reports.map((r) => [
        r.year, r.assets || '', r.liabilities || '', r.capital || '',
        r.revenue || '', r.profit || '', r.receivables || '', r.payables || '',
      ]),
    ];
    const wsRosstat = XLSX.utils.aoa_to_sheet(rosstatData);
    XLSX.utils.book_append_sheet(wb, wsRosstat, 'Росстат');
  }

  // Лист 5: Риск
  if (riskScore) {
    const riskData = [
      ['Оценка риска', `${riskScore.total}%`],
      ['Уровень', riskScore.label],
      ['', ''],
      ['Фактор', 'Вес'],
      ...riskScore.factors.map((f) => [f.name, `+${f.weight}%`]),
    ];
    const wsRisk = XLSX.utils.aoa_to_sheet(riskData);
    XLSX.utils.book_append_sheet(wb, wsRisk, 'Риск');
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function exportToCSV(check: CounterpartyCheck): Blob {
  const rows = [
    ['Тип', 'Номер/Название', 'Дата', 'Дополнительно'],
  ];

  if (check.fssp?.productions) {
    check.fssp.productions.forEach((p) => {
      rows.push(['ФССП', p.number, p.date, p.subject || '']);
    });
  }

  if (check.efrsb?.cases) {
    check.efrsb.cases.forEach((c) => {
      rows.push(['ЕФРСБ', c.number, c.date, c.court || '']);
    });
  }

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}
