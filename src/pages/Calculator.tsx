import { useState, useEffect } from 'react';
import { FileText, ArrowRight, Calculator as CalcIcon } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';

type CourtType = 'common' | 'arbitration';
type PlaintiffType = 'individual' | 'company';
type ClaimType = 'property' | 'property_no_value' | 'non_property';
type DiscountType = 'none' | 'minus25k' | '30percent' | '50percent';

// Расчет госпошлины для судов общей юрисдикции (ГПК РФ)
const calculateCommonCourtFee = (amount: number, isCompany: boolean): number => {
  if (isCompany) {
    // Юридическое лицо
    if (amount <= 100000) return 8000;
    if (amount <= 200000) return 8000 + (amount - 100000) * 0.03;
    if (amount <= 500000) return 11000 + (amount - 200000) * 0.025;
    if (amount <= 1000000) return 18500 + (amount - 500000) * 0.02;
    if (amount <= 3000000) return 28500 + (amount - 1000000) * 0.01;
    if (amount <= 8000000) return 48500 + (amount - 3000000) * 0.007;
    if (amount <= 24000000) return 83500 + (amount - 8000000) * 0.0035;
    if (amount <= 50000000) return 139500 + (amount - 24000000) * 0.003;
    if (amount <= 100000000) return 217500 + (amount - 50000000) * 0.002;
    return Math.min(318000 + (amount - 100000000) * 0.0015, 900000);
  } else {
    // Физическое лицо
    if (amount <= 100000) return 4000;
    if (amount <= 200000) return 4000 + (amount - 100000) * 0.03;
    if (amount <= 500000) return 7000 + (amount - 200000) * 0.025;
    if (amount <= 1000000) return 14500 + (amount - 500000) * 0.02;
    if (amount <= 3000000) return 24500 + (amount - 1000000) * 0.01;
    if (amount <= 8000000) return 44500 + (amount - 3000000) * 0.007;
    if (amount <= 24000000) return 79500 + (amount - 8000000) * 0.0035;
    if (amount <= 50000000) return 135500 + (amount - 24000000) * 0.003;
    if (amount <= 100000000) return 213500 + (amount - 50000000) * 0.002;
    return Math.min(314000 + (amount - 100000000) * 0.0015, 900000);
  }
};

// Расчет госпошлины для арбитражных судов (АПК РФ)
const calculateArbitrationFee = (amount: number, isCompany: boolean): number => {
  if (isCompany) {
    // Юридическое лицо
    if (amount <= 100000) return 20000;
    if (amount <= 1000000) return 20000 + (amount - 100000) * 0.05;
    if (amount <= 10000000) return 65000 + (amount - 1000000) * 0.03;
    if (amount <= 50000000) return 335000 + (amount - 10000000) * 0.01;
    return Math.min(735000 + (amount - 50000000) * 0.005, 10000000);
  } else {
    // Физическое лицо
    if (amount <= 100000) return 10000;
    if (amount <= 1000000) return 10000 + (amount - 100000) * 0.05;
    if (amount <= 10000000) return 55000 + (amount - 1000000) * 0.03;
    if (amount <= 50000000) return 325000 + (amount - 10000000) * 0.01;
    return Math.min(725000 + (amount - 50000000) * 0.005, 10000000);
  }
};

// Фиксированные суммы для неимущественных требований
const getNonPropertyFee = (courtType: CourtType, isCompany: boolean): number => {
  if (courtType === 'arbitration') {
    return isCompany ? 20000 : 10000;
  }
  // Суды общей юрисдикции
  return isCompany ? 20000 : 3000;
};

// Применение льгот
const applyDiscount = (fee: number, discount: DiscountType): number => {
  switch (discount) {
    case 'minus25k':
      return Math.max(0, fee - 25000);
    case '30percent':
      return Math.floor(fee * 0.7);
    case '50percent':
      return Math.floor(fee * 0.5);
    default:
      return fee;
  }
};

