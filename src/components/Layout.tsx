import { useState, useEffect, memo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Search, Users, Calculator, Scale, Sun, Moon, BookOpen, MessageCircle, LogIn, Shield, Target, HelpCircle, UserCheck, AtSign, Phone, MapPin, Send, MessageSquare, ExternalLink, ChevronUp, ChevronDown, Menu, X, Sparkles, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingButtons from './FloatingButtons';
import { useAuth } from '../hooks/useAuth';
import { useNofollowLinks } from '../hooks/useNofollowLinks';
import GoogleAnalytics from './GoogleAnalytics';

export default memo(function Layout() {
  const location = useLocation();
  
  // Состояние для мобильного меню - по умолчанию скрыто
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Custom scroll function that handles footer links better
  const scrollToTop = () => {
    // For immediate scroll, use both methods
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    // Also set position directly as fallback
    window.scroll(0, 0);
  };
  
  // Handle footer link click - ensure scroll to top
  const handleFooterLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    scrollToTop();
  };
  
  // Автоматически прокручиваем страницу вверх при смене маршрута
  useEffect(() => {
    scrollToTop();
  }, [location.pathname]);
  
  // Автоматически добавляем rel="nofollow" ко всем исходящим ссылкам
  useNofollowLinks();
  
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      // Если нет сохранённой темы, проверяем системные настройки
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const navItems = [
    { path: '/search', label: 'Поиск', icon: Search },
    { path: '/lawyers', label: 'Юристы', icon: Users },
    { path: '/leads', label: 'Лиды', icon: Target },
    { path: '/monitoring', label: 'Мониторинг', icon: Shield },
    { path: '/calculator', label: 'Пошлины', icon: Calculator },
    { path: '/documents', label: 'Документы', icon: FolderOpen },
    { path: '/blog', label: 'Блог', icon: BookOpen },
  ];

  const navContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  };

  const navItemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 120,
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-black font-sans flex flex-col relative transition-colors duration-300 overflow-x-hidden">
      <GoogleAnalytics />
      {/* Desktop Header */}
      <header className="hidden md:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-colors duration-300 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 mr-6">
              <div className="bg-accent/10 p-2 rounded-xl">
                <Scale className="w-6 h-6 text-accent" />
              </div>
            </Link>
            
            <motion.nav 
              className="flex gap-6 lg:gap-8"
              variants={navContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <motion.div key={item.path} variants={navItemVariants}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-2 text-sm font-bold transition-colors ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.nav>

            <div className="flex items-center gap-4">
              <Link to="/messages" className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Messages">
                <MessageCircle className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Link>
              <motion.button
                onClick={() => setIsDark(!isDark)} 
                initial={{ rotate: 0 }}
                animate={{ rotate: isDark ? 360 : 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 10
                }}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle Dark Mode"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </motion.button>
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3">
                    <Link to="/profile" className="bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">
                      Профиль
                    </Link>
                  </div>
                </>
              ) : (
                <Link to="/login" className="bg-slate-900 dark:bg-accent hover:bg-slate-800 dark:hover:bg-accent-light text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Войти
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-[#f8f9fa] dark:bg-black px-6 pt-6 pb-2 flex justify-between items-center sticky top-0 z-40 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-accent/10 p-1.5 rounded-lg">
              <Scale className="w-5 h-5 text-accent" />
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Menu Toggle Button */}
          <motion.button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-500 dark:text-slate-400 transition-colors rounded-full bg-white dark:bg-slate-900 shadow-sm"
            aria-label={isMobileMenuOpen ? "Свернуть меню" : "Развернуть меню"}
            title={isMobileMenuOpen ? "Свернуть меню" : "Показать меню"}
            whileTap={{ scale: 0.95 }}
          >
            {isMobileMenuOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </motion.button>
          {/* Theme Toggle Button - Mobile */}
            <motion.button
              onClick={() => setIsDark(!isDark)} 
              initial={{ rotate: 0 }}
              animate={{ rotate: isDark ? 360 : 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 10
              }}
              className="p-2 text-slate-500 dark:text-slate-400 transition-colors rounded-full bg-white dark:bg-slate-900 shadow-sm"
              aria-label="Toggle Dark Mode"
              title={isDark ? "Светлая тема" : "Тёмная тема"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>
            
            <Link to="/messages" className="relative p-2 text-slate-500 dark:text-slate-400 transition-colors rounded-full bg-white dark:bg-slate-900 shadow-sm">
              <MessageCircle className="w-4 h-4" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 border border-white dark:border-slate-900 rounded-full"></span>
            </Link>
          
            {isAuthenticated ? (
              <Link to="/profile">
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Avatar" 
                    referrerPolicy="no-referrer" 
                    loading="lazy"
                    className="w-9 h-9 rounded-full shadow-sm border-2 border-white dark:border-slate-800 object-cover hover:opacity-80 transition-opacity" 
                  />
                ) : (
                  <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center text-accent text-xs font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
            ) : (
              <Link to="/login">
                <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                  <LogIn className="w-4 h-4" />
                </div>
              </Link>
            )}
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-8 pb-28 md:pb-12 overflow-hidden">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - Collapsible */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav 
            className="md:hidden fixed bottom-0 w-full bg-slate-900 dark:bg-slate-900 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] px-4 py-4 flex justify-between items-center z-50 transition-colors duration-300 border-t border-slate-800"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <motion.div key={item.path} variants={navItemVariants} className="flex-1">
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-purple-500/10' : ''}`}>
                      <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? 'fill-purple-500/20' : ''}`} />
                    </div>
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Mobile collapsed menu indicator */}
      {!isMobileMenuOpen && (
        <motion.div 
          className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium rounded-full shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            <Menu className="w-3 h-3" />
            Меню
          </button>
        </motion.div>
      )}

      {/* Footer - Desktop */}
      <footer className="hidden md:block bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* О сервисе */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-accent/10 p-2 rounded-xl">
                  <Scale className="w-6 h-6 text-accent" />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">Sud</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Sud - Сервис для поиска судебных дел и мониторинга юридической информации. Помогаем находить нужные дела быстро и удобно. 
              </p>
              <div className="flex gap-3">
                <a 
                  href="https://t.me/cvrname/4243" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Telegram"
                >
                  <Send className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Полезные ссылки */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Полезные ссылки</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/blog" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Блог
                  </Link>
                </li>
                <li>
                  <Link to="/help" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Помощь
                  </Link>
                </li>
                <li>
                  <Link to="/calculator" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Калькулятор пошлин
                  </Link>
                </li>
                <li>
                  <Link to="/ai-lawyer" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Онлайн-консультация
                  </Link>
                </li>
              </ul>
            </div>

            {/* Информация */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Информация</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Политика конфиденциальности
                  </Link>
                </li>
                <li>
                  <Link to="/privacy#terms" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Условия использования
                  </Link>
                </li>
                <li>
                  <Link to="/privacy#cookies" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Политика cookie
                  </Link>
                </li>
                <li>
                  <Link to="/lawyers" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Рейтинг юристов
                  </Link>
                </li>
                <li>
                  <Link to="/leads" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Заявки юристам
                  </Link>
                </li>
                <li>
                  <Link to="/ai-lawyer" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    ИИ-Юрист
                  </Link>
                </li>
                <li>
                  <Link to="/documents" onClick={handleFooterLinkClick} className="text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Документы
                  </Link>
                </li>
              </ul>
            </div>

            {/* Контакты */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Контакты</h4>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="mailto:support@cvr.name" 
                    className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors"
                  >
                    <AtSign className="w-4 h-4 flex-shrink-0" />
                    support@cvr.name
                  </a>
                </li>
                <li>
                  <a 
                    href="https://t.me/cvrname/4243" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span>@cvrname</span>
                  </a>
                </li>
                <li>
                  <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Санкт-Петербург, Россия</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                © {new Date().getFullYear()} Sud. Все права защищены.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center md:text-right">
                Информация взята из открытых источников. Не является официальным юридическим советом.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Footer - Mobile */}
      <footer className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto transition-colors duration-300">
        <div className="px-4 py-8">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-accent/10 p-1.5 rounded-lg">
              <Scale className="w-5 h-5 text-accent" />
            </div>
            <span className="text-base font-bold text-slate-900 dark:text-white">Sud</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Sud - Сервис для поиска судебных дел и мониторинга юридической информации. 
          </p>

          {/* Social Links */}
          <div className="flex gap-3 mb-6">
            <a 
              href="https://t.me/cvrname/4243" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Telegram"
            >
              <Send className="w-5 h-5" />
            </a>
            <a 
              href="mailto:support@cvr.name" 
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-accent hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Email"
            >
              <AtSign className="w-5 h-5" />
            </a>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Навигация</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/blog" onClick={handleFooterLinkClick} className="text-xs text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Блог
                  </Link>
                </li>
                <li>
                  <Link to="/help" onClick={handleFooterLinkClick} className="text-xs text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Помощь
                  </Link>
                </li>
                <li>
                  <Link to="/calculator" onClick={handleFooterLinkClick} className="text-xs text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Пошлины
                  </Link>
                </li>
                <li>
                  <Link to="/lawyers" onClick={handleFooterLinkClick} className="text-xs text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Юристы
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Информация</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" onClick={handleFooterLinkClick} className="text-xs text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Конфиденциальность
                  </Link>
                </li>
                <li>
                  <Link to="/privacy#terms" onClick={handleFooterLinkClick} className="text-xs text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Условия
                  </Link>
                </li>
                <li>
                  <Link to="/leads" onClick={handleFooterLinkClick} className="text-xs text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors">
                    Заявки
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              © {new Date().getFullYear()} Sud. Все права защищены.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Buttons */}
      <FloatingButtons />
    </div>
  );
});
