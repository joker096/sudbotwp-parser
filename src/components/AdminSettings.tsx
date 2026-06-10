import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Save, AlertCircle, BarChart3, ToggleLeft, ToggleRight, Megaphone, ExternalLink, List, ArrowRight, Clock, Layout, Grid3X3, Home, MessageCircle, Plus, X, FileText, Upload, File, Edit, Trash2, Shield, Users, Users as UsersIcon, Check, X as XIcon, RotateCcw, Archive, User as UserIcon, Calendar } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import AILawyerAnalytics from './AILawyerAnalytics';
import { ConfirmModal, useConfirmModal } from './ConfirmModal';
import LawyerModal from './LawyerModal';

interface SiteSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  file_url: string | null;
  file_name: string | null;
  is_active: boolean;
}

const TABS: { id: 'general' | 'ads' | 'templates' | 'analytics' | 'archived' | 'calendar'; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'Основные', icon: Layout },
  { id: 'ads', label: 'Реклама', icon: Megaphone },
  { id: 'templates', label: 'Шаблоны', icon: FileText },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'archived', label: 'Архив и юристы', icon: Archive },
  { id: 'calendar', label: 'Календарь', icon: Calendar },
];

const AdminSettings = () => {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'ads' | 'templates' | 'analytics' | 'archived' | 'calendar'>('general');
  const [adminArchiveSubTab, setAdminArchiveSubTab] = useState<'archived' | 'lawyers'>('lawyers');
  const { showToast } = useToast();
  const confirmModal = useConfirmModal();

  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  // Lawyers state
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [lawyersLoading, setLawyersLoading] = useState(false);
  const [lawyersSearch, setLawyersSearch] = useState('');
  const [lawyersFilterStatus, setLawyersFilterStatus] = useState('all');

  // Archived cases state
  const [archivedCases, setArchivedCases] = useState<any[]>([]);
  const [archivedCasesLoading, setArchivedCasesLoading] = useState(false);
  const [archivedCasesSearch, setArchivedCasesSearch] = useState('');
  const [archivedCasesStatusFilter, setArchivedCasesStatusFilter] = useState('all');

  // Lawyer modal state
  const [showLawyerModal, setShowLawyerModal] = useState(false);
  const [editingLawyer, setEditingLawyer] = useState<any | null>(null);

  const TEMPLATE_CATEGORIES = ['Иски', 'Защита', 'Ходатайства', 'Жалобы', 'Претензии', 'Доказательства', 'Полномочия'];
  const TEMPLATE_ICONS = ['📝', '🛡️', '📋', '⚖️', '📇', '✉️', '💰', '📜', '📄', '🔒', '📌', '📎'];

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
    fetchLawyers();
    fetchArchivedCases();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('key', { ascending: true });

      if (error) {
        throw error;
      }

      setSettings(data as SiteSetting[]);
    } catch (err: any) {
      setError('Не удалось загрузить настройки сайта.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

 const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading templates:', error);
        return;
      }

      if (data) {
        setTemplates(data);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchLawyers = async () => {
    setLawyersLoading(true);
    try {
      const { data, error } = await supabase
        .from('lawyers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error loading lawyers:', error);
        return;
      }
      setLawyers(data || []);
    } catch (err) {
      console.error('Error loading lawyers:', err);
    } finally {
      setLawyersLoading(false);
    }
  };

  const fetchArchivedCases = async () => {
    setArchivedCasesLoading(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('status', 'archived')
        .order('updated_at', { ascending: false });
      if (error) {
        console.error('Error loading archived cases:', error);
        return;
      }
      setArchivedCases(data || []);
    } catch (err) {
      console.error('Error loading archived cases:', err);
    } finally {
      setArchivedCasesLoading(false);
    }
  };

  const handleRestoreCase = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status: 'active' })
        .eq('id', caseId);
      if (error) {
        console.error('Error restoring case:', error);
        showToast('Ошибка при восстановлении дела');
        return;
      }
      setArchivedCases(prev => prev.filter(c => c.id !== caseId));
      showToast('Дело восстановлено');
    } catch (err) {
      console.error('Error restoring case:', err);
      showToast('Ошибка при восстановлении дела');
    }
  };

  const handleSaveTemplate = async (template: Partial<DocumentTemplate>, file?: File) => {
    try {
      let fileUrl = template.file_url || null;
      let fileName = template.file_name || null;

      if (file) {
        setUploadingTemplate(true);
        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const path = `templates/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          showToast('Ошибка загрузки файла');
          setUploadingTemplate(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(path);

        fileUrl = urlData.publicUrl;
        fileName = file.name;
        setUploadingTemplate(false);
      }

      if (editingTemplate?.id) {
        const { error } = await supabase
          .from('document_templates')
          .update({
            name: template.name,
            description: template.description,
            category: template.category,
            icon: template.icon,
            file_url: fileUrl,
            file_name: fileName,
is_active: template.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        showToast('Шаблон обновлен');
      } else {
        const { error } = await supabase
          .from('document_templates')
          .insert([{
            name: template.name,
            description: template.description,
            category: template.category,
            icon: template.icon || '📄',
            file_url: fileUrl,
            file_name: fileName,
            is_active: true,
          }]);

        if (error) throw error;
        showToast('Шаблон добавлен');
      }

      setShowTemplateModal(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      console.error('Error saving template:', err);
      showToast('Ошибка сохранения шаблона');
    }
  };

  const handleDeleteTemplate = (id: string) => {
    confirmModal.confirm({
      title: 'Деактивировать шаблон',
      message: 'Вы уверены, что хотите деактивировать этот шаблон?',
      confirmText: 'Деактивировать',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('document_templates')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) throw error;
          showToast('Шаблон деактивирован');
          fetchTemplates();
        } catch (err: any) {
          console.error('Error deleting template:', err);
          showToast('Ошибка удаления шаблона');
        }
      },
    });
  };

  const handleToggleLawyerActive = async (lawyerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('lawyers')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', lawyerId)
        .select()
        .single();

      if (error) throw error;
      showToast(isActive ? 'Юрист активирован' : 'Юрист деактивирован');
      fetchLawyers();
    } catch (err: any) {
      console.error('Error toggling lawyer:', err);
      showToast('Ошибка при изменении статуса');
    }
  };

  const handleDeleteLawyer = (id: string) => {
    confirmModal.confirm({
      title: 'Удалить юриста',
      message: 'Вы уверены, что хотите удалить этого юриста?',
      confirmText: 'Удалить',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('lawyers')
            .update({ is_active: false, status: 'blocked', updated_at: new Date().toISOString() })
            .eq('id', id);

          if (error) throw error;
          showToast('Юрист удалён');
          fetchLawyers();
        } catch (err: any) {
          console.error('Error deleting lawyer:', err);
          showToast('Ошибка удаления юриста');
        }
      },
    });
  };

  const handleEditLawyer = (lawyer: any) => {
    setEditingLawyer(lawyer);
    setShowLawyerModal(true);
  };

  const handleAddLawyer = () => {
    setEditingLawyer(null);
    setShowLawyerModal(true);
  };

  const handleSaveLawyer = async (lawyerData: any, file?: File) => {
    try {
      if (file) {
        setUploadingTemplate(true);
        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const path = `avatars/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          showToast('Ошибка загрузки аватара');
          setUploadingTemplate(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);

        lawyerData.avatar_url = path;
      }

      const cleanLawyerData = {
        name: lawyerData.name,
        spec: lawyerData.specialization || lawyerData.spec || null,
        specialization: lawyerData.specialization,
        city: lawyerData.city,
        region: lawyerData.region,
        phone: lawyerData.phone,
        email: lawyerData.email,
        website: lawyerData.website,
        experience: lawyerData.experience,
        license_number: lawyerData.license_number,
        description: lawyerData.description,
        avatar_url: lawyerData.avatar_url,
        rating: lawyerData.rating,
        is_active: lawyerData.is_active,
        verified: lawyerData.verified,
        is_featured: lawyerData.is_featured,
        practice_areas: lawyerData.practice_areas,
        languages: lawyerData.languages,
        subscription_tier: lawyerData.subscription_tier,
        experience_years: lawyerData.experience_years,
        telegram: lawyerData.telegram,
      };

      if (editingLawyer?.id) {
        const { error } = await supabase
          .from('lawyers')
          .update({
            ...cleanLawyerData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLawyer.id);

        if (error) throw error;
        showToast('Юрист обновлён');
      } else {
        const { error } = await supabase
          .from('lawyers')
          .insert([{
            ...cleanLawyerData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_active: true,
          }]);

        if (error) throw error;
        showToast('Юрист добавлен');
      }

      setShowLawyerModal(false);
      setEditingLawyer(null);
      fetchLawyers();
    } catch (err: any) {
      console.error('Error saving lawyer:', err);
      showToast('Ошибка сохранения юриста');
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setSettings(currentSettings =>
      currentSettings.map(s => (s.id === id ? { ...s, value } : s))
    );
  };

  const handleToggleChange = (id: string) => {
    setSettings(currentSettings =>
      currentSettings.map(s => {
        if (s.id === id) {
          const newValue = s.value === 'true' ? 'false' : 'true';
          return { ...s, value: newValue };
        }
        return s;
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      for (const setting of settings) {
        const { error } = await supabase
          .from('site_settings')
          .update({ value: setting.value })
          .eq('id', setting.id);

        if (error) throw error;
      }

      showToast('Настройки успешно сохранены');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      showToast('Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  const gaIdSetting = settings.find(s => s.key === 'ga_measurement_id');
  const gaEnabledSetting = settings.find(s => s.key === 'ga_enabled');

  const blogAdsEnabledSetting = settings.find(s => s.key === 'blog_ads_enabled');
  const blogAdAfterParagraphSetting = settings.find(s => s.key === 'blog_ad_after_paragraph');
  const blogAdYandexCodeSetting = settings.find(s => s.key === 'blog_ad_yandex_code');
  const blogAdGoogleCodeSetting = settings.find(s => s.key === 'blog_ad_google_code');
  const blogAdCustomCodeSetting = settings.find(s => s.key === 'blog_ad_custom_code');
  const blogAdTextSetting = settings.find(s => s.key === 'blog_ad_text');
  const blogAdDescSetting = settings.find(s => s.key === 'blog_ad_desc');
  const blogAdCtaSetting = settings.find(s => s.key === 'blog_ad_cta');
  const blogAdUrlSetting = settings.find(s => s.key === 'blog_ad_url');
  const blogAdImageUrlSetting = settings.find(s => s.key === 'blog_ad_image_url');

  const externalLinksAdEnabledSetting = settings.find(s => s.key === 'external_links_ad_enabled');
  const externalLinksAdTypeSetting = settings.find(s => s.key === 'external_links_ad_type');
  const externalLinksShowWarningSetting = settings.find(s => s.key === 'external_links_show_warning');
  const externalLinksAdTextSetting = settings.find(s => s.key === 'external_links_ad_text');
  const externalLinksAdCtaTextSetting = settings.find(s => s.key === 'external_links_ad_cta_text');
  const externalLinksAdCtaUrlSetting = settings.find(s => s.key === 'external_links_ad_cta_url');

  const siteAdsEnabledSetting = settings.find(s => s.key === 'site_ads_enabled');
  const globalYandexSetting = settings.find(s => s.key === 'site_ads_global_yandex');
  const globalGoogleSetting = settings.find(s => s.key === 'site_ads_global_google');
  const globalCustomSetting = settings.find(s => s.key === 'site_ads_global_custom');

  const searchAdEnabledSetting = settings.find(s => s.key === 'ad_search_enabled');
  const lawyersAdEnabledSetting = settings.find(s => s.key === 'ad_lawyers_enabled');
  const leadsAdEnabledSetting = settings.find(s => s.key === 'ad_leads_enabled');
  const monitoringAdEnabledSetting = settings.find(s => s.key === 'ad_monitoring_enabled');
  const calculatorAdEnabledSetting = settings.find(s => s.key === 'ad_calculator_enabled');
  const homepageAdEnabledSetting = settings.find(s => s.key === 'ad_homepage_enabled');
  
  const homepageBannerTextSetting = settings.find(s => s.key === 'ad_homepage_banner_text');
  const homepageBannerDescSetting = settings.find(s => s.key === 'ad_homepage_banner_desc');
  const homepageBannerCtaSetting = settings.find(s => s.key === 'ad_homepage_banner_cta');
  const homepageBannerUrlSetting = settings.find(s => s.key === 'ad_homepage_banner_url');
  const homepageBannerImageUrlSetting = settings.find(s => s.key === 'ad_homepage_banner_image_url');

  const frequencyLimitSetting = settings.find(s => s.key === 'ad_frequency_limit');

  const getArchivedCaseDisplayNumber = (caseItem: any) =>
    String(caseItem?.number || caseItem?.case_number || '').trim();

  const getArchivedCaseDisplayCourt = (caseItem: any) =>
    String(caseItem?.court || caseItem?.court_name || '').trim();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <>
            {/* Google Analytics */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Google Analytics</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Отслеживание посещаемости сайта</p>
                </div>
              </div>
              <div className="space-y-4">
                {gaEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Включить Google Analytics</p>
                    <button onClick={() => handleToggleChange(gaEnabledSetting.id)}>
                      {gaEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
                {gaIdSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Measurement ID</label>
                    <input
                      type="text"
                      value={gaIdSetting.value}
                      onChange={(e) => handleInputChange(gaIdSetting.id, e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* External Links */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
                  <ExternalLink className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Внешние ссылки</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Настройка поведения при переходе по внешним ссылкам</p>
                </div>
              </div>
              <div className="space-y-4">
                {externalLinksAdEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Показывать рекламу</p>
                    <button onClick={() => handleToggleChange(externalLinksAdEnabledSetting.id)}>
                      {externalLinksAdEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
                {externalLinksAdTypeSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Тип отображения</label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleInputChange(externalLinksAdTypeSetting.id, 'modal')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${externalLinksAdTypeSetting.value === 'modal' ? 'bg-accent text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                      >
                        <List className="w-4 h-4 inline mr-1" />Модальное
                      </button>
                      <button
                        onClick={() => handleInputChange(externalLinksAdTypeSetting.id, 'direct')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${externalLinksAdTypeSetting.value === 'direct' ? 'bg-accent text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                      >
                        <ArrowRight className="w-4 h-4 inline mr-1" />Прямой
                      </button>
                      <button
                        onClick={() => handleInputChange(externalLinksAdTypeSetting.id, 'interstitial')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${externalLinksAdTypeSetting.value === 'interstitial' ? 'bg-accent text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
                      >
                        <Clock className="w-4 h-4 inline mr-1" />С задержкой
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Frequency Limits */}
            {frequencyLimitSetting && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Ограничения показа</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Настройка частоты показа рекламы</p>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Максимум блоков на странице</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={frequencyLimitSetting.value || '3'}
                    onChange={(e) => handleInputChange(frequencyLimitSetting.id, e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </>
        );

      case 'ads':
        return (
          <>
            {/* Global Ads Settings */}
            {siteAdsEnabledSetting && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Layout className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Глобальные настройки рекламы</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Управление рекламой на всем сайте</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Включить показ рекламы</p>
                    <button onClick={() => handleToggleChange(siteAdsEnabledSetting.id)}>
                      {siteAdsEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                  {globalYandexSetting && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Код Яндекс.Рекламы</label>
                      <textarea
                        value={globalYandexSetting.value}
                        onChange={(e) => handleInputChange(globalYandexSetting.id, e.target.value)}
                        placeholder="<!-- Яндекс.Реклама -->"
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm font-mono"
                        rows={3}
                      />
                    </div>
                  )}
                  {globalGoogleSetting && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Код Google AdSense</label>
                      <textarea
                        value={globalGoogleSetting.value}
                        onChange={(e) => handleInputChange(globalGoogleSetting.id, e.target.value)}
                        placeholder="Google AdSense code"
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm font-mono"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Page-specific Ads */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Grid3X3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Реклама на страницах</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Включение/отключение на отдельных страницах</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {homepageAdEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Главная</span>
                    <button onClick={() => handleToggleChange(homepageAdEnabledSetting.id)}>
                      {homepageAdEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
                {searchAdEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Поиск</span>
                    <button onClick={() => handleToggleChange(searchAdEnabledSetting.id)}>
                      {searchAdEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
                {lawyersAdEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Юристы</span>
                    <button onClick={() => handleToggleChange(lawyersAdEnabledSetting.id)}>
                      {lawyersAdEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
                {leadsAdEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Лиды</span>
                    <button onClick={() => handleToggleChange(leadsAdEnabledSetting.id)}>
                      {leadsAdEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
                {monitoringAdEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Мониторинг</span>
                    <button onClick={() => handleToggleChange(monitoringAdEnabledSetting.id)}>
                      {monitoringAdEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
                {calculatorAdEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Калькулятор</span>
                    <button onClick={() => handleToggleChange(calculatorAdEnabledSetting.id)}>
                      {calculatorAdEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Homepage Banner Settings */}
            {(homepageBannerTextSetting || homepageBannerImageUrlSetting) && (
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <Home className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Баннер на главной странице</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Настройка кастомного баннера (текст + изображение)</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {homepageBannerImageUrlSetting && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL изображения баннера</label>
                      <input
                        type="text"
                        value={homepageBannerImageUrlSetting.value}
                        onChange={(e) => handleInputChange(homepageBannerImageUrlSetting.id, e.target.value)}
                        placeholder="https://example.com/banner.jpg"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">Рекомендуемый размер: 300x200 пикселей</p>
                    </div>
                  )}
                  {homepageBannerTextSetting && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Заголовок баннера</label>
                      <input
                        type="text"
                        value={homepageBannerTextSetting.value}
                        onChange={(e) => handleInputChange(homepageBannerTextSetting.id, e.target.value)}
                        placeholder="Ваша реклама здесь"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {homepageBannerDescSetting && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Описание баннера</label>
                      <textarea
                        value={homepageBannerDescSetting.value}
                        onChange={(e) => handleInputChange(homepageBannerDescSetting.id, e.target.value)}
                        placeholder="Нативное размещение рекламы..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                  {homepageBannerCtaSetting && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Текст кнопки</label>
                      <input
                        type="text"
                        value={homepageBannerCtaSetting.value}
                        onChange={(e) => handleInputChange(homepageBannerCtaSetting.id, e.target.value)}
                        placeholder="Узнать подробнее"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  {homepageBannerUrlSetting && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ссылка (URL)</label>
                      <input
                        type="text"
                        value={homepageBannerUrlSetting.value}
                        onChange={(e) => handleInputChange(homepageBannerUrlSetting.id, e.target.value)}
                        placeholder="/leads или https://example.com"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Blog Ads */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Megaphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Реклама в статьях</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Настройка рекламы внутри статей блога</p>
                </div>
              </div>
              <div className="space-y-4">
                {blogAdsEnabledSetting && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Показывать рекламу в статьях</p>
                    <button onClick={() => handleToggleChange(blogAdsEnabledSetting.id)}>
                      {blogAdsEnabledSetting.value === 'true' ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                    </button>
                  </div>
                )}
                {blogAdAfterParagraphSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">После N-го абзаца</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={blogAdAfterParagraphSetting.value || '3'}
                      onChange={(e) => handleInputChange(blogAdAfterParagraphSetting.id, e.target.value)}
                      className="w-24 bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}
                {blogAdYandexCodeSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Код Яндекс.Рекламы</label>
                    <textarea
                      value={blogAdYandexCodeSetting.value}
                      onChange={(e) => handleInputChange(blogAdYandexCodeSetting.id, e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm font-mono"
                      rows={4}
                    />
                  </div>
                )}

                {blogAdTextSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Заголовок баннера</label>
                    <input
                      type="text"
                      value={blogAdTextSetting.value}
                      onChange={(e) => handleInputChange(blogAdTextSetting.id, e.target.value)}
                      placeholder="Ваша реклама здесь"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {blogAdDescSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Описание баннера</label>
                    <textarea
                      value={blogAdDescSetting.value}
                      onChange={(e) => handleInputChange(blogAdDescSetting.id, e.target.value)}
                      placeholder="Нативное размещение рекламы для вашей целевой аудитории..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                )}

                {blogAdCtaSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Текст кнопки</label>
                    <input
                      type="text"
                      value={blogAdCtaSetting.value}
                      onChange={(e) => handleInputChange(blogAdCtaSetting.id, e.target.value)}
                      placeholder="Узнать подробнее"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {blogAdUrlSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ссылка (URL)</label>
                    <input
                      type="text"
                      value={blogAdUrlSetting.value}
                      onChange={(e) => handleInputChange(blogAdUrlSetting.id, e.target.value)}
                      placeholder="/leads или https://example.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {blogAdImageUrlSetting && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL изображения баннера</label>
                    <input
                      type="text"
                      value={blogAdImageUrlSetting.value}
                      onChange={(e) => handleInputChange(blogAdImageUrlSetting.id, e.target.value)}
                      placeholder="https://example.com/banner.jpg"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Рекомендуемый размер: 300x200 пикселей</p>
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case 'templates':
        return (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
                  <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Шаблоны документов</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Управление шаблонами для библиотеки документов</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
                className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{template.name}</p>
                        <p className="text-xs text-slate-500">{template.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${template.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {template.is_active ? 'Активен' : 'Деактивирован'}
                      </span>
                      <button
                        onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }}
                        className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">Шаблоны не найдены. Создайте первый шаблон.</p>
            )}
          </div>
        );

      case 'analytics':
        return (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Аналитика ИИ-юриста</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Статистика использования и популярные запросы</p>
              </div>
            </div>
            <AILawyerAnalytics />
          </div>
        );

      case 'archived':
        const filteredLawyers = lawyers.filter(lawyer => {
          const matchesSearch = lawyersSearch === '' ||
            lawyer.name?.toLowerCase().includes(lawyersSearch.toLowerCase()) ||
            lawyer.city?.toLowerCase().includes(lawyersSearch.toLowerCase());
          const matchesFilter = lawyersFilterStatus === 'all' ||
            (lawyersFilterStatus === 'active' && lawyer.is_active) ||
            (lawyersFilterStatus === 'inactive' && !lawyer.is_active);
          return matchesSearch && matchesFilter;
        });
        const filteredArchivedCases = archivedCases.filter((caseItem) => {
          const search = archivedCasesSearch.trim().toLowerCase();
          const displayNumber = getArchivedCaseDisplayNumber(caseItem).toLowerCase();
          const displayCourt = getArchivedCaseDisplayCourt(caseItem).toLowerCase();
          const matchesSearch =
            search === '' ||
            displayNumber.includes(search) ||
            displayCourt.includes(search);
          const matchesStatus =
            archivedCasesStatusFilter === 'all' ||
            String(caseItem.status || '').toLowerCase() === archivedCasesStatusFilter;
          return matchesSearch && matchesStatus;
        });

        return (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  {adminArchiveSubTab === 'archived' ? (
                    <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {adminArchiveSubTab === 'archived' ? 'Архив дел' : 'Управление юристами'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {adminArchiveSubTab === 'archived' ? `Всего: ${archivedCases.length} дел` : `Всего: ${lawyers.length} юристов`}
                  </p>
                </div>
              </div>
              {adminArchiveSubTab === 'lawyers' && (
                <button
                  onClick={handleAddLawyer}
                  className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Добавить юриста
                </button>
              )}
            </div>

            <div className="flex gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl mb-4 w-fit">
              <button
                onClick={() => setAdminArchiveSubTab('archived')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  adminArchiveSubTab === 'archived'
                    ? 'bg-slate-900 dark:bg-accent text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Архив дел
              </button>
              <button
                onClick={() => setAdminArchiveSubTab('lawyers')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  adminArchiveSubTab === 'lawyers'
                    ? 'bg-slate-900 dark:bg-accent text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Юристы
              </button>
            </div>

            {adminArchiveSubTab === 'archived' ? (
              <>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={archivedCasesSearch}
                      onChange={(e) => setArchivedCasesSearch(e.target.value)}
                      placeholder="Поиск по номеру дела или суду..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <select
                    value={archivedCasesStatusFilter}
                    onChange={(e) => setArchivedCasesStatusFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">Все статусы</option>
                    <option value="archived">Архив</option>
                  </select>
                </div>

                {archivedCasesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : filteredArchivedCases.length > 0 ? (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto">
                    {filteredArchivedCases.map((caseItem) => (
                      <div key={caseItem.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {getArchivedCaseDisplayNumber(caseItem) || 'Номер дела не указан'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {getArchivedCaseDisplayCourt(caseItem) || 'Суд не указан'} {caseItem.updated_at ? `• ${new Date(caseItem.updated_at).toLocaleDateString('ru-RU')}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreCase(caseItem.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:opacity-90 transition-opacity"
                        >
                          Восстановить
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Archive className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">В архиве пока нет дел</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={lawyersSearch}
                      onChange={(e) => setLawyersSearch(e.target.value)}
                      placeholder="Поиск по имени или городу..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <select
                    value={lawyersFilterStatus}
                    onChange={(e) => setLawyersFilterStatus(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">Все</option>
                    <option value="active">Активные</option>
                    <option value="inactive">Неактивные</option>
                  </select>
                </div>

                {lawyersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : filteredLawyers.length > 0 ? (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto">
                    {filteredLawyers.map((lawyer) => (
                      <div
                        key={lawyer.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {lawyer.avatar_url || lawyer.img ? (
                            <img
                              src={lawyer.avatar_url && lawyer.avatar_url.includes('/storage/')
                                ? lawyer.avatar_url
                                : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${lawyer.avatar_url || lawyer.img || ''}`}
                              alt={lawyer.name}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = lawyer.img || '';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{lawyer.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lawyer.specialization || lawyer.spec} • {lawyer.city}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={() => handleToggleLawyerActive(lawyer.id, !lawyer.is_active)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                              lawyer.is_active
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {lawyer.is_active ? 'Активен' : 'Неактивен'}
                          </button>
                          <button
                            onClick={() => handleEditLawyer(lawyer)}
                            className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                            title="Редактировать"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLawyer(lawyer.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Юристы не найдены</p>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'calendar':
        return (
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Календарь</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Раздел управления календарём в админке</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Вкладка добавлена после архива, как вы просили.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Настройки администратора</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Управление системными настройками сайта</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-accent shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {renderTabContent()}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          categories={TEMPLATE_CATEGORIES}
          icons={TEMPLATE_ICONS}
          onSave={handleSaveTemplate}
          onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
        />
      )}

      {/* Lawyer Modal */}
      {showLawyerModal && (
        <LawyerModal
          lawyer={editingLawyer}
          onSave={handleSaveLawyer}
          onClose={() => { setShowLawyerModal(false); setEditingLawyer(null); }}
        />
      )}



      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-accent hover:bg-accent-light text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Сохранить
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;


function TemplateModal({
  template,
  categories,
  icons,
  onSave,
  onClose,
}: {
  template: DocumentTemplate | null;
  categories: string[];
  icons: string[];
  onSave: (template: Partial<DocumentTemplate>, file?: File) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || categories[0]);
  const [icon, setIcon] = useState(template?.icon || icons[0]);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState(template?.file_name || '');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsUploading(true);
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      icon,
      file_url: template?.file_url || null,
      file_name: template?.file_name || null,
      is_active: isActive,
    }, selectedFile || undefined);
    setIsUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {template ? 'Редактировать шаблон' : 'Добавить шаблон'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Исковое заявление"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание шаблона..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Категория</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Иконка</label>
            <div className="flex gap-2 flex-wrap">
              {icons.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`text-2xl p-2 rounded-lg transition-all ${icon === i ? 'bg-accent/20 ring-2 ring-accent' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Файл шаблона</label>
            {template?.file_url ? (
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg mb-2">
                <File className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-300 flex-1 truncate">{fileName || template.file_name}</span>
                <button
                  type="button"
                  onClick={() => window.open(template.file_url!, '_blank')}
                  className="text-xs text-accent hover:underline"
                >
                  Скачать
                </button>
              </div>
            ) : null}
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
              <input
                type="file"
                id="template-file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                    setFileName(e.target.files[0].name);
                  }
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                className="hidden"
              />
              <label htmlFor="template-file" className="cursor-pointer">
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <span className="text-xs text-slate-500">
                  {selectedFile ? selectedFile.name : 'Выберите файл или перетащите'}
                </span>
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFile(null);
                  }}
                  className="mt-2 text-xs text-red-500 hover:underline"
                >
                  Удалить файл
                </button>
              )}
            </div>
          </div>

          {template && (
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Активен</span>
              <button type="button" onClick={() => setIsActive(!isActive)}>
                {isActive ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent-light transition-all disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (template ? 'Сохранить' : 'Добавить')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

