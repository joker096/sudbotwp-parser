import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Home, ArrowLeft, Search, Calculator, BookOpen, HelpCircle } from 'lucide-react';

export default function NotFound() {
  useEffect(() => {
    // Устанавливаем код ответа 404
    document.title = '404 - Страница не найдена | Судовой Бот';
    
    // Для браузеров - пытаемся установить статус
    window.addEventListener('load', function() {
      // Проверяем, что мы на странице 404
      const path = window.location.pathname;
      const knownRoutes = ['/', '/search', '/lawyers', '/calculator', '/blog', '/help', '/login', '/taxpayer', '/privacy', '/profile', '/messages', '/leads', '/monitoring', '/admin/blog'];
      const isKnownRoute = knownRoutes.some(route => path === route || path.startsWith(route + '/'));
      
      if (!isKnownRoute) {
        // Страница не найдена
        console.log('404 - Страница не найдена:', path);
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        {/* Иконка */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
            <Scale className="w-12 h-12 text-indigo-600" />
          </div>
        </div>

        {/* Код ошибки - H1 */}
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        
        {/* Заголовок - H2 */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Страница не найдена
        </h2>
        
        {/* Описание */}
        <p className="text-gray-600 mb-8">
          К сожалению, запрашиваемая страница не существует или была перемещена. 
          Возможно, вы ввели неправильный адрес или страница устарела.
        </p>

        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            На главную
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
        </div>

        {/* Полезные разделы - H3 */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Возможно, вам будут полезны:</h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/search" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline">
              <Search className="w-4 h-4" />
              Поиск дел
            </Link>
            <Link to="/lawyers" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline">
              <Scale className="w-4 h-4" />
              Юристы
            </Link>
            <Link to="/calculator" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline">
              <Calculator className="w-4 h-4" />
              Калькулятор
            </Link>
            <Link to="/blog" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline">
              <BookOpen className="w-4 h-4" />
              Блог
            </Link>
            <Link to="/help" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 hover:underline">
              <HelpCircle className="w-4 h-4" />
              Помощь
            </Link>
          </div>
        </div>

        {/* Дополнительная информация - H4, H5, H6 для структуры */}
        <div className="mt-8 text-left bg-white p-4 rounded-lg shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Что делать?</h4>
          <h5 className="text-sm font-medium text-gray-700 mb-2">Если вы уверены, что страница должна существовать:</h5>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>- Проверьте правильность написания адреса</li>
            <li>- Используйте поиск по сайту</li>
            <li>- Перейдите на главную страницу</li>
          </ul>
          
          <h6 className="text-sm font-medium text-gray-700 mt-4 mb-2">Контакты:</h6>
          <p className="text-sm text-gray-600">
            Если проблема повторяется, свяжитесь с нами через Telegram бот.
          </p>
        </div>
      </div>
    </div>
  );
}
