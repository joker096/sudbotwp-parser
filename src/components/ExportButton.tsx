import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { CounterpartyCheck } from '../lib/counterparty';
import type { RosstatResult } from '../lib/rosstat';
import type { RiskScore } from '../lib/counterparty';
import { exportToExcel, exportToCSV } from '../lib/export';

interface ExportButtonProps {
  check: CounterpartyCheck;
  rosstat: RosstatResult | null;
  riskScore: RiskScore | null;
}

export default function ExportButton({ check, rosstat, riskScore }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрыть dropdown при клике вне
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function downloadExcel() {
    const blob = exportToExcel(check, rosstat, riskScore);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `check-${check.inn}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }

  function downloadCSV() {
    const blob = exportToCSV(check);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `check-${check.inn}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-accent/30 transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        Экспорт
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-10 overflow-hidden">
          <button
            onClick={downloadExcel}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Excel (.xlsx)
          </button>
          <button
            onClick={downloadCSV}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            CSV
          </button>
        </div>
      )}
    </div>
  );
}
