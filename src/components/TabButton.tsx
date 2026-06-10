interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  hasNotification?: boolean;
}

export default function TabButton({ label, isActive, onClick, hasNotification = false }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-1 sm:flex-none min-w-[80px] ${
        isActive
          ? 'bg-slate-900 dark:bg-accent text-white'
          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      {label}
      {hasNotification && (
        <span className="ml-1 w-2 h-2 bg-accent rounded-full inline-block"></span>
      )}
    </button>
  );
}
