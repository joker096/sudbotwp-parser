import { Scale, Copy, RotateCcw } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface CaseCardHeaderProps {
  caseNumber: string;
  updatedAt?: string;
  isAdded: boolean;
  canRefresh?: boolean;
  refreshLimitReason?: string;
  subscriptionTier?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function CaseCardHeader({ 
  caseNumber, 
  updatedAt, 
  isAdded, 
  canRefresh, 
  refreshLimitReason, 
  subscriptionTier,
  onRefresh,
  isRefreshing 
}: CaseCardHeaderProps) {
  const { showToast } = useToast();

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(caseNumber);
      showToast('Номер дела скопирован!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRefresh = () => {
    if (!onRefresh) return;
    
    if (subscriptionTier === 'free') {
      showToast('Ручное обновление доступно только для подписчиков. Оформите подписку или дождитесь автоматического обновления (1 раз в день).', 'info');
      return;
    }
    if (canRefresh === false) {
      showToast(refreshLimitReason || 'Вы уже обновляли дело сегодня. Следующее обновление будет доступно завтра.', 'info');
      return;
    }
    onRefresh();
  };

  return (
    <div className="flex items-center gap-3 mb-6 p-6 sm:p-8 pb-0 shrink-0">
      <div className="bg-accent/10 p-1.5 rounded-2xl">
        <Scale className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{caseNumber}</h2>
          <button
            onClick={handleCopyNumber}
            className="p-1.5 text-slate-400 hover:text-accent transition-colors"
            title="Копировать номер дела"
          >
            <Copy className="w-4 h-4" />
          </button>
          {isAdded && onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-slate-400 hover:text-accent transition-colors disabled:opacity-50 relative"
              title={
                subscriptionTier === 'free' 
                  ? 'Ручное обновление доступно только для подписчиков' 
                  : canRefresh === false 
                    ? refreshLimitReason || 'Лимит обновлений исчерпан'
                    : 'Обновить данные дела'
              }
            >
              {isRefreshing ? (
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <RotateCcw className={`w-4 h-4 ${subscriptionTier === 'free' || canRefresh === false ? 'opacity-50' : ''}`} />
                  {(subscriptionTier === 'free' || canRefresh === false) && (
                    <span className="absolute -bottom-1 -right-1 text-[8px] text-slate-400">🔒</span>
                  )}
                </>
              )}
            </button>
          )}
        </div>

        {updatedAt && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Обновлено: {new Date(updatedAt).toLocaleString('ru-RU', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        )}
      </div>
    </div>
  );
}
