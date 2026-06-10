import { Loader2, Pencil, Save, User, X } from 'lucide-react';

interface CaseCardPartiesProps {
  plaintiff: string;
  defendant: string;
  editingField: 'plaintiff' | 'defendant' | null;
  editValue: string;
  isSavingField: boolean;
  setEditValue: (value: string) => void;
  onEditStart: (field: 'plaintiff' | 'defendant') => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}

function isHiddenParty(value?: string) {
  return !value || value.includes('скрыта');
}

export default function CaseCardParties({
  plaintiff,
  defendant,
  editingField,
  editValue,
  isSavingField,
  setEditValue,
  onEditStart,
  onEditSave,
  onEditCancel,
}: CaseCardPartiesProps) {
  const renderParty = (
    role: string,
    field: 'plaintiff' | 'defendant',
    value: string,
    placeholder: string
  ) => (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
        <User className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">{role}</p>
        {isHiddenParty(value) ? (
          <p className="text-sm font-bold text-slate-400">Информация скрыта</p>
        ) : editingField === field ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600"
              placeholder={placeholder}
            />
            <button
              onClick={onEditSave}
              disabled={isSavingField}
              className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingField ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
            <button onClick={onEditCancel} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-white flex-1">{value}</p>
            <button onClick={() => onEditStart(field)} className="p-1 text-slate-400 hover:text-accent transition-all">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      {renderParty('Истец', 'plaintiff', plaintiff, 'Введите имя истца')}
      {renderParty('Ответчик', 'defendant', defendant, 'Введите имя ответчика')}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
          <User className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Третье лицо</p>
          <p className="text-sm font-bold text-slate-400">Информация скрыта</p>
        </div>
      </div>
    </div>
  );
}
