import { AlertCircle, CheckCircle2, Clock, MapPin } from 'lucide-react';
import type { CaseEvent } from '../types';

interface CaseCardEventsProps {
  events: CaseEvent[];
  selectedEventIndex: number | null;
  onSelectEvent: (index: number | null, element: HTMLDivElement | null) => void;
  onDateDoubleClick?: (date: string, time?: string) => void;
}

export default function CaseCardEvents({
  events,
  selectedEventIndex,
  onSelectEvent,
  onDateDoubleClick,
}: CaseCardEventsProps) {
  if (!Array.isArray(events) || events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Нет данных о движении дела</p>
      </div>
    );
  }

  return (
    <>
      {events.map((event, index) => (
        <div
          key={index}
          onClick={(e) => {
            const newIndex = selectedEventIndex === index ? null : index;
            onSelectEvent(newIndex, e.currentTarget);
          }}
          className={`relative flex items-start gap-4 mb-4 p-4 rounded-xl border transition-colors duration-200 cursor-pointer ${
            selectedEventIndex === index
              ? 'bg-accent/10 dark:bg-accent/20 border-accent/30'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
          }`}
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 mt-1" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span
                className="font-bold text-slate-900 dark:text-white text-sm cursor-pointer hover:text-accent transition-colors select-none"
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
                <MapPin className="w-3 h-3" /> {event.location}
              </p>
            )}
            {event.result && (
              <p className="text-xs font-bold text-accent flex items-center gap-1 mt-2">
                <CheckCircle2 className="w-3 h-3" /> {event.result}
              </p>
            )}
            {event.reason && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" /> {event.reason}
              </p>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
