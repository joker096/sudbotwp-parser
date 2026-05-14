import React, { useState } from 'react';
import { Save, X, Image, ArrowLeft } from 'lucide-react';
import HtmlEditor from './HtmlEditor';
import { generateSlug } from '../lib/transliterate';

interface BlogPost {
  id?: number;
  title: string;
  slug?: string;
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
}

interface Category {
  id: number;
  name: string;
}

interface AdminBlogPostFormProps {
  post?: BlogPost | null;
  categories: Category[];
  onSave: (data: BlogPost) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const READ_TIMES = ['3 мин', '4 мин', '5 мин', '6 мин', '7 мин', '8 мин', '10 мин', '12 мин', '15 мин'];

/**
 * AdminBlogPostForm - форма создания/редактирования поста блога
 */
export const AdminBlogPostForm: React.FC<AdminBlogPostFormProps> = ({
  post,
  categories,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  const [formData, setFormData] = useState<BlogPost>({
    title: post?.title || '',
    slug: post?.slug || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category_id: post?.category_id,
    image_url: post?.image_url || '',
    author: post?.author || '',
    read_time: post?.read_time || '5 мин',
    published: post?.published || false,
    seo_title: post?.seo_title || '',
    seo_description: post?.seo_description || '',
    seo_keywords: post?.seo_keywords || '',
    og_title: post?.og_title || '',
    og_description: post?.og_description || '',
    og_image: post?.og_image || '',
  });

  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [isSlugManual, setIsSlugManual] = useState(false);

  const handleTitleChange = (title: string) => {
    setFormData({ ...formData, title });
    if (!isSlugManual && !post?.id) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(title) }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 -mb-px border-b-2 ${
            activeTab === 'content'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Контент
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-2 -mb-px border-b-2 ${
            activeTab === 'seo'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          SEO
        </button>
      </div>

      {activeTab === 'content' ? (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Заголовок <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URLslug
              <button
                type="button"
                onClick={() => {
                  setIsSlugManual(!isSlugManual);
                  if (!isSlugManual) {
                    setFormData((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
                  }
                }}
                className="ml-2 text-xs text-blue-600 hover:underline"
              >
                {isSlugManual ? 'Авто' : 'Ручной'}
              </button>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="auto-generated-slug"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Краткое описание
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Краткое описание для списка постов..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Категория
            </label>
            <select
              value={formData.category_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Выбрать категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL изображения
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
              {formData.image_url && (
                <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Author & Read Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Автор
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Время чтения
              </label>
              <select
                value={formData.read_time}
                onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {READ_TIMES.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Контент <span className="text-red-500">*</span>
            </label>
            <HtmlEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
            />
          </div>

          {/* Published */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="published"
              checked={formData.published}
              onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="published" className="text-sm font-medium text-gray-700">
              Опубликовать
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* SEO Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO заголовок
            </label>
            <input
              type="text"
              value={formData.seo_title}
              onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={formData.title || 'SEO заголовок'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.seo_title || '').length}/60 символов (рекомендуется)
            </p>
          </div>

          {/* SEO Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO описание
            </label>
            <textarea
              value={formData.seo_description}
              onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder={formData.excerpt || 'SEO описание'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {(formData.seo_description || '').length}/160 символов (рекомендуется)
            </p>
          </div>

          {/* SEO Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO ключевые слова
            </label>
            <input
              type="text"
              value={formData.seo_keywords}
              onChange={(e) => setFormData({ ...formData, seo_keywords: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="юрист, консультация, суд"
            />
          </div>

          {/* OG Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OG изображение URL
            </label>
            <input
              type="url"
              value={formData.og_image}
              onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="https://..."
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save size={18} />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <X size={18} />
          Отмена
        </button>
      </div>
    </form>
  );
};