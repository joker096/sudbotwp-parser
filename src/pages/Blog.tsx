import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, ArrowRight, ChevronLeft, ChevronRight, Share2, Bookmark, Eye, ThumbsUp, MessageSquare, Settings, Plus, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdBanner from '../components/AdBanner';
import { useSeo } from '../hooks/useSeo';
import BlogComments from '../components/BlogComments';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

// Fallback данные для блога
const FALLBACK_POSTS = [
  { id: 1, title: 'Как подать иск в суд онлайн', excerpt: 'Подробная инструкция по использованию ГАС Правосудие и Мой Арбитр для подачи документов не выходя из дома.', date: '15 Марта 2024', category: 'Инструкции', img: 'https://picsum.photos/seed/blog1/800/400', views: 1240, likes: 45, comments: 12, author: 'Александр Смирнов', readTime: '5 мин' },
  { id: 2, title: 'Изменения в ГПК РФ с 2024 года', excerpt: 'Обзор ключевых изменений в гражданском процессуальном кодексе, которые вступят в силу в этом году.', date: '10 Марта 2024', category: 'Новости', img: 'https://picsum.photos/seed/blog2/800/400', views: 890, likes: 32, comments: 8, author: 'Елена Волкова', readTime: '7 мин' },
  { id: 3, title: 'Как выбрать хорошего юриста', excerpt: 'На что обращать внимание при выборе специалиста для вашего дела: чек-лист от экспертов.', date: '5 Марта 2024', category: 'Советы', img: 'https://picsum.photos/seed/blog3/800/400', views: 2100, likes: 112, comments: 34, author: 'Дмитрий Соколов', readTime: '4 мин' },
  { id: 4, title: 'Новые пошлины: что нужно знать', excerpt: 'Разбираем новые тарифы на судебные пошлины и рассказываем, как их правильно рассчитать.', date: '1 Марта 2024', category: 'Новости', img: 'https://picsum.photos/seed/blog4/800/400', views: 3450, likes: 210, comments: 56, author: 'Анна Морозова', readTime: '6 мин' },
  { id: 5, title: 'Банкротство физических лиц', excerpt: 'Пошаговое руководство по процедуре банкротства в 2024 году: плюсы, минусы и подводные камни.', date: '25 Февраля 2024', category: 'Инструкции', img: 'https://picsum.photos/seed/blog5/800/400', views: 4500, likes: 320, comments: 89, author: 'Игорь Николаев', readTime: '10 мин' },
  { id: 6, title: 'Раздел имущества при разводе', excerpt: 'Судебная практика и советы адвокатов по семейным спорам: как защитить свои права.', date: '20 Февраля 2024', category: 'Советы', img: 'https://picsum.photos/seed/blog6/800/400', views: 1800, likes: 76, comments: 21, author: 'Мария Кузнецова', readTime: '8 мин' },
];

