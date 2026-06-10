import { Clock, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { CaseEvent } from '../types';

interface CaseEventItemProps {
  event: CaseEvent;
  isSelected: boolean;
  isLast: boolean;
  onClick: () => void;
  onDateDoubleClick?: (date: string, time?: string) => void;
}

export default function CaseEventItem({ 
  event, 
  isSelected, 
  isLast, 
  onClick,
  onDateDoubleClick 
}: CaseEventItemProps) {
  return (
    <div 
      onClick={onClick}
      className={`relative flex items-start gap-4 mb-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'bg-accent/10 dark:bg-accent/20 border-accent/30' 
          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-1" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span 
            className="font-bold text-slate-900 dark:text-white text-sm cursor-pointer hover:text-accent transition-all select-none"
            onDoubleClick={() => {
              if (event.date && onDateDoubleClick) {
                onDateDoubleClick(event.date, event.time);
              }
            }}
            title="Двойной клик для перехода в календарь"
          >
            {event.date}
          </span>
          <span className="text-xs font-medium text-slate-500">{event.time}</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">{event.name}</p>
        {event.location && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3" /> 
            {event.location}
          </p>
        )}
        {event.result && (
          <p className="text-xs font-bold text-accent flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3 h-3" /> 
            {event.result}
          </p>
        )}
        {event.reason && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3" /> 
            {event.reason}
          </p>
        )}
      </div>
    </div>
  );
}
