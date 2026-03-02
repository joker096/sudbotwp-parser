import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';

interface SimpleCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
}

export default function SimpleCaptcha({ onVerify, onError }: SimpleCaptchaProps) {
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [charPositions, setCharPositions] = useState<{ x: number; y: number; rotation: number }[]>([]);

  // Генерация случайных символов
  const generateCaptcha = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const length = 5;
    let result = '';
    const positions: { x: number; y: number; rotation: number }[] = [];

    for (let i = 0; i < length; i++) {
      const char = chars.charAt(Math.floor(Math.random() * chars.length));
      result += char;
      positions.push({
        x: Math.random() * 20 + i * 22,
        y: Math.random() * 10 + 5,
        rotation: (Math.random() - 0.5) * 30,
      });
    }

    setCaptchaText(result);
    setCharPositions(positions);
    setUserInput('');
    setIsVerified(false);
    setError('');
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleVerify = async () => {
    if (!userInput.trim()) {
      setError('Введите символы с картинки');
      return;
    }

    if (userInput.toUpperCase() !== captchaText.toUpperCase()) {
      setError('Неверные символы. Попробуйте ещё раз.');
      onError?.('Неверная капча');
      generateCaptcha();
      return;
    }

    setIsLoading(true);
    
    // Имитация верификации
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Генерируем токен
    const token = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setIsVerified(true);
    setIsLoading(false);
    onVerify(token);
  };

  const handleRefresh = () => {
    generateCaptcha();
  };

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
        <Check className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Капча подтверждена
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* CAPTCHA изображение */}
      <div 
        className="relative bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
        style={{ height: '80px' }}
      >
        {/* Фон с шумом */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Символы */}
        <div className="relative h-full flex items-center justify-center">
          <svg 
            width="180" 
            height="60" 
            viewBox="0 0 180 60" 
            className="relative z-10"
          >
            {captchaText.split('').map((char, index) => (
              <text
                key={index}
                x={charPositions[index]?.x || index * 30 + 20}
                y={charPositions[index]?.y || 40}
                fontSize="32"
                fontWeight="bold"
                fill="#1e293b"
                transform={`rotate(${charPositions[index]?.rotation || 0}, ${charPositions[index]?.x || index * 30 + 20}, ${charPositions[index]?.y || 40})`}
                style={{
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '2px',
                }}
              >
                {char}
              </text>
            ))}
            
            {/* Линии помех */}
            {[...Array(3)].map((_, i) => (
              <line
                key={i}
                x1="0"
                y1={Math.random() * 60}
                x2="180"
                y2={Math.random() * 60}
                stroke="#94a3b8"
                strokeWidth="1"
                opacity="0.5"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Кнопка обновления */}
      <button
        type="button"
        onClick={handleRefresh}
        className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-accent transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Обновить картинку
      </button>

      {/* Поле ввода */}
      <div className="space-y-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value.toUpperCase())}
          placeholder="Введите символы"
          maxLength={5}
          className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-accent transition-colors"
        />
        
        {error && (
          <div className="flex items-center gap-1.5 text-red-500 text-xs">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={isLoading || !userInput}
          className="w-full bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Проверка...
            </>
          ) : (
            'Подтвердить'
          )}
        </button>
      </div>
    </div>
  );
}
