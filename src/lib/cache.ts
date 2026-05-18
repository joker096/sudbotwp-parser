/**
 * Работа с кэшем проверок контрагентов
 * Таблица: counterparty_checks (TTL 24 часа)
 */

import { supabase } from './supabase';
import type { CounterpartyCheck, RiskScore } from './counterparty';
import type { RosstatResult } from './rosstat';

export interface CachedCheck {
  inn: string;
  egrul: CounterpartyCheck['egrul'];
  fssp: CounterpartyCheck['fssp'];
  efrsb: CounterpartyCheck['efrsb'];
  rosstat: RosstatResult | null;
  riskScore: RiskScore | null;
  checkedAt: string;
  expiresAt: string;
}

/**
 * Получить кэшированный результат по ИНН
 * Возвращает null если нет кэша или он протух
 */
export async function getCachedCheck(inn: string): Promise<CachedCheck | null> {
  const { data, error } = await supabase
    .from('counterparty_checks')
    .select('*')
    .eq('inn', inn)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;

  return {
    inn: data.inn,
    egrul: data.egrul_data,
    fssp: data.fssp_data,
    efrsb: data.efrsb_data,
    rosstat: data.rosstat_data,
    riskScore: data.risk_score,
    checkedAt: data.checked_at,
    expiresAt: data.expires_at,
  };
}

/**
 * Сохранить результат проверки в кэш
 */
export async function saveCheckCache(
  inn: string,
  check: CounterpartyCheck,
  rosstat: RosstatResult | null,
  riskScore: RiskScore | null
): Promise<void> {
  await supabase.from('counterparty_checks').upsert({
    inn,
    egrul_data: check.egrul,
    fssp_data: check.fssp,
    efrsb_data: check.efrsb,
    rosstat_data: rosstat,
    risk_score: riskScore,
    checked_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}

/**
 * Инвалидировать (удалить) кэш по ИНН
 */
export async function invalidateCache(inn: string): Promise<void> {
  await supabase.from('counterparty_checks').delete().eq('inn', inn);
}
