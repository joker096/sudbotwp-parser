import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
  target?: string;
  rel?: string;
}

const variantClasses = {
  primary: 'bg-accent hover:bg-accent-light text-white',
  secondary: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white',
  success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  danger: 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  info: 'bg-blue-500 hover:bg-blue-600 text-white',
};

const disabledClasses = 'bg-slate-300 cursor-default opacity-50';

export default function ActionButton({ 
  onClick, 
  href,
  icon: Icon, 
  children, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  className = '',
  title,
  target,
  rel
}: ActionButtonProps) {
  const baseClasses = `py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-1.5`;
  const variantClass = disabled ? disabledClasses : variantClasses[variant];

  const content = (
    <>
      {loading ? (
        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-3 h-3" />
      ) : null}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={`${baseClasses} ${variantClass} ${className}`}
        title={title}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClass} ${className}`}
      title={title}
    >
      {content}
    </button>
  );
}
