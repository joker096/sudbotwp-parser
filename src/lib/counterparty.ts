/**
 * API layer для проверки контрагентов
 * Обёртки над Supabase Edge Functions
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function getFunctionUrl(name: string): string {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

async function invokeFunction<T>(name: string, body: unknown): Promise<T> {
  const response = await fetch(getFunctionUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Function ${name} failed: ${response.status}`);
  }

  return response.json();
}

// ===== ЕГРЮЛ =====

export interface EgrulData {
  inn: string;
  ogrn: string;
  name: string;
  fullName: string;
  address: string;
  director: string;
  founder: string;
  capital: string;
  okved: string;
  okpo: string;
  oktmo: string;
  status: string;
  regDate: string;
  kpp: string;
  ogrnDate: string;
}

export interface EgrulResponse {
  success: boolean;
  data: EgrulData;
  raw: Record<string, unknown>;
}

export async function checkEgrul(inn: string): Promise<EgrulResponse> {
  return invokeFunction('check-egrul', { inn });
}

// ===== ФССП =====

export interface FsspProduction {
  number: string;
  date: string;
  debtor: string;
  type: string;
  subject: string;
  department: string;
  bailiff: string;
  endDate?: string;
  sum?: string;
}

export interface FsspResponse {
  status: 'found' | 'not_found' | 'error';
  count: number;
  productions: FsspProduction[];
  error?: string;
}

export async function checkFssp(inn: string): Promise<FsspResponse> {
  return invokeFunction('check-fssp', { inn });
}

// ===== ЕФРСБ =====

export interface EfrsbCase {
  number: string;
  type: string;
  date: string;
  court: string;
  judge: string;
  status: string;
}

export interface EfrsbRegistryItem {
  creditor: string;
  amount: string;
  status: string;
}

export interface EfrsbResponse {
  hasBankruptcy: boolean;
  cases: EfrsbCase[];
  registry: EfrsbRegistryItem[];
  error?: string;
}

export async function checkEfrsb(inn: string): Promise<EfrsbResponse> {
  return invokeFunction('check-efrsb', { inn });
}

// ===== Комплексная проверка =====

export interface CounterpartyCheck {
  inn: string;
  egrul: EgrulResponse | null;
  fssp: FsspResponse | null;
  efrsb: EfrsbResponse | null;
  timestamp: string;
}

export async function checkCounterparty(inn: string): Promise<CounterpartyCheck> {
  const [egrul, fssp, efrsb] = await Promise.allSettled([
    checkEgrul(inn),
    checkFssp(inn),
    checkEfrsb(inn),
  ]);

  return {
    inn,
    egrul: egrul.status === 'fulfilled' ? egrul.value : null,
    fssp: fssp.status === 'fulfilled' ? fssp.value : null,
    efrsb: efrsb.status === 'fulfilled' ? efrsb.value : null,
    timestamp: new Date().toISOString(),
  };
}

// ===== Риск-скоринг =====

export interface RiskFactor {
  name: string;
  weight: number; // 0-100
  description: string;
}

export interface RiskScore {
  total: number; // 0-100
  level: 'low' | 'medium' | 'high';
  label: string;
  factors: RiskFactor[];
}

export function calculateRiskScore(check: CounterpartyCheck): RiskScore {
  const factors: RiskFactor[] = [];
  let total = 0;

  // Фактор 1: Исполнительные производства
  if (check.fssp && check.fssp.count > 0) {
    const weight = Math.min(check.fssp.count * 10, 30);
    factors.push({
      name: 'Исполнительные производства',
      weight,
      description: `${check.fssp.count} активных ИП`,
    });
    total += weight;
  }

  // Фактор 2: Банкротство
  if (check.efrsb && check.efrsb.hasBankruptcy) {
    const weight = 50;
    factors.push({
      name: 'Банкротство',
      weight,
      description: 'Найдены дела о банкротстве',
    });
    total += weight;
  }

  // Фактор 3: Статус компании
  if (check.egrul?.data) {
    const status = check.egrul.data.status?.toLowerCase() || '';
    if (status.includes('ликвид') || status.includes('прекрат')) {
      factors.push({
        name: 'Ликвидация',
        weight: 40,
        description: 'Компания в процессе ликвидации',
      });
      total += 40;
    } else if (status.includes('реорган')) {
      factors.push({
        name: 'Реорганизация',
        weight: 20,
        description: 'Компания в процессе реорганизации',
      });
      total += 20;
    }
  }

  // Фактор 4: Частая смена директора (если есть история)
  // Пока упрощённо — проверка на наличие данных

  // Фактор 5: Нулевой капитал
  if (check.egrul?.data && (!check.egrul.data.capital || check.egrul.data.capital === '0')) {
    factors.push({
      name: 'Нулевой уставной капитал',
      weight: 15,
      description: 'Уставной капитал не указан или равен 0',
    });
    total += 15;
  }

  // Фактор 6: Массовый адрес (упрощённая проверка)
  if (check.egrul?.data?.address) {
    const massAddressKeywords = ['балашиха', 'москва', 'подольск', 'люберцы', 'химки'];
    const addr = check.egrul.data.address.toLowerCase();
    // Если адрес без номера офиса — потенциально массовый
    if (!addr.match(/офис|кв|комн|этаж/i)) {
      factors.push({
        name: 'Потенциально массовый адрес',
        weight: 10,
        description: 'Адрес без указания офиса/помещения',
      });
      total += 10;
    }
  }

  // Ограничиваем 100
  total = Math.min(total, 100);

  let level: 'low' | 'medium' | 'high';
  let label: string;

  if (total < 20) {
    level = 'low';
    label = 'Низкий риск';
  } else if (total < 50) {
    level = 'medium';
    label = 'Средний риск';
  } else {
    level = 'high';
    label = 'Высокий риск';
  }

  return {
    total,
    level,
    label,
    factors,
  };
}

// ===== КАД (Картотека арбитражных дел) =====

export interface KadCase {
  number: string;
  court: string;
  judge: string;
  plaintiff: string;
  defendant: string;
  category: string;
  date: string;
  status: string;
  sum: string;
  url: string;
}

export interface KadStats {
  totalCases: number;
  asPlaintiff: number;
  asDefendant: number;
  asThirdParty: number;
  totalSum: number;
  topOpponents: Array<{ name: string; count: number; sum: number }>;
  topJudges: Array<{ name: string; count: number; satisfied: number; denied: number }>;
  categories: Array<{ name: string; count: number }>;
  years: Array<{ year: string; count: number }>;
}

export interface KadSearchResponse {
  cases: KadCase[];
  stats?: KadStats;
  total: number;
  page: number;
}

export async function searchKad(query: string, type: 'case_number' | 'party' | 'judge' = 'case_number', page = 1): Promise<KadSearchResponse> {
  return invokeFunction('search-kad', { query, type, page });
}

export async function searchKadByCompany(inn?: string, companyName?: string, role = 'all', page = 1): Promise<KadSearchResponse> {
  return invokeFunction('kad-company-search', { inn, companyName, role, page });
}

// ===== Росстат =====

export interface RosstatResponse {
  success: boolean;
  company: { name: string; inn: string; ogrn: string };
  reports: Array<{
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
  }>;
}

export async function checkRosstat(inn: string): Promise<RosstatResponse> {
  return invokeFunction('check-rosstat', { inn });
}

// ===== ГАС Правосудие =====

export interface CivilCase {
  number: string;
  court: string;
  date: string;
  plaintiff: string;
  defendant: string;
  judge: string;
  category: string;
  url: string;
  status: string;
}

export interface CivilCasesResponse {
  success: boolean;
  cases: CivilCase[];
  total: number;
}

export async function searchCivilCases(query: string, type: 'party' | 'case_number' = 'party'): Promise<CivilCasesResponse> {
  return invokeFunction('search-civil-cases', { query, type });
}
