import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Upload, FileText, File, Image, Download, Trash2, Search, Lock, Eye, FileCheck, Scale, Loader2, X, FileDigit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSeo } from '../hooks/useSeo';
import { supabase } from '../lib/supabase';

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
    id: ' исковое заявление',
    name: 'Исковое заявление',
    description: 'Стандартный шаблон искового заявления в суд общей юрисдикции',
    category: 'Иски',
    icon: '📝',
  },
  {
    id: 'возражения',
    name: 'Возражения на иск',
    description: 'Возражения на исковое заявление ответчика',
    category: 'Защита',
    icon: '🛡️',
  },
  {
    id: 'ходатайство',
    name: 'Ходатайство',
    description: 'Ходатайство о назначении экспертизы, привлечении свидетелей и т.д.',
    category: 'Ходатайства',
    icon: '📋',
  },
  {
    id: 'апелляция',
    name: 'Апелляционная жалоба',
    description: 'Жалоба на решение суда в апелляционную инстанцию',
    category: 'Жалобы',
    icon: '⚖️',
  },
  {
    id: 'кассация',
    name: 'Кассационная жалоба',
    description: 'Жалоба в кассационную инстанцию',
    category: 'Жалобы',
    icon: '📇',
  },
  {
    id: 'претензия',
    name: 'Досудебная претензия',
    description: 'Претензия перед подачей иска (обязательный досудебный порядок)',
    category: 'Претензии',
    icon: '✉️',
  },
  {
    id: 'расписка',
    name: 'Расписка',
    description: 'Расписка о получении денег/имущества',
    category: 'Доказательства',
    icon: '💰',
  },
  {
    id: 'доверенность',
    name: 'Доверенность',
    description: 'Доверенность на представление интересов в суде',
    category: 'Полномочия',
    icon: '📜',
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
  
  const [activeTab, setActiveTab] = useState<'my' | 'templates'>('my');
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
  }, [user]);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Библиотека документов
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Доступ к библиотеке документов и шаблонам имеют только зарегистрированные пользователи.
          </p>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">Что доступно:</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 text-left">
              <li className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-accent" />
                Личное хранилище документов
              </li>
              <li className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-accent" />
                Шаблоны для судов
              </li>
              <li className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-accent" />
                Иски, жалобы, ходатайства
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'my'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Мои документы
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'templates'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Шаблоны
        </button>
      </div>

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

      {/* My Documents Tab */}
      {activeTab === 'my' && (
        <div className="space-y-4">
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
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
    </div>
  );
}
