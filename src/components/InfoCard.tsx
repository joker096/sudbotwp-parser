import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface InfoCardProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}

export default function InfoCard({ icon: Icon, label, children, className = '' }: InfoCardProps) {
  return (
    <div className={`bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3 ${className}`}>
      <Icon className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{label}</p>
        {children}
      </div>
    </div>
  );
}
