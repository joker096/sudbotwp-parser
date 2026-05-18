/**
 * CounterpartyDashboard — Компонент дашборда проверки контрагента
 * Отображает данные из ЕГРЮЛ, ФССП, ЕФРСБ, риск-скоринг
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building, Search, Loader2, AlertCircle, CheckCircle, XCircle,
  Scale, Gavel, TrendingUp, TrendingDown, AlertTriangle,
  User, MapPin, Calendar, FileText, Shield, Briefcase,
  ChevronDown, ChevronUp, ExternalLink, Download, Users, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  checkCounterparty,
  checkRosstat,
  calculateRiskScore,
  CounterpartyCheck,
  RiskScore,
  EgrulData,
  FsspProduction,
  EfrsbCase,
} from '../lib/counterparty';
import type { RosstatResult } from '../lib/rosstat';
import { useToast } from '../hooks/useToast';
import RosstatSection from './RosstatSection';
import AffiliatesSection from './AffiliatesSection';
import ExportButton from './ExportButton';
import { buildAffiliateGraph, type AffiliateGraph } from '../lib/affiliates';
import { getCachedCheck, saveCheckCache } from '../lib/cache';

export default function CounterpartyDashboard() {
  const { inn: paramInn } = useParams<{ inn: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [inn, setInn] = useState(paramInn || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CounterpartyCheck | null>(null);
  const [riskScore, setRiskScore] = useState<RiskScore | null>(null);
  const [rosstatResult, setRosstatResult] = useState<RosstatResult | null>(null);
  const [affiliateGraph, setAffiliateGraph] = useState<AffiliateGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['egrul', 'risk']));

  useEffect(() => {
    if (paramInn && paramInn.length >= 10) {
      handleSearch(paramInn);
    }
  }, [paramInn]);

  const handleSearch = async (searchInn: string, forceRefresh = false) => {
    const cleanInn = searchInn.replace(/\D/g, '');
    if (cleanInn.length !== 10 && cleanInn.length !== 12) {
      setError('Введите корректный ИНН (10 цифр для компании, 12 для физлица/ИП)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setRiskScore(null);
    setRosstatResult(null);
    setAffiliateGraph(null);

    try {
      // Проверяем кэш (если не forceRefresh)
      if (!forceRefresh) {
        const cached = await getCachedCheck(cleanInn);
        if (cached) {
          setResult({
            inn: cached.inn,
            egrul: cached.egrul,
            fssp: cached.fssp,
            efrsb: cached.efrsb,
            timestamp: cached.checkedAt,
          });
          setRiskScore(cached.riskScore);
          setRosstatResult(cached.rosstat);
          if (cached.egrul?.data) {
            try {
              const graph = buildAffiliateGraph(cached.inn, cached.egrul.data);
              setAffiliateGraph(graph);
            } catch {
              // Игнорируем ошибки аффилированности
            }
          }
          showToast('Данные загружены из кэша');
          navigate(`/counterparty/${cleanInn}`, { replace: true });
          setIsLoading(false);
          return;
        }
      }

      showToast('Проверяем контрагента...');
      const [check, rosstat] = await Promise.allSettled([
        checkCounterparty(cleanInn),
        checkRosstat(cleanInn),
      ]);

      let finalCheck: CounterpartyCheck | null = null;
      let finalRisk: RiskScore | null = null;
      let finalRosstat: RosstatResult | null = null;

      if (check.status === 'fulfilled') {
        finalCheck = check.value;
        setResult(check.value);
        const risk = calculateRiskScore(check.value);
        finalRisk = risk;
        setRiskScore(risk);

        // Строим граф аффилированности из ЕГРЮЛ
        if (check.value.egrul?.data) {
          try {
            const graph = buildAffiliateGraph(check.value.inn, check.value.egrul.data);
            setAffiliateGraph(graph);
          } catch {
            // Игнорируем ошибки аффилированности
          }
        }
      }

      if (rosstat.status === 'fulfilled' && rosstat.value.success) {
        finalRosstat = rosstat.value;
        setRosstatResult(rosstat.value);
      }

      // Сохраняем в кэш
      if (finalCheck) {
        await saveCheckCache(cleanInn, finalCheck, finalRosstat, finalRisk);
      }

      // Обновляем URL
      navigate(`/counterparty/${cleanInn}`, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка при проверке';
      setError(message);
      showToast('Ошибка при проверке контрагента');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(inn);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-emerald-500 bg-emerald-50 border-emerald-200';
      case 'medium': return 'text-amber-500 bg-amber-50 border-amber-200';
      case 'high': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="w-8 h-8 text-emerald-500" />;
      case 'medium': return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case 'high': return <XCircle className="w-8 h-8 text-red-500" />;
      default: return <Shield className="w-8 h-8 text-slate-400" />;
    }
  };

  const handleDownloadReport = () => {
    if (!result || !riskScore) {
      showToast('Сначала выполните проверку');
      return;
    }

    const html = generateReportHtml(result, riskScore);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${result.inn}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Отчёт скачан. Откройте в браузере и нажмите Ctrl+P для сохранения в PDF.');
  };

  function generateReportHtml(check: CounterpartyCheck, risk: RiskScore): string {
    const egrul = check.egrul?.data;
    const now = new Date().toLocaleString('ru-RU');

    const fsspRows = check.fssp?.productions?.map(p => `
      <tr><td>${p.number}</td><td>${p.date}</td><td>${p.sum || '—'}</td><td>${p.subject || '—'}</td></tr>
    `).join('') || '<tr><td colspan="4" class="text-center">Не найдено</td></tr>';

    const efrsbRows = check.efrsb?.cases?.map(c => `
      <tr><td>${c.number}</td><td>${c.date}</td><td>${c.status || '—'}</td></tr>
    `).join('') || '<tr><td colspan="3" class="text-center">Не найдено</td></tr>';

    const riskFactors = risk.factors.map(f => `
      <li><strong>${f.name}</strong>: ${f.description} (+${f.weight}%)</li>
    `).join('') || '<li>Факторов риска не выявлено</li>';

    return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Отчёт по проверке контрагента ИНН ${check.inn}</title>
<style>
body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; background: #f8f9fa; color: #333; }
.container { max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
h1 { font-size: 24px; margin-bottom: 8px; color: #1a1a2e; }
.subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
.section { margin-bottom: 32px; }
.section h2 { font-size: 18px; color: #1a1a2e; border-bottom: 2px solid #5856d6; padding-bottom: 8px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e9ecef; }
th { background: #f8f9fa; font-weight: 600; }
.risk-box { padding: 16px; border-radius: 12px; margin-bottom: 16px; }
.risk-low { background: #d1fae5; color: #065f46; }
.risk-medium { background: #fef3c7; color: #92400e; }
.risk-high { background: #fee2e2; color: #991b1b; }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #999; font-size: 12px; text-align: center; }
@media print { body { background: #fff; margin: 0; } .container { box-shadow: none; max-width: 100%; } }
</style>
</head>
<body>
<div class="container">
  <h1>Отчёт по проверке контрагента</h1>
  <p class="subtitle">ИНН: ${check.inn} | Дата формирования: ${now} | Сгенерировано через Sud</p>

  <div class="section">
    <h2>Оценка риска</h2>
    <div class="risk-box ${risk.level === 'low' ? 'risk-low' : risk.level === 'medium' ? 'risk-medium' : 'risk-high'}">
      <strong>${risk.label}</strong> — ${risk.total}% из 100%
    </div>
    <ul>${riskFactors}</ul>
  </div>

  <div class="section">
    <h2>Данные из ЕГРЮЛ</h2>
    <table>
      <tr><th>Поле</th><th>Значение</th></tr>
      <tr><td>Название</td><td>${egrul?.fullName || egrul?.name || '—'}</td></tr>
      <tr><td>ИНН</td><td>${egrul?.inn || check.inn}</td></tr>
      <tr><td>ОГРН</td><td>${egrul?.ogrn || '—'}</td></tr>
      <tr><td>КПП</td><td>${egrul?.kpp || '—'}</td></tr>
      <tr><td>Директор</td><td>${egrul?.director || '—'}</td></tr>
      <tr><td>Учредитель</td><td>${egrul?.founder || '—'}</td></tr>
      <tr><td>Адрес</td><td>${egrul?.address || '—'}</td></tr>
      <tr><td>ОКВЭД</td><td>${egrul?.okved || '—'}</td></tr>
      <tr><td>Уставной капитал</td><td>${egrul?.capital || '—'}</td></tr>
      <tr><td>Статус</td><td>${egrul?.status || '—'}</td></tr>
      <tr><td>Дата регистрации</td><td>${egrul?.regDate || '—'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Исполнительные производства (ФССП)</h2>
    <p>Найдено: ${check.fssp?.count || 0}</p>
    <table>
      <tr><th>Номер</th><th>Дата</th><th>Сумма</th><th>Предмет</th></tr>
      ${fsspRows}
    </table>
  </div>

  <div class="section">
    <h2>Банкротство (ЕФРСБ)</h2>
    <p>${check.efrsb?.hasBankruptcy ? 'Найдены дела о банкротстве' : 'Дела о банкротстве не найдены'}</p>
    <table>
      <tr><th>Номер дела</th><th>Дата</th><th>Статус</th></tr>
      ${efrsbRows}
    </table>
  </div>

  <div class="footer">
    Отчёт сгенерирован автоматически сервисом Sud (sud.cvr.name)<br>
    Данные получены из открытых источников: ФНС, ФССП, ЕФРСБ, КАД
  </div>
</div>
</body>
</html>`;
  }

  return (
    <div className="space-y-6 transition-colors duration-300 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Проверка контрагента</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Проверьте компанию или ИП по ИНН через ЕГРЮЛ, ФССП, ЕФРСБ
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={inn}
              onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="Введите ИНН компании (10 цифр) или ИП (12 цифр)"
              className="w-full bg-slate-50 dark:bg-slate-800 py-4 pl-12 pr-4 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white py-4 px-8 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            {isLoading ? 'Проверка...' : 'Проверить'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => handleSearch(inn)}
                disabled={isLoading}
                className="mt-2 text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline underline-offset-2"
              >
                Повторить попытку
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleSearch(inn, true)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-accent/30 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Обновить данные
              </button>
              {result && (
                <ExportButton
                  check={result}
                  rosstat={rosstatResult}
                  riskScore={riskScore}
                />
              )}
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-accent/30 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                HTML отчёт
              </button>
            </div>

            {/* Risk Score Card */}
            {riskScore && (
              <SectionCard
                title="Оценка риска"
                icon={getRiskIcon(riskScore.level)}
                sectionKey="risk"
                expanded={expandedSections.has('risk')}
                onToggle={() => toggleSection('risk')}
              >
                <div className="space-y-4">
                  <div className={`p-6 rounded-2xl border ${getRiskColor(riskScore.level)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">{riskScore.label}</span>
                      <span className="text-3xl font-bold">{riskScore.total}%</span>
                    </div>
                    <div className="w-full bg-white/50 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          riskScore.level === 'low' ? 'bg-emerald-500' :
                          riskScore.level === 'medium' ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${riskScore.total}%` }}
                      />
                    </div>
                  </div>

                  {riskScore.factors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Факторы риска:</h4>
                      {riskScore.factors.map((factor, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <div>
                            <p className="font-medium text-sm text-slate-900 dark:text-white">{factor.name}</p>
                            <p className="text-xs text-slate-500">{factor.description}</p>
                          </div>
                          <span className="text-sm font-bold text-red-500">+{factor.weight}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* EGRUL Data */}
            {result.egrul?.data && (
              <SectionCard
                title="Данные из ЕГРЮЛ"
                icon={<Building className="w-6 h-6 text-accent" />}
                sectionKey="egrul"
                expanded={expandedSections.has('egrul')}
                onToggle={() => toggleSection('egrul')}
              >
                <EgrulDetails data={result.egrul.data} />
              </SectionCard>
            )}

            {/* Rosstat Data */}
            {rosstatResult && (
              <SectionCard
                title="Бухгалтерская отчётность (Росстат)"
                icon={<TrendingUp className="w-6 h-6 text-accent" />}
                sectionKey="rosstat"
                expanded={expandedSections.has('rosstat')}
                onToggle={() => toggleSection('rosstat')}
              >
                <RosstatSection data={rosstatResult} />
              </SectionCard>
            )}

            {/* Affiliates Data */}
            {affiliateGraph && (
              <SectionCard
                title="Связи (учредители)"
                icon={<Users className="w-6 h-6 text-accent" />}
                sectionKey="affiliates"
                expanded={expandedSections.has('affiliates')}
                onToggle={() => toggleSection('affiliates')}
              >
                <AffiliatesSection graph={affiliateGraph} />
              </SectionCard>
            )}

            {/* FSSP Data */}
            {result.fssp && (
              <SectionCard
                title={`Исполнительные производства (${result.fssp.count})`}
                icon={<Scale className="w-6 h-6 text-accent" />}
                sectionKey="fssp"
                expanded={expandedSections.has('fssp')}
                onToggle={() => toggleSection('fssp')}
              >
                {result.fssp.count > 0 ? (
                  <div className="space-y-3">
                    {result.fssp.productions.map((prod, i) => (
                      <FsspCard key={i} production={prod} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Исполнительных производств не найдено</p>
                  </div>
                )}
              </SectionCard>
            )}

            {/* EFRSB Data */}
            {result.efrsb && (
              <SectionCard
                title="Банкротство"
                icon={<Gavel className="w-6 h-6 text-accent" />}
                sectionKey="efrsb"
                expanded={expandedSections.has('efrsb')}
                onToggle={() => toggleSection('efrsb')}
              >
                {result.efrsb.hasBankruptcy ? (
                  <div className="space-y-3">
                    {result.efrsb.cases.map((caseItem, i) => (
                      <EfrsbCard key={i} caseItem={caseItem} />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Дела о банкротстве не найдены</p>
                  </div>
                )}
              </SectionCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Sub-components =====

function SectionCard({ title, icon, sectionKey, expanded, onToggle, children }: {
  title: string;
  icon: React.ReactNode;
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EgrulDetails({ data }: { data: EgrulData }) {
  const fields = [
    { label: 'ИНН', value: data.inn, icon: <Briefcase className="w-4 h-4" /> },
    { label: 'ОГРН', value: data.ogrn, icon: <FileText className="w-4 h-4" /> },
    { label: 'КПП', value: data.kpp, icon: <FileText className="w-4 h-4" /> },
    { label: 'Полное наименование', value: data.fullName || data.name, icon: <Building className="w-4 h-4" /> },
    { label: 'Директор', value: data.director, icon: <User className="w-4 h-4" /> },
    { label: 'Учредитель', value: data.founder, icon: <User className="w-4 h-4" /> },
    { label: 'Юридический адрес', value: data.address, icon: <MapPin className="w-4 h-4" /> },
    { label: 'ОКВЭД', value: data.okved, icon: <Briefcase className="w-4 h-4" /> },
    { label: 'Уставной капитал', value: data.capital, icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Статус', value: data.status, icon: <Shield className="w-4 h-4" /> },
    { label: 'Дата регистрации', value: data.regDate, icon: <Calendar className="w-4 h-4" /> },
    { label: 'Дата присвоения ОГРН', value: data.ogrnDate, icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {fields.map((field, i) => (
        field.value ? (
          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-accent mt-0.5">{field.icon}</div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{field.label}</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{field.value}</p>
            </div>
          </div>
        ) : null
      ))}
    </div>
  );
}

function FsspCard({ production }: { production: FsspProduction }) {
  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-sm text-slate-900 dark:text-white">№ {production.number}</p>
          <p className="text-xs text-slate-500">{production.date}</p>
        </div>
        {production.sum && (
          <span className="text-sm font-bold text-red-500">{production.sum} ₽</span>
        )}
      </div>
      <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
        {production.debtor && <p>Должник: {production.debtor}</p>}
        {production.type && <p>Тип: {production.type}</p>}
        {production.subject && <p>Предмет: {production.subject}</p>}
        {production.department && <p className="text-xs text-slate-500">{production.department}</p>}
        {production.bailiff && <p className="text-xs text-slate-500">Пристав: {production.bailiff}</p>}
      </div>
    </div>
  );
}

function EfrsbCard({ caseItem }: { caseItem: EfrsbCase }) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-sm text-slate-900 dark:text-white">Дело № {caseItem.number}</p>
          <p className="text-xs text-slate-500">{caseItem.date}</p>
        </div>
        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-full">
          {caseItem.status || 'Банкротство'}
        </span>
      </div>
      <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
        {caseItem.type && <p>Тип: {caseItem.type}</p>}
        {caseItem.court && <p>Суд: {caseItem.court}</p>}
        {caseItem.judge && <p>Судья: {caseItem.judge}</p>}
      </div>
    </div>
  );
}
