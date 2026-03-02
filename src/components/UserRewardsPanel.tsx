import { useState, useEffect } from 'react';
import { Gift, Ticket, Clock, Check, Copy, ChevronRight, Star, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userRewards, UserReward } from '../lib/supabase';

interface UserRewardsPanelProps {
  userId: string;
}

export default function UserRewardsPanel({ userId }: UserRewardsPanelProps) {
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadRewards();
  }, [userId]);

  const loadRewards = async () => {
    setIsLoading(true);
    const { data } = await userRewards.getAvailable(userId);
    if (data) {
      setRewards(data);
    }
    setIsLoading(false);
  };

  const copyPromoCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const availableRewards = rewards.filter(r => r.status === 'available');
  const expiredRewards = rewards.filter(r => r.status === 'expired');
  const usedRewards = rewards.filter(r => r.status === 'used');

  const getRewardIcon = (type: UserReward['reward_type']) => {
    switch (type) {
      case 'discount':
        return <Ticket className="w-5 h-5 text-accent" />;
      case 'bonus_lead':
        return <Gift className="w-5 h-5 text-emerald-500" />;
      case 'free_parsing':
        return <Scale className="w-5 h-5 text-blue-500" />;
      case 'promo_code':
        return <Star className="w-5 h-5 text-amber-500" />;
      default:
        return <Gift className="w-5 h-5 text-accent" />;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Доступные награды */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-accent" />
          Доступные награды
        </h3>
        
        {availableRewards.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 text-center">
            <Gift className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              У вас пока нет доступных наград.
              <br />
              Оставляйте отзывы о юристах, чтобы получать скидки!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableRewards.map((reward) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-accent/20 dark:border-accent/30"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                    {getRewardIcon(reward.reward_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {reward.reward_value}
                      </span>
                      {reward.status === 'available' && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full">
                          Активно
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {reward.description || 'Скидка на услуги'}
                    </p>
                    
                    {reward.promo_code && (
                      <div className="flex items-center gap-2">
                        <code className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm font-mono text-slate-900 dark:text-white">
                          {reward.promo_code}
                        </code>
                        <button
                          onClick={() => copyPromoCode(reward.promo_code!)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-accent rounded-lg transition-colors"
                        >
                          {copiedCode === reward.promo_code ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                    
                    {reward.expires_at && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        Действителен до {new Date(reward.expires_at).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Использованные награды */}
      {usedRewards.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500" />
            Использованные
          </h3>
          <div className="space-y-2 opacity-60">
            {usedRewards.slice(0, 3).map((reward) => (
              <div
                key={reward.id}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-center gap-3"
              >
                {getRewardIcon(reward.reward_type)}
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {reward.reward_value}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(reward.used_at!).toLocaleDateString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Как получить награды */}
      <div className="bg-gradient-to-r from-accent/10 to-primary/10 dark:from-accent/5 dark:to-primary/5 rounded-2xl p-4">
        <h4 className="font-bold text-slate-900 dark:text-white mb-2">
          Как получить награды?
        </h4>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            Оставьте отзыв о юристе, с которым работали
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            Получите скидку 10% на любые услуги
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            Используйте промокод при оплате
          </li>
        </ul>
      </div>
    </div>
  );
}
