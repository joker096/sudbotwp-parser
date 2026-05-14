import { User } from 'lucide-react';
import EditableField from './EditableField';

interface PartyCardProps {
  label: string;
  value: string | undefined;
  onSave: (newValue: string) => void;
  hidden?: boolean;
}

export default function PartyCard({ label, value, onSave, hidden = false }: PartyCardProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
        <User className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <EditableField
          value={value || ''}
          label={label}
          onSave={onSave}
          placeholder={`Введите имя ${label.toLowerCase()}`}
          hidden={hidden || !value || value.includes('скрыта')}
        />
      </div>
    </div>
  );
}
