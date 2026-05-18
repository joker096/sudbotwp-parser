import { WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';

export default function OfflineBanner() {
  const isOnline = useOnline();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md">
      <WifiOff className="w-4 h-4" />
      Нет соединения с интернетом. Некоторые функции могут быть недоступны.
    </div>
  );
}
