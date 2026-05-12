import React from 'react';
import { SecuritySettings } from './SecuritySettings';

/**
 * AdminSecuritySettings - компонент для настроек безопасности в админке
 * Переиспользует существующий компонент SecuritySettings
 */
export const AdminSecuritySettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Безопасность</h3>
      <SecuritySettings />
    </div>
  );
};