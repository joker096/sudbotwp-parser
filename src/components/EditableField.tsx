import { useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';

interface EditableFieldProps {
  value: string;
  label: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  hidden?: boolean;
}

export default function EditableField({ 
  value, 
  label, 
  onSave, 
  placeholder = 'Введите значение',
  hidden = false 
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (hidden) {
    return <p className="text-sm font-bold text-slate-400">Информация скрыта</p>;
  }

  if (isEditing) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border rounded-lg dark:bg-slate-700 dark:border-slate-600"
          placeholder={placeholder}
        />
        <button 
          onClick={handleSave} 
          className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
        >
          <Save className="w-4 h-4" />
        </button>
        <button 
          onClick={handleCancel} 
          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm font-bold text-slate-900 dark:text-white flex-1">{value}</p>
      <button 
        onClick={() => setIsEditing(true)} 
        className="p-1 text-slate-400 hover:text-accent transition-colors"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}
