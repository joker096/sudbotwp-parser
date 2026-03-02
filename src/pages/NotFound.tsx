import { Link } from 'react-router-dom';
import { Scale, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        {/* Иконка */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
            <Scale className="w-12 h-12 text-indigo-600" />
          </div>
        </div>

        {/* Код ошибки */}
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        
        {/* Заголовок */}
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

        {/* Полезные ссылки */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">Возможно, вам будут полезны:</p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <Link to="/search" className="text-indigo-600 hover:text-indigo-800 hover:underline">
              Поиск дел
            </Link>
            <Link to="/lawyers" className="text-indigo-600 hover:text-indigo-800 hover:underline">
              Юристы
            </Link>
            <Link to="/calculator" className="text-indigo-600 hover:text-indigo-800 hover:underline">
              Калькулятор
            </Link>
            <Link to="/blog" className="text-indigo-600 hover:text-indigo-800 hover:underline">
              Блог
            </Link>
            <Link to="/help" className="text-indigo-600 hover:text-indigo-800 hover:underline">
              Помощь
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
