import React from 'react';

// This component is currently a placeholder but is ready for future 2FA logic.
export default function SecuritySettings() {
  const handleSetup2FA = () => {
    // Logic to open 2FA setup modal will be implemented here.
    console.log("Setup 2FA clicked");
    // For now, we can show an alert or a toast message.
    alert('Функция настройки двухфакторной аутентификации находится в разработке.');
  };

  return (
    <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Безопасность</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Управление доступом и безопасностью аккаунта</p>
      
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">Двухфакторная аутентификация</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Защитите аккаунт дополнительным подтверждением</p>
          </div>
          <button onClick={handleSetup2FA} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
            Настроить
          </button>
        </div>
      </div>
    </div>
  );
}