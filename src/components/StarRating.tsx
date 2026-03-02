import { useState, useEffect } from 'react';
import { Star, ThumbsUp } from 'lucide-react';

interface StarRatingProps {
  targetType: 'lawyer' | 'court';
  targetId: string | number;
  initialRating?: number;
  initialVotes?: number;
  showVoting?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  onRate?: (rating: number) => void;
}

interface RatingData {
  average_rating: number;
  total_ratings: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function StarRating({
  targetType,
  targetId,
  initialRating = 0,
  initialVotes = 0,
  showVoting = true,
  size = 'md',
  showCount = true,
  onRate
}: StarRatingProps) {
  const [ratingData, setRatingData] = useState<RatingData>({
    average_rating: initialRating,
    total_ratings: initialVotes,
    rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [canVote, setCanVote] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [showDistribution, setShowDistribution] = useState<boolean>(false);

  useEffect(() => {
    fetchRating();
  }, [targetType, targetId]);

  const fetchRating = async () => {
    // Пропускаем на production если нет API сервера
    if (import.meta.env.PROD) {
      return;
    }
    
    try {
      const response = await fetch(`/api/ratings/${targetType}/${targetId}`);
      if (!response.ok) return; // Игнорируем ошибки HTTP
      const data = await response.json();
      setRatingData(data);
    } catch (error) {
      // Игнорируем ошибки сети на production
      console.log('Rating API not available on production');
    }
  };

  const checkCanVote = async () => {
    // Пропускаем на production если нет API сервера
    if (import.meta.env.PROD) {
      return;
    }
    
    try {
      const response = await fetch(`/api/ratings/check/${targetType}/${targetId}`);
      if (!response.ok) return;
      const data = await response.json();
      setCanVote(data.can_rate);
      if (!data.can_rate) {
        setMessage(data.message || 'Вы уже голосовали');
      }
    } catch (error) {
      // Игнорируем ошибки сети на production
    }
  };

  const handleStarClick = async (rating: number) => {
    // На production голосование отключено (нет API)
    if (import.meta.env.PROD) {
      setMessage('Рейтинг недоступен на production');
      return;
    }
    
    if (!canVote || isLoading) return;

    // Проверяем возможность голосования
    await checkCanVote();
    if (!canVote) return;

    setIsLoading(true);
    setUserRating(rating);

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetType,
          targetId,
          rating
        })
      });

      if (!response.ok) {
        setMessage('Ошибка при отправке');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setMessage(data.message || 'Спасибо за ваш голос!');
        setRatingData(prev => ({
          ...prev,
          average_rating: data.rating || rating,
          total_ratings: data.total_votes || prev.total_ratings + 1
        }));
        setCanVote(false);
        onRate?.(rating);
      } else {
        setMessage(data.message || 'Не удалось отправить голос');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      setMessage('Ошибка при отправке');
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: { star: 'w-3 h-3', text: 'text-xs', container: 'gap-0.5' },
    md: { star: 'w-4 h-4', text: 'text-sm', container: 'gap-1' },
    lg: { star: 'w-5 h-5', text: 'text-base', container: 'gap-1.5' }
  };

  const sizes = sizeClasses[size];
  const displayRating = hoverRating || ratingData.average_rating;

  return (
    <div className="flex flex-col gap-2">
      {/* Основной рейтинг */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center ${sizes.container}`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={!showVoting || !canVote || isLoading}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => showVoting && setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={`${showVoting && canVote ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform focus:outline-none`}
            >
              <Star
                className={`${sizes.star} ${
                  star <= displayRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-slate-200 text-slate-200 dark:fill-slate-600 dark:text-slate-600'
                }`}
              />
            </button>
          ))}
        </div>
        
        <span className={`font-bold text-slate-900 dark:text-white ${sizes.text}`}>
          {displayRating > 0 ? displayRating.toFixed(1) : '-'}
        </span>
        
        {showCount && (
          <span className={`text-slate-500 dark:text-slate-400 ${sizes.text}`}>
            ({ratingData.total_ratings})
          </span>
        )}
      </div>

      {/* Сообщение после голосования */}
      {message && (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <ThumbsUp className="w-3 h-3" />
          {message}
        </div>
      )}

      {/* Распределение голосов */}
      {showDistribution && ratingData.total_ratings > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingData.rating_distribution[star as keyof typeof ratingData.rating_distribution] || 0;
            const percentage = ratingData.total_ratings > 0 
              ? Math.round((count / ratingData.total_ratings) * 100) 
              : 0;
            
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-slate-500 dark:text-slate-400">{star}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-500 dark:text-slate-400">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
