import { useState, useEffect, useRef } from 'react';
import { FileText, ArrowRight, Calculator as CalcIcon, ChevronDown, Search, Loader2 } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';
import { courts } from '../lib/supabase';
import { Court } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import SafeLink from '../components/SafeLink';

type CourtType = 'common' | 'arbitration';
type PlaintiffType = 'individual' | 'company';
type ClaimType = 'property' | 'property_no_value' | 'non_property';
type DiscountType = 'none' | 'minus25k' | '30percent' | '50percent';
type SelectedCourt = {
  id: string;
  name: string;
  courtType: CourtType;
};

// Соответствие типов юрисдикции для судов
const getCourtJurisdiction = (jurisdiction: string | null): CourtType => {
  if (!jurisdiction) return 'common';
  const j = jurisdiction.toLowerCase();
  if (j.includes('арбитраж') || j === 'arbitration') {
    return 'arbitration';
  }
  return 'common';
};

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

// Реквизиты суда для квитанции
interface CourtRequisites {
  name: string;
  bik: string;
  inn: string;
  kpp: string;
  account: string;
  correspondentAccount: string;
  bankName: string;
  okato: string;
  kb: string;
}

// Дефолтные реквизиты для случаев без выбора суда или без реквизитов в базе
const defaultCourtRequisites: CourtRequisites = {
  name: 'Мировой суд',
  bik: '044525000',
  inn: '7702019950',
  kpp: '770201001',
  account: '03100643000000017300',
  correspondentAccount: '40102810845370000003',
  bankName: 'ГУ Банка России по ЦФО',
  okato: '45286555',
  kb: '18210803010011000110'
};

// Форматирование значения для квитанции (добавляет прочерк для пустых значений)
const formatRequisite = (value: string | undefined): string => {
  return value && value.trim() ? value : '—';
};

