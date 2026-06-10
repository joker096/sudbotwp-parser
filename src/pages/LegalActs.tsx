import { useState, useEffect, useCallback } from 'react';
import { Scale, Search, Loader2, ExternalLink, FileText, ChevronRight, RefreshCw, Building2, Users, Database } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';
import { getPublicBlocks, getSubBlocks, searchDocuments, getDocumentsByBlock, BLOCK_CODES, DEMO_DOCUMENTS, type DocumentInfo, type PublicBlock } from '../lib/pravo';

// Тип для документа из JSON
interface PravoDoc {
  id: string;
  url: string;
  authority: string;
  source: string;
}

/** Категории документов */
const DOCUMENT_CATEGORIES = [
  { code: BLOCK_CODES.FEDERAL_LAWS, name: 'Федеральные законы', icon: '📜', description: 'Федеральные конституционные и федеральные законы РФ' },
  { code: BLOCK_CODES.PRESIDENT_DECREES, name: 'Указы Президента', icon: '👤', description: 'Указы и распоряжения Президента РФ' },
  { code: BLOCK_CODES.GOVERNMENT_ACTS, name: 'Акты Правительства', icon: '🏛️', description: 'Постановления и распоряжения Правительства РФ' },
  { code: BLOCK_CODES.FEDERAL_ORG_ACTS, name: 'Акты ведомств', icon: '🏢', description: 'Приказы и письма федеральных органов' },
  { code: 'subjects', name: 'Региональные акты', icon: '🗺️', description: 'Законы субъектов РФ' },
];

