import { useState, useEffect } from 'react';
import { Star, Clock, Check, AlertCircle, Loader2, Gift, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SimpleCaptcha from './SimpleCaptcha';
import { reviews, userRewards, LawyerReview } from '../lib/supabase';

interface LawyerReviewsProps {
  lawyerId: string;
  lawyerName: string;
  isAuthenticated: boolean;
  userId?: string;
  onAuthRequired?: () => void;
}

export default function LawyerReviews({ 
  lawyerId, 
  lawyerName, 
  isAuthenticated, 
  userId,
  onAuthRequired 
}: LawyerReviewsProps) {
  const [reviewsList, setReviewsList] = useState<LawyerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [canReview, setCanReview] = useState<{ canReview: boolean; caseId: string | null; reason: string } | null>(null);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [lawyerId]);

  const loadReviews = async () => {
    setIsLoading(true);
    const { data, error } = await reviews.getApproved(lawyerId);
    if (!error && data) {
      setReviewsList(data);
    }
    setIsLoading(false);
  };

  const checkCanReview = async () => {
    if (!isAuthenticated || !userId) {
      onAuthRequired?.();
      return;
    }

    const result = await reviews.canReview(userId, lawyerId);
    setCanReview(result);
    
    if (result.canReview) {
      setShowWriteForm(true);
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !userId || !canReview?.caseId) {
      setSubmitError('Сначала войдите в систему');
      return;
    }

    if (!captchaToken) {
      setSubmitError('Пожалуйста, пройдите проверку капчи');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const { data, error } = await reviews.create({
      lawyer_id: lawyerId,
      user_id: userId,
      case_id: canReview.caseId,
      rating,
      review_text: reviewText || undefined,
      captcha_token: captchaToken,
    });

    if (error) {
      setSubmitError('Ошибка при отправке отзыва. Попробуйте позже.');
      setIsSubmitting(false);
      return;
    }

    // Создаём награду для пользователя (скидка 10%)
    if (data) {
      const promoCode = `REVIEW${Date.now().toString().slice(-6)}`;
      await userRewards.create({
        user_id: userId,
        reward_type: 'discount',
        reward_value: '10%',
        description: 'Скидка 10% за оставленный отзыв',
        review_id: data.id,
        lawyer_id: lawyerId,
        promo_code: promoCode,
      });
    }

    setSubmitSuccess(true);
    setIsSubmitting(false);
    
    // Перезагружаем отзывы
    loadReviews();
  };

  // Успешная отправка
  if (submitSuccess) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mb-2">
          Спасибо за ваш отзыв!
        </h3>
        <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
          Ваш отзыв отправлен на модерацию и будет опубликован после проверки.
        </p>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <Gift className="w-5 h-5" />
            <span className="font-bold">Ваша награда!</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            За оставленный отзыв вы получили скидку 10% на любые услуги сервиса.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка написать отзыв */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Отзывы
        </h3>
        {!showWriteForm && (
          <button
            onClick={checkCanReview}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-xl text-sm font-bold transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Написать отзыв
          </button>
        )}
      </div>

      {/* Проверка возможности оставить отзыв */}
      {canReview && !canReview.canReview && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {canReview.reason}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Чтобы оставить отзыв, вы должны были работать с этим юристом (через покупку лида или подтверждённую связь с делом).
            </p>
          </div>
        </div>
      )}

      {/* Форма написания отзыва */}
      <AnimatePresence>
        {showWriteForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800"
          >
            <h4 className="font-bold text-slate-900 dark:text-white mb-4">
              Оставить отзыв о {lawyerName}
            </h4>
            
            {/* Рейтинг */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Оценка
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Текст отзыва */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Текст отзыва (необязательно)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Поделитесь своим опытом работы с юристом..."
                rows={4}
                maxLength={1000}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            {/* Капча */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Проверка безопасности
              </label>
              <SimpleCaptcha
                onVerify={(token) => {
                  setCaptchaToken(token);
                  setSubmitError('');
                }}
                onError={() => {
                  setSubmitError('Капча не пройдена');
                }}
              />
            </div>

            {/* Ошибка */}
            {submitError && (
              <div className="mb-4 flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {submitError}
              </div>
            )}
            
            {/* Награда за отзыв */}
            <div className="mb-4 bg-accent/10 rounded-xl p-3 flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                За отзыв вы получите <strong>скидку 10%</strong> на любые услуги!
              </span>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowWriteForm(false)}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-bold transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !captchaToken}
                className="flex-1 px-4 py-3 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить отзыв'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Список отзывов */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : reviewsList.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Отзывов пока нет. Будьте первым, кто оставит отзыв!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewsList.map((review) => (
            <div
              key={review.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Звёзды */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  {new Date(review.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
              
              {review.review_text && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {review.review_text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