// Генерация квитанции госпошлины
const generateDutyReceipt = (
  amount: number,
  courtType: CourtType,
  plaintiffType: PlaintiffType,
  claimType: ClaimType,
  claimAmount: number | undefined,
  courtRequisites: CourtRequisites,
  payerName: string
): string => {
  const court = courtRequisites;
  
  const isCompany = plaintiffType === 'company';
  const plaintiffTypeLabel = isCompany ? 'Юридическое лицо' : 'Физическое лицо';
  
  let claimTypeLabel = '';
  switch (claimType) {
    case 'property':
      claimTypeLabel = `Имущественное требование (цена иска: ${(claimAmount || 0).toLocaleString('ru-RU')} руб.)`;
      break;
    case 'property_no_value':
      claimTypeLabel = 'Имущественное требование без оценки';
      break;
    case 'non_property':
      claimTypeLabel = 'Неимущественное требование';
      break;
  }

  const dateStr = new Date().toLocaleDateString('ru-RU');
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Квитанция об уплате государственной пошлины</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 5px;
      background-color: #f8f9fa;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 15px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    h1 { font-size: 18px; text-align: center; margin-bottom: 15px; font-weight: 700; }
    .field { margin-bottom: 12px; }
    .label { font-size: 11px; color: #6c757d; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .value { font-size: 14px; font-weight: 600; color: #212529; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
    .amount-box { background-color: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center; margin: 10px 0; }
    .amount-label { font-size: 11px; color: #6c757d; margin-bottom: 3px; }
    .amount-value { font-size: 13px; font-weight: 700; color: #212529; }
    .amount-value span { color: #5856d6; font-size: 15px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 11px; color: #6c757d; text-align: center; }
    @media print { 
      body { 
        background-color: #fff; 
        padding: 0;
        margin: 0;
      } 
      .container { 
        box-shadow: none; 
        padding: 10px;
        margin: 0;
      } 
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>КВИТАНЦИЯ об уплате государственной пошлины</h1>
    
    <div class="field">
      <div class="label">Наименование суда</div>
      <div class="value">${formatRequisite(court.name)}</div>
    </div>
    
    <div class="field">
      <div class="label">ИНН</div>
      <div class="value">${formatRequisite(court.inn)}</div>
    </div>
    
    <div class="field">
      <div class="label">КПП</div>
      <div class="value">${formatRequisite(court.kpp)}</div>
    </div>
    
    <div class="field">
      <div class="label">Наименование банка</div>
      <div class="value">${formatRequisite(court.bankName)}</div>
    </div>
    
    <div class="field">
      <div class="label">БИК</div>
      <div class="value">${formatRequisite(court.bik)}</div>
    </div>
    
    <div class="field">
      <div class="label">Номер счёта получателя платежа</div>
      <div class="value">${formatRequisite(court.account)}</div>
    </div>
    
    <div class="field">
      <div class="label">Номер корреспондентского счёта банка</div>
      <div class="value">${formatRequisite(court.correspondentAccount)}</div>
    </div>
    
    <div class="field">
      <div class="label">ОКТМО</div>
      <div class="value">${formatRequisite(court.okato)}</div>
    </div>
    
    <div class="amount-box">
      <div class="amount-value">Сумма государственной пошлины: <span>${amount.toLocaleString('ru-RU')}</span> руб.</div>
    </div>
    
    <div class="field">
      <div class="label">Плательщик</div>
      <div class="value">${payerName} (${plaintiffTypeLabel})</div>
    </div>
    
    <div class="field">
      <div class="label">Вид платежа</div>
      <div class="value">${claimTypeLabel}</div>
    </div>
    
    <div class="field">
      <div class="label">КБК</div>
      <div class="value">${formatRequisite(court.kb)}</div>
    </div>
    
    <div class="field">
      <div class="label">Дата уплаты</div>
      <div class="value">${dateStr}</div>
    </div>
    
    <div class="footer">
      <p style="color: #dc2626; font-weight: bold;">⚠️ ВНИМАНИЕ: Квитанция сформирована автоматически. Перед оплатой обязательно проверьте все реквизиты на официальном сайте суда!</p>
    </div>
  </div>
  
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
  
  return html;
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
  const [selectedCourt, setSelectedCourt] = useState<SelectedCourt | null>(null);
  const [payerName, setPayerName] = useState('');
  
  // Состояния для dropdown с поиском судов
  const [courtList, setCourtList] = useState<Court[]>([]);
  const [filteredCourts, setFilteredCourts] = useState<Court[]>([]);
  const [courtSearch, setCourtSearch] = useState('');
  const [showCourtDropdown, setShowCourtDropdown] = useState(false);
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);
  const courtDropdownRef = useRef<HTMLDivElement>(null);

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

  // Загрузка списка судов
  useEffect(() => {
    loadCourts();
  }, []);

  // Фильтрация судов по поиску
  useEffect(() => {
    if (courtSearch.trim()) {
      const searchLower = courtSearch.toLowerCase();
      const filtered = courtList.filter(court => 
        court.name.toLowerCase().includes(searchLower)
      );
      setFilteredCourts(filtered);
    } else {
      setFilteredCourts([]);
    }
  }, [courtSearch, courtList]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (courtDropdownRef.current && !courtDropdownRef.current.contains(event.target as Node)) {
        setShowCourtDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCourts = async () => {
    setIsLoadingCourts(true);
    const { data, error } = await courts.getAll();
    if (data) {
      setCourtList(data);
    }
    setIsLoadingCourts(false);
  };

  const handleCourtSelect = (court: Court) => {
    const jurisdiction = getCourtJurisdiction(court.jurisdiction);
    setSelectedCourt({
      id: court.id,
      name: court.name,
      courtType: jurisdiction
    });
    setCourtSearch(court.name);
    setShowCourtDropdown(false);
  };

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
    setSelectedCourt(null);
    setCourtSearch('');
    setPlaintiffType('individual');
    setClaimType('property');
    setDiscount('none');
    setCalculationDetails('');
    setPayerName('');
  };

  // Обработчик кнопки "Квитанция"
  const handleGenerateReceipt = () => {
    if (result === null) return;
    
    // Проверка заполнения имени плательщика
    if (!payerName.trim()) {
      alert('Пожалуйста, введите ФИО плательщика (для физического лица) или наименование организации (для юридического лица)');
      return;
    }
    
    // Проверка выбора суда - это обязательно для получения корректных реквизитов
    if (!selectedCourt) {
      alert('Пожалуйста, выберите суд из списка. Квитанция должна содержать реквизиты конкретного суда, в который подаётся иск.');
      return;
    }
    
    // Получаем реквизиты выбранного суда
    const court = courtList.find(c => c.id === selectedCourt?.id);
    
    if (!court) {
      alert('Суд не найден в базе данных. Пожалуйста, выберите суд из списка.');
      return;
    }
    
    // Проверяем, есть ли у суда реквизиты в базе данных
    const hasRequisites = (
      court.recipient_bik || 
      court.recipient_inn || 
      court.recipient_kpp || 
      court.recipient_account || 
      court.recipient_bank || 
      court.treasury_account || 
      court.oktmo || 
      court.kbk
    );
    
    // Если реквизиты отсутствуют - сообщаем пользователю и не даём сформировать квитанцию
    if (!hasRequisites) {
      alert('У выбранного суда отсутствуют реквизиты в базе данных. Пожалуйста, выберите другой суд или обратитесь к администратору для добавления реквизитов.');
      return;
    }
    
    const courtRequisites: CourtRequisites = {
      name: court.name,
      bik: court.recipient_bik || '',
      inn: court.recipient_inn || '',
      kpp: court.recipient_kpp || '',
      account: court.recipient_account || '',
      correspondentAccount: court.treasury_account || '',
      bankName: court.recipient_bank || '',
      okato: court.oktmo || '',
      kb: court.kbk || ''
    };
    
    const claimAmount = claimType === 'property' ? parseFloat(amount) : undefined;
    generateDutyReceipt(
      result,
      courtType,
      plaintiffType,
      claimType,
      claimAmount,
      courtRequisites,
      payerName
    );
  };

  // Обработчик кнопки "Оплатить" - перенаправление на официальный сайт госпошлины
  // Теперь используется SafeLink в JSX

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalcIcon className="w-7 h-7 text-accent" />
          Калькулятор госпошлины
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden max-w-4xl mx-auto border border-transparent dark:border-slate-800 transition-colors">
        <div className="p-4 sm:p-8">
          <form onSubmit={calculateFee} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Тип суда
                </label>
                <select 
                  value={courtType}
                  onChange={(e) => setCourtType(e.target.value as CourtType)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                >
                  <option value="common">Суд общей юрисдикции (ГПК РФ)</option>
                  <option value="arbitration">Арбитражный суд (АПК РФ)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Суд
                </label>
                <div className="relative" ref={courtDropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={courtSearch}
                      onChange={(e) => {
                        setCourtSearch(e.target.value);
                        setShowCourtDropdown(true);
                      }}
                      onFocus={() => setShowCourtDropdown(true)}
                      placeholder="Поиск суда..."
                      className="w-full bg-slate-50 dark:bg-slate-800 py-2 pl-10 pr-4 rounded-lg border border-transparent focus:border-accent/30 focus:outline-none focus:ring-2 focus:ring-accent/20 text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                  <AnimatePresence>
                    {showCourtDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 border border-slate-200 dark:border-slate-700"
                      >
                        {isLoadingCourts ? (
                          <div className="p-4 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          </div>
                        ) : filteredCourts.length > 0 ? (
                          filteredCourts.map(court => (
                            <div
                              key={court.id}
                              onClick={() => handleCourtSelect(court)}
                              className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-xs border-b border-slate-100 dark:border-slate-700 last:border-0"
                            >
                              <div className="font-medium text-slate-900 dark:text-white">{court.name}</div>
                              {court.full_address && (
                                <div className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5 truncate">{court.full_address}</div>
                              )}
                            </div>
                          ))
                        ) : courtSearch.trim() ? (
                          <div className="p-4 text-xs text-slate-500 dark:text-slate-400">
                            Суд не найден. Попробуйте изменить запрос.
                          </div>
                        ) : (
                          <div className="p-4 text-xs text-slate-500 dark:text-slate-400">
                            Введите название суда для поиска
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Истец
                </label>
                <select 
                  value={plaintiffType}
                  onChange={(e) => setPlaintiffType(e.target.value as PlaintiffType)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                >
                  <option value="individual">Физическое лицо</option>
                  <option value="company">Юридическое лицо</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {plaintiffType === 'individual' ? 'ФИО плательщика' : 'Наименование организации'}
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder={plaintiffType === 'individual' ? 'Иванов Иван Иванович' : 'ООО "Ромашка"'}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Тип требования
              </label>
              <select 
                value={claimType}
                onChange={(e) => setClaimType(e.target.value as ClaimType)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
              >
                <option value="property">Имущественное (с оценкой)</option>
                <option value="property_no_value">Имущественное (без оценки)</option>
                <option value="non_property">Неимущественное</option>
              </select>
            </div>

            {claimType === 'property' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">₽</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Льготы (применимы)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="discount"
                    value="none"
                    checked={discount === 'none'}
                    onChange={(e) => setDiscount(e.target.value as DiscountType)}
                    className="w-3 h-3 text-accent focus:ring-accent"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Нет</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="discount"
                    value="minus25k"
                    checked={discount === 'minus25k'}
                    onChange={(e) => setDiscount(e.target.value as DiscountType)}
                    className="w-3 h-3 text-accent focus:ring-accent"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">−25к</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="discount"
                    value="30percent"
                    checked={discount === '30percent'}
                    onChange={(e) => setDiscount(e.target.value as DiscountType)}
                    className="w-3 h-3 text-accent focus:ring-accent"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">30%</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="discount"
                    value="50percent"
                    checked={discount === '50percent'}
                    onChange={(e) => setDiscount(e.target.value as DiscountType)}
                    className="w-3 h-3 text-accent focus:ring-accent"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">50%</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="submit" 
                className="flex-1 bg-accent hover:bg-accent-light text-white rounded-lg py-2 font-bold text-xs transition-colors shadow-sm"
              >
                Рассчитать
              </button>
              <button 
                type="button"
                onClick={resetCalculator}
                className="px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg py-2 font-bold text-xs transition-colors"
              >
                Очистить
              </button>
            </div>
          </form>
        </div>

        {result !== null && (
          <div className="bg-slate-900 dark:bg-slate-950 p-3 sm:p-8 text-white border-t border-slate-800 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
              <div className="text-center sm:text-left">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Размер пошлины</p>
                <p className="text-2xl sm:text-5xl font-extrabold tracking-tight">
                  {result.toLocaleString('ru-RU')} <span className="text-accent">₽</span>
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3 sm:w-auto w-full">
                <button 
                  onClick={handleGenerateReceipt}
                  className="flex-1 sm:flex-none px-3 bg-white/10 hover:bg-white/20 text-white py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  Квитанция
                </button>
                <SafeLink 
                  href="https://www.gosuslugi.ru/category/payment"
                  className="flex-1 sm:flex-none px-4 bg-accent hover:bg-accent-light text-white py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  Госуслуги <ArrowRight className="w-3 h-3" />
                </SafeLink>
              </div>
            </div>
            
            {calculationDetails && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Детали расчета</p>
                <p className="text-xs text-slate-300 whitespace-pre-line">{calculationDetails}</p>
              </div>
            )}

            {/* Предупреждение о проверке реквизитов */}
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-200">
                ⚠️ <strong>Внимание:</strong> Все реквизиты в квитанции предоставлены автоматически и могут содержать ошибки. 
                Перед оплатой обязательно проверьте реквизиты на официальном сайте суда!
              </p>
            </div>
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
