import { FileText } from 'lucide-react';
import { CaseAppeal } from '../types';

interface CaseCardAppealsProps {
  appeals: CaseAppeal[];
}

export default function CaseCardAppeals({ appeals }: CaseCardAppealsProps) {
  if (!appeals.length) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Нет данных об обжаловании</p>
      </div>
    );
  }

  return (
    <>
      {appeals.map((appeal) => (
        <div
          key={appeal.id}
          className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800"
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{appeal.type}</h4>
            <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">
              {appeal.date || '—'}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-slate-500">Заявитель:</span>
              <span className="font-medium text-slate-900 dark:text-white">{appeal.applicant}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500">Вышестоящий суд:</span>
              <span className="font-medium text-slate-900 dark:text-white text-right">{appeal.court}</span>
            </p>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                Результат обжалования
              </p>
              <p className="font-bold text-accent text-sm">{appeal.result}</p>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
