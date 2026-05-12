import React from 'react';
import { Edit, Trash2, Eye, Search, Power, PowerOff } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category_id?: number;
  image_url: string;
  author: string;
  read_time: string;
  published: boolean;
  is_enabled?: boolean;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  created_at?: string;
  updated_at?: string;
  category?: string;
}

interface AdminBlogListProps {
  posts: BlogPost[];
  onEdit: (post: BlogPost) => void;
  onDelete: (id: number) => void;
  onTogglePublish: (id: number, published: boolean) => void;
  onPreview: (post: BlogPost) => void;
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterCategory: string;
  onFilterChange: (category: string) => void;
  categories: { id: number; name: string }[];
}

/**
 * AdminBlogList - компонент для отображения списка постов в админке
 */
export const AdminBlogList: React.FC<AdminBlogListProps> = ({
  posts,
  onEdit,
  onDelete,
  onTogglePublish,
  onPreview,
  isLoading,
  searchTerm,
  onSearchChange,
  filterCategory,
  onFilterChange,
  categories,
}) => {
  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || post.category_id === Number(filterCategory);
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Поиск постов..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Posts Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Изображение</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заголовок</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Категория</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Посты не найдены
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs">Нет</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{post.title}</div>
                    {post.excerpt && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {post.excerpt.substring(0, 50)}...
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {post.category || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        post.published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {post.published ? 'Опубликован' : 'Черновик'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {post.created_at
                      ? new Date(post.created_at).toLocaleDateString('ru-RU')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onPreview(post)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Предпросмотр"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onTogglePublish(post.id, !post.published)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${
                          post.published ? 'text-green-600' : 'text-gray-400'
                        }`}
                        title={post.published ? 'Снять с публикации' : 'Опубликовать'}
                      >
                        {post.published ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button
                        onClick={() => onEdit(post)}
                        className="p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded"
                        title="Редактировать"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(post.id)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredPosts.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Показано {filteredPosts.length} из {posts.length} постов
        </div>
      )}
    </div>
  );
};