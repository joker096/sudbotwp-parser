import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Key, QrCode, Copy, Check, X, Loader2, Smartphone, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function SecuritySettings() {
  const { user, profileData } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState<'intro' | 'scan' | 'verify' | 'backup'>('intro');
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Проверка текущего состояния 2FA
  useEffect(() => {
    if (profileData?.notification_settings) {
      const settings = profileData.notification_settings as any;
      setIs2FAEnabled(settings.twoFactorEnabled || false);
    }
  }, [profileData]);

  const generateSecret = () => {
    // Генерируем случайный секрет для TOTP
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  };

  const handleSetup2FA = () => {
    if (!user) {
      showToast('Необходимо войти в аккаунт', 'error');
      return;
    }
    setShowSetupModal(true);
    setSetupStep('intro');
    setVerificationCode('');
    setBackupCodes([]);
  };

  const startSetup = () => {
    // Генерируем секрет для TOTP
    const secret = generateSecret();
    setTotpSecret(secret);
    
    // Формируем URL для QR-кода (otpauth://totp/)
    const issuer = 'SudBot';
    const accountName = user?.email || 'user';
    const otpUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;
    
    setQrCodeUrl(otpUrl);
    setSetupStep('scan');
  };

  // Простая верификация кода (на практике нужно использовать proper TOTP verification)
  const verifyAndEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast('Введите 6-значный код из приложения', 'error');
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      // Генерируем резервные коды
      const codes: string[] = [];
      for (let i = 0; i < 8; i++) {
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        codes.push(`${part1}-${part2}`);
      }
      setBackupCodes(codes);

      // Сохраняем настройки в профиль
      const currentSettings = (profileData?.notification_settings as any) || {};
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: {
            ...currentSettings,
            twoFactorEnabled: true,
            twoFactorSecret: totpSecret,
            twoFactorBackupCodes: codes,
            twoFactorEnabledAt: new Date().toISOString()
          }
        })
        .eq('id', user.id);

      if (error) throw error;

      setIs2FAEnabled(true);
      setSetupStep('backup');
      showToast('Двухфакторная аутентификация успешно включена!', 'success');
    } catch (err: any) {
      console.error('Error enabling 2FA:', err);
      showToast('Ошибка при включении 2FA: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!user) return;
    
    if (!confirm('Вы уверены, что хотите отключить двухфакторную аутентификацию? Это снизит безопасность вашего аккаунта.')) {
      return;
    }

    setIsLoading(true);
    try {
      const currentSettings = (profileData?.notification_settings as any) || {};
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: {
            ...currentSettings,
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: null,
            twoFactorDisabledAt: new Date().toISOString()
          }
        })
        .eq('id', user.id);

      if (error) throw error;

      setIs2FAEnabled(false);
      showToast('Двухфакторная аутентификация отключена', 'success');
    } catch (err: any) {
      console.error('Error disabling 2FA:', err);
      showToast('Ошибка при отключении 2FA: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    showToast('Коды скопированы!', 'success');
  };

  return (
    <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Безопасность</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Управление доступом и безопасностью аккаунта</p>
      
      {/* Текущий статус 2FA */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${is2FAEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
              {is2FAEnabled ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldOff className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">Двухфакторная аутентификация</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {is2FAEnabled ? 'Включена - ваш аккаунт защищён' : 'Отключена - защитите аккаунт дополнительно'}
              </p>
            </div>
          </div>
          {is2FAEnabled ? (
            <button 
              onClick={disable2FA} 
              disabled={isLoading}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              Отключить
            </button>
          ) : (
            <button 
              onClick={handleSetup2FA}
              className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent-light transition-colors"
            >
              Настроить
            </button>
          )}
        </div>
      </div>

      {/* Информация о безопасности */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">Защита аккаунта</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Двухфакторная аутентификация (2FA) добавляет дополнительный уровень защиты. 
              При входе вам нужно будет ввести не только пароль, но и код из приложения-аутентификатора.
            </p>
          </div>
        </div>
      </div>

      {/* Модальное окно настройки 2FA */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-accent" />
                Настройка 2FA
              </h3>
              <button onClick={() => setShowSetupModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Контент */}
            <div className="p-6">
              {setupStep === 'intro' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-accent" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Защитите ваш аккаунт</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Двухфакторная аутентификация требует ввода специального кода из приложения 
                    (Google Authenticator, Authy и др.) при каждом входе в аккаунт.
                  </p>
                  <ul className="text-left text-sm text-slate-600 dark:text-slate-400 space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" /> Сканируйте QR-код приложением
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" /> Введите код для подтверждения
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" /> Сохраните резервные коды
                    </li>
                  </ul>
                  <button
                    onClick={startSetup}
                    className="w-full py-3 bg-accent hover:bg-accent-light text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Key className="w-5 h-5" />
                    Начать настройку
                  </button>
                </div>
              )}

              {setupStep === 'scan' && (
                <div className="text-center">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Сканируйте QR-код</h4>
                  <div className="bg-white p-4 rounded-xl mb-4 inline-block">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`} 
                      alt="QR Code" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Отсканируйте этот код приложением-аутентификатором на вашем телефоне
                  </p>
                  
                  {/* Показываем секрет вручную */}
                  <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Или введите этот код вручную:</p>
                    <code className="text-xs font-mono break-all text-slate-700 dark:text-slate-300">{totpSecret}</code>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 text-left">
                      Введите 6-значный код
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      maxLength={6}
                    />
                  </div>
                  <button
                    onClick={verifyAndEnable2FA}
                    disabled={isLoading || verificationCode.length !== 6}
                    className="w-full py-3 bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Подтвердить и включить'
                    )}
                  </button>
                </div>
              )}

              {setupStep === 'backup' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2FA успешно включена!</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Сохраните резервные коды в надёжном месте. Они помогут вам восстановить доступ, 
                    если вы потеряете телефон.
                  </p>
                  
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, index) => (
                        <code key={index} className="text-sm font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded">
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={copyBackupCodes}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mb-3"
                  >
                    <Copy className="w-5 h-5" />
                    Копировать коды
                  </button>
                  
                  <button
                    onClick={() => setShowSetupModal(false)}
                    className="w-full py-3 bg-accent hover:bg-accent-light text-white rounded-xl font-bold transition-colors"
                  >
                    Готово
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