export default function Calculator() {
  const { setSeo } = useSeo('/calculator');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [courtType, setCourtType] = useState<CourtType>('common');
  const [plaintiffType, setPlaintiffType] = useState<PlaintiffType>('individual');
  const [claimType, setClaimType] = useState<ClaimType>('property');
  const [discount, setDiscount] = useState<DiscountType>('none');
  const [calculationDetails, setCalculationDetails] = useState<string>('');

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Калькулятор судебной пошлины - Sud',
      description: 'Рассчитайте размер государственной пошлины для подачи иска в суд. Калькулятор пошлины для судов общей юрисдикции и арбитражных судов.',
      keywords: 'калькулятор пошлины, судебная пошлина, госпошлина, рассчитать пошлину',
      ogTitle: 'Калькулятор судебной пошлины - Sud',
      ogDescription: 'Удобный калькулятор для расчёта государственной пошлины.',
    });
  }, [setSeo]);

  const calculateFee = (e: React.FormEvent) => {
    e.preventDefault();
    
    let fee = 0;
    let details = '';
    const isCompany = plaintiffType === 'company';

    if (claimType === 'non_property') {
      // Неимущественные требования
      fee = getNonPropertyFee(courtType, isCompany);
      details = `Фиксированная сумма для неимущественного требования: ${fee.toLocaleString('ru-RU')} ₽`;
    } else if (claimType === 'property_no_value') {
      // Имущественное без оценки
      fee = getNonPropertyFee(courtType, isCompany);
      details = `Фиксированная сумма для имущественного требования без оценки: ${fee.toLocaleString('ru-RU')} ₽`;
    } else {
      // Имущественное с оценкой
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) return;

      if (courtType === 'arbitration') {
        fee = calculateArbitrationFee(val, isCompany);
        details = `Расчет по АПК РФ (${isCompany ? 'юр. лицо' : 'физ. лицо'}), цена иска ${val.toLocaleString('ru-RU')} ₽`;
      } else {
        fee = calculateCommonCourtFee(val, isCompany);
        details = `Расчет по ГПК РФ (${isCompany ? 'юр. лицо' : 'физ. лицо'}), цена иска ${val.toLocaleString('ru-RU')} ₽`;
      }
    }

    // Применяем льготу
    const discountedFee = applyDiscount(fee, discount);
    if (discount !== 'none') {
      details += `\nЛьгота: ${discount === 'minus25k' ? '-25 000 ₽' : discount === '30percent' ? '30%' : '50%'}`;
      details += `\nБез льготы: ${fee.toLocaleString('ru-RU')} ₽`;
    }

    setResult(Math.floor(discountedFee));
    setCalculationDetails(details);
  };

  const resetCalculator = () => {
    setAmount('');
    setResult(null);
    setCourtType('common');
    setPlaintiffType('individual');
    setClaimType('property');
    setDiscount('none');
    setCalculationDetails('');
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalcIcon className="w-7 h-7 text-accent" />
          Калькулятор госпошлины
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden max-w-4xl mx-auto border border-transparent dark:border-slate-800 transition-colors">
        <div className="p-6 sm:p-8">
          <form onSubmit={calculateFee} className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Тип суда
                </label>
                <select 
                  value={courtType}
                  onChange={(e) => setCourtType(e.target.value as CourtType)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                >
                  <option value="common">Суд общей юрисдикции (ГПК РФ)</option>
                  <option value="arbitration">Арбитражный суд (АПК РФ)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Истец
                </label>
                <select 
                  value={plaintiffType}
                  onChange={(e) => setPlaintiffType(e.target.value as PlaintiffType)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                >
                  <option value="individual">Физическое лицо</option>
                  <option value="company">Юридическое лицо</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Тип требования
              </label>
              <select 
                value={claimType}
                onChange={(e) => setClaimType(e.target.value as ClaimType)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
              >
                <option value="property">Имущественное (с оценкой)</option>
                <option value="property_no_value">Имущественное (без оценки)</option>
                <option value="non_property">Неимущественное</option>
              </select>
            </div>

            {claimType === 'property' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Цена иска (руб.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Например: 150000"
                    min="0"
                    step="1"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">₽</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Льготы (применимы)
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discount"
                    value="none"
                    checked={discount === 'none'}
                    onChange={(e) => setDiscount(e.target.value as DiscountType)}
                    className="w-4 h-4 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Нет</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discount"
                    value="minus25k"
                    checked={discount === 'minus25k'}
                    onChange={(e) => setDiscount(e.target.value as DiscountType)}
                    className="w-4 h-4 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">−25 000 ₽</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discount"
                    value="30percent"
                    checked={discount === '30percent'}
                    onChange={(e) => setDiscount(e.target.value as DiscountType)}
                    className="w-4 h-4 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">30%</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discount"
                    value="50percent"
                    checked={discount === '50percent'}
                    onChange={(e) => setDiscount(e.target.value as DiscountType)}
                    className="w-4 h-4 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">50%</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="submit" 
                className="flex-1 bg-accent hover:bg-accent-light text-white rounded-2xl py-4 font-bold text-sm transition-colors shadow-lg shadow-accent/30"
              >
                Рассчитать пошлину
              </button>
              <button 
                type="button"
                onClick={resetCalculator}
                className="px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl py-4 font-bold text-sm transition-colors"
              >
                Очистить
              </button>
            </div>
          </form>
        </div>

        {result !== null && (
          <div className="bg-slate-900 dark:bg-slate-950 p-6 sm:p-8 text-white border-t border-slate-800 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Размер пошлины</p>
                <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                  {result.toLocaleString('ru-RU')} <span className="text-accent">₽</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:w-auto w-full">
                <button className="flex-1 sm:flex-none sm:px-6 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Квитанция
                </button>
                <button className="flex-1 sm:flex-none sm:px-8 bg-accent hover:bg-accent-light text-white py-3 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-accent/30">
                  Оплатить <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {calculationDetails && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Детали расчета</p>
                <p className="text-sm text-slate-300 whitespace-pre-line">{calculationDetails}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Информационный блок */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
          <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3">О калькуляторе</h3>
          <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
            Калькулятор рассчитывает госпошлину в соответствии с новыми правилами, действующими с 09.09.2024 года.
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-400">
            Расчет производится по статьям 333.19 и 333.21 Налогового кодекса РФ.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">Формулы расчета</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-2">Суды общей юрисдикции (ГПК РФ) — Физическое лицо:</h4>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 ml-4">
                <li>• до 100 000 ₽ — 4 000 ₽</li>
                <li>• 100 000 ₽ – 200 000 ₽ — 4 000 ₽ + 3% от суммы свыше 100 000 ₽</li>
                <li>• 200 000 ₽ – 500 000 ₽ — 7 000 ₽ + 2,5% от суммы свыше 200 000 ₽</li>
                <li>• 500 000 ₽ – 1 000 000 ₽ — 14 500 ₽ + 2% от суммы свыше 500 000 ₽</li>
                <li>• 1 000 000 ₽ – 3 000 000 ₽ — 24 500 ₽ + 1% от суммы свыше 1 000 000 ₽</li>
                <li>• 3 000 000 ₽ – 8 000 000 ₽ — 44 500 ₽ + 0,7% от суммы свыше 3 000 000 ₽</li>
                <li>• 8 000 000 ₽ – 24 000 000 ₽ — 79 500 ₽ + 0,35% от суммы свыше 8 000 000 ₽</li>
                <li>• 24 000 000 ₽ – 50 000 000 ₽ — 135 500 ₽ + 0,3% от суммы свыше 24 000 000 ₽</li>
                <li>• 50 000 000 ₽ – 100 000 000 ₽ — 213 500 ₽ + 0,2% от суммы свыше 50 000 000 ₽</li>
                <li>• свыше 100 000 000 ₽ — 313 500 ₽ + 0,15% от суммы свыше 100 000 000 ₽, но не более 900 000 ₽</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-2">Арбитражные суды (АПК РФ) — Физическое лицо:</h4>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 ml-4">
                <li>• до 100 000 ₽ — 10 000 ₽</li>
                <li>• 100 000 ₽ – 1 000 000 ₽ — 10 000 ₽ + 5% от суммы свыше 100 000 ₽</li>
                <li>• 1 000 000 ₽ – 10 000 000 ₽ — 55 000 ₽ + 3% от суммы свыше 1 000 000 ₽</li>
                <li>• 10 000 000 ₽ – 50 000 000 ₽ — 325 000 ₽ + 1% от суммы свыше 10 000 000 ₽</li>
                <li>• свыше 50 000 000 ₽ — 725 000 ₽ + 0,5% от суммы свыше 50 000 000 ₽, но не более 10 000 000 ₽</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
