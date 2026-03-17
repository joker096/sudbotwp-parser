import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ExternalLinksAdSettings {
  adEnabled: boolean;
  adType: 'modal' | 'direct' | 'interstitial';
  adText: string;
  ctaText: string;
  ctaUrl: string;
  showWarning: boolean;
}

export function useExternalLinksAdSettings() {
  const [settings, setSettings] = useState<ExternalLinksAdSettings>({
    adEnabled: true,
    adType: 'modal',
    adText: 'Хотите получать уведомления о новых событиях по вашему делу?',
    ctaText: 'Подключить мониторинг',
    ctaUrl: '/monitoring',
    showWarning: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [
          'external_links_ad_enabled',
          'external_links_ad_type',
          'external_links_ad_text',
          'external_links_ad_cta_text',
          'external_links_ad_cta_url',
          'external_links_show_warning',
        ]);

      if (error) {
        console.error('Error loading external links ad settings:', error);
        return;
      }

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach((s: { key: string; value: string }) => {
          settingsMap[s.key] = s.value;
        });

        setSettings({
          adEnabled: settingsMap.external_links_ad_enabled !== 'false',
          adType: (settingsMap.external_links_ad_type as 'modal' | 'direct' | 'interstitial') || 'modal',
          adText: settingsMap.external_links_ad_text || 'Хотите получать уведомления о новых событиях по вашему делу?',
          ctaText: settingsMap.external_links_ad_cta_text || 'Подключить мониторинг',
          ctaUrl: settingsMap.external_links_ad_cta_url || '/monitoring',
          showWarning: settingsMap.external_links_show_warning !== 'false',
        });
      }
    } catch (error) {
      console.error('Error loading external links ad settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { settings, isLoading, reloadSettings: loadSettings };
}
