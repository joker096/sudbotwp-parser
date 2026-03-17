import { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{ message: string; id: number; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ message, id, type });
    setTimeout(() => {
      setToast(currentToast => (currentToast?.id === id ? null : currentToast));
    }, 3000); // Toast disappears after 3 seconds
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200]">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl ${
                toast.type === 'error' 
                  ? 'bg-red-600 text-white dark:bg-red-700'
                  : toast.type === 'info'
                  ? 'bg-blue-600 text-white dark:bg-blue-700'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              }`}
            >
              {toast.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-500" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-white" />
              )}
              {toast.type === 'info' && (
                <Info className="w-5 h-5 text-white" />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}