export default function Blog() {
  const { setSeo } = useSeo('/blog');
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'admin';
  const [activeTab, setActiveTab] = useState('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<number>>(new Set());
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const postsPerPage = 4;

  // Установка SEO мета тегов
  useEffect(() => {
    setSeo({
      title: 'Блог Sud - Статьи о юридических услугах и судебных делах',
      description: 'Полезные статьи о юридических услугах, судебных делах, выборе юриста и изменениях в законодательстве.',
      keywords: 'блог, юридические статьи, суд, законодательство, юрист',
      ogTitle: 'Блог Sud - Полезные статьи о юридических услугах',
      ogDescription: 'Читайте статьи о юридических услугах, судебных делах и выборе юриста.',
    });
  }, [setSeo]);

  // Загрузка статей из базы данных
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Добавляем вычисляемые поля
        setPosts(data.map(post => ({
          ...post,
          date: new Date(post.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
          views: post.views || Math.floor(Math.random() * 1000) + 500,
          likes: post.likes || Math.floor(Math.random() * 100) + 10,
          comments: 0, // Загружается отдельно
        })));
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback к статическим данным
      setPosts(FALLBACK_POSTS);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = ['Все', 'Новости', 'Инструкции', 'Советы'];

  const filteredPosts = posts.filter(post => {
    const matchesTab = activeTab === 'Все' || post.category === activeTab;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const currentPosts = filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  const handleLike = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleBookmark = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleShare = async (post: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: post.title,
      text: post.excerpt,
      url: window.location.origin + '/blog?post=' + post.id,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const getLikeCount = (post: any) => {
    return likedPosts.has(post.id) ? post.likes + 1 : post.likes;
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // SEO для выбранной статьи
  useEffect(() => {
    if (selectedPost) {
      setSeo({
        title: selectedPost.seo_title || selectedPost.title,
        description: selectedPost.seo_description || selectedPost.excerpt,
        keywords: selectedPost.seo_keywords,
        ogTitle: selectedPost.og_title || selectedPost.seo_title || selectedPost.title,
        ogDescription: selectedPost.og_description || selectedPost.seo_description || selectedPost.excerpt,
        ogImage: selectedPost.og_image || selectedPost.image_url || selectedPost.img,
        ogUrl: `/blog?post=${selectedPost.id}`,
      });
      
      // Прокрутка к комментариям внизу статьи
      setTimeout(() => {
        const commentsElement = document.getElementById('blog-comments');
        if (commentsElement) {
          commentsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [selectedPost, setSeo]);

  if (selectedPost) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto space-y-8 pb-12"
      >
        <button 
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Назад к статьям
        </button>

        <article className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-transparent dark:border-slate-800">
          <div className="relative h-64 sm:h-96 w-full">
            <img src={selectedPost.image_url || selectedPost.img} alt={selectedPost.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            <div className="absolute top-6 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm">
              <span className="text-sm font-bold text-accent">{selectedPost.category}</span>
            </div>
          </div>
          
          <div className="p-6 sm:p-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
              {selectedPost.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-medium mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <img src={`https://picsum.photos/seed/${selectedPost.author}/100/100`} alt={selectedPost.author} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-slate-900 dark:text-white font-bold">{selectedPost.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {selectedPost.date}
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" /> {selectedPost.views}
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs">{selectedPost.readTime}</span>
              </div>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed space-y-6">
              <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                {selectedPost.excerpt}
              </p>
              
              <p>
                В современном мире цифровизация затрагивает все сферы жизни, и судебная система не стала исключением. Подача документов в электронном виде значительно экономит время и ресурсы как граждан, так и юристов. В этой статье мы подробно разберем процесс подачи искового заявления онлайн.
              </p>

              {/* Native Advertising Block */}
              <div className="my-10 bg-gradient-to-r from-accent/5 to-primary/5 rounded-2xl p-6 sm:p-8 border border-accent/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  Спонсорский материал
                </div>
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start relative z-10">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden shadow-md">
                    <img src="https://picsum.photos/seed/lawyer_ad/200/200" alt="Lawyer" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Нужна помощь с подачей иска?</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                      Опытный юрист Александр Смирнов поможет грамотно составить исковое заявление и подать его через ГАС Правосудие. Скидка 10% для читателей блога Sud.
                    </p>
                    <button className="bg-accent hover:bg-accent-light text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm w-full sm:w-auto">
                      Получить консультацию
                    </button>
                  </div>
                </div>
              </div>

              <h3>Шаг 1: Подготовка документов</h3>
              <p>
                Перед тем как начать процесс подачи, убедитесь, что у вас есть все необходимые документы в электронном виде. Они должны быть отсканированы в формате PDF, причем каждый документ должен представлять собой отдельный файл.
              </p>
              <ul>
                <li>Само исковое заявление (подписанное ЭЦП или отсканированное с живой подписью)</li>
                <li>Квитанция об оплате госпошлины</li>
                <li>Документы, подтверждающие обстоятельства, на которых истец основывает свои требования</li>
                <li>Уведомление о вручении или иные документы, подтверждающие направление другим лицам, участвующим в деле, копий искового заявления</li>
              </ul>

              <h3>Шаг 2: Авторизация в системе</h3>
              <p>
                Для подачи документов в суды общей юрисдикции используется портал ГАС «Правосудие». Авторизация происходит через Единую систему идентификации и аутентификации (ЕСИА), то есть вам потребуется подтвержденная учетная запись на портале Госуслуг.
              </p>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => handleLike(selectedPost.id, e)}
                  className={`flex items-center gap-2 transition-colors font-medium bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl ${
                    likedPosts.has(selectedPost.id) 
                      ? 'text-accent bg-accent/10' 
                      : 'text-slate-500 hover:text-accent'
                  }`}
                >
                  <ThumbsUp className={`w-5 h-5 ${likedPosts.has(selectedPost.id) ? 'fill-current' : ''}`} /> {getLikeCount(selectedPost)}
                </button>
                <button className="flex items-center gap-2 text-slate-500 hover:text-accent transition-colors font-medium bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
                  <MessageSquare className="w-5 h-5" /> {selectedPost.comments}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => handleBookmark(selectedPost.id, e)}
                  className={`p-2 transition-colors bg-slate-50 dark:bg-slate-800 rounded-xl ${
                    bookmarkedPosts.has(selectedPost.id)
                      ? 'text-accent'
                      : 'text-slate-500 hover:text-accent'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${bookmarkedPosts.has(selectedPost.id) ? 'fill-current' : ''}`} />
                </button>
                <button 
                  onClick={(e) => handleShare(selectedPost, e)}
                  className="p-2 text-slate-500 hover:text-accent transition-colors bg-slate-50 dark:bg-slate-800 rounded-xl relative"
                >
                  <Share2 className="w-5 h-5" />
                  {showShareTooltip && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs px-2 py-1 rounded whitespace-nowrap">
                      Скопировано!
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Комментарии к статье */}
            <div id="blog-comments">
              <BlogComments postId={selectedPost.id.toString()} />
            </div>
          </div>
        </article>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Блог</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/admin/blog'}
              className="flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <Settings className="w-4 h-4" />
              Управление
            </button>
            <button
              onClick={() => window.location.href = '/admin/blog/new'}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Новая статья
            </button>
          </div>
        )}
      </div>

      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder="Поиск статей..." 
          className="w-full bg-white dark:bg-slate-900 py-4 pl-12 pr-16 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
        />
        <button className="absolute right-2 bg-accent text-white p-2.5 rounded-xl shadow-lg shadow-accent/30 hover:bg-accent-light transition-colors">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button 
              key={tab} 
              onClick={() => handleTabChange(tab)}
              className={`relative px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                isActive 
                  ? 'text-white shadow-md shadow-accent/20' 
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:-translate-y-0.5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBlog"
                  className="absolute inset-0 bg-slate-900 dark:bg-accent rounded-2xl z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {currentPosts.map((post, index) => (
          <div key={post.id} className="contents">
            <div 
              onClick={() => setSelectedPost(post)}
              className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col border border-transparent dark:border-slate-800 transition-colors group cursor-pointer"
            >
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img src={post.image_url || post.img} alt={post.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="text-xs font-bold text-accent">{post.category}</span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 flex-1">
                  {post.excerpt}
                </p>
                <button className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white group-hover:text-accent transition-colors mt-auto">
                  Читать далее <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            {/* Вставляем рекламу после 2-го поста */}
            {index === 1 && (
              <div className="md:col-span-2">
                <AdBanner />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6 pb-4">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                  currentPage === i + 1
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">По вашему запросу ничего не найдено.</p>
        </div>
      )}
    </div>
  );
}
