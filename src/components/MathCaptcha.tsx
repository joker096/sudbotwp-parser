import { useState, useCallback } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export default function MathCaptcha({ onVerify, answer }: { onVerify: (valid: boolean) => void; answer?: string }) {
  const [a, setA] = useState(Math.floor(Math.random() * 10) + 1);
  const [b, setB] = useState(Math.floor(Math.random() * 10) + 1);
  const [userAnswer, setUserAnswer] = useState('');
  const [verified, setVerified] = useState(false);

  const correctAnswer = a + b;

  const regenerate = useCallback(() => {
    const newA = Math.floor(Math.random() * 10) + 1;
    const newB = Math.floor(Math.random() * 10) + 1;
    setA(newA);
    setB(newB);
    setUserAnswer('');
    setVerified(false);
  }, []);

  const handleVerify = useCallback(() => {
    const answer = parseInt(userAnswer, 10);
    if (!isNaN(answer) && answer === correctAnswer) {
      setVerified(true);
      onVerify(true);
    } else {
      setVerified(false);
    }
  }, [userAnswer, correctAnswer, onVerify]);

  if (answer) {
    return (
      <div className="text-center text-sm text-slate-400">
        Правильный ответ: {answer} (для тестирования)
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {a} + {b} = ?
          </span>
        </div>
        <button
          type="button"
          onClick={regenerate}
          className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          aria-label="Новый вопрос"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="number"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Введите ответ"
          className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={verified}
          className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${
            verified
              ? 'bg-green-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
          } disabled:opacity-50`}
        >
          {verified ? '✓' : 'Проверить'}
        </button>
      </div>

      {userAnswer && parseInt(userAnswer, 10) !== correctAnswer && (
        <p className="text-xs text-red-500">Неправильно. Попробуйте ещё раз.</p>
      )}
    </div>
  );
}
