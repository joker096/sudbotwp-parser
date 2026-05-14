import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Upload, FileText, File, Image, Download, Trash2, Search, Lock, Eye, FileCheck, Scale, Loader2, X, FileDigit, Building2, ExternalLink, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSeo } from '../hooks/useSeo';
import { supabase } from '../lib/supabase';

// Тип для документа из pravo.gov.ru
interface PravoDoc {
  id: string;
  url: string;
  authority: string;
  source: string;
  publishDate?: string;
  regNumber?: string;
}

interface CourtDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  created_at: string;
  url?: string;
  path?: string;
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  file_url: string | null;
  file_name: string | null;
}

// Fallback шаблоны (если БД недоступна)
const DEFAULT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'isk',
    name: 'Исковое заявление',
    description: 'Стандартный шаблон искового заявления в суд общей юрисдикции',
    category: 'Иски',
    icon: '📝',
    file_url: null,
    file_name: null,
  },
  {
    id: 'objection',
    name: 'Возражения на иск',
    description: 'Возражения на исковое заявление ответчика',
    category: 'Защита',
    icon: '🛡️',
    file_url: null,
    file_name: null,
  },
  {
    id: 'motion',
    name: 'Ходатайство',
    description: 'Ходатайство о назначении экспертизы, привлечении свидетелей и т.д.',
    category: 'Ходатайства',
    icon: '📋',
    file_url: null,
    file_name: null,
  },
  {
    id: 'appeal',
    name: 'Апелляционная жалоба',
    description: 'Жалоба на решение суда в апелляционную инстанцию',
    category: 'Жалобы',
    icon: '⚖️',
    file_url: null,
    file_name: null,
  },
  {
    id: 'cassation',
    name: 'Кассационная жалоба',
    description: 'Жалоба в кассационную инстанцию',
    category: 'Жалобы',
    icon: '📇',
    file_url: null,
    file_name: null,
  },
  {
    id: 'claim',
    name: 'Досудебная претензия',
    description: 'Претензия перед подачей иска (обязательный досудебный порядок)',
    category: 'Претензии',
    icon: '✉️',
    file_url: null,
    file_name: null,
  },
  {
    id: 'receipt',
    name: 'Расписка',
    description: 'Расписка о получении денег/имущества',
    category: 'Доказательства',
    icon: '💰',
    file_url: null,
    file_name: null,
  },
  {
    id: 'power',
    name: 'Доверенность',
    description: 'Доверенность на представление интересов в суде',
    category: 'Полномочия',
    icon: '📜',
    file_url: null,
    file_name: null,
  },
  {
    id: 'forms',
    name: 'Стандартная форма заявления',
    description: 'Универсальная форма заявления, бланк для заполнения',
    category: 'Формы и бланки',
    icon: '📋',
    file_url: null,
    file_name: null,
  },
  // Гражданство templates (fallback)
  {
    id: 'citizenship',
    name: 'Заявление о принятии в гражданство',
    description: 'Заявление о принятии в гражданство РФ в общем порядке для лиц старше 18 лет',
    category: 'Гражданство',
    icon: '🆙',
    file_url: null,
    file_name: null,
  },
  {
    id: 'consent',
    name: 'Согласие законных представителей',
    description: 'Согласие родителей на гражданство РФ для ребенка',
    category: 'Гражданство',
    icon: '👨‍👩‍👧',
    file_url: null,
    file_name: null,
  },
  {
    id: 'renunciation',
    name: 'Заявление об отказе от предыдущего гражданства',
    description: 'Заявление о выходе из иностранного гражданства',
    category: 'Гражданство',
    icon: '❌',
    file_url: null,
    file_name: null,
  },
  {
    id: 'autobio',
    name: 'Автобиография',
    description: 'Автобиография для заявления о гражданстве',
    category: 'Гражданство',
    icon: '📖',
    file_url: null,
    file_name: null,
  },
  {
    id: 'identity',
    name: 'Анкета для установления личности',
    description: 'Анкета-опросник для гражданства',
    category: 'Гражданство',
    icon: '🆔',
    file_url: null,
    file_name: null,
  },
];

const CATEGORIES = ['Все', 'Иски', 'Защита', 'Ходатайства', 'Жалобы', 'Претензии', 'Доказательства', 'Полномочия'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
  if (type.includes('word') || type.includes('document')) return <FileText className="w-8 h-8 text-blue-500" />;
  if (type.includes('excel') || type.includes('spreadsheet')) return <FileDigit className="w-8 h-8 text-green-500" />;
  if (type.includes('image')) return <Image className="w-8 h-8 text-purple-500" />;
  return <File className="w-8 h-8 text-slate-400" />;
}