export default function LegalActs() {
  const { setSeo } = useSeo('/legal-acts');
  
  const [activeTab, setActiveTab] = useState<'categories' | 'search' | 'recent' | 'regional'>('categories');
  const [categories, setCategories] = useState<PublicBlock[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const [regionalDocs, setRegionalDocs] = useState<PravoDoc[]>([]);
  const [isLoadingRegional, setIsLoadingRegional] = useState(false);
  const [regionalLoaded, setRegionalLoaded] = useState(false);
  const [regionalPage, setRegionalPage] = useState(1);
  const regionalPageSize = 50;
  const pageSize = 20;

  // SEO
  useEffect(() => {
    setSeo({
      title: 'Нормативные акты - Sud',
      description: 'Официальные федеральные законы, указы Президента, постановления Правительства. Актуальные тексты правовых актов с портала publication.pravo.gov.ru',
      keywords: 'федеральные законы, указы президента, постановления правительства, нормативные акты, официальное опубликование',
      ogTitle: 'Нормативные акты - Sud',
      ogDescription: 'Официальные правовые акты РФ',
    });
  }, [setSeo]);

  // Загрузка категорий
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsUsingDemo(false);
    
    try {
      // Сначала показываем демо-данные сразу
      setCategories(DEMO_DOCUMENTS.map((_, i) => ({
        code: ['laws', 'decrees', 'govacts', 'fedorgs', 'assembly', 'government', 'conslaws', 'regionals'][i] || 'laws',
        name: DOCUMENT_CATEGORIES[i]?.name || 'Документы',
        type: DOCUMENT_CATEGORIES[i]?.description || 'Документы',
      })));
      setIsUsingDemo(true);
      
      // Пробуем получить реальные данные (без await - не блокируем UI)
      getPublicBlocks().then(blocks => {
        if (blocks.length > 0 && blocks[0].code !== 'laws') {
          setCategories(blocks);
          setIsUsingDemo(false);
        }
      }).catch(() => {});
    } catch (err) {
      console.warn('Using demo data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Загрузка документов категории
  const loadDocuments = useCallback(async (categoryCode: string, page: number = 1) => {
    setIsLoadingDocs(true);
    setError(null);
    
    try {
      const result = await getDocumentsByBlock(categoryCode, page, pageSize);
      setDocuments(result.items);
      setTotalCount(result.totalCount);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Не удалось загрузить документы. Попробуйте позже.');
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // Поиск документов
  const handleSearch = useCallback(async (page: number = 1) => {
    if (!searchQuery.trim()) return;
    
    setIsLoadingDocs(true);
    setError(null);
    
    try {
      const result = await searchDocuments(searchQuery, page, pageSize);
      setDocuments(result.items);
      setTotalCount(result.totalCount);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error searching:', err);
      setError('Не удалось выполнить поиск. Попробуйте позже.');
    } finally {
      setIsLoadingDocs(false);
    }
  }, [searchQuery]);

  // Выбор категории
  const handleCategorySelect = (code: string) => {
    setSelectedCategory(code);
    setActiveTab('recent');
    loadDocuments(code, 1);
  };

  // Пагинация
  const totalPages = Math.ceil(totalCount / pageSize);

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('ru', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Очистка поиска
  const clearSearch = () => {
    setSearchQuery('');
    setDocuments([]);
    setTotalCount(0);
    setActiveTab('categories');
    setSelectedCategory(null);
  };

  // Загрузка региональных документов
  const loadRegionalDocs = useCallback(async () => {
    if (regionalLoaded) return;
    setIsLoadingRegional(true);
    try {
      const response = await fetch('/pravo-docs-minimal.json');
      const data = await response.json();
      // Преобразуем из минимального формата
      const docs: PravoDoc[] = (data.d || []).map((d: any) => ({
        id: d.i,
        url: d.u,
        authority: d.a,
        source: 'pravo.gov.ru'
      }));
      setRegionalDocs(docs);
      setRegionalLoaded(true);
    } catch (err) {
      console.error('Error loading regional docs:', err);
    } finally {
      setIsLoadingRegional(false);
    }
  }, [regionalLoaded]);

  // Переключение на региональные документы
  const handleShowRegional = () => {
    setActiveTab('regional');
    loadRegionalDocs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Нормативные акты</h1>
            <p className="text-xs text-slate-500">Официальные правовые акты РФ</p>
          </div>
        </div>
        <button
          onClick={() => loadCategories()}
          className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-all"
          title="Обновить"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm">
              Официальный источник
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Данные предоставлены порталом <a href="http://publication.pravo.gov.ru" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">publication.pravo.gov.ru</a> 
              {' '}— официальным интернет-порталом правовой информации (ФСО России). Акты публикуются в день подписания.
            </p>
            {isUsingDemo && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                ⚠️ Демо-режим. Для получения актуальных данных задеплойте функцию pravo-proxy.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('categories'); setSelectedCategory(null); setDocuments([]); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'categories'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Категории
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'search'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          Поиск
        </button>
        <button
          onClick={handleShowRegional}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'regional'
              ? 'bg-slate-900 dark:bg-accent text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Регионы ({regionalDocs.length || '...'})
        </button>
        {selectedCategory && (
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'recent'
                ? 'bg-slate-900 dark:bg-accent text-white'
                : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Документы
          </button>
        )}
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
              placeholder="Поиск по названию или номеру документа..."
              className="w-full bg-white dark:bg-slate-900 py-3 pl-12 pr-4 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 border border-slate-100 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button
              onClick={() => handleSearch(1)}
              disabled={isLoadingDocs || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent hover:bg-accent-light text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Найти
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <button
                  key={category.code}
                  onClick={() => handleCategorySelect(category.code)}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-accent/30 hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-2xl">
                      {category.code === 'laws' && '📜'}
                      {category.code === 'decrees' && '👤'}
                      {category.code === 'govacts' && '🏛️'}
                      {category.code === 'fedorgs' && '🏢'}
                      {category.code === 'assembly' && '🏛️'}
                      {category.code === 'government' && '🏛️'}
                      {!['laws', 'decrees', 'govacts', 'fedorgs', 'assembly', 'government'].includes(category.code) && '📄'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-accent transition-all">
                        {category.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {category.type || 'Документы'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-accent transition-all" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Категории не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {(activeTab === 'recent' || activeTab === 'search') && documents.length > 0 && (
        <div className="space-y-4">
          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Найдено документов: <strong className="text-slate-700 dark:text-slate-300">{totalCount}</strong></span>
            {activeTab === 'search' && (
              <button onClick={clearSearch} className="text-accent hover:underline">
                Очистить поиск
              </button>
            )}
          </div>

          {/* Documents List */}
          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-accent/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                        {doc.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                        {doc.date && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {formatDate(doc.date)}
                          </span>
                        )}
                        {doc.number && (
                          <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                            № {doc.number}
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-all flex-shrink-0"
                      title="Открыть на портале"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => activeTab === 'search' ? handleSearch(currentPage - 1) : loadDocuments(selectedCategory!, currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-500 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Назад
              </button>
              <span className="px-4 py-2 text-sm text-slate-500">
                Страница {currentPage} из {totalPages}
              </span>
              <button
                onClick={() => activeTab === 'search' ? handleSearch(currentPage + 1) : loadDocuments(selectedCategory!, currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-500 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Вперёд
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state for search */}
      {activeTab === 'search' && !isLoadingDocs && documents.length === 0 && searchQuery && (
        <div className="text-center py-12 text-slate-500">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Документы не найдены</p>
          <p className="text-xs mt-1">Попробуйте изменить запрос</p>
        </div>
      )}

      {/* Regional Documents Tab */}
      {activeTab === 'regional' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Всего документов: <strong className="text-slate-700 dark:text-slate-300">{regionalDocs.length}</strong></span>
            <span>Источник: <a href="http://publication.pravo.gov.ru" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">pravo.gov.ru</a></span>
          </div>

          {isLoadingRegional ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {regionalDocs.slice((regionalPage - 1) * regionalPageSize, regionalPage * regionalPageSize).map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-accent/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                          {doc.id}
                        </h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {doc.authority}
                        </p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-all flex-shrink-0"
                        title="Открыть на портале"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination for regional */}
              {Math.ceil(regionalDocs.length / regionalPageSize) > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setRegionalPage(p => Math.max(1, p - 1))}
                    disabled={regionalPage === 1}
                    className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-500 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Назад
                  </button>
                  <span className="px-4 py-2 text-sm text-slate-500">
                    Страница {regionalPage} из {Math.ceil(regionalDocs.length / regionalPageSize)}
                  </span>
                  <button
                    onClick={() => setRegionalPage(p => Math.min(Math.ceil(regionalDocs.length / regionalPageSize), p + 1))}
                    disabled={regionalPage >= Math.ceil(regionalDocs.length / regionalPageSize)}
                    className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-500 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Вперёд
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