export default function DocumentsLibrary() {
  const { isAuthenticated, user } = useAuth();
  const { setSeo } = useSeo('/documents');
  
  const [activeTab, setActiveTab] = useState<'my' | 'templates' | 'official'>('templates');
  const [pravoDocs, setPravoDocs] = useState<PravoDoc[]>([]);
  const [pravoLoading, setPravoLoading] = useState(false);
  const [pravoLoaded, setPravoLoaded] = useState(false);
  const [pravoSearch, setPravoSearch] = useState('');
  const [pravoPage, setPravoPage] = useState(1);
  const [pravoCategory, setPravoCategory] = useState('Все');
  const [pravoSubcategory, setPravoSubcategory] = useState('Все');
  const [selectedDoc, setSelectedDoc] = useState<PravoDoc | null>(null);

  // Категории для официальных документов
  const pravoCategories = ['Все', 'Министерства', 'Департаменты', 'Комитеты', 'Управления', 'Правительства', 'Губернаторы', 'Службы', 'Администрации', 'Агентства', 'Инспекции', 'Главные управления', 'Мировые суды', 'Другие'];

  // Подкатегории - регионы (формируются динамически)
  const getSubcategories = (): string[] => {
    const regions = [...new Set(pravoDocs
      .filter(d => pravoCategory === 'Все' || getPravoCategory(d.authority) === pravoCategory)
      .map(d => {
        const a = d.authority;
        // Извлекаем регион из названия
        if (a.includes('области') || a.includes('область')) return 'Области';
        if (a.includes('края') || a.includes('край')) return 'Края';
        if (a.includes('республики') || a.includes('Республика')) return 'Республики';
        if (a.includes('автономн') || a.includes('авт. округ')) return 'Автономные округа';
        if (a.includes('города') || a.includes('Москва') || a.includes('Санкт') || a.includes('Севастополь')) return 'Города';
        if (a.includes('Российской Федерации') || a.includes('РФ')) return 'Федеральные';
        return 'Другие регионы';
      }))];
    return ['Все', ...regions.sort()];
  };
  const pravoPageSize = 50;
  const [documents, setDocuments] = useState<CourtDocument[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>(DEFAULT_TEMPLATES);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Динамические категории на основе загруженных шаблонов
  const categories = ['Все', ...Array.from(new Set(templates.map(t => t.category)))].sort((a, b) => {
    if (a === 'Все') return -1;
    if (b === 'Все') return 1;
    return a.localeCompare(b);
  });

  // SEO
  useEffect(() => {
    setSeo({
      title: 'Библиотека документов - Sud',
      description: 'Хранилище юридических документов и шаблоны для судов. Загружайте и скачивайте иски, ходатайства, жалобы.',
      keywords: 'документы для суда, шаблоны исков, юридические документы',
      ogTitle: 'Библиотека документов - Sud',
      ogDescription: 'Юридические документы и шаблоны',
    });
  }, [setSeo]);

  // Загрузка документов пользователя
  const loadDocuments = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Получаем список файлов из Storage
      const { data, error: storageError } = await supabase.storage
        .from('documents')
        .list(user.id);

      if (storageError) {
        console.error('Storage error:', storageError);
        // Если ошибка доступа - возможно bucket приватный
        if (storageError.message?.includes('row-level security')) {
          setError('Нет доступа к хранилищу. Обратитесь к администратору.');
        }
        return;
      }

      console.log('Documents loaded:', data?.length || 0, data);

      // Для каждого документа получаем подписанный URL
      const docsWithUrls = await Promise.all(
        (data || []).map(async (doc) => {
          const path = `${user.id}/${doc.name}`;
          const { data: urlData } = await supabase.storage
            .from('documents')
            .createSignedUrl(path, 3600); // 1 час

          return {
            id: doc.id,
            name: doc.name,
            type: doc.metadata?.mimetype || 'application/octet-stream',
            size: doc.metadata?.size || 0,
            created_at: doc.created_at || new Date().toISOString(),
            url: urlData?.signedUrl,
            path: path,
          };
        })
      );

      setDocuments(docsWithUrls);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError('Не удалось загрузить документы');
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDocuments();
    }
  }, [isAuthenticated, user, loadDocuments]);

  // Загрузка файла
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!user || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const fileArray = Array.from(files);
      
      for (const file of fileArray) {
        // Проверка размера (макс. 10 МБ)
        if (file.size > 10 * 1024 * 1024) {
          setError(`Файл ${file.name} слишком большой (макс. 10 МБ)`);
          continue;
        }

        // Проверка типа
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (!allowedTypes.includes(file.type) && !file.type.includes('image')) {
          setError(`Тип файла ${file.name} не поддерживается`);
          continue;
        }

        // Генерация уникального имени
        const timestamp = Date.now();
        const uniqueName = `${timestamp}-${file.name}`;
        const path = `${user.id}/${uniqueName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError(`Не удалось загрузить ${file.name}`);
          continue;
        }
      }

      // Перезагружаем список
      await loadDocuments();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Ошибка при загрузке файлов');
    } finally {
      setUploading(false);
    }
  };

  // Удаление файла
  const handleDelete = async (doc: CourtDocument) => {
    if (!doc.path) return;

    try {
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove([doc.path]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        setError('Не удалось удалить файл');
        return;
      }

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: any) {
      console.error('Delete error:', err);
      setError('Ошибка при удалении');
    }
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Загрузка шаблонов из БД
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading templates:', error);
        // Используем fallback шаблоны
        return;
      }

      if (data && data.length > 0) {
        const mappedTemplates: DocumentTemplate[] = data.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          category: t.category,
          icon: t.icon || '📄',
          file_url: t.file_url || null,
          file_name: t.file_name || null,
        }));
        setTemplates(mappedTemplates);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Загрузка документов pravo.gov.ru
  const loadPravoDocs = useCallback(async () => {
    if (pravoLoaded) return;
    setPravoLoading(true);
    try {
      const response = await fetch('/pravo-docs-minimal.json');
      const data = await response.json();
      const docs: PravoDoc[] = (data.d || []).map((d: any) => ({
        id: d.i,
        url: d.u,
        authority: d.a,
        source: 'pravo.gov.ru'
      }));
      setPravoDocs(docs);
      setPravoLoaded(true);
    } catch (err) {
      console.error('Error loading pravo docs:', err);
    } finally {
      setPravoLoading(false);
    }
  }, [pravoLoaded]);

  const handleShowOfficial = () => {
    setActiveTab('official');
    loadPravoDocs();
  };

  // Извлечение даты из ID документа
  // ID имеет формат: регион(2) + код(4) + DDMM + номер(4) для региональных документов
  // Пример: 9100202602270003 -> 27.02.2026 (0227 = 27.02)
  const extractDateFromId = (id: string): string => {
    if (id.length >= 12) {
      // Пробуем разные форматы:
      
      // Формат региональных: 9100202602270003
      // 91 - регион, 0026 - код, 0227 - дата (DDMM), 0003 - номер
      const dateStr = id.slice(-8, -4); // берём 4 цифры перед номером
      const dayNum = parseInt(dateStr.slice(0, 2));
      const monthNum = parseInt(dateStr.slice(2, 4));
      
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
        // Определяем год из ID
        let year = 2026; // по умолчанию - текущий год
        // Пробуем найти год в ID (может быть в начале или в середине)
        const potentialYear = id.match(/20\d{2}/);
        if (potentialYear) {
          year = parseInt(potentialYear[0]);
        }
        return `${dayNum.toString().padStart(2, '0')}.${monthNum.toString().padStart(2, '0')}.${year}`;
      }
      
      // Формат федеральных: XXXXXXXXXYYYYMMDDNNNN
      // Пробуем извлечь из позиции 9-15
      const yearStr = id.substring(9, 13);
      const monthStr = id.substring(13, 15);
      const dayStr = id.substring(15, 17);
      const yearNum = parseInt(yearStr);
      const monthNum2 = parseInt(monthStr);
      const dayNum2 = parseInt(dayStr);
      
      if (yearNum >= 2000 && yearNum <= 2100 && monthNum2 >= 1 && monthNum2 <= 12 && dayNum2 >= 1 && dayNum2 <= 31) {
        return `${dayNum2.toString().padStart(2, '0')}.${monthNum2.toString().padStart(2, '0')}.${yearNum}`;
      }
    }
    return '—';
  };

  // Определение категории органа власти
  const getPravoCategory = (authority: string): string => {
    const a = authority.toLowerCase();
    if (a.includes('миров') || a.includes('судей')) return 'Мировые суды';
    if (authority.startsWith('Министерство') || authority.startsWith('министерство')) return 'Министерства';
    if (authority.startsWith('Департамент')) return 'Департаменты';
    if (authority.startsWith('Комитет')) return 'Комитеты';
    if (authority.startsWith('Управление')) return 'Управления';
    if (authority.startsWith('Правительство')) return 'Правительства';
    if (authority.startsWith('Губернатор')) return 'Губернаторы';
    if (authority.startsWith('Служба')) return 'Службы';
    if (authority.startsWith('Администрация')) return 'Администрации';
    if (authority.startsWith('Агентство')) return 'Агентства';
    if (authority.startsWith('Инспекция')) return 'Инспекции';
    if (authority.startsWith('Главное управление') || a.includes('главное управление')) return 'Главные управления';
    return 'Другие';
  };

  // Фильтрация pravo документов
  const filteredPravoDocs = pravoDocs.filter(doc => {
    const matchesSearch = pravoSearch === '' || 
      doc.id.toLowerCase().includes(pravoSearch.toLowerCase()) ||
      doc.authority.toLowerCase().includes(pravoSearch.toLowerCase());
    const matchesCategory = pravoCategory === 'Все' || getPravoCategory(doc.authority) === pravoCategory;
    
    // Фильтр по подкатегории (региону)
    let matchesSubcategory = pravoSubcategory === 'Все';
    if (matchesSubcategory === false) {
      const a = doc.authority;
      if (pravoSubcategory === 'Области') matchesSubcategory = a.includes('области') || a.includes('область');
      else if (pravoSubcategory === 'Края') matchesSubcategory = a.includes('края') || a.includes('край');
      else if (pravoSubcategory === 'Республики') matchesSubcategory = a.includes('республики') || a.includes('Республика');
      else if (pravoSubcategory === 'Автономные округа') matchesSubcategory = a.includes('автономн') || a.includes('авт. округ');
      else if (pravoSubcategory === 'Города') matchesSubcategory = a.includes('города') || a.includes('Москва') || a.includes('Санкт') || a.includes('Севастополь');
      else if (pravoSubcategory === 'Федеральные') matchesSubcategory = a.includes('Российской Федерации') || a.includes('РФ');
      else matchesSubcategory = a.includes(pravoSubcategory);
    }
    
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const paginatedPravoDocs = filteredPravoDocs.slice(
    (pravoPage - 1) * pravoPageSize,
    pravoPage * pravoPageSize
  );

  // Фильтрация документов
  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Фильтрация шаблонов
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'Все' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Библиотека документов</h1>
            <p className="text-xs text-slate-500">Шаблоны и личные файлы</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'my' && isAuthenticated
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'
          }`}
          disabled={!isAuthenticated}
        >
          <FolderOpen className="w-4 h-4" />
          Мои документы{!isAuthenticated && ' (войдите)'}
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'templates'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Шаблоны
        </button>
        <button
          onClick={handleShowOfficial}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'official'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Официальные ({pravoDocs.length || '...'})
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <X className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* My Documents Tab - only for authenticated */}
      {activeTab === 'my' && isAuthenticated ? (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full bg-white dark:bg-slate-900 py-3 pl-12 pr-4 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          {/* Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-accent bg-accent/5'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Загрузка файлов...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Перетащите файлы сюда или нажмите для выбора
                </p>
                <p className="text-xs text-slate-400">
                  PDF, Word, Excel, изображения (макс. 10 МБ)
                </p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block mt-4 bg-accent hover:bg-accent-light text-white px-6 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors"
                >
                  Выбрать файлы
                </label>
              </>
            )}
          </div>

          {/* Documents List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-accent/30 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                      {getFileIcon(doc.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {doc.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(doc.size)} • {new Date(doc.created_at).toLocaleDateString('ru')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    {doc.url && (
                      <a
                        href={doc.url}
                        download={doc.name}
                        className="flex-1 bg-accent/10 hover:bg-accent/20 text-accent py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Скачать
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Документы не найдены</p>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Загрузите ваши первые документы</p>
            </div>
          )}
        </div>
      ) : activeTab === 'my' && !isAuthenticated ? (
        <div className="p-8 text-center">
          <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Войдите в аккаунт</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Для загрузки и управления личными документами нужна авторизация. 
            Шаблоны документов доступны всем посетителям.
          </p>
          <a href="/login" className="inline-block bg-accent hover:bg-accent-light text-white px-8 py-3 rounded-xl text-sm font-bold transition-colors">
            Войти
          </a>
        </div>
      ) : null}

      {/* Templates Tab */}
{activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск шаблонов..."
              className="w-full bg-white dark:bg-slate-900 py-3 pl-12 pr-4 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
            {templatesLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка категорий...
              </div>
            ) : (
              categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-accent text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {category}
                </button>
              ))
            )}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-accent/30 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{template.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white">{template.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                      <span className="inline-block mt-2 text-xs text-accent font-medium">
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {template.file_url ? (
                      <a
                        href={template.file_url}
                        download={template.file_name || template.name}
                        className="flex-1 bg-accent/10 hover:bg-accent/20 text-accent py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Скачать
                      </a>
                    ) : (
                      <button className="flex-1 bg-accent/10 text-slate-400 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-not-allowed">
                        <Download className="w-3.5 h-3.5" />
                        недоступно
                      </button>
                    )}
                    <button className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Шаблоны не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* Official Documents Tab */}
      {activeTab === 'official' && (
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm">
                  Официальные документы
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Документы органов власти с портала <a href="http://publication.pravo.gov.ru" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">publication.pravo.gov.ru</a>
                </p>
              </div>
            </div>
          </div>

          {/* Search for Official Documents */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={pravoSearch}
              onChange={(e) => { setPravoSearch(e.target.value); setPravoPage(1); }}
              placeholder="Поиск по документам (номер, орган)..."
              className="w-full bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
            {pravoCategories.map((category) => (
              <button
                key={category}
                onClick={() => { setPravoCategory(category); setPravoSubcategory('Все'); setPravoPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  pravoCategory === category
                    ? 'bg-accent text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Subcategories - Регионы */}
          {pravoCategory !== 'Все' && pravoDocs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 py-1.5">Регион:</span>
              {getSubcategories().map((sub) => (
                <button
                  key={sub}
                  onClick={() => { setPravoSubcategory(sub); setPravoPage(1); }}
                  className={`px-2 py-1 rounded-md text-xs transition-colors ${
                    pravoSubcategory === sub
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}



          {/* Count */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Найдено: <strong className="text-slate-700 dark:text-slate-300">{filteredPravoDocs.length}</strong></span>
            <span>Всего документов: {pravoDocs.length}</span>
          </div>

          {/* Documents List */}
          {pravoLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedPravoDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-accent/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Scale className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                        {doc.id}
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {doc.authority}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        📅 {extractDateFromId(doc.id)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {Math.ceil(filteredPravoDocs.length / pravoPageSize) > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPravoPage(p => Math.max(1, p - 1))}
                disabled={pravoPage === 1}
                className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-500 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Назад
              </button>
              <span className="px-4 py-2 text-sm text-slate-500">
                Страница {pravoPage} из {Math.ceil(filteredPravoDocs.length / pravoPageSize)}
              </span>
              <button
                onClick={() => setPravoPage(p => Math.min(Math.ceil(filteredPravoDocs.length / pravoPageSize), p + 1))}
                disabled={pravoPage >= Math.ceil(filteredPravoDocs.length / pravoPageSize)}
                className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-500 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Вперёд
              </button>
            </div>
          )}
        </div>
      )}

      {/* Модальное окно документа */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-full sm:max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                    Документ
                  </h2>
                  <p className="text-xs text-slate-500">
                    ID: {selectedDoc.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Информация о документе */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Номер документа (ID)</p>
                    <p className="font-mono text-slate-900 dark:text-white">{selectedDoc.id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Дата публикации</p>
                    <p className="font-medium text-slate-900 dark:text-white">{extractDateFromId(selectedDoc.id)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs">Орган власти</p>
                    <p className="font-medium text-slate-900 dark:text-white">{selectedDoc.authority}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs">Ссылка на оригинал</p>
                    <a
                      href={selectedDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm flex items-center gap-1"
                    >
                      {selectedDoc.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Реклама */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="text-center text-xs text-slate-400 mb-3">Реклама</div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">Юридическая консультация</p>
                  <p className="text-xs text-slate-500 mb-3">Нужна помощь юриста? Получите консультацию прямо сейчас.</p>
                  <a
                    href="/ai-lawyer"
                    className="inline-block px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-light transition-colors"
                  >
                    Получить консультацию
                  </a>
                </div>
              </div>

              {/* Ссылки на документ */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 mb-3">
                  Для просмотра документа перейдите по ссылке:
                </p>
                <a
                  href={selectedDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-3 bg-blue-500 text-white text-center rounded-xl hover:bg-blue-600 transition-colors font-medium"
                >
                  <ExternalLink className="w-4 h-4 inline mr-2" />
                  Открыть документ на pravo.gov.ru
                </a>

                <p className="text-xs text-slate-400 mt-3 text-center">
                  Документ откроется в новой вкладке
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
